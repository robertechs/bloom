#!/usr/bin/env python3
"""bloom's eye, live on the site.

the camera module watches the room. this finds what is moving and whether a face is in view,
marks both on the frame, and sends the frame to the site. bloom.cam shows it as its second view,
with the time the site received it. nothing is saved on the pi.

  EYE_KEY=... python3 live.py                # send to the site until stopped
  EYE_KEY=... python3 live.py --once         # send one frame, check the site has it, stop
  python3 live.py --dry-run ~/eye-preview    # write the frames to a folder instead of sending them

what leaves the room: a small picture, at least every --every seconds and at most every --burst
seconds while something is moving. faces it finds are pixelated before the picture leaves the pi,
unless --faces show. it can only hide a face it finds, and it finds faces that look toward the
camera. everything else in view is public, so look at a --dry-run first and point the camera
where that is fine.

it holds the camera, so it cannot run next to eyes.py or vision.py.
"""

import argparse
import collections
import json
import os
import signal
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import cv2

SITE = "https://www.bloomexperiment.tech/api/eye"
VIOLET = (152, 70, 125)  # what moves. tor violet, BGR, as in vision.py
PINK = (221, 179, 248)   # faces. sakura pink, BGR
DAY = 86400.0


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="send what bloom's camera sees to the site")
    p.add_argument("--url", default=os.environ.get("EYE_URL", SITE), help="where frames go")
    p.add_argument("--key-file", type=Path, help="file holding the key, if it is not in EYE_KEY")
    p.add_argument("--every", type=float, default=30.0, help="seconds between frames when nothing happens")
    p.add_argument("--burst", type=float, default=5.0, help="seconds between frames while something moves")
    p.add_argument("--per-day", type=int, default=6000, help="most frames sent in any 24 hours. past it, only the --every frames go out")
    p.add_argument("--size", default="480x270", help="size of the frame that is sent, WxH")
    p.add_argument("--max-kb", type=float, default=5.6, help="largest frame sent, in kB. up to 5.6 a frame costs the site one unit of storage")
    p.add_argument("--faces", choices=["blur", "show"], default="blur", help="faces are pixelated unless this is 'show'")
    p.add_argument("--min-area", type=float, default=0.01, help="smallest moving area, as a share of the frame")
    p.add_argument("--pins", default="left=17,front=27,right=22", help="PIR sensors as name=bcm pairs")
    p.add_argument("--no-pir", action="store_true", help="camera only, leave the PIR sensors alone")
    p.add_argument("--warmup", type=float, default=60.0, help="seconds the PIR sensors need before they are believed")
    p.add_argument("--once", action="store_true", help="send one frame, check it arrived, and stop")
    p.add_argument("--dry-run", type=Path, metavar="DIR", help="write frames into DIR instead of sending them")
    p.add_argument("--source", help="read frames from a video file instead of the camera (for trying it off the pi)")
    return p.parse_args()


# ---- where frames come from


class PiCamera:
    def __init__(self, size=(1280, 720)):
        from picamera2 import Picamera2  # only on the pi

        self.cam = Picamera2()
        # picamera2's RGB888 is BGR in memory, which is what OpenCV expects
        self.cam.configure(self.cam.create_video_configuration(main={"size": size, "format": "RGB888"}))
        self.cam.start()
        time.sleep(2.0)  # exposure and white balance settle

    def read(self):
        return self.cam.capture_array()

    def close(self) -> None:
        self.cam.stop()
        self.cam.close()


class VideoFile:
    """a video file played round and round at its own speed."""

    def __init__(self, path: str):
        self.cap = cv2.VideoCapture(path)
        if not self.cap.isOpened():
            raise SystemExit(f"eye: cannot open {path}")
        self.step = 1.0 / (self.cap.get(cv2.CAP_PROP_FPS) or 25.0)
        self.t0 = time.monotonic()
        self.shown = 0
        self.frame = None

    def read(self):
        due = int((time.monotonic() - self.t0) / self.step)
        while self.frame is None or self.shown <= due:
            ok, frame = self.cap.read()
            if not ok:
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ok, frame = self.cap.read()
                if not ok:
                    raise SystemExit("eye: the video has no frames")
            self.frame = frame
            self.shown += 1
        return self.frame

    def close(self) -> None:
        self.cap.release()


