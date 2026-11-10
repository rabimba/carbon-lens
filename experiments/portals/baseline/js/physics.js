/**
 * Multiverse Physics Engine (js/physics.js)
 * - Exact CPU SDF & Gradient Mirror matching GLSL world geometry & sculpted 3D portals
 * - 6-DOF Newtonian/Relativistic Craft Flight Integrator (Velocity Verlet, coordinated bank angle
 *   phi = atan(a_lat / g_eff), proper G-load, drag, gravity slingshot, repulsive SDF wall barrier,
 *   and 100% cross-portal momentum conservation)
 * - Interactive & Ambient Cross-Portal Newtonian Test Spheres (Velocity Verlet, Archimedes buoyancy,
 *   quadratic hydrodynamic/aerodynamic drag, Prandtl wind shear, 3D curl-noise, GM/r^2 singularity pull,
 *   SDF normal restitution v' = v - (1+e)(v·n)n, and live cross-portal transit!)
 */

import { WORLD_LENGTH, PORTAL_RADIUS, STANDARD_GRAVITY } from './worlds.js';
import { clamp, lerp, smoothstep, flightPathXY, normalize3, cross3, dot3 } from './math.js';

const PI = 3.14159265359;
const TAU = 6.28318530718;

// ============================================================================
// EXACT CPU NOISE & SDF MIRROR (Parity with common.glsl.js & worlds.glsl.js)
// ============================================================================

function fract(x) {
  return x - Math.floor(x);
}

function modGLSL(x, y) {
  return x - y * Math.floor(x / y);
}

function hash11(p) {
  let q = fract(p * 0.1031);
  q *= q + 33.33;
  q *= q + q;
  return fract(q);
}

function hash21(px, py) {
  let x = fract(px * 0.1031);
  let y = fract(py * 0.1031);
  let z = x;
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d;
  y += d;
  z += d;
  return fract((x + y) * z);
}

function noise2(px, py) {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = px - ix;
  const fy = py - iy;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);

  const a = hash21(ix, iy);
  const b = hash21(ix + 1.0, iy);
  const c = hash21(ix, iy + 1.0);
  const d = hash21(ix + 1.0, iy + 1.0);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function fbm2Fast(px, py) {
  let x = px, y = py;
  let f = 0.55 * noise2(x, y);
  let nx = (0.80 * x - 0.60 * y) * 2.03;
  let ny = (0.60 * x + 0.80 * y) * 2.03;
  x = nx; y = ny;
  f += 0.30 * noise2(x, y);
  nx = (0.80 * x - 0.60 * y) * 2.01;
  ny = (0.60 * x + 0.80 * y) * 2.01;
  f += 0.15 * noise2(nx, ny);
  return f;
}

function smin(a, b, k) {
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return lerp(b, a, h) - k * h * (1.0 - h);
}

function smax(a, b, k) {
  return -smin(-a, -b, k);
}

function sdBox(px, py, pz, bx, by, bz) {
  const qx = Math.abs(px) - bx;
  const qy = Math.abs(py) - by;
  const qz = Math.abs(pz) - bz;
  const mx = Math.max(qx, 0.0);
  const my = Math.max(qy, 0.0);
  const mz = Math.max(qz, 0.0);
  return Math.hypot(mx, my, mz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0.0);
}

function sdTorusZ(px, py, pz, tx, ty) {
  const qx = Math.hypot(px, py) - tx;
  return Math.hypot(qx, pz) - ty;
}

function sdHexPrismY(px, py, pz, hx, hy) {
  let x = Math.abs(px);
  const y = Math.abs(py);
  let z = Math.abs(pz);
  const kxyDot = -0.8660254 * x + 0.5 * z;
  const m = 2.0 * Math.min(kxyDot, 0.0);
  x -= m * -0.8660254;
  z -= m * 0.5;
  const cx = clamp(x, -0.57735 * hx, 0.57735 * hx);
  const dx = Math.hypot(x - cx, z - hx) * (z - hx < 0.0 ? -1.0 : 1.0);
  const dy = y - hy;
  return Math.min(Math.max(dx, dy), 0.0) + Math.hypot(Math.max(dx, 0.0), Math.max(dy, 0.0));
}

function rot2(x, y, a) {
  // Exact parity with GLSL `v.xy *= rot2D(a)` where rot2D(a) = mat2(c, -s, s, c)
  const c = Math.cos(a), s = Math.sin(a);
  return [c * x - s * y, s * x + c * y];
}

function eulerPrecessRingCPU(px, py, pz, omega3, nutationTheta, phase, t) {
  const cosTh = Math.cos(nutationTheta);
  const psiPrec = phase + (2.0 * omega3 / Math.max(Math.abs(cosTh), 0.35)) * t;
  const phiBody = -omega3 * t + phase * 0.5;

  let [qx, qy] = rot2(px, py, psiPrec);
  let qz = pz;
  [qy, qz] = rot2(qy, qz, nutationTheta);
  [qx, qy] = rot2(qx, qy, phiBody);
  return [qx, qy, qz];
}

function trimPortalZones(d, z, margin) {
  const clearZone = Math.min(z - margin, (WORLD_LENGTH - margin) - z);
  return smax(d, -clearZone, 3.5);
}

function carveCorridorCPU(dWorld, px, py, pz, cx, cy, world) {
  const radialDist = Math.hypot(px - cx, py - cy);
  const dTunnel = world.corridorRadius - radialDist;
  const dEntry = 14.5 - Math.hypot(px, py - world.baseHeight, pz);
  const dExit = 14.5 - Math.hypot(px, py - world.baseHeight, pz - WORLD_LENGTH);
  let d = smax(dWorld, dTunnel, 2.8);
  d = smax(d, Math.max(dEntry, dExit), 3.2);
  return d;
}

