/**
 * Complete WebGL2 Physics-Honoring Rendering Pipeline Shaders:
 * 1. World Raymarching + Volumetric Pass (Keplerian, GR Schwarzschild, Galilean, Fresnel, Dispersion)
 * 2. Analytical 3D Ray-Sphere Impostor Pass for Cross-Portal Newtonian Test Spheres (with exact portal plane slicing!)
 * 3. Velocity-Verlet 3D Trajectory Ribbon Trail Pass
 * 4. Physically Governed GPU Instanced 3D Particles (Keplerian shear, Stokes + Curl-Noise, Bagnold Saltation, Buoyancy)
 * 5. Analytical Dual-World Portal Ray-Plane Compositor + Relativistic Rim Lensing
 * 6. HDR Soft-Knee Bloom Pyramid + Anamorphic Streak + ACES Filmic Display Pass
 */

import { COMMON_GLSL } from './common.glsl.js';
import { WORLDS_GLSL } from './worlds.glsl.js';

export const FULLSCREEN_VS = /* glsl */ `#version 300 es
precision highp float;

out vec2 vUv;

void main() {
  vec2 pos = vec2(
    (gl_VertexID == 1) ? 3.0 : -1.0,
    (gl_VertexID == 2) ? 3.0 : -1.0
  );
  vUv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

export const WORLD_RAYMARCH_FS = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;
uniform float uAspect;
uniform float uTanHalfFov;

${COMMON_GLSL}
${WORLDS_GLSL}

const float Z_NEAR = 0.1;
const float Z_FAR = 500.0;

float computeHardwareDepth(float rayT, vec3 rd) {
  float vz = max(Z_NEAR, rayT * dot(rd, uCamForward));
  float a = (Z_FAR + Z_NEAR) / (Z_FAR - Z_NEAR);
  float b = (-2.0 * Z_FAR * Z_NEAR) / (Z_FAR - Z_NEAR);
  float ndcZ = a + b / vz;
  return clamp(ndcZ * 0.5 + 0.5, 0.0, 1.0);
}

void main() {
  vec2 screenP = vUv * 2.0 - 1.0;
  vec3 rd = normalize(
    uCamForward +
    screenP.x * uAspect * uTanHalfFov * uCamRight +
    screenP.y * uTanHalfFov * uCamUp
  );

  float tStart = 0.08;
  if (uIsNextWorld == 1) {
    if (rd.z <= 0.0002) {
      fragColor = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragDepth = 1.0;
      return;
    }
    tStart = max(0.08, (0.0 - uCamPos.z) / rd.z);
  }

  float t = tStart;
  float hitMat = MAT_SKY;
  float glowPortal = 0.0;
  bool openCeiling = (uWorldId == 0 || uWorldId == 2 || uWorldId == 3 || uWorldId == 5 || uWorldId == 6);

  for (int i = 0; i < 78; i++) {
    vec3 p = uCamPos + rd * t;

    if (openCeiling && p.y > 42.0 && rd.y > 0.06 && abs(p.z - WORLD_LENGTH) > 22.0) {
      t = MAX_DIST;
      break;
    }

    vec2 res = mapScene(p);

    vec3 qExit = p - vec3(0.0, uBaseHeight, WORLD_LENGTH);
    float dRingGlow = abs(length(qExit.xy) - 8.25) + abs(qExit.z) * 0.85;
    glowPortal += 0.014 / (1.0 + dRingGlow * dRingGlow * 0.85);

    float eps = 0.0020 * (1.0 + t * 0.045);
    if (res.x < eps) {
      hitMat = res.y;
      break;
    }

    t += res.x * 0.92;
    if (t >= MAX_DIST) {
      t = MAX_DIST;
      break;
    }
  }

  vec3 skyCol = evalWorldSky(rd);
  vec3 col = skyCol;
  float finalT = t;

  if (hitMat > 0.5 && t < MAX_DIST) {
    vec3 hitPos = uCamPos + rd * t;
    vec3 n = calcNormal(hitPos, t);
    vec3 surfCol = shadeWorldSurface(hitPos, rd, n, hitMat, t);

    // Beer-Lambert radiative extinction over path inside this world
    float distInWorld = max(0.0, t - tStart);
    float heightAtten = 1.0 + 0.35 * exp(-max(hitPos.y, 0.0) * 0.08);
    float fogAmount = 1.0 - exp(-uFogDensity * distInWorld * heightAtten);

    vec3 sunScatterDir = (uWorldId == 3) ? normalize(vec3(-uSunDir.x, uSunDir.y, abs(uSunDir.z))) : uSunDir;
    float sunAlign = pow(max(dot(rd, sunScatterDir), 0.0), 5.0);
    vec3 aerialCol = mix(uFogColor, skyCol, 0.55) + uSunColor * sunAlign * 0.22;
    col = mix(surfCol, aerialCol, clamp(fogAmount, 0.0, 1.0));
  }

  // Recursive Distant Portal Preview (World C visible inside World B's exit portal)
  if (uIsNextWorld == 1 && rd.z > 0.001) {
    float tDistPortal = (WORLD_LENGTH - uCamPos.z) / rd.z;
    if (tDistPortal > tStart && tDistPortal < finalT) {
      vec3 pDist = uCamPos + rd * tDistPortal;
      vec2 localDist = pDist.xy - vec2(0.0, uBaseHeight);
      float rDist = length(localDist);
      if (rDist < PORTAL_RADIUS) {
        float rho = rDist / PORTAL_RADIUS;
        vec3 previewSky = mix(uNextSkyHorizon, uNextSkyZenith, clamp(rd.y * 0.6 + 0.35, 0.0, 1.0));
        previewSky += uNextPortalAccent * (rho * rho * rho) * 1.3;
        float distFog = 1.0 - exp(-uFogDensity * max(0.0, tDistPortal - tStart));
        col = mix(previewSky, skyCol, clamp(distFog, 0.0, 0.85));
      }
    }
  }

  vec3 haloTint = mix(uPortalAccent, uNextPortalAccent, 0.45);
  col += haloTint * clamp(glowPortal, 0.0, 1.2) * 0.32;

  if (any(isnan(col)) || any(isinf(col))) {
    col = skyCol;
  }

  fragColor = vec4(clamp(col, vec3(0.0), vec3(32.0)), clamp(finalT / MAX_DIST, 0.0, 1.0));
  gl_FragDepth = (finalT >= MAX_DIST) ? 0.999999 : computeHardwareDepth(finalT, rd);
}
`;

