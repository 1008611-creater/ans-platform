---
name: kuaishou-publisher
description: name: kuaishou-publisher
---

---
name: kuaishou-publisher
description: name: kuaishou-publisher
---

---
name: kuaishou-publisher
description: Execute Kuaishou creator-platform publishing tasks. Use when Codex needs to open or troubleshoot Kuaishou/快手 creator pages, configure Clash proxy routing for Kuaishou domains, log in with user assistance, upload video files, set title/caption/cover/tags, verify publish settings, and stop for explicit confirmation before final publish.
---

# Kuaishou Publisher

## Purpose

Operate the Kuaishou publishing surface carefully. Prepare the post end-to-end, then stop before final publish unless the user explicitly confirms publishing that exact post.

## Browser and Network Setup

- If `www.kuaishou.com` or `cp.kuaishou.com` fails with connection closed, check Clash rule mode and route these domains through `DIRECT` first:
  - `kuaishou.com`
  - `gifshow.com`
  - `yximgs.com`
  - `ksapisrv.com`
  - `kslive.com`
  - `kwai.com`
- If the in-app Browser returns a JSON error for Kuaishou, use a normal system browser or Playwright/Edge profile.
- Preserve login state when possible. Do not ask the user to share passwords or SMS codes.

## Publishing Workflow

1. **Open**
   - Go to `https://cp.kuaishou.com/`.
   - Use the video upload entry. If unauthenticated, pause for the user to log in.

2. **Upload**
   - Confirm the exact video path.
   - Upload one video at a time.
   - Wait for processing to complete before editing fields.

3. **Fill**
   - Apply title, caption, tags, cover text/frame, visibility, and optional first comment from `$kuaishou-publish-packager`.
   - Keep a local note of every field used.

4. **Verify**
   - Check that video preview is nonblank, title/caption are not truncated unexpectedly, cover is readable, and tags/settings match the plan.
   - If the platform shows warnings, surface them to the user and resolve or ask.

5. **Confirm**
   - Before clicking final publish, summarize:
     - video filename
     - title
     - cover
     - caption/tags
     - visibility/settings
   - Ask for explicit confirmation if final publish has not already been approved for this exact post.

6. **Record**
   - After publish, capture URL/post ID if available and record publish time.

## Safety

- Do not click irreversible publish/submit actions without explicit confirmation.
- Do not bypass platform security or CAPTCHA.
- Do not paste private credentials into chat. Let the user type passwords or SMS codes in the browser.

## References

- Read `references/kuaishou-routing.md` when Kuaishou pages fail through proxy or browser automation.
