# Texture lab V8: character design round

Five new selectable lab variants: three treatments of a new folded brain, and one new hamster
character in two surfaces. All existing variants are unchanged. Checked against the previous commit:
the Brain Voxel and Voxel V3 voxel builds are byte-identical (same SHA-256 of positions, colours
and kinds). Nothing is promoted.

## The folded brain (src/brainSculpt.js, new geometry)

Built because the restyled V7 brains still read as round balls. Same character, now anatomical:

- two hemispheres (frontal/parietal, temporal and occipital lobes per side) blended only lightly,
  so the split stays visible
- a deep longitudinal fissure over the top and back, shallower at the front above the face
- winding cortical folds: grooves along contour lines of warped 3D noise, with dark sulci
- a small striped cerebellum under the back
- smaller eyes set into the frontal lobes, brows and a smile; folds fade around the face

The brain sampler (`buildBrain`) now takes a shape model; the default is the original brain, so
Brain Voxel is unchanged.

| Variant | Voxel size | Voxels | Treatment |
|---|---|---|---|
| Pink Folded Brain | 0.045 | 11,212 | native bubblegum pink, dark sulci, rounded voxels, light gloss |
| Jelly Folded Brain | 0.045 | 11,212 | rose core, translucent pink outer layer, soft rim, face on top |
| Purple Folded Brain | 0.036 | 16,466 | violet to lavender with pink highlights, fully rounded voxels, iridescent sheen at grazing angles |

Same placement and scale as Brain Voxel in the wheel.

## Happy Hamster (character design D)

After Günter's two reference images (used as design reference, not as a texture):
pear-shaped low body, head 1.12×, huge white cheeks, white face blaze, big eyes (0.26), small
pink nose, open smile with two teeth, tiny round ears (0.72×), spiky orange crown tuft (voxelised
from the crown locks), no whiskers (they voxelise badly).

Running: Voxel V3's scurry, with the front paws working 0.12 further forward and the hind paws 0.10
further back (reaching pose), step 0.36. Checked over 64 samples per stride: every paw on the
floor exactly, planted 52%, lift 0.075, nothing below the floor. Locked to V3's world scale.

Surfaces (same character, two variants):

- **Rounded**: 0.036 micro-voxels, fully rounded pillow shading, light gloss (25,045 voxels).
- **Plush**: half-rounded voxels with a fine fibre-tuft texture on every face, plus a fringe of
  short opaque fibre tips just outside the surface. The silhouette stays voxel; the face, nose,
  ears and paws stay clean. No hair simulation.

## Checks run (packaged test page, headless Chromium, SwiftShader software GL)

Disposal: switched through Brain Voxel, the three folded brains, Voxel V3 and both Happy Hamsters
twice in place: 2 geometries, 0 textures, 2-3 shader programs after every switch, identical on
both passes; no page errors.

Render cost per frame in software GL (mean of 4 forced renders, 480×480). Relative cost only: this
is a CPU renderer, not the Mac's GPU, so these are not frame rates.

| Variant | Voxels | Triangles | Software ms/frame | vs Voxel V3 |
|---|---|---|---|---|
| Brain Voxel | 4,208 | 50,496 | 156 | 0.4× |
| Pink Folded Brain | 11,212 | 134,544 | 339-358 | 0.9× |
| Purple Folded Brain | 16,466 | 197,592 | 444 | 1.1× |
| Voxel V3 | 15,243 | 182,916 | 373-459 | 1.0× |
| Jelly Folded Brain | 11,212 | 269,088 | 637-648 | 1.5× |
| Happy Hamster, rounded | 25,045 | 300,540 | 539-677 | 1.4× |
| Happy Hamster, plush | 25,045 | 601,080 | 1,247-1,345 | 3.1× |

Voxel counts above are the browser build; Node gives a few voxels different (floating point).
Capture note: after a Happy Plush page, the next page load could time out in software GL; the
capture tool now opens about:blank before each page and allows a longer load.

## Limitations

- Headless Chromium on SwiftShader; no frame-rate claims.
- Plush draws the voxels twice (core + fibre fringe): about 2× the triangles of Rounded.
- Build times in the worker are about 4.3 to 4.7 s per new variant (measured in Node).
