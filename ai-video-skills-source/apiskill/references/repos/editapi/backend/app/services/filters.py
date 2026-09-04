"""Filter complex builder for FFmpeg overlays."""

from typing import Dict, List, Optional, Tuple


def build_filter_complex(overlays: List[Dict], watermark: Optional[Dict]) -> Tuple[str, List[str], str]:
    """Build FFmpeg filter_complex string for overlays and watermark.

    We build a linear chain starting from [0:v] and each step writes to a new
    labeled stream [vN]. Additional inputs (images/videos) are appended to the
    input list and referenced by their input index.
    """
    filters: List[str] = []
    extra_inputs: List[str] = []

    current_label = "0:v"
    next_label_index = 1

    def next_label() -> str:
        nonlocal next_label_index
        label = f"v{next_label_index}"
        next_label_index += 1
        return label

    # overlays
    for overlay in overlays:
        otype = overlay.get("type")
        if otype == "text":
            out_label = next_label()
            filters.append(_text_filter(current_label, overlay, out_label))
            current_label = out_label
        elif otype == "image":
            # add extra input and overlay
            extra_inputs.append(overlay["image_path"])
            input_idx = len(extra_inputs)  # 1-based since 0 is main
            out_label = next_label()
            filters.append(_image_filter(current_label, input_idx, overlay, out_label))
            current_label = out_label
        elif otype == "video":
            extra_inputs.append(overlay["video_path"])
            input_idx = len(extra_inputs)
            out_label = next_label()
            filters.append(_video_filter(current_label, input_idx, overlay, out_label))
            current_label = out_label

    # watermark at the end (optional)
    if watermark:
        extra_inputs.append(watermark["image_path"])
        input_idx = len(extra_inputs)
        out_label = next_label()
        filters.append(_watermark_filter(current_label, input_idx, watermark, out_label))
        current_label = out_label

    filter_complex = ";".join(filters)
    return filter_complex, extra_inputs, current_label


def _text_filter(in_label: str, overlay: Dict, out_label: str) -> str:
    """Build drawtext filter for text overlay."""
    text = overlay["text"]
    font = overlay.get("font", "NotoSansDevanagari-Regular.ttf")
    font_size = overlay.get("font_size", 32)
    color = overlay.get("color", "white")
    x = overlay.get("x", 20)
    y = overlay.get("y", 20)
    start = overlay.get("start", 0)
    end = overlay.get("end")
    
    # Build filter string
    filter_parts = [
        f"drawtext=text='{text}'",
        f"fontfile=/fonts/{font}",
        f"fontsize={font_size}",
        f"fontcolor={color}",
        f"x={x}",
        f"y={y}",
        f"enable='between(t,{start},{end or '1e9'})'",
        "text_shaping=1"  # Enable Indic text shaping
    ]
    return f"[{in_label}]{':'.join(filter_parts)}[{out_label}]"


def _image_filter(in_label: str, input_index: int, overlay: Dict, out_label: str) -> str:
    """Build overlay filter for image overlay."""
    x = overlay.get("x", 20)
    y = overlay.get("y", 20)
    start = overlay.get("start", 0)
    end = overlay.get("end")
    opacity = overlay.get("opacity")
    
    # Normalize common position shorthands/expressions
    def norm_pos(v, axis: str):
        if isinstance(v, (int, float)):
            return v
        if isinstance(v, str):
            s = v.strip()
            if s.lower() in {"center", "centre", "middle"}:
                return "(W-w)/2" if axis == "x" else "(H-h)/2"
            # Fix common typos like w_i/h_i coming from prior examples
            s = s.replace("w_i", "w").replace("h_i", "h")
            # If expression subtracts overlay from main using lowercase main dims, uppercase them
            s = s.replace("(w-", "(W-").replace("(h-", "(H-")
            return s
        return v
    x = norm_pos(x, "x")
    y = norm_pos(y, "y")
    
    # Build filter string
    enable = f"enable='between(t,{start},{end or '1e9'})'"
    if opacity is not None:
        # apply alpha to the input image first
        return (
            f"[{input_index}]format=rgba,colorchannelmixer=aa={opacity}[img{input_index}];"
            f"[{in_label}][img{input_index}]overlay={x}:{y}:{enable}[{out_label}]"
        )
    return f"[{in_label}][{input_index}]overlay={x}:{y}:{enable}[{out_label}]"


def _video_filter(in_label: str, input_index: int, overlay: Dict, out_label: str) -> str:
    """Build overlay filter for video overlay."""
    x = overlay.get("x", 20)
    y = overlay.get("y", 20)
    start = overlay.get("start", 0)
    end = overlay.get("end")
    scale = overlay.get("scale", 1.0)
    
    # Normalize positions as in _image_filter
    def norm_pos(v, axis: str):
        if isinstance(v, (int, float)):
            return v
        if isinstance(v, str):
            s = v.strip()
            if s.lower() in {"center", "centre", "middle"}:
                return "(W-w)/2" if axis == "x" else "(H-h)/2"
            s = s.replace("w_i", "w").replace("h_i", "h")
            s = s.replace("(w-", "(W-").replace("(h-", "(H-")
            return s
        return v
    x = norm_pos(x, "x")
    y = norm_pos(y, "y")
    
    enable = f"enable='between(t,{start},{end or '1e9'})'"
    if scale != 1.0:
        return (
            f"[{input_index}]scale=iw*{scale}:ih*{scale}[vid{input_index}];"
            f"[{in_label}][vid{input_index}]overlay={x}:{y}:{enable}[{out_label}]"
        )
    return f"[{in_label}][{input_index}]overlay={x}:{y}:{enable}[{out_label}]"


def _watermark_filter(in_label: str, input_index: int, watermark: Dict, out_label: str) -> str:
    """Build watermark filter."""
    x = watermark.get("x", "W-w-20")
    y = watermark.get("y", "H-h-20")
    opacity = watermark.get("opacity", 0.5)
    
    return (
        f"[{input_index}]format=rgba,colorchannelmixer=aa={opacity}[wm{input_index}];"
        f"[{in_label}][wm{input_index}]overlay={x}:{y}:enable='between(t,0,1e9)'[{out_label}]"
    )
