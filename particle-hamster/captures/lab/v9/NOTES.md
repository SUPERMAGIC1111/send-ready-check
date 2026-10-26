# Texture lab V9: anatomy correction (one candidate each)

Two new selectable variants: "Happy Hamster V9" and "Happy Folded Brain V9". Every V8 variant is
unchanged: the Brain Voxel, Pink / Jelly / Purple Folded Brain and Happy Hamster (rounded) builds
are byte-identical to commit 2fd08fc (same SHA-256 of voxel positions, colours and kinds). Same
renderer, same rounded micro-voxel material, same wheel, sphere and camera. Not promoted.

## Happy Hamster V9

- Horizontal animal instead of an upright pear: body longer and lower (radii 1.08 × 0.66 × 0.94,
  centre moved back), head and whole face moved 0.12 forward and 0.20 down, tail further back.
- Hind legs tucked under the rump, front legs under the chin; legs short and thin; paws a little
  bigger and set a little wide, so all four pink paws show from the side and the front.
- Same tuft, huge white cheeks, smile and eyes as V8; a little less white on the belly.
- Scurry: diagonal pairs, 0.17 s per stride, step 0.50 (V8 0.36), lift 0.12 (V8 0.075), front paws
  reach 0.14 forward and hind paws push 0.14 back; body bob 0.05 and surge 0.04; cheek wobble 0.12
  and ear bounce 0.30 per stride.
- Curved rim: the paw path now follows the inside of the wheel (circle of radius 2.82 model units,
  the rim at V3's locked scale), so paws far forward or back still touch it. Checked over 64 samples
  per stride: every paw touches the rim exactly (gap 0.0000), is planted 52% of the stride and lifts
  0.12; nothing goes below the rim.
- Wheel speed for V9 uses the radius where the paws actually touch (no 4% slip). Ground speed 5.9
  model units/s (V8 4.0), so the wheel turns about 1.5× faster than with V8.
- Locked to V3's world scale (0.6903), centred under the body.

## Happy Folded Brain V9

Same folded body (hemispheres, fissure, temporal lobes, cerebellum, folds); only the face changed:

- the fissure stops above the forehead, and a soft pad fills the notch between the frontal lobes,
  so there is no vertical crease between the eyes (it read as a frown)
- eyes higher (+0.11) and a little further apart (±0.33), looking forward and slightly inward,
  bigger irises
- relaxed, evenly arched brows, set a little higher, no tilt
- wider, deeper, thicker smile

Purple and Jelly keep the V8 face (no change to their baselines).

## Checks run

- Byte-identity: Brain Voxel, Pink Folded Brain, Purple Folded Brain and Happy Hamster (rounded)
  builds hash the same as commit 2fd08fc.
- Paw contact on the curved rim (64 samples per stride): gap 0.0000 at contact, planted 52%,
  lift 0.12; V8 Happy Hamster, V3 and Big-Head paths unchanged.
- Packaged test page, headless Chromium, SwiftShader: switched through Pink Folded, Happy Folded
  V9, Happy Hamster V8, Happy Hamster V9, Brain Voxel and V3 twice in place: 2 geometries,
  0 textures, 2 programs after every switch on both passes; no page errors.

Measured change V8 → V9 (software GL, 480×480, mean of 4 forced renders; relative only, not the
Mac's GPU and not frame rates):

| | Voxels | Triangles | Software ms/frame |
|---|---|---|---|
| Pink Folded Brain (V8) | 11,212 | 134,544 | 325-338 |
| Happy Folded Brain V9 | 11,114 | 133,368 (-0.9%) | 321-344 (same within noise) |
| Happy Hamster rounded (V8) | 25,045 | 300,540 | 594-655 |
| Happy Hamster V9 | 25,687 | 308,244 (+2.6%) | 679-717 (about +10%, noisy) |