# ---- what it sees


def face_finder():
    """the frontal face cascade, wherever this OpenCV keeps it. None when it is not installed."""
    if not hasattr(cv2, "CascadeClassifier"):
        return None
    folders = []
    if hasattr(cv2, "data"):
        folders.append(cv2.data.haarcascades)
    folders += ["/usr/share/opencv4/haarcascades/", "/usr/share/opencv/haarcascades/"]
    for folder in folders:
        path = Path(folder) / "haarcascade_frontalface_default.xml"
        if path.exists():
            finder = cv2.CascadeClassifier(str(path))
            if not finder.empty():
                return finder
    return None


class Watcher:
    """finds moving regions and faces. boxes come back as shares of the frame: (x, y, w, h) in 0..1."""

    WIDTH = 640     # frames are looked at this wide, whatever the camera gives
    FACE_HOLD = 2.0  # a face stays "in view" this long after it was last found

    def __init__(self, min_area: float):
        self.min_area = min_area
        self.subtractor = cv2.createBackgroundSubtractorMOG2(history=300, varThreshold=32, detectShadows=False)
        self.kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        self.faces = face_finder()
        self.seen = 0
        self.held = ([], float("-inf"))

    def look(self, frame):
        h, w = frame.shape[:2]
        small = cv2.resize(frame, (self.WIDTH, round(self.WIDTH * h / w)), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        sh, sw = gray.shape

        mask = self.subtractor.apply(cv2.GaussianBlur(gray, (7, 7), 0))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, self.kernel)
        self.seen += 1
        moving = []
        # the first frames teach it what the room looks like, and a change over most of the frame
        # is the light or the exposure changing, not something moving
        if self.seen > 25 and cv2.countNonZero(mask) < 0.6 * sw * sh:
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for c in contours:
                if cv2.contourArea(c) >= self.min_area * sw * sh:
                    x, y, bw, bh = cv2.boundingRect(c)
                    moving.append((x / sw, y / sh, bw / sw, bh / sh))

        found = []
        if self.faces is not None:
            for (x, y, bw, bh) in self.faces.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(32, 32)):
                found.append((x / sw, y / sh, bw / sw, bh / sh))
        # the detector drops a face for a frame now and then. holding the last place it was found
        # keeps the count steady, and keeps the face hidden in the frame where it was missed
        now = time.monotonic()
        if found:
            self.held = (found, now)
        elif now - self.held[1] <= self.FACE_HOLD:
            found = self.held[0]
        return moving, found


def picture(frame, moving, faces, size, blur: bool):
    """the frame as it leaves the pi: small, faces pixelated, what moves and faces marked."""
    out = cv2.resize(frame, size, interpolation=cv2.INTER_AREA)
    w, h = size

    def px(box, grow=0.0):
        x, y, bw, bh = box
        x0, y0 = max(0, round((x - bw * grow) * w)), max(0, round((y - bh * grow) * h))
        x1, y1 = min(w, round((x + bw * (1 + grow)) * w)), min(h, round((y + bh * (1 + grow)) * h))
        return x0, y0, x1, y1

    if blur:
        for box in faces:
            x0, y0, x1, y1 = px(box, grow=0.25)
            if x1 - x0 < 2 or y1 - y0 < 2:
                continue
            blocks = cv2.resize(out[y0:y1, x0:x1], (5, 5), interpolation=cv2.INTER_AREA)
            out[y0:y1, x0:x1] = cv2.resize(blocks, (x1 - x0, y1 - y0), interpolation=cv2.INTER_NEAREST)
    for box in moving:
        x0, y0, x1, y1 = px(box)
        cv2.rectangle(out, (x0, y0), (x1 - 1, y1 - 1), VIOLET, 1)
    for box in faces:
        x0, y0, x1, y1 = px(box, grow=0.25 if blur else 0.0)
        cv2.rectangle(out, (x0, y0), (x1 - 1, y1 - 1), PINK, 1)
    return out


