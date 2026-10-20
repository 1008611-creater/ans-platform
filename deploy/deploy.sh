#!/usr/bin/env bash
# ============================================================================
# ANS Platform 发布脚本（在服务器上执行）—— 与线上真实发布约定一致
#
# 用法：
#   bash deploy/deploy.sh --status     # 只读：线上 release/镜像/一致性
#   bash deploy/deploy.sh --plan       # 只读：打印本次将执行的动作
#   bash deploy/deploy.sh              # 构建镜像 → 生成 release → 切换容器
#   bash deploy/deploy.sh --no-build   # 复用已存在的 ans-platform:<sha>
#   TARGET=<sha> bash deploy/deploy.sh # 指定目标（默认 origin/main）
#
# 真实发布约定（权威账本 A-RELEASE-01，别改）：
#   1. 镜像 tag 必须是 ans-platform:<short-sha>，不依赖可变的 :latest。
#   2. 每个 release 一个目录：<RELEASES_DIR>/ans-<short-sha>-<YYYYMMDD>/，
#      内含 production-private.json（从**当前线上** release 复制，只换 image 字段）
#      与 rollback.sh（一条命令回到上一版）。
#   3. compose project = ans-<short-sha>-<YYYYMMDD>，只 up -d app；
#      同文件的 visual-sites 等其它服务不在本脚本职责内。
#   4. 上线后必须校验「容器镜像 ID == 目标镜像 ID」，否则报错（防静默假成功）。
#   5. 所有 compose 调用显式传 -p 与 -f，绝不让 project 名从目录名推导。
#
# 保持的坑位防御：build 完成 ≠ 上线；共享生产必须 flock；src/ 下未跟踪文件会被
# COPY . . 带进构建并让类型检查失败，本脚本在构建前直接拒绝。
# ============================================================================
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/srv/ans-platform-authoritative-main}"
RELEASES_DIR="${RELEASES_DIR:-/srv/ans-releases}"
CONTAINER="ans-platform-app"
SERVICE="app"
BUILD_COMPOSE="compose.yml"
LOCK_FILE="${LOCK_FILE:-/var/lock/ans-platform-deploy.lock}"
LOCK_WAIT="${LOCK_WAIT:-1800}"

