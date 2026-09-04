#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL="$ROOT/payload/director-color-card"
required=(
  "SKILL.md"
  "agents/openai.yaml"
  "scripts/build_palette_card.py"
  "scripts/palette_core.py"
  "scripts/verify_palette_card.py"
  "references/director-index.md"
  "references/175位导演-Seedance2.0色值Prompt全集.md"
  "assets/palette-templates/director-dark.html"
  "assets/palette-templates/director-light.html"
  "assets/palette-templates/scene-analysis.html"
)
for rel in "${required[@]}"; do
  [[ -e "$SKILL/$rel" ]] || { echo "缺少：$rel" >&2; exit 2; }
done
count="$(find "$SKILL/references/seedance-prompts" -maxdepth 1 -type f -name 'D*.md' | wc -l | tr -d ' ')"
[[ "$count" == "175" ]] || { echo "Prompt数量错误：$count" >&2; exit 3; }
echo "PASS：安装包结构完整，Seedance Prompt=175，已限定为色卡包"
