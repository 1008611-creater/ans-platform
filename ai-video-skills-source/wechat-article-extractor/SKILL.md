---
name: wechat-article-extractor
description: name: wechat-article-extractor
---

---
name: wechat-article-extractor
description: Extract and preserve WeChat public-account articles from mp.weixin.qq.com links into Markdown for AI research and evidence workflows. Use when Codex needs to read a Chinese WeChat/微信公众号 article, when Jina/ReadGZH returns captcha, 401/402/429/503, "环境异常", or when OpenCLI Browser Bridge should be used to download公众号文章正文, save evidence paths, and continue upstream research without bypassing verification.
---

# WeChat Article Extractor

## Core Rule

Use a compliant fallback ladder:

```text
Jina / existing reader -> OpenCLI Browser Bridge -> user-authorized browser/manual paste
```

Do not bypass captcha, login, paywall, or platform verification. If the page requires manual verification, stop and ask the user to complete it in the opened browser or paste the readable text.

## Quick Workflow

1. Try the workspace's normal web-reading preference first when appropriate, especially `jina-search`.
2. If Jina/ReadGZH fails or returns captcha/verification, use OpenCLI Browser Bridge.
3. Start the bridge:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\lsb\.codex\skills\wechat-article-extractor\scripts\start-opencli-browser-bridge.ps1 -RestartProfile
```

4. Download a WeChat article:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\lsb\.codex\skills\wechat-article-extractor\scripts\download-wechat-article.ps1 -Url "https://mp.weixin.qq.com/s/..." -OutputDir "D:\codex-work\ip\output\demand_radar\weixin-opencli-test"
```

5. Read only enough of the saved Markdown to extract a source card. Do not reproduce the full article unless the user explicitly needs local processing.
6. Record the saved path, title, author, publish time, extraction method, and any blockers.
7. For research workflows, treat WeChat articles as midstream signals and continue upstream to official docs, GitHub, YouTube, Telegram/Discord, model hubs, papers, or primary product pages.

## Important Local Finding

On the user's machine, Edge/Chromium with the normal system proxy (`127.0.0.1:7897`) may fail on `mp.weixin.qq.com` with connection closed. The working setup uses a dedicated Edge profile loaded with the OpenCLI extension and `--no-proxy-server`.

The verified OpenCLI extension version was `opencli-extension-v1.0.15.zip` from OpenCLI `v1.8.0`.

## Failure Handling

- `Browser Bridge extension not connected`: run `start-opencli-browser-bridge.ps1`, then `npx -y @jackwener/opencli doctor`.
- `failed - no title`: inspect the page with `opencli browser wx state`; it is often a verification page or connection error.
- `ERR_CONNECTION_CLOSED`: restart the bridge with `--no-proxy-server` via the bundled script.
- `环境异常`: ask the user to complete verification in the opened browser, then retry; do not automate captcha.
- `ReadGZH 429`: record rate limit and use OpenCLI or manual browser.
- `Jina 401/402/503`: record failure and use OpenCLI or manual browser.

## Evidence Card Template

```text
URL:
Title:
Account:
Published:
Extracted at:
Extractor: Jina / ReadGZH / OpenCLI Browser Bridge / manual paste
Saved Markdown:
Read status: success / blocked / partial
Key points:
Upstream leads:
Content idea:
Xianyu opportunity:
Risks:
Next step:
```

## References

Read `references/opencli-wechat.md` when setting up a new machine, diagnosing Browser Bridge issues, or explaining the tested solution.
