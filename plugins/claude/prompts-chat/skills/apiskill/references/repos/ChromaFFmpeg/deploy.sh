#!/usr/bin/env bash
# ChromaFFmpeg – deploy latest code to VPS
#
# Usage:
#   VPS_HOST=1.2.3.4 ./deploy.sh
#   VPS_HOST=1.2.3.4 VPS_USER=ubuntu ./deploy.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
APP_DIR="/opt/chromaffmpeg"

if [ -z "$VPS_HOST" ]; then
  echo "Error: VPS_HOST is not set."
  echo "Usage: VPS_HOST=your.vps.ip ./deploy.sh"
  exit 1
fi

echo "Deploying to $VPS_USER@$VPS_HOST..."

ssh "$VPS_USER@$VPS_HOST" "
  set -e
  cd $APP_DIR
  git pull
  docker compose up -d --build --remove-orphans
  docker compose ps
"

echo ""
echo "Deploy complete."
