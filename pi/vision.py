#!/usr/bin/env python3
"""bloom's vision loop, for stage 3 (eyes) on the raspberry pi 5.

reads frames from the Camera Module 3, finds motion with OpenCV background
subtraction, and looks for faces in the moving part of the frame. every
event goes into captures/vision.jsonl, and an annotated frame is saved when
something new shows up. this is what bloom "sees".

  python3 vision.py --show        # with a preview window, if a display is attached
"""

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2
from picamera2 import Picamera2


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="motion + face detection on the pi camera")
    p.add_argument("--out", type=Path, default=Path.home() / "bloom" / "captures")
    p.add_argument("--size", default="1280x720", help="analysis frame size, WxH")
    p.add_argument("--min-area", type=float, default=0.02, help="smallest moving area, as a share of the frame")
    p.add_argument("--cooldown", type=float, default=10.0, help="seconds between saved frames")
    p.add_argument("--show", action="store_true", help="open a preview window")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    width, height = (int(v) for v in args.size.lower().split("x"))
    args.out.mkdir(parents=True, exist_ok=True)
    log_path = args.out / "vision.jsonl"

    cam = Picamera2()
    cam.configure(cam.create_video_configuration(main={"size": (width, height), "format": "RGB888"}))
    cam.start()

    subtractor = cv2.createBackgroundSubtractorMOG2(history=300, varThreshold=32, detectShadows=False)
    faces = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    min_px = args.min_area * width * height
    last_save = 0.0
    print(f"vision: {width}x{height}, saving to {args.out}", flush=True)

    try:
        while True:
            frame = cam.capture_array()  # picamera2's RGB888 is BGR in memory, which is what OpenCV expects
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            mask = subtractor.apply(cv2.GaussianBlur(gray, (7, 7), 0))
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            moving = [cv2.boundingRect(c) for c in contours if cv2.contourArea(c) >= min_px]

            found = []
            for (x, y, w, h) in moving:
                roi = gray[y:y + h, x:x + w]
                for (fx, fy, fw, fh) in faces.detectMultiScale(roi, scaleFactor=1.1, minNeighbors=6, minSize=(48, 48)):
                    found.append((x + fx, y + fy, fw, fh))

            now = time.monotonic()
            if moving and now - last_save >= args.cooldown:
                last_save = now
                at = datetime.now(timezone.utc)
                shot = frame.copy()
                for (x, y, w, h) in moving:
                    cv2.rectangle(shot, (x, y), (x + w, y + h), (152, 70, 125), 2)  # tor violet, BGR
                for (x, y, w, h) in found:
                    cv2.rectangle(shot, (x, y), (x + w, y + h), (221, 179, 248), 2)  # sakura pink, BGR
                name = f"{at:%Y%m%d-%H%M%S}-seen.jpg"
                cv2.imwrite(str(args.out / name), shot)
                event = {"at": at.isoformat(timespec="seconds"), "moving": len(moving), "faces": len(found), "file": name}
                with log_path.open("a") as log:
                    log.write(json.dumps(event) + "\n")
                print(f"vision: {event}", flush=True)

            if args.show:
                cv2.imshow("bloom.cam", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    except KeyboardInterrupt:
        pass
    finally:
        cam.stop()
        cam.close()
        if args.show:
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