function mapSinglePortalCPU(px, py, pz, portalZ, baseHeight, time) {
  const qx = px;
  const qy = py - baseHeight;
  const qz = pz - portalZ;
  const bDist = Math.hypot(qx, qy, qz) - 18.5;
  if (bDist > 2.0) return bDist;

  // Main monolithic threshold ring (inner aperture r < 8.05 is 100% open!)
  const dMainRing = Math.min(
    sdTorusZ(qx, qy, qz, 9.35, 0.85),
    sdTorusZ(qx, qy, qz, 8.23, 0.16)
  );
  // Euler-precessing outer gyro-halo
  const [gx, gy, gz] = eulerPrecessRingCPU(qx, qy, qz, 0.28, 0.20, portalZ * 0.04, time);
  const dGyro = sdTorusZ(gx, gy, gz, 11.35, 0.22);

  // Sentinel pylons
  const taper = clamp((qy + 13.5) * 0.03, -0.4, 0.5);
  const dPylon = sdBox(Math.abs(qx) - 14.2, qy + 1.5, qz, 0.95 - taper * 0.45, 11.5, 1.15 - taper * 0.45) - 0.12;
  return Math.min(Math.min(dMainRing, dGyro), dPylon);
}

/**
 * Evaluates the solid Signed Distance Field at (px, py, pz) in the given world.
 * Note: For World 6 (Cryogenic Aurora), liquid water at y=2.4 is handled via Archimedes
 * fluid buoyancy rather than rigid solid bounce so probes can splash and float!
 */