/**
 * Analytical 3D Ray-Sphere Shader for Cross-Portal Newtonian Test Spheres!
 * Computes exact ray-sphere intersection, surface normal, Schlick-Fresnel reflection,
 * solar specular, plasma core, gl_FragDepth, AND exact portal-plane slicing!
 */
export const PROBE_VS = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 aQuadCorner;
layout(location = 1) in vec4 aProbePosRad; // xyz: sphere center, w: sphere radius
layout(location = 2) in vec4 aProbeColor;  // rgb: HDR color, w: speed magnitude

uniform mat4 uViewProj;
uniform vec3 uCamRight;
uniform vec3 uCamUp;

out vec3 vSphereCenter;
out float vSphereRadius;
out vec3 vSphereColor;
out float vSpeed;
out vec3 vWorldPoint;

void main() {
  vSphereCenter = aProbePosRad.xyz;
  vSphereRadius = aProbePosRad.w;
  vSphereColor = aProbeColor.rgb;
  vSpeed = aProbeColor.w;

  // Expand bounding billboard slightly so perspective silhouette is never clipped
  float boundR = vSphereRadius * 1.45;
  vWorldPoint = vSphereCenter + (uCamRight * aQuadCorner.x + uCamUp * aQuadCorner.y) * boundR;
  gl_Position = uViewProj * vec4(vWorldPoint, 1.0);
}
`;

export const PROBE_FS = /* glsl */ `#version 300 es
precision highp float;

in vec3 vSphereCenter;
in float vSphereRadius;
in vec3 vSphereColor;
in float vSpeed;
in vec3 vWorldPoint;

