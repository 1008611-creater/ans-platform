"""Deterministic movie/scene palette extraction and card rendering.

The renderer uses real input frames only. It never synthesizes film stills.
"""

from __future__ import annotations

import base64
import colorsys
import html
import io
import json
import math
import re
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = ROOT / "assets" / "palette-templates"
HEX_RE = re.compile(r"^#[0-9A-F]{6}$")


@dataclass(frozen=True)
class CanvasSpec:
    width: int
    height: int
    background: str
    foreground: str
    muted: str
    line: str


SPECS = {
    "light": CanvasSpec(3072, 3072, "#F4EFE6", "#3C332E", "#786B63", "#D9CEC1"),
    "dark": CanvasSpec(3072, 1728, "#0B0F13", "#E8E8E6", "#AEB6BC", "#25303A"),
    "scene": CanvasSpec(2400, 1350, "#F2EEE7", "#292724", "#756D66", "#D7CEC3"),
}


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for path in candidates:
        if path.is_file():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default(size=size)


def _rgb_to_hex(rgb: Sequence[int]) -> str:
    return "#" + "".join(f"{max(0, min(255, int(value))):02X}" for value in rgb[:3])


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def _srgb_channel(value: float) -> float:
    value /= 255.0
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def _rgb_to_lab(rgb: Sequence[int]) -> tuple[float, float, float]:
    r, g, b = (_srgb_channel(float(value)) for value in rgb[:3])
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883

    def f(value: float) -> float:
        return value ** (1 / 3) if value > 0.008856 else (7.787 * value) + (16 / 116)

    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def _delta_e(rgb_a: Sequence[int], rgb_b: Sequence[int]) -> float:
    lab_a = _rgb_to_lab(rgb_a)
    lab_b = _rgb_to_lab(rgb_b)
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(lab_a, lab_b)))


