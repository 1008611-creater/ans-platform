---
name: win-disk-cleaner
description: "Windows C: drive disk cleanup using free/open-source tools and PowerShell scripts. Replaces paid 'system optimizer' software. Use when users ask to: clean C drive, free disk space, clean up Windows, delete temp files, clean browser cache, clean system junk, reduce disk usage, clean WinSxS, disable hibernation, find large files, remove bloatware, or any Windows disk space recovery task. Also trigger for Chinese equivalents: C盘清理, 磁盘清理, 清理垃圾, 系统瘦身, 释放空间, 临时文件清理. Covers: temp files, browser caches, Windows Update cache, system logs, app caches (WeChat/QQ/DingTalk/Teams/Discord), developer caches (npm/pip/yarn/Gradle/JetBrains), hibernation, WinSxS, restore points, recycle bin, and recommendations for free disk analysis tools."
---

# Windows Disk Cleaner

Free, universal C: drive cleanup — no paid software needed.

## Workflow

### 1. Assess the situation

Ask user for context if not provided:
- Windows version (10/11)
- Current free space and total drive size
- Any scan results (screenshots from WinDirStat, TreeSize, etc.)
- Whether they are a developer (affects which dev caches to target)
- Whether they use hibernation/sleep mode

### 2. Generate the cleanup script

Read and deliver `scripts/disk_cleaner.ps1` to the user. The script:
- Requires admin privileges (`#Requires -RunAsAdministrator`)
- Has `-DryRun` mode for safe preview
- Has skip flags: `-SkipHibernation`, `-SkipWinSxS`, `-SkipRestorePoints`
- Covers 10 modules: temp, recycle bin, WU cache, browsers, system logs, app caches, dev caches, hibernation, WinSxS, restore points
- Includes bonus Windows Disk Cleanup utility invocation

**Encoding requirement**: Save as UTF-8 with BOM for Chinese Windows compatibility. Use Python:
```python
import codecs
with codecs.open('disk_cleaner.ps1', 'w', encoding='utf-8-sig') as f:
    f.write(content)
```

### 3. Customize for user's environment

Adapt the script based on user context:
- **Non-developers**: Remove module 7 (dev caches) or comment it out
- **Laptop users who need sleep**: Add `-SkipHibernation` to recommended command
- **Users with specific large files**: Add targeted cleanup commands (e.g., Android SDK, USMT.ppkg, Docker images)
- **Chinese software users**: Ensure QQ/WeChat/DingTalk/Baidu paths are included

### 4. Recommend free tools

For details, read `references/free_tools.md`. Key recommendations:
- **BleachBit** — open-source CCleaner replacement
- **WizTree** — fastest disk analyzer (reads NTFS MFT)
- **Everything** — instant file search (`size:>500mb` trick)
- **dupeGuru** — open-source duplicate finder

### 5. Long-term maintenance advice

Provide these tips:
- Enable Storage Sense (Settings > System > Storage)
- Move default install path to D: drive
- Redirect Downloads/Desktop/Documents to D: drive
- Use `mklink /D` for symlink migration of installed apps
- Schedule monthly BleachBit/script runs

## Common large file targets

| File/Folder | Typical Size | Safe to Remove? |
|---|---|---|
| `hiberfil.sys` | RAM size | Yes if not using hibernate |
| `pagefile.sys` | 1-16 GB | Reduce if RAM >= 16GB |
| `WinSxS` | 5-20 GB | DISM cleanup only (never delete manually) |
| `Windows.old` | 10-30 GB | Yes after confirming new OS works |
| `C:\Recovery\` USMT.ppkg | 1-3 GB | Yes after factory setup |
| Android SDK images | 2-10 GB | Yes if not developing |
| Docker WSL vhdx | 5-50 GB | Compact with `wsl --shutdown` + `diskpart` |
| npm/pip/yarn cache | 0.5-5 GB | Yes (re-downloads on demand) |
| JetBrains caches | 1-5 GB | Yes (rebuilds automatically) |
| Shader caches (NVIDIA/Intel/AMD) | 0.2-2 GB | Yes (rebuilds on next launch) |

## Resources

- `scripts/disk_cleaner.ps1` — Main PowerShell cleanup script (10 modules, DryRun support)
- `references/free_tools.md` — Curated list of free/open-source disk tools with usage tips
