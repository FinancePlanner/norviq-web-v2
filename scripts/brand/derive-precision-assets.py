#!/usr/bin/env python3
"""Derive the Precision identity's logo and mascot assets from the one source composite.

The approved artwork is a single 1536x1024 raster scene, not a set of logo files:
the ring/N/star symbol, the "Norviq" wordmark and the tagline sit on a dark
backdrop, and the lynx sits in an office with fabricated ticker panels. There is
no vector master yet (docs/precision-identity.md lists it as outstanding), so
every shipped logo is a crop of that raster.

Rules this script holds to:

- Nothing upscales. The symbol crop is 313x371, so nothing here emits a symbol
  taller than that; the 512 px manifest icon and the iOS AppIcon stay on the old
  N mark until the vector master exists.
- Crops never include the ticker/chart panels to the right of the lynx. Those
  numbers are invented and must not appear anywhere in the product.
- Transparency is reconstructed, not painted: alpha comes from each pixel's
  distance to the backdrop colour, and colour is un-premultiplied against it.
- The monochrome and light-background variants are derived from that alpha. They
  are recolourings of the approved mark, not redrawings, and are flagged in the
  brand doc as pending a designer's vector versions.

The source lives in StockPlanAssets/precision (not a git repository, same as the
Vig masters), so the OUTPUTS are committed and re-running this is a convenience.

Needs Pillow + numpy:  python3 -m venv .venv && .venv/bin/pip install pillow numpy
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_KIT = ROOT.parent / "StockPlanAssets" / "precision"
if not DEFAULT_KIT.exists():
    # Worktrees live one level deeper (norviq/.worktrees/<name>).
    DEFAULT_KIT = ROOT.parents[1] / "StockPlanAssets" / "precision"

SOURCE_NAME = "norviq-lynx-composite.png"

# (left, top, right, bottom) in source pixels. Measured with a luminance bbox:
# symbol 230..507 x 101..453 (the star's tail fades out at y=453), wordmark
# 150..576 x 460..557, tagline 582..595. The symbol box stops at 455 so the
# wordmark's antialiased top edge does not leak in as specks.
CROPS = {
    "logo-symbol": (212, 88, 525, 455),
    "logo-wordmark": (138, 459, 592, 566),
    "logo-lockup-vertical": (128, 84, 602, 568),
    # Head and shoulders only. The ticker panel starts near x=1330 and the
    # glass chart near y=690; both stay outside the box.
    "vig-thinking": (690, 110, 1135, 670),
}

OBSIDIAN = (0x0A, 0x10, 0x1A)
NAVY_INK = (0x11, 0x1B, 0x2B)
PLATINUM = (0xE9, 0xE9, 0xE5)
# The gold parts of the mark on light backgrounds. Champagne #D8B477 measures
# 1.8:1 on the warm off-white page, which loses the ring; this deeper gold keeps
# the ring visible (about 3:1) while staying recognisably the same hue.
DEEP_GOLD = (0xA0, 0x7C, 0x3E)
MUTED_SILVER = (0x9D, 0xA9, 0xB8)
TAGLINE = "DISCIPLINE CREATES FREEDOM"
TAGLINE_FONT = ROOT / "static" / "static" / "fonts" / "geist-sans-latin-500-normal.woff2"


def backdrop(rgb: np.ndarray) -> np.ndarray:
    """Per-pixel estimate of the scene behind the mark.

    The backdrop is a soft gradient, not a flat colour, so a single background
    value leaves a visible rectangle around the crop. A wide minimum filter
    erases the mark (its strokes are far thinner than 41 px) and the blur
    smooths what is left back into the gradient.
    """
    image = Image.fromarray(rgb.astype(np.uint8), "RGB")
    image = image.filter(ImageFilter.MinFilter(41)).filter(ImageFilter.GaussianBlur(25))
    return np.asarray(image, dtype=float)


def unmatte(rgb: np.ndarray) -> np.ndarray:
    """Return RGBA with alpha reconstructed against the crop's dark backdrop."""
    background = backdrop(rgb)
    diff = np.clip(rgb - background, 0, None).max(axis=2)
    # 16 levels of floor drops the soft bloom the render left around every stroke
    # (it reads as a lighter box on Obsidian); 120+ above the backdrop is opaque.
    alpha = np.clip((diff - 16) / 104, 0, 1)
    safe = np.where(alpha > 0.02, alpha, 1)[..., None]
    colour = np.clip(background + (rgb - background) / safe, 0, 255)
    return np.dstack([colour, alpha * 255])


