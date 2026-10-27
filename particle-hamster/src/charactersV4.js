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

// --- Happy Hamster (texture lab, character design D), after Günter's two reference images: one
// round pear-shaped ball, huge white cheeks, big friendly eyes, small pink nose, open happy smile
// with two teeth, tiny round ears, a spiky orange crown tuft, very short legs, little pink paws.
// Voxel V3's low body and scurry, with a reaching run: the front paws work further forward and
// the hind paws further back (still planted on the rim, see scurryLimbs).
const happy = clone(scurry);
Object.assign(happy, { id: 'happyHamster', name: 'Happy Hamster' });
{
  const A3 = scurry.anatomy, H0 = A3.head.c, H1 = [H0[0] + 0.02, H0[1] + 0.12, 0];
  const re = (c, k) => [H1[0] + (c[0] - H0[0]) * k, H1[1] + (c[1] - H0[1]) * k, c[2] * k];
  const at = (part, k, rk = k) => ({ ...A3[part], c: re(A3[part].c, k), r: A3[part].r.map((v) => v * rk) });
  Object.assign(happy.anatomy, {
    // pear: the body widens to meet the big head, low and round
    body: { c: [-0.32, -0.74, 0], r: [0.92, 0.74, 0.96] },
    belly: { c: [-0.02, -0.96, 0], r: [0.84, 0.5, 0.94] },
    head: { ...A3.head, c: H1, r: A3.head.r.map((v) => v * 1.12), k: 0.55 },
    // huge cheeks: wider, lower, puffed out sideways
    cheek: { ...A3.cheek, c: [H1[0] + 0.42, H1[1] - 0.5, 0.78], r: [0.72, 0.62, 0.66], k: 0.4 },
    muzzle: at('muzzle', 1.12),
    nose: at('nose', 1.12, 1.0),
    mouth: { ...at('mouth', 1.12, 1.45), bend: 2.4, top: 0.5 },
    tooth: { ...at('tooth', 1.12, 1.5) },
    ear: { ...at('ear', 1.0, 0.72) },
    eye: { ...A3.eye, dist: A3.eye.dist * 1.12, r: 0.26, azim: 28 },
  });
}
// white face blaze, big white cheeks and a white belly, like the references
happy.regions = { ...CHARACTERS_V3.orangeV3.regions, cheekCream: -0.18, blaze: [0.1, 0.3, 0.42] };
happy.whiskers = { ...happy.whiskers, count: 0 };
happy.fur = { ...happy.fur, crown: { ...happy.fur.crown, locks: 40, dots: 70, len: 0.5, fan: 1.5, lean: [-0.2], mess: 0.7, spread: 0.3, offset: [0.0, -0.1] } };
happy.run = { ...scurry.run, expression: 'surprise', glance: 0.06, scurry: { ...scurry.run.scurry, step: 0.36, reach: { paw: 0.12, foot: -0.1 } } };

// --- Happy Hamster V9 (anatomy correction): the V8 Happy Hamster made a horizontal animal: body
// longer and lower, head forward and down, hind legs tucked under the rump, front paws under the
// chin, bigger and quicker scurry steps on the curved wheel rim, cheek and ear bounce.
const happy9 = clone(happy);
Object.assign(happy9, { id: 'happyHamsterV9', name: 'Happy Hamster V9' });
{
  const A8 = happy.anatomy, D = [0.12, -0.2, 0];
  const mv = (part) => ({ ...A8[part], c: [A8[part].c[0] + D[0], A8[part].c[1] + D[1], A8[part].c[2]] });
  Object.assign(happy9.anatomy, {
    body: { c: [-0.5, -0.72, 0], r: [1.08, 0.66, 0.94] },
    belly: { c: [-0.1, -0.92, 0], r: [0.95, 0.46, 0.92] },
    head: mv('head'), cheek: mv('cheek'), muzzle: mv('muzzle'), nose: mv('nose'), mouth: mv('mouth'), tooth: mv('tooth'), ear: mv('ear'),
    tail: { ...A8.tail, c: [-1.55, -0.8, 0] },
    // hind legs tucked under the rump, front legs under the chin, set a little wide so all four
    // pink paws show from the side and the front; all soles at y = -1.54
    leg: { a: [-0.86, -1.1, 0.56], b: [-0.82, -1.34, 0.6], r1: 0.14, r2: 0.085 },
    foot: { c: [-0.74, -1.45, 0.62], r: [0.24, 0.09, 0.14] },
    arm: { a: [0.52, -1.1, 0.42], b: [0.78, -1.34, 0.44], r1: 0.1, r2: 0.075 },
    paw: { c: [0.9, -1.45, 0.46], r: [0.18, 0.09, 0.13] },
  });
}
// a little less white on the body so the orange flanks carry the silhouette
happy9.regions = { ...happy.regions, belly: [-0.5, 0.35, 0.3, 0.3] };
happy9.wheelCenterX = 0.1; // rim's lowest point under the middle of the body (see floorC)
happy9.run = {
  ...happy.run, period: 0.17, bounce: 0.05, cheekJiggle: 0.12, earFlop: 0.2, earBounce: 0.3, headLag: 0.06,
  scurry: { ...happy.run.scurry, step: 0.5, lift: 0.12, surge: 0.04, reach: { paw: 0.14, foot: -0.14 }, floorR: 2.82, floorC: 0.1 },
};