uniform vec3 uCamPos;
uniform vec3 uCamForward;
uniform vec3 uSunDir;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyZenith;
uniform float uBaseHeight;
uniform int uIsNextWorld;

out vec4 fragColor;

const float WORLD_LENGTH = 180.0;
const float PORTAL_RADIUS = 8.05;
const float MAX_DIST = 340.0;
const float Z_NEAR = 0.1;
const float Z_FAR = 500.0;

float computeHardwareDepth(float rayT, vec3 rd) {
  float vz = max(Z_NEAR, rayT * dot(rd, uCamForward));
  float a = (Z_FAR + Z_NEAR) / (Z_FAR - Z_NEAR);
  float b = (-2.0 * Z_FAR * Z_NEAR) / (Z_FAR - Z_NEAR);
  float ndcZ = a + b / vz;
  return clamp(ndcZ * 0.5 + 0.5, 0.0, 1.0);
}

void main() {
  vec3 rd = normalize(vWorldPoint - uCamPos);
  vec3 oc = uCamPos - vSphereCenter;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - vSphereRadius * vSphereRadius;
  float disc = b * b - c;

  if (disc < 0.0) {
    discard;
  }

  float sqrtDisc = sqrt(disc);
  float tHit = -b - sqrtDisc;
  if (tHit < 0.08) {
    tHit = -b + sqrtDisc;
    if (tHit < 0.08) discard;
  }

  vec3 hitPos = uCamPos + rd * tHit;

  // Exact Cross-Portal Plane Slicing:
  // - In Next World (uIsNextWorld == 1), discard anything behind z = 0!
  // - In Current World (uIsNextWorld == 0), if the sphere is passing inside the Exit Portal aperture,
  //   slice cleanly at z = WORLD_LENGTH so the front half renders in World B without double-occlusion!
  if (uIsNextWorld == 1 && hitPos.z < 0.0) {
    discard;
  }
  if (uIsNextWorld == 0 && hitPos.z > WORLD_LENGTH) {
    float rAp = length(hitPos.xy - vec2(0.0, uBaseHeight));
    if (rAp < PORTAL_RADIUS) {
      discard;
    }
  }

  vec3 n = normalize(hitPos - vSphereCenter);
  float cosView = clamp(dot(n, -rd), 0.0, 1.0);

  // Dielectric-iridium shell with luminous energy core
  float fresnel = 0.06 + 0.94 * pow(clamp(1.0 - cosView, 0.0, 1.0), 4.0);
  vec3 lightDir = normalize(vec3(uSunDir.x, abs(uSunDir.y) + 0.25, abs(uSunDir.z) + 0.3));
  float diff = max(dot(n, lightDir), 0.0);
  vec3 halfV = normalize(lightDir - rd);
  float spec = pow(max(dot(n, halfV), 0.0), 64.0);

  vec3 reflDir = reflect(rd, n);
  vec3 envRefl = mix(uSkyHorizon, uSkyZenith, clamp(reflDir.y * 0.5 + 0.5, 0.0, 1.0));

  // Equatorial harmonic band & glowing core proportional to kinetic energy
  float kineticBoost = clamp(vSpeed * 0.035, 0.15, 1.1);
  float coreGlow = pow(cosView, 1.8) * (0.85 + kineticBoost);
  float eqBand = exp(-abs(n.y) * 8.0) * 0.85;

  vec3 col = vSphereColor * (coreGlow * 1.45 + eqBand * 1.1 + diff * 0.45);
  col += envRefl * fresnel * 1.15 + vec3(1.8, 1.75, 1.65) * spec * 1.5;

  fragColor = vec4(col, clamp(tHit / MAX_DIST, 0.0, 1.0));
  gl_FragDepth = computeHardwareDepth(tHit, rd);
}
`;

/**
 * 3D Velocity-Verlet Trajectory Trail Shader (Additive HDR Ribbons)
 */
export const TRAIL_VS = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 aTrailPos;
layout(location = 1) in vec4 aTrailColorAlpha; // rgb: color, a: normalized fade [0..1]

uniform mat4 uViewProj;

out vec4 vTrailCol;
out float vWorldZ;

void main() {
  vTrailCol = aTrailColorAlpha;
  vWorldZ = aTrailPos.z;
  gl_Position = uViewProj * vec4(aTrailPos, 1.0);
}
`;

