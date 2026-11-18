#!/usr/bin/env python3
"""talks to the body firmware (firmware/body/body.ino) over USB serial.

  python3 body.py drive 0.4 0 0 --for 1.5    # forward for 1.5 s
  python3 body.py drive 0 0.4 0 --for 1      # strafe left
  python3 body.py drive 0 0 0.5 --for 1      # turn left on the spot
  python3 body.py arm 120
  python3 body.py grip 30
  python3 body.py state
"""

import argparse
import time

import serial  # pyserial

WATCHDOG_S = 0.5  # the firmware stops the wheels after 500 ms without a drive command


class Body:
    def __init__(self, port: str = "/dev/ttyACM0", baud: int = 115200):
        self.link = serial.Serial(port, baud, timeout=1)
        time.sleep(2.0)  # the board resets when the port opens
        self.link.reset_input_buffer()

    def send(self, line: str) -> str:
        self.link.write((line + "\n").encode())
        reply = self.link.readline().decode(errors="replace").strip()
        if not reply.startswith("ok"):
            raise RuntimeError(f"body: {reply or 'no reply'} (sent {line!r})")
        return reply

    def drive(self, vx: float, vy: float, w: float, seconds: float = 0.0) -> None:
        cmd = f"D {vx:.3f} {vy:.3f} {w:.3f}"
        end = time.monotonic() + seconds
        self.send(cmd)
        while time.monotonic() < end:  # keep feeding the watchdog while moving
            time.sleep(WATCHDOG_S / 2)
            self.send(cmd)
        if seconds:
            self.stop()

    def stop(self) -> None:
        self.send("S")

    def arm(self, deg: int) -> None:
        self.send(f"A {int(deg)}")

    def grip(self, deg: int) -> None:
        self.send(f"G {int(deg)}")

    def state(self) -> str:
        return self.send("?")

    def close(self) -> None:
        try:
            self.stop()
        finally:
            self.link.close()


def main() -> None:
    p = argparse.ArgumentParser(description="drive bloom's body")
    p.add_argument("--port", default="/dev/ttyACM0")
    sub = p.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("drive")
    d.add_argument("vx", type=float)
    d.add_argument("vy", type=float)
    d.add_argument("w", type=float)
    d.add_argument("--for", dest="seconds", type=float, default=1.0)
    for name in ("arm", "grip"):
        sub.add_parser(name).add_argument("deg", type=int)
    sub.add_parser("stop")
    sub.add_parser("state")
    args = p.parse_args()

    body = Body(args.port)
    try:
        if args.cmd == "drive":
            body.drive(args.vx, args.vy, args.w, args.seconds)
        elif args.cmd == "arm":
            body.arm(args.deg)
        elif args.cmd == "grip":
            body.grip(args.deg)
        elif args.cmd == "stop":
            body.stop()
        print(body.state())
    finally:
        body.close()


if __name__ == "__main__":
    main()
