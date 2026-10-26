// V4 characters: young, speedy and inside the wheel. Built from the V3 configs (charactersV3.js
// stays untouched) with the "retired grandpa" removed: compact jaw, two separate round white
// cheeks instead of a beard and bib, white limited to cheeks, tiny muzzle and a small chest
// patch, shorter directional body fur, slimmer body, longer legs, faster gait (3-4 strides/s).
// Plus two brand-new characters with their own anatomy.
import { CHARACTERS_V3 } from './charactersV3.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

// young runner gait: ~3.6 strides/s, forward lean, quick pumping arms, light head bounce
const sprint = (extra = {}) => ({
  gait: 'v3', period: 0.28, bounce: 0.07, lean: -0.16, pitch: 0.05, squash: 0.05,
  legBase: -0.15, legAmp: 0.9, legFold: 0.2, legLift: 0.04, legStretch: 0.1,
  armBase: 0.35, armAmp: 0.75, armStretch: 0.2,
  headLag: 0.07, earFlop: 0.3, earBounce: 0.16, earPerk: 0.2, cheekJiggle: 0.06, crownSway: 0.2,
  tilt: 0.04, tiltSpeed: 1.6, tiltEvery: 5, turn: 0.03, blinkEvery: 3.3, expressionEvery: 4.1, expression: 'squint', glance: 0.05,
  browLift: 0.04, browBounce: 0.012,
  ...extra,
});

// --- V4-A: the original orange, made young
const orange = clone(CHARACTERS_V3.orangeV3);
Object.assign(orange, { id: 'orangeV4', name: 'Speedy Orange' });
Object.assign(orange.anatomy, {
  body: { c: [-0.3, -0.5, 0], r: [0.7, 0.64, 0.74] },
  belly: { c: [0.0, -0.66, 0], r: [0.58, 0.44, 0.7] },
  // two round cheeks, higher and tighter, separated from the chest (small k = visible crease)
  cheek: { c: [0.82, 0.0, 0.6], r: [0.5, 0.44, 0.48], k: 0.22 },
  muzzle: { c: [1.26, 0.12, 0], r: [0.18, 0.15, 0.2] },
  nose: { c: [1.45, 0.22, 0], r: [0.066, 0.052, 0.076] },
  mouth: { c: [1.39, 0.0, 0], r: [0.1, 0.08, 0.15], bend: 2.2, top: 0.45 },
  tooth: { c: [1.45, 0.04, 0.024], r: [0.026, 0.045, 0.024] },
  leg: { a: [-0.4, -0.8, 0.48], b: [-0.36, -1.42, 0.5], r1: 0.22, r2: 0.12 },
  foot: { c: [-0.18, -1.52, 0.5], r: [0.3, 0.09, 0.16] },
  arm: { a: [0.56, -0.56, 0.42], b: [0.86, -0.92, 0.36], r1: 0.13, r2: 0.1 },
  paw: { c: [0.95, -1.0, 0.34], r: [0.15, 0.12, 0.13] },
});
// white: cheek fronts, tiny muzzle and a small chest patch only; short chin fur (no beard)
orange.regions = { ...orange.regions, cheekCream: 0.05, cheekSide: 0.7, chinZ: 0.22, chin: 0.42, chinFur: 0.18, cheekFur: 0.75, bellyFur: 0.3, belly: [-0.5, 0.35, 0.3, 0.3], blaze: [0.05, 0.16, 0.3] };
// young brows: thin, high and arched (no bushy old-man brows)
orange.brows = { len: 0.32, height: 1.55, arch: 0.3, tilt: -0.05, thick: 0.06, dot: 0.03 };
orange.fur = {
  ...orange.fur,
  len: 0.2, lay: 0.95, fluff: 22000, strandDots: 3, droop: 0.05, comb: [0.55, 0.15],
  // cheek fluff sweeps back and slightly up, pale fur lies back instead of hanging down
  flows: { cheek: [-1.0, 0.1, 0], white: [-1.0, -0.15, 0], body: [-1.0, -0.1, 0] },
};
orange.fur.crown = { ...orange.fur.crown, locks: 30, dots: 90, len: 0.5, lean: [-0.35] };
orange.run = sprint();
orange.orb = 'gold';