// --- V10 "four working legs": the V9 happy hamster with a real leg rig. Hind legs come out of the
// rump, front legs out of the chest, both thick enough to read (orange upper and lower sections,
// pink paws), and the belly is lifted so the legs show under the body.
const v10 = clone(happy9);
Object.assign(v10, { id: 'happyV10', name: 'Happy Hamster V10' });
Object.assign(v10.anatomy, {
  // underside lifted ~0.34 (body bottom -1.04 instead of -1.38) so ~0.45 of each leg shows
  body: { c: [-0.5, -0.52, 0], r: [1.08, 0.52, 0.94] },
  belly: { c: [-0.1, -0.7, 0], r: [0.95, 0.3, 0.92] },
  // cheeks as huge as V9, lifted 0.12 so the front legs show below them
  cheek: { ...happy9.anatomy.cheek, c: [happy9.anatomy.cheek.c[0], happy9.anatomy.cheek.c[1] + 0.12, happy9.anatomy.cheek.c[2]] },
  // rounded thigh / shoulder (r1) tapering to the lower leg (r2), set wide enough to show
  leg: { a: [-0.92, -0.84, 0.56], b: [-0.96, -1.3, 0.64], r1: 0.27, r2: 0.15 },
  foot: { c: [-0.9, -1.44, 0.66], r: [0.22, 0.085, 0.15] },
  arm: { a: [0.5, -0.84, 0.48], b: [0.62, -1.28, 0.54], r1: 0.21, r2: 0.13 },
  paw: { c: [0.8, -1.44, 0.56], r: [0.18, 0.085, 0.14] },
});
const SC10 = { floorR: 2.82, floorC: 0.1, reach: null };
// A: real hamster scurry: low, fast, alternating diagonal pairs, even steps
const v10A = clone(v10);
Object.assign(v10A, { id: 'happyV10A', name: 'V10 A Scurry' });
v10A.run = { ...happy9.run, period: 0.2, bounce: 0.05, cheekJiggle: 0.08, earBounce: 0.2,
  scurry: { ...SC10, step: 0.44, lift: 0.11, duty: 0.5, surge: 0.03, reach: { paw: 0.08, foot: -0.1 }, phases: { pawN: 0, footF: 0, pawF: 0.5, footN: 0.5 } } };
// B: cute cartoon dash: long exaggerated strides, squash and stretch, bouncing cheeks and ears
const v10B = clone(v10);
Object.assign(v10B, { id: 'happyV10B', name: 'V10 B Cartoon Dash' });
v10B.run = { ...happy9.run, period: 0.27, bounce: 0.12, squash: 0.1, cheekJiggle: 0.2, earFlop: 0.3, earBounce: 0.4, headLag: 0.1,
  scurry: { ...SC10, step: 0.66, lift: 0.2, duty: 0.45, surge: 0.08, squash: true, reach: { paw: 0.1, foot: -0.12 }, phases: { pawN: 0, footF: 0, pawF: 0.5, footN: 0.5 } } };
