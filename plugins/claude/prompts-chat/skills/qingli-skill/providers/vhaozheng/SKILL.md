---
name: windows-disk-cleanup
description: Analyze Windows system drive pressure, identify what grew, separate low-risk cleanup from high-risk or system-managed storage, suggest safe migration destinations, and perform backed-up folder migrations with restore notes. Use when a Windows user says C: is almost full, asks what can be deleted, wants growth compared with a prior cleanup, or wants to move large folders to another drive without hard-coding the target drive.
---

# Windows Disk Cleanup

## Overview

Use this skill to inspect Windows disk usage, compare against a saved baseline, classify cleanup candidates by risk, and migrate large directories to another drive while preserving compatibility with a junction when needed.

Read [references/safety-categories.md](references/safety-categories.md) before deleting anything that is not obviously disposable cache data.

## Workflow

### 1. Scan and save a baseline

Run the scan script first. Save JSON when you may need a later comparison.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/scan_disk_usage.ps1 -Drive C
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts/scan_disk_usage.ps1 -Drive C -SavePath C:\Temp\c-drive-baseline.json
```

The scan reports:

- drive summary
- top root directories
- largest files
- user profile hotspots
- AppData hotspots
- low-risk cleanup candidates
- review-before-delete candidates
- suggested non-system destination drives

### 2. Compare growth against a baseline

When the user asks what increased since the last cleanup, compare two saved scan files.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/compare_disk_baseline.ps1 -BaselinePath C:\Temp\older.json -CurrentPath C:\Temp\newer.json
```

Use the growth report to answer with concrete paths, size deltas, and dates from file timestamps when helpful.

### 3. Classify before acting

Use three buckets:

- Low risk: disposable caches, crash dumps, updater leftovers, temp content
- Review first: user documents, vendor backup folders, app databases, package stores, chat caches
- Avoid direct deletion: Windows servicing and installer internals

If a folder is already a junction or symlink, inspect the target before reporting size or deleting anything.

### 4. Suggest migration destinations instead of hard-coding a drive

Do not hard-code `F:` or any other destination drive. Rank non-system drives by free space and show suggested destination roots first.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/suggest_migration_targets.ps1 -SourcePath C:\Users\Administrator\Documents\SHARE
```

Use the suggestions to recommend destinations such as `X:\migrated-from-c\...` only after verifying the drive has enough free space buffer.

### 5. Migrate only after backup logic is clear

Use migration for large user-controlled or tool-controlled directories that should keep working from the original path. The migration script copies first, verifies size, swaps the original directory for a junction, and can append a restore note.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/migrate_directory_with_junction.ps1 `
  -SourcePath C:\Users\Administrator\AppData\Local\Arduino15\packages `
  -DestinationRoot X:\migrated-from-c `
  -RestoreGuidePath X:\restore-guides\arduino15-packages.md
```

For a dry run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/migrate_directory_with_junction.ps1 `
  -SourcePath C:\Users\Administrator\AppData\Local\Arduino15\packages `
  -DestinationRoot F:\C_drive_migrated `
  -WhatIf
```

### 6. Verify and document

After cleanup or migration:

- re-check free space on the source drive
- confirm cleaned directories are actually near zero
- confirm migrated paths are junctions pointing at the intended destination
- record restore instructions if anything was moved or deleted intentionally

## Safety Rules

- Prefer application-native cleanup for vendor-managed backup folders when the product exposes a cleanup button.
- Delete only contents of low-risk cache directories unless the user explicitly wants directory removal too.
- Treat SQLite databases, chat history, note apps, project outputs, and package stores as review-first data.
- Never directly delete `C:\Windows\Installer`, `C:\Windows\WinSxS`, or `C:\Program Files (x86)\InstallShield Installation Information`.
- Never migrate or delete a directory until you verify whether it is a normal folder, junction, or symlink.
- Keep at least a reasonable free-space buffer on the destination drive; do not recommend a target that would end up nearly full after migration.
- Write restore information whenever migration changes the original path.

## Resources

### scripts/

- `scan_disk_usage.ps1`: inspect current usage and optionally save JSON
- `compare_disk_baseline.ps1`: compare two saved scans and rank growth
- `suggest_migration_targets.ps1`: rank destination drives and suggest candidate roots
- `migrate_directory_with_junction.ps1`: copy, verify, switch to a junction, and append restore notes

### references/

- `safety-categories.md`: deletion and migration risk guidance for common Windows disk cleanup scenarios
