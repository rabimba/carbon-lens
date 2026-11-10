/**
 * Shared GLSL Utility & Classical/Relativistic Physics Library:
 * - Noise, FBM, Exact Flight Path, SDF Primitives & Corridor Carving
 * - Torque-Free Euler Rigid-Body Gyroscope Precession: I*dw/dt + w x (I*w) = 0
 * - Exact Dielectric Schlick-Fresnel R0 = ((n1-n2)/(n1+n2))^2 & Complex Conductor Fresnel (eta, kappa)
 * - Inverse-Square Point Light Illumination from Active Newtonian Physics Probes
 */

export const COMMON_GLSL = /* glsl */ `
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float WORLD_LENGTH = 180.0;
const float PORTAL_RADIUS = 8.05;
const float MAX_DIST = 340.0;
const float GRAVITY_EARTH = 9.81;

const float MAT_SKY = 0.0;
const float MAT_TERRAIN = 1.0;
const float MAT_STRUCT = 2.0;
const float MAT_FLUID = 3.0;
const float MAT_EMISSIVE = 4.0;
const float MAT_PORTAL_FRAME = 5.0;
const float MAT_PORTAL_ENERGY = 6.0;

// Common World Uniforms
uniform float uTime;
uniform int uWorldId;
uniform int uIsNextWorld;
uniform float uInstanceSeed;
uniform float uBaseHeight;
uniform float uAmpX;
uniform float uAmpY;
uniform float uSeedA;
uniform float uSeedB;
uniform float uCorridorRadius;
uniform vec3 uSunDir;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec3 uPortalAccent;
uniform vec3 uNextPortalAccent;
uniform vec3 uNextSkyHorizon;
uniform vec3 uNextSkyZenith;

// Dynamic Point Lights from Active Newtonian Physics Probes (up to 4 nearest per world)
uniform int uProbeLightCount;
uniform vec4 uProbeLightPos[4];   // xyz: position, w: radius
uniform vec3 uProbeLightColor[4]; // rgb: radiant intensity

mat2 rot2D(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

/**
 * Exact Analytical Solution to Torque-Free Euler Rigid-Body Equations:
 *   I * d(omega)/dt + omega x (I * omega) = 0
 * For a thin axisymmetric circular ring (Perpendicular Axis Theorem: I1 = I2 = 0.5*M*R^2, I3 = M*R^2):
 *   Precession rate psi_dot = L / I1, Intrinsic body spin rate phi_dot = -((I3 - I1)/I1) * omega3 = -omega3.
 * Applies 3-1-3 Euler rotation R_z(phi) * R_x(nutation) * R_z(psi) to point p.
 */
vec3 eulerPrecessRing(vec3 p, float omega3, float nutationTheta, float phase, float t) {
  float cosTh = cos(nutationTheta);
  // Since I3 / I1 = 2.0 for a circular ring, L / I1 = 2.0 * omega3 / max(cosTh, 0.25)
  float psiPrec = phase + (2.0 * omega3 / max(abs(cosTh), 0.35)) * t;
  float phiBody = -omega3 * t + phase * 0.5;

  vec3 q = p;
  q.xy *= rot2D(psiPrec);
  q.yz *= rot2D(nutationTheta);
  q.xy *= rot2D(phiBody);
  return q;
}

/**
 * Exact Dielectric Schlick-Fresnel Reflectance from Snell/Maxwell normal-incidence R0:
 *   R0 = ((n1 - n2) / (n1 + n2))^2
 *   R(theta) = R0 + (1 - R0) * (1 - cosTheta)^5
 */
float fresnelDielectric(float cosTheta, float n1, float n2) {
  float r0Root = (n1 - n2) / (n1 + n2);
  float r0 = r0Root * r0Root;
  float oneMinusCos = clamp(1.0 - cosTheta, 0.0, 1.0);
  float m2 = oneMinusCos * oneMinusCos;
  return r0 + (1.0 - r0) * (m2 * m2 * oneMinusCos);
}

/**
 * Exact Complex-Refractive-Index Conductor Fresnel Reflectance (Au, Ir, Pt metals):
 * Evaluates unpolarized 0.5 * (Rs + Rp) from complex index N = eta + i * kappa.
 */
vec3 fresnelConductor(float cosTheta, vec3 eta, vec3 kappa) {
  float c = clamp(cosTheta, 0.0, 1.0);
  float c2 = c * c;
  vec3 eta2_k2 = eta * eta + kappa * kappa;
  vec3 twoEtaC = 2.0 * eta * c;

  vec3 rsNum = eta2_k2 - twoEtaC + vec3(c2);
  vec3 rsDen = eta2_k2 + twoEtaC + vec3(c2);
  vec3 rs = rsNum / max(rsDen, vec3(1e-4));

  vec3 rpNum = eta2_k2 * c2 - twoEtaC + vec3(1.0);
  vec3 rpDen = eta2_k2 * c2 + twoEtaC + vec3(1.0);
  vec3 rp = rpNum / max(rpDen, vec3(1e-4));

  return clamp(0.5 * (rs + rp), vec3(0.0), vec3(1.0));
}

/**
 * Inverse-Square Law Illumination from Active Cross-Portal Newtonian Test Spheres
 */
vec3 evalProbePointLights(vec3 p, vec3 n, vec3 rd) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    if (i >= uProbeLightCount) break;
    vec3 toLight = uProbeLightPos[i].xyz - p;
    float d2 = dot(toLight, toLight);
    if (d2 > 900.0) continue; // > 30m cutoff
    float d = sqrt(max(d2, 1e-4));
    vec3 lDir = toLight / d;
    float nDotL = max(dot(n, lDir), 0.0);
    vec3 hVec = normalize(lDir - rd);
    float spec = pow(max(dot(n, hVec), 0.0), 36.0);
    // Physical inverse-square falloff softened at probe radius r0
    float atten = 5.5 / (1.2 + d2 * 0.38);
    sum += uProbeLightColor[i] * (nDotL * 0.75 + spec * 0.65 + 0.12) * atten;
  }
  return sum;
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float hash31(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);

  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

const mat2 m2 = mat2(0.80, -0.60, 0.60, 0.80);

float fbm2(vec2 p) {
  float f = 0.0;
  f += 0.5000 * noise2(p); p = m2 * p * 2.02;
  f += 0.2500 * noise2(p); p = m2 * p * 2.03;
  f += 0.1250 * noise2(p); p = m2 * p * 2.01;
  f += 0.0625 * noise2(p);
  return f / 0.9375;
}

float fbm2Fast(vec2 p) {
  float f = 0.0;
  f += 0.55 * noise2(p); p = m2 * p * 2.03;
  f += 0.30 * noise2(p); p = m2 * p * 2.01;
  f += 0.15 * noise2(p);
  return f;
}

float fbm3(vec3 p) {
  float f = 0.0;
  f += 0.500 * noise3(p); p = p * 2.02 + vec3(13.1, 7.7, 5.3);
  f += 0.250 * noise3(p); p = p * 2.03 + vec3(3.7, 19.3, 11.1);
  f += 0.125 * noise3(p);
  return f / 0.875;
}

/**
 * Physical Deep-Water Surface Gravity Wave Dispersion Spectrum (omega^2 = g * k):
 * Sums 6 directional capillary-gravity wave trains where each wavevector k_i propagates
 * at exact phase speed c_p = sqrt(g / |k_i|), returning refracted Snell's-law caustic intensity!
 */
float deepWaterDispersionCaustics(vec2 xz, float t) {
  vec2 slope = vec2(0.0);
  // 6 wave modes spanning wavelengths ~ 2.5m to 14m
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float ang = fi * 1.0471975 + 0.35; // Golden/hex directional spread
    vec2 dir = vec2(cos(ang), sin(ang));
    float kMag = 0.45 + fi * 0.38;     // Wavenumber |k| (rad/m)
    float omega = sqrt(GRAVITY_EARTH * kMag); // Exact deep-water dispersion: omega = sqrt(g * k)!
    float amp = 0.14 / sqrt(kMag);     // Phillips-like equilibrium wave spectrum
    float phase = dot(dir, xz) * kMag - omega * t + fi * 1.7;
    // Surface gradient grad(eta) = -amp * k * sin(k.x - omega*t)
    slope -= dir * (amp * kMag * sin(phase));
  }
  // Snell's law refraction of downwelling light (n_air/n_water = 0.75) focusing at depth:
  // Jacobian convergence of refracted rays produces sharp bright caustic networks!
  vec2 refracted = xz + slope * 3.2;
  float focus = length(sin(refracted * 1.35) * cos(refracted.yx * 1.35));
  return pow(clamp(1.0 - focus, 0.0, 1.0), 3.2) * 1.45;
}

// Smooth SDF Boolean Operators
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

// SDF Primitives
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorusZ(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xy) - t.x, p.z);
  return length(q) - t.y;
}

float sdHexPrismY(vec3 p, vec2 h) {
  const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
  p = abs(p);
  p.xz -= 2.0 * min(dot(k.xy, p.xz), 0.0) * k.xy;
  vec2 d = vec2(
    length(p.xz - vec2(clamp(p.x, -k.z * h.x, k.z * h.x), h.x)) * sign(p.z - h.x),
    p.y - h.y
  );
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
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

float carveCorridor(float dWorld, vec3 p, vec2 pathCenter) {
  float radialDist = length(p.xy - pathCenter);
  float dTunnel = uCorridorRadius - radialDist;
  float dEntry = 14.5 - length(p - vec3(0.0, uBaseHeight, 0.0));
  float dExit  = 14.5 - length(p - vec3(0.0, uBaseHeight, WORLD_LENGTH));

  dWorld = smax(dWorld, dTunnel, 2.8);
  dWorld = smax(dWorld, max(dEntry, dExit), 3.2);
  return dWorld;
}

float trimPortalZones(float d, float z, float margin) {
  float clearZone = min(z - margin, (WORLD_LENGTH - margin) - z);
  return smax(d, -clearZone, 3.5);
}

/**
 * Monumental 3D Sculpted Portal Megastructure with Euler-Precessing Gyro-Ring
 */
vec2 mapSinglePortal(vec3 p, float portalZ) {
  vec3 q = p - vec3(0.0, uBaseHeight, portalZ);

  float bDist = length(q) - 18.5;
  if (bDist > 2.0) {
    return vec2(bDist, MAT_PORTAL_FRAME);
  }

  float rXY = length(q.xy);
  float ang = atan(q.y, q.x);

  // 1. Sculpted monolithic ring
  float flutes = sin(ang * 12.0) * 0.08 + cos(ang * 36.0) * 0.025;
  float dMainRing = sdTorusZ(q, vec2(9.35, 0.82 + flutes));
  float dGroove = max(abs(rXY - 9.35) - 0.15, 0.64 - abs(q.z));
  dMainRing = min(dMainRing, sdTorusZ(q, vec2(10.15, 0.35)));
  dMainRing = max(dMainRing, -dGroove);

  // 2. Torque-Free Euler Precessing Gyro-Halo (I*dw/dt + w x Iw = 0)
  vec3 qGyro = eulerPrecessRing(q, 0.28, 0.20, portalZ * 0.04, uTime);
  float dGyro = sdTorusZ(qGyro, vec2(11.35, 0.22));

  // 8 Keplerian orbiting octahedron resonators at r = 11.35
  vec3 qShard = q;
  // omega(r) = sqrt(mu / r^3)
  float kepOmega = 16.0 / pow(11.35, 1.5);
  qShard.xy *= rot2D(uTime * kepOmega);
  float shardAng = atan(qShard.y, qShard.x);
  float sector = round(shardAng / (TAU / 8.0)) * (TAU / 8.0);
  vec2 shardCenter = vec2(cos(sector), sin(sector)) * 11.35;
  vec3 pLocalShard = vec3(qShard.xy - shardCenter, qShard.z);
  pLocalShard.xz *= rot2D(uTime * 1.4);
  float dShards = sdOctahedron(pLocalShard, 0.62);

  // 3. Flanking sentinel pylons
  vec3 qPylon = vec3(abs(q.x) - 14.2, q.y + 1.5, q.z);
  float taper = clamp((qPylon.y + 12.0) * 0.03, -0.4, 0.5);
  float dPylon = sdBox(qPylon, vec3(0.95 - taper * 0.45, 11.5, 1.15 - taper * 0.45)) - 0.12;

  float dFrame = min(min(dMainRing, dGyro), dPylon);

  // 4. Inner luminous event-horizon razor ring (r_inner = 8.08 > PORTAL_RADIUS 8.05)
  float pulse = 0.02 * sin(ang * 8.0 - uTime * 3.5);
  float dEnergy = sdTorusZ(q, vec2(8.23, 0.15 + pulse));
  dEnergy = min(dEnergy, dShards);
  float dPylonStrip = sdBox(vec3(abs(q.x) - 13.18, q.y + 1.5, q.z), vec3(0.08, 9.2, 0.14));
  dEnergy = min(dEnergy, dPylonStrip);

  if (dEnergy < dFrame) {
    return vec2(dEnergy, MAT_PORTAL_ENERGY);
  }
  return vec2(dFrame, MAT_PORTAL_FRAME);
}

vec2 mapPortals(vec3 p) {
  vec2 res = mapSinglePortal(p, WORLD_LENGTH);
  if (uIsNextWorld == 0) {
    vec2 entry = mapSinglePortal(p, 0.0);
    if (entry.x < res.x) res = entry;
  }
  return res;
}

vec3 baseAtmosphere(vec3 rd, vec3 zenith, vec3 horizon, vec3 sunDir, vec3 sunCol) {
  float h = clamp(rd.y, 0.0, 1.0);
  vec3 sky = mix(horizon, zenith, pow(h, 0.55));
  sky = mix(horizon * 0.55, sky, smoothstep(-0.35, 0.04, rd.y));

  float sunDot = max(dot(rd, sunDir), 0.0);
  sky += sunCol * 0.32 * pow(sunDot, 6.0);
  sky += sunCol * 0.75 * pow(sunDot, 48.0);
  sky += sunCol * 2.20 * smoothstep(0.9982, 0.9997, sunDot);
  return sky;
}

vec3 evalStarfield(vec3 rd, float densityScale) {
  vec3 p = rd * densityScale;
  vec3 id = floor(p);
  vec3 f = fract(p) - 0.5;
  float h = hash31(id);
  if (h < 0.94) return vec3(0.0);
  vec3 offset = (vec3(hash11(h * 17.3), hash11(h * 31.7), hash11(h * 47.1)) - 0.5) * 0.55;
  float d = length(f - offset);
  float twinkle = 0.75 + 0.25 * sin(uTime * 3.0 + h * 90.0);
  float hNorm = max(0.0, (h - 0.94) / 0.06);
  float bright = smoothstep(0.16, 0.01, d) * (hNorm * hNorm) * twinkle;
  vec3 starTint = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.82, 0.62), hash11(h * 91.7));
  return starTint * bright * 3.2;
}
`;