const _tmpPath = [0, 0];
export function evalWorldSDF(px, py, pz, world, time) {
  flightPathXY(pz, world, _tmpPath);
  const cx = _tmpPath[0];
  const cy = _tmpPath[1];
  const qx = px - cx;
  const qy = py - cy;

  let dWorld = 100.0;

  switch (world.id) {
    case 0: {
      const cloudWave = fbm2Fast(px * 0.055 + time * 0.10, pz * 0.055 + time * 0.06) * 4.2;
      const dClouds = py - (1.8 + cloudWave);
      const cellId = Math.floor((pz + 14.0) / 28.0);
      const cz = modGLSL(pz + 14.0, 28.0) - 14.0;
      const archR = 16.2 + 2.0 * Math.sin(cellId * 1.7 + world.instanceSeed);
      const dPillars = sdBox(Math.abs(qx) - archR, qy + 4.0, cz, 1.65, 18.0, 1.85) - 0.15;
      let dArch = sdTorusZ(qx, qy - 3.5, cz, archR, 1.45);
      dArch = Math.max(dArch, -(qy - 3.5));

      const [gox, goy, goz] = eulerPrecessRingCPU(qx, qy - 9.8, cz, 0.34, 0.48, cellId * 1.3, time);
      const [gix, giy, giz] = eulerPrecessRingCPU(qx, qy - 9.8, cz, -0.52, 0.72, cellId * 2.7 + 1.1, time);
      const dHalo = Math.min(sdTorusZ(gox, goy, goz, 7.6, 0.25), sdTorusZ(gix, giy, giz, 5.4, 0.20));

      const dStruct = trimPortalZones(Math.min(Math.min(dPillars, dArch), dHalo), pz, 18.0);
      dWorld = Math.min(
        carveCorridorCPU(dClouds, px, py, pz, cx, cy, world),
        carveCorridorCPU(dStruct, px, py, pz, cx, cy, world)
      );
      break;
    }
    case 1: {
      const floorH = 1.4 + 3.4 * fbm2Fast(px * 0.065, pz * 0.065);
      const wallRise = smoothstep(14.0, 38.0, Math.abs(qx)) * 22.0;
      const dFloor = py - (floorH + wallRise);
      const cellId = Math.floor((pz + 11.0) / 22.0);
      const cz = modGLSL(pz + 11.0, 22.0) - 11.0;
      const ribR = 14.8 + 1.8 * Math.cos(cellId * 1.3);
      const dRib = trimPortalZones(sdTorusZ(qx, qy + 1.0, cz, ribR, 1.45), pz, 17.0);
      dWorld = Math.min(
        carveCorridorCPU(dFloor, px, py, pz, cx, cy, world),
        carveCorridorCPU(dRib, px, py, pz, cx, cy, world)
      );
      break;
    }
    case 2: {
      const cellZ = Math.floor((pz + 8.0) / 16.0);
      const cz = modGLSL(pz + 8.0, 16.0) - 8.0;
      const sideSign = qx >= 0.0 ? 1.0 : -1.0;
      const hSeed = hash11(cellZ * 13.7 + sideSign * 7.1 + world.instanceSeed);
      const dCol = sdHexPrismY(Math.abs(qx) - (14.5 + hSeed * 5.0), qy + 3.0 - hSeed * 6.0, cz, 2.4, 7.5 + hSeed * 4.0);
      const dSlab = sdHexPrismY(qx - Math.sin(cellZ * 1.9) * 3.0, qy + 12.2, cz, 5.2, 0.85);
      const dTotal = trimPortalZones(Math.min(dCol, dSlab), pz, 17.0);
      dWorld = carveCorridorCPU(dTotal, px, py, pz, cx, cy, world);
      break;
    }
    case 3: {
      let terr = fbm2Fast(px * 0.045, pz * 0.045) * 9.0;
      terr += Math.sin(terr * 1.8) * 0.45;
      const valleyWall = smoothstep(13.0, 36.0, Math.abs(qx)) * 24.0;
      let dTerrain = py - (0.5 + terr * 0.55 + valleyWall);
      const islandCell = Math.floor((pz + 18.0) / 36.0);
      const iz = modGLSL(pz + 18.0, 36.0) - 18.0;
      const side = modGLSL(islandCell, 2.0) < 0.5 ? 1.0 : -1.0;
      const pix = qx - side * 19.5;
      const piy = qy - (4.5 + 3.0 * Math.sin(islandCell * 2.3));
      const rHoriz = Math.hypot(pix, iz);
      const coneR = clamp(8.2 + piy * 0.65, 0.5, 9.5) + 0.9;
      const dIsland = trimPortalZones(Math.max(rHoriz - coneR, Math.max(piy - 2.2, -13.5 - piy)), pz, 18.0);
      dTerrain = smin(dTerrain, dIsland, 1.8);
      dWorld = carveCorridorCPU(dTerrain, px, py, pz, cx, cy, world);
      break;
    }
    case 4: {
      const [rx, ry] = rot2(qx, qy, Math.sin(pz * 0.028) * 0.24);
      const rz = modGLSL(pz + 9.0, 18.0) - 9.0;
      let zx = rx * 0.115, zy = ry * 0.115, zz = rz * 0.115;
      let dr = 0.115;
      const foldLimit = 1.04 + 0.020 * Math.sin(time * 1.35 - pz * 0.06);
      for (let i = 0; i < 5; i++) {
        zx = clamp(zx, -foldLimit, foldLimit) * 2.0 - zx;
        zy = clamp(zy, -foldLimit, foldLimit) * 2.0 - zy;
        zz = clamp(zz, -foldLimit, foldLimit) * 2.0 - zz;
        const r2 = zx * zx + zy * zy + zz * zz;
        const k = clamp(Math.max(0.52 / Math.max(r2, 0.14), 1.0), 1.0, 3.6);
        zx *= k; zy *= k; zz *= k; dr *= k;
        zx = zx * 2.12 - 1.35;
        zy = zy * 2.12 - 1.28;
        zz = zz * 2.12 - 1.12;
        dr = dr * 2.12 + 0.115;
      }
      const dFractal = trimPortalZones((Math.hypot(zx, zy, zz) - 2.65) / dr, pz, 18.0);
      dWorld = carveCorridorCPU(dFractal, px, py, pz, cx, cy, world);
      break;
    }
    case 5: {
      // Asymmetric Bagnold aeolian dunes (gentle windward slope, steep 34° slip-face)
      const dpx = px * 0.055;
      const dpy = pz * 0.055;
      const s1 = dpx * 1.4 + Math.cos(dpy * 0.8) * 1.2;
      const dune1 = 1.0 - Math.abs(Math.sin(s1 + 0.28 * Math.sin(s1)));
      const dune2 = 1.0 - Math.abs(Math.sin(dpy * 1.9 - dpx * 0.7 + 1.4));
      const duneH = 2.0 + (dune1 * 4.6 + dune2 * 2.4);
      const dDunes = py - duneH;

      const cellId = Math.floor((pz + 15.0) / 30.0);
      const cz = modGLSL(pz + 15.0, 30.0) - 15.0;
      const side = qx >= 0.0 ? 1.0 : -1.0;
      const oy = qy - (2.0 + 2.5 * Math.sin(time * 0.9 + cellId * 2.0 + side));
      const taper = clamp((oy + 8.0) * 0.045, -0.2, 0.75);
      const dOb = trimPortalZones(sdBox(Math.abs(qx) - 16.5, oy, cz, 1.9 - taper, 7.5, 1.9 - taper), pz, 18.0);
      dWorld = Math.min(
        carveCorridorCPU(dDunes, px, py, pz, cx, cy, world),
        carveCorridorCPU(dOb, px, py, pz, cx, cy, world)
      );
      break;
    }
    case 6: {
      const r1 = Math.max(0.0, 1.0 - Math.abs(noise2(px * 0.065, pz * 0.065) * 2.0 - 1.0));
      const r2 = Math.max(0.0, 1.0 - Math.abs(noise2(px * 0.15 + 4.2, pz * 0.15 + 4.2) * 2.0 - 1.0));
      const ridgeH = Math.pow(r1, 1.6) * 18.0 + r2 * 5.5;
      const fjordMask = smoothstep(11.5, 24.0, Math.abs(qx));
      let dIce = py - (0.5 + ridgeH * fjordMask);

      const qsz = modGLSL(pz + 16.0, 32.0) - 16.0;
      const [spx, spy] = rot2(Math.abs(qx) - 15.2, qy + 2.0, -0.18);
      const spireTaper = clamp((spy + 8.0) * 0.055, 0.0, 1.4);
      const dSpire = trimPortalZones(sdHexPrismY(spx, spy, qsz, Math.max(0.4, 2.3 - spireTaper), 12.5), pz, 18.0);
      dIce = smin(dIce, dSpire, 1.1);

      dWorld = carveCorridorCPU(dIce, px, py, pz, cx, cy, world);
      break;
    }
    default: {
      const cellId = Math.floor((pz + 13.0) / 26.0);
      const cz = modGLSL(pz + 13.0, 26.0) - 13.0;
      const omegaA = 18.5 / Math.pow(15.2, 1.5);
      const omegaB = 18.5 / Math.pow(21.5, 1.5);
      const [rax, ray, raz] = eulerPrecessRingCPU(qx, qy, cz, omegaA, 0.26, cellId * 0.9, time);
      const [rbx, rby, rbz] = eulerPrecessRingCPU(qx, qy, cz, -omegaB, 0.34, cellId * 2.1 + 1.4, time);
      const dRingA = sdTorusZ(rax, ray, raz, 15.2, 0.58);
      const dRingB = sdTorusZ(rbx, rby, rbz, 21.5, 0.85);
      dWorld = carveCorridorCPU(trimPortalZones(Math.min(dRingA, dRingB), pz, 17.0), px, py, pz, cx, cy, world);
      break;
    }
  }

  const dPortalExit = mapSinglePortalCPU(px, py, pz, WORLD_LENGTH, world.baseHeight, time);
  const dPortalEntry = mapSinglePortalCPU(px, py, pz, 0.0, world.baseHeight, time);
  return Math.min(dWorld, Math.min(dPortalExit, dPortalEntry));
}

export function evalSDFNormal(px, py, pz, world, time, out = [0, 1, 0]) {
  const e = 0.04;
  const d1 = evalWorldSDF(px + e, py - e, pz - e, world, time);
  const d2 = evalWorldSDF(px - e, py - e, pz + e, world, time);
  const d3 = evalWorldSDF(px - e, py + e, pz - e, world, time);
  const d4 = evalWorldSDF(px + e, py + e, pz + e, world, time);
  const nx = d1 - d2 - d3 + d4;
  const ny = -d1 - d2 + d3 + d4;
  const nz = -d1 + d2 - d3 + d4;
  return normalize3(out, nx, ny, nz);
}

/**
 * Divergence-Free 3D Curl-Noise Velocity Field (u = ∇ × Ψ, so ∇ · u = 0)
 * Used for incompressible atmospheric snow & particle turbulence.
 */
