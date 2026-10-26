// Texture lab: the eight variants of the comparison page. Each one names a character (rig, palette,
// run), what to build in the worker (`build`) and how to draw it (`render`):
//   dots   – the V4 particle renderer as approved (glow + translucent fur)
//   sculpt – the same dots made solid: no glow halo, opaque, back-facing dots culled
//   voxel  – instanced, GPU-skinned cubes (voxels.js + VoxelHamster.js)
//   mesh   – smooth marching-cubes surface (BrainMesh.js)
// The approved wheel/sphere, camera and controls are shared by every variant.

// solid microdot surfaces: no fur haze (fluff 0), a few short crown locks so the head is not bald
const fine = {
  dots: { body: 0.017, face: 0.013, cream: 0.015, skin: 0.012, feature: 0.009, candidates: 420000, featureCandidates: 120000, dotScale: 1.7, fluffSize: 0.013 },
  fur: { fluff: 0, crown: { locks: 16, dots: 40 } },
};
const bold = {
  dots: { body: 0.036, face: 0.027, cream: 0.031, skin: 0.024, feature: 0.016, dotScale: 1.7, fluffSize: 0.026 },
  fur: { fluff: 0, crown: { locks: 12, dots: 30 } },
};

// Brain Voxel's build: shared (same geometry, same cache entry) by the restyled brains
const brainVoxelBuild = { brain: 'dots', brainOpts: { spacing: 0.03, candidates: 70000 }, voxel: 0.062 };

// folded brain at a given voxel size (dots at half the voxel size, so every cell is filled)
const sculptBuild = (v) => ({ brain: 'dots', brainOpts: { model: 'sculpt', spacing: v / 2, candidates: 90000 }, voxel: v });
// Happy Hamster: solid microdots (no fur haze) with the crown tuft, voxelised together
const happyBuild = { override: { ...fine, fur: { fluff: 0 } }, voxel: 0.036, voxelFur: true };

