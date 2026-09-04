---
name: wizstar-bitbrowser
description: name: wizstar-bitbrowser
---

---
name: wizstar-bitbrowser
description: Automate Wizstar in BitBrowser fingerprint browser windows with Playwright CDP. Use when the user asks to open a numbered BitBrowser window, log into wizstar.com with a stored local Google account, switch or reuse local account credentials, or navigate to Wizstar tools such as /tools/generate_video.
---

# Wizstar BitBrowser

Use this skill for Wizstar browser automation inside numbered BitBrowser fingerprint windows. The workflow is script-first and uses Chrome DevTools Protocol (CDP) so it works with an already-open BitBrowser profile.

## Safety

- Treat `data/accounts.local.json` as a local secret file. Do not print passwords in final replies or logs.
- Use one account per run unless the user explicitly asks to switch accounts.
- Stop at Google captcha, 2FA, phone, recovery-email, or blocked-browser checkpoints and ask for manual completion.
- Do not clear cookies, delete sessions, or switch accounts unless the user asks.

## Quick Start

Find a BitBrowser window endpoint:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\lsb\.codex\skills\wizstar-bitbrowser\scripts\00_find_bitbrowser_cdp.ps1 -Window 9
```

Log into Wizstar using the first stored account and open the video generation page:

```powershell
npx --yes --package playwright-core node C:\Users\lsb\.codex\skills\wizstar-bitbrowser\scripts\wizstar_login_generate_video.js --window 9 --account-index 0
```

Use a specific CDP endpoint instead of a window number:

```powershell
npx --yes --package playwright-core node C:\Users\lsb\.codex\skills\wizstar-bitbrowser\scripts\wizstar_login_generate_video.js --cdp http://127.0.0.1:60066 --account-index 0
```

## Workflow

1. Resolve the target BitBrowser window with `00_find_bitbrowser_cdp.ps1`. Do not reuse a CDP port from another window.
2. Run `wizstar_login_generate_video.js` with `--window <n>` and `--account-index <zero-based-index>`.
3. If the script reports an authentication checkpoint, complete the visible Google step manually in that BitBrowser window, then rerun the script.
4. Confirm the browser ends on `https://wizstar.com/tools/generate_video`.

## Accounts

The local account pool lives at:

```text
C:\Users\lsb\.codex\skills\wizstar-bitbrowser\data\accounts.local.json
```

Each entry has:

```json
{
  "email": "google-account@example.com",
  "password": "password",
  "recovery": "optional recovery email"
}
```

The script uses only `email` and `password` by default. Use `--account-email <email>` instead of `--account-index` when the user names a specific account.

## Script Behavior

`wizstar_login_generate_video.js` will:

- connect to the target BitBrowser CDP endpoint;
- open `https://wizstar.com/`;
- detect whether Wizstar already appears authenticated;
- click a Google login button or link;
- fill Google email and password from the local account file;
- click common consent buttons such as `Continue` or `Allow`;
- navigate to `https://wizstar.com/tools/generate_video`;
- verify login with Wizstar session evidence such as `osduss`, `passOsRefreshTk`, or an account-scoped Wizstar draft key instead of treating the public tool URL as authenticated;
- print a short status without exposing the password.

If Wizstar changes its login UI, inspect the page and patch only the selector helpers in the script.

## Current Known-Good Wizstar Login Route

Verified on 2026-07-06 in BitBrowser window 9. For fresh Google accounts, do not use the Login tab. Use the `Register / 注册 / 註冊` tab, tick the terms checkbox, then click the visible Google button with a real mouse click. If an unregistered Google account is sent through the Login tab, Wizstar can show `user not exists` and `access forbid`.

When switching away from a bad Wizstar account, clear only Wizstar origin storage/cookies and close Wizstar/Google tabs, then reopen `https://wizstar.com/login?register_source=2&landing_page=home`. Do not clear the whole browser profile or Google account chooser unless the user explicitly asks.

Do not mark login success from public page access, public tool URLs, `passOsRefreshTk`, or anonymous draft keys. Success evidence must include an account nickname/balance visible on Wizstar and absence of `access forbid`, `user not exists`, and the Login/Register Google panel.

Account ledger rule: mark accounts under `channels.wizstar.status`. Use `unusable` with a reason for accounts that fail this channel, and `usable` only after visible Wizstar authenticated evidence is read back.

Wizstar account selection rule: when the user asks to switch accounts and no specific account is named, choose the next unblocked account from the bottom of `accounts.local.json` upward, not from the top.