export function evalCurlFlow(px, py, pz, time, out = [0, 0, 0]) {
  const s = 0.12;
  const x = px * s, y = py * s, z = pz * s + time * 0.25;
  const e = 0.08;
  const psiX_dy = (noise2(y + e, z) - noise2(y - e, z)) / (2 * e);
  const psiX_dz = (noise2(y, z + e) - noise2(y, z - e)) / (2 * e);
  const psiY_dx = (noise2(x + e, z + 7.3) - noise2(x - e, z + 7.3)) / (2 * e);
  const psiY_dz = (noise2(x, z + e + 7.3) - noise2(x, z - e + 7.3)) / (2 * e);
  const psiZ_dx = (noise2(x + e + 13.1, y) - noise2(x - e + 13.1, y)) / (2 * e);
  const psiZ_dy = (noise2(x + 13.1, y + e) - noise2(x + 13.1, y - e)) / (2 * e);

  out[0] = (psiZ_dy - psiY_dz) * 2.2;
  out[1] = (psiX_dz - psiZ_dx) * 1.4;
  out[2] = (psiY_dx - psiX_dy) * 2.2;
  return out;
}

// ============================================================================
// 6-DOF NEWTONIAN / RELATIVISTIC CRAFT FLIGHT STATE
// ============================================================================

export class CraftPhysics {
  constructor(initialWorld) {
    const startZ = 12.0;
    const p0 = flightPathXY(startZ, initialWorld, [0, 0]);
    this.pos = [p0[0], p0[1], startZ];
    this.vel = [0.0, 0.0, initialWorld.cruiseSpeed];
    this.acc = [0.0, 0.0, 0.0];
    this.properAcc = [0.0, STANDARD_GRAVITY, 0.0];
    this.gLoad = 1.0;
    this.speed = initialWorld.cruiseSpeed;
    this.radialPortalVel = initialWorld.cruiseSpeed;

    // Rotational roll inertia state (I * phi'' + c * phi' + k * (phi - phi_eq) = 0)
    this.roll = 0.0;
    this.rollVel = 0.0;

    // Smoothed camera attitude vectors
    this.forward = [0.0, 0.0, 1.0];
    this.right = [1.0, 0.0, 0.0];
    this.up = [0.0, 1.0, 0.0];
  }

  _computeAccelerations(pos, vel, world, nextWorld, time, warpBoost, outAcc, outGrav) {
    const z = clamp(pos[2], 0.0, WORLD_LENGTH);
    const eps = 0.12;
    const ref0 = flightPathXY(z, world, [0, 0]);
    const refM = flightPathXY(Math.max(0.0, z - eps), world, [0, 0]);
    const refP = flightPathXY(Math.min(WORLD_LENGTH, z + eps), world, [0, 0]);

    const dz = Math.max(1e-4, Math.min(WORLD_LENGTH, z + eps) - Math.max(0.0, z - eps));
    const dxRef = (refP[0] - refM[0]) / dz;
    const dyRef = (refP[1] - refM[1]) / dz;

    const d2xRef = (z > eps && z < WORLD_LENGTH - eps)
      ? (refP[0] - 2.0 * ref0[0] + refM[0]) / (eps * eps)
      : 0.0;
    const d2yRef = (z > eps && z < WORLD_LENGTH - eps)
      ? (refP[1] - 2.0 * ref0[1] + refM[1]) / (eps * eps)
      : 0.0;

    // 1. Gravitational field (uniform world gravity + Black Hole GM/(r - r_s)^2 tidal well)
    let gx = world.gravity[0];
    let gy = world.gravity[1];
    let gz = world.gravity[2];

    if (world.bhGM && world.bhAttractorPos) {
      const bx = world.bhAttractorPos[0] - pos[0];
      const by = world.bhAttractorPos[1] - pos[1];
      const bz = world.bhAttractorPos[2] - pos[2];
      const r = Math.hypot(bx, by, bz);
      const effR = Math.max(24.0, r - (world.bhSchwarzschildR || 6.0));
      const gMag = world.bhGM / (effR * effR);
      gx += (bx / r) * gMag * 0.25;
      gy += (by / r) * gMag * 0.25;
      gz += (bz / r) * gMag * 0.48; // Gravitational slingshot acceleration!
    }
    outGrav[0] = gx;
    outGrav[1] = gy;
    outGrav[2] = gz;

    // 2. Aerodynamic / Hydrodynamic Quadratic Drag: F_d = -1/2 * rho * CdA/m * |v_rel| * v_rel
    // Craft streamlined ballistic coefficient keeps submarine & atmospheric transit smooth
    const dragCoeff = world.fluidDensity > 100.0
      ? 0.042 // Streamlined hydro-craft in seawater (real deceleration upon entering from air/vacuum!)
      : world.fluidDensity * 0.0085;
    const rvx = vel[0] - world.windVec[0] * 0.25;
    const rvy = vel[1] - world.windVec[1] * 0.25;
    const rvz = vel[2] - world.windVec[2] * 0.25;
    const relSpeed = Math.hypot(rvx, rvy, rvz);
    const dragX = -dragCoeff * relSpeed * rvx;
    const dragY = -dragCoeff * relSpeed * rvy;
    const dragZ = -dragCoeff * relSpeed * rvz;

    // 3. Guidance Thrusters & Aerodynamic Lift:
    // Blend target cruise speed smoothly near portal threshold so thrust doesn't step discontinuously
    const portalProx = smoothstep(WORLD_LENGTH - 34.0, WORLD_LENGTH, z);
    const targetCruise = lerp(world.cruiseSpeed, nextWorld.cruiseSpeed, portalProx) * (1.0 + warpBoost);

    // Subtle mechanical energy exchange (dives slightly boost speed, climbs trade kinetic for potential)
    const vz = Math.max(4.0, vel[2]);
    const desiredVx = dxRef * vz;
    const desiredVy = dyRef * vz;

    // Tighten corridor centering smoothly as we approach the 8.05m portal aperture
    const apertureFocus = 1.0 + 1.4 * smoothstep(WORLD_LENGTH - 28.0, WORLD_LENGTH - 2.0, z);
    const wn = 2.65 * apertureFocus;
    const zeta = 1.05;

    // Feedforward centripetal curve acceleration + PD tracking + anti-gravity lift
    const liftFactor = 0.94; // Leaves 6% natural gravitational dip/climb feel!
    let thrustX = vz * vz * d2xRef + wn * wn * (ref0[0] - pos[0]) + 2.0 * zeta * wn * (desiredVx - vel[0]) - gx * liftFactor;
    let thrustY = vz * vz * d2yRef + wn * wn * (ref0[1] - pos[1]) + 2.0 * zeta * wn * (desiredVy - vel[1]) - gy * liftFactor;

    // Longitudinal thrust + Portal Threshold Casimir/Gravitational Funnel surge
    const distToNearestPortal = Math.min(z, WORLD_LENGTH - z);
    const portalFunnelSurge = 2.6 * Math.exp(-Math.pow(distToNearestPortal / 11.0, 2.0));
    const speedGain = world.fluidDensity > 100.0 ? 1.8 : 1.35;
    let thrustZ = speedGain * (targetCruise - vel[2]) - dragZ * 0.65 + portalFunnelSurge;

    // 4. Repulsive SDF Potential-Gradient Wall Deflection (guarantees 0% chance of wall clipping!)
    const dWall = evalWorldSDF(pos[0], pos[1], pos[2], world, time);
    const safeMargin = 3.6;
    if (dWall < safeMargin) {
      const nWall = evalSDFNormal(pos[0], pos[1], pos[2], world, time, [0, 1, 0]);
      const pen = safeMargin - dWall;
      const repulse = 18.0 * pen * pen;
      thrustX += nWall[0] * repulse;
      thrustY += nWall[1] * repulse;
      thrustZ += nWall[2] * repulse;
    }

    outAcc[0] = gx + dragX + thrustX;
    outAcc[1] = gy + dragY + thrustY;
    outAcc[2] = gz + dragZ + thrustZ;
  }

