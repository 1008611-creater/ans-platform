---
name: qingli-skill
description: Analyze, compare, preview, and safely clean Windows disk space. Use when a user asks to inspect a full C drive, find large files, compare disk growth, remove temporary files or caches, clean Windows update leftovers, migrate growing application data, or schedule low-risk maintenance. This unified skill routes the request through four bundled community backends and keeps deletion separate from read-only analysis.
---

# 清理Skill

Use this skill as a unified router for four bundled Windows disk-space projects. The default operation is read-only analysis or dry-run preview. Never run several destructive cleaners against the same drive in one pass because their targets overlap.

## Operating modes

- `scan`: inspect the drive and report what consumes space. No deletion.
- `preview`: run each backend's safe preview or dry-run mode and compare overlap. No deletion.
- `clean`: execute only the user-selected cleanup level through the most suitable backend, then verify free space.
- `migrate`: move a user-controlled, high-growth directory to another drive with a rollback path or junction.
- `schedule`: schedule only low-risk maintenance after the user gives a recurrence and threshold.

When the user says only "clean my C drive", map it to `scan` followed by `preview`. If the user explicitly asks to delete or clean, show the categories and estimated space first, then execute only the selected categories. Protect documents, desktop files, photos, videos, music, downloads, chat databases, backups, restore points, `pagefile.sys`, `swapfile.sys`, `C:\Windows\WinSxS`, `C:\Windows\Installer`, drivers, security databases, and the current agent runtime by default.

## Backend selection

1. **Audit and migration:** `providers/vhaozheng` (`windows-disk-cleanup`). Use for top directories, largest files, saved baselines, growth comparison, and migration suggestions. It is the preferred backend when the real problem is a directory that keeps growing.
2. **Risk-classified Windows cleanup:** `providers/scauyjj` (`windows-disk-cleaner`). Use as the primary cleanup backend. It has L0-L4 levels, reusable JSON plans, allowlists, application-specific patterns, dry-run support, and verification.
3. **Module-based PowerShell cleanup:** `providers/orzcls` (`win-disk-cleaner`). Use for an explicit preview of temp files, recycle bin, update cache, browser/app/developer caches, hibernation, WinSxS, and restore-point modules. Always pass skip flags for hibernation, WinSxS, and restore points during comparison unless the user specifically selects them.
4. **Cross-platform Python analysis:** `providers/gccszs` (`disk-cleaner`). Use for bounded sampling, progressive scans, duplicate detection, growth analysis, monitoring, and a second opinion. Run its quick sample before a full scan on a large drive.

## Required workflow

### 1. Preflight

Check Windows version, current free space, target drives, administrator status, and whether the user needs hibernation, sleep, restore points, chat history, Docker, WSL, or developer caches. Do not force-stop applications or change permissions.

Before running a Python backend, validate the interpreter itself rather than trusting command resolution. Run the resolved executable with `--version` and require a successful exit plus a `Python` version string. If `python` resolves to a WindowsApps placeholder or returns no usable output, try `py -3` or locate an installed runtime such as a Conda or standalone Python installation, then pass that explicit executable to the backend. Capture stderr as well as stdout; an empty result, non-zero exit, or invalid JSON means the backend did not run and must not be reported as a successful cleanup.

### 2. Scan or preview

Run the following from this skill directory. Replace `C:` only when the user names another drive.

```powershell
$skillRoot = 'C:\Users\lsb\.codex\skills\qingli-skill'

# Backend 1: audit scan
powershell -ExecutionPolicy Bypass -File "$skillRoot\providers\vhaozheng\scripts\scan_disk_usage.ps1" -Drive C

# Backend 2: fast scan and reusable cleanup plan
powershell -ExecutionPolicy Bypass -File "$skillRoot\providers\scauyjj\scripts\scan_space.ps1" -Drives C: -Mode Fast

# Backend 3: module preview, excluding the highest-risk modules
powershell -ExecutionPolicy Bypass -File "$skillRoot\providers\orzcls\scripts\disk_cleaner.ps1" -DryRun -SkipHibernation -SkipWinSxS -SkipRestorePoints

# Backend 4: bounded Python sample and analysis
& $python "$skillRoot\providers\gccszs\scripts\analyze_disk.py" --sample --path C: --json
& $python "$skillRoot\providers\gccszs\scripts\analyze_disk.py" --path C: --file-limit 10000 --time-limit 30 --json
& $python "$skillRoot\providers\gccszs\scripts\clean_disk.py" --dry-run
```

If a backend needs administrator rights, report that it was skipped and continue with the other read-only backends. Do not turn an elevation failure into permission changes.

### 3. Normalize results

Deduplicate paths and group results into: disposable cache/temp data; safe only after closing an application; review-first app data; user files to move or archive; Windows-managed paths to leave alone. Report the top three categories, estimated recoverable space, and conflicts between backends. Do not claim that a scan result is deleted space.

### 4. Execute one selected cleanup path

Prefer the `scauyjj` plan for normal Windows cleanup:

```powershell
powershell -ExecutionPolicy Bypass -File "$skillRoot\providers\scauyjj\scripts\clean_space.ps1" -PlanPath '<plan path from scan>' -DryRun
```

Remove `-DryRun` only after the user has selected the categories and the plan is current. For application data migration, use the migration backend only after checking the destination drive, closing the application, copying and verifying the data, creating the junction, and recording restore instructions.

### 5. Verify

Recheck free space, confirm the intended directories changed, record skipped or protected items, and report errors. For Python backends, require non-empty valid JSON and inspect its reported counts before accepting the run. Never report success from an exit code alone if the free-space measurement did not change or the path remains present.

## Safety rules

- Never manually delete `C:\Windows\WinSxS`, `C:\Windows\Installer`, `Program Files`, drivers, security software data, `pagefile.sys`, or `swapfile.sys`.
- Use Windows-native cleanup or DISM for Windows-managed component storage.
- Treat `Windows.old`, hibernation, restore points, package-manager caches, Docker/WSL images, browser profiles, and chat/application data as review-first or explicit-confirmation targets.
- Do not delete Downloads, Desktop, Documents, Photos, Videos, Music, backups, or chat databases as part of an automatic cleanup.
- Do not run the four destructive backends sequentially. Use all four for analysis/preview, then one selected executor for cleanup.
- Preserve the source manifest in `references/source-manifest.md` when updating bundled providers.

## Bundled resources

- `providers/vhaozheng`: audit, baseline comparison, destination suggestions, junction migration.
- `providers/scauyjj`: Windows risk classification, cleanup plans, application patterns, migration, and scheduling.
- `providers/orzcls`: modular PowerShell dry-run cleaner and free-tool references.
- `providers/gccszs`: Python analysis, progressive scanning, duplicate detection, monitoring, and dry-run cleanup.
- `references/source-manifest.md`: GitHub URLs, commit pins, and integration notes.
