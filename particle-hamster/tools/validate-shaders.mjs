// Compiles the particle shaders with glslangValidator using a WebGL2-style prefix similar to
// what Three.js injects for ShaderMaterial. Needs `glslangValidator` on PATH (skips otherwise).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SHADERS } from '../src/ParticleHamster.js';
import { ORB_SHADERS } from '../src/ParticleOrb.js';
import { VOXEL_SHADERS } from '../src/VoxelHamster.js';

const VPRE = `#version 300 es
precision highp float; precision highp int;
#define attribute in
#define varying out
uniform mat4 modelMatrix; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
uniform mat4 viewMatrix; uniform mat3 normalMatrix; uniform vec3 cameraPosition;
in vec3 position; in vec3 normal;
`;
const FPRE = `#version 300 es
precision highp float; precision highp int;
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
`;
try { execFileSync('glslangValidator', ['--version'], { stdio: 'ignore' }); } catch { console.log('skip: glslangValidator not installed'); process.exit(0); }
const dir = mkdtempSync(join(tmpdir(), 'hamster-glsl-'));
const jobs = [
  ['core.vert', VPRE + SHADERS.VERTEX],
  ['fur.vert', VPRE + '#define FUR\n' + SHADERS.VERTEX],
  ['core.frag', FPRE + SHADERS.FRAGMENT],
  ['fur.frag', FPRE + '#define FUR\n' + SHADERS.FRAGMENT],
  ['glow.vert', VPRE + '#define GLOW\n' + SHADERS.VERTEX],
  ['glow.frag', FPRE + '#define GLOW\n' + SHADERS.FRAGMENT],
  ['occluder.vert', VPRE + SHADERS.OCCLUDER_VERTEX],
  ['orb.vert', VPRE + ORB_SHADERS.VERTEX],
  ['orb.frag', FPRE + ORB_SHADERS.FRAGMENT],
  ['voxel.vert', VPRE + VOXEL_SHADERS.VERTEX],
  ['voxel.frag', FPRE + VOXEL_SHADERS.FRAGMENT],
  ['voxel-shell.frag', FPRE + '#define SHELL\n' + VOXEL_SHADERS.FRAGMENT],
];
let failed = 0;
for (const [name, src] of jobs) {
  const f = join(dir, name);
  writeFileSync(f, src);
  try { execFileSync('glslangValidator', [f], { encoding: 'utf8' }); console.log(`ok   ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n${e.stdout}`); }
}
process.exit(failed ? 1 : 0);