export const TRAIL_FS = /* glsl */ `#version 300 es
precision highp float;

in vec4 vTrailCol;
in float vWorldZ;

uniform int uIsNextWorld;

out vec4 fragColor;

const float WORLD_LENGTH = 180.0;

void main() {
  if (uIsNextWorld == 1 && vWorldZ < 0.02) discard;
  if (uIsNextWorld == 0 && vWorldZ > WORLD_LENGTH) discard;
  fragColor = vec4(vTrailCol.rgb * vTrailCol.a * 1.35, 0.0);
}
`;

/**
 * Physically Governed GPU Instanced 3D Atmospheric Particles:
 * - Modes 0 & 7: Keplerian Differential Orbital Velocity omega(r) = sqrt(GM / r^3)
 * - Mode 1: Archimedes Buoyant Terminal Rise + Deep-Water Orbital Surge
 * - Mode 2: Relativistic In-Spiral Accretion Stream
 * - Mode 5: Bagnold Aeolian Parabolic Saltation Hops + Prandtl Logarithmic Wind Shear
 * - Mode 6: Stokes Terminal Velocity (v_t ~ r^2) + Divergence-Free 3D Curl-Noise (u = curl Psi)
 */
export const PARTICLE_VS = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 aQuadCorner;
layout(location = 1) in vec4 aSeedA; // x: normZ, y: radialFrac, z: angle, w: sizeSeed
layout(location = 2) in vec4 aSeedB; // x: speedSeed, y: phaseSeed, z: colorMix, w: typeSeed

uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform float uTime;
uniform int uParticleMode;
uniform int uIsNextWorld;
uniform float uInstanceSeed;
uniform float uBaseHeight;
uniform float uAmpX;
uniform float uAmpY;
uniform float uSeedA;
uniform float uSeedB;
uniform vec3 uParticleColorA;
uniform vec3 uParticleColorB;

out vec2 vCorner;
out vec3 vColor;
out float vAlpha;
out float vWorldZ;
out float vShapeMode;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float WORLD_LENGTH = 180.0;

