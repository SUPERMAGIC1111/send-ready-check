# Particle Hamster

A right-facing, running 3D hamster made of ~91k colored particles (Three.js `Points`), built from
the reference sheets in `reference/`. Drag to rotate; it settles back to the hero side pose.

## How it works
- `src/hamsterModel.js`: no Three.js dependency. It holds the character spec, the implicit
  anatomy (smooth-unioned ellipsoids/capsules), surface sampling (55k core points, with a denser
  face pass), the fur strands (~36k points with combed direction, a spiky crown and drifting
  flecks), colour regions, the 9-bone rig and the run cycle (`poseMatrices`).
- `src/ParticleHamster.js`: a reusable `THREE.Group` that skins the particles on the GPU. It draws
  a depth-only occluder, then depth-written core points, then blended fur points. Drop it into any
  scene (for example inside the particle orb later).
- `src/main.js` + `index.html`: the preview page. It has one rAF loop, DPR capped at 2, pauses
  when the tab is hidden, honours `prefers-reduced-motion` and disposes everything on `pagehide`.
  The particles are built in a Web Worker.
- `tools/render-preview.mjs`: a headless CPU splat renderer of the same particle data and rig. It
  writes PNGs to `captures/` with no browser involved. It is a stand-in for the WebGL output,
  not a capture of it.

## Run
    npm install
    npm run dev                     # preview at the printed URL
    npm run check                   # data checks (budget, finite data, rig, feet below belly)
    node tools/validate-shaders.mjs # GLSL ES 3.00 compile check (needs glslangValidator)
    npm run render                  # headless renders -> captures/
    python3 tools/compare.py        # reference vs render sheet -> captures/compare-reference.png

Preview query params for repeatable review: `?view=side|three-quarter|front|opposite-side|back|profile`,
`&t=0.2&paused=1`, `&run=0`. Keys `1`–`6` switch views; `Space` toggles running.

## Status
The headless renders were compared with the reference sheets (see `captures/compare-reference.png`).
The WebGL page has passed build, data and shader-compile checks only. Its visual review in a real
browser has not happened yet.
