"""Compose real-browser captures (tools/capture.cjs) into labelled QA sheets.
Usage: python3 tools/qa-sheets.py <captureDir> <outDir>
Expects <char>-<view>.png and <char>-run<k>.png files."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
CROP = 560

def tile(path, size):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    im = im.crop(((w - CROP) // 2, 0, (w + CROP) // 2, CROP))
    return im.resize((size, size))

def sheet(rows, cols_labels, size, name):
    W, H = size * len(cols_labels) + 120, (size + 4) * len(rows) + 28
    img = Image.new("RGB", (W, H), (8, 8, 8))
    d = ImageDraw.Draw(img)
    for j, lab in enumerate(cols_labels):
        d.text((120 + j * size + 8, 8), lab, fill=(200, 200, 200))
    for i, (label, files) in enumerate(rows):
        y = 28 + i * (size + 4)
        d.text((8, y + size // 2), label, fill=(230, 220, 200))
        for j, f in enumerate(files):
            if f.exists():
                img.paste(tile(f, size), (120 + j * size, y))
    img.save(out / name)
    print("wrote", out / name)

chars = ["orange", "purple", "golden"]
views = ["side", "three-quarter", "front", "back", "profile"]
sheet([(c, [src / f"{c}-{v}.png" for v in views]) for c in chars], views, 300, "qa-views.png")
sheet([(c, [src / f"{c}-run{k}.png" for k in range(6)]) for c in chars], [f"frame {k + 1}/6" for k in range(6)], 250, "qa-run.png")