  /**
   * Integrates 6-DOF Newtonian flight via 2-substep Velocity Verlet.
   */
  step(dt, world, nextWorld, time, warpBoost = 0.0, gazeYaw = 0.0, gazePitch = 0.0) {
    const substeps = 2;
    const h = dt / substeps;
    const acc0 = [0, 0, 0];
    const acc1 = [0, 0, 0];
    const grav = [0, 0, 0];

    for (let s = 0; s < substeps; s++) {
      this._computeAccelerations(this.pos, this.vel, world, nextWorld, time, warpBoost, acc0, grav);

      // Velocity Verlet position update: x(t+h) = x(t) + v(t)*h + 0.5*a(t)*h^2
      const nx = this.pos[0] + this.vel[0] * h + 0.5 * acc0[0] * h * h;
      const ny = this.pos[1] + this.vel[1] * h + 0.5 * acc0[1] * h * h;
      const nz = this.pos[2] + this.vel[2] * h + 0.5 * acc0[2] * h * h;

      // Hard SDF safety clamp if extreme perturbation occurs
      const dCheck = evalWorldSDF(nx, ny, nz, world, time);
      this.pos[0] = nx;
      this.pos[1] = ny;
      this.pos[2] = nz;
      if (dCheck < 1.2) {
        const nrm = evalSDFNormal(nx, ny, nz, world, time, [0, 1, 0]);
        const push = 1.2 - dCheck;
        this.pos[0] += nrm[0] * push;
        this.pos[1] += nrm[1] * push;
        this.pos[2] += nrm[2] * push;
        const vn = dot3(this.vel, nrm);
        if (vn < 0.0) {
          this.vel[0] -= nrm[0] * vn;
          this.vel[1] -= nrm[1] * vn;
          this.vel[2] -= nrm[2] * vn;
        }
      }

      // Predict velocity for drag evaluation, then evaluate a(t+h)
      const predVel = [
        this.vel[0] + acc0[0] * h,
        this.vel[1] + acc0[1] * h,
        Math.max(3.5, this.vel[2] + acc0[2] * h)
      ];
      this._computeAccelerations(this.pos, predVel, world, nextWorld, time + h, warpBoost, acc1, grav);

      // Velocity Verlet velocity update: v(t+h) = v(t) + 0.5*(a(t) + a(t+h))*h
      this.vel[0] += 0.5 * (acc0[0] + acc1[0]) * h;
      this.vel[1] += 0.5 * (acc0[1] + acc1[1]) * h;
      this.vel[2] = Math.max(3.5, this.vel[2] + 0.5 * (acc0[2] + acc1[2]) * h);
    }

    this.acc[0] = acc1[0];
    this.acc[1] = acc1[1];
    this.acc[2] = acc1[2];

    // Proper acceleration (a_proper = a_coord - g_grav) felt by onboard accelerometer
    this.properAcc[0] = acc1[0] - grav[0];
    this.properAcc[1] = acc1[1] - grav[1];
    this.properAcc[2] = acc1[2] - grav[2];
    const properMag = Math.hypot(this.properAcc[0], this.properAcc[1], this.properAcc[2]);
    this.gLoad = lerp(this.gLoad, properMag / STANDARD_GRAVITY, 1.0 - Math.exp(-dt * 8.0));
    this.speed = Math.hypot(this.vel[0], this.vel[1], this.vel[2]);

    // Exact radial velocity toward Exit Portal threshold for Acoustic Doppler formula f' = f * c_s / (c_s - v_r)
    const px = 0.0 - this.pos[0];
    const py = world.baseHeight - this.pos[1];
    const pz = WORLD_LENGTH - this.pos[2];
    const pDist = Math.hypot(px, py, pz) || 1.0;
    this.radialPortalVel = (this.vel[0] * px + this.vel[1] * py + this.vel[2] * pz) / pDist;

    // Aerodynamic Coordinated Bank Angle: phi_eq = atan(v^2 * kappa / g_eff) = atan(a_lat / g_eff)
    // In our right-handed frame (worldUp=(sin phi, cos phi, 0), forward=(0,0,1)), positive phi tilts
    // lift toward +X (right) to balance rightward centripetal acceleration aLat > 0!
    const vNorm = normalize3([0, 0, 1], this.vel[0], this.vel[1], this.vel[2]);
    const horizRight = normalize3([1, 0, 0], vNorm[2], 0.0, -vNorm[0]);
    const aLat = dot3(this.properAcc, horizRight);
    const gEff = Math.max(6.8, Math.abs(this.properAcc[1]));
    const uNorm = clamp(this.pos[2] / WORLD_LENGTH, 0.0, 1.0);
    const portalLevelFade = Math.sin(PI * uNorm);
    const phiEq = clamp(Math.atan2(aLat, gEff) * portalLevelFade, -0.40, 0.40);

    // Integrate rotational inertia spring-damper ODE for roll
    const rollWn = 5.4;
    const rollZeta = 0.92;
    const rollAcc = rollWn * rollWn * (phiEq - this.roll) - 2.0 * rollZeta * rollWn * this.rollVel;
    this.rollVel += rollAcc * dt;
    this.roll += this.rollVel * dt;

    // Camera forward vector aligns smoothly with velocity vector (and strictly [0,0,1] right at portal center if needed,
    // though velocity vector itself is already tangent-continuous across portals!)
    // Symmetric C^1-continuous portal attitude framing around z=0 and z=WORLD_LENGTH:
    // Guarantees zero camera jump across portals even when conserving lateral velocity v_xy!
    const distNearestPortal = Math.min(this.pos[2], WORLD_LENGTH - this.pos[2]);
    const alignPortal = Math.exp(-Math.pow(distNearestPortal / 5.0, 2.0));
    const fx = lerp(vNorm[0], 0.0, alignPortal * 0.65);
    const fy = lerp(vNorm[1], 0.0, alignPortal * 0.65);
    const fz = lerp(vNorm[2], 1.0, alignPortal * 0.65);
    const baseForward = normalize3([0, 0, 1], fx, fy, fz);

    const worldUp = [Math.sin(this.roll), Math.cos(this.roll), 0.0];
    const baseRight = cross3([1, 0, 0], worldUp, baseForward);
    normalize3(baseRight, baseRight[0], baseRight[1], baseRight[2]);
    const baseUp = cross3([0, 1, 0], baseForward, baseRight);
    normalize3(baseUp, baseUp[0], baseUp[1], baseUp[2]);

    // Optional gentle user gaze offset
    if (Math.abs(gazeYaw) > 1e-5 || Math.abs(gazePitch) > 1e-5) {
      const cy = Math.cos(gazeYaw), sy = Math.sin(gazeYaw);
      const cp = Math.cos(gazePitch), sp = Math.sin(gazePitch);
      const fYaw = [
        baseForward[0] * cy + baseRight[0] * sy,
        baseForward[1] * cy + baseRight[1] * sy,
        baseForward[2] * cy + baseRight[2] * sy
      ];
      const rYaw = [
        baseRight[0] * cy - baseForward[0] * sy,
        baseRight[1] * cy - baseForward[1] * sy,
        baseRight[2] * cy - baseForward[2] * sy
      ];
      this.forward = normalize3([0, 0, 1],
        fYaw[0] * cp + baseUp[0] * sp,
        fYaw[1] * cp + baseUp[1] * sp,
        fYaw[2] * cp + baseUp[2] * sp
      );
      this.up = normalize3([0, 1, 0],
        baseUp[0] * cp - fYaw[0] * sp,
        baseUp[1] * cp - fYaw[1] * sp,
        baseUp[2] * cp - fYaw[2] * sp
      );
      this.right = normalize3([1, 0, 0], rYaw[0], rYaw[1], rYaw[2]);
    } else {
      this.forward = baseForward;
      this.right = baseRight;
      this.up = baseUp;
    }
  }

