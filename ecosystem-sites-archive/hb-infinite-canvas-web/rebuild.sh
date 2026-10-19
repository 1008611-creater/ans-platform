#!/bin/sh
# 无限画布前端重建（服务器侧）
# 用法: bash /opt/canvas-build/rebuild.sh
#
# 安全铁律（2026-09-16）：
#   VITE_AGNES_API_KEY 会被 Vite 内联进 bundle，任何访客都能读到。
#   服务器构建**不再注入真令牌**：传占位串，真 Key 由 nginx 的
#   proxy_set_header Authorization 在服务端覆盖注入（浏览器发什么都会被覆盖）。
set -e
echo '--- typecheck ---'
docker run --rm -v /opt/canvas-build/src:/app -w /app/web oven/bun:1.3.13 sh -c 'bun run typecheck 2>&1 | tail -20'
echo '--- build ---'
docker run --rm -v /opt/canvas-build/src:/app -w /app/web -e VITE_AGNES_BASE_URL=/api/agnes oven/bun:1.3.13 sh -c 'bun run build 2>&1 | tail -12'
echo '--- verify: dist must not contain secrets ---'
ASSETS=$(ls /opt/canvas-build/src/web/dist/assets/*.js 2>/dev/null)
if [ -z "$ASSETS" ]; then echo 'NO_ASSETS'; exit 1; fi
FAIL=0
for pat in oXmal1ZhM8ycml7TSFG1nlpplgNHhR3O zyai_ ziyuai.vip LDXP_REDEEM_SECRET omniroute; do
  N=$(grep -l "$pat" $ASSETS 2>/dev/null | wc -l)
  echo "  $pat => $N"
  if [ "$N" != "0" ]; then FAIL=1; fi
done
if [ "$FAIL" != "0" ]; then echo 'LEAK_DETECTED'; exit 1; fi
echo '--- verify: agnes proxy placeholder present ---'
grep -c 'agnes-proxy' $ASSETS || true
echo 'OK'