// C: speedy little bastard: very quick small steps, short hind push, long front reach, a lean
const v10C = clone(v10);
Object.assign(v10C, { id: 'happyV10C', name: 'V10 C Speedy' });
v10C.run = { ...happy9.run, period: 0.15, bounce: 0.06, squash: 0.04, cheekJiggle: 0.12, earBounce: 0.3, headLag: 0.08,
  scurry: { ...SC10, step: 0.38, lift: 0.09, duty: 0.34, surge: 0.02, squash: true, lean: -0.05, reach: { paw: 0.16, foot: -0.18 }, phases: { pawN: 0, footF: 0, pawF: 0.5, footN: 0.5 } } };

// --- V11 "low scurry": a different silhouette, not rescaled legs. V9's head, face, cheeks and
// tuft on a long, low, horizontal torso with a rounded rump that flows into the shoulders. No
// hanging belly: the underside sits just above the running surface. The four legs are very short
// and live inside the fur; only tiny pink paws show below it when planted, and a lifted paw tucks
// up into the fur. Front paws sit under the chest, hind paws under the rump, close together
// around the lowest point of the wheel, so the curved rim barely lifts them.
function lowHamster(id, name, { bx, brx, paw, foot, run }) {
  const h = clone(happy9);
  Object.assign(h, { id, name, wheelCenterX: -0.25 });
  Object.assign(h.anatomy, {
    // rounded rump: taller than it is low-slung, so the back arches from the head over the hips
    body: { c: [bx, -0.9, 0], r: [brx, 0.56, 0.86] },
    belly: { c: [bx + 0.3, -1.08, 0], r: [brx * 0.7, 0.3, 0.72] },
    tail: { ...happy9.anatomy.tail, c: [bx - brx + 0.12, -0.92, 0] },
    leg: { a: [-0.95, -1.18, 0.5], b: [-0.95, -1.36, 0.56], r1: 0.1, r2: 0.07 },
    foot: { c: [-0.95, -1.5, 0.56], r: foot },
    arm: { a: [0.35, -1.18, 0.46], b: [0.4, -1.36, 0.5], r1: 0.09, r2: 0.065 },
    paw: { c: [0.42, -1.5, 0.5], r: paw },
  });
  h.regions = { ...happy9.regions, belly: [-0.9, 0.3, 0.2, 0.2] };
  h.run = { ...happy9.run, ...run };
  return h;
}
const SCL = { floorR: 2.82, floorC: -0.25, phases: { pawN: 0, footF: 0, pawF: 0.5, footN: 0.5 } };
// A: realistic low runner: legs almost invisible, tiny quick steps
const v11A = lowHamster('happyV11A', 'V11 A Realistic', { bx: -0.75, brx: 1.2, paw: [0.12, 0.04, 0.08], foot: [0.13, 0.04, 0.09],
  run: { period: 0.14, bounce: 0.02, squash: 0, cheekJiggle: 0.08, earBounce: 0.2,
    scurry: { ...SCL, step: 0.3, lift: 0.05, duty: 0.55, surge: 0.03, reach: { paw: 0.04, foot: -0.05 } } } });
// B: cute stylised: tiny visible paws, soft bounce
const v11B = lowHamster('happyV11B', 'V11 B Cute', { bx: -0.75, brx: 1.2, paw: [0.17, 0.065, 0.11], foot: [0.18, 0.065, 0.12],
  run: { period: 0.17, bounce: 0.05, squash: 0.06, cheekJiggle: 0.16, earFlop: 0.25, earBounce: 0.35,
    scurry: { ...SCL, step: 0.38, lift: 0.08, duty: 0.5, surge: 0.04, squash: true, reach: { paw: 0.06, foot: -0.07 } } } });
// C: speedy: longer body that stretches forward and back, very short limbs
const v11C = lowHamster('happyV11C', 'V11 C Speedy', { bx: -0.85, brx: 1.38, paw: [0.13, 0.045, 0.085], foot: [0.14, 0.045, 0.09],
  run: { period: 0.13, bounce: 0.03, squash: 0.05, cheekJiggle: 0.12, earBounce: 0.3,
    scurry: { ...SCL, step: 0.34, lift: 0.06, duty: 0.45, surge: 0.1, squash: true, lean: -0.03, reach: { paw: 0.08, foot: -0.1 } } } });

