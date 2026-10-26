# Texture lab: technical notes

Page: `lab.html` (test link: https://claude.ai/artifact/HQ2kwSAb9ZSN5Yh5zcc7rj). One stage, one
renderer, one animation loop. The approved wheel, camera, orbit and golden dots are unchanged.
Variants switch in place: the previous character's buffers are disposed and the GPU counts stay
flat across two full cycles of all eight variants.

## Method per variant

| Variant | Renderer | Source | Count (as built) |
|---|---|---|---|
| V4 Orange (baseline) | particle dots, glow + translucent fur | approved V4 config | 113,350 dots (47,062 surface, 66,288 fur) |
| Micro-Voxel | instanced opaque cubes, GPU-skinned | Lab Orange, dots voxelised at 0.042 | 15,096 cubes |
| Microdots Fine | dot sculpture: opaque, no glow, no fur haze | Lab Orange, body dot 0.017 | 89,619 dots |
| Microdots Bold | dot sculpture, bigger dots | Lab Orange, body dot 0.036 | 28,648 dots |
| Purple Rocket | dot sculpture (as Fine) | Purple Rocket palette, quad gait | 89,722 dots |
| Brain Smooth | marching-cubes mesh, vertex colours, lit | brain SDF, 72³ field | 28,696 triangles |
| Brain Dots | dot sculpture | brain SDF, surface dots 0.022 | 36,166 dots |
| Brain Voxel | opaque cubes | brain dots, voxelised at 0.062 | 4,208 cubes |

Lab Orange and Purple Rocket have four connected legs with a quad gait: front paws reach the rim,
diagonal pairs swing together, and arc compensation uses the true rest angle so feet stay on the
floor through the stride.

## Density differences

- Fine vs V4: V4 hides its surface in translucent fur (66k fur dots). Fine has no fur haze, so the
  surface is made of the dots themselves, at about 2x the surface dot count.
- Bold is the coarsest solid option; it reads as a textured fur sculpture with more black gaps.
- Voxel is coarser still: each cube is about 0.042 model units, so the head and features are
  blocky. This is the clearest "not a particle" look.
- Brain Dots is the sparsest surface; the light pink body shows through between dots.

## Occlusion correctness

- Sculpt dots are opaque and depth-writing (alpha-to-coverage). Dots on the far side are hidden by
  depth, not by an occluder. The inner occluder is turned off in sculpt mode: it clips dots that
  sit close to the body and leaves black specks on the coat. Back-face culling was tried and
  removed: it made the coat look holed.
- Voxels are opaque depth-tested cubes: correct occlusion, no halo.
- The brain mesh is a closed surface: correct occlusion.
- Remaining issue: dark shading between dots still shows as specks in close-up (Fine, Bold).

## Paw attachment

- Quad gait: paws and feet are solved on the same rig as V4. The wheel rig places the lowest foot at
  the rim floor. In close-up the feet are attached to the legs and touch the rim; the footfall
  highlight appears where a foot meets the rim.
- Brain variants have no limbs and never run; the brain is centred and static in the wheel.

## Viewer limitations

- Captures were made in headless Chromium on SwiftShader (software GL). They show shape and layout,
  not GPU speed.
- No frame-rate claims are made. Timing was not measured on a real GPU or on the owner's Mac.
- ASCII glyph mode is EXPERIMENTAL. On the brain it is noisy and the face is hard to read; on the
  hamster it reads as a glyph texture, not as the approved ASCII pass.
- Run frames are sampled from the run clock (8 per cycle); the live loop is continuous.
- Heavy builds: the brain dots build takes about 2.5-8 s in the worker, the hamster variants 3-5 s.
  Builds are cached per variant (at most three kept).

## Recommendation (for Günter's visual choice; nothing is promoted)

- For a solid, clean hamster surface: **Microdots Fine** keeps the dots look and removes the fuzzy
  cloud. **Microdots Bold** is the lighter option if Fine is too dense.
- For a strong new look: **Micro-Voxel** is the most distinct and the most stable (opaque cubes, no
  dot coverage problems), but it is blocky.
- For the brain: **Brain Smooth** reads best as a solid object; **Brain Dots** matches the particle
  language; **Brain Voxel** is the most pixel-art.
- Purple Rocket is the same body in lilac; it is a palette choice, not a new technique.

Nothing here is approved for production. Visual approval from Günter is still required before any
of these replace the approved V4 hamster or the production MARKUS Brain interface.
