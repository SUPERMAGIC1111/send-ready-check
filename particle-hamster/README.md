# Particle Hamsters

Three original 3D hamster characters made of glowing dots (Three.js `Points`), each standalone
and inside a Motion.dev-style particle sphere: six live, draggable experiences in one gallery.

| Demo | Character | Experience |
|---|---|---|
| 01 | Original Orange: fat, tangerine, ivory cheeks, happy | standalone |
| 02 | Purple Thinking: dusty lavender and pearl, curious head tilts, glancing eyes | standalone |
| 03 | Golden Comedy: absurdly round, honey, big grin and teeth, messy tuft, bouncy | standalone |
| 04 | Original Orange | inside a warm gold particle sphere |
| 05 | Purple Thinking | inside a pearl / lavender particle sphere |
| 06 | Golden Comedy | inside a lively honey-gold sphere with playful scatter |

## V3 (current)

`gallery-v3.html` shows the V3 designs, drawn from `reference/v3/`, and links to the V2 gallery for
comparison. V2 is unchanged.

| Demo | Character | Experience |
|---|---|---|
| 01 | Giant-Head Orange: round fluffball, cinnamon-orange, huge white cheeks, small smile | standalone |
| 02 | Purple Thinking: lavender/pearl, tall plush head, curious tilts and glances | standalone |
| 03 | Golden Comedy: biggest head and cheeks, caramel, big grin and teeth, messy crown | standalone |
| 04–06 | the same three, inside gold / pearl / champagne particle spheres, paws pressing the shell | sphere |

The V3 designs live in `src/charactersV3.js`; the V3 parts of the model are opt-in, so V2 builds
the same as before.
- **Eyes:** flat and set into the head on the surface, with a big iris, two catch-lights and a
  gentle cross-eye.
- **Brows and whiskers:** brows sit on their own bones; whiskers are added as extra dots.
- **Hair:** soft 4-dot locks, plus a thick crown tuft.
- **Colour:** cream never dims to grey.
- **Run cycle (`poseV3`):** the hind legs alternate with a push-off stretch, the arms pump,
  and head, ears, cheeks and brows follow through.
- **Spheres:** a solver places the hamster so its paws reach the inner shell. Each contact
  lights up and ripples through `ParticleOrb`.

ASCII is labelled β (experimental). The eyes, pink nose, paws and feet read, but the dense
V3 coat makes the glyph image busy.

Proof captures are in `captures/v3/` (real headless Chromium):
- views from the side, 45°, front, left and back
- run frames and GIFs
- sphere paw contact
- V2 vs V3
- ASCII
- the interaction test results

## Run

    npm install
    npm run dev          # then open /gallery-v3.html (V3), /gallery.html (V2) or /index.html?character=orangeV3&orb=1

`gallery.html#01` … `#06` opens one demo full-window. In the gallery, drag a card to turn it,
tap it to open it, and press Esc to go back. Hover a card for its controls: Running/Paused, Orbit
(idle auto-orbit), ASCII, Reset and Expand. The keys are Space (run), A (ASCII), R (reset),
arrow keys (turn) and Enter/Esc (open/close).

`index.html` shows a single experience. Its query params are
`?character=orange|purple|golden&orb=1&view=side|three-quarter|front|back|profile&mode=ascii&auto=0`,
and `&t=0.2&paused=1` gives repeatable stills.

## How it works

- `src/characters.js` holds the three character configs. Each one sets its anatomy (implicit
  ellipsoids and capsules), palette, colour regions, fur, dot density and run personality
  (stride, bounce, squash, head tilt, glances, blinks, expression).
- `src/hamsterModel.js` has no Three.js dependency. It samples the implicit surface into ~35k
  evenly spread surface dots, finer on the eyes, nose and smile, plus ~15k soft fur dots and
  curved crown locks. It also holds the 14-bone rig (body, head, ears, arms, legs, tail, cheeks,
  crown, eyes) and the seamless run cycle (`poseMatrices`). The open smile is carved into the
  muzzle with two teeth.
- `src/ParticleHamster.js` skins the dots on the GPU. Surface dots are opaque, depth-tested and
  anti-aliased. They sit over a faint glow layer and under a soft fur shell, and a depth-only
  occluder hides the far side.
- `src/ParticleOrb.js` is the luminous sphere: a noise-weighted shell with drifting bright
  patches, a lit crescent limb, turbulence, stray points that wander out and settle back, and
  playful bursts on 06. Points in front of the hamster fade out so the face stays visible.
- `src/stage.js` and `src/orbit.js` define one experience: drag and touch orbit with inertia,
  pitch limits, slow idle auto-orbit, an eased reset to the right-facing side view, run/pause,
  and Dots/ASCII. The run never stops while dragging.
- `src/gallery.js` draws all six demos with one WebGL context, using scissored viewports.
- `src/asciiPass.js` is the depth-aware ASCII mode of the same 3D scene.

Performance: one renderer and one rAF loop, DPR capped at 2, off-screen gallery cards skipped,
paused while the tab is hidden, everything disposed on `pagehide`, and dots built in a Web
Worker. With `prefers-reduced-motion`, the run, auto-orbit and orb drift start off, and manual
inspection still works.

## Checks (cloud container, no GPU)

    node tools/check.mjs                  # data checks for all three characters
    node tools/validate-shaders.mjs       # GLSL ES 3.00 compile (needs glslangValidator)
    node tools/browser-test.cjs URL OUT   # ONE headless Chromium (software GL): drag, touch,
                                          # inertia, auto-orbit, reset, run while dragging,
                                          # ASCII, expand/Esc, deep links, page errors
    tools/qa-capture.sh URL OUT           # real-browser view + run sheets for all characters
    node tools/record.cjs …; python3 tools/make-gifs.py …   # run-cycle and drag GIFs

`captures/browser/` holds real WebGL captures from headless Chromium (SwiftShader software
rendering). `captures/history/` holds the earlier single-hamster renders. Final artistic
approval is a human decision.