// --- V12 silhouette: one continuous bean-shaped hamster after the low side-running reference. The
// head is ~28% lower in height and sits low in front of the shoulders, blended deeply into a
// compact torso that arches smoothly from forehead over back to a full, round rump (rear extension
// ~40% shorter than V11). Cheeks, eyes, nose, smile, ears and tuft are kept; legs stay very short
// and hidden, tiny pink paws close under the belly.
const v12 = clone(v11B);
Object.assign(v12, { id: 'happyV12', name: 'V12 Silhouette', wheelCenterX: -0.25 });
{
  const A9 = happy9.anatomy, H9 = A9.head.c, N = [0.66, -0.46, 0], k = 0.78;
  const re = (c) => [N[0] + (c[0] - H9[0]) * k, N[1] + (c[1] - H9[1]) * k, c[2] * k];
  const mv = (part, rk = k) => ({ ...A9[part], c: re(A9[part].c), r: A9[part].r.map((v) => v * rk) });
  Object.assign(v12.anatomy, {
    head: { ...A9.head, c: N, r: [A9.head.r[0] * 0.82, A9.head.r[1] * 0.72, A9.head.r[2] * 0.82], k: 0.5 },
    cheek: mv('cheek', 0.8), muzzle: mv('muzzle', 0.9), nose: mv('nose', 0.95), mouth: mv('mouth', 0.9), tooth: mv('tooth', 0.9), ear: mv('ear', 0.85),
    eye: { ...A9.eye, dist: A9.eye.dist * k, r: 0.215 },
    body: { c: [-0.32, -0.8, 0], r: [0.76, 0.68, 0.84] },
    belly: { c: [-0.2, -1.2, 0], r: [0.6, 0.26, 0.6] },
    tail: { ...A9.tail, c: [-1.05, -0.82, 0], r: [0.19, 0.18, 0.18] },
    leg: { a: [-0.7, -1.1, 0.46], b: [-0.7, -1.4, 0.5], r1: 0.1, r2: 0.07 },
    foot: { c: [-0.7, -1.52, 0.5], r: [0.15, 0.045, 0.1] },
    arm: { a: [0.3, -1.1, 0.44], b: [0.3, -1.4, 0.48], r1: 0.09, r2: 0.065 },
    paw: { c: [0.3, -1.52, 0.48], r: [0.14, 0.045, 0.09] },
  });
}
v12.run.scurry = { ...v12.run.scurry, floorC: -0.2 };