  /**
   * Exact Euclidean Portal Crossing:
   * Position shifts into Next World's portal entry frame;
   * Velocity vector v, Acceleration a, Roll angle phi, and Roll angular velocity d(phi)/dt
   * are 100% conserved!
   */
  promoteAcrossPortal(oldWorld, newWorld) {
    this.pos[1] += (newWorld.baseHeight - oldWorld.baseHeight);
    this.pos[2] -= WORLD_LENGTH;
  }

  getPose() {
    return {
      pos: this.pos,
      right: this.right,
      up: this.up,
      forward: this.forward,
      roll: this.roll
    };
  }
}

// ============================================================================
// CROSS-PORTAL NEWTONIAN TEST SPHERES (PROBES)
// ============================================================================

const MAX_PROBES = 18;
const TRAIL_POINTS = 10;

export class ProbePhysicsSystem {
  constructor() {
    this.probes = [];
    this.ambientTimer = 2.2;
  }

  /**
   * Launches a physical test sphere from originPos with velocity launchVel in worldSeq.
   */
  spawnProbe(originPos, launchVel, world, isUserLaunched = true) {
    if (this.probes.length >= MAX_PROBES) {
      this.probes.shift();
    }

    const radius = isUserLaunched ? 0.46 : 0.40;
    // Slight density variation around world's reference probeDensity
    const density = world.probeDensity * (0.90 + Math.random() * 0.22);
    const accent = world.portalAccent;
    const color = isUserLaunched
      ? [
          clamp(accent[0] * 0.7 + 0.65, 0.4, 2.0),
          clamp(accent[1] * 0.7 + 0.65, 0.4, 2.0),
          clamp(accent[2] * 0.7 + 0.75, 0.4, 2.0)
        ]
      : [
          clamp(world.particleColorA[0] * 1.45, 0.3, 2.0),
          clamp(world.particleColorA[1] * 1.45, 0.3, 2.0),
          clamp(world.particleColorA[2] * 1.45, 0.3, 2.0)
        ];

    const trail = [];
    for (let i = 0; i < TRAIL_POINTS; i++) {
      trail.push([originPos[0], originPos[1], originPos[2]]);
    }

    this.probes.push({
      pos: [originPos[0], originPos[1], originPos[2]],
      vel: [launchVel[0], launchVel[1], launchVel[2]],
      radius,
      density,
      color,
      worldSeq: world.sequenceIndex,
      age: 0.0,
      maxAge: isUserLaunched ? 15.0 : 12.5,
      trail,
      trailTimer: 0.0,
      bounceCooldown: 0.0
    });
  }

