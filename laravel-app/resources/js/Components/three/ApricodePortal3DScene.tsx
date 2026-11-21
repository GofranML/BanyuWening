import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { ThreeUITopoBathymetryCanvas } from "./ThreeUITopoBathymetryCanvas";

export interface ApricodePortal3DSceneProps {
  scrollProgress: number;
  progressRef?: MutableRefObject<number>;
  paused?: boolean;
  className?: string;
  onPrewarmProgress?: (progress: number, done: boolean) => void;
}

declare global {
  interface Window {
    THREE?: any;
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

const _splineDx = new Float64Array(16);
const _splineSlope = new Float64Array(16);
const _splineTan = new Float64Array(16);

/**
 * Zero-allocation Hermite cubic spline evaluator matching story-DP2NF7b1.js camera keyframes.
 */
function sampleMonotoneSpline(keys: [number, number][], x: number): number {
  const t = clamp(x, 0, 1);
  const n = keys.length;
  for (let i = 0; i < n - 1; i++) {
    const h = Math.max(1e-5, keys[i + 1][0] - keys[i][0]);
    _splineDx[i] = h;
    _splineSlope[i] = (keys[i + 1][1] - keys[i][1]) / h;
  }
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1 || _splineSlope[i - 1] * _splineSlope[i] <= 0) {
      _splineTan[i] = 0;
    } else {
      const w1 = 2 * _splineDx[i] + _splineDx[i - 1];
      const w2 = _splineDx[i] + 2 * _splineDx[i - 1];
      _splineTan[i] = (w1 + w2) / (w1 / _splineSlope[i - 1] + w2 / _splineSlope[i]);
    }
  }
  let idx = 0;
  while (idx < n - 2 && t > keys[idx + 1][0]) idx++;
  const dx = _splineDx[idx];
  const u = clamp((t - keys[idx][0]) / dx, 0, 1);
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * keys[idx][1] +
    (u3 - 2 * u2 + u) * dx * _splineTan[idx] +
    (-2 * u3 + 3 * u2) * keys[idx + 1][1] +
    (u3 - u2) * dx * _splineTan[idx + 1]
  );
}

/**
 * Procedural Studio Light-Box IBL calibrated to BanyuWening's cool chalk (--kapur #F2EFE7)
 * and mist-aqua (--embun #8CC2BA) dual-tone studio reflections on pine-titanium plates.
 */
function createStudioEnvironment(THREE: any, renderer: any): any {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.position.y = -3.5;

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roomMat = new THREE.MeshBasicMaterial({
    color: 0x0f2321,
    side: THREE.BackSide,
  });
  const room = new THREE.Mesh(boxGeo, roomMat);
  room.position.set(-0.75, 13.2, 0.72);
  room.scale.set(32, 28, 29);
  envScene.add(room);

  const areaMats: any[] = [];
  const panels: Array<[number, number, number, number, number, number, number, number]> = [
    [-16.1, 14.37, 8.2, 0.1, 2.43, 2.74, 1.15, 0xf2efe7],
    [-16.1, 18.02, -8.2, 0.1, 2.43, 2.75, 0.78, 0x8cc2ba],
    [14.9, 12.2, -1.83, 0.15, 4.26, 6.33, 0.82, 0xf2efe7],
    [-0.46, 8.89, 14.52, 4.38, 5.44, 0.1, 0.85, 0xf2efe7],
    [-4.8, 5.2, 16.2, 6.2, 3.8, 0.1, 0.95, 0xf2efe7],
    [3.24, 11.49, -12.54, 2.5, 2.0, 0.1, 0.62, 0x8cc2ba],
    [0, 20, 0, 2.6, 0.1, 2.6, 1.15, 0xf2efe7],
  ];
  for (const [x, y, z, sx, sy, sz, intensity, tint] of panels) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(tint).multiplyScalar(intensity),
    });
    areaMats.push(mat);
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    envScene.add(mesh);
  }

  const rt = pmrem.fromScene(envScene, 0.04);
  boxGeo.dispose();
  roomMat.dispose();
  areaMats.forEach((m) => m.dispose());
  pmrem.dispose();
  return rt;
}

/**
 * Generates an in-memory seamless cumulus cloud DataTexture tinted in BanyuWening kapur (#F2EFE7)
 * & soft mist so drifting Stage 03 cloud volumes render cleanly with zero network fetches.
 */
function createCloudDataTexture(THREE: any): any {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const hash = (ix: number, iy: number) => {
    const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  };
  const vnoise = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 2 - 1;
      const v = (y / size) * 2 - 1;
      const radial = clamp(1 - Math.hypot(u * 0.92, v * 1.15), 0, 1);
      const n =
        0.55 * vnoise(x * 0.045, y * 0.045) +
        0.3 * vnoise(x * 0.095 + 4.1, y * 0.095 + 2.7) +
        0.15 * vnoise(x * 0.19 + 9.2, y * 0.19 + 7.4);
      const alpha = clamp(radial * smoothstep(0.28, 0.78, n) * 1.25, 0, 1);
      const shade = Math.round(lerp(224, 246, smoothstep(0.3, 0.8, n)));
      const idx = (y * size + x) * 4;
      data[idx] = shade;
      data[idx + 1] = Math.round(shade * 0.988);
      data[idx + 2] = Math.round(shade * 0.955);
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

interface PeriodicOctave {
  px: number;
  py: number;
  grid: Float32Array;
  amp: number;
}

function makePeriodicOctave(px: number, py: number, seed: number, amp: number): PeriodicOctave {
  const grid = new Float32Array(px * py);
  for (let y = 0; y < py; y++) {
    for (let x = 0; x < px; x++) {
      let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177)) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
      grid[y * px + x] = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
  }
  return { px, py, grid, amp };
}

function samplePeriodicOctaves(nx: number, ny: number, octs: PeriodicOctave[]): number {
  let sum = 0;
  for (let o = 0; o < octs.length; o++) {
    const { px, py, grid, amp } = octs[o];
    const gx = nx * px;
    const gy = ny * py;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const x0 = ix % px;
    const x1 = (x0 + 1) % px;
    const y0 = iy % py;
    const y1 = (y0 + 1) % py;
    const row0 = y0 * px;
    const row1 = y1 * px;
    const v00 = grid[row0 + x0];
    const v10 = grid[row0 + x1];
    const v01 = grid[row1 + x0];
    const v11 = grid[row1 + x1];
    const ix0 = v00 + (v10 - v00) * ux;
    const ix1 = v01 + (v11 - v01) * ux;
    sum += (ix0 + (ix1 - ix0) * uy) * amp;
  }
  return sum;
}

/**
 * Bakes a strictly periodic 512x512 RGBA DataTexture once during pre-warm so clouds,
 * tidal capillary ripples, and the liquid-silk vortex sample 10+ octaves with hardware
 * mipmapping + anisotropic filtering at full native DPR and zero per-frame fBM stall.
 */
function createTileableNoiseTexture(THREE: any, maxAnisotropy: number): any {
  const size = 512;
  const data = new Uint8Array(size * size * 4);

  const rOcts = [
    makePeriodicOctave(4, 4, 11, 0.5),
    makePeriodicOctave(8, 8, 13, 0.25),
    makePeriodicOctave(16, 16, 17, 0.13),
    makePeriodicOctave(32, 32, 19, 0.07),
    makePeriodicOctave(64, 64, 23, 0.05),
  ];
  const gOcts = [
    makePeriodicOctave(8, 8, 37, 0.46),
    makePeriodicOctave(16, 16, 41, 0.26),
    makePeriodicOctave(32, 32, 43, 0.15),
    makePeriodicOctave(64, 64, 47, 0.08),
    makePeriodicOctave(128, 128, 53, 0.05),
  ];
  const bOcts = [
    makePeriodicOctave(6, 6, 73, 0.52),
    makePeriodicOctave(12, 12, 79, 0.26),
    makePeriodicOctave(24, 24, 83, 0.14),
    makePeriodicOctave(48, 48, 89, 0.08),
  ];
  const aOcts = [
    makePeriodicOctave(12, 12, 131, 0.48),
    makePeriodicOctave(24, 24, 137, 0.27),
    makePeriodicOctave(48, 48, 139, 0.15),
    makePeriodicOctave(96, 96, 149, 0.1),
  ];

  for (let y = 0; y < size; y++) {
    const ny = y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.round(samplePeriodicOctaves(nx, ny, rOcts) * 255)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(samplePeriodicOctaves(nx, ny, gOcts) * 255)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round(samplePeriodicOctaves(nx, ny, bOcts) * 255)));
      data[idx + 3] = Math.min(255, Math.max(0, Math.round(samplePeriodicOctaves(nx, ny, aOcts) * 255)));
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.min(8, maxAnisotropy || 1);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Bakes a 4-map seamless 512x512 forged + anisotropic brushed titanium PBR texture suite
 * (darkAlbedoMap, kapurAlbedoMap, roughnessMap, tangent-space normalMap) once during pre-warm
 * for rich tactile metallic grain at full 60 FPS with zero per-pixel static speckles.
 */
function createBrushedMetalTextures(
  THREE: any,
  maxAnisotropy: number
): {
  darkAlbedoMap: any;
  kapurAlbedoMap: any;
  roughnessMap: any;
  normalMap: any;
} {
  const size = 512;
  const mask = size - 1;
  const count = size * size;

  const patinaOcts = [
    makePeriodicOctave(3, 3, 211, 0.46),
    makePeriodicOctave(6, 6, 223, 0.28),
    makePeriodicOctave(12, 12, 227, 0.16),
    makePeriodicOctave(24, 24, 229, 0.1),
  ];
  const brushOcts = [
    makePeriodicOctave(4, 48, 307, 0.45),
    makePeriodicOctave(8, 96, 311, 0.33),
    makePeriodicOctave(16, 192, 313, 0.22),
  ];
  const grainOcts = [
    makePeriodicOctave(24, 24, 401, 0.5),
    makePeriodicOctave(48, 48, 409, 0.32),
    makePeriodicOctave(96, 96, 419, 0.18),
  ];

  const patinaArr = new Float32Array(count);
  const brushArr = new Float32Array(count);
  const grainArr = new Float32Array(count);
  const heightArr = new Float32Array(count);

  for (let y = 0; y < size; y++) {
    const ny = y / size;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const idx = row + x;
      const p = samplePeriodicOctaves(nx, ny, patinaOcts);
      const b = samplePeriodicOctaves(nx, ny, brushOcts);
      const g = samplePeriodicOctaves(nx, ny, grainOcts);
      patinaArr[idx] = p;
      brushArr[idx] = b;
      grainArr[idx] = g;
      heightArr[idx] = p * 0.36 + b * 0.46 + g * 0.18;
    }
  }

  const normalData = new Uint8Array(count * 4);
  const roughData = new Uint8Array(count * 4);
  const darkData = new Uint8Array(count * 4);
  const kapurData = new Uint8Array(count * 4);

  for (let y = 0; y < size; y++) {
    const row = y * size;
    const rowUp = ((y + mask) & mask) * size;
    const rowDn = ((y + 1) & mask) * size;
    for (let x = 0; x < size; x++) {
      const i = row + x;
      const xL = (x + mask) & mask;
      const xR = (x + 1) & mask;
      const out = i * 4;

      const dx = (heightArr[row + xR] - heightArr[row + xL]) * 3.8;
      const dy = (heightArr[rowDn + x] - heightArr[rowUp + x]) * 3.8;
      const invLen = 1 / Math.hypot(-dx, -dy, 1.0);
      normalData[out] = Math.round(((-dx * invLen) * 0.5 + 0.5) * 255);
      normalData[out + 1] = Math.round(((-dy * invLen) * 0.5 + 0.5) * 255);
      normalData[out + 2] = Math.round(((1.0 * invLen) * 0.5 + 0.5) * 255);
      normalData[out + 3] = 255;

      const pat = patinaArr[i];
      const br = brushArr[i];
      const gr = grainArr[i];

      const rVal = clamp(0.46 - br * 0.22 + (pat - 0.5) * 0.26 + (gr - 0.5) * 0.08, 0.2, 0.6);
      const rv = Math.round(rVal * 255);
      roughData[out] = rv;
      roughData[out + 1] = rv;
      roughData[out + 2] = rv;
      roughData[out + 3] = 255;

      const t = clamp(pat * 0.52 + br * 0.36 + gr * 0.12, 0, 1);
      let dR: number;
      let dG: number;
      let dB: number;
      if (t < 0.5) {
        const u = t * 2;
        dR = lerp(18, 34, u);
        dG = lerp(41, 70, u);
        dB = lerp(38, 65, u);
      } else {
        const u = (t - 0.5) * 2;
        dR = lerp(34, 64, u);
        dG = lerp(70, 108, u);
        dB = lerp(65, 100, u);
      }
      const warmLift = pat * br;
      darkData[out] = Math.min(255, Math.round(dR + warmLift * 8));
      darkData[out + 1] = Math.min(255, Math.round(dG + warmLift * 6));
      darkData[out + 2] = Math.min(255, Math.round(dB + warmLift * 2));
      darkData[out + 3] = 255;

      const tk = clamp(pat * 0.44 + br * 0.44 + gr * 0.12, 0, 1);
      let kR: number;
      let kG: number;
      let kB: number;
      if (tk < 0.5) {
        const u = tk * 2;
        kR = lerp(184, 220, u);
        kG = lerp(177, 213, u);
        kB = lerp(162, 197, u);
      } else {
        const u = (tk - 0.5) * 2;
        kR = lerp(220, 245, u);
        kG = lerp(213, 241, u);
        kB = lerp(197, 232, u);
      }
      kapurData[out] = Math.round(kR);
      kapurData[out + 1] = Math.round(kG);
      kapurData[out + 2] = Math.round(kB);
      kapurData[out + 3] = 255;
    }
  }

  const makeTex = (buf: Uint8Array, isSrgb: boolean) => {
    const tex = new THREE.DataTexture(buf, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.55, 0.55);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = Math.min(8, maxAnisotropy || 1);
    if (isSrgb) {
      tex.encoding = THREE.sRGBEncoding;
    }
    tex.needsUpdate = true;
    return tex;
  };

  return {
    darkAlbedoMap: makeTex(darkData, true),
    kapurAlbedoMap: makeTex(kapurData, true),
    roughnessMap: makeTex(roughData, false),
    normalMap: makeTex(normalData, false),
  };
}

/**
 * Builds the 3D extruded BanyuWening "B" logogram geometry directly from /brand/logogram.svg:
 * - Upper solid D-arch ("B" upper loop)
 * - 6 wave-sliced lower arch bars representing flowing clear water ("Banyu Wening")
 */
function buildBanyuWeningTopShape(THREE: any, scale = 0.0145) {
  const cx = 46;
  const cy = 62;
  const toPt = (x: number, y: number) => [(x - cx) * scale, (cy - y) * scale];
  const outer = new THREE.Shape();
  const [x0, y0] = toPt(0, 0);
  outer.moveTo(x0, y0);
  const [x1, y1] = toPt(61, 0);
  outer.lineTo(x1, y1);
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * Math.PI;
    const px = 61 + Math.cos(a) * 31;
    const py = 30 + Math.sin(a) * 30;
    const [vx, vy] = toPt(px, py);
    outer.lineTo(vx, vy);
  }
  const [x2, y2] = toPt(0, 60);
  outer.lineTo(x2, y2);
  outer.closePath();

  const hole = new THREE.Path();
  const [hx0, hy0] = toPt(22, 19);
  hole.moveTo(hx0, hy0);
  const [hx1, hy1] = toPt(61, 19);
  hole.lineTo(hx1, hy1);
  for (let i = 0; i <= 18; i++) {
    const a = -Math.PI / 2 + (i / 18) * Math.PI;
    const px = 61 + Math.cos(a) * 11;
    const py = 30 + Math.sin(a) * 11;
    const [vx, vy] = toPt(px, py);
    hole.lineTo(vx, vy);
  }
  const [hx2, hy2] = toPt(22, 41);
  hole.lineTo(hx2, hy2);
  hole.closePath();
  outer.holes.push(hole);
  return outer;
}