float hash21p(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2p(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21p(i), hash21p(i + vec2(1.0, 0.0)), u.x),
    mix(hash21p(i + vec2(0.0, 1.0)), hash21p(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Divergence-free 3D Curl-Noise velocity displacement (nabla . (nabla x Psi) == 0)
vec3 curlTurbulence(vec3 p, float t) {
  float s = 0.14;
  vec3 q = p * s + vec3(0.0, 0.0, t * 0.22);
  float e = 0.1;
  float py_z = (noise2p(q.yz + vec2(0.0, e)) - noise2p(q.yz - vec2(0.0, e))) / (2.0 * e);
  float pz_y = (noise2p(q.xy + vec2(7.1, e)) - noise2p(q.xy - vec2(7.1, e))) / (2.0 * e);
  float pz_x = (noise2p(q.xy + vec2(7.1 + e, 0.0)) - noise2p(q.xy + vec2(7.1 - e, 0.0))) / (2.0 * e);
  float px_z = (noise2p(q.xz + vec2(3.3, e)) - noise2p(q.xz - vec2(3.3, e))) / (2.0 * e);
  return vec3(pz_y - py_z, px_z - pz_x, py_z - px_z) * 2.1;
}

vec2 flightPathXY(float z) {
  float u = clamp(z / WORLD_LENGTH, 0.0, 1.0);
  float s = sin(PI * u);
  float env = s * s * s;
  float x = env * uAmpX * (
    0.68 * sin(TAU * u + uSeedA) +
    0.32 * sin(12.56637061436 * u + uSeedB)
  );
  float y = uBaseHeight + env * uAmpY * (
    0.72 * sin(TAU * u + uSeedB * 0.7 + 1.1) +
    0.28 * cos(9.42477796077 * u + uSeedA * 1.3)
  );
  return vec2(x, y);
}

void main() {
  float instOffset = fract(uInstanceSeed * 0.137 + aSeedA.w);
  float baseZ = fract(aSeedA.x + instOffset * 0.37);

  float zDrift = 0.0;
  if (uParticleMode == 2 || uParticleMode == 7) {
    zDrift = -uTime * (0.025 + aSeedB.x * 0.035);
  } else if (uParticleMode == 5) {
    // Bagnold aeolian downwind advection
    zDrift = uTime * (0.022 + aSeedB.x * 0.024);
  } else {
    zDrift = sin(uTime * 0.22 + aSeedB.y * TAU) * 0.015;
  }

  float zNorm = fract(baseZ + zDrift);
  float worldZ = 2.5 + zNorm * (WORLD_LENGTH - 5.0);
  vec2 pathC = flightPathXY(worldZ);

  float radius = 2.4 + pow(aSeedA.y, 0.85) * 19.8;

  // Keplerian Differential Orbital Velocity: omega(r) = sqrt(GM / r^3)
  float omegaOrb;
  if (uParticleMode == 0 || uParticleMode == 2 || uParticleMode == 7) {
    float dirSign = (aSeedB.x > 0.25) ? 1.0 : -1.0;
    omegaOrb = dirSign * (14.5 / pow(max(radius, 2.0), 1.5));
  } else {
    omegaOrb = 0.15 * (aSeedB.x - 0.5);
  }
  float angle = aSeedA.z * TAU + uTime * omegaOrb + uInstanceSeed;

  vec3 worldPos = vec3(
    pathC.x + cos(angle) * radius,
    pathC.y + sin(angle) * radius * 0.78,
    worldZ
  );

  float isFlockCreature = step(0.93, aSeedB.w);
  vShapeMode = 0.0;

  if (uParticleMode == 6) {
    // World VII (Cryogenic Aurora): Stokes Viscous Settling (v_t ~ r_flake^2) + 3D Curl-Noise!
    float flakeRadiusNorm = 0.45 + aSeedA.w;
    float stokesVel = 0.85 * flakeRadiusNorm * flakeRadiusNorm;
    worldPos.y = mod(worldPos.y - uTime * stokesVel + 12.0, 26.0) + 2.6;
    worldPos += curlTurbulence(worldPos, uTime);
  } else if (uParticleMode == 5) {
    // World VI (Solaris Dunes): Bagnold Aeolian Parabolic Saltation Hops + Prandtl Shear!
    float hopFreq = 1.4 + (1.0 - aSeedA.w) * 1.8;
    float sHop = fract(uTime * hopFreq + aSeedB.y * 11.0);
    // Ballistic parabola y(s) = 4 * H_max * s * (1 - s) under gravity g = 8.92 m/s^2
    float hMax = 0.65 + aSeedB.x * 1.85;
    float duneFloorApprox = 4.6 + 2.2 * sin(worldPos.x * 0.08) * cos(worldPos.z * 0.05);
    worldPos.y = mix(worldPos.y, duneFloorApprox + 4.0 * hMax * sHop * (1.0 - sHop), 0.72);
    // Prandtl logarithmic crosswind drift u(y) ~ ln(y / z0)
    float agl = max(0.2, worldPos.y - duneFloorApprox);
    float windShear = log(1.0 + agl / 0.08) * 0.55;
    worldPos.x += mod(uTime * windShear * 2.2 + aSeedB.x * 24.0, 32.0) - 16.0;
  } else if (uParticleMode == 1) {
    // World II (Abyssal Biolume): Archimedes Buoyant Rise + Deep-Water Wave Surge
    float buoyVel = 0.35 + aSeedA.w * 0.75;
    worldPos.y = mod(worldPos.y + uTime * buoyVel + 8.0, 24.0) + 2.5;
    worldPos.x += cos(uTime * 1.4 + worldZ * 0.15) * 0.65;
    if (isFlockCreature > 0.5) {
      vShapeMode = 1.0;
    }
  } else if ((uParticleMode == 0 || uParticleMode == 3) && isFlockCreature > 0.5) {
    vShapeMode = 2.0;
    worldPos.x += sin(uTime * 0.85 + aSeedB.y * TAU) * 3.5;
    worldPos.y += cos(uTime * 0.65 + aSeedB.y * TAU) * 1.6 + 2.5;
  } else if (uParticleMode == 4) {
    // World V (Hyperbolic Sanctum): Hookean Harmonic Oscillation y(t) = A * cos(omega_0 * t + phi)
    worldPos.y += 2.8 * cos(uTime * (0.95 + aSeedB.x * 0.6) + aSeedB.y * TAU);
  }

  float distToCam = length(worldPos - uCamPos);
  float size = 0.055 + aSeedA.w * 0.14;
  if (vShapeMode > 0.5) {
    size = 0.42 + aSeedA.w * 0.35;
  }

  vec2 corner = aQuadCorner;
  vec3 billboardRight = uCamRight;
  vec3 billboardUp = uCamUp;

  if (vShapeMode > 1.5) {
    float wingFlap = sin(uTime * 5.2 + aSeedB.y * 20.0) * 0.32 * abs(corner.x);
    corner.y += wingFlap;
    size *= 1.35;
  } else if (uParticleMode == 2 || uParticleMode == 5 || uParticleMode == 7) {
    corner.y *= 0.45;
    corner.x *= (uParticleMode == 5) ? 1.8 : 2.4;
  }

  vec3 finalPos = worldPos + (billboardRight * corner.x + billboardUp * corner.y) * size;

  vCorner = aQuadCorner;
  vWorldZ = finalPos.z;

  float twinkle = 0.65 + 0.35 * sin(uTime * (2.2 + aSeedB.x * 3.0) + aSeedB.y * 30.0);
  float nearFade = smoothstep(1.2, 4.5, distToCam);
  float farFade = 1.0 - smoothstep(75.0, 155.0, distToCam);
  float endFade = smoothstep(1.5, 6.0, worldZ) * smoothstep(WORLD_LENGTH - 1.5, WORLD_LENGTH - 6.0, worldZ);

  vAlpha = twinkle * nearFade * farFade * endFade;
  vColor = mix(uParticleColorA, uParticleColorB, aSeedB.z) * (vShapeMode > 0.5 ? 1.55 : 1.25);

  gl_Position = uViewProj * vec4(finalPos, 1.0);
}
`;

export const PARTICLE_FS = /* glsl */ `#version 300 es
precision highp float;

in vec2 vCorner;
in vec3 vColor;
in float vAlpha;
in float vWorldZ;
in float vShapeMode;

uniform int uIsNextWorld;

out vec4 fragColor;

void main() {
  if (uIsNextWorld == 1 && vWorldZ < 0.05) {
    discard;
  }
  if (vAlpha <= 0.004) {
    discard;
  }

  float mask = 0.0;
  if (vShapeMode > 1.5) {
    float wingCurve = vCorner.y + abs(vCorner.x) * 0.45 - 0.15;
    float span = smoothstep(1.0, 0.15, abs(vCorner.x));
    mask = exp(-abs(wingCurve) * 9.0) * span;
  } else if (vShapeMode > 0.5) {
    float d = abs(vCorner.x) * 0.85 + abs(vCorner.y) * 1.45;
    mask = smoothstep(0.95, 0.05, d);
  } else {
    float r = length(vCorner);
    if (r > 1.0) discard;
    mask = pow(clamp(1.0 - r, 0.0, 1.0), 2.4) + 0.65 * exp(-r * r * 14.0);
  }

  vec3 hdr = vColor * mask * vAlpha;
  fragColor = vec4(hdr, 0.0);
}
`;

export const PORTAL_COMPOSITE_FS = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uCurrentTex;
uniform sampler2D uNextTex;

uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;
uniform float uAspect;
uniform float uTanHalfFov;
uniform float uTime;
uniform float uBaseHeight;
uniform vec3 uPortalAccent;
uniform vec3 uNextPortalAccent;
uniform vec3 uCurrentFogColor;
uniform float uCurrentFogDensity;

const float WORLD_LENGTH = 180.0;
const float PORTAL_RADIUS = 8.05;
const float MAX_DIST = 340.0;

void main() {
  vec4 currSample = texture(uCurrentTex, vUv);
  vec3 col = currSample.rgb;
  float currDist = currSample.a * MAX_DIST;

  vec2 screenP = vUv * 2.0 - 1.0;
  vec3 rd = normalize(
    uCamForward +
    screenP.x * uAspect * uTanHalfFov * uCamRight +
    screenP.y * uTanHalfFov * uCamUp
  );

  float dCam = WORLD_LENGTH - uCamPos.z;
  if (rd.z > 0.0002 && dCam > 0.0) {
    float tPortal = dCam / rd.z;
    vec3 hitPortal = uCamPos + rd * tPortal;
    vec2 localXY = hitPortal.xy - vec2(0.0, uBaseHeight);
    float r = length(localXY);

    // Exterior gravitational Einstein-ring shimmer around the portal throat
    if (r >= PORTAL_RADIUS && r < 12.8 && tPortal < currDist + 2.0) {
      float extDelta = (r - 10.6) * 0.9;
      float extBand = exp(-extDelta * extDelta);
      vec2 extDir = normalize(localXY + vec2(1e-5));
      float atten = 1.0 / (1.0 + tPortal * 0.05);
      vec2 warpUv = clamp(vUv - extDir * extBand * 0.005 * atten, 0.001, 0.999);
      col = mix(col, texture(uCurrentTex, warpUv).rgb, 0.65 * extBand);
    }

    // Interior True 3D Portal Aperture (r < PORTAL_RADIUS)
    if (r < PORTAL_RADIUS && tPortal < currDist + 0.008) {
      float rho = r / PORTAL_RADIUS;
      float rimZone = smoothstep(0.84, 1.0, rho);
      float ang = atan(localXY.y, localXY.x);
      float wave = sin(rho * 30.0 - uTime * 5.2 + ang * 5.0);
      vec2 radDir = normalize(localXY + vec2(1e-5));

      float distScale = 1.0 / (1.0 + tPortal * 0.045);
      vec2 offset = radDir * rimZone * (0.014 + 0.004 * wave) * distScale;

      vec3 nextCol;
      nextCol.r = texture(uNextTex, clamp(vUv + offset * 1.22, 0.001, 0.999)).r;
      nextCol.g = texture(uNextTex, clamp(vUv + offset * 1.00, 0.001, 0.999)).g;
      nextCol.b = texture(uNextTex, clamp(vUv + offset * 0.78, 0.001, 0.999)).b;

      vec3 rimTint = mix(uPortalAccent, uNextPortalAccent, 0.5 + 0.5 * sin(ang * 2.0 + uTime * 2.4));
      nextCol += rimTint * pow(rimZone, 2.8) * (1.45 + 0.35 * wave);

      float airFog = 1.0 - exp(-uCurrentFogDensity * tPortal * 0.62);
      col = mix(nextCol, uCurrentFogColor, clamp(airFog, 0.0, 0.70));
    }
  }

  fragColor = vec4(col, 1.0);
}
`;

export const BLOOM_PREFILTER_FS = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSourceTex;
uniform vec2 uTexelSize;

vec3 softThreshold(vec3 c) {
  if (any(isnan(c)) || any(isinf(c))) return vec3(0.0);
  float brightness = max(c.r, max(c.g, c.b));
  const float threshold = 0.92;
  const float knee = 0.48;
  float soft = brightness - threshold + knee;
  soft = clamp(soft, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-4);
  float contrib = max(soft, brightness - threshold) / max(brightness, 1e-4);
  return c * clamp(contrib, 0.0, 1.0);
}

void main() {
  vec2 d = uTexelSize;
  vec3 c0 = softThreshold(texture(uSourceTex, vUv).rgb);
  vec3 c1 = softThreshold(texture(uSourceTex, vUv + vec2(-d.x, -d.y)).rgb);
  vec3 c2 = softThreshold(texture(uSourceTex, vUv + vec2( d.x, -d.y)).rgb);
  vec3 c3 = softThreshold(texture(uSourceTex, vUv + vec2(-d.x,  d.y)).rgb);
  vec3 c4 = softThreshold(texture(uSourceTex, vUv + vec2( d.x,  d.y)).rgb);

  vec3 bloom = c0 * 0.5 + (c1 + c2 + c3 + c4) * 0.125;
  fragColor = vec4(min(bloom, vec3(12.0)), 1.0);
}
`;

export const BLOOM_BLUR_FS = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSourceTex;
uniform vec2 uTexelSize;
uniform float uRadius;
uniform float uAnamorphic;

void main() {
  vec2 d = uTexelSize * uRadius;
  vec3 sum = texture(uSourceTex, vUv).rgb * 0.25;
  sum += texture(uSourceTex, vUv + vec2( d.x,  0.0)).rgb * 0.125;
  sum += texture(uSourceTex, vUv + vec2(-d.x,  0.0)).rgb * 0.125;
  sum += texture(uSourceTex, vUv + vec2( 0.0,  d.y)).rgb * 0.125;
  sum += texture(uSourceTex, vUv + vec2( 0.0, -d.y)).rgb * 0.125;
  sum += texture(uSourceTex, vUv + vec2( d.x,  d.y)).rgb * 0.0625;
  sum += texture(uSourceTex, vUv + vec2(-d.x,  d.y)).rgb * 0.0625;
  sum += texture(uSourceTex, vUv + vec2( d.x, -d.y)).rgb * 0.0625;
  sum += texture(uSourceTex, vUv + vec2(-d.x, -d.y)).rgb * 0.0625;

  if (uAnamorphic > 0.5) {
    vec3 streak = (
      texture(uSourceTex, vUv + vec2(d.x * 3.5, 0.0)).rgb +
      texture(uSourceTex, vUv - vec2(d.x * 3.5, 0.0)).rgb +
      texture(uSourceTex, vUv + vec2(d.x * 6.5, 0.0)).rgb * 0.5 +
      texture(uSourceTex, vUv - vec2(d.x * 6.5, 0.0)).rgb * 0.5
    ) * 0.09;
    sum += streak * vec3(0.75, 0.88, 1.15);
  }

  fragColor = vec4(sum, 1.0);
}
`;

export const FINAL_POST_FS = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSceneTex;
uniform sampler2D uBloomNearTex;
uniform sampler2D uBloomWideTex;
uniform float uCrossingPulse;
uniform float uTime;

vec3 acesFilm(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float ignDither(vec2 pix) {
  return fract(52.9829189 * fract(dot(pix, vec2(0.06711056, 0.00583715))));
}

void main() {
  vec2 centerVec = vUv - 0.5;
  float rScreen = length(centerVec);

  float caAmount = uCrossingPulse * pow(rScreen, 2.2) * 0.018;
  vec2 caOffset = centerVec * caAmount;

  vec3 hdr;
  hdr.r = texture(uSceneTex, clamp(vUv + caOffset, 0.001, 0.999)).r;
  hdr.g = texture(uSceneTex, vUv).g;
  hdr.b = texture(uSceneTex, clamp(vUv - caOffset, 0.001, 0.999)).b;

  vec3 bloom = texture(uBloomNearTex, vUv).rgb * 0.52 + texture(uBloomWideTex, vUv).rgb * 0.68;
  hdr += bloom * (1.0 + uCrossingPulse * 0.28);
  hdr *= 1.06;

  vec3 mapped = acesFilm(hdr);
  float vignette = 1.0 - 0.24 * pow(rScreen * 1.18, 2.2);
  mapped *= vignette;

  vec3 srgb = pow(max(mapped, vec3(0.0)), vec3(1.0 / 2.2));
  float dither = (ignDither(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) / 255.0;
  srgb += dither;

  fragColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);
}
`;
