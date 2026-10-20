<#
  大肥鱼在 ANS 当运营 —— BulkGen 生图管线（一键）
  用法：
    pwsh -File gen_character.ps1 -Stage pick     # 2x2 四风格变体，先挑风格
    pwsh -File gen_character.ps1 -Stage final -StyleHint '<定稿风格>'   # 出正式资产
  前置：已通过 BulkGen 配置页保存 API Key；未配置会失败（status 退出码 2）。
#>
param(
  [ValidateSet('pick','final')][string]$Stage = 'pick',
  [string]$StyleHint = '',
  [string]$WorkDir = ''
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$NODE     = 'E:\codex\token\dsh-home\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$SCRIPTS  = 'E:\codex\ans\.agents\skills\bulkgen\scripts'
$MASCOT   = 'E:\codex\ans\public\mascot\ans-mascot.png'
$PROFILE  = Join-Path $SCRIPTS 'credential-ui\src\profile.ts'
$GENERATE = Join-Path $SCRIPTS 'generate.js'
if (-not $WorkDir) { $WorkDir = Join-Path $PSScriptRoot '..\assets\gen' }

New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
Set-Location $WorkDir

# 人设正文：ANS 家大小姐「大肥鱼」+ 官方小恐龙
$CAST = "ANS company's young lady heiress named Big Fat Fish (Da Fei Yu), the daughter of the ANS family. " +
  "A pretty anime girl, long straight deep-blue hair with blunt bangs, a small fish-shaped hairclip on her bangs, a fish-tail ornament, " +
  "big glossy eyes with white highlights, soft pink blush, a calm slightly-alluring qingyu mood but fully modest and elegant, the poise of a rich family's young miss. " +
  "Wearing a white off-shoulder hoodie dress with emerald green trim, a dark choker with an emerald pendant, a small emerald ANS badge. " +
  "Her companion is the ANS official baby dinosaur mascot: a chubby mint-green dinosaur with a cream belly, big black round eyes, small rounded horns, soft clay-like 3D toy look, very round and squishy."

function Invoke-BulkGen {
  param([string]$Name, [string]$Prompt, [string[]]$Extra)
  Write-Host "=== generating: $Name" -ForegroundColor Cyan
  $call = @($PROFILE, 'run', 'default', '--', $NODE, $GENERATE, '--prompts', $Prompt, '--input', $MASCOT) + $Extra
  & $NODE @call
  if ($LASTEXITCODE -ne 0) { throw "BulkGen failed for $Name (exit $LASTEXITCODE)" }
  $target = Join-Path $WorkDir "result-$Name.json"
  if (Test-Path (Join-Path $WorkDir 'bulkgen-result.json')) { Move-Item -Force (Join-Path $WorkDir 'bulkgen-result.json') $target }
  Write-Host "  -> $target" -ForegroundColor Green
}

$style = if ($StyleHint) { "Art style: $StyleHint. " } else { '' }

if ($Stage -eq 'pick') {
  Invoke-BulkGen -Name 'styles' -Prompt ($style + $CAST + " Character design variations, keep the same identity, outfit and companion across all cells, four different rendering styles: crisp 2D anime illustration, high-quality 32-bit pixel art, 3D clay toy render, retro cel-shaded animation. Dark navy background with a subtle pixel grid and soft emerald glow, centered bust composition, clean silhouette, high quality.") -Extra @('--mode','variation','--cols','2','--rows','2','--canvas-ratio','1:1','--resolution','2K')
} else {
  Invoke-BulkGen -Name 'avatar' -Prompt ($style + $CAST + " Square avatar composition: head and shoulders of the girl centered, the tiny mint-green dinosaur peeking over her shoulder, dark navy background with a subtle pixel grid and soft emerald glow, crisp clean silhouette, high quality.") -Extra @('--mode','solo','--canvas-ratio','1:1','--resolution','2K')
  Invoke-BulkGen -Name 'keyvisual' -Prompt ($style + $CAST + " Wide key visual: the young lady stands on the left with a confident smile, the chubby mint-green dinosaur sits on the floor beside her holding a stack of papers, dark navy office background with emerald green accents and a subtle pixel grid, lots of clean empty space on the right for a title, cinematic lighting, high quality.") -Extra @('--mode','solo','--canvas-ratio','16:9','--resolution','2K')
}

Get-ChildItem -Filter 'result-*.json' | ForEach-Object {
  $html = Join-Path $WorkDir ("preview-" + $_.BaseName + ".html")
  & $NODE (Join-Path $SCRIPTS 'build_preview.js') $_.FullName $html
  Write-Host "preview: $html"
}
Write-Host '图片 URL 12 小时内有效；需要本地留档时用 download_images.js 落盘。' -ForegroundColor Yellow
