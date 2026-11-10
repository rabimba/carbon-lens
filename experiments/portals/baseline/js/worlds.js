/**
 * Endless Multiverse World Definitions & Physical Constants
 * Each world specifies real gravitational acceleration, fluid density (drag & Archimedes buoyancy),
 * surface coefficient of restitution, refractive/conductor properties, acoustic wave speed,
 * and harmonic tuning.
 */

export const WORLD_LENGTH = 180.0;
export const PORTAL_RADIUS = 8.05;
export const STANDARD_GRAVITY = 9.81;

export const WORLDS = [
  {
    id: 0,
    slug: 'celestial-observatory',
    roman: 'I',
    name: 'Celestial Observatory',
    subtitle: 'Keplerian Ringworld & Euler Precessing Astrolabes',
    classification: 'KEPLERIAN ORBIT · ω(r) = √(GM/r³) · 1.00 G',
    physicsSummary: '1.00 g · Keplerian Rings',
    baseHeight: 11.5,
    cruiseSpeed: 12.2,
    ampX: 15.0,
    ampY: 4.8,
    seedA: 0.45,
    seedB: 1.90,
    corridorRadius: 10.8,
    // Physical environment constants (SI units)
    gravity: [0.0, -9.81, 0.0],
    fluidDensity: 0.88,         // High-altitude cloud atmosphere (kg/m^3)
    windVec: [0.6, 0.15, 1.2],  // Gentle thermal updraft & tailwind (m/s)
    restitution: 0.78,          // Polished Carrara marble elasticity
    friction: 0.08,
    probeDensity: 2200.0,       // Silicate-gold test sphere (kg/m^3)
    soundSpeed: 325.0,          // High-altitude speed of sound (m/s)
    sunDir: [0.42, 0.46, 0.78],
    skyZenith: [0.06, 0.18, 0.46],
    skyHorizon: [0.95, 0.66, 0.38],
    sunColor: [1.55, 1.18, 0.75],
    fogColor: [0.84, 0.64, 0.45],
    fogDensity: 0.0042,
    portalAccent: [1.45, 1.05, 0.45],
    particleColorA: [1.0, 0.86, 0.52],
    particleColorB: [0.65, 0.88, 1.0],
    particleMode: 0,
    chordMidi: [38, 45, 52, 54, 57, 61, 68],
    audioCharacter: 'lydian-brass'
  },
  {
    id: 1,
    slug: 'abyssal-biolume',
    roman: 'II',
    name: 'Abyssal Biolume',
    subtitle: 'Dispersion Caustics (ω² = gk) & Archimedes Trench',
    classification: 'SEAWATER ρ = 1025 KG/M³ · HYDRODYNAMIC DRAG',
    physicsSummary: 'ρ 1025 · Buoyancy & ω²=gk',
    baseHeight: 12.5,
    cruiseSpeed: 10.4,
    ampX: 14.0,
    ampY: 5.2,
    seedA: 2.15,
    seedB: 0.85,
    corridorRadius: 10.5,
    gravity: [0.0, -9.81, 0.0],
    fluidDensity: 1025.0,       // Dense abyssal seawater (strong quadratic drag & Archimedes buoyancy!)
    windVec: [0.35, 0.25, 0.9], // Deep ocean current (m/s)
    restitution: 0.54,          // Bio-mineralized coral damping
    friction: 0.18,
    probeDensity: 910.0,        // Positively buoyant bathysphere probes (rise gently via Archimedes law!)
    soundSpeed: 1500.0,         // Speed of sound in seawater (m/s)
    sunDir: [0.08, 0.92, 0.38],
    skyZenith: [0.01, 0.14, 0.24],
    skyHorizon: [0.01, 0.04, 0.10],
    sunColor: [0.22, 0.95, 1.15],
    fogColor: [0.015, 0.085, 0.16],
    fogDensity: 0.0082,
    portalAccent: [0.18, 1.35, 1.45],
    particleColorA: [0.15, 1.0, 0.92],
    particleColorB: [0.92, 0.25, 1.0],
    particleMode: 1,
    chordMidi: [35, 42, 45, 50, 54, 61, 64],
    audioCharacter: 'abyssal-liquid'
  },
  {
    id: 2,
    slug: 'singularity-forge',
    roman: 'III',
    name: 'Singularity Forge',
    subtitle: 'Schwarzschild Geodesics, Photon Ring & Doppler Disk',
    classification: 'b_crit = (3√3/2)r_s · DOPPLER D^(3+α) · VACUUM',
    physicsSummary: '0 g Vacuum · GR Gravity Well',
    baseHeight: 11.0,
    cruiseSpeed: 14.2,
    ampX: 16.5,
    ampY: 5.5,
    seedA: 4.10,
    seedB: 2.65,
    corridorRadius: 11.2,
    gravity: [0.0, 0.0, 0.0],   // Orbital free-fall + central GM/r^2 singularity attraction!
    bhAttractorPos: [38.0, 56.0, 148.0],
    bhGM: 6800.0,               // Central gravitational parameter GM (m^3/s^2) for slingshot & probe orbits
    bhSchwarzschildR: 6.0,
    fluidDensity: 0.0,          // Hard relativistic vacuum (zero aerodynamic drag!)
    windVec: [0.0, 0.0, 0.0],
    restitution: 0.86,          // Dense obsidian-iridium elastic rebound
    friction: 0.04,
    probeDensity: 4500.0,
    soundSpeed: 280.0,          // Effective plasma/hull wave speed for telemetry synthesizer
    sunDir: [0.24, 0.34, 0.91],
    skyZenith: [0.005, 0.007, 0.018],
    skyHorizon: [0.06, 0.03, 0.02],
    sunColor: [1.75, 0.88, 0.42],
    fogColor: [0.07, 0.035, 0.025],
    fogDensity: 0.0018,
    portalAccent: [1.65, 0.68, 0.22],
    particleColorA: [1.0, 0.58, 0.22],
    particleColorB: [0.48, 0.76, 1.0],
    particleMode: 2,
    chordMidi: [24, 31, 36, 49, 52, 55, 58],
    audioCharacter: 'singularity-drone'
  },
  {
    id: 3,
    slug: 'verdant-titan',
    roman: 'IV',
    name: 'Verdant Titan',
    subtitle: 'Galilean Free-Fall Falls & 42° Anti-Solar Rainbow',
    classification: 'g = 7.65 M/S² (0.78 G) · v(y) = √(v₀² + 2gΔy)',
    physicsSummary: '0.78 g · Galilean Free-Fall',
    baseHeight: 14.0,
    cruiseSpeed: 12.0,
    ampX: 15.5,
    ampY: 5.4,
    seedA: 1.25,
    seedB: 3.70,
    corridorRadius: 11.0,
    gravity: [0.0, -7.65, 0.0], // 0.78g exo-moon surface gravity
    fluidDensity: 1.85,         // Dense Titan-like nitrogen-oxygen atmosphere
    windVec: [-0.8, 0.2, 0.6],
    restitution: 0.60,          // Moss-cushioned sandstone mesas
    friction: 0.16,
    probeDensity: 1800.0,
    soundSpeed: 310.0,
    sunDir: [-0.36, 0.44, -0.82], // Sun behind/above-left so the 42° ANTI-SOLAR rainbow glows ahead in the mist!
    skyZenith: [0.05, 0.34, 0.48],
    skyHorizon: [0.58, 0.88, 0.80],
    sunColor: [1.45, 1.32, 0.98],
    fogColor: [0.52, 0.80, 0.74],
    fogDensity: 0.0046,
    portalAccent: [0.32, 1.40, 0.78],
    particleColorA: [0.85, 1.0, 0.72],
    particleColorB: [1.0, 0.96, 0.84],
    particleMode: 3,
    chordMidi: [43, 50, 57, 59, 62, 66, 69],
    audioCharacter: 'pastoral-wind'
  },
  {
    id: 4,
    slug: 'hyperbolic-sanctum',
    roman: 'V',
    name: 'Hyperbolic Sanctum',
    subtitle: 'Hookean Normal-Mode Lattice & Gold Conductor Fresnel',
    classification: 'COUPLED HOOKEAN MODES · Au (η, κ) FRESNEL',
    physicsSummary: 'Hookean Modes · Au Fresnel',
    baseHeight: 12.0,
    cruiseSpeed: 11.4,
    ampX: 11.5,
    ampY: 4.2,
    seedA: 5.05,
    seedB: 1.40,
    corridorRadius: 10.2,
    gravity: [0.0, -3.2, 0.0],  // Low sanctuary gravity + Hookean harmonic restoring potential
    hookeanStiffness: 0.42,     // Harmonic spring constant k/m toward local equilibrium plane
    fluidDensity: 0.35,
    windVec: [0.0, 0.0, 0.0],
    restitution: 0.90,          // Highly elastic crystalline onyx rebound
    friction: 0.05,
    probeDensity: 2600.0,
    soundSpeed: 343.0,
    sunDir: [0.0, 0.35, 0.94],
    skyZenith: [0.03, 0.015, 0.07],
    skyHorizon: [0.14, 0.07, 0.22],
    sunColor: [1.45, 1.02, 0.55],
    fogColor: [0.08, 0.04, 0.14],
    fogDensity: 0.0056,
    portalAccent: [1.38, 0.82, 1.55],
    particleColorA: [1.0, 0.78, 0.36],
    particleColorB: [0.74, 0.42, 1.0],
    particleMode: 4,
    chordMidi: [30, 37, 45, 49, 53, 56, 61],
    audioCharacter: 'cathedral-choir'
  },
  {
    id: 5,
    slug: 'solaris-dunes',
    roman: 'VI',
    name: 'Solaris Dunes',
    subtitle: 'Bagnold Aeolian Saltation & Eclipsed Corona',
    classification: 'PRANDTL SHEAR u*(z) · 34° SLIP-FACE DUNES',
    physicsSummary: '0.91 g · Bagnold Saltation',
    baseHeight: 11.5,
    cruiseSpeed: 12.8,
    ampX: 16.0,
    ampY: 4.5,
    seedA: 2.95,
    seedB: 4.60,
    corridorRadius: 10.8,
    gravity: [0.0, -8.92, 0.0],
    fluidDensity: 1.15,
    windVec: [7.8, 0.35, 3.4],  // Strong desert crosswind driving Bagnold sand saltation!
    restitution: 0.42,          // Granular sand inelastic energy absorption
    friction: 0.32,
    probeDensity: 2400.0,
    soundSpeed: 365.0,          // Warm desert acoustic velocity (m/s)
    sunDir: [0.18, 0.28, 0.94],
    skyZenith: [0.06, 0.02, 0.08],
    skyHorizon: [0.82, 0.26, 0.16],
    sunColor: [1.65, 0.52, 0.32],
    fogColor: [0.58, 0.22, 0.16],
    fogDensity: 0.0048,
    portalAccent: [1.60, 0.42, 0.55],
    particleColorA: [1.0, 0.55, 0.32],
    particleColorB: [0.25, 1.0, 0.72],
    particleMode: 5,
    chordMidi: [28, 35, 40, 53, 56, 59, 62],
    audioCharacter: 'desert-mirage'
  },
  {
    id: 6,
    slug: 'cryogenic-aurora',
    roman: 'VII',
    name: 'Cryogenic Aurora',
    subtitle: 'Schlick-Fresnel Mirror Sea (R₀ = 0.02) & Curl-Noise Snow',
    classification: 'DIELECTRIC n = 1.333 · STOKES + ∇×Ψ TURBULENCE',
    physicsSummary: '1.00 g · Fresnel R₀=0.020',
    baseHeight: 10.5,
    cruiseSpeed: 11.6,
    ampX: 14.5,
    ampY: 4.0,
    seedA: 0.90,
    seedB: 5.35,
    corridorRadius: 10.6,
    gravity: [0.0, -9.81, 0.0],
    fluidDensity: 1.42,         // Crisp dense cryogenic polar air
    waterLevel: 2.4,            // Liquid arctic sea level with Archimedes floatation!
    waterDensity: 1028.0,
    windVec: [-1.4, 0.0, 0.8],
    restitution: 0.76,          // Hard hexagonal water-ice rebound
    friction: 0.03,             // Low-friction glacial ice!
    probeDensity: 860.0,        // Floats on the polar sea at y=2.4 like an ice-buoy!
    soundSpeed: 295.0,          // Cold polar acoustic velocity (m/s)
    sunDir: [-0.25, 0.42, 0.87],
    skyZenith: [0.008, 0.022, 0.065],
    skyHorizon: [0.04, 0.16, 0.24],
    sunColor: [0.45, 1.35, 0.95],
    fogColor: [0.04, 0.13, 0.20],
    fogDensity: 0.0040,
    portalAccent: [0.35, 1.45, 1.12],
    particleColorA: [0.82, 0.96, 1.0],
    particleColorB: [0.32, 1.0, 0.78],
    particleMode: 6,
    chordMidi: [39, 46, 55, 57, 62, 65, 70],
    audioCharacter: 'glacial-bells'
  },
  {
    id: 7,
    slug: 'chrono-nexus',
    roman: 'VIII',
    name: 'Chrono Nexus',
    subtitle: 'Euler Gyroscopic Dyson Lattice & Keplerian Streams',
    classification: 'Iω̇ + ω × Iω = 0 · ZERO-G ORBITAL CONVERGENCE',
    physicsSummary: '0 g · Euler Gyro Precession',
    baseHeight: 12.0,
    cruiseSpeed: 13.4,
    ampX: 15.0,
    ampY: 5.6,
    seedA: 3.55,
    seedB: 0.45,
    corridorRadius: 11.2,
    gravity: [0.0, 0.0, 0.0],   // Pure zero-gravity inertial frame
    fluidDensity: 0.0,          // Deep-space vacuum
    windVec: [0.0, 0.0, 0.0],
    restitution: 0.88,          // Resonant platinum-crystal Dyson rings
    friction: 0.02,
    probeDensity: 3000.0,
    soundSpeed: 320.0,
    sunDir: [0.0, 0.18, 0.98],
    skyZenith: [0.02, 0.01, 0.08],
    skyHorizon: [0.16, 0.05, 0.26],
    sunColor: [1.45, 0.95, 1.55],
    fogColor: [0.10, 0.04, 0.18],
    fogDensity: 0.0026,
    portalAccent: [1.35, 1.15, 1.65],
    particleColorA: [1.0, 0.84, 0.55],
    particleColorB: [0.62, 0.48, 1.0],
    particleMode: 7,
    chordMidi: [33, 40, 47, 52, 57, 61, 64],
    audioCharacter: 'cosmic-nexus'
  }
];