function buildBanyuWeningWaveSlices(THREE: any, scale = 0.0145) {
  const cx = 46;
  const cy = 62;
  const bands: Array<{ y0: number; y1: number; ox: number }> = [
    { y0: 64, y1: 72.5, ox: 0.0 },
    { y0: 76.5, y1: 84.0, ox: 2.2 },
    { y0: 88.0, y1: 94.2, ox: -1.4 },
    { y0: 98.2, y1: 103.5, ox: 1.6 },
    { y0: 107.2, y1: 111.4, ox: -0.8 },
    { y0: 115.2, y1: 118.4, ox: 0.9 },
  ];
  const rect = (xL: number, xR: number, yT: number, yB: number, ox: number) => {
    const s = new THREE.Shape();
    s.moveTo((xL + ox - cx) * scale, (cy - yT) * scale);
    s.lineTo((xR + ox - cx) * scale, (cy - yT) * scale);
    s.lineTo((xR + ox - cx) * scale, (cy - yB) * scale);
    s.lineTo((xL + ox - cx) * scale, (cy - yB) * scale);
    s.closePath();
    return s;
  };
  return bands.map(({ y0, y1, ox }) => {
    const ym = (y0 + y1) * 0.5;
    const dyO = Math.min(1, Math.abs(ym - 94) / 30);
    const outerR = 61 + 31 * Math.sqrt(Math.max(0, 1 - dyO * dyO));
    if (ym > 83 && ym < 105) {
      const dyI = Math.min(1, Math.abs(ym - 94) / 11);
      const innerR = 61 + 11 * Math.sqrt(Math.max(0, 1 - dyI * dyI));
      return { shapes: [rect(0, 22, y0, y1, ox), rect(innerR, outerR, y0, y1, ox)], baseOffset: ox * scale };
    }
    return { shapes: [rect(0, outerR, y0, y1, ox)], baseOffset: ox * scale };
  });
}

/**
 * Builds an articulated 3D Catfish (Ikan Lele) with sculpted flattened snout,
 * 4 sweeping barbels ("kumis lele"), pectoral fins, and multi-segment undulating spine & tail.
 */
function createArticulatedCatfish(THREE: any, mats: { body: any; belly: any; fin: any; eye: any }, scale = 1) {
  const root = new THREE.Group();
  root.scale.setScalar(scale);

  // Flattened sleek catfish head & torso hub (+Z forward swimming axis)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), mats.body);
  head.scale.set(1.22, 0.62, 1.45);
  head.position.set(0, 0, 0.14);
  root.add(head);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 10), mats.belly);
  belly.scale.set(1.12, 0.42, 1.45);
  belly.position.set(0, -0.025, 0.04);
  root.add(belly);

  // Characteristic catfish eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), mats.eye);
    eye.position.set(side * 0.082, 0.028, 0.22);
    root.add(eye);
  }

  // 4 Signature Whisker Barbels ("Kumis Lele")
  const barbelSpecs = [
    { side: 1, len: 0.26, yOff: 0.0, zOff: 0.28 },
    { side: -1, len: 0.26, yOff: 0.0, zOff: 0.28 },
    { side: 1, len: 0.17, yOff: -0.02, zOff: 0.25 },
    { side: -1, len: 0.17, yOff: -0.02, zOff: 0.25 },
  ];
  for (const b of barbelSpecs) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(b.side * 0.06, b.yOff, b.zOff),
      new THREE.Vector3(b.side * 0.16, b.yOff - 0.02, b.zOff + 0.05),
      new THREE.Vector3(b.side * (0.14 + b.len * 0.55), b.yOff - 0.04, b.zOff - 0.08),
    ]);
    const barbelMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.0065, 5, false), mats.fin);
    root.add(barbelMesh);
  }

  // Pectoral fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.quadraticCurveTo(0.14, 0.04, 0.16, -0.08);
  finShape.quadraticCurveTo(0.06, -0.1, 0, -0.03);
  const finGeo = new THREE.ShapeGeometry(finShape, 8);
  const pectoralL = new THREE.Mesh(finGeo, mats.fin);
  pectoralL.rotation.set(Math.PI / 2 - 0.18, 0, Math.PI - 0.25);
  pectoralL.position.set(-0.095, -0.02, 0.09);
  const pectoralR = new THREE.Mesh(finGeo, mats.fin);
  pectoralR.rotation.set(Math.PI / 2 - 0.18, 0, 0.25);
  pectoralR.position.set(0.095, -0.02, 0.09);
  root.add(pectoralL, pectoralR);

  // Articulated spine segments + dorsal crest + caudal tail fin
  const seg1 = new THREE.Group();
  seg1.position.set(0, 0, -0.02);
  root.add(seg1);
  const mid1 = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.095, 0.22, 14), mats.body);
  mid1.rotation.x = Math.PI / 2;
  mid1.scale.set(1.02, 1.0, 0.72);
  mid1.position.z = -0.11;
  seg1.add(mid1);

  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.34), mats.fin);
  dorsal.position.set(0, 0.065, -0.14);
  seg1.add(dorsal);

  const seg2 = new THREE.Group();
  seg2.position.set(0, 0, -0.2);
  seg1.add(seg2);
  const mid2 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.072, 0.2, 14), mats.body);
  mid2.rotation.x = Math.PI / 2;
  mid2.scale.set(0.85, 1.0, 0.78);
  mid2.position.z = -0.09;
  seg2.add(mid2);

  const seg3 = new THREE.Group();
  seg3.position.set(0, 0, -0.18);
  seg2.add(seg3);
  const tailStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.042, 0.14, 12), mats.body);
  tailStem.rotation.x = Math.PI / 2;
  tailStem.position.z = -0.06;
  seg3.add(tailStem);

  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.quadraticCurveTo(0.07, 0.095, 0.17, 0.075);
  tailShape.quadraticCurveTo(0.19, 0, 0.17, -0.075);
  tailShape.quadraticCurveTo(0.07, -0.095, 0, 0);
  const tailGeo = new THREE.ShapeGeometry(tailShape, 10);
  tailGeo.rotateY(Math.PI / 2);
  const tailFin = new THREE.Mesh(tailGeo, mats.fin);
  tailFin.position.set(0, 0, -0.11);
  seg3.add(tailFin);

  return { root, seg1, seg2, seg3, pectoralL, pectoralR };
}

/**
 * Scroll-driven 3D experience adapting brief/asset referensi to BanyuWening:
 * - RoomEnvironment PMREM studio reflections
 * - 40 continuous sculpted titanium & smoked glass lamellae with champagne seam inlays
 * - 360-degree volumetric storm sky + wet tidal ground with basalt rock islands
 * - Stage 03 Bio-Pond Conservatory: 3 elliptical limestone terraces with self-drawing aqua-bronze
 *   floor inlays, 6 swept ceramic ribs, crystal acrylic bio-pond with 5 articulated cursor-reactive
 *   swimming catfish (ikan lele), PVC stilling-well & 4 sensor probes, IP65 Core Hub OLED display,
 *   rising micro-aeration bubbles, and 3D extruded BanyuWening "B" Wave Logogram inside orbital rings.
 */
