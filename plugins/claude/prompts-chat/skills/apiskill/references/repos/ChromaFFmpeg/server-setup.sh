#!/usr/bin/env bash
# ChromaFFmpeg – one-time VPS setup
# Run on a fresh Ubuntu/Debian VPS:
#   curl -fsSL https://raw.githubusercontent.com/leksautomate/ChromaFFmpeg/main/server-setup.sh | bash
set -euo pipefail

REPO="https://github.com/leksautomate/ChromaFFmpeg.git"
APP_DIR="/opt/chromaffmpeg"

echo "========================================"
echo "  ChromaFFmpeg VPS Setup"
echo "========================================"

# ── 1. Docker ────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[1/5] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "[1/5] Docker already installed."
fi

# ── 2. Docker Compose plugin ─────────────────
if ! docker compose version &>/dev/null 2>&1; then
  echo "[2/5] Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
else
  echo "[2/5] Docker Compose already installed."
fi

# ── 3. Clone or update repo ──────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "[3/5] Updating existing repo..."
  git -C "$APP_DIR" pull
else
  echo "[3/5] Cloning repo..."
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# ── 4. Create .env ───────────────────────────
if [ ! -f .env ]; then
  echo "[4/5] Creating .env..."
  cp .env.example .env

  API_KEY=$(openssl rand -hex 32)
  VPS_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

  sed -i "s|change-me-before-deploy|$API_KEY|" .env
  sed -i "s|http://your-vps-ip:9000|http://$VPS_IP:9000|" .env

  echo ""
  echo "  ┌─────────────────────────────────────┐"
  echo "  │  SAVE THESE — shown only once!       │"
  echo "  │  API_KEY : $API_KEY  │"
  echo "  │  BASE_URL: http://$VPS_IP:9000        │"
  echo "  └─────────────────────────────────────┘"
  echo ""
else
  echo "[4/5] .env already exists, skipping."
fi

# ── 5. Data dirs + start ─────────────────────
echo "[5/5] Creating data directories and starting service..."
mkdir -p /data/outputs /data/folders

docker compose up -d --build

echo ""
echo "========================================"
echo "  Setup complete!"
echo "  URL : $(grep BASE_URL .env | cut -d= -f2)"
echo "  Key : $(grep API_KEY  .env | cut -d= -f2)"
echo "========================================"
