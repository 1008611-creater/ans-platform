---
name: mx-shortdrama-01-frame-extract
description: name: mx-shortdrama-01-frame-extract
---

---
name: mx-shortdrama-01-frame-extract
description: "Step 01 for Chinese short-drama redraw to Mexico: extract and enhance a production-complete evidence package from one episode video, including native-resolution reference frames without a fixed frame-count cap, 60-second chunk manifests for long episodes, shot-level start/mid/end frame supplements, TransNetV2 shot segmentation, Baidu OCR API smart hard-subtitle/text QA, audio/ASR handoff, and evidence-pack alignment before source timeline reconstruction and shot prompt production. Use when the user provides a domestic short-drama video and asks for frame extraction, key frames, shot frames, subtitle frames, source evidence frames, OCR, shot detection, or evidence before timeline/prompt reconstruction."
---

# MX Shortdrama 01 Frame Extract

## Purpose

Build the accepted Step 01 evidence package for one episode before any timeline writing, localization, or shot prompt writing. This step must gather six evidence layers: audio-first dialogue/performance ledgers, hard-subtitle OCR, shot segmentation, dense native-resolution frame evidence, shot-level start/mid/end frame supplements, and audio/ASR handoff. Prior workflow failures often came from extracting too few frames or treating performance timing as an afterthought; for redraw work, missing camera states and missing dialogue/emotion timing are worse than extra evidence frames.

The default order is audio-first, then audio-guided frame extraction. Run `scripts/build_audio_evidence.py` before final frame selection; it extracts mono 16 kHz WAV, builds VAD/dialogue/performance ledgers with the best locally available tools, records unavailable optional tools as blockers, and writes `EPXXX_audio_event_ledger.csv`. Feed that ledger back into frame extraction with `--audio-events` so subtitle changes, offscreen speech, breath, silence, and emotional turns can request visual evidence. Do not generate, tag, or carry forward post-added sound effects or background music for redraw production.

Default pairing for the current Step 01 is the quality-first full chain. Do not treat Qwen3 ASR, timestamp alignment, or the speaker second-pass as optional for redraw episodes unless the user explicitly selects `stable_batch` for speed:

1. `ffmpeg` or `imageio_ffmpeg` for source audio extraction.
2. `build_audio_evidence.py --quality-profile hq_full` for VAD/dialogue/audio-event ledgers. Use Silero VAD when installed; otherwise use the built-in energy VAD fallback as a timing cue. Run `Qwen/Qwen3-ASR-1.7B` with `Qwen/Qwen3-ForcedAligner-0.6B` for local Chinese ASR plus SRT-grade timestamps. In `hq_full`, do not silently fall back to `faster-whisper`; if Qwen3 or timestamp output fails, write the blocker and fail the strict quality gate before downstream steps pretend the audio chain is complete.
3. `extract_episode_frames.py --audio-events EPXXX_audio_event_ledger.csv` for audio-guided unbounded frame extraction.
4. `enhance_episode_evidence.py --skip-ocr` for the stable Step01 evidence pack, then run Step02 `smart_selective_ocr.py --engine baidu-api` on triggered subtitle/text windows. Baidu OCR API is the default OCR route; local OCR is not a default fallback.
5. `validate_episode_evidence.py --require-audio-ledger` for acceptance checks.

Use Qwen3-ASR, Qwen3-ForcedAligner, CapsWriter timestamp/SRT outputs, WhisperX, pyannote.audio, sherpa-onnx/WeSpeaker speaker passes, emotion2vec, Baidu OCR API, and OmniShotCut as quality layers. The default `hq_full` route runs the installed high-value audio layers by default and records explicit blockers/warnings when a layer cannot produce evidence. PANNs, CLAP, BEATs, or other sound/music taggers are outside the default redraw workflow because post-added sound effects and background music are not production deliverables. The high-quality audio helper is enabled by default through `build_audio_evidence.py --quality-profile hq_full`; on this machine that runs the pinned `shortdrama_hq310` environment for Silero VAD and optional performance checks, while Qwen3 ASR is delegated to `C:\Users\lsb\anaconda3\envs\qwen3_asr312\python.exe` through `--asr-python`. If the user explicitly chooses `--quality-profile stable_batch`, the script may continue with available ledgers and record unavailable tools as blockers/warnings.

