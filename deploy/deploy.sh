#!/usr/bin/env bash
# ============================================================================
# ANS Platform 部署脚本（在服务器上执行）
#
# 用法：
#   bash deploy/deploy.sh              # 拉取最新代码 → 构建 → 上线 → 校验
#   bash deploy/deploy.sh --no-build   # 只拉取并重启（改了环境变量时用）
#   bash deploy/deploy.sh --status     # 只看状态，不做任何变更
#
# 可覆盖的环境变量：DEPLOY_DIR / PROJECT / ENV_FILE
#
# 铁律（踩过坑，别改）：
#   1. 构建和启动用不同的 compose 文件：compose.yml 才有 build 段，
#      docker-compose.yml 只负责运行。用 -f docker-compose.yml build 会静默空转。
#   2. build 完成 ≠ 上线，必须再跑一次 up -d 才会 Recreate 容器。
#   3. 镜像必须是 ans-platform:latest，不能是 ghcr.io/f/prompts.chat:latest，
#      否则构建新站会覆盖旧站 prompts.cauai.fun 的镜像。
#   4. compose project 名必须显式传 -p，绝不让它从目录名推导。
#      docker-compose.yml 里写死了 container_name: ans-platform-app，
#      而线上既有容器属于 project ans-platform-authoritative。
#      一旦 project 名被推成 ans-platform-authoritative-main（目录名），
#      up -d 会因容器名冲突失败 —— 但旧容器仍 healthy、镜像已构建成功、
#      日志里没有「失败」字样。这就是「静默假成功」：你以为上线了，其实没上。
#   5. 上线前必须先留回滚点（旧镜像打标签），否则出问题只能靠重构建。
# ============================================================================
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/srv/ans-platform-authoritative-main}"
PROJECT="${PROJECT:-ans-platform-authoritative}"
BUILD_COMPOSE="compose.yml"
RUN_COMPOSE="docker-compose.yml"
SERVICE="app"
IMAGE="ans-platform:latest"
CONTAINER="ans-platform-app"

cd "$DEPLOY_DIR"
ENV_FILE="${ENV_FILE:-.env}"

# 所有 compose 调用统一走这里，project 名与 env-file 只在一处定义，避免漏传。
compose() {
    docker compose -p "$PROJECT" --env-file "$ENV_FILE" "$@"
}

if [[ "${1:-}" == "--status" ]]; then
    echo "=== git ==="
    git log --oneline -1
    echo "=== container ==="
    docker ps --filter name="$CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo "=== image ==="
    docker images --format "{{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | grep ans-platform || echo "镜像尚未构建"
    echo "=== 镜像一致性（线上是否真的跑着 $IMAGE）==="
    running_id="$(docker inspect --format='{{.Image}}' "$CONTAINER" 2>/dev/null || echo '')"
    latest_id="$(docker image inspect --format='{{.Id}}' "$IMAGE" 2>/dev/null || echo '')"
    if [[ -z "$running_id" || -z "$latest_id" ]]; then
        echo "无法读取（容器或镜像不存在）"
    elif [[ "$running_id" == "$latest_id" ]]; then
        echo "一致：$running_id"
    else
        echo "不一致！容器跑的不是最新镜像"
        echo "  容器：$running_id"
        echo "  $IMAGE：$latest_id"
    fi
    exit 0
fi

echo "[1/4] 拉取最新代码"
git pull --ff-only origin main

if [[ ! -f "$ENV_FILE" ]]; then
    echo "错误：缺少 $ENV_FILE。生产部署必须提供托管 PostgreSQL 的 DATABASE_URL 和 DIRECT_URL。" >&2
    exit 1
fi

# Compose 会在这里校验必填变量；不输出解析后的配置，避免把连接串写入日志。
if ! compose -f "$RUN_COMPOSE" config --quiet; then
    echo "错误：生产 compose 配置不完整，请检查 $ENV_FILE。" >&2
    exit 1
fi

# 阻止把生产容器误接回本机或旧站数据库容器。
if grep -Eiq '^DATABASE_URL=.*@(localhost|127\.0\.0\.1|\[::1\]|db|prompts-chat-db)(:|/)' "$ENV_FILE"; then
    echo "错误：DATABASE_URL 必须指向独立托管 PostgreSQL，不能使用本机或 Docker 数据库服务。" >&2
    exit 1
fi
if grep -Eiq '^DIRECT_URL=.*@(localhost|127\.0\.0\.1|\[::1\]|db|prompts-chat-db)(:|/)' "$ENV_FILE"; then
    echo "错误：DIRECT_URL 必须指向独立托管 PostgreSQL，不能使用本机或 Docker 数据库服务。" >&2
    exit 1
fi


if [[ "${1:-}" != "--no-build" ]]; then
    echo "[2/4] 记录回滚点并构建镜像（约 20 分钟，可 Ctrl-C 中断后重跑，有缓存）"
    CURRENT_IMAGE_ID="$(docker inspect "$CONTAINER" --format '{{.Image}}' 2>/dev/null || true)"
    PREV_COMMIT="$(git rev-parse HEAD)"
    if [[ -n "$CURRENT_IMAGE_ID" ]]; then
        docker tag "$CURRENT_IMAGE_ID" "ans-platform:rollback-$(date +%Y%m%d%H%M%S)"
        echo "  当前镜像：$CURRENT_IMAGE_ID（已打回滚标签）"
    fi
    echo "  当前提交：$PREV_COMMIT"
    echo "  回滚方法：docker tag <回滚标签> $IMAGE && compose -f $RUN_COMPOSE up -d $SERVICE"
    compose -f "$BUILD_COMPOSE" build "$SERVICE"
else
    echo "[2/4] 跳过构建（--no-build）"
fi

echo "[3/4] 重启容器（这一步才是真正上线）"
compose -f "$RUN_COMPOSE" up -d "$SERVICE"

echo "[4/4] 等待就绪并校验镜像真的换了"
sleep 20
docker ps --filter name="$CONTAINER" --format "{{.Names}} {{.Status}}"

# 这一步是防「静默假成功」的最后一道闸：容器必须真的跑在 $IMAGE 上。
running_id="$(docker inspect --format='{{.Image}}' "$CONTAINER")"
latest_id="$(docker image inspect --format='{{.Id}}' "$IMAGE")"
if [[ "$running_id" != "$latest_id" ]]; then
    echo >&2
    echo "错误：容器没有切换到最新镜像，上线未生效！" >&2
    echo "  容器正在跑：$running_id" >&2
    echo "  $IMAGE：$latest_id" >&2
    echo "  排查方向：compose project 名是否与既有容器一致（应带 -p $PROJECT）。" >&2
    exit 1
fi
echo "镜像一致：$running_id"

echo
echo "=== 冒烟检查 ==="
for p in / /projects /templates /api/health /competitions /competitions/agrihackathon /api/auth/session; do
    printf "%-28s -> " "$p"
    curl -s -o /dev/null -w "%{http_code}\n" -m 20 -L "https://ans.cauai.fun$p" || echo "请求失败"
done

printf "%-28s -> " "首页权威入口"
if curl -s -m 20 -L "https://ans.cauai.fun/" | grep -q "first-lesson"; then echo "OK"; else echo "缺失（可能仍是旧版）"; fi

echo
echo "部署完成。查看日志：docker logs -f $CONTAINER"