def recolour(rgba: np.ndarray, neutral: tuple[int, int, int], gold: tuple[int, int, int] | None) -> np.ndarray:
    """Flat-colour the mark. With `gold`, warm pixels (ring, star) keep a gold tone.

    Warmth (red minus blue) rather than saturation decides what is gold: the
    star's glowing core is nearly white yet clearly warm (246,208,158), while the
    N and the wordmark are neutral platinum.
    """
    rgb, alpha = rgba[..., :3], rgba[..., 3:] / 255
    # Drop the soft halo around the star: on a light page it reads as a smudge.
    alpha = np.clip((alpha - 0.25) / 0.75, 0, 1)
    if gold is None:
        out = np.broadcast_to(np.array(neutral, float), rgb.shape)
    else:
        warmth = rgb[..., 0] - rgb[..., 2]
        weight = np.clip((warmth - 15) / 30, 0, 1)[..., None]
        out = np.array(neutral, float) * (1 - weight) + np.array(gold, float) * weight
    return np.dstack([out, alpha * 255])


def save(array: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = "RGBA" if array.shape[2] == 4 else "RGB"
    Image.fromarray(array.round().astype(np.uint8), mode).save(path, optimize=True)


def fit(image: Image.Image, longest: int) -> Image.Image:
    w, h = image.size
    if max(w, h) <= longest:
        return image.copy()
    scale = longest / max(w, h)
    return image.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)


