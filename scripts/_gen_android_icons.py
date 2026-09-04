"""
生成 Android 应用图标与启动图（品牌化）。

源图：public/favicon/web-app-manifest-512x512.png
输出：android/app/src/main/res/mipmap-*/ic_launcher*.png、drawable*/splash.png

规范：
- legacy 方形/圆形图标：48dp（mdpi 48 / hdpi 72 / xhdpi 96 / xxhdpi 144 / xxxhdpi 192）
- adaptive foreground：108dp（mdpi 108 / hdpi 162 / xhdpi 216 / xxhdpi 324 / xxxhdpi 432）
  前景内容画在中心 72dp 安全区内（占画布 66.7%），四周留透明边
- splash：品牌色底 + 居中 logo
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
SRC = os.path.join(ROOT, "public", "favicon", "web-app-manifest-512x512.png")

ICON_BG = (255, 255, 255, 255)     # 图标白底，黑色 logo 更醒目
SPLASH_BG = (11, 11, 15, 255)      # #0b0b0f，与站点 theme-color 一致
SPLASH_LOGO_RATIO = 0.28           # logo 占启动图短边比例

LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
SPLASH = {
    "drawable": (480, 320),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
}


def circle_mask(size):
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def remove_white_bg(im, threshold=240):
    """把接近白色的背景抠成透明，只保留 logo 主体。"""
    rgba = im.convert("RGBA")
    pixels = list(rgba.getdata())
    new = []
    for r, g, b, a in pixels:
        if r > threshold and g > threshold and b > threshold:
            new.append((255, 255, 255, 0))
        else:
            new.append((r, g, b, a))
    out = Image.new("RGBA", rgba.size)
    out.putdata(new)
    return out


def invert_rgba(im):
    """颜色取反（保留透明度），用于把黑色 logo 在深色启动图上显示为白色。"""
    r, g, b, a = im.split()
    return Image.merge("RGBA", [
        Image.eval(r, lambda v: 255 - v),
        Image.eval(g, lambda v: 255 - v),
        Image.eval(b, lambda v: 255 - v),
        a,
    ])


def make_legacy(src, size):
    """方形图标：白底 + 黑色源图居中（留 12% 内边距）。"""
    canvas = Image.new("RGBA", (size, size), ICON_BG)
    inner = int(size * 0.76)
    icon = src.resize((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(icon, ((size - inner) // 2, (size - inner) // 2))
    return canvas


def make_round(src, size):
    sq = make_legacy(src, size)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(sq, (0, 0), circle_mask(size))
    return out


def make_foreground(logo, size):
    """adaptive 前景：透明底 + 黑色 logo 居中，缩到 72dp 安全区（画布的 66.7%）。"""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 72 / 108)
    icon = logo.resize((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(icon, ((size - inner) // 2, (size - inner) // 2))
    return canvas


def make_splash(logo_white, size):
    """启动图：深色品牌底 + 白色 logo 居中。"""
    w, h = size
    canvas = Image.new("RGBA", (w, h), SPLASH_BG)
    side = int(min(w, h) * SPLASH_LOGO_RATIO)
    logo = logo_white.resize((side, side), Image.LANCZOS)
    canvas.alpha_composite(logo, ((w - side) // 2, (h - side) // 2))
    return canvas


def main():
    src = Image.open(SRC).convert("RGBA")
    logo = remove_white_bg(src)
    logo_white = invert_rgba(logo)
    print("源图:", SRC, src.size)

    for d, size in LEGACY.items():
        d1 = os.path.join(RES, f"mipmap-{d}")
        make_legacy(src, size).save(os.path.join(d1, "ic_launcher.png"))
        make_round(src, size).save(os.path.join(d1, "ic_launcher_round.png"))
        make_foreground(logo, ADAPTIVE[d]).save(os.path.join(d1, "ic_launcher_foreground.png"))
        print(f"  mipmap-{d}: square {size}, round {size}, foreground {ADAPTIVE[d]}")

    for d, size in SPLASH.items():
        d1 = os.path.join(RES, d)
        if not os.path.isdir(d1):
            os.makedirs(d1, exist_ok=True)
        make_splash(logo_white, size).save(os.path.join(d1, "splash.png"))
        print(f"  {d}: splash {size[0]}x{size[1]}")

    print("完成")


if __name__ == "__main__":
    main()