The frame set must be production-complete, not capped. It should preserve enough visual and audio-timed evidence to support later asset prompts, source timelines, and grouped all-purpose reference image-to-video prompts. If the optional `$mx-shortdrama-frame-anchor-addon` is explicitly active, the same evidence can also support generated `首帧`, `关键帧`, and `尾帧` image prompts. Original-quality PNG frames are the only valid redraw references; contact sheets are preview-only.

If a full episode is too large or risks timing out, process it in 60-second chunks and label each chunk as that episode's `第几分钟内容`; then merge the manifests and keep the chunk manifests for Step 02-04 review.

Always create a separate shot-level supplement for redraw episodes: extract each detected shot's start, middle, and end frame into `shotlevel_start_mid_end_frames/` and write `shotlevel_start_mid_end_manifest.csv/json`. This supplement is required for timeline reconstruction and prompt anchoring; it does not replace `reference_frames_original/`.

Use two profiles:

- `hq_full`: default for redraw. Use WAV extraction, Silero/energy VAD, Qwen3-ASR-1.7B, Qwen3-ForcedAligner-0.6B, speaker second-pass attempt, audio-guided unbounded frames, TransNetV2, Baidu OCR API smart QA, validation, and Step04 prewrite gates. Strict quality gate blocks if primary Qwen3 transcript/timestamp evidence is missing.
- `stable_batch`: explicit speed fallback only. Use TransNetV2 + audio handoff, and record unavailable Qwen3/speaker/OCR layers as blockers/warnings. Do not use it for quality-first reruns unless the user explicitly accepts the downgrade.

## Required Input

```text
Episode video path:
Episode ID:
Output directory:
```

## Evidence Coverage Policy

- Do not impose a fixed frame-count cap for short-drama redraw. Step 01 is accepted by evidence completeness, source-resolution fidelity, sorted manifests, audio/ASR handoff, and downstream usefulness, not by staying inside 80-100 frames or any other preset range.
- Default extraction is `unbounded_evidence_coverage`. Export every shot start/mid/end, sharp mid-shot candidate, subtitle change, key visual change, and dense motion interval needed to reconstruct the episode and later write frame/video prompts.
- Use 60-second chunking when the episode has too much content for one pass. Treat each chunk as `第1分钟内容`, `第2分钟内容`, etc.; write per-chunk manifests under `minute_chunks/`, then merge them into the episode manifest.
- Keep repeated near-identical frames only when they clarify subtitle timing, acting change, hand/object motion, screen readability, or transition handoff. Do not drop real shot changes simply to satisfy an old frame budget.
- Use `--bounded` only for legacy review packets or when the user explicitly asks for a fixed frame-count package. Bounded mode is not the accepted production evidence mode for redraw.
- Step 01 is not accepted if the exported reference set is sparse enough to hide camera cuts, reaction chains, prop inserts, readable documents/UI, subtitle changes, transition states, or audio/dialogue handoffs.
- The shot-level start/mid/end supplement is required by default and may add evidence beyond the main manifest. Missing this supplement is a validation failure unless the user explicitly waives shot-level prompt production.

## Extraction Rules

- Extract each complete shot's start, middle, and end frame.
- For static shots with repeated frames, keep the clearest sharp frame as the primary middle frame.
- For motion shots, extract enough intermediate frames to show the full movement state without hiding camera or actor path changes.
- Around complex cut chains, reaction-shot exchanges, prop close-ups, readable documents/UI, and white-flash or stylized transitions, prefer dense coverage and preserve transition/tail states that will matter to later frame prompts.
- When visible subtitles change, extract subtitle frames in order.
- When key people, props, documents, UI, signage, or readable text appear, extract additional evidence frames.
- If a single pass becomes too large or times out, split by 60-second chunks instead of deleting evidence. Only remove truly duplicate frames that add no subtitle, action, prop, camera, or continuity information.
- Save original-quality frames in sequential filename order under `reference_frames_original/`. Do not resize, crop, JPEG-compress, or use the contact sheet as generation reference.
- Do not treat every audible line as main-character dialogue. Mark ambient/procedural dialogue candidates separately when the speaker is off-screen, a background worker, or another couple in the scene.

## Tool Layers

Use the best available tool for each layer:

