#!/bin/sh
# ANS 生产自愈看门狗：应用"还能连上但首页卡死"时自动重启容器。
# 安装：/usr/local/bin/ans-watchdog.sh + cron */3 * * * *
# 判据：
#   1) /api/health 必须 200 且含 "healthy"（快速探活）
#   2) 首页必须能在 20 秒内返回 HTML（真实渲染 —— 这正是 2026-10-20 502 的盲区：
#      上次 /api/health 一直 200，但首页 SSR 流挂住，nginx 侧 502）
# 连续 2 次失败才重启，避免瞬时抖动误杀；重启后记录日志。
set -u
APP="ans-platform-app"
PORT="${ANS_APP_PORT:-3001}"
STATE="/var/run/ans-watchdog.fail"
LOG="/var/log/ans-watchdog.log"
STAMP="$(date '+%F %T')"

fail() {
  n=$(cat "$STATE" 2>/dev/null || echo 0)
  n=$((n + 1))
  echo "$n" > "$STATE"
  echo "$STAMP FAIL($n) $1" >> "$LOG"
  if [ "$n" -ge 2 ]; then
    echo "$STAMP RESTART container=$APP reason=$1" >> "$LOG"
    docker restart "$APP" >> "$LOG" 2>&1
    echo 0 > "$STATE"
  fi
}

ok() { echo 0 > "$STATE"; }

health="$(curl -s -m 10 "http://127.0.0.1:$PORT/api/health" 2>/dev/null || true)"
case "$health" in
  *healthy*) : ;;
  *) fail "health=$health" ; exit 0 ;;
esac

code="$(curl -s -m 20 -o /tmp/ans-watchdog-home.html -w '%{http_code}' "http://127.0.0.1:$PORT/" 2>/dev/null || echo 000)"
size="$(wc -c < /tmp/ans-watchdog-home.html 2>/dev/null || echo 0)"
if [ "$code" = "200" ] && [ "$size" -gt 20000 ]; then
  ok
  exit 0
fi

fail "home code=$code size=$size"
exit 0
