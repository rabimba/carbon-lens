// ============================================================================
// shaders.js — WebGL2 GLSL ES 3.00 Shaders with Continuum & Domain Physics:
//   • 4-Train Trochoidal Gerstner Deep-Water Dispersion (ω = sqrt(g·k))
//   • Exact No-Slip Pitch-Circle Gear Coupling from RK4 Anchor Escapement
//   • 3D Snell's Law Refraction + Cauchy Dispersion n(λ)=A+B/λ² + Schlick Fresnel
//   • Damped Radial Gravity-Capillary Mirror-Sea Impact Waves (uRipples[8])
//   • Inverse-Square Point-Light Photometry & Boussinesq Plume Roof Deflection
//   • Live Recursive FBO Portal Clipping & Split A/B Governance Fork
// ============================================================================
(function () {
  "use strict";
  const PE = (window.PortalEngine = window.PortalEngine || {});

  // --------------------------------------------------------------------------
  // 1. PROCEDURAL SKY / ENVIRONMENT SHADER (Fullscreen Triangle)
  // --------------------------------------------------------------------------
  const SKY_VS = `#version 300 es
precision highp float;
out vec2 vNDC;
void main() {
  vec2 pos = vec2(
    (gl_VertexID == 1) ? 3.0 : -1.0,
    (gl_VertexID == 2) ? 3.0 : -1.0
  );
  vNDC = pos;
  gl_Position = vec4(pos, 0.9999, 1.0);
}`;

  const SKY_FS = `#version 300 es
precision highp float;
in vec2 vNDC;
out vec4 fragColor;

uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uAspect;
uniform float uTanHalfFov;
uniform int uWorldIndex;
uniform float uTime;
uniform float uBureaucracy;
uniform int uRegimeMode;
uniform float uSplitX;
uniform vec2 uResolution;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 clampBureaucracySky(vec3 col, vec3 dir, float effB) {
  if (effB <= 0.001) return col;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 greige = vec3(0.53, 0.515, 0.475) * (0.65 + 0.45 * lum);
  float ceilingGlow = smoothstep(0.25, 0.95, dir.y) * 0.16;
  vec3 dull = mix(col, greige, 0.88) + vec3(ceilingGlow);
  return mix(col, dull, effB);
}

void main() {
  vec3 dir = normalize(
    uCamFwd +
    vNDC.x * uAspect * uTanHalfFov * uCamRight +
    vNDC.y * uTanHalfFov * uCamUp
  );

  float screenX = gl_FragCoord.x / max(1.0, uResolution.x);
  float effB = (uRegimeMode == 2) ? step(uSplitX, screenX) : uBureaucracy;
  float animT = uTime * mix(1.0, 0.08, effB);

  vec3 col = vec3(0.1);
  float y = dir.y;

  if (uWorldIndex == 0) {
    vec3 top = vec3(0.16, 0.15, 0.14);
    vec3 mid = vec3(0.76, 0.72, 0.65);
    vec3 bot = vec3(0.22, 0.20, 0.18);
    col = (y >= 0.0) ? mix(mid, top, pow(y, 0.55)) : mix(mid, bot, pow(-y, 0.55));
    vec2 gridUV = dir.xz / max(0.18, abs(dir.y)) * 1.8;
    float grid = smoothstep(0.94, 0.99, max(abs(sin(gridUV.x * 3.14159)), abs(sin(gridUV.y * 3.14159))));
    col += grid * 0.06 * (1.0 - smoothstep(0.0, 0.35, abs(y)));
  } else if (uWorldIndex == 1) {
    vec3 zenith = vec3(0.14, 0.47, 0.80);
    vec3 horizon = vec3(0.76, 0.91, 0.98);
    vec3 nadir = vec3(0.55, 0.78, 0.92);
    col = (y >= 0.0) ? mix(horizon, zenith, pow(y, 0.6)) : mix(horizon, nadir, pow(-y, 0.5));
    vec2 cloudUV = dir.xz / (abs(dir.y) + 0.22) * 1.6 + vec2(animT * 0.05, -animT * 0.03);
    float c1 = noise2(cloudUV * 2.0) * 0.6 + noise2(cloudUV * 4.3) * 0.4;
    float cloudMask = smoothstep(0.50, 0.78, c1) * (1.0 - 0.35 * abs(y));
    col = mix(col, vec3(0.98, 0.99, 1.0), cloudMask * 0.82);
    vec3 sunDir = normalize(vec3(0.35, 0.52, -0.78));
    float sun = pow(max(0.0, dot(dir, sunDir)), 96.0);
    col += vec3(1.0, 0.93, 0.78) * sun * 0.9;
  } else if (uWorldIndex == 2) {
    vec3 top = vec3(0.13, 0.27, 0.45);
    vec3 mid = vec3(0.92, 0.88, 0.77);
    vec3 sea = vec3(0.06, 0.16, 0.30);
    col = (y >= 0.0) ? mix(mid, top, smoothstep(0.05, 0.72, y)) : mix(mid, sea, smoothstep(0.0, 0.35, -y));
    float grain = sin(dir.y * 140.0 + noise2(dir.xy * 18.0) * 3.0) * 0.018;
    col += grain;
  } else if (uWorldIndex == 3) {
    vec3 crown = vec3(0.07, 0.05, 0.04);
    vec3 glow = vec3(0.32, 0.15, 0.06);
    col = mix(glow, crown, smoothstep(-0.2, 0.65, abs(y)));
  } else if (uWorldIndex == 4) {
    vec3 top = vec3(0.15, 0.21, 0.33);
    vec3 warm = vec3(0.52, 0.39, 0.24);
    col = mix(warm, top, smoothstep(-0.15, 0.75, y));
    float ring = abs(fract(acos(clamp(y, -1.0, 1.0)) * 4.5) - 0.5);
    col += smoothstep(0.47, 0.495, ring) * vec3(0.30, 0.22, 0.08);
  } else {
    vec3 deep = vec3(0.02, 0.04, 0.10);
    vec3 horizon = vec3(0.07, 0.14, 0.26);
    col = mix(horizon, deep, abs(y));
    float wave = sin(dir.x * 7.0 + animT * 0.9) * cos(dir.z * 5.0 - animT * 0.6);
    float band = exp(-pow((abs(y) - 0.32 - wave * 0.08) * 6.5, 2.0));
    vec3 aurora = 0.5 + 0.5 * cos(vec3(0.0, 2.1, 4.2) + dir.x * 4.5 + animT * 0.7);
    col += aurora * band * 0.55;
  }

  col = clampBureaucracySky(col, dir, effB);
  fragColor = vec4(col, 1.0);
}`;

  // --------------------------------------------------------------------------
  // 2. WORLD UBER-MATERIAL & CONTINUUM PHYSICS SHADER
  // --------------------------------------------------------------------------
  const WORLD_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUV;
layout(location = 3) in vec3 aColor;
layout(location = 4) in vec4 aMeta; // x=matType, y=animMode, z=animSeed, w=isBureaucracy

uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform float uAnimPhase;
uniform float uEscapementAngle;
uniform float uWaveAmpScale;
uniform float uTropeAlpha;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUV;
out vec3 vColor;
out vec4 vMeta;

// Exact 4-Train Trochoidal Gerstner Deep-Water Gravity Wave Dispersion (ω = sqrt(g·k))
// Mirrors evalGerstnerSea() in js/physics.js 1:1 so Archimedes boats/spheres ride exact crests!
void applyGerstnerSea(inout vec3 pos, inout vec3 nrm, float t, float ampScale) {
  vec2 k0 = vec2(0.42, 0.22);  float km0 = 0.47413; float w0 = 2.1566; float a0 = 0.34 * ampScale; float q0 = 0.52;
  vec2 k1 = vec2(-0.31, 0.58); float km1 = 0.65765; float w1 = 2.5399; float a1 = 0.22 * ampScale; float q1 = 0.48;
  vec2 k2 = vec2(0.76, -0.35); float km2 = 0.83672; float w2 = 2.8650; float a2 = 0.14 * ampScale; float q2 = 0.42;
  vec2 k3 = vec2(-0.62, -0.88);float km3 = 1.07648; float w3 = 3.2497; float a3 = 0.09 * ampScale; float q3 = 0.38;

  vec2 xz = pos.xz;
  float th0 = dot(k0, xz) - w0 * t;
  float th1 = dot(k1, xz) - w1 * t;
  float th2 = dot(k2, xz) - w2 * t;
  float th3 = dot(k3, xz) - w3 * t;

  float s0 = sin(th0), c0 = cos(th0);
  float s1 = sin(th1), c1 = cos(th1);
  float s2 = sin(th2), c2 = cos(th2);
  float s3 = sin(th3), c3 = cos(th3);

  vec2 dispXZ =
    (q0 * a0 / km0) * k0 * s0 +
    (q1 * a1 / km1) * k1 * s1 +
    (q2 * a2 / km2) * k2 * s2 +
    (q3 * a3 / km3) * k3 * s3;

  float dispY = a0 * c0 + a1 * c1 + a2 * c2 + a3 * c3;

  pos.x -= dispXZ.x;
  pos.z -= dispXZ.y;
  pos.y += dispY;

  float nx = a0 * k0.x * s0 + a1 * k1.x * s1 + a2 * k2.x * s2 + a3 * k3.x * s3;
  float nz = a0 * k0.y * s0 + a1 * k1.y * s1 + a2 * k2.y * s2 + a3 * k3.y * s3;
  float ny = 1.0 - (q0 * a0 * km0 * c0 + q1 * a1 * km1 * c1 + q2 * a2 * km2 * c2 + q3 * a3 * km3 * c3);
  nrm = normalize(vec3(nx, max(0.15, ny), nz));
}

void main() {
  vec3 pos = aPosition;
  vec3 nrm = aNormal;
  float animMode = aMeta.y;
  float seed = aMeta.z;

  if (animMode > 0.5 && animMode < 1.5) {
    pos.y += sin(uAnimPhase * 1.6 + seed * 2.3) * 0.22;
    pos.x += cos(uAnimPhase * 1.1 + seed) * 0.07;
  } else if (animMode > 1.5 && animMode < 2.5) {
    // Mode 2: Bernoulli flow-coupled Calvino brass valves
    float ang = uAnimPhase * seed;
    vec2 center = aUV;
    vec2 rel = pos.xy - center;
    float c = cos(ang), s = sin(ang);
    pos.xy = center + vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c);
    nrm.xy = vec2(nrm.x * c - nrm.y * s, nrm.x * s + nrm.y * c);
  } else if (animMode > 2.5 && animMode < 3.5) {
    // Mode 3: Curling wave arch subtle orbital breath
    pos.y += sin(pos.z * 0.32 + uAnimPhase * 1.9 + seed) * 0.12 * uWaveAmpScale;
    pos.x += cos(pos.y * 0.4 + uAnimPhase * 1.4 + seed) * 0.05 * uWaveAmpScale;
  } else if (animMode > 3.5 && animMode < 4.5) {
    pos.x += sin(pos.y * 4.5 - uAnimPhase * 6.5 + seed) * 0.025;
    pos.z += cos(pos.y * 3.8 - uAnimPhase * 5.5 + seed) * 0.025;
  } else if (animMode > 4.5 && animMode < 5.5) {
    pos.y += sin(uAnimPhase * 3.8 + seed * 2.0) * 0.028;
  } else if (animMode > 5.5 && animMode < 6.5) {
    // Mode 6: Quarantined Cyclone of Reindeer, Manta Rays & Storks
    float ang = uAnimPhase * 2.8 + seed * 0.4;
    vec2 pivot = vec2(0.0, -4.5);
    vec2 rel = pos.xz - pivot;
    float c = cos(ang), s = sin(ang);
    pos.xz = pivot + vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c);
    pos.y += sin(uAnimPhase * 4.0 + seed * 3.0) * 0.18;
    nrm.xz = vec2(nrm.x * c - nrm.y * s, nrm.x * s + nrm.y * c);
    pos += nrm * (1.0 - uTropeAlpha) * 0.35;
  } else if (animMode > 6.5 && animMode < 7.5) {
    // Mode 7: Trochoidal Gerstner Deep-Water Gravity Wave Dispersion!
    applyGerstnerSea(pos, nrm, uAnimPhase, uWaveAmpScale);
  } else if (animMode > 7.5 && animMode < 8.5) {
    // Mode 8: Exact No-Slip Pitch-Circle Origami Gear Train driven by RK4 Escapement!
    float ang = uEscapementAngle * seed;
    vec2 center = aUV;
    vec2 rel = pos.xy - center;
    float c = cos(ang), s = sin(ang);
    pos.xy = center + vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c);
    nrm.xy = vec2(nrm.x * c - nrm.y * s, nrm.x * s + nrm.y * c);
  }

  vec4 wp = uModel * vec4(pos, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(uModel) * nrm);
  vUV = aUV;
  vColor = aColor;
  vMeta = aMeta;

  gl_Position = uProj * uView * wp;
}`;

  const WORLD_FS = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUV;
in vec3 vColor;
in vec4 vMeta;

out vec4 fragColor;

uniform vec3 uCamPos;
uniform int uWorldIndex;
uniform float uTime;
uniform float uAnimPhase;
uniform float uBureaucracy;
uniform int uRegimeMode;
uniform float uSplitX;
uniform vec2 uResolution;
uniform int uClipDir;
uniform float uClipZ;
uniform float uTropeAlpha;
uniform vec3 uColorOverride;
uniform float uUseColorOverride;
uniform vec4 uRipples[8]; // (hitX, hitZ, hitTime, impulseAmp) on Obsidian Mirror Sea!

uniform sampler2D uTexFacadeFront;
uniform sampler2D uTexPlywoodBack;
uniform sampler2D uTexStamp;

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  vec4 nx0 = mix(vec4(n000, n010, n001, n011), vec4(n100, n110, n101, n111), f.x);
  vec2 nxy = mix(nx0.xz, nx0.yw, f.y);
  return mix(nxy.x, nxy.y, f.z);
}

vec3 worldFogColor(int wIdx, float effB) {
  vec3 c = vec3(0.5);
  if (wIdx == 0) c = vec3(0.62, 0.58, 0.52);
  else if (wIdx == 1) c = vec3(0.72, 0.89, 0.97);
  else if (wIdx == 2) c = vec3(0.78, 0.77, 0.70);
  else if (wIdx == 3) c = vec3(0.18, 0.09, 0.04);
  else if (wIdx == 4) c = vec3(0.36, 0.29, 0.22);
  else c = vec3(0.05, 0.10, 0.20);

  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 greige = vec3(0.53, 0.515, 0.475) * (0.65 + 0.45 * lum);
  return mix(c, greige, effB * 0.90);
}

// Analytical Scriptorium environment probe for Snell + Cauchy chromatic dispersion
vec3 sampleScriptoriumEnv(vec3 rayDir, float t) {
  float y = rayDir.y;
  vec3 deep = vec3(0.03, 0.06, 0.15);
  vec3 horizon = vec3(0.14, 0.30, 0.52);
  vec3 base = mix(horizon, deep, abs(y));
  float rib = exp(-abs(sin(rayDir.z * 5.2 + rayDir.x * 3.1)) * 4.5);
  vec3 aurora = 0.52 + 0.48 * cos(vec3(0.0, 2.09, 4.18) + rayDir.x * 5.5 + rayDir.y * 3.2 - t * 1.1);
  return base + aurora * (0.45 + 0.55 * rib);
}

void main() {
  if (uClipDir != 0) {
    if (float(uClipDir) * (vWorldPos.z - uClipZ) > 0.0) discard;
  }

  float screenX = gl_FragCoord.x / max(1.0, uResolution.x);
  float effB = (uRegimeMode == 2) ? step(uSplitX, screenX) : uBureaucracy;

  if (vMeta.w > 0.5) {
    if (effB < 0.04) discard;
    if (effB < 0.96) {
      float dither = fract(gl_FragCoord.x * 0.37 + gl_FragCoord.y * 0.61);
      if (dither > effB) discard;
    }
  }

  float mat = vMeta.x;
  vec3 baseColor = mix(vColor, uColorOverride, uUseColorOverride);
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 L = normalize(vec3(0.42, 0.78, 0.46));
  vec3 H = normalize(L + V);

  float ndl = max(0.0, dot(N, L));
  float fresnel = pow(1.0 - max(0.0, dot(N, V)), 3.0);

  vec3 col = baseColor;

  if (mat < 0.5) {
    // 0: Escher Lithographic Limestone + Multi-Gravity Skylights
    float grain = noise3(vWorldPos * 3.5) * 0.12 + noise3(vWorldPos * 14.0) * 0.06;
    float lightBand = 0.32 + 0.68 * max(ndl, max(0.0, dot(N, normalize(vec3(-0.5, -0.6, 0.4)))));
    float h1 = sin((vWorldPos.x + vWorldPos.y + vWorldPos.z) * 26.0);
    float h2 = sin((vWorldPos.x - vWorldPos.y + vWorldPos.z) * 26.0);
    float hatch = 1.0;
    if (lightBand < 0.62) hatch -= smoothstep(0.65, 0.95, h1) * 0.22;
    if (lightBand < 0.42) hatch -= smoothstep(0.65, 0.95, h2) * 0.26;
    col = (baseColor + grain - 0.08) * lightBand * hatch;
    col += vec3(0.95, 0.75, 0.38) * fresnel * 0.16;
  } else if (mat < 1.5) {
    float pulse = 0.92 + 0.08 * sin(uAnimPhase * 3.2 + vWorldPos.z);
    col = baseColor * (1.18 * pulse) + vec3(0.28, 0.18, 0.05) * fresnel;
  } else if (mat < 2.5) {
    float brush = sin(vWorldPos.y * 65.0 + vWorldPos.x * 20.0) * 0.04;
    float spec = pow(max(0.0, dot(N, H)), 42.0);
    float patina = smoothstep(0.58, 0.82, noise3(vWorldPos * 2.4));
    vec3 baseMetal = mix(baseColor + brush, vec3(0.28, 0.62, 0.50), patina * 0.30);
    col = baseMetal * (0.38 + 0.68 * ndl) + vec3(1.0, 0.90, 0.72) * spec * 0.78;
    col += vec3(0.55, 0.80, 0.98) * fresnel * 0.28;
  } else if (mat < 3.5) {
    // 3: Calvino Torricelli Water Jet & Basin Surface (Schlick water R0 = 0.02)
    float r0w = 0.02;
    float fWater = r0w + (1.0 - r0w) * pow(1.0 - max(0.0, dot(N, V)), 5.0);
    float flow = sin(vWorldPos.y * 12.0 - uAnimPhase * 11.0) * 0.5 + 0.5;
    float sparkle = pow(max(0.0, dot(N, H)), 72.0);
    col = mix(vec3(0.32, 0.74, 0.96), vec3(0.94, 0.99, 1.0), flow * 0.45 + fWater * 0.55);
    col += vec3(1.0) * sparkle * 0.95;
  } else if (mat < 4.5) {
    float spec = pow(max(0.0, dot(N, H)), 80.0);
    col = baseColor * (0.55 + 0.48 * ndl) + vec3(1.0) * spec * 0.85 + vec3(0.45, 0.72, 0.92) * fresnel * 0.25;
  } else if (mat < 5.5) {
    // 5: Hokusai Gerstner Ocean Surface & Curling Wave Ribs
    float cel = (ndl > 0.58) ? 1.10 : (ndl > 0.24 ? 0.84 : 0.58);
    float woodgrain = sin(vWorldPos.y * 32.0 + noise3(vWorldPos * 3.0) * 4.0) * 0.035;
    float inkEdge = smoothstep(0.30, 0.08, abs(dot(N, V)));
    // Whitecap foam on steep Gerstner wave crests!
    float crestFoam = smoothstep(0.28, 0.62, vWorldPos.y) * smoothstep(0.96, 0.78, N.y);
    col = (baseColor * cel + woodgrain);
    col = mix(col, vec3(0.95, 0.93, 0.86), clamp(crestFoam * 0.75 + smoothstep(4.2, 6.8, vWorldPos.y) * 0.35, 0.0, 0.9));
    col = mix(col, vec3(0.04, 0.07, 0.13), inkEdge * 0.75);
  } else if (mat < 6.5) {
    float paper = noise3(vWorldPos * 12.0) * 0.06;
    float inkEdge = smoothstep(0.26, 0.06, abs(dot(N, V)));
    col = (baseColor + paper) * (0.76 + 0.28 * ndl);
    col = mix(col, vec3(0.08, 0.16, 0.28), inkEdge * 0.65);
  } else if (mat < 7.5) {
    // 7: Lascaux Exact Inverse-Square Point-Light Photometry: E = I0·(n·l)/(4π(d² + r_core²))
    float bump = noise3(vWorldPos * 4.5) * 0.22 + noise3(vWorldPos * 16.0) * 0.09;
    vec3 bumpN = normalize(N + vec3(bump - 0.15) * 0.45);
    float f1 = 1.0 + 0.14 * sin(uAnimPhase * 9.3) + 0.08 * sin(uAnimPhase * 17.1);
    float f2 = 1.0 + 0.13 * cos(uAnimPhase * 8.1 + 1.4) + 0.07 * sin(uAnimPhase * 14.3);
    vec3 torches[4] = vec3[4](
      vec3(-3.4, 1.75, 9.0),
      vec3(3.4, 1.75, 3.0),
      vec3(-3.4, 1.75, -4.5),
      vec3(3.4, 1.75, -11.5)
    );
    vec3 irradiance = vec3(0.06, 0.038, 0.024);
    float luminousIntensity = 98.0; // Candela-scaled Paleolithic tallow torch!
    for (int i = 0; i < 4; i++) {
      vec3 toLight = torches[i] - vWorldPos;
      float d2 = dot(toLight, toLight);
      vec3 lDir = toLight * inversesqrt(max(1e-4, d2));
      float invSq = luminousIntensity / (12.56637 * (d2 + 1.35));
      float flick = (i % 2 == 0) ? f1 : f2;
      irradiance += vec3(1.0, 0.56, 0.19) * max(0.08, dot(bumpN, lDir)) * invSq * flick;
    }
    col = baseColor * (0.86 + bump * 0.35) * irradiance;
  } else if (mat < 8.5) {
    // 8: Origami Backlit Cotton Vellum (Radiative Subsurface Scattering)
    float fiber = noise3(vWorldPos * 22.0) * 0.06;
    vec3 keyLight = normalize(vec3(0.25, 0.65, -0.70));
    float diff = 0.45 + 0.55 * max(0.0, dot(N, keyLight));
    float sss = pow(max(0.0, dot(V, -keyLight)), 2.4) * 0.48 + (1.0 - abs(dot(N, keyLight))) * 0.22;
    col = (baseColor + fiber) * diff + vec3(1.0, 0.78, 0.42) * sss;
  } else if (mat < 9.5) {
    // 9: Hyperbolic Dense Flint Crystal — 3D Snell's Law + Cauchy Dispersion n(λ)=A+B/λ² + Schlick Fresnel!
    // Dense flint optical glass: A = 1.62, B = 0.0134 μm² -> n(0.65)=1.6517, n(0.53)=1.6677, n(0.45)=1.6862
    vec3 I = -V;
    vec3 refrR = refract(I, N, 1.0 / 1.6517);
    vec3 refrG = refract(I, N, 1.0 / 1.6677);
    vec3 refrB = refract(I, N, 1.0 / 1.6862);
    vec3 reflDir = reflect(I, N);

    float r0 = 0.0627; // ((1.6677 - 1) / (1.6677 + 1))^2
    float schlickF = r0 + (1.0 - r0) * pow(1.0 - max(0.0, dot(N, V)), 5.0);

    vec3 transmitted = vec3(
      sampleScriptoriumEnv(refrR, uAnimPhase).r,
      sampleScriptoriumEnv(refrG, uAnimPhase).g,
      sampleScriptoriumEnv(refrB, uAnimPhase).b
    );
    vec3 reflected = sampleScriptoriumEnv(reflDir, uAnimPhase) + vec3(1.0) * pow(max(0.0, dot(N, H)), 96.0);
    col = mix(transmitted * (0.55 + 0.55 * baseColor), reflected, schlickF) + baseColor * 0.18;
  } else if (mat < 10.5) {
    // 10: Obsidian Mirror Sea + Damped Radial Gravity-Capillary Surface Waves from Sphere Impacts!
    vec2 gradRipple = vec2(0.0);
    float rippleElev = 0.0;
    for (int i = 0; i < 8; i++) {
      vec4 rp = uRipples[i];
      if (rp.w > 0.001) {
        float tau = uTime - rp.z;
        if (tau > 0.0 && tau < 9.0) {
          vec2 delta = vWorldPos.xz - rp.xy;
          float r = length(delta);
          // Gravity-capillary phase speed cp ≈ 1.45 m/s, wavenumber k = 5.4 rad/m
          float front = smoothstep(1.65 * tau + 0.5, 1.65 * tau - 0.25, r);
          float atten = rp.w * exp(-0.62 * tau - 0.12 * r) * inversesqrt(1.0 + r * 1.5) * front;
          float phase = 5.4 * r - 7.8 * tau;
          rippleElev += atten * sin(phase);
          vec2 rHat = delta / max(0.02, r);
          gradRipple += rHat * (atten * 5.4 * cos(phase));
        }
      }
    }
    vec3 mirrorN = normalize(vec3(-gradRipple.x * 0.35, 1.0, -gradRipple.y * 0.35));
    vec3 reflDir = reflect(-V, mirrorN);
    float r0m = 0.08;
    float fMirror = r0m + (1.0 - r0m) * pow(1.0 - max(0.0, dot(mirrorN, V)), 5.0);

    float w1 = sin(vWorldPos.x * 2.6 + uAnimPhase * 1.7 + gradRipple.x * 2.0) * cos(vWorldPos.z * 2.1 - uAnimPhase * 1.3);
    float w2 = sin((vWorldPos.x - vWorldPos.z) * 3.4 - uAnimPhase * 2.1 + gradRipple.y * 2.0);
    float causticBand = pow(max(0.0, 0.5 + 0.5 * (w1 + w2) * 0.5), 4.0);
    vec3 specRainbow = 0.5 + 0.5 * cos(vec3(0.2, 2.3, 4.4) + vWorldPos.x * 0.8 + uAnimPhase + rippleElev * 8.0);
    float ribReflect = exp(-abs(fract((vWorldPos.z + gradRipple.y * 0.4) / 3.0 + 0.5) - 0.5) * 9.0) * exp(-abs(vWorldPos.x) * 0.18);
    vec3 envRefl = sampleScriptoriumEnv(reflDir, uAnimPhase);
    col = vec3(0.02, 0.04, 0.09) + envRefl * fMirror * 0.85 + specRainbow * (causticBand * 0.44 + ribReflect * 0.40 + abs(rippleElev) * 2.4);
  } else if (mat < 11.5) {
    col = texture(uTexFacadeFront, vUV).rgb;
  } else if (mat < 12.5) {
    col = texture(uTexPlywoodBack, vUV).rgb * (0.65 + 0.35 * ndl);
  } else if (mat < 13.5) {
    float grain = sin(vWorldPos.y * 45.0 + noise3(vWorldPos * 8.0) * 5.0) * 0.07;
    col = (baseColor + grain) * (0.48 + 0.52 * ndl);
  } else if (mat < 14.5) {
    col = baseColor * (0.56 + 0.44 * ndl);
  } else if (mat < 15.5) {
    col = texture(uTexStamp, vUV).rgb;
  } else {
    float scan = 0.55 + 0.45 * sin(gl_FragCoord.y * 1.4 - uTime * 18.0);
    float shield = fract(vWorldPos.y * 3.0 - uTime * 4.0);
    if (shield > uTropeAlpha * 0.95) discard;
    col = mix(baseColor, vec3(1.0, 0.28, 0.22), 1.0 - uTropeAlpha) * scan * 1.35;
  }

  // §88.2 & §119.6 Bureaucracy Desaturation Clamp on Sovereign World Materials
  if (mat < 10.5 && effB > 0.001) {
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 committeeGreige = vec3(0.54, 0.525, 0.485) * (0.35 + 0.72 * lum);
    vec3 compliantCol = mix(committeeGreige, col, 0.13) + vec3(0.05, 0.055, 0.055);
    col = mix(col, compliantCol, effB);
  }

  float dist = length(uCamPos - vWorldPos);
  float fogAmt = smoothstep(14.0, 48.0, dist);
  col = mix(col, worldFogColor(uWorldIndex, effB), fogAmt * 0.78);

  col = col / (1.0 + col * 0.18);
  fragColor = vec4(col, 1.0);
}`;

  // --------------------------------------------------------------------------
  // 3. LIVE FBO PORTAL WINDOW SHADER
  // --------------------------------------------------------------------------
  const PORTAL_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec2 aUV;