  _computeProbeAccel(p, pos, vel, world, time, outAcc) {
    // 1. Base world gravity
    let ax = world.gravity[0];
    let ay = world.gravity[1];
    let az = world.gravity[2];

    // 2. Fluid medium density & Archimedes Buoyancy:
    //    F_buoy = -rho_fluid * V_submerged * g  =>  a_buoy = -(rho_fluid / rho_probe) * f_sub * g
    let effFluidDensity = world.fluidDensity;
    if (world.waterLevel !== undefined) {
      // Partial/full spherical immersion at y = waterLevel (World VII Cryogenic Aurora polar sea!)
      const subFrac = clamp((world.waterLevel - (pos[1] - p.radius)) / (2.0 * p.radius), 0.0, 1.0);
      if (subFrac > 0.0) {
        const buoyRatio = (world.waterDensity * subFrac) / p.density;
        ax -= world.gravity[0] * buoyRatio;
        ay -= world.gravity[1] * buoyRatio;
        az -= world.gravity[2] * buoyRatio;
        effFluidDensity = lerp(world.fluidDensity, world.waterDensity, subFrac);
      }
    } else if (world.fluidDensity > 0.0) {
      const buoyRatio = world.fluidDensity / p.density;
      ax -= world.gravity[0] * buoyRatio;
      ay -= world.gravity[1] * buoyRatio;
      az -= world.gravity[2] * buoyRatio;
    }

    // 3. Local wind / Prandtl shear / 3D Curl-Noise flow velocity
    let ux = world.windVec[0];
    let uy = world.windVec[1];
    let uz = world.windVec[2];

    if (world.id === 5) {
      // Solaris Dunes: Prandtl-von Kármán logarithmic wind boundary layer u(z_agl) ~ ln(z_agl / z0)
      const agl = Math.max(0.25, pos[1] - 4.0);
      const shear = clamp(Math.log(agl / 0.08) / Math.log(10.0 / 0.08), 0.15, 1.45);
      ux *= shear;
      uz *= shear;
    } else if (world.id === 6) {
      // Cryogenic Aurora: Divergence-free 3D curl-noise atmospheric eddies
      const curl = evalCurlFlow(pos[0], pos[1], pos[2], time, [0, 0, 0]);
      ux += curl[0];
      uy += curl[1];
      uz += curl[2];
    }

    // 4. Exact Quadratic Sphere Drag: a_drag = -0.5 * rho_f * Cd * (3 / (4 * R * rho_p)) * |v_rel| * v_rel
    if (effFluidDensity > 0.0) {
      const Cd = 0.47; // Classical Newtonian sphere drag coefficient
      const areaOverMass = 3.0 / (4.0 * p.radius * p.density);
      const kDrag = 0.5 * effFluidDensity * Cd * areaOverMass;
      const rvx = vel[0] - ux;
      const rvy = vel[1] - uy;
      const rvz = vel[2] - uz;
      const relSpd = Math.hypot(rvx, rvy, rvz);
      ax -= kDrag * relSpd * rvx;
      ay -= kDrag * relSpd * rvy;
      az -= kDrag * relSpd * rvz;
    }

    // 5. Singularity Forge (World III): Central GM / (r - r_s)^2 gravitational attraction
    if (world.bhGM && world.bhAttractorPos) {
      const bx = world.bhAttractorPos[0] - pos[0];
      const by = world.bhAttractorPos[1] - pos[1];
      const bz = world.bhAttractorPos[2] - pos[2];
      const r = Math.hypot(bx, by, bz) || 1.0;
      const effR = Math.max(14.0, r - (world.bhSchwarzschildR || 6.0));
      const gBH = world.bhGM / (effR * effR);
      ax += (bx / r) * gBH;
      ay += (by / r) * gBH;
      az += (bz / r) * gBH;
    }

    // 6. Hyperbolic Sanctum (World V): Coupled Hookean harmonic restoring potential toward nave axis
    if (world.hookeanStiffness) {
      const center = flightPathXY(clamp(pos[2], 0.0, WORLD_LENGTH), world, [0, 0]);
      ax -= world.hookeanStiffness * (pos[0] - center[0]);
      ay -= world.hookeanStiffness * (pos[1] - center[1]) * 0.65;
    }

    outAcc[0] = ax;
    outAcc[1] = ay;
    outAcc[2] = az;
  }

