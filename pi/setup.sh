#!/usr/bin/env bash
# sets up bloom's eyes on a raspberry pi 5 running raspberry pi os (bookworm).
# installs the camera and gpio libraries, checks the camera, and runs eyes.py as a service.
#
#   cd pi && ./setup.sh
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sudo apt-get update
sudo apt-get install -y python3-picamera2 python3-gpiozero python3-lgpio

if ! rpicam-hello --list-cameras 2>/dev/null | grep -q "imx708"; then
  echo "camera module 3 not found. check the CSI ribbon: 22-pin end in the pi 5, contacts facing the board." >&2
  exit 1
fi

sed -e "s|@USER@|${USER}|g" -e "s|@DIR@|${here}|g" "${here}/bloom-eyes.service" \
  | sudo tee /etc/systemd/system/bloom-eyes.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now bloom-eyes

echo "bloom-eyes is running. stills go to ~/bloom/captures"
echo "logs: journalctl -u bloom-eyes -f"
