# Particle Hamster

A right-facing, running 3D hamster drawn as a constellation of ~13k separate glowing dots
(Three.js `Points`, additive, black between dots), built from the reference sheets in `reference/`.
Drag to rotate; it settles back to the hero side pose. An optional ASCII mode renders the same
3D hamster as depth-aware coloured glyphs.

## How it works
- `src/hamsterModel.js`: no Three.js dependency. It holds the character spec and the implicit
  anatomy (smooth-unioned ellipsoids/capsules). That anatomy is densely sampled, then
  **Poisson-disc thinned** into evenly spaced dots, with tighter spacing on the eyes, nose and
  pink paws/ears. Dark features (pupils, brows, mouth, and a ring around each eye) are left as
  negative space. Sparse fluff dots, dotted crown spikes and drifting flecks make the outline
  irregular. The file also holds the 9-bone rig and the run cycle (`poseMatrices`).
- `src/ParticleHamster.js`: a reusable `THREE.Group` that skins the dots on the GPU. A depth-only
  occluder hides the far side. Dots are shaded subtly by light, depth fade, twinkle and a slow
  rose/gold colour drift, and silhouette dots are a little brighter.
  `setSolid(true)` switches to opaque, enlarged dots, which is the source image for ASCII mode.
- `src/asciiPass.js`: renders the scene into a small target (2x2 samples per 7x11px cell), then a
  single full-screen pass picks a glyph from ` .:-=+*#%@` by lit luminance and tints it with the
  cell's colour.
- `src/main.js` + `index.html`: the preview page. It has one rAF loop, DPR capped at 2, pauses
  when the tab is hidden, honours `prefers-reduced-motion` and disposes everything on `pagehide`.
  Dots are built in a Web Worker, with a main-thread fallback.
- `tools/render-preview.mjs`: a headless CPU renderer of the same dot data, rig and shading,
  covering both the dots and the ASCII mode. It writes PNGs to `captures/` with no browser
  involved. It is a stand-in for the WebGL output, not a capture of it.

## Run
    npm install
    npm run dev                     # preview at the printed URL
    npm run check                   # data checks (budget, finite data, rig, feet below belly)
    node tools/validate-shaders.mjs # GLSL ES 3.00 compile check (needs glslangValidator)
    npm run render                  # headless renders -> captures/
    python3 tools/compare.py        # reference vs render sheet -> captures/compare-reference.png

Preview query params for repeatable review: `?view=side|three-quarter|front|opposite-side|back|profile`,
`&t=0.2&paused=1`, `&run=0`, `&mode=ascii`. Keys `1`–`6` switch views, `Space` toggles running,
`A` toggles Dots/ASCII.

## Status
The headless renders were compared with the reference sheets (see `captures/compare-reference.png`).
The WebGL page has passed build, data and shader-compile checks only. Its visual review in a real
browser has not happened yet.
