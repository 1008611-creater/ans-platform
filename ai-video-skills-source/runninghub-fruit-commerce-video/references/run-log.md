# RunningHub Fruit Commerce Run Log

Append one entry after every real run.

```markdown
## YYYY-MM-DD - workflow

Goal:
Inputs:
Node overrides:
Task ID:
Result URLs:
Downloaded files:
What worked:
What failed:
Keep next time:
```

## 2026-05-21 - ltx-digital-human

Goal: Create a Douyin fruit commerce digital-human oral video for Baitangying lychee and Hanyuan bagged Black Pearl cherry.
Inputs: host/workbench image `D:/Users/lsb/Downloads/ComfyUI_00002_zqkcn_1778586992 (1)(1).png`; generated Chinese TTS audio `D:/codex-work/xianyu/outputs/fruit_commerce/voiceover_combo.wav`; identity and motion prompt files under `D:/codex-work/xianyu/outputs/fruit_commerce/`.
Node overrides: 14.image, 39.audio, 169.text, 170.text, 186.text=`96,96,96,96,96`, 167.value=720, 168.value=1280.
Task ID: `2057487447264292865`.
Result URLs: `https://rh-images.xiaoyaoyou.com/e64caef617a09c16e026e2ed8141b0eb/output/AnimateDiff_00001_p83-audio_xidpc_1779378661.mp4`.
Downloaded files: `D:/codex-work/xianyu/outputs/fruit_commerce/ltx/AnimateDiff_00001_p83-audio_xidpc_1779378661.mp4`.
What worked: Direct workflowId call returned `WORKFLOW_NOT_SAVED_OR_NOT_RUNNING`, but adding `--workflow-json` with the locally exported API JSON succeeded. Output is 704x1280, 16.3s, with audio.
What failed: Fruit identity is approximate; generated lychee/cherry baskets can look like generic red round fruit in some frames. Apron text is not reliable.
Keep next time: For LTX custom workflows, pass `--workflow-json` by default. Use a fruit/host first image that already contains the exact fruit on the table to reduce product drift.

## 2026-05-21 - wan-animate

Goal: Transfer dance motion from `C:/Users/lsb/Downloads/ba797012c5d9bce6e387995fa5f6846f.mp4` to the fruit host image.
Inputs: host/workbench image `D:/Users/lsb/Downloads/ComfyUI_00002_zqkcn_1778586992 (1)(1).png`; dance video 576x1024, 18.57s.
Node overrides tried: initial defaults; then frame_load_cap=120, 294.value=480, 222.steps=3, 367.steps=3, 270.context_frames=81, 270.context_overlap=16; then fps=12, frame_load_cap=60, 294.value=320, 222.steps=2, 367.steps=2, 270.context_frames=41, 270.context_overlap=8.
Task IDs: `2057481866340167681`, `2057487448904257537`, `2057489600313774082`.
Result URLs: none.
Downloaded files: none.
What worked: Submission and upload succeeded.
What failed: All Wan attempts failed at `WanVideoSampler` with `torch.OutOfMemoryError`, including the ultra-low 60-frame/320-short-side attempt.
Keep next time: Use RunningHub Plus/high-VRAM mode for this workflow, or edit the workflow to clean VRAM before `WanVideoSampler`. Also pre-trim the action video to a 3-5s segment and consider a smaller/cropped host image.