1. Audio-first layer:
   - Always extract mono 16k WAV first with `scripts/build_audio_evidence.py`.
   - Build `EPXXX_audio_event_ledger.csv/json`, `EPXXX_dialogue_ledger.csv/json`, and `EPXXX_vad_segments.csv/json` before frame extraction.
   - Feed `EPXXX_audio_event_ledger.csv` into `extract_episode_frames.py --audio-events`.
   - Treat Qwen3-ASR-1.7B as the preferred local Chinese ASR layer and Qwen3-ForcedAligner-0.6B as the timestamp layer for `EPXXX_transcript.srt`. Keep `faster-whisper` as a fallback, not the default.
   - CapsWriter can be used as a practical Qwen3-based timestamp/SRT reference layer when its offline package is installed; do not rely on it for speaker diarization unless a separate speaker module is configured.
   - Use pyannote.audio, sherpa-onnx diarization/speaker identification, or WeSpeaker as a second-pass speaker layer only when available. Do not accept diarization blindly; verify speaker identity against visible cuts, subtitles, and mouth movement.
   - Use emotion/voice tools only for dialogue performance, breath, silence, hesitation, crying/laughing/gasping, and emotional turn candidates. Do not run SFX/music taggers for normal redraw production.
   - Preferred candidates are listed in `references/audio-evidence-tool-stack.md`: Qwen3-ASR / Qwen3-ForcedAligner for Chinese ASR plus SRT timestamps, CapsWriter for practical SRT/reference output, WhisperX / whisper-timestamped as alignment fallbacks, pyannote.audio, sherpa-onnx, WeSpeaker, or NeMo for speaker passes, and Silero VAD for speech activity. Audio-language models are optional QA only when they help understand dialogue or performance; they are not for background music or post sound design.
   - Audio evidence drives where to look; it does not override visible frames, hard subtitles, or manual review by itself.
2. Hard-subtitle layer:
   - Preferred: Baidu OCR API via `scripts/smart_selective_ocr.py --engine baidu-api`.
   - Local OCR such as RapidOCR/RapidVideOCR/PaddleOCR is not the default fallback; use it only when the user explicitly accepts a non-API downgrade or for comparison evidence.
   - EP007 calibration result: ASR alone missed short subtitles and timing-sensitive office voices; smart-trigger API OCR must check the ASR timestamp window instead of relying on local OCR or broad timeline prose.
   - Hard subtitles outrank ASR when they disagree.
3. Dialogue/audio layer:
   - Always extract audio for ASR handoff.
   - Local ASR is optional. Use `Qwen/Qwen3-ASR-1.7B` plus `Qwen/Qwen3-ForcedAligner-0.6B` as the preferred Chinese auxiliary ASR/timestamp pair when a compatible environment exists. Use `faster-whisper large-v3-turbo` as a secondary ASR comparison.
   - Speaker attribution is a separate pass. For unknown speakers, run diarization/clustering; sherpa-onnx speaker identification requires enrollment examples and does not by itself discover speakers in a mixed episode.
   - If no ASR is available, keep OCR subtitles and audio paths, and mark ASR pending instead of inventing dialogue.
4. Shot layer:
   - Stable default: TransNetV2 via `transnetv2-pytorch`, then export shot start/end times and shot keyframes.
   - High-quality comparison: OmniShotCut in `clean_shot` or `default` mode. If OmniShotCut and TransNetV2 disagree, inspect the affected native frames before changing the selected reference set.
   - EP001 calibration result: OmniShotCut detected 81 shots and TransNetV2 detected 80; 78 Omni boundaries were within 5 frames of TransNetV2. Use OmniShotCut as QA or sensitivity layer, not a blind replacement.
   - Secondary comparison: PySceneDetect `detect-content` or `detect-adaptive`.
   - Fallback: the bundled OpenCV detector in `scripts/extract_episode_frames.py`.
5. Visual layer:
   - Use Codex/GPT visual拉片 directly from native-resolution reference frames and TransNetV2 shot keyframes.
   - Do not route Step 01 or Step 02 visual understanding to Gemini, Qwen, or other external VLMs unless the user explicitly asks.
6. Frame layer:
   - Always output the complete accepted evidence frame set sorted by `timecode` at native video resolution, plus `minute_chunks/` when chunking is used.
   - When audio ledgers exist, pass them to `scripts/extract_episode_frames.py --audio-events <ledger>` so frame candidates include dialogue starts/ends, silence/reaction moments, breath, and emotion turns. Post-added SFX and background music must not drive extraction.
