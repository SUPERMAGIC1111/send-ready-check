# Texture lab V7: three creative experiments

Three new selectable lab variants. Every existing variant is unchanged: Brain Voxel, Voxel V3,
V2, Micro-Voxel, the wheel sphere and the V3/V4 baseline characters. Nothing is promoted.

## One renderer, one style object

All three use the existing voxel renderer (`VoxelHamster.js`) with an optional `style`:

- palette tint for the body voxels (deep → light → highlight, picked by the original brightness)
- rounded "pillow" voxels: the face normal bends towards the cube edges and the edges darken
  softly, so cubes read as rounded tiles without extra geometry (same triangle count)
- gloss (specular), luminous rim (fresnel), soft inner light on the shadow side
- `coreDark` + `shell`: a darker opaque core under a translucent outer layer of the same voxels
  (layered depth); with a style shell the eyes, smile and brows ride on top, opaque and glossy

Every style value defaults to the plain Micro-Voxel look, so variants without a style render
exactly as before. No new renderer, no new geometry system.

## A: Pink Jelly Brain

- Geometry: exactly Brain Voxel's build (same cached build, 4,208 voxels).
- Bubblegum pink, deep pink core (0.62), translucent outer layer (alpha 0.30, offset 0.55 voxel,
  1.3× bigger), strong rim and gloss. The outer layer makes the silhouette slightly larger.
- Eyes and smile sit on top of the jelly, opaque and glossy, so the face stays readable.

## B: Purple Magic Brain

- Same Brain Voxel geometry.
- Violet core → lavender → soft pink highlights, fully rounded voxels, gentle inner light, thin
  translucent layer (alpha 0.22), less rim than the pink one. Reads as a different material:
  rounded sculpted tiles, not jelly.

## C: Big-Head Voxel Hamster

- Voxel V3 body, legs and scurry unchanged (paw contact re-checked: all four on the floor,
  planted 52% of the stride, nothing below the floor).
- Head, cheeks, muzzle, nose, mouth scaled 1.2× about the head centre; the head moves up 0.16 so it
  sits on the body; ears 1.12×; eyes slightly bigger (0.245), 'surprise' expression and glances.
- Distinct surface: finer micro-voxels (0.034 instead of 0.042, 28,694 voxels) with fully rounded
  pillow shading and a light gloss.
- Locked to the same world scale as V3 (0.6903).

## Limitations

- Captured in headless Chromium on SwiftShader. No frame-rate claims.
- Big-Head has about 1.9× the voxels of V3 (28,694 vs 15,243); still bounded, not measured on the
  Mac.
- Translucent layers are not depth-sorted; translucency can vary slightly between voxels.