// --- V4-B: Cocoa Rocket. A sporty chocolate hamster: smaller round head on a sleek body,
// caramel cheeks, tall alert ears, cheeky grin, short slick fur and a spiky mohawk
const cocoa = clone(CHARACTERS_V3.goldenV3);
Object.assign(cocoa, { id: 'cocoaV4', name: 'Cocoa Rocket' });
Object.assign(cocoa.anatomy, {
  body: { c: [-0.36, -0.46, 0], r: [0.82, 0.6, 0.68] },
  belly: { c: [-0.06, -0.6, 0], r: [0.6, 0.4, 0.62] },
  head: { c: [0.42, 0.34, 0], r: [0.84, 0.8, 0.86], k: 0.36 },
  cheek: { c: [0.86, 0.02, 0.5], r: [0.42, 0.38, 0.42], k: 0.22 },
  muzzle: { c: [1.24, 0.14, 0], r: [0.19, 0.15, 0.2] },
  nose: { c: [1.44, 0.24, 0], r: [0.07, 0.055, 0.08] },
  eye: { r: 0.21, dist: 0.76, azim: 34, elev: 20, flat: 0.5, look: [0.96, 0.08, -0.12] },
  ear: { c: [0.08, 1.06, 0.56], r: [0.32, 0.42, 0.1], facing: [0.75, 0.1, 0.65] },
  mouth: { c: [1.37, 0.01, 0], r: [0.12, 0.09, 0.2], bend: 2.0, top: 0.42 },
  tooth: { c: [1.44, 0.05, 0.026], r: [0.028, 0.05, 0.026] },
  leg: { a: [-0.5, -0.74, 0.44], b: [-0.46, -1.36, 0.46], r1: 0.21, r2: 0.11 },
  foot: { c: [-0.28, -1.46, 0.46], r: [0.31, 0.085, 0.15] },
  arm: { a: [0.5, -0.5, 0.38], b: [0.8, -0.86, 0.34], r1: 0.12, r2: 0.095 },
  paw: { c: [0.88, -0.94, 0.32], r: [0.14, 0.11, 0.12] },
  tail: { c: [-1.18, -0.42, 0], r: [0.14, 0.12, 0.12] },
});
Object.assign(cocoa.palette, {
  fur: [[0.3, 0.15, 0.07], [0.42, 0.22, 0.1], [0.52, 0.29, 0.13], [0.62, 0.37, 0.18]], // dark chocolate -> milk chocolate
  furAccent: [0.48, 0.26, 0.12],
  furHi: [0.78, 0.52, 0.28],
  furTip: [0.86, 0.62, 0.36],
  cream: [0.98, 0.84, 0.62], // caramel cream
  ivory: [1.0, 0.92, 0.78],
  iris: [0.62, 0.38, 0.12],
  irisLight: [0.95, 0.7, 0.3],
});
cocoa.regions = { ...cocoa.regions, cheekCream: 0.0, cheekSide: 0.65, chinZ: 0.2, chin: 0.42, chinFur: 0.15, cheekFur: 0.6, bellyFur: 0.25, belly: [-0.5, 0.35, 0.3, 0.32], blaze: [0.04, 0.12, 0.26], blush: 0.25 };
cocoa.brows = { len: 0.34, height: 1.5, arch: 0.16, tilt: -0.14, thick: 0.08, dot: 0.032 }; // cheeky, slanted
cocoa.fur = {
  ...cocoa.fur,
  len: 0.14, lay: 1.05, fluff: 16000, strandDots: 3, droop: 0.03, comb: [0.45, 0.12],
  flows: { cheek: [-1.0, 0.15, 0], white: [-1.0, -0.1, 0], body: [-1.0, -0.05, 0] },
  // spiky forward-leaning mohawk
  crown: { locks: 22, dots: 70, len: 0.5, fan: 0.6, lean: [0.35], mess: 0.35, curl: 0.06, spread: 0.18, size: 2.0, taper: 0.45, tone: 1, offset: [0.06, -0.08] },
};
cocoa.run = sprint({ period: 0.26, lean: -0.2, bounce: 0.06, armAmp: 0.8, expression: 'surprise' });
cocoa.orb = 'gold';

