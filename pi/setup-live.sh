#!/usr/bin/env bash
# puts bloom's eye on the site. asks for the key once, shows what the camera would send,
# sends one frame to check the key and the camera, then keeps live.py running as a service.
#
#   cd pi && ./setup-live.sh
#
# it takes the camera over from bloom-eyes (eyes.py). to go back:
#   sudo systemctl disable --now bloom-live && sudo systemctl enable --now bloom-eyes
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
conf="${HOME}/.config/bloom"
mkdir -p "${conf}"
chmod 700 "${conf}"

if [ ! -s "${conf}/eye.env" ]; then
  echo "the key is EYE_KEY in the vercel project: settings > environment variables."
  read -r -s -p "paste it here, then enter (it is not shown): " key
  echo
  if [ -z "${key}" ]; then
    echo "no key given." >&2
    exit 1
  fi
  (umask 077 && printf 'EYE_KEY=%s\n' "${key}" > "${conf}/eye.env")
fi

sudo apt-get update
sudo apt-get install -y python3-picamera2 python3-opencv opencv-data python3-gpiozero python3-lgpio

if ! rpicam-hello --list-cameras 2>/dev/null | grep -q "imx708"; then
  echo "camera module 3 not found. check the CSI ribbon: 22-pin end in the pi 5, contacts facing the board." >&2
  exit 1
fi

sudo systemctl stop bloom-eyes bloom-live 2>/dev/null || true

preview="${HOME}/bloom/eye-preview"
python3 "${here}/live.py" --once --no-pir --dry-run "${preview}"
echo
echo "that frame is in ${preview}. it is what the site will show: everything in it becomes public."
read -r -p "send it and go live? [y/N] " go
if [ "${go}" != "y" ] && [ "${go}" != "Y" ]; then
  echo "stopped. nothing was sent. move the camera and run this again."
  exit 0
fi

set -a
# shellcheck disable=SC1091
. "${conf}/eye.env"
set +a
python3 "${here}/live.py" --once --no-pir

sed -e "s|@USER@|${USER}|g" -e "s|@DIR@|${here}|g" -e "s|@CONF@|${conf}|g" "${here}/bloom-live.service" \
  | sudo tee /etc/systemd/system/bloom-live.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl disable bloom-eyes 2>/dev/null || true
sudo systemctl enable --now bloom-live

echo "bloom-live is running. the eye view is on the site while it runs."
echo "logs: journalctl -u bloom-live -f"
echo "stop: sudo systemctl disable --now bloom-live"
