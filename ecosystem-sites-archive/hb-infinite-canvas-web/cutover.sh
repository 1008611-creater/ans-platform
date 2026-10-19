#!/usr/bin/env bash
set -euo pipefail
APP=/opt/infinite-canvas
NAME=canvas-20260917-batch1authgate5
PREV=$(readlink $APP/current)
echo "PREV=$PREV" | tee /opt/canvas-build/.prev-release

# 切换前先本地核对产物完整性
test -f $APP/releases/$NAME/dist/index.html || { echo "NO index.html"; exit 1; }
ASSET=$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' $APP/releases/$NAME/dist/index.html | head -1)
test -f "$APP/releases/$NAME/dist/$ASSET" || { echo "MISSING ASSET $ASSET"; exit 1; }
echo "asset ok: $ASSET"

# 切换前核对：产物里不能有任何密钥。
# 注意：grep 无匹配返回 1，必须显式吞掉，否则 set -e + pipefail 会在「一切正常」时中断脚本。
DIR=$APP/releases/$NAME/dist
LEAK=0
for pat in oXmal1ZhM8ycml7TSFG1nlpplgNHhR3O zyai_ ziyuai.vip LDXP_REDEEM_SECRET omniroute; do
  N=$( { grep -rl "$pat" "$DIR" 2>/dev/null || true; } | wc -l )
  echo "  leakcheck $pat => $N"
  if [ "$N" != "0" ]; then LEAK=1; fi
done
if [ "$LEAK" != "0" ]; then echo "LEAK_IN_RELEASE"; exit 1; fi

ln -sfn "releases/$NAME" "$APP/current"
echo "current -> $(readlink $APP/current)"

docker compose -f $APP/docker-compose.yml --project-directory $APP exec -T web nginx -t
docker compose -f $APP/docker-compose.yml --project-directory $APP exec -T web nginx -s reload
echo "nginx reloaded"
