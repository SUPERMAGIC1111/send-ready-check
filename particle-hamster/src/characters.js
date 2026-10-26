import { CHARACTERS_V3 } from './charactersV3.js';

// The three hamster characters. Each config drives hamsterModel.js: anatomy (implicit
// primitives, rest pose), palette, colour regions, fur, dot density and run personality.
// Coordinates: +X forward, +Y up, +Z near side; units ~ body height 2.

const dots = (body, extra = {}) => ({
  candidates: 230000, // dense surface samples before thinning
  body, // dot spacing on the body
  face: body * 0.72, // around the eyes, muzzle and cheeks
  cream: body * 0.84, // pale fur: a little denser so it reads soft, not grainy
  skin: body * 0.62, // pink paws, feet, nose, inner ears
  feature: body * 0.5, // eyes, teeth, mouth
  dotScale: 0.82, // point size relative to its spacing: black stays between dots
  fluffSize: body * 0.72,
  ...extra,
});

export const CHARACTERS = {
  // 01 - the original happy orange hamster: fat, round, tangerine, big ivory cheeks
  orange: {
    id: 'orange',
    name: 'Original Orange',
    anatomy: {
      body: { c: [-0.12, -0.12, 0], r: [0.92, 0.88, 0.94] },
      belly: { c: [0.1, -0.4, 0], r: [0.74, 0.56, 0.82] },
      head: { c: [0.52, 0.36, 0], r: [0.72, 0.67, 0.72], k: 0.34 },
      cheek: { c: [0.86, 0.05, 0.38], r: [0.36, 0.31, 0.31], k: 0.24 },
      muzzle: { c: [1.15, 0.16, 0], r: [0.19, 0.155, 0.2] },
      nose: { c: [1.355, 0.235, 0], r: [0.075, 0.058, 0.085] },
      eye: { r: 0.155, dist: 0.6, azim: 40, elev: 14, look: [0.95, 0.12, 0.3] },
      ear: { c: [0.32, 1.0, 0.48], r: [0.21, 0.22, 0.065], facing: [0.55, 0.12, 0.82] },
      arm: { a: [0.6, -0.2, 0.38], b: [0.86, -0.38, 0.33], r1: 0.11, r2: 0.085 },
      paw: { c: [0.94, -0.42, 0.31], r: [0.09, 0.075, 0.088] },
      leg: { a: [-0.3, -0.45, 0.47], b: [-0.26, -1.04, 0.5], r1: 0.22, r2: 0.11 },
      foot: { c: [-0.13, -1.14, 0.5], r: [0.2, 0.07, 0.105] },
      tail: { c: [-1.06, -0.15, 0], r: [0.12, 0.1, 0.1] },
      mouth: { c: [1.255, 0.03, 0], r: [0.1, 0.08, 0.15], bend: 2.6, top: 0.5 },
      tooth: { c: [1.315, 0.058, 0.025], r: [0.024, 0.042, 0.023] },
    },
    palette: {
      fur: [[0.74, 0.34, 0.1], [0.9, 0.45, 0.13], [0.99, 0.56, 0.16], [1.0, 0.68, 0.26]], // cinnamon -> amber
      furAccent: [0.8, 0.5, 0.2], // golden brown
      furHi: [1.0, 0.8, 0.45],
      furTip: [1.0, 0.84, 0.56],
      cream: [0.92, 0.8, 0.65],
      ivory: [0.96, 0.88, 0.76],
      blush: [1.0, 0.62, 0.6],
      pink: [1.0, 0.6, 0.66],
      pinkDeep: [0.95, 0.45, 0.55],
      earInner: [0.98, 0.55, 0.6],
      iris: [0.32, 0.17, 0.07],
      irisLight: [0.74, 0.44, 0.18],
      pupil: [0.05, 0.03, 0.025],
      sclera: [0.95, 0.93, 0.9],
      eyeRim: [0.34, 0.17, 0.07],
      mouthIn: [0.55, 0.15, 0.2],
      tongue: [1.0, 0.6, 0.66],
      tooth: [1.0, 0.98, 0.94],
    },
    regions: { blush: 0.45, cheekCream: -0.05, cheekFur: 1.4, blaze: [0.05, 0.2, 0.28], chin: 0.3, belly: [-0.02, 0.32, 0.55, 0.52] },
    eye: { catch1: 0.945, catch2: 0.985, irisCos: 0.42, rim: 0.012 },
    fur: {
      len: 0.085, lay: 0.9, fluff: 14000,
      crown: { locks: 11, dots: 34, len: 0.22, fan: 1.5, lean: [-0.45], mess: 0.5, curl: -0.05, spread: 0.075, offset: [0, -0.04] },
    },
    dots: dots(0.024),
    // happy, energetic run
    run: {
      period: 0.42, bounce: 0.085, pitch: 0.09, squash: 0.05, legAmp: 0.8, armAmp: 0.7, headLag: 0.1,
      tilt: 0.04, tiltSpeed: 1.3, tiltEvery: 5, turn: 0.03, earFlop: 0.22, earPerk: 0.15,
      cheekJiggle: 0.04, crownSway: 0.12, blinkEvery: 3.1, expressionEvery: 4.3, expression: 'squint', glance: 0.05,
    },
    orb: 'gold',
  },

  // 02 - the purple thinking hamster: lavender/pearl, refined round head, extra fluffy, curious
  purple: {
    id: 'purple',
    name: 'Purple Thinking',
    anatomy: {
      body: { c: [-0.1, -0.13, 0], r: [0.86, 0.84, 0.88] },
      belly: { c: [0.1, -0.4, 0], r: [0.7, 0.54, 0.78] },
      head: { c: [0.5, 0.42, 0], r: [0.68, 0.68, 0.68], k: 0.32 },
      cheek: { c: [0.82, 0.1, 0.34], r: [0.32, 0.27, 0.28], k: 0.24 },
      muzzle: { c: [1.08, 0.21, 0], r: [0.17, 0.14, 0.18] },
      nose: { c: [1.262, 0.275, 0], r: [0.064, 0.05, 0.072] },
      eye: { r: 0.145, dist: 0.57, azim: 38, elev: 16, look: [0.92, 0.2, 0.34] },
      ear: { c: [0.3, 1.02, 0.42], r: [0.17, 0.18, 0.06], facing: [0.55, 0.15, 0.82] },
      arm: { a: [0.58, -0.18, 0.36], b: [0.82, -0.35, 0.31], r1: 0.1, r2: 0.08 },
      paw: { c: [0.9, -0.39, 0.29], r: [0.085, 0.07, 0.083] },
      leg: { a: [-0.28, -0.45, 0.45], b: [-0.24, -1.03, 0.48], r1: 0.21, r2: 0.105 },
      foot: { c: [-0.12, -1.13, 0.48], r: [0.19, 0.065, 0.1] },
      tail: { c: [-0.98, -0.15, 0], r: [0.11, 0.09, 0.09] },
      mouth: { c: [1.18, 0.1, 0], r: [0.075, 0.058, 0.12], bend: 2.8, top: 0.5 },
      tooth: { c: [1.228, 0.116, 0.019], r: [0.019, 0.032, 0.018] },
    },
    palette: {
      // lighting brightens dots by up to ~1.2x, so the base lavender sits deeper than it reads
      fur: [[0.44, 0.33, 0.66], [0.53, 0.42, 0.76], [0.61, 0.5, 0.82], [0.68, 0.59, 0.86]], // muted violet -> dusty lilac
      furAccent: [0.66, 0.63, 0.8], // soft silver
      furHi: [0.74, 0.67, 0.9],
      furTip: [0.8, 0.74, 0.94],
      cream: [0.8, 0.76, 0.9], // pearl
      ivory: [0.88, 0.86, 0.95],
      blush: [1.0, 0.66, 0.8],
      pink: [1.0, 0.68, 0.78],
      pinkDeep: [0.92, 0.48, 0.64],
      earInner: [0.98, 0.62, 0.76],
      iris: [0.3, 0.16, 0.26],
      irisLight: [0.7, 0.46, 0.74],
      pupil: [0.06, 0.04, 0.07],
      sclera: [0.95, 0.94, 0.98],
      eyeRim: [0.34, 0.22, 0.4],
      mouthIn: [0.5, 0.16, 0.3],
      tongue: [1.0, 0.64, 0.76],
      tooth: [1.0, 1.0, 1.0],
    },
    regions: { blush: 0.35, cheekCream: -0.3, cheekFur: 1.6, blaze: [0.08, 0.26, 0.32], chin: 0.26, belly: [0.0, 0.3, 0.5, 0.56] },
    eye: { catch1: 0.945, catch2: 0.985, irisCos: 0.4, rim: 0.012 },
    fur: {
      len: 0.11, lay: 1.0, fluff: 18000,
      crown: { locks: 14, dots: 34, len: 0.2, fan: 1.9, lean: [0.15], mess: 0.3, curl: 0.08, spread: 0.08, offset: [0.02, -0.04] },
    },
    dots: dots(0.023),
    // calmer, curious, sweet run with a gentle head tilt and glancing eyes
    run: {
      period: 0.5, bounce: 0.06, pitch: 0.06, squash: 0.035, legAmp: 0.7, armAmp: 0.55, headLag: 0.07,
      tilt: 0.14, tiltSpeed: 0.9, tiltEvery: 4, turn: 0.08, earFlop: 0.15, earPerk: 0.25,
      cheekJiggle: 0.025, crownSway: 0.1, blinkEvery: 2.7, expressionEvery: 5.1, expression: 'squint', glance: 0.16,
    },
    orb: 'pearl',
  },

  // 03 - the golden comedy hamster: absurdly round, honey/caramel, massive cheeks, big grin, messy tuft
  golden: {
    id: 'golden',
    name: 'Golden Comedy',
    anatomy: {
      body: { c: [-0.06, -0.1, 0], r: [0.98, 0.96, 1.0] },
      belly: { c: [0.14, -0.38, 0], r: [0.82, 0.62, 0.9] },
      head: { c: [0.56, 0.42, 0], r: [0.7, 0.65, 0.72], k: 0.34 },
      cheek: { c: [0.86, 0.02, 0.44], r: [0.42, 0.36, 0.36], k: 0.26 },
      muzzle: { c: [1.16, 0.14, 0], r: [0.2, 0.16, 0.21] },
      nose: { c: [1.365, 0.225, 0], r: [0.078, 0.06, 0.085] },
      eye: { r: 0.17, dist: 0.6, azim: 35, elev: 17, look: [0.95, 0.15, 0.25] },
      ear: { c: [0.36, 1.04, 0.5], r: [0.2, 0.21, 0.065], facing: [0.5, 0.15, 0.85] },
      arm: { a: [0.66, -0.22, 0.42], b: [0.9, -0.38, 0.37], r1: 0.1, r2: 0.08 },
      paw: { c: [0.97, -0.42, 0.35], r: [0.085, 0.072, 0.083] },
      leg: { a: [-0.25, -0.5, 0.5], b: [-0.22, -1.07, 0.52], r1: 0.22, r2: 0.11 },
      foot: { c: [-0.1, -1.17, 0.52], r: [0.19, 0.07, 0.1] },
      tail: { c: [-1.08, -0.12, 0], r: [0.12, 0.1, 0.1] },
      mouth: { c: [1.265, 0.0, 0], r: [0.12, 0.105, 0.18], bend: 2.2, top: 0.5 },
      tooth: { c: [1.33, 0.03, 0.031], r: [0.03, 0.055, 0.029] },
    },
    palette: {
      fur: [[0.8, 0.5, 0.14], [0.9, 0.62, 0.2], [0.95, 0.71, 0.26], [0.98, 0.78, 0.36]], // caramel -> honey
      furAccent: [0.72, 0.44, 0.12],
      furHi: [1.0, 0.84, 0.48],
      furTip: [1.0, 0.88, 0.58],
      cream: [0.92, 0.82, 0.66],
      ivory: [0.96, 0.89, 0.77],
      blush: [1.0, 0.6, 0.56],
      pink: [1.0, 0.64, 0.66],
      pinkDeep: [0.96, 0.46, 0.52],
      earInner: [0.98, 0.56, 0.58],
      iris: [0.34, 0.18, 0.06],
      irisLight: [0.8, 0.5, 0.18],
      pupil: [0.05, 0.03, 0.02],
      sclera: [0.96, 0.95, 0.92],
      eyeRim: [0.36, 0.2, 0.08],
      mouthIn: [0.56, 0.14, 0.18],
      tongue: [1.0, 0.58, 0.62],
      tooth: [1.0, 1.0, 0.96],
    },
    regions: { blush: 0.5, cheekCream: -0.15, cheekFur: 1.5, blaze: [0.06, 0.22, 0.3], chin: 0.28, belly: [0.1, 0.35, 0.45, 0.62] },
    eye: { catch1: 0.94, catch2: 0.985, irisCos: 0.38, rim: 0.012 },
    fur: {
      len: 0.09, lay: 0.8, fluff: 15000,
      crown: { locks: 16, dots: 40, len: 0.34, fan: 2.3, lean: [-0.15], mess: 1.3, curl: 0.09, spread: 0.08, offset: [0.04, -0.05] },
    },
    dots: dots(0.025),
    // overexcited: quick feet, big belly bounce, cheek jiggle, ears and tuft flopping, surprised looks
    run: {
      period: 0.34, bounce: 0.13, pitch: 0.12, squash: 0.09, legAmp: 0.95, armAmp: 0.9, headLag: 0.14,
      tilt: 0.06, tiltSpeed: 2.1, tiltEvery: 6, turn: 0.04, earFlop: 0.3, earPerk: 0.2,
      cheekJiggle: 0.08, crownSway: 0.22, blinkEvery: 3.5, expressionEvery: 3.9, expression: 'surprise', glance: 0.08,
    },
    orb: 'honey',
  },
};

// V3 designs live in their own file; registered here so every tool and page can load them by id
Object.assign(CHARACTERS, CHARACTERS_V3);

export const CHARACTER_IDS = Object.keys(CHARACTERS);