def encode(image, max_bytes: int):
    """webp when this OpenCV can write it, jpeg otherwise. quality, then size, drop until it fits."""
    for ext, kind, flag in ((".webp", "image/webp", cv2.IMWRITE_WEBP_QUALITY), (".jpg", "image/jpeg", cv2.IMWRITE_JPEG_QUALITY)):
        shrunk = image
        while shrunk.shape[1] >= 160:
            for quality in (60, 48, 38, 30, 22):
                try:
                    ok, data = cv2.imencode(ext, shrunk, [flag, quality])
                except cv2.error:
                    ok = False
                if not ok:
                    break
                if len(data) <= max_bytes:
                    return data.tobytes(), kind, ext
            if not ok:
                break  # this OpenCV cannot write the format: try the next one
            shrunk = cv2.resize(shrunk, None, fx=0.85, fy=0.85, interpolation=cv2.INTER_AREA)
    raise RuntimeError(f"could not get the frame under {max_bytes} bytes")


# ---- the PIR sensors, when they are wired


class Pirs:
    def __init__(self, pins: str, warmup: float):
        from gpiozero import MotionSensor  # only on the pi

        self.ready_at = time.monotonic() + warmup
        self.last = ("", 0.0)
        self.sensors = {}
        for pair in pins.split(","):
            name, pin = pair.split("=")
            sensor = MotionSensor(int(pin))
            sensor.when_motion = self._seen(name.strip())
            self.sensors[name.strip()] = sensor

    def _seen(self, name: str):
        def handler() -> None:
            now = time.monotonic()
            if now >= self.ready_at:  # HC-SR501s fire at random while they settle
                self.last = (name, now)
        return handler

    def recent(self, within: float) -> str:
        name, at = self.last
        return name if name and time.monotonic() - at <= within else ""

    def close(self) -> None:
        for sensor in self.sensors.values():
            sensor.close()


# ---- sending


def send(url: str, key: str, data: bytes, kind: str, headers: dict):
    """returns (the site's answer, None) or (None, why it failed)."""
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "Authorization": f"Bearer {key}", "Content-Type": kind, "User-Agent": "bloom-eye", **headers})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read()), None
    except urllib.error.HTTPError as e:
        try:
            why = json.loads(e.read()).get("error", "")
        except Exception:
            why = ""
        if e.code == 401:
            why = "the site refused the key. it has to be the same as EYE_KEY in the vercel project"
        return None, f"http {e.code}: {why or e.reason}"
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
        return None, f"no connection: {getattr(e, 'reason', e)}"


def site_has(url: str, frame_id: str) -> bool:
    try:
        # the query string makes it a fresh answer instead of one the CDN kept
        req = urllib.request.Request(f"{url}?have={frame_id}&check={time.time():.0f}", headers={"User-Agent": "bloom-eye"})
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read()).get("id") == frame_id
    except Exception:
        return False