// --- V4-C: Peachy Pop. A tiny round apricot-and-cream dwarf hamster: one perfect ball, huge
// shiny eyes, tiny round ears, button nose, short plush coat, little tuft, bouncy run
const peachy = clone(CHARACTERS_V3.purpleV3);
Object.assign(peachy, { id: 'peachyV4', name: 'Peachy Pop' });
Object.assign(peachy.anatomy, {
  body: { c: [-0.24, -0.46, 0], r: [0.78, 0.7, 0.8] },
  belly: { c: [0.0, -0.62, 0], r: [0.66, 0.48, 0.74] },
  head: { c: [0.3, 0.3, 0], r: [0.92, 0.88, 0.94], k: 0.44 },
  cheek: { c: [0.74, -0.04, 0.58], r: [0.48, 0.42, 0.46], k: 0.24 },
  muzzle: { c: [1.17, 0.1, 0], r: [0.15, 0.13, 0.17] },
  nose: { c: [1.33, 0.18, 0], r: [0.055, 0.045, 0.065] },
  eye: { r: 0.26, dist: 0.84, azim: 36, elev: 18, flat: 0.55, look: [0.96, 0.08, -0.1] },
  ear: { c: [0.02, 0.98, 0.6], r: [0.22, 0.22, 0.08], facing: [0.72, 0.15, 0.68] },
  mouth: { c: [1.27, -0.02, 0], r: [0.09, 0.07, 0.13], bend: 2.4, top: 0.48 },
  tooth: { c: [1.32, 0.02, 0.02], r: [0.022, 0.038, 0.02] },
  leg: { a: [-0.36, -0.78, 0.5], b: [-0.32, -1.3, 0.52], r1: 0.21, r2: 0.115 },
  foot: { c: [-0.14, -1.4, 0.52], r: [0.26, 0.085, 0.14] },
  arm: { a: [0.5, -0.5, 0.42], b: [0.78, -0.86, 0.36], r1: 0.12, r2: 0.095 },
  paw: { c: [0.86, -0.94, 0.34], r: [0.13, 0.11, 0.12] },
  tail: { c: [-1.0, -0.44, 0], r: [0.12, 0.1, 0.1] },
});
Object.assign(peachy.palette, {
  fur: [[0.93, 0.56, 0.36], [0.98, 0.66, 0.44], [1.0, 0.74, 0.52], [1.0, 0.8, 0.6]], // apricot -> peach
  furAccent: [0.96, 0.62, 0.42],
  furHi: [1.0, 0.86, 0.7],
  furTip: [1.0, 0.9, 0.78],
  cream: [1.0, 0.96, 0.9],
  ivory: [1.0, 0.99, 0.96],
  blush: [1.0, 0.58, 0.6],
  iris: [0.36, 0.2, 0.12],
  irisLight: [0.7, 0.44, 0.26],
  irisRing: [0.12, 0.06, 0.03],
  pupil: [0.03, 0.02, 0.02],
  sclera: [0.98, 0.97, 0.95],
  scleraShade: [0.82, 0.78, 0.74],
  eyeRim: [0.22, 0.12, 0.08],
  brow: [0.5, 0.26, 0.16],
  browHi: [0.6, 0.34, 0.22],
  earInner: [1.0, 0.56, 0.6],
  mouthIn: [0.58, 0.16, 0.2],
  lip: [0.4, 0.12, 0.12],
  tongue: [1.0, 0.58, 0.64],
});
peachy.regions = { ...peachy.regions, cheekCream: -0.05, cheekSide: 0.6, chinZ: 0.24, chin: 0.4, chinFur: 0.15, cheekFur: 0.6, bellyFur: 0.25, belly: [-0.5, 0.35, 0.3, 0.34], blaze: [0.03, 0.1, 0.24], blush: 0.5 };
peachy.eye = { ...peachy.eye, irisCos: 0.68, pupilCos: 0.86, catch1: 0.962, catch2: 0.99 }; // big dark shiny eyes
peachy.brows = { len: 0.2, height: 1.45, arch: 0.3, tilt: 0.0, thick: 0.05, dot: 0.026 }; // tiny soft brows
peachy.fur = {
  ...peachy.fur,
  len: 0.15, lay: 0.95, fluff: 18000, strandDots: 3, droop: 0.04, comb: [0.5, 0.14],
  flows: { cheek: [-1.0, 0.2, 0], white: [-1.0, -0.1, 0], body: [-1.0, -0.05, 0] },
  crown: { locks: 14, dots: 60, len: 0.26, fan: 1.2, lean: [-0.1], mess: 0.5, curl: 0.1, spread: 0.16, size: 1.8, taper: 0.4, tone: 1, offset: [0.0, -0.06] },
};
peachy.run = sprint({ period: 0.3, bounce: 0.11, lean: -0.1, squash: 0.08, legAmp: 0.85, cheekJiggle: 0.09, expression: 'surprise', glance: 0.1 });
peachy.orb = 'gold';