// --- V13: ten anatomies of the V12 hamster for a silhouette comparison. One factory; each entry sets
// body (centre, radii), head (position, face scale k, head radii multipliers), cheek size, eye, ear
// size and the rump. Body bottom is always ~0.09 above the running surface; paws sit under the
// chest and under the rump, around the lowest point of the wheel. Face parts keep V9's design.
function hamsterV13(n, name, P) {
  const A9 = happy9.anatomy, H9 = A9.head.c, k = P.k, N = P.head;
  const re = (c) => [N[0] + (c[0] - H9[0]) * k, N[1] + (c[1] - H9[1]) * k, c[2] * k];
  const mv = (part, rk = k) => ({ ...A9[part], c: re(A9[part].c), r: A9[part].r.map((v) => v * rk) });
  const [bx, by] = P.body.c, [rx, ry, rz] = P.body.r;
  const pawX = bx + 0.55 * rx, footX = bx - 0.55 * rx, z = 0.55 * rz;
  const h = clone(v11B);
  // centre the whole animal (tail end to nose tip) under the wheel's lowest point, not just the body
  Object.assign(h, { id: 'happyV13_' + n, name, wheelCenterX: (bx - rx + N[0] + A9.head.r[0] * P.hr[0] + 0.15) / 2 });
  Object.assign(h.anatomy, {
    head: { ...A9.head, c: N, r: [A9.head.r[0] * P.hr[0], A9.head.r[1] * P.hr[1], A9.head.r[2] * P.hr[2]], k: P.headK ?? 0.5 },
    cheek: mv('cheek', P.cheek), muzzle: mv('muzzle', P.muz ?? 0.9), nose: mv('nose', 0.95), mouth: mv('mouth', 0.9), tooth: mv('tooth', 0.9),
    ear: mv('ear', P.ear ?? 0.85),
    eye: { ...A9.eye, dist: A9.eye.dist * k, r: P.eyeR },
    body: { c: [bx, by, 0], r: [rx, ry, rz] },
    belly: P.rump ? { c: P.rump.c, r: P.rump.r } : { c: [bx + 0.1, by - 0.2, 0], r: [rx * 0.55, ry * 0.45, rz * 0.6] },
    tail: { ...A9.tail, c: [bx - rx + 0.08, by + 0.04, 0], r: [0.17, 0.16, 0.16] },
    leg: { a: [footX, by - 0.1, z], b: [footX, -1.4, z + 0.04], r1: 0.1, r2: 0.07 },
    foot: { c: [footX, -1.52, z + 0.04], r: [0.15, 0.045, 0.1] },
    arm: { a: [pawX, by - 0.1, z - 0.03], b: [pawX, -1.4, z + 0.01], r1: 0.09, r2: 0.065 },
    paw: { c: [pawX, -1.52, z + 0.01], r: [0.14, 0.045, 0.09] },
  });
  h.run.scurry = { ...h.run.scurry, floorC: (pawX + footX) / 2, ...(P.scurry || {}) };
  return h;
}
const bodyAt = (bx, rx, ry, rz) => ({ c: [bx, -1.45 + ry, 0], r: [rx, ry, rz] });
const V13 = {
  '01': ['01 Classic Golden', { body: bodyAt(-0.4, 0.95, 0.48, 0.62), head: [0.62, -0.78, 0], k: 0.62, hr: [0.78, 0.62, 0.7], cheek: 0.7, eyeR: 0.2 }],
  '02': ['02 Baby Chubby', { body: bodyAt(-0.3, 0.8, 0.55, 0.7), head: [0.6, -0.7, 0], k: 0.75, hr: [0.85, 0.7, 0.85], cheek: 0.95, eyeR: 0.25 }],
  '03': ['03 Speed Runner', { body: bodyAt(-0.55, 1.2, 0.43, 0.55), head: [0.8, -0.88, 0], k: 0.55, hr: [0.7, 0.55, 0.62], cheek: 0.6, eyeR: 0.17, ear: 0.75 }],
  '04': ['04 Cartoon Reference', { body: bodyAt(-0.45, 1.05, 0.5, 0.62), head: [0.75, -0.8, 0], k: 0.6, hr: [0.75, 0.62, 0.7], cheek: 0.7, eyeR: 0.17 }],
  '05': ['05 Realistic Syrian', { body: bodyAt(-0.5, 1.0, 0.5, 0.62), head: [0.7, -0.8, 0], k: 0.55, hr: [0.68, 0.58, 0.62], cheek: 0.5, eyeR: 0.15, ear: 0.8 }],
  '06': ['06 Tiny Explorer', { body: bodyAt(-0.35, 0.82, 0.44, 0.55), head: [0.62, -0.74, 0], k: 0.58, hr: [0.74, 0.6, 0.66], cheek: 0.62, eyeR: 0.2, ear: 1.0 }],
  '07': ['07 Round & Low', { body: bodyAt(-0.35, 0.88, 0.46, 0.7), head: [0.6, -0.85, 0], k: 0.68, hr: [0.82, 0.68, 0.78], cheek: 0.85, eyeR: 0.22 }],
  '08': ['08 Stretchy Scurry', { body: bodyAt(-0.6, 1.3, 0.4, 0.5), head: [0.85, -0.9, 0], k: 0.52, hr: [0.68, 0.52, 0.6], cheek: 0.55, eyeR: 0.16, ear: 0.75 }],
  '09': ['09 Premium Mascot', { body: bodyAt(-0.4, 0.9, 0.52, 0.66), head: [0.62, -0.74, 0], k: 0.7, hr: [0.8, 0.66, 0.76], cheek: 0.85, eyeR: 0.23 }],
  '10': ["10 Joe's Redemption", { body: bodyAt(-0.45, 0.98, 0.5, 0.64), head: [0.72, -0.8, 0], k: 0.6, hr: [0.74, 0.6, 0.68], cheek: 0.72, eyeR: 0.2, rump: { c: [-1.0, -1.04, 0], r: [0.42, 0.42, 0.52] } }],
};
const v13 = Object.fromEntries(Object.entries(V13).map(([n, [name, P]]) => ['happyV13_' + n, hamsterV13(n, name, P)]));