uniform mat4 uProj;
uniform mat4 uView;

out vec3 vWorldPos;
out vec2 vUV;

void main() {
  vWorldPos = aPosition;
  vUV = aUV;
  gl_Position = uProj * uView * vec4(aPosition, 1.0);
}`;

  const PORTAL_FS = `#version 300 es
precision highp float;
in vec3 vWorldPos;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uPortalTex;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uRimColor;
uniform float uBureaucracy;
uniform int uRegimeMode;
uniform float uSplitX;
uniform int uClipDir;
uniform float uClipZ;

void main() {
  if (uClipDir != 0) {
    if (float(uClipDir) * (vWorldPos.z - uClipZ) > 0.0) discard;
  }
  vec2 screenUV = gl_FragCoord.xy / max(vec2(1.0), uResolution);
  float effB = (uRegimeMode == 2) ? step(uSplitX, screenUV.x) : uBureaucracy;

  float dx = 3.12 - abs(vWorldPos.x);
  float dy = min(vWorldPos.y, 6.62 - vWorldPos.y);
  float edgeDist = min(dx, dy);

  float rimMask = 1.0 - smoothstep(0.0, 0.22, edgeDist);
  vec2 ripple = vec2(
    sin(vWorldPos.y * 5.0 + uTime * 3.2),
    cos(vWorldPos.x * 5.0 - uTime * 2.7)
  ) * rimMask * 0.004 * (1.0 - 0.85 * effB);

  vec3 nextWorldCol = texture(uPortalTex, clamp(screenUV + ripple, 0.001, 0.999)).rgb;

  vec3 activeRim = mix(uRimColor, vec3(0.65, 0.62, 0.52), effB * 0.85);
  float glow = smoothstep(0.20, 0.0, edgeDist) * 0.65;
  vec3 finalCol = nextWorldCol + activeRim * glow;

  fragColor = vec4(finalCol, 1.0);
}`;

  // --------------------------------------------------------------------------
  // 4. ATMOSPHERIC PARTICLES & BOUSSINESQ THERMAL PLUME SHADER
  // --------------------------------------------------------------------------
  const PARTICLE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aSeed; // xyz = base pos, w = phase

uniform mat4 uProj;
uniform mat4 uView;
uniform float uAnimPhase;
uniform int uWorldIndex;
uniform vec2 uResolution;

out float vAlpha;
out vec3 vPColor;
out vec3 vWorldPos;

void main() {
  vec3 p = aSeed.xyz;
  float s = aSeed.w;

  if (uWorldIndex == 1) {
    // Armilla ballistic mist droplets accelerating under g = 9.81 m/s² with terminal drag
    float tau = mod(uAnimPhase * (0.55 + s * 0.35) + s * 6.0, 2.2);
    p.y = max(-8.0, 7.8 - 2.4 * tau - 1.35 * tau * tau);
    vPColor = vec3(0.75, 0.94, 1.0);
  } else if (uWorldIndex == 2) {
    // Hokusai orbital sea-spray droplets
    p.x += sin(uAnimPhase * 1.4 + s * 6.28) * 0.52;
    p.y += cos(uAnimPhase * 1.4 + s * 6.28) * 0.42;
    vPColor = vec3(0.97, 0.95, 0.89);
  } else if (uWorldIndex == 3) {
    // Lascaux Boussinesq Thermal Buoyancy Plumes (a = g·β·ΔT(τ) - γ·v) + Elastic Cave-Roof Deflection!
    int torchIdx = gl_VertexID % 4;
    vec2 hearth = (torchIdx == 0) ? vec2(-3.4, 9.0) :
                  (torchIdx == 1) ? vec2(3.4, 3.0) :
                  (torchIdx == 2) ? vec2(-3.4, -4.5) : vec2(3.4, -11.5);
    float life = mod(uAnimPhase * (0.48 + s * 0.28) + s * 7.3, 4.2);
    // Exponential Newton cooling T(t) - T_inf = dT0 * exp(-0.45 * life)
    float tempRatio = exp(-0.45 * life);
    // Integrated Boussinesq buoyant rise height
    float rawY = 1.65 + 2.35 * life - 0.85 * (1.0 - tempRatio);
    float swirlAngle = life * 2.2 + s * 6.2831;
    float plumeR = (0.14 + 0.28 * life) * (0.5 + 0.5 * fract(s * 13.7));
    float px = hearth.x + cos(swirlAngle) * plumeR;
    float pz = hearth.y + sin(swirlAngle) * plumeR;

    // Curved limestone cavern ceiling arch boundary: y_roof(x) = 7.45 * sqrt(1 - (x/6.6)^2)
    float roofY = 7.35 * sqrt(max(0.08, 1.0 - pow(clamp(px / 6.6, -0.96, 0.96), 2.0)));
    if (rawY > roofY) {
      // Elastic/tangential ceiling plume deflection & lateral spread toward cavern crown!
      float excess = rawY - roofY;
      px -= sign(px) * excess * 0.82;
      roofY = 7.35 * sqrt(max(0.08, 1.0 - pow(clamp(px / 6.6, -0.96, 0.96), 2.0)));
      rawY = roofY - 0.08 - 0.12 * abs(sin(excess * 3.5));
    }
    p = vec3(px, rawY, pz);
    // Blackbody-inspired cooling color: bright yellow-orange ember -> deep red -> warm smoke
    vPColor = mix(vec3(0.45, 0.22, 0.12), vec3(1.0, 0.78, 0.26), tempRatio);
  } else if (uWorldIndex == 5) {
    p.y += sin(uAnimPhase * 1.1 + s * 6.28) * 0.5;
    vPColor = 0.55 + 0.45 * cos(vec3(0.0, 2.1, 4.2) + s * 6.28 + uAnimPhase);
  } else {
    p.y += sin(uAnimPhase * 0.8 + s * 6.28) * 0.4;
    p.x += cos(uAnimPhase * 0.6 + s * 6.28) * 0.3;
    vPColor = vec3(0.96, 0.86, 0.62);
  }

  vWorldPos = p;
  vec4 viewPos = uView * vec4(p, 1.0);
  gl_Position = uProj * viewPos;
  float dist = max(1.0, -viewPos.z);
  gl_PointSize = clamp((uResolution.y * 0.022) / dist, 1.5, 11.0);
  vAlpha = smoothstep(28.0, 4.0, dist) * (0.45 + 0.45 * sin(uAnimPhase * 2.5 + s * 12.0));
}`;

  const PARTICLE_FS = `#version 300 es
precision highp float;
in float vAlpha;
in vec3 vPColor;
in vec3 vWorldPos;
out vec4 fragColor;

uniform float uBureaucracy;
uniform int uRegimeMode;
uniform float uSplitX;
uniform vec2 uResolution;
uniform int uClipDir;
uniform float uClipZ;

void main() {
  if (uClipDir != 0) {
    if (float(uClipDir) * (vWorldPos.z - uClipZ) > 0.0) discard;
  }
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;

  float screenX = gl_FragCoord.x / max(1.0, uResolution.x);
  float effB = (uRegimeMode == 2) ? step(uSplitX, screenX) : uBureaucracy;
  float soft = exp(-r2 * 14.0);
  vec3 c = mix(vPColor, vec3(0.55, 0.54, 0.50), effB * 0.9);
  fragColor = vec4(c, soft * vAlpha * (1.0 - 0.72 * effB));
}`;

  PE.Shaders = {
    SKY_VS,
    SKY_FS,
    WORLD_VS,
    WORLD_FS,
    PORTAL_VS,
    PORTAL_FS,
    PARTICLE_VS,
    PARTICLE_FS
  };
})();
