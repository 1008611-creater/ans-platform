# ANS (AI Never Stops) Windows 跨机开发一键初始化脚本
# 用法：在 ans-platform 仓库根目录下打开 PowerShell 运行：
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows-setup-skills-and-rules.ps1

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$GeminiRoot = Join-Path $HOME ".gemini"
$SkillsDest = Join-Path $GeminiRoot "config\skills"
$PluginsDest = Join-Path $GeminiRoot "config\plugins\feishu-doc-publisher"
$WorkspaceSkills = Join-Path $RepoRoot ".agents\skills"

Write-Host "==> [1/3] 创建 Windows 本地 Skills 与配置目录..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $SkillsDest | Out-Null
New-Item -ItemType Directory -Force -Path $PluginsDest | Out-Null
New-Item -ItemType Directory -Force -Path $WorkspaceSkills | Out-Null

Write-Host "==> [2/3] 同步仓库内沉淀的 Skills 至 .agents/skills 与 ~/.gemini/config/skills..." -ForegroundColor Cyan
Copy-Item -Path (Join-Path $RepoRoot "ai-video-skills-source\*") -Destination $WorkspaceSkills -Recurse -Force
Copy-Item -Path (Join-Path $RepoRoot "ai-video-skills-source\*") -Destination $SkillsDest -Recurse -Force

if (Test-Path (Join-Path $RepoRoot "ai-video-skills-source\feishu-doc-publisher")) {
    Copy-Item -Path (Join-Path $RepoRoot "ai-video-skills-source\feishu-doc-publisher\*") -Destination $PluginsDest -Recurse -Force
}

Write-Host "==> [3/3] 恢复全局 GEMINI.md 规则..." -ForegroundColor Cyan
$GlobalRulesSrc = Join-Path $RepoRoot "docs\ops\GLOBAL-GEMINI-RULES.md"
if (Test-Path $GlobalRulesSrc) {
    Copy-Item -Path $GlobalRulesSrc -Destination (Join-Path $GeminiRoot "config\GEMINI.md") -Force
    Copy-Item -Path $GlobalRulesSrc -Destination (Join-Path $GeminiRoot "GEMINI.md") -Force
}

Write-Host "✅ ANS Windows 开发环境 Skills 与全局规则已一键恢复完毕！" -ForegroundColor Green
Write-Host "请查看 docs/ops/ANS-跨电脑Windows开发接力全指南-20261020.md 完成 ~/.ssh/config 免密配置。" -ForegroundColor Yellow
