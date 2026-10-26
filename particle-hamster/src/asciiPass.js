// Depth-aware ASCII render of the same 3D hamster: the scene is rendered (opaque, depth-tested,
// lit) into a small target with 2x2 samples per character cell, then one full-screen pass picks
// a glyph per cell by brightness and tints it with the cell's colour. Glyphs come from an
// atlas drawn once with the system monospace font.
import * as THREE from 'three';
import { ASCII } from './shading.js';

export const ASCII_FRAGMENT = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tGlyphs;
  uniform vec2 uCells;
  uniform vec2 uCellPx;
  uniform float uGlyphCount;
  uniform vec2 uOffset; // viewport origin in device pixels (gallery sub-viewports)
  void main() {
    vec2 fc = gl_FragCoord.xy - uOffset;
    vec2 cell = floor(fc / uCellPx);
    vec2 local = fract(fc / uCellPx);
    vec3 c = vec3(0.0);
    c += texture2D(tScene, (cell + vec2(0.25, 0.25)) / uCells).rgb;
    c += texture2D(tScene, (cell + vec2(0.75, 0.25)) / uCells).rgb;
    c += texture2D(tScene, (cell + vec2(0.25, 0.75)) / uCells).rgb;
    c += texture2D(tScene, (cell + vec2(0.75, 0.75)) / uCells).rgb;
    c *= 0.25;
    // glyph density follows the lit, depth-faded luminance; colour keeps the hue
    float v = max(dot(c, vec3(0.3, 0.59, 0.11)), max(c.r, max(c.g, c.b)) * 0.75);
    // contrast curve: shadows fall to blank/'.', lit fur fills the middle, highlights reach '#%@'
    float lv = smoothstep(0.06, 0.95, v * ${ASCII.lumScale.toFixed(3)});
    float idx = floor(clamp(lv, 0.0, 0.999) * uGlyphCount);
    if (idx < 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    float g = texture2D(tGlyphs, vec2((idx + local.x) / uGlyphCount, local.y)).r;
    vec3 hue = c / max(max(c.r, max(c.g, c.b)), 1e-3);
    gl_FragColor = vec4(hue * (0.35 + 0.8 * lv) * g, 1.0);
  }
`;

function glyphAtlas(ramp, cw, ch) {
  const canvas = document.createElement('canvas');
  canvas.width = cw * ramp.length;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(ch * 0.82)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...ramp].forEach((chr, i) => ctx.fillText(chr, i * cw + cw / 2, ch / 2 + 1));
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

export class AsciiPass {
  constructor(renderer, { ramp = ASCII.ramp, cell = ASCII.cell } = {}) {
    this.renderer = renderer;
    this.cell = cell;
    this.target = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.glyphs = glyphAtlas(ramp, 64, Math.round((64 * cell[1]) / cell[0]));
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.target.texture },
        tGlyphs: { value: this.glyphs },
        uCells: { value: new THREE.Vector2(1, 1) },
        uCellPx: { value: new THREE.Vector2(...cell) },
        uGlyphCount: { value: ramp.length },
        uOffset: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: ASCII_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  /** bufferWidth/Height in device pixels */
  setSize(bufferWidth, bufferHeight, pixelRatio = 1) {
    const cw = this.cell[0] * pixelRatio, ch = this.cell[1] * pixelRatio;
    const cols = Math.ceil(bufferWidth / cw), rows = Math.ceil(bufferHeight / ch);
    this.target.setSize(cols * 2, rows * 2);
    this.material.uniforms.uCells.value.set(cols, rows);
    this.material.uniforms.uCellPx.value.set(cw, ch);
    return { cols, rows };
  }

  /**
   * @param {object} [rect] sub-viewport {x, y, w, h} in CSS px from the bottom-left (as for
   *   renderer.setViewport); omit to fill the canvas
   */
  render(scene, camera, rect) {
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null); // restores the caller's viewport/scissor
    const dpr = r.getPixelRatio();
    this.material.uniforms.uOffset.value.set(rect ? rect.x * dpr : 0, rect ? rect.y * dpr : 0);
    r.render(this.scene, this.camera);
  }

  dispose() {
    this.target.dispose();
    this.glyphs.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
