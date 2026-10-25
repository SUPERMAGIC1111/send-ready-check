"""Reference (top) vs headless dot renders (bottom) for SIDE / FRONT / 45deg.
Usage: python3 tools/compare.py   (needs Pillow with WebP)"""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
ref, cap = root / "reference", root / "captures"
S = 460

def panel(path, idx, n):
    im = Image.open(path).convert("RGB")
    w = im.width / n
    return im.crop((int(idx * w) + 4, 0, int((idx + 1) * w) - 4, im.height))

def square(im):
    s = min(im.size)
    l, t = (im.width - s) // 2, (im.height - s) // 2
    return im.crop((l, t, l + s, t + s)).resize((S, S))

cols = [
    ("SIDE (running sheet #2)", panel(ref / "sheet-run-cycle.webp", 1, 3), "view-side.png"),
    ("FRONT (canonical original)", Image.open(ref / "canonical-front-sitting.webp").convert("RGB"), "view-front.png"),
    ("45deg (side sheet #1)", panel(ref / "sheet-side-walk-hero.webp", 0, 3), "view-three-quarter.png"),
]
out = Image.new("RGB", (S * len(cols), S * 2 + 24), "black")
d = ImageDraw.Draw(out)
for i, (label, r, ours) in enumerate(cols):
    out.paste(square(r), (i * S, 24))
    out.paste(Image.open(cap / ours).convert("RGB").resize((S, S)), (i * S, S + 24))
    d.text((i * S + 8, 6), f"REF {label}  /  OURS {ours}", fill=(230, 230, 230))
out.save(cap / "compare-reference.png")
print("wrote", cap / "compare-reference.png")
