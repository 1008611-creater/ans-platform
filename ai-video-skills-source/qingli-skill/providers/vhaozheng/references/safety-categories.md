# Safety Categories

Use this reference to classify findings before cleaning or migrating.

## Low Risk

Delete contents directly when the user wants space back and no active process is relying on them.

- `%LOCALAPPDATA%\Temp`
- `%LOCALAPPDATA%\Temp\wsl-crashes`
- `%LOCALAPPDATA%\pip\cache`
- `%LOCALAPPDATA%\npm-cache`
- `%LOCALAPPDATA%\CrashDumps`
- updater download folders
- regenerated IDE index caches

Typical effect of deletion:

- future downloads or indexing may take longer once
- the owning app may recreate the folder

## Review First

Back up, migrate, or get explicit confirmation before removal.

- `Documents`, `Desktop`, project outputs, exported datasets
- package stores with installed toolchains
- app databases such as SQLite files
- note-taking or chat application data
- vendor backup folders such as Tencent or office protection backups
- folders that contain installers, SDKs, or chip support packs that might still be needed

Typical safer actions:

- copy to another drive
- migrate and preserve original path with a junction
- use the application's built-in cleanup flow

## Avoid Direct Deletion

Do not delete these paths manually unless the user explicitly asks for a specialized remediation and you have a narrowly scoped vendor-supported method.

- `C:\Windows\Installer`
- `C:\Windows\WinSxS`
- `C:\Program Files (x86)\InstallShield Installation Information`
- other Windows servicing internals

Typical safer actions:

- use official uninstallers
- use Windows cleanup tools
- explain why the directory is large but system-managed

## Migration Heuristics

Prefer migration when all of the following are true:

1. the folder is large
2. it belongs to a user-controlled workflow or tool cache/store
3. software expects the path to remain stable
4. another local drive has enough free space after reserving a safety buffer

Prefer deletion when all of the following are true:

1. the folder is disposable cache or crash data
2. the owner application can recreate it
3. there is no user content that would be lost

## Suggested Free-Space Buffer

Use these heuristics when recommending a destination:

- keep at least `20 GB` free after small migrations
- keep at least `10%` free after larger migrations when possible
- avoid recommending removable or nearly-full drives unless the user asks for them explicitly
