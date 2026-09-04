#!/usr/bin/env bash
set -euo pipefail
PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$PACKAGE_ROOT/payload/director-color-card"
if [[ ! -f "$SOURCE/SKILL.md" ]]; then
  echo "安装包不完整：找不到 payload/director-color-card/SKILL.md" >&2
  exit 2
fi
CODEX_ROOT="${1:-${CODEX_HOME:-$HOME/.codex}}"
SKILLS_ROOT="$CODEX_ROOT/skills"
TARGET="$SKILLS_ROOT/director-color-card"
mkdir -p "$SKILLS_ROOT"
if [[ -e "$TARGET" ]]; then
  BACKUP="$SKILLS_ROOT/director-color-card.backup-$(date +%Y%m%d-%H%M%S)"
  mv "$TARGET" "$BACKUP"
  echo "已备份旧版本：$BACKUP"
fi
cp -R "$SOURCE" "$TARGET"
PROMPT_COUNT="$(find "$TARGET/references/seedance-prompts" -maxdepth 1 -type f -name 'D*.md' | wc -l | tr -d ' ')"
if [[ "$PROMPT_COUNT" != "175" ]]; then
  echo "安装校验失败：Seedance Prompt 数量为 $PROMPT_COUNT，不是175。" >&2
  exit 3
fi
echo "安装成功：$TARGET"
echo '请重新打开 Codex 或新建任务，然后输入：'
echo '$director-color-card 小津安二郎，只给我可直接复制到 Seedance 2.0 的色值 Prompt'
