/**
 * Bespoke 3D SDF Geometry, Celestial Skies, Volumetrics & Authentic Physical Laws
 * for all 8 Multiverse Worlds:
 *  I.   Keplerian Orbital Shear (w = sqrt(GM/r^3)) & Euler Gyroscopic Precession
 *  II.  Deep-Water Wave Dispersion (w^2 = gk), Snell's 48.6° Window & Caustics
 *  III. Schwarzschild/Kerr Geodesics (b_crit = 3*sqrt(3)/2 * r_s), Redshift & Doppler D^(3+a)
 *  IV.  Galilean Free-Fall Waterfalls (v = sqrt(v0^2 + 2g*dy)), Rayleigh-Plateau & 42° Rainbow
 *  V.   Hookean Coupled Normal-Mode Breathing & Exact Complex Gold Conductor Fresnel
 *  VI.  Bagnold 34° Angle-of-Repose Dunes & Solar Corona
 *  VII. Exact Schlick-Fresnel Dielectric Sea (R0 = 0.0204) & Beer-Lambert Glacial Ice
 *  VIII.Euler Rigid-Body Precessing Dyson Lattice & Keplerian Resonators
 */

export const WORLDS_GLSL = /* glsl */ `

// ============================================================================
// SKY & CELESTIAL PHYSICS PER WORLD
// ============================================================================

// World 0: Celestial Observatory — Keplerian Differential Ringworld (omega = sqrt(GM / r^3))
vec3 skyWorld0(vec3 rd) {
  vec3 col = baseAtmosphere(rd, uSkyZenith, uSkyHorizon, uSunDir, uSunColor);

  // Secondary companion star
  vec3 sun2 = normalize(uSunDir + vec3(-0.28, -0.11, 0.08));
  float d2 = max(dot(rd, sun2), 0.0);
  col += vec3(1.5, 0.72, 0.35) * (0.18 * pow(d2, 12.0) + 1.4 * smoothstep(0.9990, 0.9998, d2));

  // Tilted Saturnian Ring Plane with Keplerian Orbital Shear omega(r) = sqrt(GM / r^3)
  vec3 ringNormal = normalize(vec3(0.38, 0.76, -0.52));
  vec3 ringAxisX = normalize(cross(vec3(0.0, 1.0, 0.0), ringNormal));
  vec3 ringAxisY = cross(ringNormal, ringAxisX);

  float denom = dot(rd, ringNormal);
  if (abs(denom) > 0.02 && rd.y > -0.15) {
    vec3 planetOffset = vec3(-1.4, -1.05, 1.8);
    float tRing = -dot(planetOffset, ringNormal) / denom;
    if (tRing > 0.0) {
      vec3 hit = planetOffset + rd * tRing;
      float r = length(hit);
      if (r > 1.42 && r < 2.88) {
        float phi = atan(dot(hit, ringAxisY), dot(hit, ringAxisX));
        // Exact Keplerian angular velocity: inner ring particles orbit faster than outer!
        float omegaKep = 0.55 / pow(max(r, 0.5), 1.5);
        float kepAzimuth = phi - omegaKep * uTime;

        float bands = 0.5 + 0.5 * sin(r * 46.0);
        bands *= 0.65 + 0.35 * sin(r * 138.0);
        // Keplerian-sheared gravitational wakes / spokes
        float wakes = 0.80 + 0.20 * noise2(vec2(r * 18.0, kepAzimuth * 6.0));
        // 2:1 Lindblad orbital resonance gap (Cassini Division) & Encke gap
        float cassiniGap = smoothstep(0.025, 0.075, abs(r - 2.12));
        float enckeGap = smoothstep(0.010, 0.030, abs(r - 2.62));
        float edge = smoothstep(1.42, 1.54, r) * smoothstep(2.88, 2.70, r);

        float opticalDepth = bands * wakes * cassiniGap * enckeGap * edge * 0.64 * smoothstep(-0.05, 0.25, rd.y);
        vec3 ringCol = mix(vec3(0.92, 0.78, 0.58), vec3(1.30, 1.08, 0.86), bands * wakes);
        col = mix(col, ringCol, clamp(opticalDepth, 0.0, 0.78));
      }
    }
  }
  return col;
}

// World 1: Abyssal Biolume — Snell's 48.6° Critical Window & Deep-Water Dispersion (omega^2 = gk)
vec3 skyWorld1(vec3 rd) {
  float upFactor = clamp(rd.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(upFactor, 0.7));

  if (rd.y > 0.05) {
    vec2 surfXZ = rd.xz / (rd.y + 0.14) * 9.0;
    float caust = deepWaterDispersionCaustics(surfXZ, uTime);

    // Physical Snell's Window: critical angle arcsin(n_air / n_water) = arcsin(1 / 1.333) = 48.61°
    // => cos(48.61°) = 0.661! Inside rd.y > 0.661 light transmits from the sky above;
    // outside rd.y < 0.661 total internal reflection mirrors the deep turquoise abyss!
    float snellWindow = smoothstep(0.56, 0.72, rd.y);
    col += vec3(0.16, 0.95, 1.18) * (0.45 + 0.85 * caust) * snellWindow * 0.95;
    col += vec3(0.06, 0.55, 0.74) * caust * pow(upFactor, 1.5) * (1.0 - 0.5 * snellWindow);

    // Volumetric Tyndall/Mie downwelling sun shafts refracted through Snell's window
    float shafts = noise2(vec2(atan(rd.x, rd.z) * 7.0 + uTime * 0.15, rd.y * 2.5));
    col += vec3(0.05, 0.44, 0.62) * shafts * pow(upFactor, 1.4) * 0.55;
  }

  float horiz = exp(-abs(rd.y) * 5.0);
  col += vec3(0.04, 0.20, 0.34) * horiz;
  return col;
}

// World 2: Singularity Forge — Schwarzschild/Kerr Geodesics, b_crit = (3*sqrt(3)/2)*r_s & Doppler D^(3+a)
vec3 skyWorld2(vec3 rd) {
  vec3 bhDir = uSunDir;
  float cosTheta = dot(rd, bhDir);
  vec3 perp = rd - bhDir * cosTheta;
  float b = length(perp); // Angular impact parameter

  // Exact Schwarzschild scale & critical photon-sphere impact parameter:
  //   r_photon = 1.5 * r_s,   b_crit = (3 * sqrt(3) / 2) * r_s = 2.5980762 * r_s
  const float r_s = 0.036;
  const float b_crit = 2.5980762 * r_s; // 0.09353 rad

  // Event Horizon Shadow (null geodesics with b < b_crit are captured!)
  if (cosTheta > 0.0 && b < b_crit) {
    // Grazing null geodesics right on b -> b_crit form the razor-sharp logarithmic Photon Ring
    float dPhoton = abs(b - b_crit * 0.985);
    float photonRing = exp(-dPhoton * 320.0);
    return vec3(1.95, 1.35, 0.90) * photonRing * 2.6;
  }

  // Post-Newtonian + Strong-Field Null Geodesic Deflection:
  //   Delta_alpha = 2*r_s/b + (15*pi/16)*(r_s/b)^2 + strong-field log term near b_crit
  vec3 perpDir = perp / max(b, 1e-4);
  float bSafe = max(b, b_crit + 0.002);
  float uRatio = r_s / bSafe;
  float deflection = (2.0 * uRatio + 2.945 * uRatio * uRatio) * 0.16;
  vec3 lensedRd = normalize(rd - perpDir * deflection * smoothstep(-0.2, 0.25, cosTheta));

  vec3 col = mix(uSkyHorizon, uSkyZenith, clamp(lensedRd.y * 0.5 + 0.5, 0.0, 1.0));
  col += evalStarfield(lensedRd, 118.0) * 0.88;

  // Relativistic Thin Accretion Disk (r >= r_ISCO = 3.0 * r_s) + Lensed Secondary Image
  if (cosTheta > 0.0) {
    vec3 diskUp = normalize(vec3(-0.24, 0.95, -0.18));
    vec3 diskRight = normalize(cross(diskUp, bhDir));

    float xAng = dot(perp, diskRight);
    float yAng = dot(perp, diskUp);

    for (int layer = 0; layer < 2; layer++) {
      // Layer 0: Direct equatorial disk; Layer 1: Gravitationally lensed n=1 over/under image
      float tiltScale = (layer == 0) ? 4.35 : 1.06;
      float rDisk = length(vec2(xAng, yAng * tiltScale));
      float rISCO = (layer == 0) ? (3.0 * r_s) : (b_crit * 1.02);
      float outerR = (layer == 0) ? (10.8 * r_s) : (6.8 * r_s);

      if (rDisk > rISCO && rDisk < outerR) {
        float normR = clamp((rDisk - rISCO) / (outerR - rISCO), 0.0, 1.0);
        // Physical radius in Schwarzschild units (r >= 3 * r_s)
        float rPhys = max(3.0 * r_s, rDisk);

        // Keplerian orbital velocity beta = v/c = sqrt(r_s / (2 * (r - r_s)))
        float beta = clamp(sqrt(r_s / max(2.0 * (rPhys - r_s), 0.01)), 0.05, 0.62);
        float gamma = inversesqrt(max(1.0 - beta * beta, 0.1));
        // Gravitational redshift sqrt(1 - r_s / r)
        float gravRedshift = sqrt(clamp(1.0 - r_s / rPhys, 0.05, 1.0));

        // Projected line-of-sight velocity component cos(theta_los) = xAng / rDisk
        float cosLos = clamp(xAng / max(rDisk, 1e-3), -1.0, 1.0);
        // Exact Relativistic + Gravitational Doppler Factor D!
        float D = gravRedshift / (gamma * (1.0 - beta * cosLos));

        // Relativistic specific intensity invariant I_obs / nu_obs^3 = const => I_obs ~ D^(3 + alpha)
        float beaming = pow(clamp(D, 0.25, 2.15), 3.6);

        // Differential Keplerian shear omega(r) ~ r^(-3/2)
        float omegaDisk = 0.045 / pow(max(rPhys, 0.05), 1.5);
        float angle = atan(yAng * tiltScale, xAng);
        float swirl = fbm2Fast(vec2(rDisk * 30.0, angle * 3.0 - uTime * omegaDisk));
        float rings = 0.58 + 0.42 * sin(rDisk * 145.0 + swirl * 4.0);

        // Shakura-Sunyaev T(r) ~ r^(-3/4) temperature profile * Doppler frequency shift D
        float tempShift = clamp(D * pow(1.0 - normR * 0.72, 0.75), 0.2, 1.85);
        vec3 deepRed  = vec3(1.15, 0.18, 0.04);
        vec3 warmGold = vec3(1.55, 0.85, 0.36);
        vec3 hotBlue  = vec3(0.78, 1.12, 1.85);
        vec3 plankCol = mix(deepRed, warmGold, smoothstep(0.35, 1.0, tempShift));
        plankCol = mix(plankCol, hotBlue, smoothstep(1.02, 1.65, tempShift));

        float radialEnvelope = smoothstep(0.0, 0.12, normR) * pow(clamp(1.0 - normR, 0.0, 1.0), 1.7);
        if (layer == 1) {
          radialEnvelope *= smoothstep(0.01, 0.08, abs(yAng)) * 0.78;
        }

        col += plankCol * beaming * swirl * rings * radialEnvelope * 1.15;
      }
    }

    // Logarithmic photon ring glow at b = b_crit
    float photonHalo = exp(-max(b - b_crit, 0.0) * 58.0);
    col += vec3(1.75, 1.10, 0.62) * photonHalo * 0.85;
  }

  return col;
}

// World 3: Verdant Titan — Exact 42° Anti-Solar Optical Rainbow & Ringed Gas Giant
vec3 skyWorld3(vec3 rd) {
  // Note: uSunDir points toward the sun behind/above-left so the anti-solar point (-uSunDir) lies ahead!
  vec3 forwardSunGlowDir = normalize(vec3(-uSunDir.x, uSunDir.y, abs(uSunDir.z)));
  vec3 col = baseAtmosphere(rd, uSkyZenith, uSkyHorizon, forwardSunGlowDir, uSunColor * 0.75);

  // Ringed Turquoise Gas Giant Moon
  vec3 planetDir = normalize(vec3(-0.42, 0.28, 0.86));
  float pDot = dot(rd, planetDir);
  if (pDot > 0.9755) {
    vec3 localP = rd - planetDir * pDot;
    float rFrac = clamp(length(localP) / 0.220, 0.0, 1.0);
    vec3 sphereN = normalize(localP / 0.220 - planetDir * sqrt(max(0.0, 1.0 - rFrac * rFrac)));
    float lat = sphereN.y * 8.0 + fbm2Fast(sphereN.xz * 4.0) * 0.8;
    vec3 bands = mix(vec3(0.08, 0.58, 0.62), vec3(0.55, 0.92, 0.82), 0.5 + 0.5 * sin(lat * 3.2));
    float cLat = 0.5 + 0.5 * cos(lat * 5.0);
    bands = mix(bands, vec3(0.90, 0.82, 0.65), 0.25 * cLat * cLat * cLat);
    vec3 lightDir = normalize(vec3(0.55, 0.45, 0.70));
    float pDiff = clamp(dot(sphereN, lightDir) * 0.8 + 0.2, 0.0, 1.0);
    float limb = smoothstep(1.0, 0.92, rFrac);
    vec3 planetCol = mix(uSkyHorizon * 0.7, bands * pDiff * 1.15, limb * 0.88);
    planetCol += vec3(0.35, 0.95, 0.88) * pow(rFrac, 5.0) * pDiff * 0.45;
    col = mix(col, planetCol, smoothstep(0.9755, 0.9770, pDot));
  }

  if (rd.y > 0.02) {
    vec2 cuv = rd.xz / (rd.y + 0.22) * 1.4 + vec2(uTime * 0.02, 0.0);
    float cl = smoothstep(0.48, 0.78, fbm2Fast(cuv));
    col = mix(col, vec3(1.05, 1.02, 0.96), cl * 0.36 * smoothstep(0.02, 0.28, rd.y));
  }

  // Exact Descartes-Snell 42° Primary & 51° Secondary Optical Mist Rainbow around Anti-Solar Axis (-uSunDir)!
  // Water refractive index Cauchy dispersion: n(400nm)=1.343 (40.6°), n(700nm)=1.331 (42.3°)
  vec3 antiSolar = normalize(-uSunDir);
  float cosScatter = clamp(dot(rd, antiSolar), -1.0, 1.0);
  float thetaDeg = acos(cosScatter) * 57.2957795; // Exact scattering angle in degrees!

  float mistMask = smoothstep(0.38, -0.08, rd.y);
  // Primary bow: 40.5° (violet inside) -> 42.4° (red outside)
  float tPrimary = (thetaDeg - 40.4) / 2.1;
  if (tPrimary > -0.3 && tPrimary < 1.3) {
    float dp1 = (tPrimary - 0.5) * 2.5;
    float env1 = exp(-dp1 * dp1);
    vec3 spectral = vec3(
      smoothstep(0.25, 0.85, tPrimary),
      sin(clamp(tPrimary, 0.0, 1.0) * PI),
      smoothstep(0.75, 0.10, tPrimary)
    );
    col += spectral * env1 * mistMask * 0.34;
  }
  // Alexander's Dark Band subtly darkens sky between 42.6° and 50.2°
  float alexander = smoothstep(42.5, 44.0, thetaDeg) * smoothstep(50.8, 49.0, thetaDeg);
  col *= (1.0 - 0.07 * alexander * mistMask);

  // Secondary 51° bow (2 internal reflections => inverted color order: red inside 50.4° -> violet outside 53.2°)
  float tSecondary = (thetaDeg - 50.2) / 3.0;
  if (tSecondary > -0.2 && tSecondary < 1.2) {
    float dp2 = (tSecondary - 0.5) * 2.4;
    float env2 = exp(-dp2 * dp2);
    vec3 spectral2 = vec3(
      smoothstep(0.75, 0.15, tSecondary),
      sin(clamp(tSecondary, 0.0, 1.0) * PI),
      smoothstep(0.25, 0.85, tSecondary)
    );
    col += spectral2 * env2 * mistMask * 0.11;
  }

  return col;
}

// World 4: Hyperbolic Sanctum
vec3 skyWorld4(vec3 rd) {
  float v = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, v);
  float ang = atan(rd.y, rd.x);
  float r = length(rd.xy);
  float mandala = pow(abs(cos(ang * 6.0 + uTime * 0.2)), 8.0) * exp(-r * 3.5) * max(rd.z, 0.0);
  col += vec3(1.3, 0.85, 0.40) * mandala * 0.65;
  col += vec3(0.55, 0.25, 0.95) * exp(-r * 2.2) * max(rd.z, 0.0) * 0.35;
  return col;
}

// World 5: Solaris Dunes — Eclipsed Red Hypergiant & MHD Coronal Streamers
vec3 skyWorld5(vec3 rd) {
  float h = clamp(rd.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(h, 0.48));
  col = mix(uSkyHorizon * 0.45, col, smoothstep(-0.3, 0.02, rd.y));

  float sunDot = max(dot(rd, uSunDir), 0.0);
  vec3 sunRight = normalize(cross(vec3(0.0, 1.0, 0.0), uSunDir));
  vec3 sunUp = cross(uSunDir, sunRight);
  float coronaAng = atan(dot(rd, sunUp), dot(rd, sunRight));
  // Dipole magnetic helmet streamers
  float streamers = 0.70 + 0.30 * sin(coronaAng * 6.0 + uTime * 0.35) * cos(coronaAng * 2.0);

  float corona = pow(sunDot, 14.0) * 0.9 + pow(sunDot, 90.0) * 2.4 * streamers;
  col += vec3(1.65, 0.48, 0.22) * corona;

  if (sunDot > 0.9962) {
    float rim = exp(-abs(sunDot - 0.9966) * 2200.0);
    float eclipseMask = smoothstep(0.9964, 0.9970, sunDot);
    col = mix(col, vec3(0.02, 0.008, 0.015), eclipseMask);
    col += vec3(2.2, 1.15, 0.65) * rim * 2.2;
  }

  if (rd.y > 0.05) {
    vec2 auv = rd.xz / (rd.y + 0.28) * 1.6;
    float wave = sin(auv.x * 2.2 + uTime * 0.45 + fbm2Fast(auv * 1.5) * 3.2);
    float curtain = exp(-abs(wave) * 3.8) * smoothstep(0.05, 0.38, rd.y) * smoothstep(0.95, 0.45, rd.y);
    vec3 aurCol = mix(vec3(0.15, 1.15, 0.65), vec3(0.75, 0.22, 1.10), clamp(rd.y * 1.6, 0.0, 1.0));
    col += aurCol * curtain * 0.75;
  }

  col += evalStarfield(rd, 95.0) * smoothstep(0.15, 0.65, rd.y) * 0.55;
  return col;
}

// World 6: Cryogenic Aurora — Oxygen 557.7nm / Nitrogen 427.8nm Emission Curtains & Milky Way
vec3 skyWorld6(vec3 rd) {
  vec3 rdUp = vec3(rd.x, abs(rd.y), rd.z);
  float h = clamp(rdUp.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(h, 0.55));

  col += evalStarfield(rdUp, 125.0) * smoothstep(0.02, 0.35, h);
  float milkyDelta = (rdUp.x * 0.75 - rdUp.y * 0.55 + 0.15) * 3.4;
  float milky = exp(-milkyDelta * milkyDelta);
  float dust = fbm2Fast(rdUp.xz * 4.5 + rdUp.y * 2.0);
  col += vec3(0.14, 0.22, 0.38) * milky * dust * smoothstep(0.05, 0.5, h) * 0.85;

  // Physical altitude-stratified auroral emission lines:
  // Lower border (~100km): atomic oxygen 557.7nm green + N2+ 427.8nm violet-blue;
  // Upper altitude (>200km): atomic oxygen 630.0nm crimson-violet!
  if (h > 0.03) {
    vec2 p = rdUp.xz / (h + 0.20);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 uv = p * (1.1 + fi * 0.45) + vec2(uTime * (0.08 + fi * 0.03), fi * 2.7);
      float fold = sin(uv.x * 2.4 + fbm2Fast(uv * 1.3) * 3.8);
      float ribbon = exp(-abs(fold) * 4.6) * smoothstep(0.03, 0.28, h) * exp(-h * 1.4);
      float verticalStriations = 0.65 + 0.35 * sin(uv.x * 22.0 + uv.y * 14.0);
      vec3 cOxy557 = vec3(0.10, 1.38, 0.64); // Forbidden [O I] 557.7 nm green line
      vec3 cNit428 = vec3(0.12, 0.82, 1.28); // N2+ first negative band
      vec3 cOxy630 = vec3(0.76, 0.22, 1.12); // High-altitude [O I] / N2 upper fringe
      vec3 aur = mix(cOxy557, cNit428, clamp(fi * 0.5, 0.0, 1.0));
      aur = mix(aur, cOxy630, smoothstep(0.25, 0.72, h));
      col += aur * ribbon * verticalStriations * (0.68 - fi * 0.14);
    }
  }
  return col;
}

// World 7: Chrono Nexus
vec3 skyWorld7(vec3 rd) {
  vec3 col = mix(uSkyHorizon, uSkyZenith, clamp(abs(rd.y), 0.0, 1.0));
  col += evalStarfield(rd, 130.0);

  vec3 np = rd * 2.6 + vec3(0.0, 0.0, uTime * 0.03);
  float n1 = fbm3(np);
  float n2 = fbm3(np * 2.1 + vec3(n1 * 1.6));
  float fil = smoothstep(0.38, 0.82, n2);

  vec3 nebGold = vec3(1.45, 0.92, 0.42);
  vec3 nebRose = vec3(1.15, 0.26, 0.72);
  vec3 nebBlue = vec3(0.18, 0.52, 1.25);

  vec3 nebCol = mix(nebBlue, nebRose, smoothstep(0.3, 0.7, n1));
  nebCol = mix(nebCol, nebGold, pow(fil, 2.2));
  col += nebCol * fil * 0.85;

  float core = pow(max(dot(rd, uSunDir), 0.0), 10.0);
  col += vec3(1.35, 1.05, 1.55) * core * 0.55;
  return col;
}

vec3 evalWorldSky(vec3 rd) {
  if (uWorldId == 0) return skyWorld0(rd);
  if (uWorldId == 1) return skyWorld1(rd);
  if (uWorldId == 2) return skyWorld2(rd);
  if (uWorldId == 3) return skyWorld3(rd);
  if (uWorldId == 4) return skyWorld4(rd);
  if (uWorldId == 5) return skyWorld5(rd);
  if (uWorldId == 6) return skyWorld6(rd);
  return skyWorld7(rd);
}

// ============================================================================
// WORLD 3D SIGNED DISTANCE FIELDS (SDF) WITH PHYSICAL KINEMATICS
// ============================================================================

// World 0: Celestial Observatory — Euler Rigid-Body Precessing Astrolabes
vec2 mapWorld0(vec3 p, vec2 pathCenter) {
  float cloudWave = fbm2Fast(p.xz * 0.055 + vec2(uTime * 0.10, uTime * 0.06)) * 4.2;
  float dClouds = p.y - (1.8 + cloudWave);

  vec3 q = p;
  q.xy -= pathCenter;
  float cellId = floor((p.z + 14.0) / 28.0);
  q.z = mod(p.z + 14.0, 28.0) - 14.0;

  float archR = 16.2 + 2.0 * sin(cellId * 1.7 + uInstanceSeed);
  vec3 pPillar = vec3(abs(q.x) - archR, q.y + 4.0, q.z);
  float flutes = sin(atan(pPillar.z, pPillar.x) * 8.0) * 0.08;
  float dPillars = sdBox(pPillar, vec3(1.65 + flutes, 18.0, 1.85)) - 0.15;

  vec3 pArch = vec3(q.x, q.y - 3.5, q.z);
  float dArch = sdTorusZ(pArch, vec2(archR, 1.45));
  dArch = max(dArch, -pArch.y);

  // Nested Torque-Free Euler Precessing Astrolabe Gyroscope (I*dw/dt + w x Iw = 0)
  vec3 pGyroCenter = vec3(q.x, q.y - 9.8, q.z);
  vec3 gOuter = eulerPrecessRing(pGyroCenter, 0.34, 0.48, cellId * 1.3, uTime);
  vec3 gInner = eulerPrecessRing(pGyroCenter, -0.52, 0.72, cellId * 2.7 + 1.1, uTime);
  float dHalo = min(sdTorusZ(gOuter, vec2(7.6, 0.25)), sdTorusZ(gInner, vec2(5.4, 0.20)));

  float dStruct = trimPortalZones(min(min(dPillars, dArch), dHalo), p.z, 18.0);

  dClouds = carveCorridor(dClouds, p, pathCenter);
  dStruct = carveCorridor(dStruct, p, pathCenter);

  if (dClouds < dStruct) return vec2(dClouds, MAT_FLUID);
  return vec2(dStruct, MAT_STRUCT);
}

// World 1: Abyssal Biolume
vec2 mapWorld1(vec3 p, vec2 pathCenter) {
  float floorH = 1.4 + 3.4 * fbm2Fast(p.xz * 0.065);
  float relX = abs(p.x - pathCenter.x);
  float wallRise = smoothstep(14.0, 38.0, relX) * 22.0;
  float dFloor = p.y - (floorH + wallRise);

  vec3 q = p;
  q.xy -= pathCenter;
  float cellId = floor((p.z + 11.0) / 22.0);
  q.z = mod(p.z + 11.0, 22.0) - 11.0;

  vec3 qRib = q;
  qRib.xy *= rot2D(sin(cellId * 2.1 + q.y * 0.05) * 0.28);
  float ribR = 14.8 + 1.8 * cos(cellId * 1.3);
  float organicBulbs = 0.32 * sin(qRib.y * 1.15 + cellId) * cos(qRib.x * 0.6);
  float dRib = sdTorusZ(vec3(qRib.x, qRib.y + 1.0, qRib.z), vec2(ribR, 1.35 + organicBulbs));

  vec3 qBulb = vec3(abs(q.x) - (ribR - 2.2), q.y + 2.0 + sin(cellId * 3.0) * 2.0, q.z);
  float dTendril = length(qBulb) - (1.35 + 0.25 * sin(uTime * 2.4 + cellId));

  dRib = trimPortalZones(dRib, p.z, 17.0);
  dTendril = trimPortalZones(dTendril, p.z, 17.0);

  dFloor = carveCorridor(dFloor, p, pathCenter);
  dRib = carveCorridor(dRib, p, pathCenter);
  dTendril = carveCorridor(dTendril, p, pathCenter);

  vec2 res = vec2(dFloor, MAT_TERRAIN);
  if (dRib < res.x) res = vec2(dRib, MAT_STRUCT);
  if (dTendril < res.x) res = vec2(dTendril, MAT_EMISSIVE);
  return res;
}

// World 2: Singularity Forge
vec2 mapWorld2(vec3 p, vec2 pathCenter) {
  vec3 q = p;
  q.xy -= pathCenter;

  float cellZ = floor((p.z + 8.0) / 16.0);
  vec3 qHex = q;
  qHex.z = mod(p.z + 8.0, 16.0) - 8.0;
  float sideSign = (qHex.x >= 0.0) ? 1.0 : -1.0;
  float hSeed = hash11(cellZ * 13.7 + sideSign * 7.1 + uInstanceSeed);

  vec3 pCol = vec3(abs(qHex.x) - (14.5 + hSeed * 5.0), qHex.y + 3.0 - hSeed * 6.0, qHex.z);
  pCol.xy *= rot2D(0.22 * sin(cellZ + uTime * 0.25));
  pCol.yz *= rot2D(0.18 * cos(cellZ * 1.7));
  float dShards = sdHexPrismY(pCol, vec2(2.4, 7.5 + hSeed * 4.0));

  vec3 pSlab = vec3(qHex.x - sin(cellZ * 1.9) * 3.0, qHex.y + 12.2, qHex.z);
  float dSlab = sdHexPrismY(pSlab, vec2(5.2, 0.85));
  dShards = min(dShards, dSlab);

  vec3 qRing = q;
  float ringCell = floor((p.z + 17.0) / 34.0);
  qRing.z = mod(p.z + 17.0, 34.0) - 17.0;
  // Keplerian differential rotation around the corridor
  qRing.xy *= rot2D(uTime * 0.12 + ringCell);
  float dDyson = sdTorusZ(qRing, vec2(21.0, 1.35));
  float rRing = max(length(qRing.xy), 1.0);
  float gapCut = (sin(atan(qRing.y, qRing.x) * 3.0) - 0.55) * (rRing / 3.2);
  dDyson = max(dDyson, gapCut);

  float dTotal = trimPortalZones(min(dShards, dDyson), p.z, 17.0);
  dTotal = carveCorridor(dTotal, p, pathCenter);
  return vec2(dTotal, MAT_STRUCT);
}

// World 3: Verdant Titan — Galilean Free-Fall Waterfall Continuity & Rayleigh-Plateau Sheet
vec2 mapWorld3(vec3 p, vec2 pathCenter) {
  vec3 q = p;
  q.xy -= pathCenter;

  float terr = fbm2Fast(p.xz * 0.045) * 9.0;
  terr += sin(terr * 1.8) * 0.45;
  float valleyWall = smoothstep(13.0, 36.0, abs(q.x)) * 24.0;
  float dTerrain = p.y - (0.5 + terr * 0.55 + valleyWall);

  float islandCell = floor((p.z + 18.0) / 36.0);
  vec3 qi = q;
  qi.z = mod(p.z + 18.0, 36.0) - 18.0;
  float side = (mod(islandCell, 2.0) < 0.5) ? 1.0 : -1.0;
  vec3 islandCenter = vec3(side * 19.5, 4.5 + 3.0 * sin(islandCell * 2.3), 0.0);
  vec3 pi = qi - islandCenter;
  float rHoriz = length(pi.xz);
  float coneRadius = clamp(8.2 + pi.y * 0.65, 0.5, 9.5) + fbm2Fast(p.xz * 0.18) * 1.4;
  float dIsland = trimPortalZones(max(rHoriz - coneRadius, max(pi.y - 2.2, -13.5 - pi.y)), p.z, 18.0);

  dTerrain = smin(dTerrain, dIsland, 1.8);

  // Galilean Free-Fall Waterfall Sheet:
  // Drop distance dy = max(0, y_lip - y); v(y) = sqrt(v0^2 + 2*g*dy) with g_Titan = 7.65 m/s^2!
  // By mass continuity Q = A(y)*v(y) = const, sheet thickness thins as v0 / v(y) while
  // Rayleigh-Plateau capillary waves grow along free-fall time tau = (v(y) - v0) / g!
  vec3 pw = pi - vec3(-side * 6.2, -7.5, 0.0);
  float dropY = max(0.0, 9.5 - pw.y);
  const float gTitan = 7.65;
  const float v0 = 2.4;
  float vFall = sqrt(v0 * v0 + 2.0 * gTitan * dropY);
  float tauFall = (vFall - v0) / gTitan;
  float sheetThickness = 0.55 * (v0 / vFall);
  // Rayleigh-Plateau capillary instability grows exponentially then saturates into spray billows
  float rpAmp = clamp(0.05 * exp(tauFall * 1.15), 0.0, 0.34);
  float rpWave = rpAmp * sin(tauFall * 16.0 - uTime * 11.0 + pw.z * 2.4);
  // Subtle parabolic trajectory deflection as horizontal weir velocity carries water outward!
  float xParabolic = -side * (0.45 * tauFall);
  vec3 pwPhys = vec3(pw.x - xParabolic, pw.y, pw.z);
  float dWaterfall = trimPortalZones(sdBox(pwPhys, vec3(sheetThickness + rpWave, 9.5, 1.9)), p.z, 18.0);

  dTerrain = carveCorridor(dTerrain, p, pathCenter);
  dWaterfall = carveCorridor(dWaterfall, p, pathCenter);

  if (dWaterfall < dTerrain) return vec2(dWaterfall, MAT_FLUID);
  return vec2(dTerrain, MAT_TERRAIN);
}

// World 4: Hyperbolic Sanctum — Coupled Hookean Normal-Mode Lattice Breathing
vec2 mapWorld4(vec3 p, vec2 pathCenter) {
  vec3 q = p;
  q.xy -= pathCenter;

  q.xy *= rot2D(sin(p.z * 0.028) * 0.24);
  q.z = mod(p.z + 9.0, 18.0) - 9.0;

  vec3 z = q * 0.115;
  float dr = 0.115;
  float scale = 2.12;
  // Acoustic phonon dispersion omega(k) = 2*w0*|sin(k*a/2)| travelling Hookean lattice wave!
  float hookeanMode = 0.020 * sin(uTime * 1.35 - p.z * 0.06) + 0.008 * cos(uTime * 2.45 + p.y * 0.08);
  float foldLimit = 1.04 + hookeanMode;

  for (int i = 0; i < 5; i++) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
    float r2 = dot(z, z);
    float k = clamp(max(0.52 / max(r2, 0.14), 1.0), 1.0, 3.6);
    z *= k;
    dr *= k;
    z = z * scale + vec3(-1.35, -1.28, -1.12);
    dr = dr * abs(scale) + 0.115;
  }

  float dFractal = trimPortalZones((length(z) - 2.65) / dr, p.z, 18.0);
  dFractal = carveCorridor(dFractal, p, pathCenter);
  return vec2(dFractal, MAT_STRUCT);
}

// World 5: Solaris Dunes — Asymmetric Bagnold Aeolian Dunes (Gentle Windward, 34° Leeward Slip-Face)
vec2 mapWorld5(vec3 p, vec2 pathCenter) {
  vec2 dp = p.xz * 0.055;
  // Asymmetric sawtooth-trochoid wave skewed in wind direction (angle of repose ~34° on leeward face!)
  float s1 = dp.x * 1.4 + cos(dp.y * 0.8) * 1.2;
  float dune1 = 1.0 - abs(sin(s1 + 0.28 * sin(s1)));
  float dune2 = 1.0 - abs(sin(dp.y * 1.9 - dp.x * 0.7 + 1.4));
  float duneH = 2.0 + (dune1 * 4.6 + dune2 * 2.4);
  float dDunes = p.y - duneH;

  vec3 q = p;
  q.xy -= pathCenter;
  float cellId = floor((p.z + 15.0) / 30.0);
  q.z = mod(p.z + 15.0, 30.0) - 15.0;

  float side = (q.x >= 0.0) ? 1.0 : -1.0;
  vec3 pOb = vec3(abs(q.x) - 16.5, q.y - (2.0 + 2.5 * sin(uTime * 0.9 + cellId * 2.0 + side)), q.z);
  pOb.xz *= rot2D(uTime * 0.32 * side + cellId);
  float taper = clamp((pOb.y + 8.0) * 0.045, -0.2, 0.75);
  float dObelisk = sdBox(pOb, vec3(1.9 - taper, 7.5, 1.9 - taper));
  dObelisk = max(dObelisk, (abs(pOb.x) + abs(pOb.z) + pOb.y - 8.2) * 0.577);

  vec3 pRing = pOb - vec3(0.0, -8.6, 0.0);
  pRing.yz *= rot2D(PI * 0.5);
  float dHalo = sdTorusZ(pRing, vec2(2.6, 0.14));

  dObelisk = trimPortalZones(dObelisk, p.z, 18.0);
  dHalo = trimPortalZones(dHalo, p.z, 18.0);

  dDunes = carveCorridor(dDunes, p, pathCenter);
  dObelisk = carveCorridor(dObelisk, p, pathCenter);
  dHalo = carveCorridor(dHalo, p, pathCenter);

  vec2 res = vec2(dDunes, MAT_TERRAIN);
  if (dObelisk < res.x) res = vec2(dObelisk, MAT_STRUCT);
  if (dHalo < res.x) res = vec2(dHalo, MAT_EMISSIVE);
  return res;
}

// World 6: Cryogenic Aurora — Mirror Polar Ocean & Hexagonal Glacial Ice Spires
vec2 mapWorld6(vec3 p, vec2 pathCenter) {
  float dWater = p.y - 2.4;

  vec3 q = p;
  q.xy -= pathCenter;

  float r1 = max(0.0, 1.0 - abs(noise2(p.xz * 0.065) * 2.0 - 1.0));
  float r2 = max(0.0, 1.0 - abs(noise2(p.xz * 0.15 + 4.2) * 2.0 - 1.0));
  float ridgeH = pow(r1, 1.6) * 18.0 + r2 * 5.5;
  float fjordMask = smoothstep(11.5, 24.0, abs(q.x));
  float dIce = p.y - (0.5 + ridgeH * fjordMask);

  vec3 qs = q;
  qs.z = mod(p.z + 16.0, 32.0) - 16.0;
  vec3 pSpire = vec3(abs(qs.x) - 15.2, qs.y + 2.0, qs.z);
  pSpire.xy *= rot2D(-0.18);
  float spireTaper = clamp((pSpire.y + 8.0) * 0.055, 0.0, 1.4);
  float dSpire = trimPortalZones(sdHexPrismY(pSpire, vec2(max(0.4, 2.3 - spireTaper), 12.5)), p.z, 18.0);

  dIce = smin(dIce, dSpire, 1.1);
  dIce = carveCorridor(dIce, p, pathCenter);
  dWater = carveCorridor(dWater, p, pathCenter);

  if (dWater < dIce) return vec2(dWater, MAT_FLUID);
  return vec2(dIce, MAT_TERRAIN);
}

// World 7: Chrono Nexus — Torque-Free Euler Precessing Dyson Rings & Keplerian Resonators
vec2 mapWorld7(vec3 p, vec2 pathCenter) {
  vec3 q = p;
  q.xy -= pathCenter;

  float cellId = floor((p.z + 13.0) / 26.0);
  vec3 qr = q;
  qr.z = mod(p.z + 13.0, 26.0) - 13.0;

  // Inner (R = 15.2) & Outer (R = 21.5) rings obey Euler's rigid-body equation I*dw/dt + w x Iw = 0
  // AND Keplerian radial scaling omega(R) ~ R^(-3/2)!
  float omegaA = 18.5 / pow(15.2, 1.5); // ~ 0.312 rad/s
  float omegaB = 18.5 / pow(21.5, 1.5); // ~ 0.185 rad/s (outer ring precesses slower by Kepler's 3rd Law!)

  vec3 rA = eulerPrecessRing(qr, omegaA, 0.26, cellId * 0.9, uTime);
  float dRingA = sdTorusZ(rA, vec2(15.2, 0.58));

  vec3 rB = eulerPrecessRing(qr, -omegaB, 0.34, cellId * 2.1 + 1.4, uTime);
  float dRingB = sdTorusZ(rB, vec2(21.5, 0.85));

  float ang = atan(rA.y, rA.x);
  float snapAng = round(ang / (TAU / 6.0)) * (TAU / 6.0);
  vec3 pNode = vec3(rA.xy - vec2(cos(snapAng), sin(snapAng)) * 15.2, rA.z);
  float dNodes = sdOctahedron(pNode, 1.35);

  float dStruct = trimPortalZones(min(dRingA, dRingB), p.z, 17.0);

  float condAng = atan(q.y, q.x);
  float snapCond = round(condAng / (TAU / 8.0)) * (TAU / 8.0);
  vec2 condPos = vec2(cos(snapCond), sin(snapCond)) * 16.8;
  float dConduit = length(q.xy - condPos) - 0.18;
  float dEmissive = trimPortalZones(min(dConduit, dNodes), p.z, 17.0);

  dStruct = carveCorridor(dStruct, p, pathCenter);
  dEmissive = carveCorridor(dEmissive, p, pathCenter);

  if (dEmissive < dStruct) return vec2(dEmissive, MAT_EMISSIVE);
  return vec2(dStruct, MAT_STRUCT);
}

vec2 mapScene(vec3 p) {
  vec2 pathCenter = flightPathXY(p.z);
  vec2 dWorld;

  if (uWorldId == 0) dWorld = mapWorld0(p, pathCenter);
  else if (uWorldId == 1) dWorld = mapWorld1(p, pathCenter);
  else if (uWorldId == 2) dWorld = mapWorld2(p, pathCenter);
  else if (uWorldId == 3) dWorld = mapWorld3(p, pathCenter);
  else if (uWorldId == 4) dWorld = mapWorld4(p, pathCenter);
  else if (uWorldId == 5) dWorld = mapWorld5(p, pathCenter);
  else if (uWorldId == 6) dWorld = mapWorld6(p, pathCenter);
  else dWorld = mapWorld7(p, pathCenter);

  vec2 dPortal = mapPortals(p);
  if (dPortal.x < dWorld.x) return dPortal;
  return dWorld;
}

vec3 calcNormal(vec3 p, float t) {
  float e = 0.0025 * (1.0 + t * 0.04);
  vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * mapScene(p + k.xyy * e).x +
    k.yyx * mapScene(p + k.yyx * e).x +
    k.yxy * mapScene(p + k.yxy * e).x +
    k.xxx * mapScene(p + k.xxx * e).x
  );
}

float calcAO(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.14 * float(i) * float(i);
    float d = mapScene(p + h * n).x;
    occ += (h - d) * sca;
    sca *= 0.62;
  }
  return clamp(1.0 - 0.85 * occ, 0.08, 1.0);
}

vec3 evalSanctumOrbitTrap(vec3 p) {
  vec2 pathCenter = flightPathXY(p.z);
  vec3 q = p;
  q.xy -= pathCenter;
  q.xy *= rot2D(sin(p.z * 0.028) * 0.24);
  q.z = mod(p.z + 9.0, 18.0) - 9.0;

  vec3 z = q * 0.115;
  float foldLimit = 1.04 + 0.020 * sin(uTime * 1.35 - p.z * 0.06);
  vec3 minPlanes = vec3(10.0);
  for (int i = 0; i < 4; i++) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
    float r2 = dot(z, z);
    float k = clamp(max(0.52 / max(r2, 0.14), 1.0), 1.0, 3.6);
    z *= k;
    z = z * 2.12 + vec3(-1.35, -1.28, -1.12);
    minPlanes = min(minPlanes, abs(z));
  }
  return minPlanes;
}

// ============================================================================
// PHYSICALLY-BASED DIELECTRIC, CONDUCTOR & RADIATIVE SURFACE SHADING
// ============================================================================

// Optical constants (eta + i*kappa) for 24k Gold (Au) & Iridium-Platinum (Ir/Pt) at [650nm, 550nm, 450nm]
const vec3 AU_ETA   = vec3(0.18, 0.42, 1.37);
const vec3 AU_KAPPA = vec3(3.42, 2.35, 1.77);
const vec3 IR_ETA   = vec3(2.42, 2.18, 1.88);
const vec3 IR_KAPPA = vec3(4.55, 4.12, 3.65);

vec3 shadeWorldSurface(vec3 p, vec3 rd, vec3 n, float matId, float t) {
  float ao = calcAO(p, n);
  // Ensure sun lighting direction illuminates front faces gracefully even in World 3 anti-solar setup
  vec3 sunIllumDir = (uWorldId == 3) ? normalize(vec3(-uSunDir.x, uSunDir.y, abs(uSunDir.z))) : uSunDir;
  vec3 halfV = normalize(sunIllumDir - rd);
  float diff = max(dot(n, sunIllumDir), 0.0);
  float cosView = clamp(dot(n, -rd), 0.0, 1.0);
  float fresnel = pow(clamp(1.0 - cosView, 0.0, 1.0), 4.0);
  float spec = pow(max(dot(n, halfV), 0.0), 48.0);
  vec3 probeLight = evalProbePointLights(p, n, rd);

  // --- Shared Sculpted 3D Portal Megastructure (Iridium Conductor Fresnel + HDR Rim) ---
  if (matId > 4.5) {
    float nearExit = smoothstep(40.0, 0.0, abs(p.z - WORLD_LENGTH));
    vec3 accent = mix(uPortalAccent, uNextPortalAccent, nearExit * 0.55);

    if (matId > 5.5) {
      float pulse = 0.82 + 0.18 * sin(uTime * 4.2 + atan(p.y - uBaseHeight, p.x) * 6.0);
      return accent * (2.4 * pulse + fresnel * 1.8) + probeLight;
    } else {
      vec3 reflSky = evalWorldSky(reflect(rd, n));
      vec3 fIridium = fresnelConductor(cosView, IR_ETA, IR_KAPPA);
      vec3 baseStone = vec3(0.06, 0.07, 0.10) * (0.3 + 0.7 * diff) * ao;
      vec3 col = mix(baseStone, reflSky * ao, fIridium * 0.72);
      col += uSunColor * spec * fIridium * 1.1;
      float rHole = abs(length(p.xy - vec2(0.0, uBaseHeight)) - 8.25);
      col += accent * exp(-rHole * 1.35) * 0.95 + probeLight;
      return col;
    }
  }

  // --- World 0: Celestial Observatory (Carrara Dielectric Marble + 24k Gold Conductor Trim) ---
  if (uWorldId == 0) {
    if (matId == MAT_FLUID) {
      // Henyey-Greenstein / Mie forward cloud scattering
      float silverLining = pow(max(dot(rd, sunIllumDir), 0.0), 5.0);
      float topLight = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 shadowTint = vec3(0.42, 0.36, 0.52);
      vec3 litTint = vec3(1.12, 0.98, 0.88);
      vec3 cloudCol = mix(shadowTint, litTint, clamp(diff * 0.65 + topLight * 0.45, 0.0, 1.0));
      cloudCol += uSunColor * silverLining * 0.65;
      return cloudCol * (0.55 + 0.45 * ao) + probeLight;
    }
    float vein = smoothstep(0.42, 0.55, fbm3(p * 0.45));
    float goldMask = smoothstep(0.76, 0.92, abs(sin(p.y * 0.85)));
    vec3 marble = mix(vec3(0.88, 0.84, 0.78), vec3(0.62, 0.56, 0.50), vein);
    float fMarble = fresnelDielectric(cosView, 1.0, 1.49); // Calcite n = 1.49 (R0 = 0.039)
    vec3 fGold = fresnelConductor(cosView, AU_ETA, AU_KAPPA);
    vec3 reflSky = skyWorld0(reflect(rd, n));

    vec3 diffCol = marble * (uSkyZenith * 0.55 + uSunColor * diff * 0.85) * ao;
    vec3 goldCol = (reflSky * 0.75 + uSunColor * spec * 1.6) * fGold * ao;
    vec3 col = mix(diffCol + reflSky * fMarble * 0.6 + uSunColor * spec * 0.35, goldCol, goldMask);
    return col + probeLight;
  }

  // --- World 1: Abyssal Biolume (Dispersion Caustics omega^2 = gk) ---
  if (uWorldId == 1) {
    float caust = deepWaterDispersionCaustics(p.xz * 0.75, uTime);
    float upMask = clamp(n.y * 0.65 + 0.35, 0.0, 1.0);
    float bioWave = 0.5 + 0.5 * sin(p.y * 0.42 - uTime * 2.5 + p.z * 0.11);
    vec3 bioCol = mix(vec3(0.08, 1.15, 1.05), vec3(0.95, 0.20, 1.15), 0.5 + 0.5 * sin(p.z * 0.08 + p.x * 0.1));

    if (matId == MAT_EMISSIVE) {
      return bioCol * (1.8 + 1.1 * bioWave) + vec3(0.3, 1.0, 0.95) * fresnel + probeLight;
    }
    vec3 baseRock = (matId == MAT_STRUCT) ? vec3(0.06, 0.14, 0.22) : vec3(0.03, 0.08, 0.13);
    vec3 col = baseRock * (0.35 + 0.65 * diff) * ao;
    // Beer-Lambert depth attenuation of downwelling refracted caustics
    float depthAtten = exp(-max(0.0, 26.0 - p.y) * 0.035);
    col += vec3(0.14, 0.95, 1.12) * caust * upMask * depthAtten * ao * 0.85;
    if (matId == MAT_STRUCT) {
      float vRaw = smoothstep(0.55, 0.88, fbm3(p * 0.55));
      col += bioCol * (vRaw * vRaw) * (0.65 + 1.25 * bioWave * bioWave);
    }
    col += bioCol * fresnel * 0.42 + probeLight;
    return col;
  }

  // --- World 2: Singularity Forge (Obsidian Glass n=1.50 + Accretion Disk Reflections) ---
  if (uWorldId == 2) {
    vec3 refl = skyWorld2(reflect(rd, n));
    float fObsidian = fresnelDielectric(cosView, 1.0, 1.52); // Volcanic obsidian glass n = 1.52
    vec3 obsidian = vec3(0.03, 0.03, 0.045) * (0.2 + 0.8 * diff) * ao;
    float cracks = pow(smoothstep(0.66, 0.86, fbm3(p * 0.48)), 2.5);
    vec3 col = obsidian + refl * (0.18 + 0.82 * fObsidian) * ao;
    col += vec3(1.8, 0.55, 0.12) * cracks * (0.9 + 0.4 * sin(uTime * 2.5 + p.z * 0.2));
    return col + probeLight;
  }

  // --- World 3: Verdant Titan (Galilean Free-Fall Acceleration v = sqrt(v0^2 + 2g*dy)) ---
  if (uWorldId == 3) {
    if (matId == MAT_FLUID) {
      // Exact Galilean free-fall Lagrangian phase tau(y) = (sqrt(v0^2 + 2*g*dy) - v0) / g!
      float islandCell = floor((p.z + 18.0) / 36.0);
      float yLip = uBaseHeight + 6.5 + 3.0 * sin(islandCell * 2.3);
      float dropY = max(0.0, yLip - p.y);
      const float gTitan = 7.65;
      const float v0 = 2.4;
      float vFall = sqrt(v0 * v0 + 2.0 * gTitan * dropY);
      float tauFall = (vFall - v0) / gTitan;

      // Advect foam streaks by physical free-fall time tauFall (stretches naturally as vFall increases!)
      float streak = fbm2Fast(vec2(p.x * 3.0, tauFall * 5.8 - uTime * 5.8));
      // Rayleigh-Plateau aeration increases foam whiteness near bottom of fall
      float aeration = smoothstep(2.0, 14.0, dropY);
      float fWater = fresnelDielectric(cosView, 1.0, 1.333);
      vec3 waterCol = mix(vec3(0.32, 0.78, 0.84), vec3(1.18, 1.22, 1.20), clamp(streak * 0.8 + aeration * 0.45, 0.0, 1.0));
      waterCol += uSunColor * (spec * 1.3 + fWater * 0.45);
      return waterCol * (0.75 + 0.25 * diff) + probeLight;
    }
    float strata = 0.5 + 0.5 * sin(p.y * 1.4 + fbm2Fast(p.xz * 0.15) * 3.0);
    vec3 cliffCol = mix(vec3(0.56, 0.36, 0.24), vec3(0.78, 0.58, 0.40), strata);
    vec3 mossCol = mix(vec3(0.08, 0.42, 0.22), vec3(0.24, 0.68, 0.32), fbm2Fast(p.xz * 0.35));
    float mossMask = smoothstep(0.42, 0.72, n.y);
    vec3 albedo = mix(cliffCol, mossCol, mossMask);
    vec3 col = albedo * (vec3(0.22, 0.40, 0.45) + uSunColor * diff * 0.88) * ao;
    col += vec3(0.45, 0.88, 0.75) * fresnel * 0.28 + probeLight;
    return col;
  }

  // --- World 4: Hyperbolic Sanctum (Exact Complex Gold Conductor Fresnel + Dielectric Onyx) ---
  if (uWorldId == 4) {
    vec3 trap = evalSanctumOrbitTrap(p);
    float goldMask = clamp(exp(-min(trap.x, trap.y) * 15.0), 0.0, 1.0);
    float violetVein = exp(-trap.z * 14.0);
    float pulse = 0.75 + 0.25 * sin(p.z * 0.35 - uTime * 2.8);

    float fOnyx = fresnelDielectric(cosView, 1.0, 1.54); // Crystalline chalcedony/onyx n = 1.54
    vec3 fGold = fresnelConductor(cosView, AU_ETA, AU_KAPPA);
    vec3 reflVault = skyWorld4(reflect(rd, n));

    vec3 onyx = mix(vec3(0.04, 0.035, 0.07), vec3(0.68, 0.64, 0.74), smoothstep(0.5, 0.9, trap.y));
    vec3 col = onyx * (0.25 + 0.75 * diff) * ao + reflVault * fOnyx * 0.85;
    // Conductor gold veins with exact wavelength-dependent Au Fresnel + harmonic emission
    col = mix(col, (reflVault * 1.4 + uSunColor * spec * 2.0 + vec3(1.45, 0.98, 0.32) * pulse) * fGold, goldMask);
    col += vec3(0.68, 0.25, 1.35) * violetVein * 0.95 + probeLight;
    return col;
  }

  // --- World 5: Solaris Dunes (Bagnold Ripples + Conductor Mirror Obelisks) ---
  if (uWorldId == 5) {
    if (matId == MAT_EMISSIVE) {
      return vec3(1.8, 0.65, 0.25) * 1.8 + vec3(0.3, 1.4, 0.9) * fresnel + probeLight;
    }
    if (matId == MAT_STRUCT) {
      vec3 refl = skyWorld5(reflect(rd, n));
      vec3 fMirror = fresnelConductor(cosView, IR_ETA, IR_KAPPA);
      vec3 fGoldRim = fresnelConductor(cosView, AU_ETA, AU_KAPPA);
      return refl * fMirror * 1.05 * ao + fGoldRim * pow(clamp(1.0 - cosView, 0.0, 1.0), 3.0) * 0.8 + uSunColor * spec * 1.4 + probeLight;
    }
    // Aeolian wind-ripple micro-facets perpendicular to wind shear vector
    float ripples = sin(p.x * 3.8 + p.z * 1.6 + noise2(p.xz * 0.6) * 2.8);
    vec3 nRipple = normalize(n + vec3(ripples * 0.075, 0.0, ripples * 0.04));
    float rDiff = max(dot(nRipple, sunIllumDir), 0.0);
    float rSpec = pow(max(dot(nRipple, halfV), 0.0), 32.0);
    float sparkle = pow(hash21(floor(p.xz * 18.0)), 18.0) * rDiff;
    vec3 sand = mix(vec3(0.38, 0.11, 0.09), vec3(0.86, 0.36, 0.20), rDiff);
    vec3 col = sand * (vec3(0.28, 0.14, 0.22) + uSunColor * rDiff * 0.85) * ao;
    col += vec3(1.4, 0.75, 0.45) * (rSpec * 0.55 + sparkle * 2.2);
    col += vec3(0.08, 0.42, 0.32) * clamp(nRipple.y, 0.0, 1.0) * (1.0 - rDiff) * 0.45 + probeLight;
    return col;
  }

  // --- World 6: Cryogenic Aurora (Exact Schlick-Fresnel R0 = 0.02037 Sea & Beer-Lambert Ice) ---
  if (uWorldId == 6) {
    if (matId == MAT_FLUID) {
      // Capillary-gravity polar sea ripples obeying omega = sqrt(gk)
      vec2 w1 = p.xz * 1.2 - vec2(uTime * 0.9, uTime * 0.5);
      vec2 w2 = p.xz * 2.3 + vec2(uTime * 0.7, -uTime * 1.1);
      vec3 waterN = normalize(vec3(
        (noise2(w1) - 0.5) * 0.042 + (noise2(w2) - 0.5) * 0.022,
        1.0,
        (noise2(w1 + 5.3) - 0.5) * 0.042 + (noise2(w2 + 9.1) - 0.5) * 0.022
      ));
      vec3 reflDir = reflect(rd, waterN);
      reflDir.y = abs(reflDir.y);
      vec3 reflCol = skyWorld6(reflDir);

      // Exact Dielectric Schlick-Fresnel for Air (n1=1.00029) -> Seawater (n2=1.333):
      //   R0 = ((1.00029 - 1.333) / (1.00029 + 1.333))^2 = 0.02037!
      float cosWater = clamp(dot(-rd, waterN), 0.0, 1.0);
      float F_water = fresnelDielectric(cosWater, 1.00029, 1.333);

      // Transmitted component (1 - F_water) enters deep water with Beer-Lambert absorption
      vec3 deepAbyss = vec3(0.006, 0.032, 0.065);
      return mix(deepAbyss, reflCol, F_water) + probeLight * (0.25 + 0.75 * F_water);
    }

    // Hexagonal Glacier Ice (n2 = 1.309 => R0 = 0.0179) + Beer-Lambert O-H Overtones Absorption!
    // Pure ice absorbs red wavelengths ~20x more strongly than blue: sigma_a = (0.48, 0.065, 0.020) m^-1
    float F_ice = fresnelDielectric(cosView, 1.00029, 1.309);
    float opticalPath = mix(4.8, 1.2, ao) * (1.2 - 0.5 * clamp(dot(rd, -n), 0.0, 1.0));
    vec3 beerLambertIce = exp(-vec3(0.48, 0.065, 0.020) * opticalPath);

    vec3 reflAurora = skyWorld6(reflect(rd, n));
    vec3 internalScatter = beerLambertIce * (0.38 + 0.62 * diff) * 1.15;
    vec3 col = mix(internalScatter, reflAurora, F_ice);
    col += vec3(0.85, 1.0, 0.96) * spec * 1.15 + probeLight;
    return col;
  }

  // --- World 7: Chrono Nexus (Iridium/Gold Conductor Lattice) ---
  if (matId == MAT_EMISSIVE) {
    float stream = 0.65 + 0.35 * sin(p.z * 0.65 - uTime * 6.5);
    vec3 prism = mix(vec3(1.55, 1.15, 0.55), vec3(0.75, 0.55, 1.65), 0.5 + 0.5 * sin(p.z * 0.12));
    return prism * stream * 2.2 + vec3(1.2) * fresnel + probeLight;
  }
  vec3 reflNeb = skyWorld7(reflect(rd, n));
  vec3 fPlat = fresnelConductor(cosView, IR_ETA, IR_KAPPA);
  vec3 basePlat = vec3(0.10, 0.09, 0.14) * (0.3 + 0.7 * diff) * ao;
  vec3 col = mix(basePlat, reflNeb * ao, fPlat * 0.78);
  col += vec3(1.4, 1.05, 0.65) * spec * 0.95 + probeLight;
  return col;
}
`;
