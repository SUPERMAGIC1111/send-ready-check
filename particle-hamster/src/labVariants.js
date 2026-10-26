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

export const LAB_VARIANTS = [
  { id: 'v4', label: 'V4 Orange', note: 'baseline', character: 'orangeV4', render: 'dots', build: {} },
  { id: 'voxel', label: 'Micro-Voxel', character: 'orangeLab', render: 'voxel', build: { override: fine, voxel: 0.042 } },
  { id: 'fine', label: 'Microdots Fine', character: 'orangeLab', render: 'sculpt', build: { override: fine } },
  { id: 'bold', label: 'Microdots Bold', character: 'orangeLab', render: 'sculpt', build: { override: bold } },
  { id: 'rocket', label: 'Purple Rocket', character: 'purpleRocket', render: 'sculpt', build: { override: fine } },
  { id: 'brainSmooth', label: 'Brain Smooth', character: 'brain', render: 'mesh', brain: true, build: { brain: 'field' } },
  { id: 'brainDots', label: 'Brain Dots', character: 'brain', render: 'sculpt', brain: true, build: { brain: 'dots' } },
  { id: 'brainVoxel', label: 'Brain Voxel', character: 'brain', render: 'voxel', brain: true, build: { brain: 'dots', brainOpts: { spacing: 0.03, candidates: 70000 }, voxel: 0.062 } },
];
