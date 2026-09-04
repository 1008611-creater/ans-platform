import argparse
import json
import math
import os
import subprocess
from pathlib import Path


def require_cv2():
    try:
        import cv2
        return cv2
    except Exception as exc:
        raise SystemExit(f"OpenCV is required. Install opencv-python. Error: {exc}")


def video_metadata(video_path):
    cv2 = require_cv2()
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = frames / fps if fps else 0
    cap.release()
    return {
        "path": str(video_path),
        "fps": fps,
        "frames": frames,
        "width": width,
        "height": height,
        "duration": duration,
    }


def extract_audio(video_path, out_dir):
    try:
        import imageio_ffmpeg
    except Exception as exc:
        return {"ok": False, "error": f"imageio-ffmpeg not installed: {exc}"}
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    audio_path = out_dir / "audio_16k_mono.wav"
    cmd = [
        ffmpeg, "-y", "-i", str(video_path), "-vn", "-ac", "1", "-ar", "16000",
        "-c:a", "pcm_s16le", str(audio_path)
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="ignore")
    return {
        "ok": proc.returncode == 0,
        "path": str(audio_path),
        "size": audio_path.stat().st_size if audio_path.exists() else 0,
        "error": proc.stderr[-2000:] if proc.returncode else "",
    }


def frame_at(cap, t):
    import cv2
    from PIL import Image
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, frame = cap.read()
    if not ok:
        return None
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return Image.fromarray(frame)


def make_contact_sheets(video_path, out_dir, duration):
    from PIL import Image, ImageDraw, ImageFont
    cv2 = require_cv2()
    cap = cv2.VideoCapture(str(video_path))
    font_path = next((p for p in [r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\msyh.ttc"] if os.path.exists(p)), None)
    font = ImageFont.truetype(font_path, 28) if font_path else ImageFont.load_default()
    outputs = []

    def build(times, crop, name, cols):
        thumbs = []
        for t in times:
            img = frame_at(cap, t)
            if img is None:
                continue
            if crop:
                w, h = img.size
                img = img.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
            target_w = 360 if not crop else 520
            target_h = int(img.height * target_w / img.width)
            img = img.resize((target_w, target_h))
            canvas = Image.new("RGB", (target_w, target_h + 34), "white")
            canvas.paste(img, (0, 34))
            draw = ImageDraw.Draw(canvas)
            draw.rectangle((0, 0, target_w, 34), fill=(20, 20, 20))
            draw.text((8, 4), f"{t:05.1f}s", fill="white", font=font)
            thumbs.append(canvas)
        if not thumbs:
            return
        rows = math.ceil(len(thumbs) / cols)
        tw = max(x.width for x in thumbs)
        th = max(x.height for x in thumbs)
        sheet = Image.new("RGB", (cols * tw, rows * th), "#ddd")
        for i, img in enumerate(thumbs):
            sheet.paste(img, ((i % cols) * tw, (i // cols) * th))
        path = out_dir / f"{name}.jpg"
        sheet.save(path, quality=92)
        outputs.append(str(path))

    full_times = [i * 4 for i in range(int(duration // 4) + 1)]
    sub_times = [i * 2 for i in range(int(duration // 2) + 1)]
    for idx in range(0, len(full_times), 9):
        build(full_times[idx:idx + 9], None, f"full_{idx // 9 + 1}", 3)
    for idx in range(0, len(sub_times), 10):
        build(sub_times[idx:idx + 10], (0.02, 0.62, 0.98, 0.92), f"sub_{idx // 10 + 1}", 2)
    cap.release()
    return outputs


def detect_scenes(video_path, out_dir):
    try:
        from scenedetect import SceneManager, open_video
        from scenedetect.detectors import ContentDetector
    except Exception as exc:
        return {"ok": False, "error": f"scenedetect not installed: {exc}"}
    video = open_video(str(video_path))
    manager = SceneManager()
    manager.add_detector(ContentDetector(threshold=27.0, min_scene_len=8))
    manager.detect_scenes(video, show_progress=False)
    rows = []
    for i, (start, end) in enumerate(manager.get_scene_list(), 1):
        s = start.seconds
        e = end.seconds
        rows.append({"scene": i, "start": round(s, 2), "end": round(e, 2), "duration": round(e - s, 2)})
    txt = out_dir / "scenes.txt"
    txt.write_text("\n".join(f"{r['scene']:02d} {r['start']:05.2f}-{r['end']:05.2f} dur {r['duration']:04.2f}" for r in rows), encoding="utf-8")
    js = out_dir / "scenes.json"
    js.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "count": len(rows), "txt": str(txt), "json": str(js)}


def transcribe(audio_info, out_dir, model_name, language):
    if not audio_info.get("ok"):
        return {"ok": False, "error": "audio extraction failed"}
    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        return {"ok": False, "error": f"faster_whisper not installed: {exc}"}
    configs = [(model_name, "cuda", "float16"), (model_name, "cpu", "int8"), ("base", "cpu", "int8")]
    errors = []
    for model_size, device, compute_type in configs:
        try:
            model = WhisperModel(model_size, device=device, compute_type=compute_type)
            segments, info = model.transcribe(audio_info["path"], language=language, beam_size=5, vad_filter=False)
            rows = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments]
            js = out_dir / "whisper_transcript.json"
            txt = out_dir / "whisper_transcript.txt"
            js.write_text(json.dumps({"model": model_size, "device": device, "compute_type": compute_type, "language": info.language, "segments": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
            txt.write_text("\n".join(f"[{r['start']:05.2f}-{r['end']:05.2f}] {r['text']}" for r in rows), encoding="utf-8")
            return {"ok": True, "model": model_size, "device": device, "compute_type": compute_type, "count": len(rows), "txt": str(txt), "json": str(js)}
        except Exception as exc:
            errors.append(f"{model_size}/{device}/{compute_type}: {exc}")
    return {"ok": False, "error": "\n".join(errors)}


def main():
    parser = argparse.ArgumentParser(description="Analyze a short-drama episode for remake-script work.")
    parser.add_argument("video")
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--language", default="zh")
    parser.add_argument("--whisper-model", default="small")
    parser.add_argument("--skip-whisper", action="store_true")
    args = parser.parse_args()

    video_path = Path(args.video)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    meta = video_metadata(video_path)
    audio = extract_audio(video_path, out_dir)
    sheets = make_contact_sheets(video_path, out_dir, meta["duration"])
    scenes = detect_scenes(video_path, out_dir)
    transcript = {"ok": False, "skipped": True} if args.skip_whisper else transcribe(audio, out_dir, args.whisper_model, args.language)

    summary = {
        "metadata": meta,
        "audio": audio,
        "contact_sheets": sheets,
        "scenes": scenes,
        "transcript": transcript,
    }
    summary_path = out_dir / "analysis_summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "summary": str(summary_path), **summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
