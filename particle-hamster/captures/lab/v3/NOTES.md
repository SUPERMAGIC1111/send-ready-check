# Voxel V3: low scurry

A new lab variant ("Voxel V3 (low scurry)"). Voxel V2, Brain Voxel, the wheel sphere and the V3/V4
baseline characters are unchanged.

## Silhouette

- Body lower, wider and a little longer (body radii 0.94 × 0.70 × 0.90; V2 0.84 × 0.72 × 0.90),
  head and face 0.22 lower than the lab body (V2: 0.15).
- Belly bottom at about 0.09 above the floor (V2 about 0.21).
- Hind legs thin (radius 0.15 → 0.085, V2 0.25 → 0.14), hips inside the body; only the lower leg
  and a small pink paw show.
- Front legs start under the chest and point forward-down; tiny paws (0.14 × 0.065 × 0.11).
- Locked to the Micro-Voxel world scale in the wheel (0.6903, measured from Micro-Voxel), so short
  legs do not enlarge it. V2 auto-fits to 0.7535; comparison captures show V2 at 0.6903 too.

## Gait (scurry)

New explicit gait (`scurryLimbs` in hamsterModel.js), used only by Voxel V3:

- Diagonal pairs (near front with far hind), half a cycle apart, 0.18 s per stride (~5.6 steps/s
  per paw).
- Stance (50% of the cycle): each paw tip slides straight back along the floor by 0.34. The front
  paws touch down in front of the chest and the hind paws push back behind the hips.
- Swing: a small arc, 0.075 high, back to the front.
- The limb leans with its tip (a small rotation about the hip or shoulder), then is moved so the
  tip lands exactly on the path. No vertical arm swing and no long backward stretch.
- The body only bobs (0.035) and surges forward/back (0.025); no lean, no squash. The bob and surge
  are subtracted from the limb paths, so planted paws stay on the floor.

Checked numerically over 64 samples per stride: all four tips reach the same floor, the lowest
point of every tip is exactly the floor (error 0.0000), each tip is planted 52% of the cycle, and
lift is 0.075. Nothing goes below the floor.

## Wheel

The wheel speed is set from the gait: inner rim speed = stance slide speed = 0.34 / (0.5 × 0.18) =
3.78 model units/s, so planted paws move with the rim and do not skate. The legs were not lengthened
to speed up the wheel. At the locked scale the wheel turns at about half the Micro-Voxel's speed,
while the paws step about 1.6× as often.

## Material toggle: Solid / Soft (EXPERIMENTAL)

- Solid: the existing opaque Micro-Voxel cubes.
- Soft: the opaque cubes stay as the inner body. A second layer of the same cubes sits half a voxel
  further out along each voxel's normal, 1.25× bigger so neighbours overlap (no gaps), slightly
  lighter, alpha 0.42. It writes depth, so only one translucent layer covers the body and you never
  see through the hamster. Eyes, nose, mouth and pink skin get no outer layer, so the face stays
  crisp. No hair, no glow.
- Known limit: the outer cubes are not depth-sorted, so the translucency can vary slightly from cube
  to cube.

## Limitations

- Captured in headless Chromium on SwiftShader (software GL). No frame-rate claims.
- Running frames are sampled from the run clock (8 per stride); the live loop is continuous.
- Not visually approved; not promoted.
