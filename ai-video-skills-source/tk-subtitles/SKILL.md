---
name: tk-subtitles
description: name: tk-subtitles
---

---
name: tk-subtitles
description: Create TikTok/CapCut-style burned-in English video captions with short phrase-level timing, selected keyword highlights, ASS/SRT outputs, and ffmpeg verification. Use when Codex needs to add or revise subtitles for vertical social videos, commerce clips, TikTok/Reels/Shorts edits, or when the user asks for "TikTok same style captions", "重点词高亮字幕", "不要逐词高亮", or non-overlapping highlighted English captions.
---

# TK Subtitles

## Workflow

Use this skill to produce restrained TikTok-style subtitles:

1. Inspect the video with `ffprobe` for resolution, duration, frame rate, and audio.
2. Find an existing script/VO in nearby project files before transcribing. Prefer the authored script over ASR text.
3. Use `scripts/make_tk_captions.py` to generate:
   - word-timed transcript JSON
   - phrase-level ASS captions
   - plain SRT
   - optional burned-in MP4
4. Preview at least 3 frames: hook, mid-video product claim, closing claim.
5. Verify the final MP4 with `ffprobe` and `ffmpeg -v error -i output.mp4 -f null -`.

## Caption Rules

- Use one `Dialogue` event per phrase, not one event per word.
- Never create active-word karaoke highlighting unless the user explicitly asks for it.
- Highlight only selected important words or phrases: product name, pain point, core feature, number, sale/price claim, CTA.
- Keep adjacent events non-overlapping. Leave a small gap, normally `0.04s`.
- Keep subtitles in the lower third but above TikTok UI safe areas:
  - vertical videos: y position around `0.74 * height`
  - avoid covering bottom 15-20% unless the user asks for lower captions
- Use strong readability: Impact or Arial Bold, white text, black outline, yellow highlight.
- Use all caps for short commerce captions unless the user requests sentence case.
- Fix obvious ASR errors before rendering, especially brand and product terms.

## Script

Run the bundled script from the skill folder or by absolute path:

```powershell
python C:\Users\lsb\.codex\skills\tk-subtitles\scripts\make_tk_captions.py `
  --input "D:\path\video.mp4" `
  --script-file "D:\path\voiceover.txt" `
  --keywords "VEVOR creeper,cold concrete,lays flat,smooth push,rolling seat,less strain" `
  --out-dir "D:\path\subtitles" `
  --output-video "D:\path\video_tiktok_keyhighlight.mp4"
```

When no script is available, omit `--script-file`; the script will use ASR text as a draft. Review and patch the generated ASS if the ASR mishears important wording.

## Review Checklist

Before final response:

- Confirm the ASS event count is phrase-level, not word-level.
- Confirm script output reports `Overlaps: 0`.
- Inspect preview frames for text overflow and keyword density.
- Confirm the burned-in output keeps original orientation and audio.
- Provide links to the final MP4 and reusable ASS/SRT files.
