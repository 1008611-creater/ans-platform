---
name: windows-disk-cleaner
description: Diagnose, clean, and manage Windows disk space when users ask to free C drive or other drive space, clean Windows junk files, find large files, remove caches/logs/update leftovers, safely clean app data, schedule recurring cleanup, or migrate high-growth app data from C drive to another drive. Supports scan-only, conservative cleanup, standard cleanup, deep administrator cleanup, and long-term migration strategies with strict safety rules.
---

# Windows Disk Cleaner

Use this skill as a Windows disk-space governance workflow: inspect first, classify risk, present a concise plan, execute only the approved cleanup level, verify, and report.

## Modes

Map the user's request to one mode:

- **scan**: inspect drives and produce recommendations only.
- **clean**: run L1 or L2 cleanup.
- **deep-clean**: use administrator-safe Windows cleanup and protected-cache handling after confirmation.
- **migrate**: move high-growth app data to another drive with a rollback path.
- **schedule**: create recurring low-risk maintenance.

Default mapping:

- "see what is taking space" -> `scan`, L0.
- "clean my PC/C drive" -> `clean`, L1.
- "clean as much as possible but keep software working" -> `clean`, L2.
- "deep clean" or "C drive is critically low" -> `deep-clean`, L3, confirm first.
- "C drive keeps growing" or "move software data to D" -> `migrate`, L4, confirm each item.
- "daily/weekly automatic cleanup" -> `schedule`, L1 with threshold upgrade to L2.

## Cleanup Levels

- **L0 Scan only**: no deletion.
- **L1 Conservative**: user temp, Windows temp, browser/app caches, logs, error reports, crash dumps, recycle bin.
- **L2 Standard**: L1 plus old app versions, update/installer leftovers, meeting dynamic resources, package manager caches, Git object compaction.
- **L3 Deep**: L2 plus official Windows component/update cleanup and protected log/cache cleanup. Require administrator context and confirmation.
- **L4 Migration**: move high-growth app data to another drive and create a directory junction. Require per-item confirmation and rollback.

For details, read `references/cleanup-levels.md`.

## Required Workflow

1. **Preflight**
   - Check Windows host, current user, administrator status, target drives, free space, and running processes/services.
   - If the system is enterprise-managed or security software is self-protected, do not force-stop services or change permissions.

2. **Scan**
   - Run `scripts/scan_space.ps1` first unless the user explicitly provided a recent scan.
   - Default to fast scan on the pressure drive, usually `C:`. Fast scan checks known temp/cache/log targets and writes a reusable JSON cleanup plan.
   - Use `-Mode Deep` only when the user asks to find large space consumers, when fast scan finds little space, or when the drive is critically low.
   - Treat `plan_path` from scan output as the handoff artifact for cleanup and later resume.

3. **Classify**
   - Classify each candidate as `SAFE_DELETE`, `SAFE_IF_CLOSED`, `ADMIN_SAFE`, `CONFIRM_REQUIRED`, `MIGRATE_ONLY`, or `NEVER_DELETE`.
   - Use `references/risk-policy.md` and `references/app-patterns.md`.

4. **Plan**
   - Show a short user-facing summary: expected freeable space by risk class and one recommended action.
   - Do not show long path lists by default. Show top 3 categories and provide "view details" if needed.

5. **Execute**
   - Use `scripts/clean_space.ps1 -PlanPath <plan_path>` for L1/L2 cleanup after scanning.
   - If apps are running, skip `SAFE_IF_CLOSED` items and report which apps to close plus the estimated space.
   - When the user closes apps and says to continue, rerun cleanup with the same plan path and `-Only SAFE_IF_CLOSED`; do not rescan unless the plan is stale or missing.
   - For L3, prefer official Windows tools. Never manually delete `WinSxS`, `Windows Installer`, drivers, or security databases.
   - For L4, use `scripts/migrate_app_data.ps1` only after closing the app and getting explicit confirmation.

6. **Verify**
   - Recheck free space.
   - Report deleted, skipped, protected, and needs-confirmation items.
   - Confirm services remain running when cleaning security software logs.

7. **Schedule**
   - Use `scripts/schedule_cleanup.ps1` for recurring cleanup.
   - Automated cleanup may run L1 daily/weekly and L2 only when a free-space threshold is crossed.
   - Never automate deletion of backups, chat data, user documents, photos/videos, or migration actions.

## Safety Rules

Always protect:

- User documents, desktop files, pictures, videos, music, and personal downloads unless the user confirms specific items.
- Chat databases and primary message stores.
- Phone backups, system backups, and restore points unless the user explicitly confirms.
- `C:\Windows\WinSxS`, `C:\Windows\Installer`, `Program Files` software bodies, drivers, security software databases, `pagefile.sys`, `swapfile.sys`, and current agent runtime/session data.

Never force:

- `git reset`, filesystem ownership changes, permission rewrites, driver/service deletion, or security software self-protection bypass.
- Process termination unless the user explicitly approves closing named applications.

Prefer:

- Official Windows cleanup commands for system components.
- Software-native cleanup settings for WeChat/Enterprise WeChat, cloud drives, security products, Docker, WSL, and games.
- Migration or archival over deletion for user-created files.

## User Prompts

Keep prompts short. Use:

```text
Found about 12.4 GB that may be cleaned.

Low risk: 5.8 GB
Needs confirmation: 4.1 GB
Do not auto-clean: 2.5 GB

Recommended: Standard cleanup. It should not affect logins, documents, or chat history.
```

Offer at most three choices: recommended action, safer action, details.

Read `references/user-prompts.md` when crafting user-facing confirmations.

## Scripts

- `scripts/scan_space.ps1`: read-only scan and JSON/text summary.
- `scripts/clean_space.ps1`: L1/L2 cleanup with allowlists and audit output.
- `scripts/migrate_app_data.ps1`: copy, junction, verify, rollback-friendly migration.
- `scripts/schedule_cleanup.ps1`: create a Windows scheduled task for recurring cleanup.

Run scripts with PowerShell. Use `-WhatIf` or `-DryRun` where available before higher-risk cleanup.