  /**
   * Advances all probes via 3-substep Velocity Verlet, resolves SDF elastic/inelastic collisions,
   * transfers probes seamlessly across live portals, and spawns occasional ambient harmonic probes.
   */
  step(dt, craft, currentWorld, nextWorld, afterNextWorld, time, onCollision) {
    // Autonomous ambient test mass launcher (keeps hands-off experience alive with real physics demonstrations!)
    this.ambientTimer -= dt;
    const activeAhead = this.probes.filter(
      (p) => p.worldSeq === currentWorld.sequenceIndex && p.pos[2] > craft.pos[2] + 4.0
    ).length;

    if (this.ambientTimer <= 0.0 && activeAhead < 2) {
      this.ambientTimer = 4.2 + Math.random() * 2.8;
      // Aim slightly ahead & playfully arc toward either nearby architecture or directly through the upcoming portal!
      const distToPortal = WORLD_LENGTH - craft.pos[2];
      const aimAtPortal = distToPortal < 62.0 && distToPortal > 10.0;

      const sideOffset = (Math.random() > 0.5 ? 1 : -1) * (1.8 + Math.random() * 1.4);
      const spawnPos = [
        craft.pos[0] + craft.right[0] * sideOffset + craft.forward[0] * 3.2,
        craft.pos[1] + craft.right[1] * sideOffset + craft.forward[1] * 3.2 - 0.5,
        craft.pos[2] + craft.forward[2] * 3.2
      ];

      let launchDir;
      if (aimAtPortal) {
        // Aim toward the portal aperture compensating slightly for gravity drop!
        const tEst = distToPortal / (craft.speed + 12.5);
        const gravComp = -0.42 * currentWorld.gravity[1] * tEst;
        launchDir = normalize3(
          [0, 0, 1],
          0.0 - spawnPos[0] + (Math.random() - 0.5) * 2.4,
          currentWorld.baseHeight + gravComp - spawnPos[1],
          WORLD_LENGTH - spawnPos[2]
        );
      } else {
        const yaw = (Math.random() - 0.5) * 0.28;
        const pitch = 0.08 + Math.random() * 0.12;
        launchDir = normalize3(
          [0, 0, 1],
          craft.forward[0] + craft.right[0] * yaw + craft.up[0] * pitch,
          craft.forward[1] + craft.right[1] * yaw + craft.up[1] * pitch,
          craft.forward[2] + craft.right[2] * yaw + craft.up[2] * pitch
        );
      }

      const extraSpd = 11.5 + Math.random() * 4.0;
      const launchVel = [
        craft.vel[0] + launchDir[0] * extraSpd,
        craft.vel[1] + launchDir[1] * extraSpd,
        craft.vel[2] + launchDir[2] * extraSpd
      ];
      this.spawnProbe(spawnPos, launchVel, currentWorld, false);
    }

    const worldMap = new Map([
      [currentWorld.sequenceIndex, currentWorld],
      [nextWorld.sequenceIndex, nextWorld],
      [afterNextWorld.sequenceIndex, afterNextWorld]
    ]);

    const substeps = 3;
    const h = dt / substeps;
    const a0 = [0, 0, 0];
    const a1 = [0, 0, 0];
    const nrm = [0, 1, 0];

    for (let i = this.probes.length - 1; i >= 0; i--) {
      const p = this.probes[i];
      p.age += dt;
      p.bounceCooldown = Math.max(0.0, p.bounceCooldown - dt);
      p.trailTimer += dt;

      const w = worldMap.get(p.worldSeq);
      if (!w || p.age >= p.maxAge || p.worldSeq < currentWorld.sequenceIndex) {
        this.probes.splice(i, 1);
        continue;
      }

      for (let s = 0; s < substeps; s++) {
        const activeW = worldMap.get(p.worldSeq);
        if (!activeW) break;

        this._computeProbeAccel(p, p.pos, p.vel, activeW, time, a0);

        const prevZ = p.pos[2];
        p.pos[0] += p.vel[0] * h + 0.5 * a0[0] * h * h;
        p.pos[1] += p.vel[1] * h + 0.5 * a0[1] * h * h;
        p.pos[2] += p.vel[2] * h + 0.5 * a0[2] * h * h;

        const predV = [
          p.vel[0] + a0[0] * h,
          p.vel[1] + a0[1] * h,
          p.vel[2] + a0[2] * h
        ];
        this._computeProbeAccel(p, p.pos, predV, activeW, time + h, a1);

        p.vel[0] += 0.5 * (a0[0] + a1[0]) * h;
        p.vel[1] += 0.5 * (a0[1] + a1[1]) * h;
        p.vel[2] += 0.5 * (a0[2] + a1[2]) * h;

        // Check Cross-Portal Aperture Transit! (z crossing WORLD_LENGTH inside r < PORTAL_RADIUS - radius)
        if (prevZ < WORLD_LENGTH && p.pos[2] >= WORLD_LENGTH) {
          const rPortal = Math.hypot(p.pos[0], p.pos[1] - activeW.baseHeight);
          const destW = worldMap.get(p.worldSeq + 1);
          if (rPortal < PORTAL_RADIUS - p.radius && destW) {
            const dyShift = destW.baseHeight - activeW.baseHeight;
            p.worldSeq += 1;
            p.pos[1] += dyShift;
            p.pos[2] -= WORLD_LENGTH;
            // Shift trail history seamlessly into destination world coordinates!
            for (let t = 0; t < p.trail.length; t++) {
              p.trail[t][1] += dyShift;
              p.trail[t][2] -= WORLD_LENGTH;
            }
            continue;
          }
        }

        // SDF Surface Collision Detection & Restitution: v' = v - (1 + e)(v · n)n - mu * v_tangent
        const dSurf = evalWorldSDF(p.pos[0], p.pos[1], p.pos[2], activeW, time);
        if (dSurf < p.radius) {
          evalSDFNormal(p.pos[0], p.pos[1], p.pos[2], activeW, time, nrm);
          const pen = p.radius - dSurf;
          p.pos[0] += nrm[0] * pen;
          p.pos[1] += nrm[1] * pen;
          p.pos[2] += nrm[2] * pen;

          const vn = dot3(p.vel, nrm);
          if (vn < 0.0) {
            const e = activeW.restitution;
            const mu = activeW.friction;
            const tx = p.vel[0] - vn * nrm[0];
            const ty = p.vel[1] - vn * nrm[1];
            const tz = p.vel[2] - vn * nrm[2];

            p.vel[0] = p.vel[0] - (1.0 + e) * vn * nrm[0] - mu * tx;
            p.vel[1] = p.vel[1] - (1.0 + e) * vn * nrm[1] - mu * ty;
            p.vel[2] = p.vel[2] - (1.0 + e) * vn * nrm[2] - mu * tz;

            const impactSpeed = -vn;
            if (impactSpeed > 1.8 && p.bounceCooldown <= 0.0 && onCollision) {
              p.bounceCooldown = 0.09;
              onCollision(impactSpeed, e, p.pos, craft.pos, p.worldSeq === currentWorld.sequenceIndex);
            }
          }
        }
      }

      // Record motion trail ring-buffer
      if (p.trailTimer >= 0.024) {
        p.trailTimer = 0.0;
        p.trail.pop();
        p.trail.unshift([p.pos[0], p.pos[1], p.pos[2]]);
      } else {
        p.trail[0][0] = p.pos[0];
        p.trail[0][1] = p.pos[1];
        p.trail[0][2] = p.pos[2];
      }
    }
  }

  getProbesInWorld(sequenceIndex) {
    return this.probes.filter((p) => p.worldSeq === sequenceIndex);
  }
}