// --- V14: ten pixel hamsters running UP the inner curve of the wheel (Guni's positioning guide).
// Shared mechanics: contact point ~5 degrees up the rising side (the body centre ends up ~15% of
// the radius forward), body leaning a further ~11 degrees nose-up (about 16 degrees uphill in
// all), paws landing on the real rim. Anatomy from V13 "Joe's Redemption" with cheeks ~40% smaller, less white lower face, a
// slightly higher belly and short slim legs that show. Variants differ in palette, eyes, ears and
// proportions; voxel size and voxel shading are set per lab variant.
const PAL = {
  classic: {},
  pink: { fur: [[0.93, 0.5, 0.62], [0.97, 0.58, 0.7], [1.0, 0.66, 0.76], [1.0, 0.75, 0.83]], furAccent: [0.95, 0.56, 0.68], furHi: [1.0, 0.84, 0.9], furTip: [1.0, 0.88, 0.92], cream: [1.0, 0.95, 0.96], ivory: [1.0, 0.98, 0.98], earInner: [1.0, 0.45, 0.6] },
  purple: { ...rocket.palette },
  golden: { fur: [[0.82, 0.55, 0.12], [0.9, 0.65, 0.2], [0.97, 0.74, 0.28], [1.0, 0.82, 0.4]], furAccent: [0.9, 0.64, 0.2], furHi: [1.0, 0.9, 0.55], furTip: [1.0, 0.92, 0.6], cream: [1.0, 0.96, 0.84] },
  peach: { fur: [[0.97, 0.58, 0.42], [1.0, 0.66, 0.5], [1.0, 0.73, 0.58], [1.0, 0.8, 0.66]], furAccent: [1.0, 0.64, 0.48], furHi: [1.0, 0.86, 0.75], furTip: [1.0, 0.9, 0.8], cream: [1.0, 0.96, 0.92], ivory: [1.0, 0.98, 0.95] },
  retro: { fur: [[0.85, 0.36, 0.06], [0.95, 0.46, 0.1], [1.0, 0.55, 0.14], [1.0, 0.64, 0.22]] },
  chestnut: { fur: [[0.5, 0.25, 0.1], [0.6, 0.32, 0.14], [0.68, 0.4, 0.2], [0.76, 0.48, 0.27]], furAccent: [0.6, 0.33, 0.15], furHi: [0.86, 0.66, 0.46], furTip: [0.9, 0.74, 0.56], cream: [1.0, 0.98, 0.96], ivory: [1.0, 1.0, 0.98] },
  sunny: { fur: [[0.98, 0.52, 0.08], [1.0, 0.62, 0.14], [1.0, 0.7, 0.2], [1.0, 0.78, 0.3]], furAccent: [1.0, 0.6, 0.14], furHi: [1.0, 0.88, 0.5] },
  cinnamon: { fur: [[0.76, 0.36, 0.12], [0.86, 0.46, 0.17], [0.94, 0.55, 0.23], [1.0, 0.64, 0.32]], furAccent: [0.86, 0.46, 0.18], furHi: [1.0, 0.8, 0.52], cream: [1.0, 0.95, 0.86] },
};
function hamsterV14(n, name, P) {
  const A9 = happy9.anatomy, H9 = A9.head.c, k = P.k ?? 0.6, N = P.head ?? [0.72, -0.72, 0];
  const re = (c) => [N[0] + (c[0] - H9[0]) * k, N[1] + (c[1] - H9[1]) * k, c[2] * k];
  const mv = (part, rk = k) => ({ ...A9[part], c: re(A9[part].c), r: A9[part].r.map((v) => v * rk) });
  const [bx, rx, ry, rz] = P.body ?? [-0.45, 0.98, 0.46, 0.64];
  const by = -1.34 + ry; // belly ~0.2 above the paw soles: the short slim legs show
  const pawX = bx + 0.55 * rx, footX = bx - 0.5 * rx, z = 0.55 * rz, mid = (pawX + footX) / 2;
  const hr = P.hr ?? [0.74, 0.6, 0.68];
  const h = clone(v11B);
  Object.assign(h, { id: 'happyV14_' + n, name, wheelCenterX: mid, wheelAngle: 0.09 });
  Object.assign(h.palette, PAL[P.pal ?? 'classic']);
  Object.assign(h.anatomy, {
    head: { ...A9.head, c: N, r: [A9.head.r[0] * hr[0], A9.head.r[1] * hr[1], A9.head.r[2] * hr[2]], k: 0.5 },
    cheek: mv('cheek', P.cheek ?? 0.43), muzzle: mv('muzzle', 0.85), nose: mv('nose', 0.95), mouth: mv('mouth', 0.85), tooth: mv('tooth', 0.85),
    ear: mv('ear', P.ear ?? 0.85),
    eye: { ...A9.eye, dist: A9.eye.dist * k, r: P.eyeR ?? 0.2 },
    body: { c: [bx, by, 0], r: [rx, ry, rz] },
    belly: { c: [bx - 0.55 * rx, by + 0.02, 0], r: [0.42 * rx / 0.98, ry * 0.9, rz * 0.8] }, // full round rump
    tail: { ...A9.tail, c: [bx - rx + 0.08, by + 0.06, 0], r: [0.16, 0.15, 0.15] },
    leg: { a: [footX, by - 0.15, z], b: [footX - 0.03, -1.4, z + 0.04], r1: 0.12, r2: 0.07 },
    foot: { c: [footX, -1.505, z + 0.04], r: [0.14, 0.05, 0.09] },
    arm: { a: [pawX, by - 0.15, z - 0.03], b: [pawX + 0.03, -1.4, z + 0.01], r1: 0.1, r2: 0.06 },
    paw: { c: [pawX + 0.04, -1.505, z + 0.01], r: [0.12, 0.05, 0.08] },
  });
  // less white lower face: cream only on the cheek fronts, a narrow blaze and the chest
  h.regions = { ...happy9.regions, cheekCream: 0.05, blaze: [0.06, 0.18, 0.32], belly: [-0.9, 0.3, 0.2, 0.25] };
  h.run = { ...h.run, expression: P.expr ?? h.run.expression,
    scurry: { ...h.run.scurry, floorC: mid, lean: 0.2, step: 0.42, lift: 0.1, duty: 0.5, surge: 0.04, squash: true, reach: { paw: 0.06, foot: -0.08 } } };
  return h;
}
const V14 = {
  '01': ['01 Classic Golden', {}],
  '02': ['02 Baby Pink', { pal: 'pink', eyeR: 0.24, k: 0.64, cheek: 0.48, body: [-0.4, 0.9, 0.48, 0.64] }],
  '03': ['03 Purple Magic', { pal: 'purple', eyeR: 0.21, ear: 0.95 }],
  '04': ['04 Golden Sunshine', { pal: 'golden' }],
  '05': ['05 Pastel Peach', { pal: 'peach', eyeR: 0.21, cheek: 0.46 }],
  '06': ['06 Retro Pixel', { pal: 'retro', body: [-0.45, 1.0, 0.48, 0.66] }],
  '07': ['07 Micro-Voxel Premium', { pal: 'chestnut', eyeR: 0.19, k: 0.58, hr: [0.72, 0.58, 0.66] }],
  '08': ['08 Particle Magic', { pal: 'golden', eyeR: 0.21 }],
  '09': ['09 Happy Cartoon', { pal: 'sunny', eyeR: 0.26, ear: 1.1, k: 0.72, hr: [0.82, 0.66, 0.76], cheek: 0.5, expr: 'surprise', body: [-0.38, 0.88, 0.47, 0.64] }],
  '10': ["10 Joe's Redemption", { pal: 'cinnamon', eyeR: 0.23, k: 0.66, hr: [0.78, 0.63, 0.72], cheek: 0.47, ear: 0.95, body: [-0.42, 0.94, 0.47, 0.64] }],
};
const v14 = Object.fromEntries(Object.entries(V14).map(([n, [name, P]]) => ['happyV14_' + n, hamsterV14(n, name, P)]));

