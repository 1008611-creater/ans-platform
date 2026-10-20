# ANS · B站 Day0 一键发布
# 用法：pwsh -File publish.ps1          （正式上传）
#       pwsh -File publish.ps1 -Dry     （只校验）
param([switch]$Dry)

$ErrorActionPreference = "Continue"
$V = "E:\codex\ans\docs\bilibili-ans-launch\video"
$py = "C:\Users\lsb\pipx\venvs\bilibili-cli\Scripts\python.exe"

Write-Host "=== 1/4 检查登录状态 ===" -ForegroundColor Cyan
& "$env:USERPROFILE\.local\bin\bili.exe" status
$st = & "$env:USERPROFILE\.local\bin\bili.exe" status 2>&1 | Out-String
if ($st -match "not_authenticated") {
  Write-Host "未登录。请运行下面这条命令，然后用 B站 App 扫码：" -ForegroundColor Yellow
  Write-Host "    bili login" -ForegroundColor White
  Write-Host "扫码完成后再执行本脚本。" -ForegroundColor Yellow
  exit 1
}

Write-Host "=== 2/4 凭据自检 ===" -ForegroundColor Cyan
& $py "$V\publish.py" --check-credential
if ($LASTEXITCODE -ne 0) {
  Write-Host "凭据不可用：先跑 bili login 扫码，再执行本脚本。" -ForegroundColor Red
  exit 1
}

Write-Host "=== 3/4 校验素材 ===" -ForegroundColor Cyan
& $py "$V\publish.py" --dry
if ($LASTEXITCODE -ne 0) { Write-Host "校验未通过" -ForegroundColor Red; exit 1 }
if ($Dry) { Write-Host "dry-run 结束。" -ForegroundColor Green; exit 0 }

Write-Host "=== 4/4 上传并发布 ===" -ForegroundColor Cyan
& $py "$V\publish.py"
Write-Host ""
Write-Host "发布后请到创作中心确认：① AIGC 内容声明已勾选 ② 分区与标签无误 ③ 封面已生效" -ForegroundColor Yellow
