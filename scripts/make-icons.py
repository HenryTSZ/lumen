#!/usr/bin/env python3
"""生成 Lumen 的应用图标与托盘图标。"""
import math
from PIL import Image, ImageDraw, ImageFilter

OUT = "/workspace/lumen/resources"
SIZE = 512


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, top, bottom):
    """竖向线性渐变背景"""
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(top, bottom, y / (size - 1)))
    return img


def rounded(img, radius_ratio=0.22):
    """圆角遮罩"""
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius=int(min(img.size) * radius_ratio), fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def draw_beams(size, color=(255, 255, 255), alpha=255, line_ratio=0.085, glow=True):
    """三条上升的光束，构成 Lumen 的主视觉"""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w = int(size * line_ratio)

    beams = [
        ((0.20, 0.74), (0.66, 0.34), alpha),
        ((0.12, 0.86), (0.52, 0.52), int(alpha * 0.55)),
        ((0.34, 0.66), (0.90, 0.26), int(alpha * 0.42)),
    ]
    for (x1, y1), (x2, y2), a in beams:
        d.line(
            [(x1 * size, y1 * size), (x2 * size, y2 * size)],
            fill=color + (a,),
            width=w,
            joint="curve",
        )
    if glow:
        layer = layer.filter(ImageFilter.GaussianBlur(radius=size * 0.006))
    return layer


def main_icon(size=SIZE):
    bg = gradient(size, (108, 108, 245), (168, 85, 247))
    # 顶部柔光，增加立体感
    hi = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.ellipse([-size * 0.35, -size * 0.55, size * 0.95, size * 0.45], fill=(255, 255, 255, 46))
    bg = bg.convert("RGBA")
    bg = Image.alpha_composite(bg, hi)

    img = Image.alpha_composite(bg, draw_beams(size))
    img = Image.alpha_composite(img, draw_beams(size, line_ratio=0.045, alpha=255, glow=False))
    return rounded(img)


def tray_icon(size=64):
    """托盘图标：透明底 + 白色光束，小尺寸下保持可辨识"""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pad = int(size * 0.1)
    d.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=int(size * 0.28),
        fill=(124, 124, 248, 235),
    )
    beams = draw_beams(size, line_ratio=0.11, alpha=255, glow=False)
    return Image.alpha_composite(layer, beams)


if __name__ == "__main__":
    icon = main_icon()
    icon.save(f"{OUT}/icon.png")

    ico_sizes = [(s, s) for s in (16, 24, 32, 48, 64, 128, 256)]
    icon.save(f"{OUT}/icon.ico", format="ICO", sizes=ico_sizes)

    tray = tray_icon(64)
    tray.save(f"{OUT}/tray.png")

    # README 中使用的展示图
    icon.resize((256, 256), Image.LANCZOS).save(f"{OUT}/icon-preview.png")
    print("已生成：icon.png / icon.ico / tray.png")
    print("角度参考：", math.sqrt(2))
