# Frame Manifest Schema

Use one row per exported frame. Rows must point to source-resolution PNG frames under `reference_frames_original/`. Contact sheets are preview-only and must not be used as redraw reference images.

| Column | Meaning |
| --- | --- |
| order | sorted output order |
| file | frame filename |
| time_sec | source time in seconds |
| timecode | `HH:MM:SS.mmm` |
| frame_index | source video frame index |
| shot_id | detected shot number |
| reason | `shot_start`, `shot_mid`, `shot_mid_sharp`, `shot_end`, `motion`, `motion_interval`, `subtitle_change`, `dialogue_start`, `dialogue_end`, `audio_event`, `audio_event_mid`, `baseline`, `coverage`, `key_change` |
| sharpness | Laplacian sharpness score |
| motion_score | local motion or visual change score |

The manifest must be sorted by `time_sec`.

Final frame count for redraw work must prioritize shot coverage over compactness. Do not default to 80-100 frames for normal short-drama episodes. The default extraction script uses `unbounded_evidence_coverage`: no fixed cap, keeping every shot start/mid/end, sharp mid-shot candidate, subtitle change, key visual change, and dense motion interval needed for reconstruction and Step 04 shot prompt anchoring. Use `--bounded` only for legacy review packets or explicit fixed-count requests.

When audio evidence exists first, pass dialogue, silence, breath, emotion, offscreen speech, or story information-cue ledgers to `extract_episode_frames.py --audio-events <csv-or-json>`. The extractor will add start/mid/end frame candidates around those audio events so the visual evidence follows the actual performance timing instead of relying on visual change alone. Do not pass post-added sound-effect, audio-peak, music-hit, or background-music ledgers into the redraw workflow.

When a full episode is too dense or likely to time out, split evidence into 60-second chunks. Keep the merged episode manifest as the canonical manifest, and also write `minute_chunks/EPXXX_minute_chunks_index.json` plus per-minute CSV/JSON manifests for review.

Dense shot-level supplements are required for redraw production. Export each detected shot's start/mid/end frame to `shotlevel_start_mid_end_frames/` and write `shotlevel_start_mid_end_manifest.csv/json`. This supplement may exceed the main reference-frame count because its purpose is analysis and prompt anchoring, not compact review.

## Related Evidence Files

- `EPXXX_shot_list.csv`: one row per detected shot, with start or end seconds, timecodes, frames, and duration.
- `audio/EPXXX_16k_mono.wav`: mono 16kHz WAV for ASR when ffmpeg is available.
- `EPXXX_transcript_segments.csv/json`: local ASR transcript when available, preferably Qwen3-ASR + ForcedAligner. Speaker is unresolved unless a second-pass speaker layer runs.
- `EPXXX_transcript.srt`: timestamped transcript generated from ASR segment rows when timing is available.
- `EPXXX_asr_handoff.md`: transcript tool recommendation and speaker attribution rules.
- `reference_frames_original/`: ordered original-resolution PNG reference frames.
- `minute_chunks/`: optional 60-second chunk manifests for long or dense extractions; use these to review each `第几分钟内容` without dropping frames.
- `shotlevel_start_mid_end_frames/`: required dense supplement with one start, middle, and end frame per detected shot.
- `shotlevel_start_mid_end_manifest.csv/json`: required supplement manifest with `shot_id`, `point`, `time_sec`, `timecode`, `frame_index`, `source_start`, `source_end`, `file`, and `path`.