7. Evidence QA layer:
   - `scripts/enhance_episode_evidence.py` writes both JSONL and SQLite evidence packages.
   - `scripts/validate_episode_evidence.py` verifies manifest, native PNGs, OCR, TransNetV2, SQLite row counts, audio handoff, and optional ASR. Treat validation failure as a hard stop before Step 02.

## Procedure

1. Confirm video metadata: duration, fps, resolution, aspect ratio.
2. Run `scripts/build_audio_evidence.py` immediately to create the source audio path/timecode basis, VAD ledger, dialogue ledger, audio-event ledger, tool-status JSON, and ASR blocker if needed.
3. Attempt ASR/VAD/diarization and optional emotion/performance tooling through the audio evidence script or the high-quality add-on. If tools are blocked, write the blocker and continue with audio handoff instead of inventing performance cues.
4. Use default unbounded evidence coverage unless the user explicitly asks for `--bounded`. Do not use 80-100 frames as the normal redraw budget.
5. Run shot segmentation and write the shot list.
6. Run `scripts/extract_episode_frames.py` to export complete evidence frames and per-minute chunk manifests. Pass `EPXXX_audio_event_ledger.csv` with `--audio-events`.
7. Check that `frame_count` and `shotlevel_start_mid_end_manifest` are dense enough for Step 04 prompt anchoring. In default unbounded mode, coverage completeness matters more than a target count.
8. Run `scripts/enhance_episode_evidence.py --skip-ocr` to create TransNetV2 shots, `EPXXX_evidence_pack.jsonl`, and `EPXXX_evidence_pack.sqlite`; run Step02 Baidu smart OCR on triggered subtitle/text windows.
9. Run `scripts/validate_episode_evidence.py --require-audio-ledger`. Treat failure as a hard stop before Step 02.
10. Confirm `reference_frames_original/` exists, has the same frame count as the manifest, and every image matches the source resolution.
11. Review the contact sheet for missing dialogue, prop, text, movement, silence/reaction, breath, or emotion evidence. Use it only as a preview, never as generation reference.
12. Generate the required start/mid/end shot-level supplement and manifest. Do not wait for Step 02 to discover that the main frame package was too sparse.
13. Output only evidence artifacts and a short summary. Do not write the plot, localize, or create asset prompts in this step.

## High-Quality Add-On Procedure

Run this only after the stable evidence package exists.

1. Confirm `reference_frames_original/` contains native PNGs and the manifest has `frame_index`, `time_sec`, and `path`.
2. Run OmniShotCut on the source video and compare its shot boundaries against TransNetV2.
3. Generate subtitle-region crops from OCR-positive native frames and run RapidVideOCR on those crops.
4. Run Baidu OCR API on the same crops as the primary smart-OCR text source; only run local OCR as explicit comparison evidence.
5. Run Qwen3-ASR + Qwen3-ForcedAligner on `audio/EPXXX_16k_mono.wav` via the dedicated `qwen3_asr312` environment; use CapsWriter as a reference/cross-check when available. Use faster-whisper only if the user explicitly switches to `stable_batch` or asks for comparison.
6. Write a trial summary that selects the default evidence source for each layer and lists disagreement frames or phrases.
7. Update downstream Step 02 source timeline from the selected evidence source plus explicit disagreement notes.

## Commands

```powershell
& "C:\Users\lsb\anaconda3\envs\shortdrama_hq310\python.exe" <skill_dir>\scripts\build_audio_evidence.py `
  --video "D:\path\episode.mp4" `
  --episode-id "EP001" `
  --out-dir "D:\path\output\EP001_frames" `
  --quality-profile hq_full `
  --asr-backend qwen3 `
  --asr-model "Qwen/Qwen3-ASR-1.7B" `
  --asr-aligner-model "Qwen/Qwen3-ForcedAligner-0.6B" `
  --asr-fallback none `
  --asr-python "C:\Users\lsb\anaconda3\envs\qwen3_asr312\python.exe" `
  --asr-timeout-sec 1200 `
  --model-cache-dir "D:\codex-work\aaa\tools\model_cache\huggingface" `
  --asr-language zh `
  --speaker-backend auto `
  --strict-quality-gate

& "C:\Users\lsb\anaconda3\envs\shortdrama_hq310\python.exe" <skill_dir>\scripts\extract_episode_frames.py `
  --video "D:\path\episode.mp4" `
  --episode-id "EP001" `
  --out-dir "D:\path\output\EP001_frames" `
  --unbounded `
  --chunk-sec 60 `
  --audio-events "D:\path\output\EP001_frames\EP001_audio_event_ledger.csv"

& "C:\Users\lsb\anaconda3\envs\shortdrama_hq310\python.exe" <skill_dir>\scripts\enhance_episode_evidence.py `
  --video "D:\path\episode.mp4" `
  --episode-id "EP001" `
  --out-dir "D:\path\output\EP001_frames"