// --- texture lab: one shared hamster body for every texture experiment. Speedy Orange on four
// real legs: the front paws are feet that reach the running surface (quad gait), body leans a
// little forward, the run is the same 3.6 strides/s.
const lab = clone(orange);
Object.assign(lab, { id: 'orangeLab', name: 'Lab Orange' });
Object.assign(lab.anatomy, {
  arm: { a: [0.56, -0.58, 0.4], b: [0.72, -1.3, 0.38], r1: 0.15, r2: 0.11 },
  paw: { c: [0.8, -1.52, 0.38], r: [0.22, 0.085, 0.13] },
  leg: { a: [-0.42, -0.78, 0.46], b: [-0.38, -1.4, 0.48], r1: 0.23, r2: 0.12 },
  foot: { c: [-0.2, -1.52, 0.48], r: [0.3, 0.085, 0.15] },
});
// white only on cheek fronts, tiny muzzle and a small chest patch
lab.regions = { ...lab.regions, cheekCream: 0.12, cheekSide: 0.8, chinZ: 0.18, chin: 0.46, belly: [-0.6, 0.3, 0.4, 0.24] };
lab.run = sprint({ quad: Math.PI / 2, lean: -0.05, legAmp: 0.75, legFold: 0.25, legStretch: 0, legLift: 0.06, bounce: 0.06 });

// --- Purple Rocket: the same young runner body in soft lilac with pink nose, ears and feet,
// pale-lavender cheeks and a tiny muzzle, wide energetic eyes
const rocket = clone(lab);
Object.assign(rocket, { id: 'purpleRocket', name: 'Purple Rocket' });
Object.assign(rocket.palette, {
  fur: [[0.56, 0.4, 0.8], [0.64, 0.48, 0.86], [0.71, 0.56, 0.9], [0.78, 0.65, 0.94]],
  furAccent: [0.66, 0.52, 0.88],
  furHi: [0.86, 0.76, 1.0],
  furTip: [0.9, 0.82, 1.0],
  cream: [0.93, 0.89, 1.0],
  ivory: [0.97, 0.95, 1.0],
  blush: [1.0, 0.62, 0.78],
  iris: [0.36, 0.2, 0.5],
  irisLight: [0.66, 0.46, 0.86],
  irisRing: [0.14, 0.06, 0.2],
  eyeRim: [0.2, 0.1, 0.28],
  brow: [0.24, 0.12, 0.32],
  browHi: [0.34, 0.2, 0.42],
});
Object.assign(rocket.anatomy, { eye: { ...rocket.anatomy.eye, r: 0.22 } });
rocket.run = sprint({ quad: Math.PI / 2, period: 0.27, lean: -0.06, legAmp: 0.78, legFold: 0.25, legStretch: 0, legLift: 0.06, bounce: 0.07, expression: 'surprise' });