def _luminance(rgb: Sequence[int]) -> float:
    r, g, b = (_srgb_channel(float(value)) for value in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _saturation(rgb: Sequence[int]) -> float:
    return colorsys.rgb_to_hsv(*(value / 255.0 for value in rgb[:3]))[1]


def _crop_letterbox(image: Image.Image) -> Image.Image:
    """Remove only near-uniform black border rows/columns, not dark film content."""
    rgb = image.convert("RGB")
    thumb = rgb.copy()
    thumb.thumbnail((600, 600), Image.Resampling.BILINEAR)
    pixels = thumb.load()
    width, height = thumb.size

    def dark_row(y: int) -> bool:
        samples = [pixels[x, y] for x in range(0, width, max(1, width // 80))]
        return sum(max(pixel) < 12 for pixel in samples) / max(1, len(samples)) > 0.96

    def dark_col(x: int) -> bool:
        samples = [pixels[x, y] for y in range(0, height, max(1, height // 80))]
        return sum(max(pixel) < 12 for pixel in samples) / max(1, len(samples)) > 0.96

    top, bottom, left, right = 0, height - 1, 0, width - 1
    while top < bottom and dark_row(top):
        top += 1
    while bottom > top and dark_row(bottom):
        bottom -= 1
    while left < right and dark_col(left):
        left += 1
    while right > left and dark_col(right):
        right -= 1
    if (top, bottom, left, right) == (0, height - 1, 0, width - 1):
        return rgb
    scale_x = rgb.width / width
    scale_y = rgb.height / height
    box = (
        int(left * scale_x),
        int(top * scale_y),
        max(int((right + 1) * scale_x), 1),
        max(int((bottom + 1) * scale_y), 1),
    )
    return rgb.crop(box)


def _quantized_candidates(image_paths: Iterable[Path], candidate_count: int = 32):
    combined = []
    for raw_path in image_paths:
        path = Path(raw_path)
        if not path.is_file():
            raise FileNotFoundError(f"Image not found: {path}")
        with Image.open(path) as opened:
            image = _crop_letterbox(ImageOps.exif_transpose(opened))
            image.thumbnail((480, 480), Image.Resampling.LANCZOS)
            combined.append(image.copy())
    if not combined:
        raise ValueError("At least one image is required.")

    width = max(image.width for image in combined)
    height = sum(image.height for image in combined)
    strip = Image.new("RGB", (width, height), "black")
    y = 0
    for image in combined:
        strip.paste(image, (0, y))
        y += image.height
    quantized = strip.quantize(
        colors=max(candidate_count, 12),
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )
    palette = quantized.getpalette() or []
    counts = sorted(quantized.getcolors() or [], reverse=True)
    total = sum(count for count, _ in counts)
    candidates = []
    for count, index in counts:
        rgb = tuple(palette[index * 3 : index * 3 + 3])
        if len(rgb) != 3:
            continue
        candidates.append({"rgb": rgb, "count": count, "ratio": count / max(total, 1)})
    return candidates


def extract_palette(
    image_paths: Iterable[Path], color_count: int = 8, merge_delta: float = 7.0
) -> list[dict]:
    """Extract a perceptually separated palette from one or more real images."""
    if color_count < 2 or color_count > 10:
        raise ValueError("color_count must be between 2 and 10")
    candidates = _quantized_candidates(image_paths, candidate_count=max(32, color_count * 5))
    selected = []
    for candidate in candidates:
        if all(_delta_e(candidate["rgb"], item["rgb"]) >= merge_delta for item in selected):
            selected.append(candidate)
        if len(selected) == color_count:
            break
    if len(selected) < color_count:
        for candidate in candidates:
            if candidate not in selected:
                selected.append(candidate)
            if len(selected) == color_count:
                break
    if not selected:
        raise ValueError("No usable colors could be extracted.")

    selected_total = sum(item["count"] for item in selected)
    raw_ratios = [item["count"] * 100.0 / selected_total for item in selected]
    rounded = [round(value, 1) for value in raw_ratios]
    rounded[-1] = round(100.0 - sum(rounded[:-1]), 1)
    result = []
    for index, (item, ratio) in enumerate(zip(selected, rounded), start=1):
        rgb = tuple(int(value) for value in item["rgb"])
        result.append(
            {
                "index": index,
                "hex": _rgb_to_hex(rgb),
                "rgb": list(rgb),
                "ratio": ratio,
                "luminance": round(_luminance(rgb), 4),
                "saturation": round(_saturation(rgb), 4),
            }
        )
    return result


def _fit_image(path: Path, size: tuple[int, int]) -> Image.Image:
    with Image.open(path) as opened:
        image = _crop_letterbox(ImageOps.exif_transpose(opened))
        return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS)


def _draw_text_fit(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    max_width: int,
    start_size: int,
    fill: str,
    bold: bool = False,
    min_size: int = 18,
) -> ImageFont.FreeTypeFont:
    size = start_size
    while size > min_size:
        font = _font(size, bold=bold)
        if draw.textbbox((0, 0), text, font=font)[2] <= max_width:
            break
        size -= 2
    draw.text(xy, text, font=font, fill=fill)
    return font


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def _image_data_uri(path: Path) -> str:
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def _html_document(data: dict, template: str) -> str:
    spec = SPECS[template]
    rows = []
    if data["mode"] == "director":
        for film in data["films"]:
            frames = "".join(
                f'<img src="{_image_data_uri(Path(path))}" alt="{html.escape(film["title_zh"])}">'
                for path in film["render_frames"]
            )
            swatches = "".join(
                f'<div class="swatch"><i style="background:{color["hex"]}"></i><b>{color["hex"]}</b><span>{color["ratio"]:.1f}%</span></div>'
                for color in film["palette"]
            )
            rows.append(
                f'<section><h2>{html.escape(film["title_zh"])} <small>{html.escape(film["title_en"])} · {film["year"]}</small></h2><div class="frames">{frames}</div><div class="swatches">{swatches}</div></section>'
            )
    else:
        for scene in data["scenes"]:
            swatches = "".join(
                f'<div class="swatch"><i style="background:{color["hex"]}"></i><b>{color["hex"]}</b><span>{color["ratio"]:.1f}%</span></div>'
                for color in scene["palette"]
            )
            rows.append(
                f'<section><h2>{html.escape(scene["label"])}</h2><div class="scene"><img src="{_image_data_uri(Path(scene["source_path"]))}" alt="scene"><div class="swatches">{swatches}</div></div></section>'
            )
    title = html.escape(data["title"])
    subtitle = html.escape(data["subtitle"])
    document = """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>__TITLE__</title>
<style>
*{box-sizing:border-box} body{margin:0;background:__BACKGROUND__;color:__FOREGROUND__;font-family:'Microsoft YaHei','Noto Sans CJK SC',Arial,sans-serif}
main{width:__WIDTH__px;min-height:__HEIGHT__px;padding:64px 72px} header{text-align:center;margin-bottom:42px} h1{font-size:64px;letter-spacing:8px;margin:0 0 14px} header p{font-size:25px;letter-spacing:5px;color:__MUTED__;margin:0}
section{border-top:2px solid __LINE__;padding:24px 0 30px} h2{font-size:31px;letter-spacing:3px;margin:0 0 18px} h2 small{font-size:18px;color:__MUTED__;font-weight:400;letter-spacing:2px}
.frames{display:grid;grid-template-columns:repeat(5,1fr);gap:12px} .frames img{width:100%;height:220px;object-fit:cover}
.swatches{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin-top:14px} .swatch{text-align:center;font-size:17px;color:__MUTED__} .swatch i{height:78px;display:block;margin-bottom:8px} .swatch b{display:block;color:__FOREGROUND__;letter-spacing:1px} .swatch span{font-size:14px}
.scene{display:grid;grid-template-columns:1.2fr 1fr;gap:28px} .scene>img{width:100%;height:620px;object-fit:cover} .scene .swatches{grid-template-columns:repeat(2,1fr);margin:0}
</style></head><body><main><header><h1>__TITLE__</h1><p>__SUBTITLE__</p></header>__ROWS__</main></body></html>"""
    template_files = {
        "light": "director-light.html",
        "dark": "director-dark.html",
        "scene": "scene-analysis.html",
    }
    template_path = TEMPLATE_DIR / template_files[template]
    if template_path.is_file():
        document = template_path.read_text(encoding="utf-8")
    replacements = {
        "__TITLE__": title,
        "__SUBTITLE__": subtitle,
        "__ROWS__": "".join(rows),
        "__BACKGROUND__": spec.background,
        "__FOREGROUND__": spec.foreground,
        "__MUTED__": spec.muted,
        "__LINE__": spec.line,
        "__WIDTH__": str(spec.width),
        "__HEIGHT__": str(spec.height),
    }
    for needle, value in replacements.items():
        document = document.replace(needle, value)
    return document


def _write_html(data: dict, output_path: Path, template: str) -> None:
    output_path.write_text(_html_document(data, template), encoding="utf-8")


def _role_for(item: dict, index: int) -> str:
    if index == 0:
        return "大面积环境主色"
    if index == 1:
        return "建筑与空间辅色"
    luminance = float(item.get("luminance", 0.0))
    saturation = float(item.get("saturation", 0.0))
    if luminance <= 0.035:
        return "黑位与深阴影结构色"
    if luminance >= 0.62 and saturation <= 0.28:
        return "高光与空气色"
    if saturation >= 0.48:
        return "叙事强调或光源色"
    if index == 2:
        return "人物与服装连接色"
    if luminance <= 0.13:
        return "阴影与纵深结构色"
    if index <= 5:
        return "材质与反射变化色"
    return "局部层次与收束色"


def _prompt_markdown(data: dict) -> str:
    lines = [f"# {data['title']}｜可复制色卡 Prompt", ""]
    if data["mode"] == "director":
        lines.extend(
            [
                f"色彩依据：{data['director']['zh']} / {data['director']['en']} 的真实电影截图取色。",
                "",
            ]
        )
        profile = data.get("style_profile") or {}
        if profile:
            lines.extend(["## 导演风格执行手册", ""])
            for label, key in (
                ("视觉定义", "definition"),
                ("光线", "lighting"),
                ("构图与摄影", "framing"),
                ("调色与材质", "grading"),
            ):
                if profile.get(key):
                    lines.append(f"- {label}：{profile[key]}")
            if profile.get("avoid"):
                lines.append("- 禁止跑偏：" + "、".join(profile["avoid"]) + "。")
            lines.append("")
        groups = [(film["title_zh"], film["palette"]) for film in data["films"]]
    else:
        groups = [(scene["label"], scene["palette"]) for scene in data["scenes"]]
    for label, palette in groups:
        lines.append(f"## {label}")
        lines.append("")
        colors = "；".join(
            f"{item['hex']} {item['ratio']:.1f}%（{_role_for(item, index)}）"
            for index, item in enumerate(palette)
        )
        lines.append(
            "色板："
            + colors
            + "。主色优先由环境、墙面、天空或大体积布景承载；人物肤色保持自然，不被环境综合色污染；强调色只在关键道具、服装局部、光源反射或叙事转折出现。"
        )
        lines.append("")
    lines.extend(
        [
            "## Seedance 2.0 执行块",
            "",
            "严格按上述 HEX 的综合色彩关系执行：先由真实场景材质和光源建立主辅色比例，再让人物服装、道具与反射承担连接色和强调色。曝光保留高光纹理，黑位有细节，肤色中性可读；不要用全局滤镜替代美术、灯光和材质。镜头运动必须由人物动作、视线或环境变化触发，并在新的颜色或空间状态上明确停止。",
            "",
            "Avoid：任意新增综合色、全局青橙、统一高饱和、肤色被染色、死黑、爆白、塑料材质、无动机环绕、随机变焦、生成式文字和伪造电影截图。",
            "",
            "> HEX 为真实输入截图的程序取色结果；最终制作仍应在监看环境中按镜头匹配微调。",
            "",
        ]
    )
    return "\n".join(lines)


def _copy_director_frames(data: dict, output_dir: Path) -> None:
    frames_dir = _ensure_dir(output_dir / "frames")
    for film_index, film in enumerate(data["films"], start=1):
        rendered = []
        for frame_index, raw_path in enumerate(film["frames"], start=1):
            source = Path(raw_path).expanduser().resolve()
            if not source.is_file():
                raise FileNotFoundError(f"Frame not found: {source}")
            suffix = source.suffix.lower() if source.suffix else ".jpg"
            target = frames_dir / f"film-{film_index:02d}-frame-{frame_index:02d}{suffix}"
            shutil.copy2(source, target)
            rendered.append(str(target))
        film["render_frames"] = rendered


def _render_director_light(data: dict, output_path: Path) -> list[dict]:
    spec = SPECS["light"]
    canvas = Image.new("RGB", (spec.width, spec.height), spec.background)
    draw = ImageDraw.Draw(canvas)
    draw.text((spec.width // 2, 64), data["director"]["en"].upper(), font=_font(62), fill="#A34D34", anchor="ma")
    draw.text((spec.width // 2, 145), f"{data['director']['zh']} · 电影色调常用色卡", font=_font(38), fill="#A34D34", anchor="ma")
    top, bottom = 240, 55
    films = data["films"]
    row_h = (spec.height - top - bottom) // len(films)
    boxes = []
    for film_index, film in enumerate(films):
        y0 = top + film_index * row_h
        draw.line((72, y0, spec.width - 72, y0), fill=spec.line, width=2)
        title = f"{film['title_zh']}  {film['title_en'].upper()}  ({film['year']})"
        _draw_text_fit(draw, (74, y0 + 20), title, spec.width - 148, 31, spec.foreground, bold=True)
        frame_y = y0 + 72
        frame_h = max(170, int(row_h * 0.49))
        frame_gap = 12
        frame_count = len(film["render_frames"])
        frame_w = (spec.width - 144 - frame_gap * (frame_count - 1)) // frame_count
        for index, frame in enumerate(film["render_frames"]):
            x = 72 + index * (frame_w + frame_gap)
            canvas.paste(_fit_image(Path(frame), (frame_w, frame_h)), (x, frame_y))
        swatch_y = frame_y + frame_h + 20
        count = len(film["palette"])
        swatch_gap = 12
        swatch_w = (spec.width - 144 - swatch_gap * (count - 1)) // count
        swatch_h = min(112, max(65, row_h - (swatch_y - y0) - 66))
        for color_index, color in enumerate(film["palette"]):
            x = 72 + color_index * (swatch_w + swatch_gap)
            draw.rectangle((x, swatch_y, x + swatch_w, swatch_y + swatch_h), fill=color["hex"])
            label = f"{color['hex']}  {color['ratio']:.1f}%"
            draw.text((x + swatch_w // 2, swatch_y + swatch_h + 9), label, font=_font(19), fill=spec.foreground, anchor="ma")
            boxes.append({"film": film_index, "color": color_index, "hex": color["hex"], "box": [x, swatch_y, swatch_w, swatch_h]})
    canvas.save(output_path, quality=95)
    return boxes


def _render_director_dark(data: dict, output_path: Path) -> list[dict]:
    spec = SPECS["dark"]
    canvas = Image.new("RGB", (spec.width, spec.height), spec.background)
    draw = ImageDraw.Draw(canvas)
    draw.text((spec.width // 2, 40), f"{data['director']['zh']} · 电影色调常用色卡", font=_font(58), fill=spec.foreground, anchor="ma")
    draw.text((spec.width // 2, 116), f"{data['director']['en'].upper()} FILM COLOR PALETTE", font=_font(27), fill=spec.muted, anchor="ma")
    top, footer = 185, 82
    films = data["films"]
    row_h = (spec.height - top - footer) // len(films)
    boxes = []
    for film_index, film in enumerate(films):
        y0 = top + film_index * row_h
        draw.line((0, y0, spec.width, y0), fill=spec.line, width=3)
        img_w = 625
        canvas.paste(_fit_image(Path(film["render_frames"][0]), (img_w, row_h - 8)), (0, y0 + 4))
        text_x = img_w + 36
        text_w = 315
        _draw_text_fit(draw, (text_x, y0 + 48), f"《{film['title_zh']}》", text_w, 32, spec.foreground, bold=True)
        _draw_text_fit(draw, (text_x, y0 + 101), film["title_en"].upper(), text_w, 20, spec.muted)
        draw.text((text_x, y0 + 143), str(film["year"]), font=_font(19), fill=spec.muted)
        palette_x = img_w + 36 + text_w + 26
        palette_w = spec.width - palette_x - 44
        count = len(film["palette"])
        gap = 7
        swatch_w = (palette_w - gap * (count - 1)) // count
        swatch_y = y0 + 30
        swatch_h = max(90, row_h - 108)
        for color_index, color in enumerate(film["palette"]):
            x = palette_x + color_index * (swatch_w + gap)
            draw.rectangle((x, swatch_y, x + swatch_w, swatch_y + swatch_h), fill=color["hex"])
            draw.text((x + swatch_w // 2, swatch_y + swatch_h + 13), color["hex"].lstrip("#"), font=_font(18), fill=spec.foreground, anchor="ma")
            boxes.append({"film": film_index, "color": color_index, "hex": color["hex"], "box": [x, swatch_y, swatch_w, swatch_h]})
    note = "真实电影截图程序取色 · 综合色值用于视觉开发与 Seedance 2.0 生成约束"
    draw.text((spec.width // 2, spec.height - 50), note, font=_font(20), fill=spec.muted, anchor="mm")
    canvas.save(output_path, quality=95)
    return boxes


def _render_scene(data: dict, output_path: Path) -> list[dict]:
    spec = SPECS["scene"]
    canvas = Image.new("RGB", (spec.width, spec.height), spec.background)
    draw = ImageDraw.Draw(canvas)
    draw.text((90, 54), data["title"], font=_font(54, bold=True), fill=spec.foreground)
    draw.text((92, 120), data["subtitle"], font=_font(24), fill=spec.muted)
    scenes = data["scenes"]
    top, bottom = 185, 55
    row_h = (spec.height - top - bottom) // len(scenes)
    boxes = []
    for scene_index, scene in enumerate(scenes):
        y0 = top + scene_index * row_h
        draw.line((72, y0, spec.width - 72, y0), fill=spec.line, width=2)
        draw.text((74, y0 + 18), scene["label"], font=_font(28, bold=True), fill=spec.foreground)
        image_x, image_y = 72, y0 + 68
        image_w = 1050 if len(scenes) == 1 else 760
        image_h = row_h - 104
        canvas.paste(_fit_image(Path(scene["source_path"]), (image_w, image_h)), (image_x, image_y))
        palette_x = image_x + image_w + 44
        palette_w = spec.width - palette_x - 72
        palette = scene["palette"]
        cols = 2 if len(scenes) == 1 else 4
        rows = math.ceil(len(palette) / cols)
        gap_x, gap_y = 18, 18
        cell_w = (palette_w - gap_x * (cols - 1)) // cols
        cell_h = (image_h - gap_y * (rows - 1)) // rows
        for color_index, color in enumerate(palette):
            col, row = color_index % cols, color_index // cols
            x = palette_x + col * (cell_w + gap_x)
            y = image_y + row * (cell_h + gap_y)
            swatch_h = max(45, cell_h - 48)
            draw.rectangle((x, y, x + cell_w, y + swatch_h), fill=color["hex"])
            label = f"{color['hex']}  {color['ratio']:.1f}%"
            draw.text((x + 4, y + swatch_h + 9), label, font=_font(19), fill=spec.foreground)
            boxes.append({"scene": scene_index, "color": color_index, "hex": color["hex"], "box": [x, y, cell_w, swatch_h]})
    canvas.save(output_path, quality=95)
    return boxes


def _choose_template(films: Sequence[dict]) -> str:
    colors = [color for film in films for color in film["palette"]]
    weighted_luminance = sum(color["luminance"] * color["ratio"] for color in colors) / max(sum(color["ratio"] for color in colors), 1)
    weighted_saturation = sum(color["saturation"] * color["ratio"] for color in colors) / max(sum(color["ratio"] for color in colors), 1)
    return "light" if weighted_luminance >= 0.36 or weighted_saturation >= 0.48 else "dark"


def _write_sources(data: dict, path: Path) -> None:
    lines = [f"# {data['title']}｜素材来源", "", f"生成日期：{data['generated_at']}", ""]
    if data["mode"] == "director":
        for film in data["films"]:
            lines.extend([f"## {film['title_zh']} / {film['title_en']} ({film['year']})", ""])
            for source in film.get("sources", []):
                label = source.get("label") or source.get("url") or "来源"
                url = source.get("url", "")
                lines.append(f"- [{label}]({url})" if url else f"- {label}")
            lines.append("")
    else:
        for scene in data["scenes"]:
            lines.append(f"- {scene['label']}：`{scene['source_path']}`（用户/本地提供原图）")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_outputs(data: dict, output_dir: Path, template: str) -> dict:
    _ensure_dir(output_dir)
    png_path = output_dir / "palette-card.png"
    if template == "light":
        boxes = _render_director_light(data, png_path)
    elif template == "dark":
        boxes = _render_director_dark(data, png_path)
    elif template == "scene":
        boxes = _render_scene(data, png_path)
    else:
        raise ValueError(f"Unknown template: {template}")
    data["template"] = template
    data["canvas"] = {"width": SPECS[template].width, "height": SPECS[template].height}
    data["render_boxes"] = boxes
    (output_dir / "palette-data.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    _write_html(data, output_dir / "palette-card.html", template)
    (output_dir / "color-prompt.md").write_text(_prompt_markdown(data), encoding="utf-8")
    _write_sources(data, output_dir / "sources.md")
    return {
        "png": png_path,
        "html": output_dir / "palette-card.html",
        "json": output_dir / "palette-data.json",
        "prompt": output_dir / "color-prompt.md",
        "sources": output_dir / "sources.md",
    }


def build_scene_card(
    image_paths: Iterable[Path],
    output_dir: Path,
    title: str = "场景综合色彩分析卡",
    color_count: int = 8,
) -> dict:
    paths = [Path(path).expanduser().resolve() for path in image_paths]
    if not 1 <= len(paths) <= 3:
        raise ValueError("Scene mode requires 1–3 images.")
    scenes = []
    for index, path in enumerate(paths, start=1):
        scenes.append(
            {
                "label": f"场景 {index:02d} · {path.stem}",
                "source_path": str(path),
                "palette": extract_palette([path], color_count=color_count),
            }
        )
    data = {
        "schema_version": "1.0",
        "mode": "scene",
        "title": title,
        "subtitle": "SCENE COLOR PALETTE · REAL-IMAGE SAMPLING",
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "scenes": scenes,
    }
    return _write_outputs(data, Path(output_dir), "scene")


def build_director_card(
    manifest_path: Path,
    output_dir: Path,
    template: str = "auto",
    strict: bool = True,
    color_count: int = 8,
) -> dict:
    manifest_path = Path(manifest_path).expanduser().resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    director = manifest.get("director", {})
    films = manifest.get("films", [])
    if not director.get("zh") or not director.get("en"):
        raise ValueError("Manifest director.zh and director.en are required.")
    if strict and not 4 <= len(films) <= 5:
        raise ValueError("Final director cards require 4–5 films.")
    if not films:
        raise ValueError("Manifest must include at least one film.")
    for film in films:
        required = ("title_zh", "title_en", "year", "frames", "sources")
        missing = [key for key in required if not film.get(key)]
        if missing:
            raise ValueError(f"Film entry missing: {', '.join(missing)}")
        if strict and not 4 <= len(film["frames"]) <= 6:
            raise ValueError(f"{film['title_zh']} requires 4–6 real frames.")
        if strict and not any(source.get("url") for source in film["sources"]):
            raise ValueError(f"{film['title_zh']} requires at least one source URL.")
        film["palette"] = extract_palette(
            [Path(path).expanduser().resolve() for path in film["frames"]],
            color_count=color_count,
        )
    data = {
        "schema_version": "1.0",
        "mode": "director",
        "title": f"{director['zh']}电影综合色卡",
        "subtitle": f"{director['en'].upper()} FILM COLOR PALETTE",
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "director": director,
        "style_profile": manifest.get("style_profile", {}),
        "films": films,
        "strict": strict,
    }
    _copy_director_frames(data, Path(output_dir))
    chosen = _choose_template(films) if template == "auto" else template
    if chosen not in ("light", "dark"):
        raise ValueError("Director template must be auto, light, or dark.")
    return _write_outputs(data, Path(output_dir), chosen)


def verify_output(output_dir: Path, strict: bool = True) -> dict:
    output_dir = Path(output_dir)
    errors = []
    required = [
        "palette-card.png",
        "palette-card.html",
        "palette-data.json",
        "color-prompt.md",
        "sources.md",
    ]
    for name in required:
        if not (output_dir / name).is_file():
            errors.append(f"missing {name}")
    if errors:
        return {"ok": False, "errors": errors}
    try:
        data = json.loads((output_dir / "palette-data.json").read_text(encoding="utf-8"))
    except Exception as exc:
        return {"ok": False, "errors": [f"invalid JSON: {exc}"]}
    template = data.get("template")
    if template not in SPECS:
        errors.append("unknown template")
        return {"ok": False, "errors": errors}
    expected_size = (SPECS[template].width, SPECS[template].height)
    try:
        image = Image.open(output_dir / "palette-card.png").convert("RGB")
        if image.size != expected_size:
            errors.append(f"PNG size {image.size} != {expected_size}")
    except Exception as exc:
        errors.append(f"invalid PNG: {exc}")
        return {"ok": False, "errors": errors}
    if data.get("mode") == "director":
        if strict and not 4 <= len(data.get("films", [])) <= 5:
            errors.append("director film count is not 4–5")
        for film in data.get("films", []):
            if strict and not 4 <= len(film.get("frames", [])) <= 6:
                errors.append(f"{film.get('title_zh', 'film')} frame count is not 4–6")
            if strict and not film.get("sources"):
                errors.append(f"{film.get('title_zh', 'film')} has no sources")
    for box in data.get("render_boxes", []):
        value = box.get("hex", "")
        if not HEX_RE.fullmatch(value):
            errors.append(f"invalid HEX {value}")
            continue
        x, y, width, height = box["box"]
        sampled = image.getpixel((x + max(1, width // 2), y + max(1, height // 2)))
        expected = _hex_to_rgb(value)
        if max(abs(a - b) for a, b in zip(sampled, expected)) > 2:
            errors.append(f"swatch pixel mismatch {value} != {_rgb_to_hex(sampled)}")
    if not (output_dir / "sources.md").read_text(encoding="utf-8").strip():
        errors.append("sources.md is empty")
    if not (output_dir / "color-prompt.md").read_text(encoding="utf-8").strip():
        errors.append("color-prompt.md is empty")
    return {"ok": not errors, "errors": errors, "template": template, "size": expected_size}