& "C:\Users\lsb\anaconda3\envs\shortdrama_hq310\python.exe" <skill_dir>\scripts\validate_episode_evidence.py `
  --episode-id "EP001" `
  --out-dir "D:\path\output\EP001_frames" `
  --require-audio-ledger

& "C:\Users\lsb\anaconda3\envs\shortdrama_hq310\python.exe" <skill_dir>\scripts\run_high_quality_trials.py `
  --video "D:\path\episode.mp4" `
  --episode-id "EP001" `
  --out-dir "D:\path\output\EP001_frames" `
  --project-root "D:\path\output" `
  --hq-python "C:\Users\lsb\anaconda3\envs\shortdrama_hq310\python.exe" `
  --paddle-python "C:\Users\lsb\anaconda3\envs\shortdrama_paddle310\python.exe" `
  --omnishotcut-dir "D:\codex-work\aaa\tools\shortdrama_hq\OmniShotCut"
```

## Output Files

- `EPXXX_frame_manifest.csv`
- `EPXXX_frame_manifest.json`
- `EPXXX_contact_sheet.jpg`
- `reference_frames_original/EPXXX_001_HH-MM-SS.mmm_reason.png`
- `EPXXX_shot_list.csv`
- `EPXXX_shot_list.json`
- `transnet_shots/EPXXX_transnet_shots.csv`
- `transnet_shots/EPXXX_transnet_shots.json`
- `transnet_shots/keyframes/*.png`
- `subtitle_ocr/EPXXX_subtitle_ocr.csv`
- `subtitle_ocr/EPXXX_subtitle_ocr.json`
- `subtitle_ocr/EPXXX_subtitle_ocr_dedup.srt`
- `EPXXX_evidence_pack.jsonl`
- `EPXXX_evidence_pack.sqlite`
- `EPXXX_evidence_pack_summary.json`
- `EPXXX_evidence_validation.json`
- `audio/EPXXX_16k_mono.wav` when `ffmpeg` is available
- `EPXXX_audio_tool_status.json`
- `EPXXX_hq_audio_status.json` when `--run-hq-audio` is enabled
- `EPXXX_hq_audio.log` when `--run-hq-audio` is enabled
- `EPXXX_silero_vad_segments.csv/json` when the HQ Silero layer runs
- `EPXXX_qwen3_asr_raw.json` when Qwen3-ASR runs
- `EPXXX_transcript.srt` when timestamped ASR runs
- `EPXXX_audio_evidence_summary.md`
- `EPXXX_vad_segments.csv/json`
- `EPXXX_dialogue_ledger.csv/json`
- `EPXXX_audio_event_ledger.csv/json`
- `EPXXX_asr_blocker.json` when ASR was attempted but unavailable or failed
- `EPXXX_transcript_segments.csv/json` when local ASR is run
- `EPXXX_speaker_ledger.csv/json` when diarization is available
- `EPXXX_asr_handoff.md` with recommended ASR command or tool and transcript status
- `tool_trials/omnishotcut_EPXXX/*` when high-quality OmniShotCut QA is run
- `tool_trials/rapid_videocr_EPXXX/*` and `tool_trials/paddleocr_EPXXX/*` when OCR comparison is run
- `tool_trials/asr_EPXXX/*` when ASR comparison is run
- `tool_trials/EPXXX_high_quality_trial_summary.json`
- original-resolution extracted PNG frames named with sequence number, timecode, and reason
- `minute_chunks/EPXXX_minute_chunks_index.json` and per-minute CSV/JSON manifests when chunking is enabled
- `EPXXX_extraction_summary.md`
- accepted production evidence coverage with no fixed frame-count cap; bounded counts are only for explicitly requested legacy review packets
- required `shotlevel_start_mid_end_frames/*.png`, `shotlevel_start_mid_end_manifest.csv`, and `shotlevel_start_mid_end_manifest.json` for dense shot-level timeline reconstruction and prompt anchoring

For exact columns, read `references/frame-manifest-schema.md`.
For audio tool selection and ledger columns, read `references/audio-evidence-tool-stack.md`.
