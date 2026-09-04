#!/usr/bin/env bash
# ============================================================================
# ANS Platform 部署脚本（在服务器上执行）
#
# 用法：
#   bash deploy/deploy.sh              # 拉取最新代码 → 构建 → 上线
#   bash deploy/deploy.sh --no-build   # 只拉取并重启（改了环境变量时用）
#   bash deploy/deploy.sh --status     # 只看状态，不做任何变更
#
# 铁律（踩过坑，别改）：
#   1. 构建和启动用不同的 compose 文件：compose.yml 才有 build 段，
#      docker-compose.yml 只负责运行。用 -f docker-compose.yml build 会静默空转。
#   2. build 完成 ≠ 上线，必须再跑一次 up -d 才会 Recreate 容器。
#   3. 镜像必须是 ans-platform:latest，不能是 ghcr.io/f/prompts.chat:latest，
#      否则构建新站会覆盖旧站 prompts.cauai.fun 的镜像。
# ============================================================================
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/srv/ans-platform}"
BUILD_COMPOSE="compose.yml"
RUN_COMPOSE="docker-compose.yml"
SERVICE="app"
IMAGE="ans-platform:latest"

cd "$DEPLOY_DIR"

if [[ "${1:-}" == "--status" ]]; then
    echo "=== git ==="
    git log --oneline -1
    echo "=== container ==="
    docker ps --filter name=ans-platform-app --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo "=== image ==="
    docker images --format "{{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | grep ans-platform || echo "镜像尚未构建"
    exit 0
fi

echo "[1/4] 拉取最新代码"
git pull --ff-only origin main

if [[ "${1:-}" != "--no-build" ]]; then
    echo "[2/4] 构建镜像（约 20 分钟，可 Ctrl-C 中断后重跑，有缓存）"
    docker compose -f "$BUILD_COMPOSE" build "$SERVICE"
else
    echo "[2/4] 跳过构建（--no-build）"
fi

echo "[3/4] 重启容器（这一步才是真正上线）"
docker compose -f "$RUN_COMPOSE" up -d "$SERVICE"

echo "[4/4] 等待就绪"
sleep 20
docker ps --filter name=ans-platform-app --format "{{.Names}} {{.Status}}"

echo
echo "=== 冒烟检查 ==="
for p in / /templates /workspace /teams /api/auth/session; do
    printf "%-22s -> " "$p"
    curl -s -o /dev/null -w "%{http_code}\n" -m 20 -L "https://ans.cauai.fun$p" || echo "请求失败"
done

echo
echo "部署完成。查看日志：docker logs -f ans-platform-app"
