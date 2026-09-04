# Risk Policy

Classify every candidate before deleting or moving it.

## Classes

### SAFE_DELETE

Delete automatically at L1/L2.

Evidence:

- Path is under an allowlisted temp/cache/log/update directory.
- Name includes `Temp`, `Cache`, `Code Cache`, `GPUCache`, `ShaderCache`, `Logs`, `CrashDumps`, `WER`, `SquirrelTemp`, or `Update`.
- Content is known to be rebuildable.

### SAFE_IF_CLOSED

Delete only if the owning app is closed, otherwise skip.

Examples:

- Browser profile caches.
- Electron/WebView caches.
- Meeting app dynamic resources.
- App updater caches.

### ADMIN_SAFE

Delete or clean only with administrator permissions.

Examples:

- Windows temp files.
- Windows Error Reporting.
- Protected app logs.
- Windows Update download cache using service-aware cleanup.

### CONFIRM_REQUIRED

Show a concise summary and ask the user.

Examples:

- Downloads folders.
- Phone backups.
- Old installers outside cache directories.
- Chat app file stores.
- Meeting recordings.
- Large archive files.
- Duplicate files.

### MIGRATE_ONLY

Recommend moving, not deleting.

Examples:

- Game libraries.
- Docker/WSL virtual disks.
- Creative media caches.
- Cloud-drive local mirrors.
- Chat file storage roots.
- Large app data directories with unclear contents.

### NEVER_DELETE

Never delete automatically.

Examples:

- `C:\Windows\WinSxS`
- `C:\Windows\Installer`
- `C:\Program Files` app bodies unless uninstalling through official uninstaller.
- Drivers and service binaries.
- Security software databases and quarantine stores.
- `pagefile.sys`, `swapfile.sys`, `hiberfil.sys` unless using official power settings.
- User documents, desktop files, pictures, videos, music.
- Chat databases and primary message stores.
- Microsoft Store app data under `AppData\Local\Packages`.
- Phone backups unless the user confirms exact backup deletion.
- Active agent runtime/session stores.

## Scoring Heuristic

Use this mental scoring model:

- Risk increases with user-data value, app dependency, database-like names, protected paths, and unknown ownership.
- Risk decreases with cache/temp/log/update names, old age, rebuildable evidence, and vendor-documented cleanup behavior.
- Priority increases with size, C-drive pressure, and recurrence.

High size alone never justifies deletion.

## Required Guardrails

- Never build deletion commands from unvalidated strings.
- Resolve absolute paths before recursive delete or move.
- Ensure final target is inside an intended allowlisted root.
- Prefer per-file deletion for protected logs to avoid deleting parent structure.
- Skip locked files.
- Do not force-stop processes unless the user explicitly confirms the process names.
- Do not take ownership or rewrite ACLs as a cleanup tactic.