export function ApricodePortal3DScene({
  scrollProgress,
  progressRef: externalProgressRef,
  paused = false,
  className = "",
  onPrewarmProgress,
}: ApricodePortal3DSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localProgressRef = useRef(scrollProgress);
  const externalProgressRefHolder = useRef(externalProgressRef);
  const pausedRef = useRef(paused);
  const prewarmCallbackRef = useRef(onPrewarmProgress);

  localProgressRef.current = scrollProgress;
  externalProgressRefHolder.current = externalProgressRef;
  pausedRef.current = paused;
  prewarmCallbackRef.current = onPrewarmProgress;

  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const THREE = typeof window !== "undefined" ? window.THREE : undefined;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!THREE || !host || !canvas) {
      setFallback(true);
      prewarmCallbackRef.current?.(1, true);
      return undefined;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setFallback(true);
      prewarmCallbackRef.current?.(1, true);
      return undefined;
    }

    prewarmCallbackRef.current?.(0.18, false);

    const dprCap = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dprCap);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;

    const scene = new THREE.Scene();
    const darkHorizonColor = new THREE.Color(0x112423);
    const lightCourtColor = new THREE.Color(0xf2efe7);
    const workingBgColor = darkHorizonColor.clone();
    scene.background = workingBgColor;

    const studioEnvRT = createStudioEnvironment(THREE, renderer);
    scene.environment = studioEnvRT.texture;
    const cloudDataTex = createCloudDataTexture(THREE);
    const maxAniso = renderer.capabilities?.getMaxAnisotropy?.() || 1;
    const tileableNoiseTex = createTileableNoiseTexture(THREE, maxAniso);
    const brushedMaps = createBrushedMetalTextures(THREE, maxAniso);

    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const initMobile = width < 761;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.08, 420);

    // Dual-tone warm Kapur (#F2EFE7) & mist-aqua (#8CC2BA) studio lighting calibrated for r149
    const hemiLight = new THREE.HemisphereLight(0xf2efe7, 0x132220, 0.44);
    scene.add(hemiLight);

    const sunKeyLight = new THREE.DirectionalLight(0xf2efe7, 1.38);
    sunKeyLight.position.set(-10, 15, 9);
    scene.add(sunKeyLight, sunKeyLight.target);

    const flankRimLight = new THREE.DirectionalLight(0x8cc2ba, 0.78);
    flankRimLight.position.set(9, 6, -12);
    scene.add(flankRimLight);

    const bounceFillLight = new THREE.DirectionalLight(0x8e9994, 0.3);
    bounceFillLight.position.set(-4, -1, 13);
    scene.add(bounceFillLight);

    const observatoryKeyLight = new THREE.DirectionalLight(0xf2efe7, 0);
    observatoryKeyLight.position.set(11, 7, -54);
    observatoryKeyLight.target.position.set(3, -1.5, -48);
    scene.add(observatoryKeyLight, observatoryKeyLight.target);

    const passageGlowLight = new THREE.PointLight(0x8cc2ba, 0, 22, 2);
    scene.add(passageGlowLight);

    const exitLight = new THREE.PointLight(0xf2efe7, 0, 55, 2);
    exitLight.position.set(0, 0, -40);
    scene.add(exitLight);

    const contactPointLight = new THREE.PointLight(0x8cc2ba, 0, 9, 2);
    scene.add(contactPointLight);

    const FLOOR_Y = -3.585;

    const glslNoiseLib = `
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm2(vec2 p) {
        float v = 0.667 * vnoise(p);
        p = mat2(0.84, -0.54, 0.54, 0.84) * p * 2.04 + vec2(13.1, 7.7);
        v += 0.333 * vnoise(p);
        return v;
      }

      float fbm3(vec2 p) {
        float v = 0.0;
        float amp = 0.54;
        mat2 rot = mat2(0.84, -0.54, 0.54, 0.84);
        for (int i = 0; i < 3; i++) {
          v += amp * vnoise(p);
          p = rot * p * 2.04 + vec2(13.1, 7.7);
          amp *= 0.5;
        }
        return v;
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float amp = 0.5;
        mat2 rot = mat2(0.84, -0.54, 0.54, 0.84);
        for (int i = 0; i < 5; i++) {
          v += amp * vnoise(p);
          p = rot * p * 2.04 + vec2(13.1, 7.7);
          amp *= 0.5;
        }
        return v;
      }
    `;

    const glslLiquidSilkLib = `
      vec2 vortexWarp(vec2 p, float time, float charge, float openAmt, float baseWind) {
        vec2 q = p / vec2(1.92, 2.8);
        float radius = length(q);
        float winding = (baseWind + charge * 0.85 + charge * charge * 1.15) * 3.14159265 + openAmt * 0.65;
        float irregular = sin(q.y * 3.1 + time * 0.15) * sin(q.x * 2.3 - time * 0.12) * 0.15;
        float angle = winding * (0.18 + (1.0 - smoothstep(0.0, 1.38, radius))) + irregular + time * 0.10;
        float c = cos(angle);
        float s = sin(angle);
        return (mat2(c, -s, s, c) * q) * vec2(1.92, 2.8);
      }

      vec4 silkSample(vec2 vp, float time, float charge) {
        vec2 uv1 = vp * vec2(0.095, 0.072) + vec2(time * 0.008, -time * 0.010);
        vec4 s1 = texture2D(uNoiseTex, uv1);
        float broad = s1.r;
        vec2 uv2 = vp * 0.165 + vec2(-time * 0.009, time * 0.008) + vec2(broad * 0.24, -s1.b * 0.18);
        vec4 s2 = texture2D(uNoiseTex, uv2);
        float fold = s2.g * 0.65 + s2.a * 0.35;
        float micro = texture2D(uNoiseTex, vp * 0.34 + vec2(fold * 0.15, -time * 0.012)).a;

        float phase = mix(vp.x * 2.7 + vp.y * 0.95, vp.x * 4.1 + vp.y * 0.30, charge)
                    + broad * mix(4.6, 2.5, charge)
                    + fold * 1.45
                    + micro * 0.22
                    - time * 0.28;
        float h = sin(phase) * 0.50 + sin(phase * 2.0 + fold * 1.8) * 0.22 + broad * 0.28 + micro * 0.06;
        float ridge = abs(sin(phase));
        float filament = exp(-ridge * ridge * mix(190.0, 270.0, charge));
        float companion = exp(-pow(abs(sin(phase + 0.24 + fold * 0.16)), 2.0) * 520.0);
        float ribbon = exp(-ridge * ridge * 4.2);
        return vec4(h, filament * 0.85 + companion * 0.30, ribbon, broad);
      }

      vec3 shadeLiquidSilk(vec2 p, float time, float charge, float openAmt, float baseWind, float vortexMode) {
        vec2 q = p / vec2(1.92, 2.8);
        float eps = 0.075;
        vec2 vpC = vortexWarp(p, time, charge, openAmt, baseWind);
        vec2 vpX = vortexWarp(p + vec2(eps, 0.0), time, charge, openAmt, baseWind);
        vec2 vpY = vortexWarp(p + vec2(0.0, eps), time, charge, openAmt, baseWind);

        vec4 sC = silkSample(vpC, time, charge);
        vec4 sX = silkSample(vpX, time, charge);
        vec4 sY = silkSample(vpY, time, charge);

        vec3 N = normalize(vec3((sC.x - sX.x) * 3.2, (sC.x - sY.x) * 3.2, 1.0));
        vec3 V = vec3(0.0, 0.0, 1.0);
        vec3 L1 = normalize(vec3(-0.45, 0.65, 0.75));
        vec3 L2 = normalize(vec3(0.55, -0.35, 0.72));
        vec3 H1 = normalize(L1 + V);
        vec3 H2 = normalize(L2 + V);

        float spec1 = pow(max(dot(N, H1), 0.0), 26.0);
        float spec2 = pow(max(dot(N, H2), 0.0), 14.0);
        float satin = pow(clamp(1.0 - max(dot(N, V), 0.0), 0.0, 1.0), 2.2);

        vec3 malam = vec3(0.035, 0.078, 0.075);
        vec3 ink = vec3(0.082, 0.195, 0.184);
        vec3 banyu = vec3(0.180, 0.410, 0.380);
        vec3 embun = vec3(0.549, 0.761, 0.729);
        vec3 kapur = vec3(0.960, 0.945, 0.902);

        float foldMask = clamp(0.42 + sC.x * 0.48 + sC.z * 0.25, 0.0, 1.0);
        vec3 col = mix(malam, ink, foldMask);
        col = mix(col, banyu, sC.z * (0.45 + 0.35 * sC.w));
        col += mix(banyu, embun, 0.65) * (satin * 0.48 + spec2 * 0.34);
        col += mix(embun, kapur, 0.82) * (spec1 * 0.82 + sC.y * (0.62 + 0.38 * charge));

        if (vortexMode > 0.5) {
          float eddy = exp(-length(q * vec2(1.15, 0.92)) * 3.1);
          col += mix(embun, kapur, 0.68) * eddy * (0.28 + 0.32 * sC.w);
        }

        vec2 edgeD = abs(q) - vec2(0.86, 0.88);
        float frameDist = length(max(edgeD, 0.0)) + min(max(edgeD.x, edgeD.y), 0.0);
        float innerFrameRim = exp(-abs(frameDist) * 28.0);
        col += mix(embun, kapur, 0.55) * innerFrameRim * 0.24;

        return col;
      }
    `;

    // -------------------------------------------------------------------------
    // 1. 360-DEGREE SEAMLESS VOLUMETRIC SKY DOME (KAPUR HORIZON + PINE CANOPY)
    // -------------------------------------------------------------------------
    const skyUniforms = {
      uTime: { value: 0 },
      uBeyondMix: { value: 0 },
      uCamPos: { value: new THREE.Vector3(8.8, 1.5, 17.3) },
      uNoiseTex: { value: tileableNoiseTex },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBeyondMix;
        uniform vec3 uCamPos;
        uniform sampler2D uNoiseTex;
        varying vec3 vWorldPos;
        ${glslNoiseLib}

        float sampleCloud(vec2 uv) {
          vec2 w = texture2D(uNoiseTex, uv * 0.22 + vec2(uTime * 0.003, 0.0)).rg - 0.5;
          vec4 n1 = texture2D(uNoiseTex, uv * vec2(0.36, 0.68) + w * 0.14 - vec2(uTime * 0.0055, 0.0));
          vec4 n2 = texture2D(uNoiseTex, uv * vec2(0.88, 1.55) - w * 0.08 + vec2(uTime * 0.008, 0.23));
          return n1.r * 0.62 + n1.g * 0.24 + n2.g * 0.14;
        }

        void main() {
          vec3 ray = normalize(vWorldPos - vec3(uCamPos.x, 0.0, uCamPos.z));
          float h = clamp(asin(clamp(ray.y, -0.25, 1.0)) / 1.15 + 0.06, 0.0, 1.0);
          float sx = atan(ray.x, -ray.z) * 0.62;
          float bMix = clamp(uBeyondMix, 0.0, 1.0);

          vec3 skyCol = vec3(0.0);
          if (bMix < 0.995) {
            // Stage 01 Warm Sunlit Kapur Horizon + Deep Pine-Slate Storm Canopy & God-Rays
            vec3 horizonMist = vec3(0.865, 0.845, 0.798);
            vec3 midSky = vec3(0.215, 0.258, 0.254);
            vec3 topStorm = vec3(0.072, 0.120, 0.118);

            skyCol = mix(horizonMist, midSky, smoothstep(0.0, 0.28, h));
            skyCol = mix(skyCol, topStorm, smoothstep(0.28, 0.92, h));

            vec2 cloudUv = vec2(sx * 1.75, h * 1.65);
            float cDense = sampleCloud(cloudUv);
            float cFine = texture2D(uNoiseTex, cloudUv * vec2(0.75, 1.25) + vec2(uTime * 0.006, 0.13)).a;
            float cloudVal = mix(cDense, cFine, 0.32);
            float skyMask = smoothstep(0.03, 0.26, h);

            vec2 sunCenter = vec2(-0.14, 0.52);
            float dSun = length((vec2(sx, h) - sunCenter) * vec2(0.85, 1.45));
            float sunGlow = exp(-dSun * 2.8);

            vec3 darkCloud = vec3(0.105, 0.148, 0.146);
            vec3 litCloud = vec3(0.650, 0.635, 0.595);
            vec3 kapurRim = vec3(0.955, 0.942, 0.910);

            float rimBand = smoothstep(0.34, 0.54, cloudVal) * (1.0 - smoothstep(0.56, 0.78, cloudVal));
            vec3 cloudCol = mix(darkCloud, litCloud, smoothstep(0.28, 0.72, cloudVal) * (0.45 + 0.55 * sunGlow));
            cloudCol += kapurRim * rimBand * (0.42 + 0.62 * sunGlow);
            skyCol = mix(skyCol, cloudCol, smoothstep(0.26, 0.82, cloudVal) * skyMask);

            vec2 fromSun = vec2(sx, h) - vec2(-0.26, 0.92);
            float rayCoord = dot(fromSun, vec2(0.76, 0.65));
            float raySpread = 1.0 - smoothstep(0.0, 1.05, abs(rayCoord));
            float streakNoise = texture2D(uNoiseTex, vec2(rayCoord * 0.95 + sx * 0.18, h * 0.09 - sx * 0.06)).g;
            float streakFine = sin(rayCoord * 26.0 + streakNoise * 3.2) * 0.5 + 0.5;

            float occ = 0.0;
            for (int i = 1; i <= 4; i++) {
              float fi = float(i) * 0.13;
              vec2 sp = mix(vec2(sx, h), sunCenter, fi);
              float sc = sampleCloud(vec2(sp.x * 1.75, clamp(sp.y, 0.02, 1.0) * 1.65));
              occ += 1.0 - smoothstep(0.38, 0.74, sc);
            }
            occ *= 0.25;

            float godRays = raySpread * mix(0.42, 1.0, streakNoise) * mix(0.55, 1.0, streakFine) * (0.35 + 0.65 * occ);
            godRays *= smoothstep(0.01, 0.20, h) * (1.0 - smoothstep(0.65, 1.0, h * 0.9));
            skyCol += vec3(0.95, 0.93, 0.88) * godRays * 0.42;

            float horizonBand = exp(-h * 11.5);
            skyCol = mix(skyCol, vec3(0.905, 0.888, 0.842), horizonBand * (0.62 + 0.32 * sunGlow));
          }

          vec3 daySky = vec3(0.949, 0.937, 0.906);
          if (bMix > 0.005) {
            // Stage 03 Sunlit Observatory Panorama (warm --kapur #F2EFE7 + --garis #D9D4C7)
            vec3 daySkyLow = vec3(0.949, 0.937, 0.906);
            vec3 daySkyHigh = vec3(0.875, 0.855, 0.808);
            daySky = mix(daySkyLow, daySkyHigh, smoothstep(0.08, 0.88, h));

            float daySun = exp(-length((vec2(sx, h) - vec2(-0.16, 0.62)) * vec2(0.85, 1.45)) * 2.4);
            daySky += vec3(0.045, 0.042, 0.032) * daySun;

            float hiCloud = fbm2(vec2(sx * 2.2 - uTime * 0.004, h * 3.8));
            daySky = mix(daySky, vec3(0.962, 0.950, 0.920), smoothstep(0.42, 0.76, hiCloud) * 0.62 * smoothstep(0.20, 0.56, h));

            float spire1 = (1.0 - smoothstep(0.0, 0.026, abs(sx + 0.28))) * smoothstep(0.58, 0.54, h);
            float spire2 = (1.0 - smoothstep(0.0, 0.036, abs(sx + 0.38))) * smoothstep(0.46, 0.43, h);
            float sweepButtress = (1.0 - smoothstep(0.0, 0.048, abs(sx + 0.34 - (0.38 - h) * 0.42))) * smoothstep(0.54, 0.50, h);
            float towerBlock = smoothstep(-0.16, -0.22, sx) * (1.0 - smoothstep(-0.46, -0.52, sx)) * (1.0 - smoothstep(0.28, 0.33, h));
            float leftCitadel = clamp(max(max(max(spire1, spire2), sweepButtress), towerBlock * 0.8), 0.0, 1.0);

            float bridgeDeck = smoothstep(0.22, 0.232, h) * (1.0 - smoothstep(0.252, 0.264, h));
            float bridgeSpan = smoothstep(-0.56, -0.50, sx) * (1.0 - smoothstep(0.02, 0.08, sx));
            float archPillar = smoothstep(0.64, 0.86, abs(sin((sx + 0.52) * 34.0))) * (1.0 - smoothstep(0.22, 0.24, h)) * smoothstep(0.11, 0.14, h);
            float viaduct = max(bridgeDeck, archPillar) * bridgeSpan;

            vec3 archStoneShadow = vec3(0.56, 0.545, 0.505);
            vec3 archStoneLit = vec3(0.925, 0.910, 0.870);
            vec3 archStone = mix(archStoneShadow, archStoneLit, 0.3 + 0.7 * daySun);
            daySky = mix(daySky, archStone, clamp(max(leftCitadel * 0.78, viaduct * 0.82), 0.0, 1.0) * smoothstep(0.07, 0.14, h));

            float wf1 = exp(-pow((sx + 0.33) / 0.015, 2.0)) * smoothstep(0.36, 0.32, h) * smoothstep(0.09, 0.16, h);
            float wf2 = exp(-pow((sx + 0.21) / 0.011, 2.0)) * smoothstep(0.24, 0.22, h) * smoothstep(0.08, 0.14, h);
            float wfNoise = fbm2(vec2(sx * 42.0, h * 15.0 + uTime * 0.72));
            float waterfall = clamp((wf1 + wf2 * 0.85) * (0.58 + 0.65 * wfNoise), 0.0, 1.0);
            daySky = mix(daySky, vec3(0.96, 0.948, 0.918), waterfall * 0.85);

            float seaShape = 0.09 + fbm2(vec2(sx * 2.8 + uTime * 0.005, 1.9)) * 0.11 + fbm2(vec2(sx * 7.2 - uTime * 0.009, 4.4)) * 0.04;
            float inCloudSea = 1.0 - smoothstep(seaShape - 0.04, seaShape + 0.03, h);
            float cloudPuff = fbm2(vec2(sx * 5.0, (h / max(0.04, seaShape)) * 3.0) + vec2(uTime * 0.006, 0.0));
            vec3 seaShadow = vec3(0.835, 0.816, 0.768);
            vec3 seaCrest = vec3(0.955, 0.943, 0.912);
            vec3 cloudSeaCol = mix(seaShadow, seaCrest, smoothstep(0.28, 0.72, cloudPuff) * smoothstep(0.02, 0.16, h + 0.05));
            daySky = mix(daySky, cloudSeaCol, inCloudSea * 0.95);
          }

          vec3 finalCol = mix(skyCol, daySky, bMix);
          gl_FragColor = vec4(finalCol, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(280, 48, 32), skyMat);
    skyDome.renderOrder = -1000;
    scene.add(skyDome);

    // -------------------------------------------------------------------------
    // 2. WET TIDAL-FLAT FLOOR (STAGE 01/02) + 3 LOW BASALT ROCK ISLANDS
    // -------------------------------------------------------------------------
    const exteriorGroup = new THREE.Group();
    exteriorGroup.name = "Exterior / mineral foreground";
    scene.add(exteriorGroup);

    const floorUniforms = {
      uTime: { value: 0 },
      uBeyondMix: { value: 0 },
      uActivation: { value: 1 },
      uCamPos: { value: new THREE.Vector3(8.8, 1.5, 17.3) },
      uPortalXZ: { value: new THREE.Vector2(4.45, 0) },
      uNoiseTex: { value: tileableNoiseTex },
    };
    const tidalFloorMat = new THREE.ShaderMaterial({
      uniforms: floorUniforms,
      transparent: true,
      depthWrite: true,
      fog: false,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBeyondMix;
        uniform float uActivation;
        uniform vec3 uCamPos;
        uniform vec2 uPortalXZ;
        uniform sampler2D uNoiseTex;
        varying vec3 vWorldPos;
        ${glslNoiseLib}

        float rippleHeight(vec2 xz, float mud) {
          float puddle = smoothstep(0.30, 0.65, mud);
          vec4 t1 = texture2D(uNoiseTex, xz * vec2(0.042, 0.105) + vec2(uTime * 0.008, -uTime * 0.006));
          vec4 t2 = texture2D(uNoiseTex, xz * vec2(0.125, 0.295) - vec2(uTime * 0.013, uTime * 0.009));
          vec4 t3 = texture2D(uNoiseTex, xz * vec2(0.32, 0.72) + vec2(uTime * 0.018, uTime * 0.014));
          float swell = sin(xz.y * 4.2 + t1.r * 5.5 + t2.b * 2.8 + uTime * 0.45) * 0.075;
          float mudRelief = t1.r * 0.58 + t2.g * 0.26 + t3.a * 0.16;
          float waterRipples = t1.g * 0.44 + t2.a * 0.34 + t3.g * 0.22 + swell;
          return mix(mudRelief, waterRipples, puddle);
        }

        void main() {
          float alphaFade = 1.0 - smoothstep(0.15, 0.85, uBeyondMix);
          if (alphaFade < 0.01) discard;

          vec2 xz = vWorldPos.xz;
          float dist = length(xz - vec2(0.0, 8.0));
          float eps = 0.055 + dist * 0.0022;
          float mudMask = texture2D(uNoiseTex, xz * 0.016 + vec2(0.21, -0.14)).r;
          float hC = rippleHeight(xz, mudMask);
          float hX = rippleHeight(xz + vec2(eps, 0.0), mudMask);
          float hZ = rippleHeight(xz + vec2(0.0, eps), mudMask);
          float bumpStrength = mix(0.36, 0.06, smoothstep(8.0, 58.0, dist));
          vec3 N = normalize(vec3((hC - hX) * bumpStrength / eps * 0.22, 1.0, (hC - hZ) * bumpStrength / eps * 0.22));

          vec3 V = normalize(uCamPos - vWorldPos);
          vec3 R = reflect(-V, N);
          float ndotv = clamp(dot(N, V), 0.0, 1.0);
          float fresnel = 0.08 + 0.92 * pow(1.0 - ndotv, 3.2);

          float wetChannel = smoothstep(0.34, 0.68, mudMask);
          float cloudShadow = 0.95 + 0.05 * sin(xz.x * 0.075 + xz.y * 0.045 + uTime * 0.045);
          vec3 slateDark = mix(vec3(0.040, 0.064, 0.064), vec3(0.115, 0.142, 0.138), smoothstep(0.22, 0.78, hC)) * cloudShadow;

          float rHorizon = clamp(R.y * 2.2, 0.0, 1.0);
          vec3 reflSky = mix(vec3(0.865, 0.845, 0.798), vec3(0.115, 0.155, 0.152), smoothstep(0.0, 0.50, rHorizon));

          vec3 sunDir = normalize(vec3(-0.34, 0.24, -0.91));
          float sunSpec = pow(max(dot(normalize(R), sunDir), 0.0), mix(18.0, 42.0, wetChannel));
          float sunColumn = exp(-abs(xz.x + 2.6 - N.x * 5.0) * 0.16) * smoothstep(2.0, 26.0, -xz.y + 10.0);
          vec3 sunShimmer = vec3(0.955, 0.938, 0.892) * (sunSpec * 1.15 + sunColumn * 0.26 * (0.4 + 0.6 * wetChannel));

          // Portal grounding pool: warm Kapur glow framed by BanyuWening aqua water
          vec2 toPortal = (xz - uPortalXZ) / vec2(3.1, 7.6);
          float pool = exp(-dot(toPortal, toPortal) * 0.72);
          float ripple = 0.93 + 0.07 * sin(length(toPortal) * 6.5 - uTime * 0.85);
          vec3 poolTint = mix(vec3(0.26, 0.64, 0.59), vec3(0.94, 0.92, 0.86), clamp(pool * 0.95, 0.0, 1.0));
          vec3 portalPool = poolTint * pool * 0.58 * uActivation * ripple;

          vec2 contactDelta = xz - uPortalXZ;
          float shadowDist = length(vec2(contactDelta.x * 0.44, contactDelta.y * 1.15));
          float contactShadow = smoothstep(0.55, 2.55, shadowDist);

          vec3 waterCol = mix(slateDark, reflSky, fresnel * mix(0.45, 0.92, wetChannel));
          waterCol *= mix(0.38, 1.0, contactShadow);
          waterCol += sunShimmer * mix(0.55, 1.0, contactShadow) + portalPool;

          float horizonFade = smoothstep(45.0, 125.0, dist);
          vec3 finalCol = mix(waterCol, vec3(0.865, 0.845, 0.798), horizonFade * 0.85);
          gl_FragColor = vec4(finalCol, alphaFade * (1.0 - smoothstep(75.0, 130.0, dist)));
        }
      `,
    });
    const tidalFloor = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), tidalFloorMat);
    tidalFloor.rotation.x = -Math.PI / 2;
    tidalFloor.position.set(0, FLOOR_Y, -15);
    tidalFloor.renderOrder = -5;
    exteriorGroup.add(tidalFloor);

    const dummyObj = new THREE.Object3D();

    // -------------------------------------------------------------------------
    // 3. 40 SATIN PINE-TITANIUM LAMELLAE PORTAL + --EMBUN SEAM INLAYS + VORTEX
    // -------------------------------------------------------------------------
    const portalGroup = new THREE.Group();
    portalGroup.position.set(4.45, -0.08, 0);
    portalGroup.rotation.set(0.018, -0.18, 0.015);
    scene.add(portalGroup);

    function roundedRectPts(
      w: number,
      h: number,
      r: number,
      skewX = 0,
      offX = 0,
      offY = 0,
      segs = 14
    ) {
      const pts: any[] = [];
      const corners: Array<[number, number, number]> = [
        [w / 2 - r, h / 2 - r, 0],
        [-w / 2 + r, h / 2 - r, Math.PI / 2],
        [-w / 2 + r, -h / 2 + r, Math.PI],
        [w / 2 - r, -h / 2 + r, Math.PI * 1.5],
      ];
      for (const [cx, cy, a0] of corners) {
        for (let s = 0; s <= segs; s++) {
          const a = a0 + (s / segs) * (Math.PI / 2);
          const py = cy + Math.sin(a) * r;
          pts.push(new THREE.Vector2(cx + Math.cos(a) * r + py * skewX + offX, py + offY));
        }
      }
      return pts;
    }

    const portalSignalUniform = { value: new THREE.Vector4(0.18, 0, 0, 0.18) };
    const portalPassageUniform = { value: new THREE.Vector3(0, 0, 0) };
    const portalExitUniform = { value: new THREE.Vector2(0, 0) };

    const attachLamellaShader = (mat: any, key: string, withSatin: boolean) => {
      mat.onBeforeCompile = (shader: any) => {
        shader.uniforms.uSignal = portalSignalUniform;
        shader.uniforms.uPassage = portalPassageUniform;
        shader.uniforms.uExit = portalExitUniform;
        shader.vertexShader =
          `varying vec3 vPlatePos;\n` +
          shader.vertexShader.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>\nvPlatePos = position;`
          );
        if (withSatin) {
          shader.fragmentShader =
            `varying vec3 vPlatePos;\n` +
            shader.fragmentShader.replace(
              `#include <color_fragment>`,
              `#include <color_fragment>
              float diagGrad = clamp(0.5 + (vPlatePos.y * 0.11 - vPlatePos.x * 0.08), 0.0, 1.0);
              float sheen = sin(vPlatePos.y * 2.2) * 0.026 + sin(vPlatePos.x * 4.5 + vPlatePos.z * 3.0) * 0.014;
              diffuseColor.rgb *= mix(0.86, 1.12, diagGrad) + sheen;`
            );
        } else {
          shader.fragmentShader = `varying vec3 vPlatePos;\n` + shader.fragmentShader;
        }
        shader.fragmentShader =
          `uniform vec4 uSignal; uniform vec3 uPassage; uniform vec2 uExit;\n` +
          shader.fragmentShader.replace(
            `#include <emissivemap_fragment>`,
            `#include <emissivemap_fragment>
            vec2 apertureQ = abs(vPlatePos.xy) - vec2(1.44, 2.36);
            float apertureDistance = length(max(apertureQ, 0.0)) + min(max(apertureQ.x, apertureQ.y), 0.0) - 0.62;
            float innerReflection = exp(-abs(apertureDistance) * 8.5);
            float slowCurrent = 0.78 + 0.22 * sin(vPlatePos.y * 0.9 - uSignal.z * 0.5);
            vec3 sigColor = mix(vec3(0.549, 0.761, 0.729), vec3(0.949, 0.937, 0.906), 0.52);
            vec3 rimLight = sigColor * mix(0.065, 0.16, uSignal.w);
            totalEmissiveRadiance += rimLight * innerReflection * (0.35 + 0.65 * uSignal.x) * slowCurrent;
            totalEmissiveRadiance += sigColor * innerReflection * (uPassage.x * 0.45 + uExit.x * 0.85);`
          );
      };
      mat.customProgramCacheKey = () => key;
    };

    const darkTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: brushedMaps.darkAlbedoMap,
      normalMap: brushedMaps.normalMap,
      normalScale: new THREE.Vector2(0.62, 0.62),
      roughnessMap: brushedMaps.roughnessMap,
      metalness: 0.68,
      roughness: 1.0,
      envMapIntensity: 1.15,
    });
    attachLamellaShader(darkTitaniumMat, "bw-dark-titanium-v8", true);

    const kapurTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: brushedMaps.kapurAlbedoMap,
      normalMap: brushedMaps.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: brushedMaps.roughnessMap,
      metalness: 0.66,
      roughness: 0.92,
      envMapIntensity: 1.08,
    });
    attachLamellaShader(kapurTitaniumMat, "bw-kapur-titanium-v8", false);

    const smokedGlassMat = new THREE.MeshPhysicalMaterial
      ? new THREE.MeshPhysicalMaterial({
          color: 0x1d3b38,
          metalness: 0.18,
          roughness: 0.12,
          envMapIntensity: 0.75,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1,
          transparent: true,
          opacity: 0.46,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshStandardMaterial({
          color: 0x1d3b38,
          metalness: 0.2,
          roughness: 0.16,
          transparent: true,
          opacity: 0.46,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

    interface LamellaEntry {
      index: number;
      station: number;
      family: number;
      mesh: any;
      inlayMesh: any | null;
      inlayMat: any | null;
      idlePos: any;
      openedPos: any;
      rotation: any;
    }

    const lamellae: LamellaEntry[] = [];
    const portalPlateGeos: any[] = [];
    const inlayMats: any[] = [];
    const cornerSegs = initMobile ? 12 : 18;
    const inlaySegs = Math.min(12, cornerSegs);

    for (let i = 0; i < 40; i++) {
      const n = i / 39;
      const arc = Math.sin(n * Math.PI);
      const family = Math.floor(i / 8);
      const w = 5.65 + arc * 0.73 + n * 0.28;
      const h = 6.93 + arc * 0.54 + n * 0.12;
      const offsetY = h / 2 - 3.47;
      const skewX = 0.18 - n * 0.3 + Math.sin(n * Math.PI * 2) * 0.045;
      const depth = 0.103 + arc * 0.025;
      const cornerR = 1.05 + 0.12 * Math.sin(i * 0.16);
      const holeOffX = Math.sin(i * 0.22) * 0.065;
      const holeOffY = Math.cos(i * 0.17) * 0.018;

      const outerShape = new THREE.Shape(roundedRectPts(w, h, cornerR, skewX, 0, offsetY, cornerSegs));
      outerShape.holes.push(
        new THREE.Path(roundedRectPts(4.12, 5.96, 0.62, 0, holeOffX, holeOffY, cornerSegs))
      );

      const bevel = 0.032;
      const plateGeo = new THREE.ExtrudeGeometry(outerShape, {
        depth: Math.max(0.02, depth - bevel * 2),
        steps: 1,
        bevelEnabled: true,
        bevelSegments: initMobile ? 2 : 3,
        bevelSize: bevel,
        bevelThickness: bevel,
      });
      plateGeo.translate(0, 0, -(depth - 2 * bevel) / 2);
      portalPlateGeos.push(plateGeo);

      let mat = i % 6 === 4 || i === 1 || i === 38 ? kapurTitaniumMat : darkTitaniumMat;
      if (i === 7 || i === 21 || i === 34) mat = smokedGlassMat;

      const plateMesh = new THREE.Mesh(plateGeo, mat);
      portalGroup.add(plateMesh);

      let inlayMesh: any = null;
      let inlayMat: any = null;
      if (i % 5 === 0 || i === 19 || i === 39) {
        const ringPts = roundedRectPts(4.13, 5.97, 0.625, 0, holeOffX, holeOffY, inlaySegs);
        const curve = new THREE.CatmullRomCurve3(
          ringPts.map((pt: any) => new THREE.Vector3(pt.x, pt.y, depth / 2 + 0.012)),
          true,
          "centripetal"
        );
        const tubeGeo = new THREE.TubeGeometry(curve, initMobile ? 84 : 112, 0.0085, 5, true);
        portalPlateGeos.push(tubeGeo);
        inlayMat = new THREE.MeshStandardMaterial({
          color: 0xf0ece2,
          metalness: 0.78,
          roughness: 0.22,
          emissive: 0xd9d4c7,
          emissiveIntensity: 0.28,
        });
        inlayMats.push(inlayMat);
        inlayMesh = new THREE.Mesh(tubeGeo, inlayMat);
        portalGroup.add(inlayMesh);
      }

      const idleZ = 2.62 - n * 5.24;
      lamellae.push({
        index: i,
        station: n,
        family,
        mesh: plateMesh,
        inlayMesh,
        inlayMat,
        idlePos: new THREE.Vector3((n - 0.5) * 0.18, 0, idleZ),
        openedPos: new THREE.Vector3(0, 0, 2.62 - n * 28),
        rotation: new THREE.Vector3(
          Math.sin(n * Math.PI * 2) * 0.014,
          (n - 0.5) * 0.14,
          (n - 0.5) * 0.19 + Math.sin(n * Math.PI) * 0.035
        ),
      });
    }

    // Continuous deep-malam inner shell connecting telescoped plates during Stage 02 passage
    const shellShape = new THREE.Shape(roundedRectPts(5.0, 6.85, 0.95, 0, 0, 0, inlaySegs));
    shellShape.holes.push(new THREE.Path(roundedRectPts(4.28, 6.12, 0.68, 0, 0, 0, inlaySegs)));
    const innerShellGeo = new THREE.ExtrudeGeometry(shellShape, {
      depth: 1,
      steps: 1,
      bevelEnabled: false,
    });
    const innerShellMat = new THREE.MeshStandardMaterial({
      color: 0x0f2321,
      metalness: 0.68,
      roughness: 0.38,
      envMapIntensity: 0.55,
      transparent: true,
      opacity: 0,
    });
    const innerShellMesh = new THREE.Mesh(innerShellGeo, innerShellMat);
    portalGroup.add(innerShellMesh);

    // Stage 01 Portal Entry Liquid-Silk Membrane (tears open cleanly as camera enters)
    const entryPlasmaUniforms = {
      uTime: { value: 0 },
      uOpen: { value: 0 },
      uCharge: { value: 0.2 },
      uNoiseTex: { value: tileableNoiseTex },
    };
    const entryPlasmaMat = new THREE.ShaderMaterial({
      uniforms: entryPlasmaUniforms,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vLocal;
        void main() {
          vLocal = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpen;
        uniform float uCharge;
        uniform sampler2D uNoiseTex;
        varying vec2 vLocal;
        ${glslNoiseLib}
        ${glslLiquidSilkLib}

        void main() {
          if (uOpen >= 0.999) discard;
          vec2 q = vLocal / vec2(1.92, 2.8);
          float width = mix(0.24, 1.15, smoothstep(0.0, 1.0, uOpen));
          float shape = length(vec2(q.x / width, q.y * 0.86));
          float ripple = (sin(vLocal.y * 5.8 - uTime * 0.45) + sin(vLocal.y * 10.4 + uTime * 0.31) * 0.32) * 0.035;
          float radius = mix(-0.18, 1.85, uOpen);
          float cut = shape + ripple * smoothstep(0.03, 0.15, uOpen) * (1.0 - smoothstep(0.8, 1.0, uOpen)) - radius;
          if (uOpen > 0.01 && cut < 0.0) discard;

          vec3 col = shadeLiquidSilk(vLocal, uTime, uCharge, uOpen, 0.35, 0.35);
          float gather = exp(-pow(vLocal.x * 0.95 + sin(vLocal.y * 1.5 - uTime * 0.23) * 0.14, 2.0) * 6.5);
          col += mix(vec3(0.549, 0.761, 0.729), vec3(0.949, 0.937, 0.906), 0.55) * gather * (0.14 + uCharge * 0.18);

          float tearing = smoothstep(0.005, 0.09, uOpen) * (1.0 - smoothstep(0.88, 1.0, uOpen));
          float rim = exp(-abs(cut) * 58.0) * tearing;
          col += vec3(0.95, 0.94, 0.90) * rim;

          gl_FragColor = vec4(col, 0.98);
        }
      `,
    });
    const entryPlasmaPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.12, 5.96), entryPlasmaMat);
    entryPlasmaPlane.position.set(0, 0, -0.35);
    portalGroup.add(entryPlasmaPlane);

    // Stage 02 Portal Exit Swirling Liquid-Silk Vortex Membrane (`z = -25.12`)
    const exitPlasmaUniforms = {
      uTime: { value: 0 },
      uCharge: { value: 0 },
      uOpen: { value: 0 },
      uPresence: { value: 0 },
      uNoiseTex: { value: tileableNoiseTex },
    };
    const exitPlasmaMat = new THREE.ShaderMaterial({
      uniforms: exitPlasmaUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vLocal;
        void main() {
          vLocal = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uCharge;
        uniform float uOpen;
        uniform float uPresence;
        uniform sampler2D uNoiseTex;
        varying vec2 vLocal;
        ${glslNoiseLib}
        ${glslLiquidSilkLib}

        void main() {
          if (uOpen >= 0.999 || uPresence < 0.005) discard;
          vec2 q = vLocal / vec2(1.92, 2.8);
          float turn = uCharge * 0.24 + uOpen * 0.5;
          vec2 rq = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * q;
          float width = mix(0.40, 1.13, smoothstep(0.0, 1.0, uOpen));
          float cut = length(vec2(rq.x / width, rq.y * 0.86)) - mix(-0.12, 1.72, pow(max(0.001, uOpen), 0.85));
          if (uOpen > 0.01 && cut < 0.0) discard;

          vec3 col = shadeLiquidSilk(vLocal, uTime, uCharge, uOpen, 0.95, 1.0);
          float tearing = smoothstep(0.005, 0.09, uOpen) * (1.0 - smoothstep(0.88, 1.0, uOpen));
          vec3 coronaCol = mix(vec3(0.549, 0.761, 0.729), vec3(0.949, 0.937, 0.906), uCharge);
          col += coronaCol * exp(-abs(cut) * 55.0) * tearing * 1.15;

          gl_FragColor = vec4(col, clamp(uPresence, 0.0, 1.0));
        }
      `,
    });
    const exitPlasmaPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.12, 5.96), exitPlasmaMat);
    exitPlasmaPlane.position.set(0, 0, -25.12);
    portalGroup.add(exitPlasmaPlane);

    // -------------------------------------------------------------------------
    // 4. STAGE 03 OBSERVATORY: 3 LIMESTONE TERRACES, SELF-DRAWING FLOOR INLAYS,
    //    6 SWEPT CERAMIC RIBS, 3 ORBITAL LEAVES + 3D BANYUWENING "B" LOGOGRAM
    // -------------------------------------------------------------------------
    const destinationGroup = new THREE.Group();
    destinationGroup.name = "Destination / observatory";
    destinationGroup.visible = false;
    scene.add(destinationGroup);

    const ceramicWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xe2dbc9,
      metalness: 0.03,
      roughness: 0.56,
      envMapIntensity: 0.20,
    });
    const pineTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x264844,
      metalness: 0.78,
      roughness: 0.28,
      envMapIntensity: 0.72,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x14302d,
      metalness: 0.56,
      roughness: 0.40,
      envMapIntensity: 0.48,
    });
    const embunGlowMat = new THREE.MeshStandardMaterial({
      color: 0x8cc2ba,
      emissive: 0x33706a,
      emissiveIntensity: 0.58,
      metalness: 0.25,
      roughness: 0.28,
    });
    const orbitalLeafGlowMat = ceramicWhiteMat.clone();
    orbitalLeafGlowMat.color.set(0xebe5d7);
    orbitalLeafGlowMat.emissive.set(0xd9d4c7);
    orbitalLeafGlowMat.emissiveIntensity = 0.18;
    const orbitalPineGlowMat = pineTitaniumMat.clone();
    orbitalPineGlowMat.color.set(0x244a45);
    orbitalPineGlowMat.emissive.set(0x33706a);

    const banyuInkMat = new THREE.MeshStandardMaterial({
      color: 0x0d2421,
      metalness: 0.54,
      roughness: 0.34,
      emissive: 0x071412,
      emissiveIntensity: 0.04,
      envMapIntensity: 0.48,
    });
    const banyuEmbunEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x265e58,
      metalness: 0.68,
      roughness: 0.26,
      emissive: 0x123834,
      emissiveIntensity: 0.06,
      envMapIntensity: 0.62,
    });

    // Self-Drawing Limestone Terrace Shader (--kapur / --garis floor + --ink / --embun inlays)
    const floorInlayUniforms = {
      uTerraceTime: { value: 0 },
      uFloorRings: { value: 0 },
      uFloorSpokes: { value: 0 },
      uRobotRing: { value: 0 },
    };
    const limestoneFloorMat = new THREE.MeshStandardMaterial({
      color: 0xd7ceb9,
      metalness: 0.02,
      roughness: 0.72,
      envMapIntensity: 0.14,
    });
    limestoneFloorMat.onBeforeCompile = (shader: any) => {
      Object.assign(shader.uniforms, floorInlayUniforms);
      shader.vertexShader =
        `varying vec3 vTerraceWorld;\n` +
        shader.vertexShader.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>\nvTerraceWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );
      shader.fragmentShader =
        `varying vec3 vTerraceWorld;
        uniform float uTerraceTime, uFloorRings, uFloorSpokes, uRobotRing;
        float floorStroke(float path, float prog) {
          return smoothstep(0.0, 0.015, prog) * mix(1.0 - smoothstep(prog - 0.012, prog + 0.004, path), 1.0, smoothstep(0.985, 1.0, prog));
        }
        float floorHead(float path, float prog) {
          return exp(-pow((path - prog) * 65.0, 2.0)) * smoothstep(0.0, 0.03, prog) * (1.0 - smoothstep(0.94, 1.0, prog));
        }\n` +
        shader.fragmentShader
          .replace(
            `#include <color_fragment>`,
            `#include <color_fragment>
            vec2 p = vTerraceWorld.xz - vec2(3.0, -51.0);
            float radius = length(p);
            float angle = atan(p.y, p.x);
            float around = fract((angle - 1.5707963) / 6.2831853 + 1.0);
            float radial = abs(fract(radius / 3.2) - 0.5);
            float ringLine = 1.0 - smoothstep(0.010, 0.030, radial);
            float ringProg = clamp(uFloorRings * 1.35 - floor(radius / 3.2) * 0.07, 0.0, 1.0);
            float sector = abs(sin(angle * 8.0));
            float rayLine = (1.0 - smoothstep(0.010, 0.032, sector)) * smoothstep(2.0, 5.0, radius);
            float rayPath = clamp((radius - 2.0) / 13.5, 0.0, 1.0);
            float rayProg = clamp(uFloorSpokes * 1.28 - mod(floor((angle + 3.14159265) * 2.546479 + 0.5), 4.0) * 0.07, 0.0, 1.0);
            float joint = max(ringLine * floorStroke(around, ringProg), rayLine * floorStroke(rayPath, rayProg));
            float terraceHead = max(ringLine * floorHead(around, ringProg), rayLine * floorHead(rayPath, rayProg));
            float finePore = sin(p.x * 29.0 + sin(p.y * 23.0)) * sin(p.y * 31.0 + p.x * 13.0);
            float mineral = sin(p.x * 0.73 + sin(p.y * 0.44) * 1.4) * sin(p.y * 0.57 + p.x * 0.19);
            float travertine = sin(p.x * 3.1 + mineral * 2.2) * cos(p.y * 2.7 - mineral * 1.8);
            float cloudShade = 0.97 + 0.03 * sin(p.x * 0.15 + p.y * 0.12 + uTerraceTime * 0.055);
            vec3 kapurVein = mix(vec3(0.950, 0.932, 0.885), vec3(1.032, 1.015, 0.962), 0.5 + 0.5 * (mineral * 0.65 + travertine * 0.35));
            diffuseColor.rgb *= cloudShade * kapurVein * (1.0 - joint * 0.46 + finePore * 0.015);

            // Bio-Pond grounding pad ring centered at (3, -3.58, -48) -> local p = (0, 3)
            vec2 landing = p - vec2(0.0, 3.0);
            float landingRadius = length(landing);
            float landingAngle = atan(landing.y, landing.x);
            float landingPath = fract((landingAngle - 1.5707963) / 6.2831853 + 1.0);
            float landingInk = (1.0 - smoothstep(0.018, 0.044, abs(landingRadius - 2.15))) * smoothstep(0.12, 0.2, abs(sin(landingAngle)));
            float engraving = landingInk * floorStroke(landingPath, uRobotRing);
            terraceHead = max(terraceHead, landingInk * floorHead(landingPath, uRobotRing));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.078, 0.188, 0.176), engraving * 0.72);`
          )
          .replace(
            `#include <emissivemap_fragment>`,
            `#include <emissivemap_fragment>
            totalEmissiveRadiance += vec3(0.45, 0.84, 0.78) * terraceHead * 1.2;`
          );
    };
    limestoneFloorMat.customProgramCacheKey = () => "bw-limestone-drawn-v6";

    const addEllipseTerrace = (
      x: number,
      y: number,
      z: number,
      rx: number,
      rz: number,
      depth: number,
      topMat: any
    ) => {
      const grp = new THREE.Group();
      grp.position.set(x, y - depth - 0.06, z);
      destinationGroup.add(grp);
      const shape = new THREE.Shape();
      shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 3,
        curveSegments: 48,
      });
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, [topMat, pineTitaniumMat]);
      grp.add(mesh);
      return grp;
    };

    const addArcTube = (
      rx: number,
      rz: number,
      y: number,
      a0: number,
      a1: number,
      radius: number,
      mat: any,
      parent: any
    ) => {
      const pts: any[] = [];
      const steps = 96;
      for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps;
        pts.push(new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz));
      }
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, radius, 6, false),
        mat
      );
      parent.add(mesh);
      return mesh;
    };

    // Main Arrival Terrace (3, -3.58, -51) + Left Secondary Terrace + Right Distant Terrace
    const mainTerrace = addEllipseTerrace(3, -3.58, -51, 15.5, 12.5, 0.7, limestoneFloorMat);
    addArcTube(15.28, 12.28, 0.775, 0, Math.PI * 2, 0.02, pineTitaniumMat, mainTerrace);
    addArcTube(14.8, 11.8, 0.775, 0, Math.PI * 2, 0.012, embunGlowMat, mainTerrace);
    addArcTube(15.5, 12.5, 0.08, 0, Math.PI * 2, 0.035, pineTitaniumMat, mainTerrace);

    const leftTerrace = addEllipseTerrace(-19, -7.6, -72, 22, 15, 1.15, ceramicWhiteMat);
    addArcTube(21.4, 14.4, 1.22, 0.06, Math.PI * 1.85, 0.055, pineTitaniumMat, leftTerrace);

    const rightTerrace = addEllipseTerrace(24, -12, -105, 31, 20, 2.0, ceramicWhiteMat);
    addArcTube(30.7, 19.7, 2.07, 0, Math.PI * 2, 0.07, pineTitaniumMat, rightTerrace);

    addEllipseTerrace(3, -4.62, -51, 13.6, 10.9, 0.32, darkTrimMat);

    // 18 Perimeter Colonnade Pillars on Left Secondary Terrace
    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.38, 8, 10);
    const colonnadeInst = new THREE.InstancedMesh(pillarGeo, ceramicWhiteMat, 18);
    for (let i = 0; i < 18; i++) {
      const a = 0.1 + (i / 17) * Math.PI * 1.15;
      dummyObj.position.set(-19 + Math.cos(a) * 20, -11.7, -72 + Math.sin(a) * 13);
      dummyObj.rotation.set(0, 0, 0);
      dummyObj.scale.setScalar(1);
      dummyObj.updateMatrix();
      colonnadeInst.setMatrixAt(i, dummyObj.matrix);
    }
    destinationGroup.add(colonnadeInst);

    // Circular ambient grounding shadow under the BanyuWening Bio-Pond basin at (3, -3.558, -48.2)
    const basinShadowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uOpacity: { value: 0.55 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uOpacity;
        void main() {
          vec2 q = (vUv - 0.5) * 2.0;
          float d = length(q);
          float alpha = exp(-d * d * 2.4) * (1.0 - smoothstep(0.65, 1.0, d)) * uOpacity;
          gl_FragColor = vec4(0.059, 0.137, 0.129, alpha);
        }
      `,
    });
    const basinShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), basinShadowMat);
    basinShadow.rotation.x = -Math.PI / 2;
    basinShadow.position.set(3, -3.558, -48.2);
    destinationGroup.add(basinShadow);

    // 4A. Six Swept Ceramic Ribs + 8 Cross-Brace Pine-Titanium Tubes
    const createSweptArchShape = (rx: number, ry: number, thickness: number, a0: number, a1: number) => {
      const s = new THREE.Shape();
      const segs = 64;
      for (let i = 0; i <= segs; i++) {
        const a = a0 + ((a1 - a0) * i) / segs;
        const px = Math.cos(a) * rx;
        const py = Math.sin(a) * ry;
        if (i === 0) s.moveTo(px, py);
        else s.lineTo(px, py);
      }
      for (let i = segs; i >= 0; i--) {
        const a = a0 + ((a1 - a0) * i) / segs;
        s.lineTo(Math.cos(a) * (rx - thickness), Math.sin(a) * (ry - thickness));
      }
      s.closePath();
      return s;
    };

    const sixRibsGroup = new THREE.Group();
    sixRibsGroup.name = "Observatory / six swept ceramic ribs";
    sixRibsGroup.position.set(5, -12, -83);
    sixRibsGroup.rotation.y = -0.24;
    destinationGroup.add(sixRibsGroup);

    for (let i = 0; i < 6; i++) {
      const rib = new THREE.Mesh(
        new THREE.ExtrudeGeometry(
          createSweptArchShape(25 + i * 0.5, 20 + i * 0.45, 0.82, 0.025, Math.PI - 0.025),
          { depth: 1.15, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.16, bevelThickness: 0.16 }
        ),
        [ceramicWhiteMat, pineTitaniumMat]
      );
      rib.position.z = -i * 3.2;
      sixRibsGroup.add(rib);
    }
    for (const ang of [0.25, 0.65, 1.05, 1.45, 1.85, 2.25, 2.65, 2.95]) {
      const strutPts = Array.from(
        { length: 6 },
        (_, i) => new THREE.Vector3(Math.cos(ang) * (25 + i * 0.5), Math.sin(ang) * (20 + i * 0.45), -i * 3.2)
      );
      sixRibsGroup.add(
        new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strutPts), 16, 0.09, 6, false), pineTitaniumMat)
      );
    }

    // 4B. Three Balanced Orbital Signal Leaves + Sculptural 3D BanyuWening "B" Wave Logogram
    const signalGroup = new THREE.Group();
    signalGroup.name = "Signal / three balanced orbital leaves";
    signalGroup.position.set(1.9, -0.9, -57.5);
    signalGroup.rotation.set(0.12, -0.32, -0.18);
    signalGroup.scale.setScalar(0.61);
    destinationGroup.add(signalGroup);

    const orbitalLeafGeo = new THREE.ExtrudeGeometry(
      createSweptArchShape(2.35, 2.9, 0.09, 0.16, Math.PI * 1.93),
      { depth: 0.13, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.027, bevelThickness: 0.027 }
    );
    const traceCurvePts = Array.from({ length: 85 }, (_, i) => {
      const a = 0.16 + ((Math.PI * 1.93 - 0.16) * i) / 84;
      return new THREE.Vector3(Math.cos(a) * 2.305, Math.sin(a) * 2.855, 0.162);
    });
    const traceTubeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(traceCurvePts),
      84,
      0.016,
      5,
      false
    );

    const traceTimeUniform = { value: 0 };
    const traceChargeUniform = { value: 0 };
    const orbitalLeaves: any[] = [];
    const orbitalTraceMats: any[] = [];

    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(orbitalLeafGeo, i === 1 ? orbitalLeafGlowMat : orbitalPineGlowMat);
      leaf.scale.setScalar(1 - i * 0.12);
      leaf.rotation.y = (i - 1) * 0.38;
      signalGroup.add(leaf);
      orbitalLeaves.push(leaf);

      const tMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTraceTime: traceTimeUniform,
          uTraceCharge: traceChargeUniform,
          uTraceOffset: { value: i * 0.31 },
          uTraceDirection: { value: i === 1 ? -1 : 1 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTraceTime, uTraceCharge, uTraceOffset, uTraceDirection;
          void main() {
            float d = fract(vUv.x - uTraceTime * 0.28 * uTraceDirection - uTraceOffset);
            float head = exp(-pow(min(d, 1.0 - d) * 70.0, 2.0));
            float tail = pow(1.0 - d, 9.0);
            float echo = exp(-pow((d - 0.5) * 22.0, 2.0)) * 0.28;
            vec3 color = mix(vec3(0.200, 0.439, 0.416), vec3(0.90, 0.98, 0.96), head);
            gl_FragColor = vec4(color, uTraceCharge * (0.06 + tail * 0.68 + head * 0.85 + echo));
          }
        `,
      });
      orbitalTraceMats.push(tMat);
      const tMesh = new THREE.Mesh(traceTubeGeo, tMat);
      leaf.add(tMesh);
    }

    const brandMarkGroup = new THREE.Group();
    brandMarkGroup.name = "Brand / BanyuWening 3D wave logogram";
    brandMarkGroup.scale.setScalar(1.48);
    signalGroup.add(brandMarkGroup);

    const banyuAquaMat = new THREE.MeshStandardMaterial({
      color: 0x1e5751,
      metalness: 0.44,
      roughness: 0.32,
      emissive: 0x0f3632,
      emissiveIntensity: 0.08,
      envMapIntensity: 0.52,
    });
    const topArchMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(buildBanyuWeningTopShape(THREE, 0.015), {
        depth: 0.24,
        bevelEnabled: true,
        bevelSize: 0.026,
        bevelThickness: 0.024,
        bevelSegments: 3,
      }),
      [banyuInkMat, banyuEmbunEdgeMat]
    );
    topArchMesh.position.z = -0.12;
    brandMarkGroup.add(topArchMesh);

    const waveSliceMeshes: Array<{ mesh: any; idx: number }> = [];
    buildBanyuWeningWaveSlices(THREE, 0.015).forEach(({ shapes }, idx) => {
      const sliceGroup = new THREE.Group();
      for (const s of shapes) {
        const m = new THREE.Mesh(
          new THREE.ExtrudeGeometry(s, {
            depth: 0.2,
            bevelEnabled: true,
            bevelSize: 0.018,
            bevelThickness: 0.018,
            bevelSegments: 2,
          }),
          [banyuAquaMat, banyuEmbunEdgeMat]
        );
        m.position.z = -0.1;
        sliceGroup.add(m);
      }
      brandMarkGroup.add(sliceGroup);
      waveSliceMeshes.push({ mesh: sliceGroup, idx });
    });

    // Signal Pedestal Rings on Floor + Connecting Luminous Guide Curve
    const signalPadGroup = new THREE.Group();
    signalPadGroup.position.set(1.9, 0, -57.5);
    destinationGroup.add(signalPadGroup);
    addArcTube(2.15, 2.15, -3.56, 0.18, Math.PI * 1.94, 0.014, pineTitaniumMat, signalPadGroup);
    addArcTube(2.02, 2.02, -3.558, 0.08, Math.PI * 1.2, 0.009, embunGlowMat, signalPadGroup);

    const floorGuideCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(3, -3.55, -48),
      new THREE.Vector3(3.6, -3.55, -50.2),
      new THREE.Vector3(3.9, -3.55, -53.8),
      new THREE.Vector3(1.9, -3.55, -57.5),
    ]);
    const floorGuideUniform = { value: 0 };
    const floorGuideMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uDraw: floorGuideUniform },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uDraw;
        void main() {
          if (uDraw < 0.001 || vUv.x > uDraw) discard;
          float pulse = exp(-pow((vUv.x - uDraw) * 45.0, 2.0)) * (1.0 - smoothstep(0.95, 1.0, uDraw));
          gl_FragColor = vec4(0.32 + 0.52 * pulse, 0.74 + 0.22 * pulse, 0.69 + 0.24 * pulse, 0.34 + 0.62 * pulse);
        }
      `,
    });
    destinationGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(floorGuideCurve, 64, 0.022, 5, false), floorGuideMat)
    );

    // Inset-Lit Approach Bridge connecting Stage 02 Portal Exit to Stage 03 Main Terrace
    const approachGroup = new THREE.Group();
    destinationGroup.add(approachGroup);
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.24, 1), limestoneFloorMat);
    approachGroup.add(bridgeDeck);
    for (const rx of [-2.03, 2.03]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.016, 1), embunGlowMat);
      rail.position.set(rx, 0.128, 0);
      approachGroup.add(rail);
    }

    // Drifting Cloud Volumes
    const cloudPlanes: Array<{ mesh: any; x: number; y: number; phase: number; speed: number }> = [];
    const cloudSpecs = [
      { x: -20, y: -5.7, z: -76, w: 37, h: 18, op: 0.42, phase: 0.4, speed: 0.065 },
      { x: 22, y: -13, z: -102, w: 52, h: 20, op: 0.65, phase: 2.4, speed: 0.047 },
      { x: 0, y: -14, z: -120, w: 155, h: 45, op: 0.72, phase: 0.7, speed: 0.032 },
      { x: -16, y: -10.5, z: -70, w: 68, h: 24, op: 0.62, phase: 3.1, speed: 0.052 },
      { x: 18, y: -9.3, z: -55, w: 64, h: 17, op: 0.58, phase: 4.7, speed: 0.075 },
    ];
    const cloudPlaneGeo = new THREE.PlaneGeometry(1, 1);
    const cloudTimeUniform = { value: 0 };
    for (const cs of cloudSpecs) {
      const cMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uCloud: { value: cloudDataTex },
          uTime: cloudTimeUniform,
          uOpacity: { value: cs.op },
          uPhase: { value: cs.phase },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform sampler2D uCloud;
          uniform float uTime, uOpacity, uPhase;
          void main() {
            vec2 uv = vUv;
            uv.x += sin(vUv.y * 7.0 + uTime * 0.09 + uPhase) * 0.014;
            uv.y += sin(vUv.x * 9.0 - uTime * 0.065 + uPhase) * 0.009;
            vec4 c = texture2D(uCloud, uv);
            float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(0.0, 0.12, 1.0 - vUv.x) *
                         smoothstep(0.0, 0.10, vUv.y) * smoothstep(0.0, 0.10, 1.0 - vUv.y);
            gl_FragColor = vec4(c.rgb, c.a * uOpacity * edge);
          }
        `,
      });
      const cMesh = new THREE.Mesh(cloudPlaneGeo, cMat);
      cMesh.position.set(cs.x, cs.y, cs.z);
      cMesh.scale.set(cs.w, cs.h, 1);
      destinationGroup.add(cMesh);
      cloudPlanes.push({ mesh: cMesh, x: cs.x, y: cs.y, phase: cs.phase, speed: cs.speed });
    }

    // -------------------------------------------------------------------------
    // 4C. BANYUWENING CRYSTAL BIO-POND BASIN, 5 SWIMMING CATFISH ("IKAN LELE"),
    //     PVC STILLING-WELL, 4 SUBMERGED SENSORS, AERATION BUBBLES & CORE HUB
    // -------------------------------------------------------------------------
    const bioPondGroup = new THREE.Group();
    bioPondGroup.name = "BanyuWening / Bio-Pond & Multi-Sensor Core Hub";
    bioPondGroup.position.set(3, -3.58, -48.2);
    destinationGroup.add(bioPondGroup);

    const pondRadius = 1.98;
    const waterHeight = 1.12;

    const pondBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f2321,
      metalness: 0.72,
      roughness: 0.34,
      envMapIntensity: 0.58,
    });
    const pondAquaMat = new THREE.MeshStandardMaterial({
      color: 0x33706a,
      metalness: 0.3,
      roughness: 0.32,
      emissive: 0x14302d,
      emissiveIntensity: 0.28,
      envMapIntensity: 0.58,
    });
    const pondProbeGlowMat = new THREE.MeshStandardMaterial({
      color: 0x8cc2ba,
      emissive: 0x4db5a7,
      emissiveIntensity: 1.05,
      roughness: 0.18,
    });
    const satinTitaniumEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x76908c,
      metalness: 0.82,
      roughness: 0.26,
      envMapIntensity: 0.68,
    });

    // Architectural stepped plinth & outer pine-titanium collar resting on floor pad
    const plinthLower = new THREE.Mesh(
      new THREE.CylinderGeometry(pondRadius + 0.14, pondRadius + 0.22, 0.16, 64),
      pondBaseMat
    );
    plinthLower.position.y = 0.08;
    const plinthRimTrim = new THREE.Mesh(
      new THREE.TorusGeometry(pondRadius + 0.08, 0.032, 12, 72),
      pineTitaniumMat
    );
    plinthRimTrim.rotation.x = Math.PI / 2;
    plinthRimTrim.position.y = 0.17;
    bioPondGroup.add(plinthLower, plinthRimTrim);

    // Underwater Caustic Stone Basin Floor inside tank (`y = 0.165`)
    const basinCausticUniforms = { uTime: { value: 0 } };
    const basinFloorMat = new THREE.ShaderMaterial({
      uniforms: basinCausticUniforms,
      vertexShader: `
        varying vec2 vLocalXZ;
        void main() {
          vLocalXZ = position.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vLocalXZ;
        ${glslNoiseLib}
        void main() {
          float r = length(vLocalXZ);
          vec2 uv = vLocalXZ * 1.45;
          float n1 = fbm(uv + vec2(uTime * 0.12, -uTime * 0.09));
          float n2 = fbm(uv * 1.8 - vec2(uTime * 0.14, uTime * 0.08));
          float caustic = exp(-abs(n1 - n2) * 18.0);
          vec3 gravel = mix(vec3(0.059, 0.137, 0.129), vec3(0.160, 0.360, 0.340), n1);
          vec3 col = gravel + vec3(0.549, 0.761, 0.729) * caustic * 0.45;
          col *= mix(1.0, 0.65, smoothstep(1.3, 2.0, r));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const basinFloorDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(pondRadius - 0.03, pondRadius - 0.03, 0.03, 64),
      basinFloorMat
    );
    basinFloorDisc.position.y = 0.165;
    bioPondGroup.add(basinFloorDisc);

    // Translucent Acrylic Cylinder Observation Wall + 4 Brushed Pine-Titanium Ribs & Top Collar
    const acrylicWallMat = new THREE.MeshStandardMaterial({
      color: 0xdcf4ef,
      metalness: 0.12,
      roughness: 0.1,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
      envMapIntensity: 0.75,
    });
    const acrylicWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pondRadius, pondRadius, waterHeight, 64, 1, true),
      acrylicWallMat
    );
    acrylicWall.position.y = 0.16 + waterHeight * 0.5;
    acrylicWall.renderOrder = 3;
    const upperBasinRim = new THREE.Mesh(
      new THREE.TorusGeometry(pondRadius, 0.042, 14, 72),
      satinTitaniumEdgeMat
    );
    upperBasinRim.rotation.x = Math.PI / 2;
    upperBasinRim.position.y = 0.16 + waterHeight;
    bioPondGroup.add(acrylicWall, upperBasinRim);

    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.25 + (i * Math.PI) / 2;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.038, waterHeight + 0.06, 12),
        pineTitaniumMat
      );
      post.position.set(Math.cos(a) * pondRadius, 0.16 + waterHeight * 0.5, Math.sin(a) * pondRadius);
      bioPondGroup.add(post);
    }

    // Crystal-Clear Animated Water Surface (`y = 1.15`)
    const waterSurfaceUniforms = { uTime: { value: 0 }, uOpacity: { value: 0.44 } };
    const waterSurfaceMat = new THREE.ShaderMaterial({
      uniforms: waterSurfaceUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vLocalXZ;
        void main() {
          vLocalXZ = position.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vLocalXZ;
        ${glslNoiseLib}
        void main() {
          float r = length(vLocalXZ);
          float aerationRipple = sin(r * 18.0 - uTime * 3.2) * exp(-r * 1.1) * 0.5 + 0.5;
          float f = fbm(vLocalXZ * 2.2 + vec2(uTime * 0.15, -uTime * 0.12));
          vec3 aqua = mix(vec3(0.200, 0.439, 0.416), vec3(0.549, 0.761, 0.729), f * 0.65 + aerationRipple * 0.35);
          float rimSpec = smoothstep(1.35, 1.98, r) * 0.28 + pow(aerationRipple, 6.0) * 0.24;
          vec3 col = aqua + vec3(0.92, 0.97, 0.96) * rimSpec;
          gl_FragColor = vec4(col, uOpacity + rimSpec * 0.25);
        }
      `,
    });
    const waterSurfaceDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(pondRadius - 0.025, pondRadius - 0.025, 0.015, 64),
      waterSurfaceMat
    );
    waterSurfaceDisc.position.y = 0.16 + waterHeight - 0.08;
    waterSurfaceDisc.renderOrder = 2;
    bioPondGroup.add(waterSurfaceDisc);

    // Central Aeration Diffuser Ring + Stilling-Well PVC + 4 Submerged Sensor Probes + Core Hub Mast
    const diffuserRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.028, 10, 40),
      pondAquaMat
    );
    diffuserRing.rotation.x = Math.PI / 2;
    diffuserRing.position.y = 0.21;
    bioPondGroup.add(diffuserRing);

    const centralMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.11, 1.65, 24),
      satinTitaniumEdgeMat
    );
    centralMast.position.y = 0.98;
    bioPondGroup.add(centralMast);

    // Perforated PVC Stilling-Well Column beside mast (turbidity anti-silt chamber)
    const stillingWell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 1.05, 18),
      ceramicWhiteMat
    );
    stillingWell.position.set(-0.24, 0.74, 0.16);
    bioPondGroup.add(stillingWell);

    // 4 Submerged IoT Sensor Probes radiating from mast manifold
    const probeConfigs = [
      { angle: 0.2, r: 0.22, len: 0.72, glow: true },
      { angle: 1.75, r: 0.22, len: 0.65, glow: false },
      { angle: 3.3, r: 0.24, len: 0.58, glow: true },
      { angle: 4.9, r: 0.24, len: 0.76, glow: false },
    ];
    for (const p of probeConfigs) {
      const px = Math.cos(p.angle) * p.r;
      const pz = Math.sin(p.angle) * p.r;
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.022, p.len, 12),
        pondBaseMat
      );
      body.position.set(px, 1.05 - p.len * 0.5, pz);
      bioPondGroup.add(body);
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 12, 10),
        p.glow ? pondProbeGlowMat : satinTitaniumEdgeMat
      );
      tip.position.set(px, 1.05 - p.len, pz);
      bioPondGroup.add(tip);
    }

    // Rising Dissolved-Oxygen (DO) Micro-Bubbles inside water column (`44` particles)
    const bubbleCount = 44;
    const bubblePositions = new Float32Array(bubbleCount * 3);
    const bubbleSeeds = Array.from({ length: bubbleCount }, (_, idx) => ({
      angle: (idx * 2.39996) % (Math.PI * 2),
      radius: 0.25 + ((idx * 17) % 100) / 100 * 0.55,
      speed: 0.28 + ((idx * 31) % 100) / 100 * 0.34,
      phase: ((idx * 47) % 100) / 100,
    }));
    const bubbleGeo = new THREE.BufferGeometry();
    bubbleGeo.setAttribute("position", new THREE.BufferAttribute(bubblePositions, 3));
    const bubbleMat = new THREE.PointsMaterial({
      color: 0xc2fff4,
      size: 0.065,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const bubblePoints = new THREE.Points(bubbleGeo, bubbleMat);
    bubblePoints.renderOrder = 3;
    bioPondGroup.add(bubblePoints);

    // Top IP65 Core Hub Weatherproof Enclosure & Illuminated Aqua OLED Screen
    const coreHubHead = new THREE.Group();
    coreHubHead.position.set(0, 1.92, 0);
    coreHubHead.rotation.y = -0.24;
    bioPondGroup.add(coreHubHead);

    const hubShape = new THREE.Shape();
    hubShape.moveTo(-0.34, -0.24);
    hubShape.lineTo(0.34, -0.24);
    hubShape.quadraticCurveTo(0.42, -0.24, 0.42, -0.16);
    hubShape.lineTo(0.42, 0.16);
    hubShape.quadraticCurveTo(0.42, 0.24, 0.34, 0.24);
    hubShape.lineTo(-0.34, 0.24);
    hubShape.quadraticCurveTo(-0.42, 0.24, -0.42, 0.16);
    hubShape.lineTo(-0.42, -0.16);
    hubShape.quadraticCurveTo(-0.42, -0.24, -0.34, -0.24);
    const hubGeo = new THREE.ExtrudeGeometry(hubShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    });
    hubGeo.center();
    coreHubHead.add(new THREE.Mesh(hubGeo, pondBaseMat));

    const hubCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.025, 10, 28),
      pineTitaniumMat
    );
    hubCollar.rotation.x = Math.PI / 2;
    hubCollar.position.y = -0.26;
    coreHubHead.add(hubCollar);

    // Backlit Aqua OLED Water-Telemetry Faceplate (`pH 7.2 · DO OK · 4 KOLAM`)
    const oledUniforms = { uTime: { value: 0 } };
    const oledFaceMat = new THREE.ShaderMaterial({
      uniforms: oledUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec3 bg = vec3(0.035, 0.085, 0.082);
          float border = smoothstep(0.04, 0.07, vUv.x) * smoothstep(0.04, 0.07, 1.0 - vUv.x) *
                         smoothstep(0.06, 0.10, vUv.y) * smoothstep(0.06, 0.10, 1.0 - vUv.y);
          // Simulated Edge Fuzzy telemetry waveform across center band
          float waveY = 0.56 + 0.11 * sin(vUv.x * 16.0 - uTime * 2.8) * sin(vUv.x * 3.14159);
          float trace = exp(-abs(vUv.y - waveY) * 52.0);
          // 4 illuminated AMAN channel dots near bottom edge (Kolam 1..4)
          float dots = 0.0;
          for (int i = 0; i < 4; i++) {
            float dx = vUv.x - (0.20 + float(i) * 0.20);
            float dy = (vUv.y - 0.24) * 1.45;
            float pulse = 0.72 + 0.28 * sin(uTime * 2.2 - float(i) * 0.7);
            dots += exp(-(dx * dx + dy * dy) * 380.0) * pulse;
          }
          vec3 aqua = vec3(0.549, 0.761, 0.729);
          vec3 chalk = vec3(0.949, 0.937, 0.906);
          vec3 col = mix(vec3(0.059, 0.137, 0.129), bg + aqua * trace * 1.15 + mix(aqua, chalk, 0.35) * dots, border);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const oledScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.34), oledFaceMat);
    oledScreen.position.set(0, 0.01, 0.155);
    coreHubHead.add(oledScreen);

    // 4 GX16 Shielded Connector Glands beneath Core Hub (`Kolam 1..4`)
    for (let i = 0; i < 4; i++) {
      const gx = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.026, 0.09, 10),
        satinTitaniumEdgeMat
      );
      gx.position.set(-0.22 + i * 0.145, -0.28, 0.06);
      coreHubHead.add(gx);
    }

    // 5 Articulated 3D Swimming Catfish ("Ikan Lele") gliding inside Bio-Pond water
    const catfishBodyMat = new THREE.MeshStandardMaterial({
      color: 0x28353b,
      metalness: 0.18,
      roughness: 0.24,
      envMapIntensity: 0.55,
    });
    const catfishBellyMat = new THREE.MeshStandardMaterial({
      color: 0x99aba6,
      metalness: 0.1,
      roughness: 0.32,
      envMapIntensity: 0.4,
    });
    const catfishFinMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d52,
      metalness: 0.12,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    const catfishEyeMat = new THREE.MeshStandardMaterial({
      color: 0xeaf7f5,
      emissive: 0x8cc2ba,
      emissiveIntensity: 0.45,
      roughness: 0.15,
    });

    interface CatfishActor {
      rig: ReturnType<typeof createArticulatedCatfish>;
      orbitR: number;
      baseY: number;
      speed: number;
      phase: number;
      dir: 1 | -1;
      angle: number;
    }

    const catfishConfigs: Array<{ orbitR: number; baseY: number; speed: number; phase: number; scale: number; dir: 1 | -1 }> = [
      { orbitR: 1.24, baseY: 0.86, speed: 0.46, phase: 0.2, scale: 1.05, dir: 1 },
      { orbitR: 0.92, baseY: 0.62, speed: 0.58, phase: 1.65, scale: 0.92, dir: -1 },
      { orbitR: 1.46, baseY: 0.72, speed: 0.40, phase: 2.85, scale: 1.12, dir: 1 },
      { orbitR: 0.74, baseY: 0.46, speed: 0.64, phase: 4.15, scale: 0.86, dir: 1 },
      { orbitR: 1.16, baseY: 0.38, speed: 0.50, phase: 5.2, scale: 0.98, dir: -1 },
    ];
    const catfishList: CatfishActor[] = catfishConfigs.map((cfg) => {
      const rig = createArticulatedCatfish(
        THREE,
        {
          body: catfishBodyMat,
          belly: catfishBellyMat,
          fin: catfishFinMat,
          eye: catfishEyeMat,
        },
        cfg.scale
      );
      bioPondGroup.add(rig.root);
      return {
        rig,
        orbitR: cfg.orbitR,
        baseY: cfg.baseY,
        speed: cfg.speed,
        phase: cfg.phase,
        dir: cfg.dir,
        angle: cfg.phase,
      };
    });

    // -------------------------------------------------------------------------
    // 5. RESPONSIVE VIEWPORT STATE & INTERACTION
    // -------------------------------------------------------------------------
    let isMobile = width < 761;
    let isNarrow = width < height;

    const handleResize = () => {
      if (!host) return;
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      isMobile = w < 761;
      isNarrow = w < h;
      const pixelBudget = isMobile ? 1200000 : 3600000;
      const maxDpr = isMobile ? 1.5 : 2.0;
      const minDpr = isMobile ? 0.9 : 1.0;
      const targetDpr = Math.max(
        minDpr,
        Math.min(window.devicePixelRatio || 1, maxDpr, Math.sqrt(pixelBudget / Math.max(1, w * h)))
      );
      renderer.setPixelRatio(targetDpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    let targetPX = 0;
    let targetPY = 0;
    let smoothPX = 0;
    let smoothPY = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (reduceMotion) return;
      const rect = canvas.getBoundingClientRect();
      targetPX = clamp(((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -1, 1);
      targetPY = clamp(1 - ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2, -1, 1);
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    handleResize();

    const getProgress = () =>
      clamp(
        externalProgressRefHolder.current
          ? externalProgressRefHolder.current.current
          : localProgressRef.current,
        0,
        1
      );

    let rafId = 0;
    let prewarmRafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let disposed = false;
    let prewarmDone = false;

    const onContextLost = (e: Event) => {
      e.preventDefault();
      disposed = true;
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(prewarmRafId);
      setFallback(true);
      prewarmCallbackRef.current?.(1, true);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    // Pre-allocated spline tables & scratch math objects (zero allocations per frame)
    const ROUTE_KEYS: [number, number][] = [
      [0, 0],
      [0.025, 0.07],
      [0.12, 0.26],
      [0.24, 0.49],
      [0.285, 0.56],
      [0.44, 0.66],
      [0.6, 0.755],
      [0.67, 0.797],
      [0.73, 0.86],
      [0.91, 0.96],
      [1, 1],
    ];
    const CAM_X_KEYS: [number, number][] = [
      [0, 0],
      [0.07, 0],
      [0.24, 1.15],
      [0.4, 0],
      [0.86, 0],
      [1, 0.8],
    ];
    const CAM_Y_KEYS: [number, number][] = [
      [0, 0],
      [0.07, 0],
      [0.26, 0.1],
      [0.4, -0.35],
      [0.86, -0.35],
      [1, -0.12],
    ];
    const CAM_Z_KEYS: [number, number][] = [
      [0, 0],
      [0.07, 0],
      [0.24, 13],
      [0.4, 7],
      [0.53, 2.4],
      [0.7, -12],
      [0.86, -28],
      [1, -38.5],
    ];
    const ARRIVE_X_KEYS: [number, number][] = [
      [0.73, 4.45],
      [0.785, 6.45],
      [0.825, 6.6],
      [0.91, 4.5],
      [1, 4.5],
    ];
    const ARRIVE_Y_KEYS: [number, number][] = [
      [0.73, -0.43],
      [0.785, -0.04],
      [0.835, -0.08],
      [0.91, -0.25],
      [1, -0.25],
    ];
    const ARRIVE_Z_KEYS: [number, number][] = [
      [0.73, -28],
      [0.785, -35.2],
      [0.835, -39],
      [0.875, -40.7],
      [0.91, -41.15],
      [1, -41.15],
    ];
    const ARRIVE_LOOK_X_KEYS: [number, number][] = [
      [0.73, 3],
      [0.8, 3],
      [0.91, 0.9],
      [1, 0.9],
    ];
    const ARRIVE_LOOK_Y_KEYS: [number, number][] = [
      [0.73, -1.2],
      [0.8, -1.45],
      [0.91, -1.95],
      [1, -1.95],
    ];

    const invEulerTmp = new THREE.Euler(-0.018, 0.18, -0.015, "ZYX");
    const startLocalTmp = new THREE.Vector3();
    const startLookDirTmp = new THREE.Vector3();
    const forwardVecTmp = new THREE.Vector3(0, 0, -1);
    const curLookDirTmp = new THREE.Vector3();
    const destLookTmp = new THREE.Vector3();
    const arriveCamTmp = new THREE.Vector3();
    const arriveLookTmp = new THREE.Vector3();
    const eulerTmp = new THREE.Euler(0, 0, 0, "XYZ");
    const camLocalTmp = new THREE.Vector3();
    const camPosTmp = new THREE.Vector3();
    const lookTargetTmp = new THREE.Vector3();
    const signalWorldPos = new THREE.Vector3();
    const hemiSkyDark = new THREE.Color(0xf2efe7);
    const hemiSkyKapur = new THREE.Color(0xf2efe7);
    const hemiGroundDark = new THREE.Color(0x132220);
    const hemiGroundKapur = new THREE.Color(0xd9d4c7);
    const flankDark = new THREE.Color(0x8cc2ba);
    const flankKapur = new THREE.Color(0xe8e2d3);

    let smoothProg = getProgress();
    let isVisible = true;

    const applySceneState = (prog: number, t: number, dtSec: number) => {
      const routeP = sampleMonotoneSpline(ROUTE_KEYS, prog);

      const artPosX = isNarrow ? 0.6 : 4.45;
      const artPosY = -0.08;
      const align = smootherstep(0.16, 0.44, routeP);
      const artRotX = 0.018 * (1 - smootherstep(0.1, 0.34, routeP));
      const artRotY = -0.18 * (1 - smootherstep(0.1, 0.34, routeP));
      const artRotZ = 0.015 * (1 - smootherstep(0.1, 0.34, routeP));

      portalGroup.position.set(artPosX, artPosY, 0);
      portalGroup.rotation.set(artRotX, artRotY, artRotZ);

      const sCamX = isNarrow ? 3.6 : 8.8;
      const sCamY = isNarrow ? 2.0 : 1.5;
      const sCamZ = isNarrow ? 22.8 : 17.3;
      const sLookX = isNarrow ? 0.25 : -0.85;
      const sLookY = isNarrow ? -1.15 : 0.45;

      startLocalTmp.set(sCamX - artPosX, sCamY - artPosY, sCamZ).applyEuler(invEulerTmp);
      startLookDirTmp
        .set(sLookX - sCamX, sLookY - sCamY, -sCamZ)
        .normalize()
        .applyEuler(invEulerTmp);

      CAM_X_KEYS[0][1] = startLocalTmp.x;
      CAM_X_KEYS[1][1] = startLocalTmp.x;
      CAM_Y_KEYS[0][1] = startLocalTmp.y;
      CAM_Y_KEYS[1][1] = startLocalTmp.y;
      CAM_Z_KEYS[0][1] = startLocalTmp.z;
      CAM_Z_KEYS[1][1] = startLocalTmp.z;

      camLocalTmp.set(
        sampleMonotoneSpline(CAM_X_KEYS, routeP),
        sampleMonotoneSpline(CAM_Y_KEYS, routeP),
        sampleMonotoneSpline(CAM_Z_KEYS, routeP)
      );

      eulerTmp.set(artRotX, artRotY, artRotZ, "XYZ");
      camPosTmp.copy(camLocalTmp).applyEuler(eulerTmp).add(portalGroup.position);

      curLookDirTmp
        .copy(startLookDirTmp)
        .lerp(forwardVecTmp, smootherstep(0.07, 0.36, routeP))
        .normalize()
        .applyEuler(eulerTmp);

      destLookTmp.set(isNarrow ? 3 : 0, isNarrow ? -2.45 : -1.15, -48);
      lookTargetTmp
        .copy(camPosTmp)
        .addScaledVector(curLookDirTmp, 10)
        .lerp(destLookTmp, smootherstep(0.86, 1, routeP));

      const arriveBlend = smootherstep(0.73, 0.79, prog);
      ARRIVE_X_KEYS[0][1] = isNarrow ? 3.1 : 4.45;
      ARRIVE_X_KEYS[1][1] = isNarrow ? 4.55 : 6.45;
      ARRIVE_X_KEYS[2][1] = isNarrow ? 4.4 : 6.6;
      ARRIVE_X_KEYS[3][1] = isNarrow ? 3.8 : 4.5;
      ARRIVE_X_KEYS[4][1] = isNarrow ? 3.8 : 4.5;

      ARRIVE_Z_KEYS[2][1] = isNarrow ? -38.2 : -39;
      ARRIVE_Z_KEYS[3][1] = isNarrow ? -38.7 : -40.7;
      ARRIVE_Z_KEYS[4][1] = isNarrow ? -38.9 : -41.15;
      ARRIVE_Z_KEYS[5][1] = isNarrow ? -38.9 : -41.15;

      ARRIVE_LOOK_X_KEYS[2][1] = isNarrow ? 3 : 0.9;
      ARRIVE_LOOK_X_KEYS[3][1] = isNarrow ? 3 : 0.9;
      ARRIVE_LOOK_Y_KEYS[2][1] = isNarrow ? -3.45 : -1.95;
      ARRIVE_LOOK_Y_KEYS[3][1] = isNarrow ? -3.45 : -1.95;

      arriveCamTmp.set(
        sampleMonotoneSpline(ARRIVE_X_KEYS, prog),
        sampleMonotoneSpline(ARRIVE_Y_KEYS, prog),
        sampleMonotoneSpline(ARRIVE_Z_KEYS, prog)
      );
      arriveLookTmp.set(
        sampleMonotoneSpline(ARRIVE_LOOK_X_KEYS, prog),
        sampleMonotoneSpline(ARRIVE_LOOK_Y_KEYS, prog),
        -48
      );

      camPosTmp.lerp(arriveCamTmp, arriveBlend);
      lookTargetTmp.lerp(arriveLookTmp, arriveBlend);
      if (isNarrow) {
        // Geser framing model 3D sedikit ke atas layar mobile agar tidak tertutup kartu copy di bawah
        lookTargetTmp.y -= 0.55 * smootherstep(0.18, 0.72, prog) * (1 - arriveBlend);
      }

      const fovBase =
        lerp(isMobile ? 44 : 42, 40, smootherstep(0.1, 0.32, routeP)) +
        5 * smootherstep(0.44, 0.65, routeP) -
        3 * smootherstep(0.85, 1, routeP);
      const nextFov = lerp(fovBase, isNarrow ? 37.5 : 36, smootherstep(0.79, 0.91, prog));
      if (Math.abs(camera.fov - nextFov) > 0.05) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }

      const mouseStr = (1 - smootherstep(0.08, 0.32, routeP)) * (isMobile ? 0.03 : 0.14);
      camPosTmp.x += smoothPX * mouseStr;
      camPosTmp.y -= smoothPY * mouseStr * 0.45;

      camera.position.copy(camPosTmp);
      camera.lookAt(lookTargetTmp);
      camera.updateMatrixWorld();

      // Update 40 Lamellae Telescoping + --embun Seam Inlays
      const passageMotion =
        smootherstep(0.285, 0.325, prog) * (1 - smootherstep(0.66, 0.715, prog));
      const passageTravel = smootherstep(0.3, 0.69, prog);
      const signalCharge = clamp(
        smoothstep(0.05, 0.95, align) * 0.68 + smoothstep(0, 0.35, passageTravel) * 0.32,
        0,
        1
      );
      const exitOpen = smootherstep(0.615, 0.69, prog);
      const exitCharge = smootherstep(0.285, 0.615, prog);
      const exitBurst =
        smootherstep(0.646, 0.673, prog) * (1 - smootherstep(0.697, 0.745, prog));

      portalSignalUniform.value.set(0.18 + 0.82 * align, passageTravel, t, signalCharge);
      portalPassageUniform.value.set(passageMotion, passageTravel, exitBurst);
      portalExitUniform.value.set(exitBurst, exitOpen);

      const portalHidden = prog >= 0.76;
      portalGroup.visible = !portalHidden;
      if (!portalHidden) {
        const alignS = align * align * (3 - 2 * align);
        for (let idx = 0; idx < lamellae.length; idx++) {
          const l = lamellae[idx];
          const pieceProgress = smoothstep(
            (1 - l.index / 39) * 0.18,
            (1 - l.index / 39) * 0.18 + 0.82,
            alignS
          );
          const unaligned = 1 - pieceProgress;
          l.mesh.position.copy(l.idlePos).lerp(l.openedPos, pieceProgress);
          l.mesh.position.y += Math.sin(t * 0.27 + l.station * 0.41) * 0.004 * unaligned;
          l.mesh.rotation.set(
            l.rotation.x * unaligned,
            l.rotation.y * unaligned,
            l.rotation.z * unaligned
          );
          const wave = Math.exp(-Math.pow((l.station - passageTravel) * 5, 2));
          l.mesh.scale.setScalar(1 + wave * passageMotion * 0.018);

          if (l.inlayMesh && l.inlayMat) {
            l.inlayMesh.position.copy(l.mesh.position);
            l.inlayMesh.rotation.copy(l.mesh.rotation);
            l.inlayMesh.scale.copy(l.mesh.scale);
            l.inlayMat.emissiveIntensity =
              0.14 +
              alignS * (0.3 + signalCharge * 0.35) +
              wave * passageMotion * 0.9;
          }
        }

        const shellLen = 5.24 + 22.76 * align;
        innerShellMesh.visible = align > 0.005;
        innerShellMat.opacity = smoothstep(0.02, 0.4, align);
        innerShellMesh.scale.z = shellLen + 0.14;
        innerShellMesh.position.z = 2.69 - shellLen;

        entryPlasmaUniforms.uTime.value = t;
        entryPlasmaUniforms.uOpen.value = smoothstep(0.24, 0.56, prog);
        entryPlasmaUniforms.uCharge.value = align;
        entryPlasmaPlane.visible = entryPlasmaUniforms.uOpen.value < 0.995;

        exitPlasmaUniforms.uTime.value = t;
        exitPlasmaUniforms.uCharge.value = exitCharge;
        exitPlasmaUniforms.uOpen.value = exitOpen;
        exitPlasmaUniforms.uPresence.value =
          smootherstep(0.285, 0.34, prog) * (1 - smootherstep(0.69, 0.745, prog));
        exitPlasmaPlane.visible = routeP > 0.34 && exitOpen < 0.995;
      }

      // Transition Atmosphere, Floor & Observatory Visibility
      const beyondMix = smootherstep(0.58, 0.84, routeP);
      skyDome.position.set(camera.position.x, 0, camera.position.z);
      skyUniforms.uTime.value = t;
      skyUniforms.uBeyondMix.value = beyondMix;
      skyUniforms.uCamPos.value.copy(camera.position);

      floorUniforms.uTime.value = t;
      floorUniforms.uBeyondMix.value = beyondMix;
      floorUniforms.uActivation.value = 1;
      floorUniforms.uCamPos.value.copy(camera.position);
      floorUniforms.uPortalXZ.value.set(artPosX, 0);

      exteriorGroup.visible = beyondMix < 0.97;

      workingBgColor.copy(darkHorizonColor).lerp(lightCourtColor, beyondMix);
      scene.background = workingBgColor;

      // Dynamic light progression calibrated for r149 non-decayed lighting & warm Kapur Stage 03
      hemiLight.color.copy(hemiSkyDark).lerp(hemiSkyKapur, beyondMix);
      hemiLight.groundColor.copy(hemiGroundDark).lerp(hemiGroundKapur, beyondMix);
      flankRimLight.color.copy(flankDark).lerp(flankKapur, beyondMix);

      const arriveLight = smootherstep(0.43, 0.59, routeP);
      const dayLight = lerp(lerp(0.58, 0.16, arriveLight), 0.96, smootherstep(0.79, 0.92, routeP));
      hemiLight.intensity = 0.24 + dayLight * lerp(0.28, 0.22, beyondMix);
      sunKeyLight.intensity = 0.52 + dayLight * lerp(0.96, 0.58, beyondMix);
      flankRimLight.intensity = 0.24 + dayLight * lerp(0.58, 0.36, beyondMix);
      bounceFillLight.intensity = 0.12 + dayLight * lerp(0.20, 0.12, beyondMix);
      observatoryKeyLight.intensity = 0.46 * smootherstep(0.68, 0.82, prog);
      passageGlowLight.intensity =
        smootherstep(0.48, 0.57, routeP) * (1 - smootherstep(0.79, 0.89, routeP)) * 1.65;
      passageGlowLight.position.set(camera.position.x, camera.position.y + 1.2, camera.position.z - 3);
      exitLight.intensity = smootherstep(0.58, 0.8, routeP) * 0.66;

      // Stage 03 Observatory Update
      const showDestination = beyondMix > 0.02 && exitOpen > 0;
      destinationGroup.visible = showDestination;
      if (showDestination) {
        floorInlayUniforms.uTerraceTime.value = t;
        floorInlayUniforms.uFloorRings.value = smootherstep(0.7, 0.9, prog);
        floorInlayUniforms.uFloorSpokes.value = smootherstep(0.68, 0.86, prog);
        floorInlayUniforms.uRobotRing.value = smootherstep(0.67, 0.83, prog);
        floorGuideUniform.value = smootherstep(0.75, 0.91, prog);

        const approachDraw = smootherstep(0.64, 0.745, prog);
        const bridgeLen = Math.hypot(3 - artPosX, -16.2);
        approachGroup.position.set((artPosX + 3) / 2, -3.475, -33.7);
        approachGroup.rotation.set(
          -Math.atan2(0.45, bridgeLen),
          Math.atan2(artPosX - 3, 16.2),
          0
        );
        approachGroup.scale.z = Math.max(0.01, bridgeLen * approachDraw);

        const finaleProg = clamp((prog - 0.94) / 0.06, 0, 1);
        const deploy = smootherstep(0.735, 0.865, prog);
        const tracePhase =
          t * 0.6 +
          Math.PI * 1.7 * smootherstep(0.735, 0.94, prog) +
          22.4 * Math.pow(finaleProg, 3);
        const currentStr =
          0.42 * smootherstep(0.75, 0.88, prog) +
          0.58 * smootherstep(0.06, 0.76, finaleProg);
        const charge = smootherstep(0.06, 0.76, finaleProg);

        traceTimeUniform.value = tracePhase;
        traceChargeUniform.value = currentStr;

        const sigX = isNarrow ? 3.35 : 1.9;
        const sigY = isNarrow ? -1.42 : -0.75;
        signalGroup.position.set(
          sigX,
          sigY + Math.sin(t * 0.32) * 0.055 * (1 - charge),
          -57.5
        );
        signalGroup.scale.setScalar(isNarrow ? 0.36 : 0.64);
        signalGroup.rotation.y = -0.28 + Math.sin(t * 0.14) * 0.055 * (1 - charge);
        brandMarkGroup.rotation.set(
          -0.04,
          0.26 + Math.sin(t * 0.22) * 0.08 * (1 - charge) + Math.PI * 2 * smootherstep(0.48, 0.96, finaleProg),
          0.04
        );
        banyuInkMat.emissiveIntensity = 0.04 + charge * charge * 0.1;
        banyuEmbunEdgeMat.emissiveIntensity = 0.06 + charge * charge * 0.16;
        banyuAquaMat.emissiveIntensity = 0.08 + currentStr * 0.1 + charge * 0.14;
        orbitalLeafGlowMat.emissiveIntensity = charge * charge * 0.45;
        orbitalPineGlowMat.emissiveIntensity = charge * charge * 0.35;

        for (let wsIdx = 0; wsIdx < waveSliceMeshes.length; wsIdx++) {
          const ws = waveSliceMeshes[wsIdx];
          ws.mesh.position.x = reduceMotion ? 0 : Math.sin(t * 1.4 - ws.idx * 0.55) * 0.032;
        }

        orbitalLeaves[0].rotation.set(
          (-0.32 + Math.sin(tracePhase * 0.42) * 0.18) * deploy,
          tracePhase * 0.72 - 0.62,
          deploy * 0.14 + tracePhase * 0.12
        );
        orbitalLeaves[1].rotation.set(
          deploy * 0.62 + tracePhase * 0.38,
          -tracePhase * 0.94 + 0.82,
          -deploy * 0.28
        );
        orbitalLeaves[2].rotation.set(
          -deploy * 0.84,
          tracePhase * 1.18 + 1.55,
          deploy * (0.18 + Math.sin(tracePhase * 0.55) * 0.24)
        );
        for (let idx = 0; idx < orbitalLeaves.length; idx++) {
          orbitalLeaves[idx].scale.setScalar((1 - idx * 0.12) * (1 + deploy * 0.045 + charge * 0.045));
        }

        cloudTimeUniform.value = t;
        for (let cpIdx = 0; cpIdx < cloudPlanes.length; cpIdx++) {
          const cp = cloudPlanes[cpIdx];
          cp.mesh.position.x = cp.x + Math.sin(t * cp.speed + cp.phase) * 3.8;
          cp.mesh.position.y = cp.y + Math.sin(t * 0.1 + cp.phase) * 0.32;
        }

        const pondReveal = smootherstep(0.68, 0.82, prog);
        bioPondGroup.scale.setScalar((isMobile ? 0.86 : 1.0) * (0.9 + 0.1 * pondReveal));
        basinCausticUniforms.uTime.value = t;
        waterSurfaceUniforms.uTime.value = t;
        oledUniforms.uTime.value = t;

        coreHubHead.rotation.y = -0.24 + smoothPX * 0.16;
        coreHubHead.rotation.x = smoothPY * 0.06;

        for (let b = 0; b < bubbleCount; b++) {
          const s = bubbleSeeds[b];
          const riseT = (t * s.speed + s.phase) % 1;
          const a = s.angle + t * 0.25;
          const wobble = Math.sin(t * 3.2 + b) * 0.05;
          bubblePositions[b * 3] = Math.cos(a) * s.radius + wobble;
          bubblePositions[b * 3 + 1] = 0.22 + riseT * (waterHeight - 0.14);
          bubblePositions[b * 3 + 2] = Math.sin(a) * s.radius - wobble;
        }
        bubbleGeo.attributes.position.needsUpdate = true;

        for (let f = 0; f < catfishList.length; f++) {
          const fish = catfishList[f];
          fish.angle += reduceMotion ? 0 : dtSec * fish.speed * fish.dir;
          const cursorPullR = fish.orbitR + smoothPY * 0.14 * (f % 2 === 0 ? 1 : -1);
          const fx = Math.cos(fish.angle) * cursorPullR + smoothPX * 0.18;
          const fz = Math.sin(fish.angle) * cursorPullR;
          const fy = fish.baseY + Math.sin(t * 1.35 + fish.phase) * 0.055;

          fish.rig.root.position.set(fx, fy, fz);
          const tangentYaw = Math.atan2(
            -Math.sin(fish.angle) * fish.dir,
            Math.cos(fish.angle) * fish.dir
          );
          fish.rig.root.rotation.y = tangentYaw + smoothPX * 0.14;
          fish.rig.root.rotation.z = -0.06 * fish.dir;

          const swimT = t * (5.2 + fish.speed * 3.0) + fish.phase * 2.0;
          fish.rig.seg1.rotation.y = reduceMotion ? 0 : Math.sin(swimT) * 0.14;
          fish.rig.seg2.rotation.y = reduceMotion ? 0 : Math.sin(swimT - 0.85) * 0.22;
          fish.rig.seg3.rotation.y = reduceMotion ? 0 : Math.sin(swimT - 1.7) * 0.34;
          fish.rig.pectoralL.rotation.x = Math.PI / 2 - 0.18 + Math.sin(swimT * 0.65) * 0.14;
          fish.rig.pectoralR.rotation.x = Math.PI / 2 - 0.18 - Math.sin(swimT * 0.65) * 0.14;
        }

        contactPointLight.intensity = pondReveal * 1.15;
        bioPondGroup.getWorldPosition(signalWorldPos);
        contactPointLight.position.set(signalWorldPos.x, signalWorldPos.y + 1.4, signalWorldPos.z + 0.5);
      }
    };

    const tick = (now: number) => {
      rafId = 0;
      if (disposed || !isVisible || !prewarmDone) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!pausedRef.current && !reduceMotion) {
        elapsed += dt;
      }

      const rawProg = getProgress();
      if (reduceMotion || Math.abs(rawProg - smoothProg) < 0.0001) {
        smoothProg = rawProg;
      } else {
        smoothProg = lerp(smoothProg, rawProg, 1 - Math.exp(-dt / 0.075));
      }

      smoothPX = lerp(smoothPX, targetPX, 1 - Math.exp(-4.5 * dt));
      smoothPY = lerp(smoothPY, targetPY, 1 - Math.exp(-4.5 * dt));

      applySceneState(smoothProg, elapsed, dt);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };

    // Staged async GPU pre-warming across separate rAF frames so scrolling never stutters on first pass
    let prewarmStep = 0;
    const runPrewarm = () => {
      if (disposed) return;
      if (prewarmStep === 0) {
        portalGroup.visible = true;
        exteriorGroup.visible = true;
        destinationGroup.visible = true;
        entryPlasmaPlane.visible = true;
        exitPlasmaPlane.visible = true;
        innerShellMesh.visible = true;
        renderer.compile(scene, camera);
        prewarmCallbackRef.current?.(0.55, false);
      } else if (prewarmStep === 1) {
        renderer.setSize(256, 256, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        applySceneState(0.02, 0.25, 0.016);
        renderer.render(scene, camera);
        prewarmCallbackRef.current?.(0.72, false);
      } else if (prewarmStep === 2) {
        applySceneState(0.5, 0.45, 0.016);
        renderer.render(scene, camera);
        prewarmCallbackRef.current?.(0.86, false);
      } else if (prewarmStep === 3) {
        applySceneState(0.9, 0.65, 0.016);
        renderer.render(scene, camera);
        prewarmCallbackRef.current?.(0.96, false);
      } else {
        handleResize();
        smoothProg = getProgress();
        applySceneState(smoothProg, 0, 0);
        renderer.render(scene, camera);
        prewarmDone = true;
        lastTime = performance.now();
        prewarmCallbackRef.current?.(1, true);
        if (isVisible) {
          rafId = requestAnimationFrame(tick);
        }
        return;
      }
      prewarmStep += 1;
      prewarmRafId = requestAnimationFrame(runPrewarm);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const visible = Boolean(entries[0]?.isIntersecting);
        isVisible = visible;
        if (!visible && rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        } else if (visible && prewarmDone && !disposed && !rafId) {
          lastTime = performance.now();
          rafId = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.01 }
    );
    io.observe(host);

    prewarmRafId = requestAnimationFrame(runPrewarm);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(prewarmRafId);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.traverse((obj: any) => {
        if (obj.geometry && typeof obj.geometry.dispose === "function") {
          obj.geometry.dispose();
        }
        const mats = Array.isArray(obj.material)
          ? obj.material
          : obj.material
            ? [obj.material]
            : [];
        mats.forEach((m: any) => {
          if (typeof m.dispose === "function") m.dispose();
        });
      });
      portalPlateGeos.forEach((g) => g.dispose());
      inlayMats.forEach((m) => m.dispose());
      orbitalTraceMats.forEach((m) => m.dispose());
      tileableNoiseTex.dispose();
      brushedMaps.darkAlbedoMap.dispose();
      brushedMaps.kapurAlbedoMap.dispose();
      brushedMaps.roughnessMap.dispose();
      brushedMaps.normalMap.dispose();
      cloudDataTex.dispose();
      studioEnvRT.dispose();
      renderer.dispose();
    };
  }, []);

  if (fallback) {
    return (
      <div ref={hostRef} className={`relative h-full w-full ${className}`.trim()}>
        <ThreeUITopoBathymetryCanvas
          scrollProgress={scrollProgress}
          interactive={true}
          intensity={1}
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div ref={hostRef} className={`relative h-full w-full overflow-hidden ${className}`.trim()}>
      <canvas
        ref={canvasRef}
        aria-label="Visualisasi 3D Portal Multi-Kolam BanyuWening"
        className="block h-full w-full"
      />
    </div>
  );
}
