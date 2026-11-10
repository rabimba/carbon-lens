/**
 * 3D Camera Choreography, $C^2$-Continuous Portal Splines & Projection Math
 * Note: flightPathXY MUST remain mathematically identical to flightPathXY in common.glsl.js.
 */

import { WORLD_LENGTH, PORTAL_RADIUS } from './worlds.js';

const PI = 3.14159265359;
const TAU = 6.28318530718;
const THREE_PI = 9.42477796077;
const FOUR_PI = 12.56637061436;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

export function normalize3(out, x, y, z) {
  const len = Math.hypot(x, y, z) || 1.0;
  out[0] = x / len;
  out[1] = y / len;
  out[2] = z / len;
  return out;
}

export function cross3(out, a, b) {
  const ax = a[0], ay = a[1], az = a[2];
  const bx = b[0], by = b[1], bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

export function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Evaluates the lateral (X, Y) camera trajectory at longitudinal coordinate z in [0, WORLD_LENGTH].
 * Uses a sin^3(pi * u) envelope so value, 1st derivative (tangent), AND 2nd derivative (curvature/roll)
 * all smoothly vanish to 0 at z = 0 (Entry Portal) and z = WORLD_LENGTH (Exit Portal).
 */
export function flightPathXY(z, world, out = [0, 0]) {
  const u = clamp(z / WORLD_LENGTH, 0.0, 1.0);
  const s = Math.sin(PI * u);
  const env = s * s * s;

  const x = env * world.ampX * (
    0.68 * Math.sin(TAU * u + world.seedA) +
    0.32 * Math.sin(FOUR_PI * u + world.seedB)
  );
  const y = world.baseHeight + env * world.ampY * (
    0.72 * Math.sin(TAU * u + world.seedB * 0.7 + 1.1) +
    0.28 * Math.cos(THREE_PI * u + world.seedA * 1.3)
  );

  out[0] = x;
  out[1] = y;
  return out;
}

/**
 * Computes camera position, orthonormal basis (right, up, forward), and banking roll
 * for the active world at longitudinal coordinate z.
 */
export function computeCameraPose(z, world, gazeYaw = 0.0, gazePitch = 0.0) {
  const eps = 0.08;
  const p0 = flightPathXY(z, world, [0, 0]);
  const pMinus = flightPathXY(Math.max(0.0, z - eps), world, [0, 0]);
  const pPlus = flightPathXY(Math.min(WORLD_LENGTH, z + eps), world, [0, 0]);

  const dz = Math.max(1e-4, Math.min(WORLD_LENGTH, z + eps) - Math.max(0.0, z - eps));
  const dxdz = (pPlus[0] - pMinus[0]) / dz;
  const dydz = (pPlus[1] - pMinus[1]) / dz;

  // Second derivative for natural wingsuit/spacecraft banking roll
  const halfDz = eps;
  const d2xdz2 = (z > eps && z < WORLD_LENGTH - eps)
    ? (pPlus[0] - 2.0 * p0[0] + pMinus[0]) / (halfDz * halfDz)
    : 0.0;

  // Smoothly dampen look-tangent emphasis near portals (guaranteed [0,0,1] at z=0 and z=L)
  const u = clamp(z / WORLD_LENGTH, 0.0, 1.0);
  const portalFade = Math.pow(Math.sin(PI * u), 2.0);

  // Subtle horizon-anticipation look-ahead
  const lookAheadZ = Math.min(WORLD_LENGTH, z + 10.0 * portalFade);
  const pLook = flightPathXY(lookAheadZ, world, [0, 0]);
  const lookDx = (pLook[0] - p0[0]) / 10.0;
  const lookDy = (pLook[1] - p0[1]) / 10.0;

  let fx = lerp(dxdz, lookDx, 0.45 * portalFade);
  let fy = lerp(dydz, lookDy, 0.40 * portalFade);
  let fz = 1.0;

  const forward = normalize3([0, 0, 1], fx, fy, fz);

  // Banking roll proportional to lateral curvature
  const roll = clamp(-d2xdz2 * 12.5 * portalFade, -0.30, 0.30);
  const worldUp = [Math.sin(roll), Math.cos(roll), 0.0];

  const right = cross3([1, 0, 0], worldUp, forward);
  normalize3(right, right[0], right[1], right[2]);
  // Note: In a right-handed view system where +X is screen-right, +Y is screen-up, +Z is forward:
  // right = normalize(cross(worldUp, forward))? Let's verify:
  // If worldUp = (0,1,0) and forward = (0,0,1):
  // cross((0,1,0), (0,0,1)) = (1*1 - 0*0, 0*0 - 0*1, 0*0 - 1*0) = (+1, 0, 0)!
  // And cross(forward, right) = cross((0,0,1), (1,0,0)) = (0*0 - 1*0, 1*1 - 0*0, 0*0 - 0*1) = (0, +1, 0)!
  const up = cross3([0, 1, 0], forward, right);
  normalize3(up, up[0], up[1], up[2]);

  // Apply optional gentle user gaze offset (yaw around up, pitch around right)
  if (Math.abs(gazeYaw) > 1e-5 || Math.abs(gazePitch) > 1e-5) {
    const cy = Math.cos(gazeYaw), sy = Math.sin(gazeYaw);
    const cp = Math.cos(gazePitch), sp = Math.sin(gazePitch);

    // Yaw rotates forward & right in the (forward, right) plane
    const fYaw = [
      forward[0] * cy + right[0] * sy,
      forward[1] * cy + right[1] * sy,
      forward[2] * cy + right[2] * sy
    ];
    const rYaw = [
      right[0] * cy - forward[0] * sy,
      right[1] * cy - forward[1] * sy,
      right[2] * cy - forward[2] * sy
    ];

    // Pitch rotates fYaw & up in the (fYaw, up) plane
    const fFinal = normalize3([0, 0, 1],
      fYaw[0] * cp + up[0] * sp,
      fYaw[1] * cp + up[1] * sp,
      fYaw[2] * cp + up[2] * sp
    );
    const uFinal = normalize3([0, 1, 0],
      up[0] * cp - fYaw[0] * sp,
      up[1] * cp - fYaw[1] * sp,
      up[2] * cp - fYaw[2] * sp
    );
    const rFinal = normalize3([1, 0, 0], rYaw[0], rYaw[1], rYaw[2]);

    return {
      pos: [p0[0], p0[1], z],
      right: rFinal,
      up: uFinal,
      forward: fFinal,
      roll
    };
  }

  return {
    pos: [p0[0], p0[1], z],
    right,
    up,
    forward,
    roll
  };
}

/**
 * Maps the camera pose in Current World (approaching Exit Portal at z = WORLD_LENGTH)
 * into the exact Euclidean-matched virtual camera pose in Next World (entering at z = 0).
 */
export function mapPoseAcrossPortal(poseCurrent, currentWorld, nextWorld) {
  return {
    pos: [
      poseCurrent.pos[0],
      poseCurrent.pos[1] - currentWorld.baseHeight + nextWorld.baseHeight,
      poseCurrent.pos[2] - WORLD_LENGTH
    ],
    right: poseCurrent.right,
    up: poseCurrent.up,
    forward: poseCurrent.forward,
    roll: poseCurrent.roll
  };
}

/**
 * Computes a conservative 2D pixel bounding rectangle [x, y, w, h] in WebGL framebuffer coordinates
 * for the Exit Portal aperture so FBO_Next only shades pixels that can appear inside the portal!
 */
export function computePortalScissorRect(pose, world, fbWidth, fbHeight, tanHalfFov) {
  const dCam = WORLD_LENGTH - pose.pos[2];
  // When close to crossing, render full FBO_Next so peripheral warp is 100% covered
  if (dCam <= 15.0) {
    return [0, 0, fbWidth, fbHeight];
  }

  const aspect = fbWidth / Math.max(1, fbHeight);
  const marginRadius = PORTAL_RADIUS + 1.25;
  const cx = 0.0;
  const cy = world.baseHeight;
  const cz = WORLD_LENGTH;

  let minU = 1.0, maxU = 0.0;
  let minV = 1.0, maxV = 0.0;

  const samples = 16;
  for (let i = 0; i <= samples; i++) {
    const r = i === samples ? 0.0 : marginRadius;
    const ang = (i / samples) * TAU;
    const wx = cx + r * Math.cos(ang) - pose.pos[0];
    const wy = cy + r * Math.sin(ang) - pose.pos[1];
    const wz = cz - pose.pos[2];

    const vz = wx * pose.forward[0] + wy * pose.forward[1] + wz * pose.forward[2];
    if (vz <= 0.25) {
      return [0, 0, fbWidth, fbHeight];
    }

    const vx = wx * pose.right[0] + wy * pose.right[1] + wz * pose.right[2];
    const vy = wx * pose.up[0] + wy * pose.up[1] + wz * pose.up[2];

    const ndcX = vx / (vz * aspect * tanHalfFov);
    const ndcY = vy / (vz * tanHalfFov);

    const u = ndcX * 0.5 + 0.5;
    const v = ndcY * 0.5 + 0.5;

    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  // If portal falls completely outside screen frustum
  if (maxU < 0.0 || minU > 1.0 || maxV < 0.0 || minV > 1.0) {
    return [0, 0, 0, 0];
  }

  const padPx = Math.ceil(0.032 * Math.max(fbWidth, fbHeight)) + 16;
  const x0 = clamp(Math.floor(minU * fbWidth) - padPx, 0, fbWidth);
  const y0 = clamp(Math.floor(minV * fbHeight) - padPx, 0, fbHeight);
  const x1 = clamp(Math.ceil(maxU * fbWidth) + padPx, 0, fbWidth);
  const y1 = clamp(Math.ceil(maxV * fbHeight) + padPx, 0, fbHeight);

  return [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
}

/**
 * Builds a column-major 4x4 View-Projection matrix matching our raymarcher's exact camera convention:
 * clipX = dot(p - camPos, right) / (aspect * tanHalfFov)
 * clipY = dot(p - camPos, up) / tanHalfFov
 * clipW = dot(p - camPos, forward)
 * clipZ = linear NDC depth for standard WebGL depth/clipping
 */
export function buildViewProjMatrix(pose, aspect, tanHalfFov, zNear = 0.1, zFar = 500.0) {
  const rx = pose.right[0], ry = pose.right[1], rz = pose.right[2];
  const ux = pose.up[0], uy = pose.up[1], uz = pose.up[2];
  const fx = pose.forward[0], fy = pose.forward[1], fz = pose.forward[2];
  const px = pose.pos[0], py = pose.pos[1], pz = pose.pos[2];

  const sx = 1.0 / (aspect * tanHalfFov);
  const sy = 1.0 / tanHalfFov;
  const nf = 1.0 / (zFar - zNear);
  // Note: forward points INTO the scene (+vz in front of camera)
  const a = (zFar + zNear) * nf;
  const b = -2.0 * zFar * zNear * nf;

  const tx = -(rx * px + ry * py + rz * pz);
  const ty = -(ux * px + uy * py + uz * pz);
  const tz = -(fx * px + fy * py + fz * pz);

  // Column-major 4x4 matrix
  return new Float32Array([
    rx * sx, ux * sy, fx * a,     fx,
    ry * sx, uy * sy, fy * a,     fy,
    rz * sx, uz * sy, fz * a,     fz,
    tx * sx, ty * sy, tz * a + b, tz
  ]);
}
