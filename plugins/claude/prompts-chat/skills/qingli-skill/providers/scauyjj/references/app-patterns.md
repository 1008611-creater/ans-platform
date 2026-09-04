# App Patterns

Use categories first, app-specific paths second.

## Browser and WebView Apps

Common apps:

- Chrome, Edge, Firefox, Quark, 360 Browser, Sogou Browser.
- Electron/WebView apps: Notion, Figma, Discord-like apps, Claude, Cursor, Trae, Doubao, Yuanbao, Qianwen.

Safe targets:

- `Cache`
- `Code Cache`
- `GPUCache`
- `ShaderCache`
- `DawnWebGPUCache`
- `GrShaderCache`
- `Service Worker\CacheStorage`
- `Crashpad\reports`
- `logs`

Avoid:

- `Local State`
- `Preferences`
- `Cookies`
- `Login Data`
- `History` unless user requests browser history cleanup.
- `IndexedDB` and `Local Storage` by default.

## Chat and Office Apps

Common apps:

- WeChat, Enterprise WeChat, QQ, DingTalk, Feishu/Lark, WPS, Tencent Meeting, Zoom, Teams.

Safe targets:

- Logs.
- WebView caches.
- Dynamic resource packages.
- Updater caches.
- Temporary download caches.

Confirm:

- `WeChat Files`
- `WXWorkDownload`
- user file stores.
- message attachments.
- meeting recordings.
- backup folders.

Never auto-delete:

- chat databases.
- account configuration.
- primary message stores.

## Creative Apps

Common apps:

- Adobe, Jianying/CapCut, Figma, XiuXiu, Edraw, video editors.

Safe targets:

- media cache.
- preview cache.
- render cache.
- crash logs.
- update packages.

Confirm or migrate:

- project files.
- source media.
- exported videos.
- asset libraries.

## Game Apps

Common apps:

- Steam, Epic, WeGame, Battle.net, Xbox, emulators.

Safe targets:

- download cache.
- shader cache.
- launcher update cache.
- crash logs.

Migrate:

- game libraries.
- emulator images.

Never auto-delete:

- save games.
- installed game folders unless user requests uninstall/migration.

## Developer Apps

Common data:

- Git repositories.
- npm cache.
- pnpm/yarn cache.
- pip cache.
- Playwright/Puppeteer browsers.
- Docker images/volumes/build cache.
- WSL `.vhdx`.
- JetBrains caches.
- VS Code/Cursor extension package caches.

Safe:

- `git gc` inside Git repositories.
- npm/pip package caches.
- Playwright/Puppeteer browser caches when user accepts re-download.
- IDE logs and caches.

Confirm:

- Docker prune.
- WSL compaction.
- virtual machine disks.
- build directories inside projects.

## Phone and Device Tools

Common apps:

- i4Tools, iTunes, Apple MobileSync, Android emulators, phone assistants.

Safe:

- firmware downloads.
- app installer packages.
- update caches.

Confirm:

- phone backups.
- exported photos/videos.
- app data backups.

## Security and Enterprise Agents

Common apps:

- Windows Defender, QiAnXin/Tianqing, 360, Huorong, VPN and endpoint agents.

Safe:

- old logs only when deletion succeeds without permission rewrites.
- vendor update caches only if not protected.

Never:

- force-disable self-protection.
- delete engines, drivers, quarantine, signatures, or databases.
- take ownership of protected directories.

If self-protection blocks cleanup, report the size and recommend vendor cleanup UI or safe mode/manual admin maintenance.