// --- Brain: rig stub so the shared stage/renderer can host the brain experiments. The brain's
// dots all sit on the body bone (no limbs); the occluder is a body-sized ellipsoid inside the brain.
const brain = clone(orange);
Object.assign(brain, { id: 'brain', name: 'Brain' });
Object.assign(brain.anatomy, {
  body: { c: [0, 0, 0], r: [0.82, 0.78, 0.96] },
  belly: { c: [0, 0, 0], r: [0.8, 0.76, 0.94] },
  head: { c: [0, 0, 0], r: [0.01, 0.01, 0.01], k: 0.1 },
});
brain.run = sprint({ bounce: 0, squash: 0 });
brain.brain = true;

// --- Voxel V2, "short-leg potato" (texture lab): the Micro-Voxel body, lowered so the belly sits
// close to the running surface. Visible legs are about half as long as the lab body's, the arms
// are folded under the round body, the head and face move down with the body, and the run is a
// compact four-legged scurry (short period, small leg swing, no backward push).
const DROP = -0.15;
const dropC = (c) => [c[0], c[1] + DROP, c[2]];
const potato = clone(lab);
Object.assign(potato, { id: 'voxelV2', name: 'Voxel V2' });
Object.assign(potato.anatomy, {
  body: { c: dropC(lab.anatomy.body.c), r: [0.84, 0.72, 0.9] },
  belly: { c: dropC(lab.anatomy.belly.c), r: [0.78, 0.5, 0.9] },
  head: { ...lab.anatomy.head, c: dropC(lab.anatomy.head.c) },
  cheek: { ...lab.anatomy.cheek, c: dropC(lab.anatomy.cheek.c) },
  muzzle: { ...lab.anatomy.muzzle, c: dropC(lab.anatomy.muzzle.c) },
  nose: { ...lab.anatomy.nose, c: dropC(lab.anatomy.nose.c) },
  mouth: { ...lab.anatomy.mouth, c: dropC(lab.anatomy.mouth.c) },
  tooth: { ...lab.anatomy.tooth, c: dropC(lab.anatomy.tooth.c) },
  ear: { ...lab.anatomy.ear, c: dropC(lab.anatomy.ear.c) },
  tail: { ...lab.anatomy.tail, c: dropC(lab.anatomy.tail.c) },
  // short legs: hips high in the body, feet on the floor (floor = -1.55 as before)
  leg: { a: [-0.42, -1.0, 0.52], b: [-0.38, -1.34, 0.54], r1: 0.25, r2: 0.14 },
  foot: { c: [-0.2, -1.46, 0.54], r: [0.29, 0.09, 0.16] },
  // front paws: tiny, tucked under the chest, not hands
  arm: { a: [0.5, -0.92, 0.44], b: [0.62, -1.25, 0.38], r1: 0.13, r2: 0.1 },
  paw: { c: [0.66, -1.455, 0.36], r: [0.16, 0.11, 0.13] },
});
potato.palette = lab.palette;
// gait tuned numerically: every paw and foot reaches the same floor and stays planted ~35% of the
// cycle; feet lift ~0.14, front paws ~0.09 (small, rapid steps)
potato.run = sprint({ period: 0.24, quad: Math.PI / 2, lean: -0.02, legBase: -0.05, legAmp: 0.3, legFold: 0, legStretch: 0, legLift: 0, bounce: 0.05, armBase: 0.2, armAmp: 0.5, armStretch: 0.1 });