/**
 * Generates a world instance for a given sequential index in the endless journey.
 */
export function createWorldInstance(sequenceIndex) {
  const count = WORLDS.length;
  const worldIdx = ((sequenceIndex % count) + count) % count;
  const cycle = Math.floor(sequenceIndex / count);
  const base = WORLDS[worldIdx];

  const cyclePhase = cycle * 1.61803398875;
  const seedShiftA = cycle === 0 ? 0.0 : Math.sin(cyclePhase + worldIdx) * 1.35;
  const seedShiftB = cycle === 0 ? 0.0 : Math.cos(cyclePhase * 0.7 + worldIdx * 1.7) * 1.35;

  // Keep World IV's anti-solar rainbow geometry well-framed ahead even on later cycles
  const azimuthAmp = worldIdx === 3 ? 0.08 : 0.18;
  const sunAzimuthShift = cycle === 0 ? 0.0 : Math.sin(cycle * 0.85 + worldIdx) * azimuthAmp;
  const sx = base.sunDir[0] * Math.cos(sunAzimuthShift) - base.sunDir[2] * Math.sin(sunAzimuthShift);
  const sy = base.sunDir[1];
  const sz = base.sunDir[0] * Math.sin(sunAzimuthShift) + base.sunDir[2] * Math.cos(sunAzimuthShift);
  const sLen = Math.hypot(sx, sy, sz) || 1.0;

  return {
    ...base,
    sequenceIndex,
    cycle: cycle + 1,
    instanceSeed: sequenceIndex * 13.37 + worldIdx * 7.13,
    seedA: base.seedA + seedShiftA,
    seedB: base.seedB + seedShiftB,
    sunDir: [sx / sLen, sy / sLen, sz / sLen]
  };
}