def square_icon(symbol: Image.Image, size: int, padding: float = 0.14) -> Image.Image:
    """Opaque app-style icon: the on-dark symbol centred on Obsidian."""
    if size > max(symbol.size):
        raise SystemExit(f"refusing to upscale the symbol to {size}px (source {symbol.size})")
    canvas = Image.new("RGBA", (size, size), OBSIDIAN + (255,))
    inner = fit(symbol, round(size * (1 - 2 * padding)))
    canvas.alpha_composite(inner, ((size - inner.width) // 2, (size - inner.height) // 2))
    return canvas.convert("RGB")


def horizontal_lockup(symbol: np.ndarray, wordmark: np.ndarray) -> np.ndarray:
    """Symbol left, wordmark right, both at native scale. Composition only — no resizing."""
    gap = round(symbol.shape[1] * 0.12)
    height = symbol.shape[0]
    width = symbol.shape[1] + gap + wordmark.shape[1]
    canvas = np.zeros((height, width, 4))
    canvas[:, : symbol.shape[1]] = symbol
    top = (height - wordmark.shape[0]) // 2
    canvas[top : top + wordmark.shape[0], symbol.shape[1] + gap :] = wordmark
    return canvas


def tracked_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.FreeTypeFont, fill, tracking: float) -> None:
    """Draw text letter by letter with extra spacing (CSS letter-spacing)."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def tracked_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, tracking: float) -> float:
    return sum(draw.textlength(ch, font=font) for ch in text) + tracking * (len(text) - 1)


def og_card(lockup: Image.Image) -> Image.Image:
    """The 1200x630 site-wide og:image: the horizontal lockup at native scale and
    the tagline as typeset text (Geist), on Obsidian. No product numbers."""
    width, height = 1200, 630
    if lockup.width > width:
        raise SystemExit(f"lockup {lockup.size} does not fit the og card without downscaling")
    font = ImageFont.truetype(str(TAGLINE_FONT), 30)
    canvas = Image.new("RGBA", (width, height), OBSIDIAN + (255,))
    draw = ImageDraw.Draw(canvas)
    tracking = 30 * 0.18
    gap, text_h = 36, 30
    top = (height - (lockup.height + gap + text_h)) // 2
    canvas.alpha_composite(lockup, ((width - lockup.width) // 2, top))
    text_w = tracked_width(draw, TAGLINE, font, tracking)
    tracked_text(draw, (round((width - text_w) / 2), top + lockup.height + gap), TAGLINE, font, MUTED_SILVER, tracking)
    return canvas.convert("RGB")


def to_webp(png: Path) -> None:
    if shutil.which("cwebp"):
        subprocess.run(
            ["cwebp", "-quiet", "-q", "90", "-m", "6", "-alpha_q", "100", str(png), "-o", str(png.with_suffix(".webp"))],
            check=True,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--kit", type=Path, default=DEFAULT_KIT, help="StockPlanAssets/precision directory")
    parser.add_argument("--web", type=Path, default=ROOT / "static" / "static" / "brand" / "precision")
    args = parser.parse_args()

    source = Image.open(args.kit / "source" / SOURCE_NAME).convert("RGB")
    crops = {name: np.asarray(source.crop(box), dtype=float) for name, box in CROPS.items()}

    kit_crops, kit_derived, web = args.kit / "crops", args.kit / "derived", args.web
    for name, rgb in crops.items():
        save(rgb, kit_crops / f"{name}-ondark.png")

    variants: dict[str, np.ndarray] = {}
    for name in ("logo-symbol", "logo-wordmark", "logo-lockup-vertical"):
        clear = unmatte(crops[name])
        variants[f"{name}-dark"] = clear  # original colours, for dark backgrounds
        variants[f"{name}-light"] = recolour(clear, NAVY_INK, DEEP_GOLD)
        variants[f"{name}-mono-navy"] = recolour(clear, NAVY_INK, None)
        variants[f"{name}-mono-platinum"] = recolour(clear, PLATINUM, None)

    for tone in ("dark", "light", "mono-navy", "mono-platinum"):
        variants[f"logo-lockup-horizontal-{tone}"] = horizontal_lockup(
            variants[f"logo-symbol-{tone}"], variants[f"logo-wordmark-{tone}"]
        )

    for name, rgba in variants.items():
        save(rgba, kit_derived / f"{name}.png")
        save(rgba, web / f"{name}.png")
        to_webp(web / f"{name}.png")

    # The lynx stays opaque: its backdrop is a scene, not a flat colour, so a
    # clean cut-out needs an illustrator (outstanding asset).
    vig = Image.fromarray(crops["vig-thinking"].astype(np.uint8), "RGB")
    vig.save(web / "vig-thinking.png", optimize=True)
    to_webp(web / "vig-thinking.png")
    fit(vig, 280).save(web / "vig-thinking-280.png", optimize=True)
    to_webp(web / "vig-thinking-280.png")

    symbol = Image.fromarray(variants["logo-symbol-dark"].round().astype(np.uint8), "RGBA")
    icons = args.kit / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    for size in (32, 48, 180, 192):  # 16 px dropped: illegible from the raster
        icon = square_icon(symbol, size)
        icon.save(icons / f"icon-{size}.png", optimize=True)
        icon.save(web / f"icon-{size}.png", optimize=True)

    # Site-wide social card, plus the digest email's header logo: 80 px tall, so
    # it is sharp at the 40 CSS px the email renders it at (downscale only).
    lockup = Image.fromarray(variants["logo-lockup-horizontal-dark"].round().astype(np.uint8), "RGBA")
    card = og_card(lockup)
    card.save(args.kit / "og.png", optimize=True)
    card.save(ROOT / "static" / "static" / "images" / "og.png", optimize=True)
    fit(lockup, round(lockup.width * 80 / lockup.height)).save(web / "logo-lockup-email.png", optimize=True)

    print(f"kit: {args.kit}\nweb: {web}")


if __name__ == "__main__":
    main()
