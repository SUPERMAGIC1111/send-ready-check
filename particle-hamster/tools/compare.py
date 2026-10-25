"""Side-by-side: reference panels (top) vs headless particle renders (bottom).
Usage: python3 tools/compare.py   (needs Pillow with WebP)"""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
ref, cap = root / "reference", root / "captures"
S = 420

def panel(path, idx, n):
    im = Image.open(path).convert("RGB")
    w = im.width / n
    return im.crop((int(idx * w) + 4, 0, int((idx + 1) * w) - 4, im.height)).resize((S, S))

pairs = [
    ("hero side (run sheet #2)", panel(ref / "sheet-run-cycle.webp", 1, 3), "view-side.png"),
    ("profile (run sheet #3)", panel(ref / "sheet-run-cycle.webp", 2, 3), "view-profile.png"),
    ("3/4 (side sheet #1)", panel(ref / "sheet-side-walk-hero.webp", 0, 3), "view-three-quarter.png"),
    ("front (front sheet #1)", panel(ref / "sheet-front-roll-sit.webp", 0, 4), "view-front.png"),
]
out = Image.new("RGB", (S * len(pairs), S * 2 + 24), "black")
d = ImageDraw.Draw(out)
for i, (label, r, ours) in enumerate(pairs):
    out.paste(r, (i * S, 24))
    o = Image.open(cap / ours).convert("RGB")
    out.paste(o.resize((S, S)), (i * S, S + 24))
    d.text((i * S + 8, 6), f"REF {label}  /  OURS {ours}", fill=(230, 230, 230))
out.save(cap / "compare-reference.png")
print("wrote", cap / "compare-reference.png")