// --- V15 anatomy master (from V14 #10 Joe's Redemption): a compact hamster with jointed legs.
// Body ~28% shorter with a defined round rump and chest, belly raised well clear of the rim, a
// rounder cranium, and four two-segment legs (hind: hip -> forward knee -> ankle -> foot; front:
// shoulder -> backward elbow -> wrist -> paw) driven by two-bone IK in a bounding run: the hind
// pair pushes off together, a short airborne recovery, the front pair reaches and catches, the
// body gathers and stretches and pitches through the stride. Same uphill wheel position as V14.
const v15 = clone(v14.happyV14_10);
Object.assign(v15, { id: 'happyV15', name: 'V15 Anatomy Master' });
{
  const A = v15.anatomy, bx = -0.2, by = -0.66, rx = 0.68, ry = 0.5, rz = 0.62;
  // head: same face, moved onto the shorter body and given a rounder cranium
  const dH = [0.62 - A.head.c[0], -0.5 - A.head.c[1], 0];
  const mv = (part) => ({ ...A[part], c: [A[part].c[0] + dH[0], A[part].c[1] + dH[1], A[part].c[2]] });
  Object.assign(A, {
    head: { ...mv('head'), r: [A.head.r[0] * 1.02, A.head.r[1] * 1.12, A.head.r[2] * 1.04] },
    cheek: mv('cheek'), muzzle: mv('muzzle'), nose: mv('nose'), mouth: mv('mouth'), tooth: mv('tooth'), ear: mv('ear'),
    body: { c: [bx, by, 0], r: [rx, ry, rz] },
    belly: { c: [bx - 0.42, by + 0.02, 0], r: [0.44, 0.46, 0.5] }, // round rump
    tail: { ...A.tail, c: [bx - rx - 0.02, by + 0.08, 0] },
    // hind: hip under the rump, knee forward, ankle back, long foot forward (rodent zig-zag)
    leg: { a: [-0.52, -0.98, 0.4], knee: [-0.28, -1.16, 0.46], b: [-0.58, -1.4, 0.48], r1: 0.16, rj: 0.085, r2: 0.065 },
    foot: { c: [-0.5, -1.505, 0.49], r: [0.16, 0.05, 0.085] },
    // front: shoulder under the chest, elbow back, wrist forward, round paw
    arm: { a: [0.3, -0.98, 0.36], elbow: [0.1, -1.2, 0.4], b: [0.38, -1.4, 0.42], r1: 0.13, rj: 0.075, r2: 0.06 },
    paw: { c: [0.42, -1.505, 0.43], r: [0.13, 0.05, 0.08] },
  });
}
v15.wheelCenterX = -0.05;
v15.wheelAngle = 0.15; // ~9 degrees up the curve; with a ~6 degree lean, ~15 degrees uphill
v15.run = {
  ...v15.run, period: 0.2, bounce: 0.035, squash: 0.04, cheekJiggle: 0.12, earBounce: 0.3, headLag: 0.08,
  // bound: hinds together (slightly staggered), fronts half a stride later; short flight phases
  scurry: { ...v15.run.scurry, floorC: -0.05, step: 0.44, lift: 0.16, duty: 0.4, surge: 0.06, squash: true, lean: 0.1, pitch: 0.035, pitchPhase: 0.4,
    reach: { paw: 0.08, foot: -0.08 }, phases: { footN: 0, footF: 0.07, pawN: 0.5, pawF: 0.57 } },
};

export const CHARACTERS_V4 = { orangeV4: orange, cocoaV4: cocoa, peachyV4: peachy, orangeLab: lab, purpleRocket: rocket, voxelV2: potato, voxelV3: scurry, voxelBigHead: big, happyHamster: happy, happyHamsterV9: happy9, happyV10A: v10A, happyV10B: v10B, happyV10C: v10C, happyV11A: v11A, happyV11B: v11B, happyV11C: v11C, happyV12: v12, ...v13, ...v14, happyV15: v15, brain };