live_project() { docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$CONTAINER" 2>/dev/null || true; }
live_config()  { docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$CONTAINER" 2>/dev/null || true; }
image_id()     { docker image inspect -f '{{.Id}}' "$1" 2>/dev/null || true; }
running_id()   { docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null || true; }

status() {
    echo "=== 源码 ==="
    git -C "$DEPLOY_DIR" log --oneline -1
    echo "=== 容器 ==="
    docker ps --filter "name=$CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    echo "=== 线上 release（容器标签是唯一可信来源）==="
    echo "project     : $(live_project)"
    echo "config file : $(live_config)"
    echo "=== 镜像一致性 ==="
    local running tagged
    running="$(running_id)"
    tagged="$(image_id "$(docker inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || echo '')")"
    if [ -z "$running" ]; then echo "无法读取（容器不存在）"
    elif [ "$running" = "$tagged" ]; then echo "一致：$running"
    else echo "不一致！容器跑的不是它标签指向的镜像"; echo "  容器：$running"; echo "  镜像：$tagged"; fi
}

plan() {
    echo "目标提交 : ${TARGET:-origin/main}"
    echo "源码目录 : $DEPLOY_DIR"
    echo "release  : $RELEASES_DIR/ans-<short-sha>-<YYYYMMDD>"
    echo "镜像 tag : ans-platform:<short-sha>"
    echo "切换     : docker rm -f $CONTAINER && compose -p ans-<short>-<date> -f <release>/production-private.json up -d $SERVICE"
    echo "回滚     : <release>/rollback.sh"
}

if [ "${1:-}" = "--status" ]; then status; exit 0; fi
if [ "${1:-}" = "--plan" ]; then plan; exit 0; fi

exec 9>"$LOCK_FILE"
if ! flock -w "$LOCK_WAIT" 9; then
    echo "错误：等待部署锁超时（$LOCK_FILE）。" >&2
    exit 1
fi
echo "已取得部署锁：$LOCK_FILE"

cd "$DEPLOY_DIR"
echo "[1/5] 解析目标提交"
git fetch origin --no-tags --prune
TARGET_REF="${TARGET:-origin/main}"
SHA="$(git rev-parse "$TARGET_REF")"
SHORT="$(git rev-parse --short=8 "$SHA")"
if ! git merge-base --is-ancestor "$SHA" origin/main; then
    echo "错误：$TARGET_REF ($SHORT) 不是 origin/main 的祖先，拒绝发布未经主干验证的提交。" >&2
    exit 1
fi
echo "  目标：$SHORT（$TARGET_REF）"

if [ "${1:-}" != "--no-build" ]; then
    echo "[2/5] 检查构建上下文"
    UNTRACKED="$(git ls-files --others --exclude-standard -- src || true)"
    if [ -n "$UNTRACKED" ] && [ "${ALLOW_UNTRACKED:-0}" != "1" ]; then
        echo "错误：src/ 下存在未跟踪文件，会被 COPY . . 带进构建并让类型检查失败：" >&2
        echo "$UNTRACKED" | sed 's/^/  /' >&2
        echo "  先移到隔离目录（如 /root/ans-quarantine-<date>/）或提交到分支；" >&2
        echo "  确认无害时可 ALLOW_UNTRACKED=1 重跑。" >&2
        exit 1
    fi
    git checkout --detach "$SHA"
    echo "[3/5] 构建镜像 ans-platform:$SHORT（有缓存会快很多）"
    docker compose -p "ans-build-$SHORT" -f "$BUILD_COMPOSE" build "$SERVICE"
    docker tag ans-platform:latest "ans-platform:$SHORT"
else
    echo "[2/5] 跳过构建（--no-build）"
    if [ -z "$(image_id "ans-platform:$SHORT")" ]; then
        echo "错误：镜像 ans-platform:$SHORT 不存在，无法跳过构建。" >&2
        exit 1
    fi
    echo "[3/5] 复用镜像 ans-platform:$SHORT"
fi

echo "[4/5] 生成 release 目录（沿用当前线上定义，只换 image）"
LIVE_PROJECT="$(live_project)"; LIVE_CONFIG="$(live_config)"
if [ -z "$LIVE_CONFIG" ] || [ ! -f "$LIVE_CONFIG" ]; then
    echo "错误：读不到当前线上 compose 定义：$LIVE_CONFIG" >&2
    exit 1
fi
STAMP="$(date +%Y%m%d)"
NEW_PROJECT="ans-$SHORT-$STAMP"
NEW_DIR="$RELEASES_DIR/$NEW_PROJECT"
mkdir -p "$NEW_DIR"
cp "$LIVE_CONFIG" "$NEW_DIR/rollback-private.json"
python3 - "$LIVE_CONFIG" "$NEW_DIR/production-private.json" "ans-platform:$SHORT" <<'PY'
import json, sys
src, dst, image = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(src))
data["services"]["app"]["image"] = image
json.dump(data, open(dst, "w"), indent=2, ensure_ascii=False)
print(f"  image -> {image}")
PY
cat > "$NEW_DIR/rollback.sh" <<SH
#!/usr/bin/env bash
# 回滚到发布前的线上版本（project $LIVE_PROJECT）
set -e
docker rm -f $CONTAINER
docker compose -p $LIVE_PROJECT -f $LIVE_CONFIG up -d $SERVICE
SH
chmod +x "$NEW_DIR/rollback.sh"
docker compose -p "$NEW_PROJECT" -f "$NEW_DIR/production-private.json" config --quiet && echo "  compose 校验通过：$NEW_PROJECT"

echo "[5/5] 切换容器（这一步才是真正上线）"
docker rm -f "$CONTAINER" >/dev/null
docker compose -p "$NEW_PROJECT" -f "$NEW_DIR/production-private.json" up -d "$SERVICE"
sleep 25
docker ps --filter "name=$CONTAINER" --format "{{.Names}} | {{.Status}} | {{.Image}}"
RUNNING="$(running_id)"; TARGET_ID="$(image_id "ans-platform:$SHORT")"
echo "  容器镜像：$RUNNING"
echo "  目标镜像：$TARGET_ID"
if [ "$RUNNING" != "$TARGET_ID" ]; then
    echo "错误：容器没有切换到目标镜像，上线未生效！" >&2
    echo "  回滚：bash $NEW_DIR/rollback.sh" >&2
    exit 1
fi
echo
echo "上线成功：$SHORT（project $NEW_PROJECT）"
echo "  回滚：bash $NEW_DIR/rollback.sh"
echo "  信号：确认后把 ops/deploy-target 与 ops/prod-live 指到 $SHA"