def main() -> int:
    args = parse_args()
    size = tuple(int(v) for v in args.size.lower().split("x"))
    max_bytes = int(args.max_kb * 1000)

    key = os.environ.get("EYE_KEY", "").strip()
    if not key and args.key_file:
        key = args.key_file.read_text().strip()
    if not key and not args.dry_run:
        print("eye: no key. set EYE_KEY, or use --dry-run DIR to look at the frames without sending them", file=sys.stderr)
        return 2
    if args.dry_run:
        args.dry_run.mkdir(parents=True, exist_ok=True)

    source = VideoFile(args.source) if args.source else PiCamera()
    watcher = Watcher(args.min_area)
    pirs = None
    if not args.no_pir and not args.source:
        try:
            pirs = Pirs(args.pins, args.warmup)
        except Exception as e:  # no gpio here, or the pins are taken: the camera still works
            print(f"eye: PIR sensors not used ({e})", flush=True)
    if watcher.faces is None:
        print("eye: no face cascade found, so faces are neither found nor hidden. install opencv-data", flush=True)
    extra_allowed = max(0, args.per_day - int(DAY / args.every))
    where = f"into {args.dry_run}" if args.dry_run else f"to {args.url}"
    print(f"eye: open. {size[0]}x{size[1]} {where}, every {args.every:.0f}s, every {args.burst:.0f}s while something moves, "
          f"faces {'pixelated' if args.faces == 'blur' else 'shown'}", flush=True)
    if not extra_allowed:
        print(f"eye: a frame every {args.every:.0f}s is already {int(DAY / args.every)} a day, over --per-day {args.per_day}, "
              "so nothing extra is sent while something moves", flush=True)

    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())

    last_try = float("-inf")
    wait = 0.0                      # after a failure: seconds to hold off, doubling up to a minute
    extra = collections.deque()     # when the frames beyond the --every ones went out, last 24 hours
    last_faces = 0
    checked = False
    status = 0
    try:
        while not stop.is_set():
            tick = time.monotonic()
            frame = source.read()
            moving, faces = watcher.look(frame)
            sensor = pirs.recent(args.burst * 2) if pirs else ""
            gap = tick - last_try
            while extra and tick - extra[0] > DAY:
                extra.popleft()
            active = (bool(moving) or bool(sensor) or len(faces) != last_faces) and len(extra) < extra_allowed

            if wait:
                due = gap >= wait
            else:
                due = gap >= args.every or (active and gap >= args.burst)
            if args.once or due:
                if gap < args.every:
                    extra.append(tick)
                last_try = tick
                last_faces = len(faces)
                data, kind, ext = encode(picture(frame, moving, faces, size, args.faces == "blur"), max_bytes)
                said = f"{len(data) / 1000:.1f} kB, {len(moving)} moving, {len(faces)} face{'s' if len(faces) != 1 else ''}{', pir ' + sensor if sensor else ''}"
                if args.dry_run:
                    name = f"{time.strftime('%Y%m%d-%H%M%S')}{ext}"
                    (args.dry_run / name).write_bytes(data)
                    print(f"eye: {name}: {said}", flush=True)
                    if args.once:
                        break
                else:
                    answer, why = send(args.url, key, data, kind, {
                        "X-Eye-Moving": str(len(moving)), "X-Eye-Faces": str(len(faces)),
                        "X-Eye-Sensor": sensor, "X-Eye-Every": str(round(args.every))})
                    if answer:
                        wait = 0.0
                        print(f"eye: sent {said}", flush=True)
                        if not checked:
                            checked = True
                            if site_has(args.url, answer.get("id", "")):
                                print("eye: the site has it. bloom.cam now offers the eye view", flush=True)
                            else:
                                status = 1
                                print("eye: sent, but the site does not have it. its store may be paused or used up for this month", file=sys.stderr, flush=True)
                        if args.once:
                            break
                    else:
                        wait = min(60.0, max(args.burst, wait * 2))
                        again = "" if args.once else f". trying again in {wait:.0f}s"
                        print(f"eye: not sent ({why}){again}", file=sys.stderr, flush=True)
                        if args.once:
                            status = 3 if why.startswith("http 401") else 1  # 3: wrong key, so setup-live.sh asks for it again
                            break

            stop.wait(max(0.0, 0.2 - (time.monotonic() - tick)))  # look about five times a second
    finally:
        source.close()
        if pirs:
            pirs.close()
        print("eye: closed", flush=True)
    return status


if __name__ == "__main__":
    sys.exit(main())