// --- Voxel V3, "low scurry" (texture lab): lower, rounder and a little longer than V2, the belly
// just above the running surface, thin short hind legs, front paws that come forward from under
// the chest, and an explicit four-legged scurry (hamsterModel scurryLimbs). Locked to the
// Micro-Voxel world scale in the wheel (wheelScale), so short legs do not enlarge it.
const DROP3 = -0.22;
const drop3 = (c) => [c[0], c[1] + DROP3, c[2]];
const scurry = clone(lab);
Object.assign(scurry, { id: 'voxelV3', name: 'Voxel V3' });
Object.assign(scurry.anatomy, {
  body: { c: [-0.38, -0.76, 0], r: [0.94, 0.7, 0.9] },
  belly: { c: [-0.08, -0.98, 0], r: [0.86, 0.48, 0.9] },
  head: { ...lab.anatomy.head, c: drop3(lab.anatomy.head.c) },
  cheek: { ...lab.anatomy.cheek, c: drop3(lab.anatomy.cheek.c) },
  muzzle: { ...lab.anatomy.muzzle, c: drop3(lab.anatomy.muzzle.c) },
  nose: { ...lab.anatomy.nose, c: drop3(lab.anatomy.nose.c) },
  mouth: { ...lab.anatomy.mouth, c: drop3(lab.anatomy.mouth.c) },
  tooth: { ...lab.anatomy.tooth, c: drop3(lab.anatomy.tooth.c) },
  ear: { ...lab.anatomy.ear, c: drop3(lab.anatomy.ear.c) },
  tail: { ...lab.anatomy.tail, c: [-1.28, -0.74, 0] },
  // hind legs: hips inside the body, thin, only the lower leg and the paw show
  leg: { a: [-0.56, -1.12, 0.5], b: [-0.5, -1.4, 0.52], r1: 0.15, r2: 0.085 },
  foot: { c: [-0.38, -1.485, 0.52], r: [0.2, 0.07, 0.12] },
  // front legs: start under the chest and reach forward-down, not hanging arms
  arm: { a: [0.36, -1.1, 0.38], b: [0.58, -1.38, 0.34], r1: 0.1, r2: 0.075 },
  paw: { c: [0.68, -1.49, 0.32], r: [0.14, 0.065, 0.11] },
});
scurry.palette = lab.palette;
scurry.wheelScale = 0.6903; // Micro-Voxel's world scale in the wheel (measured), not auto-fit
scurry.run = sprint({
  quad: Math.PI / 2, period: 0.18, lean: 0, pitch: 0, squash: 0, bounce: 0.035, headLag: 0.04, cheekJiggle: 0.05,
  // diagonal pairs (near-front with far-hind), half a cycle apart; stance slides straight back
  scurry: { step: 0.34, lift: 0.075, duty: 0.5, surge: 0.025, phases: { pawN: 0, footF: 0, pawF: 0.5, footN: 0.5 } },
});

// --- Big-head Voxel (texture lab, creative experiment C): Voxel V3's body, legs and scurry with
// the head, cheeks and face about 20% bigger (scaled about the head centre, which moves up so the
// bigger head sits on the body instead of sinking into it) and slightly bigger, friendlier eyes.
const big = clone(scurry);
Object.assign(big, { id: 'voxelBigHead', name: 'Big-Head Voxel' });
{
  const HS = 1.2, A3 = scurry.anatomy, H0 = A3.head.c, H1 = [H0[0] + 0.06, H0[1] + 0.16, 0];
  const re = (c) => [H1[0] + (c[0] - H0[0]) * HS, H1[1] + (c[1] - H0[1]) * HS, c[2] * HS];
  const grow = (part, k = HS) => ({ ...A3[part], c: re(A3[part].c), r: A3[part].r.map((v) => v * k) });
  Object.assign(big.anatomy, {
    head: { ...A3.head, c: H1, r: A3.head.r.map((v) => v * HS) },
    cheek: grow('cheek'),
    muzzle: grow('muzzle'),
    nose: grow('nose'),
    mouth: grow('mouth'),
    tooth: grow('tooth'),
    ear: grow('ear', 1.12),
    eye: { ...A3.eye, dist: A3.eye.dist * HS, r: 0.245 },
  });
}
big.run = { ...scurry.run, expression: 'surprise', glance: 0.07 };

export const CHARACTERS_V4 = { orangeV4: orange, cocoaV4: cocoa, peachyV4: peachy, orangeLab: lab, purpleRocket: rocket, voxelV2: potato, voxelV3: scurry, voxelBigHead: big, brain };