export const LAB_VARIANTS = [
  { id: 'v4', label: 'V4 Orange', note: 'baseline', character: 'orangeV4', render: 'dots', build: {} },
  { id: 'voxel', label: 'Micro-Voxel', character: 'orangeLab', render: 'voxel', build: { override: fine, voxel: 0.042 } },
  { id: 'voxelV2', label: 'Voxel V2 (short legs)', note: 'experimental', character: 'voxelV2', render: 'voxel', build: { override: fine, voxel: 0.042 } },
  { id: 'voxelV3', label: 'Voxel V3 (low scurry)', note: 'experimental', character: 'voxelV3', render: 'voxel', build: { override: fine, voxel: 0.042 } },
  { id: 'fine', label: 'Microdots Fine', character: 'orangeLab', render: 'sculpt', build: { override: fine } },
  { id: 'bold', label: 'Microdots Bold', character: 'orangeLab', render: 'sculpt', build: { override: bold } },
  { id: 'rocket', label: 'Purple Rocket', character: 'purpleRocket', render: 'sculpt', build: { override: fine } },
  { id: 'brainSmooth', label: 'Brain Smooth', character: 'brain', render: 'mesh', brain: true, build: { brain: 'field' } },
  { id: 'brainDots', label: 'Brain Dots', character: 'brain', render: 'sculpt', brain: true, build: { brain: 'dots' } },
  { id: 'brainVoxel', label: 'Brain Voxel', character: 'brain', render: 'voxel', brain: true, build: brainVoxelBuild },
  // --- creative experiments (V7): the same voxel renderer with a style, no new renderer
  { id: 'brainJelly', label: 'Pink Jelly Brain', note: 'experimental', character: 'brain', render: 'voxel', brain: true, build: brainVoxelBuild,
    style: { tint: { deep: [0.93, 0.36, 0.6], light: [1.0, 0.64, 0.8], hi: [1.0, 0.86, 0.93] }, coreDark: 0.62, inner: 0.35, round: 0.35, gloss: 0.7, rim: 1.0,
      shell: { offset: 0.55, scale: 1.3, alpha: 0.3 } } },
  { id: 'brainPurple', label: 'Purple Magic Brain', note: 'experimental', character: 'brain', render: 'voxel', brain: true, build: brainVoxelBuild,
    style: { tint: { deep: [0.32, 0.1, 0.56], light: [0.74, 0.54, 1.0], hi: [1.0, 0.62, 0.88] }, coreDark: 0.9, round: 0.95, gloss: 0.45, rim: 0.45, inner: 0.4,
      shell: { offset: 0.3, scale: 1.1, alpha: 0.22 } } },
  { id: 'bigHead', label: 'Big-Head Voxel', note: 'experimental', character: 'voxelBigHead', render: 'voxel', build: { override: fine, voxel: 0.034 },
    style: { round: 1.0, gloss: 0.18 } },
  // --- character design round (V8): a recognisable folded brain (brainSculpt.js) in three
  // treatments, and the Happy Hamster in two surfaces. Same renderer, styles only.
  { id: 'brainSculptPink', label: 'Pink Folded Brain', note: 'experimental', character: 'brain', render: 'voxel', brain: true, build: sculptBuild(0.045),
    style: { round: 0.9, gloss: 0.22 } },
  { id: 'brainSculptJelly', label: 'Jelly Folded Brain', note: 'experimental', character: 'brain', render: 'voxel', brain: true, build: sculptBuild(0.045),
    style: { tint: { deep: [0.78, 0.2, 0.36], light: [1.0, 0.62, 0.76], hi: [1.0, 0.84, 0.9] }, coreDark: 0.6, inner: 0.3, round: 0.6, gloss: 0.5, rim: 0.6,
      shell: { offset: 0.45, scale: 1.2, alpha: 0.32 } } },
  { id: 'brainSculptPurple', label: 'Purple Folded Brain', note: 'experimental', character: 'brain', render: 'voxel', brain: true, build: sculptBuild(0.036),
    style: { tint: { deep: [0.26, 0.06, 0.48], light: [0.72, 0.5, 1.0], hi: [1.0, 0.62, 0.88] }, coreDark: 0.95, round: 1.0, gloss: 0.4, rim: 0.25, inner: 0.3, iri: 0.8 } },
  { id: 'happyRound', label: 'Happy Hamster (rounded)', note: 'experimental', character: 'happyHamster', render: 'voxel', build: happyBuild,
    style: { round: 1.0, gloss: 0.2 } },
  { id: 'happyPlush', label: 'Happy Hamster (plush)', note: 'experimental', character: 'happyHamster', render: 'voxel', build: happyBuild,
    style: { round: 0.5, plush: 1, shell: { offset: 0.32, scale: 1.08, alpha: 1, face: false } } },
  // --- V9 anatomy correction: one candidate each, V8 variants above stay as they were
  { id: 'brainHappy', label: 'Happy Folded Brain V9', note: 'candidate', character: 'brain', render: 'voxel', brain: true,
    build: { brain: 'dots', brainOpts: { model: 'sculptHappy', spacing: 0.0225, candidates: 90000 }, voxel: 0.045 },
    style: { round: 0.9, gloss: 0.22 } },
  { id: 'happyV9', label: 'Happy Hamster V9', note: 'candidate', character: 'happyHamsterV9', render: 'voxel', build: happyBuild,
    style: { round: 1.0, gloss: 0.2 } },
  // --- V10 four working legs: three real running variants on the new leg rig (V9 unchanged above)
  { id: 'v10A', label: 'V10 A Scurry', note: 'candidate', character: 'happyV10A', render: 'voxel', build: happyBuild, style: { round: 1.0, gloss: 0.2 } },
  { id: 'v10B', label: 'V10 B Cartoon Dash', note: 'candidate', character: 'happyV10B', render: 'voxel', build: happyBuild, style: { round: 1.0, gloss: 0.2 } },
  { id: 'v10C', label: 'V10 C Speedy', note: 'candidate', character: 'happyV10C', render: 'voxel', build: happyBuild, style: { round: 1.0, gloss: 0.2 } },
  // --- V11 low scurry: new silhouette (V8, V9 and V10 above are unchanged)
  { id: 'v11A', label: 'V11 A Realistic', note: 'candidate', character: 'happyV11A', render: 'voxel', build: happyBuild, style: { round: 1.0, gloss: 0.2 } },
  { id: 'v11B', label: 'V11 B Cute', note: 'candidate', character: 'happyV11B', render: 'voxel', build: happyBuild, style: { round: 1.0, gloss: 0.2 } },
  { id: 'v11C', label: 'V11 C Speedy', note: 'candidate', character: 'happyV11C', render: 'voxel', build: happyBuild, style: { round: 1.0, gloss: 0.2 } },
  // --- V12 silhouette check (side view first; V8-V11 above are unchanged)
  { id: 'v12', label: 'V12 Silhouette', note: 'candidate', character: 'happyV12', render: 'voxel', build: happyBuild, style: { round: 1.0, gloss: 0.2 } },
];
