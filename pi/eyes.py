#!/usr/bin/env python3
"""bloom's eyes, for stage 3 on the raspberry pi 5.

three HC-SR501 PIR sensors on GPIO watch the room. when one trips, the
Camera Module 3 takes a still and the event goes into captures/motion.jsonl
with the side that saw it.

wiring (BCM numbers, change with --pins):
  left  -> GPIO17   front -> GPIO27   right -> GPIO22
  each PIR: VCC to 5V, GND to GND, OUT to its GPIO (OUT is 3.3V, safe for the pi)
camera: CSI ribbon, 22-pin end in the pi 5's CAM port.
"""

import argparse
import json
import signal
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from gpiozero import MotionSensor
from picamera2 import Picamera2


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="capture a still whenever a PIR sensor sees motion")
    p.add_argument("--out", type=Path, default=Path.home() / "bloom" / "captures", help="where stills and the log go")
    p.add_argument("--pins", default="left=17,front=27,right=22", help="name=bcm pairs, comma separated")
    p.add_argument("--cooldown", type=float, default=20.0, help="minimum seconds between stills")
    p.add_argument("--warmup", type=float, default=60.0, help="seconds the HC-SR501s need to settle after power-up")
    p.add_argument("--size", default="2304x1296", help="still size, WxH (camera module 3 max is 4608x2592)")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    pins = {name.strip(): int(pin) for name, pin in (pair.split("=") for pair in args.pins.split(","))}
    width, height = (int(v) for v in args.size.lower().split("x"))
    args.out.mkdir(parents=True, exist_ok=True)
    log_path = args.out / "motion.jsonl"

    cam = Picamera2()
    cam.configure(cam.create_still_configuration(main={"size": (width, height)}))
    cam.start()

    sensors = {name: MotionSensor(pin) for name, pin in pins.items()}
    print(f"eyes: {len(sensors)} PIRs on {pins}, warming up {args.warmup:.0f}s", flush=True)
    time.sleep(args.warmup)

    lock = threading.Lock()
    last = [0.0]

    def seen(name: str) -> None:
        with lock:  # sensors fire from gpiozero's own thread, possibly together
            now = time.monotonic()
            if now - last[0] < args.cooldown:
                return
            last[0] = now
            at = datetime.now(timezone.utc)
            still = args.out / f"{at:%Y%m%d-%H%M%S}-{name}.jpg"
            cam.capture_file(str(still))
            with log_path.open("a") as log:
                log.write(json.dumps({"at": at.isoformat(timespec="seconds"), "sensor": name, "file": still.name}) + "\n")
            print(f"eyes: motion {name} -> {still.name}", flush=True)

    def on_motion(name: str):
        def handler() -> None:
            seen(name)
        return handler

    for name, sensor in sensors.items():
        sensor.when_motion = on_motion(name)

    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    print("eyes: watching", flush=True)
    while not stop.wait(1.0):
        pass

    for sensor in sensors.values():
        sensor.close()
    cam.stop()
    cam.close()
    print("eyes: closed", flush=True)


if __name__ == "__main__":
    main()
