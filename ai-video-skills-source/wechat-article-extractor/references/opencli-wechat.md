# OpenCLI WeChat Article Extraction Notes

## Verified Local Setup

Working date: 2026-05-22.

The successful setup used:

- OpenCLI `v1.8.0`
- Browser extension `opencli-extension-v1.0.15`
- Microsoft Edge with a dedicated user data directory
- Edge launch flag `--no-proxy-server`
- OpenCLI daemon on `127.0.0.1:19825`

The key reason for `--no-proxy-server`: on this machine, the Windows proxy was `127.0.0.1:7897`; Edge/Chromium with that proxy could hit `ERR_CONNECTION_CLOSED` on `mp.weixin.qq.com`, while direct access worked.

## Successful Commands

Start/fix bridge:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\lsb\.codex\skills\wechat-article-extractor\scripts\start-opencli-browser-bridge.ps1 -RestartProfile
```

Expected `doctor` output:

```text
[OK] Daemon: running on port 19825
[OK] Extension: connected (v1.0.15)
[OK] Connectivity: connected
```

Download a WeChat article:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\lsb\.codex\skills\wechat-article-extractor\scripts\download-wechat-article.ps1 -Url "https://mp.weixin.qq.com/s/OGOuYJWvyvZnAJwYAjkILg"
```

## Tested Articles

```text
https://mp.weixin.qq.com/s/OGOuYJWvyvZnAJwYAjkILg
title: 暴涨23.2k！个人超级智能体OpenHuman自动记住你的一切，沉淀到卡帕西式知识库
author: 智猩猩AI
publish_time: 2026年5月21日 10:03
status: success

https://mp.weixin.qq.com/s/VhiCbNf1vpodlXGTDaQVjQ
title: 谷歌反重力 2.0:批量拆短视频的新主力
author: 阿锦AI
publish_time: 2026年5月22日 07:00
status: success
```

## Diagnostic Commands

```powershell
npx -y @jackwener/opencli doctor
npx -y @jackwener/opencli profile list
npx -y @jackwener/opencli browser wx open "https://mp.weixin.qq.com/s/..."
npx -y @jackwener/opencli browser wx state
npx -y @jackwener/opencli browser wx get url
```

## Interpretation

Treat the WeChat article as a midstream signal. After extraction:

1. Save title, account, publish time, URL, and local Markdown path.
2. Extract key claims and upstream leads.
3. Verify important facts against primary sources.
4. Turn useful signals into topic cards, not copied article summaries.

## Boundaries

- Do not automate captcha or verification challenges.
- Do not mass scrape accounts.
- Do not rely on the full article as the final fact source.
- Keep quotes short and prefer paraphrase for content production.
