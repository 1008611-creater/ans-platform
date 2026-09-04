---
name: wechat-redraw-word-sender
description: name: wechat-redraw-word-sender
---

---
name: wechat-redraw-word-sender
description: Send Chinese-named short-drama redraw deliverables to WeChat through either Hermes Agent in WSL or Windows WeChat automation. Use when the user asks to send, forward, or batch-deliver 转绘产物, Step2, Step4, Word/docx, zip files, asset prompt packages, or short-drama episode deliverables to 微信、文件传输助手、微信群/群聊, especially Mexico redraw outputs and sleep-time automated delivery.
---

# WeChat Redraw Word Sender

Use this skill to deliver redraw files to WeChat. Prefer the Hermes Agent route when the user wants unattended delivery, zip/docx packages, or asks to send through Hermes/clawbot. Use Windows WeChat automation only as a desktop fallback or when the user explicitly asks for the open Windows chat window.

## Default Target

- Default group chat: `vicky 王、赵溪桥 (3)`
- Hermes default target: auto-detect the first configured `weixin` target from `hermes send --list weixin --json`
- Default project pattern: a short-drama project folder containing `mx_redraw_step02` and `mx_redraw_step04`
- Default file naming:
  - `第008集 Step2 原片镜头时间轴.docx`
  - `第008集 Step4 墨西哥转绘分镜头提示词包.docx`

## Route Selection

1. Use **Hermes Weixin** first when the user says Hermes, clawbot, Linux agent, sleep-time delivery, file transfer assistant, or asks to send finished `.docx`/`.zip` packages without relying on visible desktop clicks.
2. Use **Windows WeChat automation** when the user explicitly points to an open Windows group/chat window or Hermes is unavailable.
3. Do not claim delivery from intent alone. A send is complete only after the tool/CLI returns success for each file.

## Hermes Weixin Workflow

Use `scripts/send_files_via_hermes_weixin.py`. It calls the Hermes Agent installed in WSL, lists configured Weixin targets, sends each file as `MEDIA:/path`, and staggers sends to avoid iLink rate limiting.

### Preconditions

- Hermes Agent is running in WSL, normally Ubuntu.
- `hermes send --list weixin --json` returns at least one target.
- The files exist on the Windows filesystem and can be mapped to `/mnt/<drive>/...`.
- Do not write or expose Hermes tokens, session tokens, account ids, or dashboard secrets in the skill or final answer.
- For redraw ClawBot delivery jobs, use the project delivery gate rather than raw media send when a `06_AUTOMATION/clawbot_jobs/<job_id>` exists: send a fresh current-job Hermes text probe, wait for explicit user-visible confirmation, then send the media/zip from the same job.
- Never skip a current-job probe by reusing a probe receipt, message id, route registry entry, or `confirmed_visible` value from an older job. Old probes are historical evidence only.
- Treat Hermes CLI `success` as transport evidence. Do not report `user_visible_acceptance` until the current probe is visible and the media/zip is visible or explicitly accepted by the user.

### Commands

List targets:

```powershell
python "C:\Users\lsb\.codex\skills\wechat-redraw-word-sender\scripts\send_files_via_hermes_weixin.py" --list-targets
```

Dry-run a delivery:

```powershell
python "C:\Users\lsb\.codex\skills\wechat-redraw-word-sender\scripts\send_files_via_hermes_weixin.py" `
  --dry-run `
  "D:\codex-work\aaa\deliveries\mx_first10_final_20260623_110739\偏心学弟后我悔不当初_第001-010集_生资产图提示词总表_v1.docx"
```

Send files through Hermes:

```powershell
python "C:\Users\lsb\.codex\skills\wechat-redraw-word-sender\scripts\send_files_via_hermes_weixin.py" `
  --interval-seconds 120 `
  "D:\codex-work\aaa\deliveries\mx_first10_final_20260623_110739\偏心学弟后我悔不当初_第001-010集_生资产图提示词总表_v1.docx" `
  "D:\codex-work\aaa\deliveries\mx_first10_final_20260623_110739\偏心学弟后我悔不当初_第001-010集_Step04生视频提示词Word_v1.zip"
```

If the user supplies a concrete target, pass it with `--target`. Otherwise let the script auto-detect. Do not default to `filehelper` unless it is listed or explicitly requested; unlisted `filehelper` can return iLink `unknown error`.

### Hermes Rate Limit Rules

- Treat `iLink sendmessage rate limited` as a real failure, not success.
- Default to one file per 120 seconds for multi-file delivery.
- The script sets `WEIXIN_SEND_CHUNK_RETRY_DELAY_SECONDS=120` and `WEIXIN_SEND_CHUNK_RETRIES=1` for each send. This avoids rapid retry loops and matches the observed successful route.
- If a send fails with rate limiting, stop the batch, report the last successfully sent file, and retry later with a longer interval only when the user still wants Hermes delivery.

## Windows WeChat Workflow

1. Confirm the user has explicitly asked to send files to WeChat. Do not send on speculative requests.
2. Run the quality gate before staging or sending. The current script does this by default through `D:\codex-work\aaa\tools\validate_redraw_delivery.py`.
3. If the quality gate fails, do not copy files to staging and do not send WeChat. Report the failing episodes and regenerate the failed Step2/Step4 upstream artifacts first.
4. Run `scripts/send_redraw_words_to_wechat.py` with the project folder, episode range, target chat, and `--send`.
5. The script copies deliverables into a staging folder with Chinese filenames, leaving originals untouched.
6. The script activates Windows WeChat, searches the target group, pastes each staged `.docx` file via the Windows file clipboard, and presses Enter to send.
7. If the script cannot find WeChat, cannot identify the files, cannot open the target group, or the quality gate fails, stop and report the exact blocker.

### Command Template

```powershell
python "C:\Users\lsb\.codex\skills\wechat-redraw-word-sender\scripts\send_redraw_words_to_wechat.py" `
  --project-dir "D:\BaiduNetdiskDownload\偏心学弟后我悔不当初" `
  --episodes "008-011" `
  --chat-name "vicky 王、赵溪桥 (3)" `
  --send
```

Use `--dry-run` instead of `--send` only when validating discovery and filenames without sending.

`--skip-quality-gate` is only allowed when the user explicitly says to bypass QA and accepts the risk. The normal skill behavior must keep the gate enabled.

For zip delivery, do not create archives manually. Use:

```powershell
python "D:\codex-work\aaa\tools\package_redraw_delivery.py" `
  --project-dir "D:\BaiduNetdiskDownload\偏心学弟后我悔不当初" `
  --episodes "001-056"
```

## Notes

- Keep WeChat logged in and open on the desktop.
- Do not package files unless the user explicitly asks for a zip.
- Send Step2 and Step4 as separate Word files for each episode.
- For another drama, pass that drama's project folder and requested episode range.
- For Hermes delivery, report the concrete files that returned success and the target label. Do not include hidden tokens or account secrets.
