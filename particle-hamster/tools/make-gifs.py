"""Turn recorded frame folders (tools/record.cjs) into animated GIFs and a run-frames strip.
Usage: python3 tools/make-gifs.py <recDir> <outDir>"""
import sys
from pathlib import Path
from PIL import Image

rec, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

def frames(d, crop=None):
    ims = [Image.open(f).convert("RGB") for f in sorted(d.glob("f*.png"))]
    if crop:
        ims = [i.crop(crop) for i in ims]
    return ims

def gif(name, ims, ms):
    pal = [i.quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for i in ims]
    pal[0].save(out / name, save_all=True, append_images=pal[1:], duration=ms, loop=0, optimize=True)
    print("wrote", out / name)

for d in sorted(rec.glob("run-*")):
    ims = frames(d, (40, 40, 440, 440))
    gif(f"{d.name}.gif", ims, 70)
for d in sorted(rec.glob("drag-*")):
    gif(f"{d.name}.gif", frames(d), 90)

# all three run cycles side by side, 6 evenly spaced frames each
rows = [frames(d, (40, 40, 440, 440)) for d in sorted(rec.glob("run-*"))]
if rows:
    S = 240
    strip = Image.new("RGB", (S * 6, S * len(rows)))
    for r, ims in enumerate(rows):
        for k in range(6):
            strip.paste(ims[k * len(ims) // 12].resize((S, S)), (k * S, r * S))  # first stride only
    strip.save(out / "run-cycles-6-frames.png")
    print("wrote", out / "run-cycles-6-frames.png")
