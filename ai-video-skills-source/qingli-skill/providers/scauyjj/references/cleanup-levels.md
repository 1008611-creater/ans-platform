# Cleanup Levels

Use these levels to choose the least risky action that satisfies the user's request.

## L0 Scan Only

Actions:

- Inspect disks and top-level directories.
- Identify installed apps, large directories, large files, cache candidates, and protected areas.
- Produce a cleanup plan.

Do not delete or move anything.

## L1 Conservative Cleanup

Safe for routine maintenance and automation.

Allowed:

- User temp directory contents.
- Windows temp directory contents.
- Recycle Bin.
- Windows Error Reporting files.
- Crash dumps and minidumps.
- Browser cache folders: `Cache`, `Code Cache`, `GPUCache`, `ShaderCache`, `DawnWebGPUCache`, `GrShaderCache`, `CacheStorage`.
- Electron/WebView app cache and log folders.
- App logs under explicitly identified log directories.

Rules:

- Skip locked files.
- Do not close applications.
- Do not change ACLs or ownership.
- Do not touch databases, user data, or backups.

## L2 Standard Cleanup

Use when the user asks for more space but wants software to keep working.

Includes L1 plus:

- Old Squirrel/Electron `app-*` versions, keeping the current registered or newest version.
- Update packages and installer leftovers where names indicate cache or update payloads.
- Package-manager caches: npm, pip, Playwright, Puppeteer, NuGet-like app caches when safe.
- Git object compaction with `git gc`, not history deletion.
- Dynamic resource packages for meeting or chat apps when they are clearly rebuildable.

Confirm before:

- Cleaning app directories that are not clearly named cache/update/log/temp.
- Deleting large files from Downloads.
- Cleaning chat app file stores.

## L3 Deep Administrator Cleanup

Use only after explicit confirmation.

Allowed:

- Official Windows component cleanup using DISM.
- Windows Update cache cleanup using service-aware workflow.
- Old restore points only when user confirms.
- Hibernation disabling only when user understands sleep/fast-start impact.
- Protected log/cache cleanup only when it does not require bypassing self-protection.

Never:

- Manually delete `C:\Windows\WinSxS`.
- Manually delete `C:\Windows\Installer`.
- Delete drivers, security databases, app databases, or system-owned unknown files.
- Disable services permanently unless the user explicitly asks.

## L4 Migration Governance

Use when C drive repeatedly fills up.

Candidates:

- App data and cache directories that grow over time.
- Game libraries.
- Docker or WSL storage.
- Phone backups.
- Chat app file storage, not chat databases.
- Download directories.
- Creative app media caches.

Process:

1. Close the application.
2. Copy the source directory to a destination on another drive.
3. Rename the source to `.bak`.
4. Create a junction with `mklink /J`.
5. Start the app and verify data remains available.
6. Keep `.bak` until the user confirms the migration is stable.

Do not automate L4.
