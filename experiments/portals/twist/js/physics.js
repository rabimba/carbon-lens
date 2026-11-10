// ============================================================================
// physics.js — Real-Time 3D Continuum, Rigid-Body & Cross-Portal Physics Engine
// Implements:
//   1. Cross-Portal Reference-Frame & Momentum/Spin/Energy Conservation (R_AB)
//   2. Sub-Stepped 3D Rigid-Body Spheres (m, r, e, Coulomb μ, Quadratic Drag, Spin)
//   3. Articulated §142.7 Plywood Billboard Hinge Dynamics & Off-Axis Torque Jolts
//   4. World 0 (Escher): 4-Axis Relativistic Gravity Tensor g(x) + RK4 Euler Precession
//   5. World 1 (Armilla): Bernoulli Head + Torricelli Efflux (v=sqrt(2gh)) + Splash Rings
//   6. World 2 (Hokusai): 4-Train Gerstner Dispersion (ω=sqrt(gk)) + Archimedes Buoyancy
//   7. World 3 (Lascaux): Boussinesq Plume Updrafts + Elliptic Cavern Arch Collisions
//   8. World 4 (Origami): RK4 Nonlinear Anchor-Escapement Pendulum + No-Slip Gear Drive
//   9. World 5 (Scriptorium): Obsidian Mirror-Sea Impacts -> Gravity-Capillary Ripples
//  10. §199.4 Committee Physics Regulation (1.4 m/s OSHA Speed Cap, 8x Drag, e = 0.05)
// ============================================================================
(function () {
  "use strict";
  const PE = (window.PortalEngine = window.PortalEngine || {});
  const { MathGL } = PE;

  const G_STD = 9.81;
  const RHO_AIR = 1.225;
  const RHO_WATER = 1025.0;
  const PORTAL_SPAN = 36.0;
  const PORTAL_HALF = 18.0;
  const MAX_SPHERES = 14;
  const AUTO_SPHERE_COUNT = 3;
  const MAX_RIPPLES = 8;

  // Orthonormal Portal Transition Matrix R_AB (Exit z=-18 -> Entry z=+18)
  // Explicit 3x3 rotation operator verifying |v'| = |R_AB v| = |v| and |ω'| = |ω|
  const PORTAL_R_FORWARD = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const PORTAL_R_BACKWARD = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  function applyMat3Vec3(out, R, v) {
    const x = v[0], y = v[1], z = v[2];
    out[0] = R[0] * x + R[3] * y + R[6] * z;
    out[1] = R[1] * x + R[4] * y + R[7] * z;
    out[2] = R[2] * x + R[5] * y + R[8] * z;
  }

  function normalizeQuat(q) {
    const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1.0;
    q[0] /= len; q[1] /= len; q[2] /= len; q[3] /= len;
  }

  // Integrate unit quaternion q by world-frame angular velocity ω over dt:
  // dq/dt = 0.5 * (ω_x i + ω_y j + ω_z k) ⊗ q
  function integrateQuatWorldOmega(q, omega, dt) {
    const wx = omega[0], wy = omega[1], wz = omega[2];
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const hdt = 0.5 * dt;
    q[0] = qx + hdt * (wx * qw + wy * qz - wz * qy);
    q[1] = qy + hdt * (wy * qw + wz * qx - wx * qz);
    q[2] = qz + hdt * (wz * qw + wx * qy - wy * qx);
    q[3] = qw + hdt * (-wx * qx - wy * qy - wz * qz);
    normalizeQuat(q);
  }

  // Integrate unit quaternion q by body-frame angular velocity ω_b over dt:
  // dq/dt = 0.5 * q ⊗ (ω_1 i + ω_2 j + ω_3 k)
  function integrateQuatBodyOmega(q, wb, dt) {
    const wx = wb[0], wy = wb[1], wz = wb[2];
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const hdt = 0.5 * dt;
    q[0] = qx + hdt * (qw * wx + qy * wz - qz * wy);
    q[1] = qy + hdt * (qw * wy + qz * wx - qx * wz);
    q[2] = qz + hdt * (qw * wz + qx * wy - qy * wx);
    q[3] = qw + hdt * (-qx * wx - qy * wy - qz * wz);
    normalizeQuat(q);
  }

  function quatFromPitchRollYaw(out, pitch, roll, yaw) {
    const hp = pitch * 0.5, hr = roll * 0.5, hy = yaw * 0.5;
    const cp = Math.cos(hp), sp = Math.sin(hp);
    const cr = Math.cos(hr), sr = Math.sin(hr);
    const cy = Math.cos(hy), sy = Math.sin(hy);
    out[0] = cy * sp * cr + sy * cp * sr;
    out[1] = sy * cp * cr - cy * sp * sr;
    out[2] = cy * cp * sr - sy * sp * cr;
    out[3] = cy * cp * cr + sy * sp * sr;
    normalizeQuat(out);
  }

  // --------------------------------------------------------------------------
  // Exact 4-Train Trochoidal Gerstner Deep-Water Gravity Wave Dispersion
  // Matches applyGerstnerSea() in js/shaders.js 1:1 (ω_i = sqrt(g * |k_i|))
  // --------------------------------------------------------------------------
  const GERSTNER_TRAINS = [
    { kx: 0.42,  kz: 0.22,  km: 0.47413, w: 2.1566, a: 0.34, q: 0.52 },
    { kx: -0.31, kz: 0.58,  km: 0.65765, w: 2.5399, a: 0.22, q: 0.48 },
    { kx: 0.76,  kz: -0.35, km: 0.83672, w: 2.8650, a: 0.14, q: 0.42 },
    { kx: -0.62, kz: -0.88, km: 1.07648, w: 3.2497, a: 0.09, q: 0.38 }
  ];

  function evalGerstnerSea(x, z, animPhase, ampScale, out) {
    // 1st-order inverse horizontal trochoidal lookup so CPU height matches displaced GPU crest
    let rx = x;
    let rz = z;
    for (let i = 0; i < 4; i++) {
      const tr = GERSTNER_TRAINS[i];
      const a = tr.a * ampScale;
      const s = Math.sin(tr.kx * x + tr.kz * z - tr.w * animPhase);
      const factor = (tr.q * a) / tr.km;
      rx += factor * tr.kx * s;
      rz += factor * tr.kz * s;
    }

    let dispY = Math.abs(rx) * 0.07 - 0.25;
    let nx = rx >= 0 ? -0.07 : 0.07;
    let nz = 0.0;
    let ny = 1.0;
    let ux = 0.0, uy = 0.0, uz = 0.0;

    for (let i = 0; i < 4; i++) {
      const tr = GERSTNER_TRAINS[i];
      const a = tr.a * ampScale;
      const th = tr.kx * rx + tr.kz * rz - tr.w * animPhase;
      const s = Math.sin(th);
      const c = Math.cos(th);

      dispY += a * c;
      nx += a * tr.kx * s;
      nz += a * tr.kz * s;
      ny -= tr.q * a * tr.km * c;

      // Orbital fluid velocity u = d(pos)/dt at surface
      const orb = tr.w * a;
      ux += (tr.q * orb * tr.kx / tr.km) * c;
      uz += (tr.q * orb * tr.kz / tr.km) * c;
      uy += orb * s;
    }

    ny = Math.max(0.15, ny);
    const nLen = Math.hypot(nx, ny, nz) || 1.0;
    out.height = dispY;
    out.nx = nx / nLen;
    out.ny = ny / nLen;
    out.nz = nz / nLen;
    out.ux = ux;
    out.uy = uy;
    out.uz = uz;
    return out;
  }

  // --------------------------------------------------------------------------
  // World Gravity Tensor Field g(x)
  // In World 0 (Escher), piecewise C1-blended 4-axis stairwell gravity wells!
  // --------------------------------------------------------------------------
  function evalWorldGravity(worldIdx, x, y, _z, outG) {
    if (worldIdx !== 0) {
      outG[0] = 0.0;
      outG[1] = -G_STD;
      outG[2] = 0.0;
      return "−Y (9.81 m/s²)";
    }

    // Relativistic Stairwell 4-axis piecewise gravity tensor:
    //   • Left wall stairwell (x < -3.75, 1.3 < y < 8.1): g -> (-9.81, 0, 0)
    //   • Right wall stairwell (x > +3.75, 1.3 < y < 8.1): g -> (+9.81, 0, 0)
    //   • Inverted ceiling promenade (|x| <= 3.75, y >= 4.85): g -> (0, +9.81, 0)
    //   • Standard floor promenade (|x| <= 3.75, y < 4.85): g -> (0, -9.81, 0)
    const wallBandY = MathGL.smoothstep(1.1, 1.8, y) * (1.0 - MathGL.smoothstep(7.8, 8.5, y));
    const leftW = MathGL.smoothstep(-3.45, -4.05, x) * wallBandY;
    const rightW = MathGL.smoothstep(3.45, 4.05, x) * wallBandY;
    const invCeilW = MathGL.smoothstep(4.55, 5.15, y) * (1.0 - Math.max(leftW, rightW));
    const floorW = Math.max(0.0, 1.0 - leftW - rightW - invCeilW);

    let gx = (-G_STD * leftW) + (G_STD * rightW);
    let gy = (-G_STD * floorW) + (G_STD * invCeilW);
    const mag = Math.hypot(gx, gy);
    if (mag > 1e-3) {
      const scale = G_STD / mag;
      gx *= scale;
      gy *= scale;
    } else {
      gy = -G_STD;
    }
    outG[0] = gx;
    outG[1] = gy;
    outG[2] = 0.0;

    if (leftW > 0.5) return "−X Wall Well";
    if (rightW > 0.5) return "+X Wall Well";
    if (invCeilW > 0.5) return "+Y Inverted Ceiling";
    return "−Y Lower Well";
  }

  // --------------------------------------------------------------------------
  // Torricelli Orifice Spigot & Basin Layout in World 1 (Matches geometry.js!)
  // --------------------------------------------------------------------------
  const ARMILLA_PIPE_COLS = [
    [-5.2, -14], [-7.8, -11], [-4.6, -7], [-8.5, -3], [-5.4, 2], [-7.2, 7], [-4.8, 12], [-8.0, 15],
    [5.2, -14],  [7.8, -11],  [4.6, -7],  [8.5, -3],  [5.4, 2],  [7.2, 7],  [4.8, 12],  [8.0, 15]
  ];
  const ARMILLA_JETS = [];
  ARMILLA_PIPE_COLS.forEach(([px, pz], idx) => {
    if (idx % 2 === 0) {
      const signX = px < 0 ? 1 : -1;
      const bx = px * 0.68;
      const by = 2.8 + (idx % 3) * 1.8;
      const x0 = px + signX * 0.42;
      const y0 = by + 1.50;
      const ySurf = by + 0.26;
      const fallH = y0 - ySurf; // 1.24m
      const tHit = Math.sqrt((2.0 * fallH) / G_STD); // 0.5028s
      const horizDist = Math.abs(bx - x0);
      const vEfflux = horizDist / tHit; // Torricelli v = sqrt(2 g h_head)
      const headH = (vEfflux * vEfflux) / (2.0 * G_STD);
      ARMILLA_JETS.push({
        x0, y0, z0: pz,
        signX,
        bx, by, bz: pz, ySurf,
        tHit,
        vEfflux,
        headH,
        phaseOffset: idx * 0.19
      });
    }
  });

  // Lascaux Paleolithic Hearth Positions (World 3)
  const LASCAUX_TORCHES = [
    [-3.4, 1.65, 9.0],
    [3.4, 1.65, 3.0],
    [-3.4, 1.65, -4.5],
    [3.4, 1.65, -11.5]
  ];

  // --------------------------------------------------------------------------
  // Main Continuum & Rigid-Body Physics Engine Class
  // --------------------------------------------------------------------------
  class ContinuumPhysicsEngine {
    constructor() {
      this.spheres = [];
      this.nextUserSlot = AUTO_SPHERE_COUNT;
      this.portalCrossingsByBodies = 0;
      this.billboardHits = 0;

      // Scratch objects (zero per-frame heap churn)
      this._gVec = new Float32Array(3);
      this._seaSample = { height: 0, nx: 0, ny: 1, nz: 0, ux: 0, uy: 0, uz: 0 };
      this._renderSpherePool = [];
      for (let i = 0; i < MAX_SPHERES * 2; i++) {
        this._renderSpherePool.push({
          pos: new Float32Array(3),
          quat: new Float32Array([0, 0, 0, 1]),
          radius: 0.3,
          color: [0.94, 0.74, 0.30],
          useColorOverride: 0.0
        });
      }

      // 1. Articulated §142.7 Potemkin Plywood Billboards (1 per world, sole-plate hinge at (1.85, 0, 6.20))
      this.billboards = [];
      for (let w = 0; w < 6; w++) {
        this.billboards.push({
          pivotX: 1.85,
          pivotY: 0.0,
          pivotZ: 6.20,
          tiltX: 0.0,
          tiltVelX: 0.0,
          yawY: 0.0,
          yawVelY: 0.0,
          lastHitTime: -10.0
        });
      }

      // 2. World 0: 3 Triaxial Euler-Precession Polyhedra (I1 < I2 < I3 -> Dzhanibekov intermediate-axis flip!)
      this.eulerBodies = [
        {
          pos: new Float32Array([-4.25, 5.45, -5.5]),
          quat: new Float32Array([0.12, 0.25, 0.05, 0.96]),
          omegaBody: new Float32Array([0.16, 1.95, 0.09]), // Near intermediate axis I2!
          inertia: [0.42, 1.08, 1.48],
          scale: 0.95
        },
        {
          pos: new Float32Array([4.25, 4.10, -11.0]),
          quat: new Float32Array([0.31, -0.14, 0.22, 0.91]),
          omegaBody: new Float32Array([0.12, -1.78, 0.14]),
          inertia: [0.42, 1.08, 1.48],
          scale: 0.90
        },
        {
          pos: new Float32Array([-3.95, 4.85, 6.4]),
          quat: new Float32Array([-0.18, 0.38, 0.15, 0.89]),
          omegaBody: new Float32Array([-0.19, 1.65, -0.11]),
          inertia: [0.42, 1.08, 1.48],
          scale: 0.88
        }
      ];
      this.eulerBodies.forEach((b) => normalizeQuat(b.quat));

      // 3. World 1: Torricelli Ballistic Water Parcels & Momentum-Conserving Splash Rings
      this.jetStreamPhase = 0.0;
      this.armillaSplashRings = ARMILLA_JETS.map((jet, idx) => ({
        x: jet.bx,
        y: jet.ySurf + 0.015,
        z: jet.bz,
        age: (idx * 0.13) % 0.50,
        period: 0.5028,
        strength: 1.0
      }));

      // 4. World 2: Archimedes Buoyant Edo Cedar Skiffs on 4-Train Gerstner Sea
      this.cedarSkiffs = [
        {
          anchorX: -2.25, anchorZ: -6.8,
          pos: new Float32Array([-2.25, 0.05, -6.8]),
          vel: new Float32Array([0, 0, 0]),
          pitch: 0.0, pitchVel: 0.0,
          roll: 0.0, rollVel: 0.0,
          yaw: 0.16,
          quat: new Float32Array([0, 0, 0, 1]),
          mass: 190.0,
          maxDispVol: 0.58 // m^3 -> floats with ~32% draft in 1025 kg/m^3 seawater
        },
        {
          anchorX: 2.35, anchorZ: 3.4,
          pos: new Float32Array([2.35, 0.05, 3.4]),
          vel: new Float32Array([0, 0, 0]),
          pitch: 0.0, pitchVel: 0.0,
          roll: 0.0, rollVel: 0.0,
          yaw: -0.19,
          quat: new Float32Array([0, 0, 0, 1]),
          mass: 190.0,
          maxDispVol: 0.58
        }
      ];

      // 5. World 4: RK4 Nonlinear Anchor-Escapement Pendulum & No-Slip Gear Train
      this.pendulum = {
        pivot: new Float32Array([0.0, 5.85, -12.15]),
        length: 2.35,         // m (T = 2π sqrt(2.35/9.81) ≈ 3.075s)
        theta: 0.31,          // rad
        omega: 0.0,           // rad/s
        escapementAngle: 0.0, // rad of 18-tooth master escape wheel
        targetEscAngle: 0.0,
        lastReleaseSign: 1,
        quat: new Float32Array([0, 0, 0, 1])
      };

      // 6. World 5: 8-Slot Ring Buffer of Radial Gravity-Capillary Ripples on Obsidian Mirror Sea
      // Layout per ripple vec4: [hitX, hitZ, hitTime, amplitude]
      this.rippleData = new Float32Array(MAX_RIPPLES * 4);
      this.rippleCursor = 0;
      this.totalMirrorRipples = 0;

      // 7. Player / Camera Kinematics & Newtonian Free-Roam State
      this.camVel = new Float32Array([0, 0, -3.55]);
      this.prevCamVel = new Float32Array([0, 0, -3.55]);
      this.camSpeed = 3.55;
      this.radialVelToExitPortal = 3.55;
      this.gLoad = 1.0;
      this.specificEnergy = 0.0;
      this.localGravityLabel = "−Y (9.81 m/s²)";
      this.gravityWalk = false;
      this.playerGrounded = false;
      this.prevYaw = 0.0;

      this._initSpherePool();
    }

    _initSpherePool() {
      this.spheres.length = 0;
      for (let i = 0; i < MAX_SPHERES; i++) {
        const isAuto = i < AUTO_SPHERE_COUNT;
        this.spheres.push({
          id: i,
          active: isAuto,
          autonomous: isAuto,
          worldIndex: 0,
          pos: new Float32Array(3),
          vel: new Float32Array(3),
          omega: new Float32Array(3),
          quat: new Float32Array([0, 0, 0, 1]),
          radius: isAuto ? 0.32 : 0.28,
          mass: isAuto ? 86.0 : 58.0, // ~620 kg/m^3 -> buoyant in Hokusai seawater!
          age: 0.0,
          inWater: false,
          soundCooldown: 0.0,
          rippleCooldown: 0.0
        });
      }

      // Seed the 3 Autonomous Cross-Portal Continuum Spheres so hands-off Autopilot
      // viewers immediately see real Newtonian spheres rolling/arcing across portals,
      // riding Hokusai's Gerstner waves, and rippling the Scriptorium mirror sea!
      const s0 = this.spheres[0];
      s0.worldIndex = 0;
      s0.pos.set([-0.85, 2.35, 6.5]);
      s0.vel.set([0.22, 1.4, -4.85]);
      s0.omega.set([-12.0, 2.5, 1.2]);

      const s1 = this.spheres[1];
      s1.worldIndex = 2;
      s1.pos.set([0.95, 1.85, 8.0]);
      s1.vel.set([-0.18, 0.8, -4.35]);
      s1.omega.set([-10.5, -1.8, 2.0]);

      const s2 = this.spheres[2];
      s2.worldIndex = 5;
      s2.pos.set([-0.95, 2.65, 9.5]);
      s2.vel.set([0.28, 1.1, -4.65]);
      s2.omega.set([-11.2, 3.1, -1.5]);
    }

    // Evaluate effective bureaucracy [0..1] for a 3D point based on current regime
    evalPointBureaucracy(x, regimeMode, bureaucracyCurrent, splitX) {
      if (regimeMode === 0) return bureaucracyCurrent;
      if (regimeMode === 1) return bureaucracyCurrent;
      // In Split A/B mode, map world x roughly around splitX
      const normX = 0.5 + x / 14.0;
      return normX >= splitX ? 1.0 : 0.0;
    }

    recordMirrorRipple(x, z, simTime, impactSpeed) {
      const base = this.rippleCursor * 4;
      this.rippleData[base + 0] = x;
      this.rippleData[base + 1] = z;
      this.rippleData[base + 2] = simTime;
      this.rippleData[base + 3] = MathGL.clamp(impactSpeed * 0.048, 0.05, 0.36);
      this.rippleCursor = (this.rippleCursor + 1) % MAX_RIPPLES;
      this.totalMirrorRipples++;
    }

    // Launch an interactive rigid-body physics sphere along rayDir!
    launchSphere(worldIndex, originPos, rayDir, camVel, speed = 12.2) {
      const slot = this.nextUserSlot;
      this.nextUserSlot = AUTO_SPHERE_COUNT + ((this.nextUserSlot - AUTO_SPHERE_COUNT + 1) % (MAX_SPHERES - AUTO_SPHERE_COUNT));

      const s = this.spheres[slot];
      s.active = true;
      s.autonomous = false;
      s.worldIndex = worldIndex;
      s.radius = 0.28;
      s.mass = 58.0;
      s.age = 0.0;
      s.inWater = false;
      s.soundCooldown = 0.0;
      s.rippleCooldown = 0.0;

      s.pos[0] = originPos[0] + rayDir[0] * 0.85;
      s.pos[1] = originPos[1] + rayDir[1] * 0.85;
      s.pos[2] = originPos[2] + rayDir[2] * 0.85;

      // Inherit reference-frame camera velocity + launch impulse (Galilean invariance!)
      s.vel[0] = camVel[0] * 0.35 + rayDir[0] * speed;
      s.vel[1] = camVel[1] * 0.35 + rayDir[1] * speed + 1.15;
      s.vel[2] = camVel[2] * 0.35 + rayDir[2] * speed;

      // Topspin perpendicular to launch ray
      s.omega[0] = -rayDir[2] * 14.0;
      s.omega[1] = 3.5;
      s.omega[2] = rayDir[0] * 14.0;
      s.quat.set([0, 0, 0, 1]);

      if (PE.Audio && PE.Audio.playSphereLaunch) {
        PE.Audio.playSphereLaunch();
      }
      return s;
    }

    // Cross-Portal Continuum State Transfer conserving position offset, R_AB v, and R_AB ω
    _checkSpherePortalTransfer(s) {
      const inApertureX = Math.abs(s.pos[0]) < (3.10 - s.radius * 0.35);
      const inApertureY = s.pos[1] > 0.04 && s.pos[1] < (6.58 - s.radius * 0.35);
      if (!inApertureX || !inApertureY) return;

      if (s.pos[2] <= -PORTAL_HALF) {
        s.worldIndex = (s.worldIndex + 1) % 6;
        s.pos[2] += PORTAL_SPAN;
        applyMat3Vec3(s.vel, PORTAL_R_FORWARD, s.vel);
        applyMat3Vec3(s.omega, PORTAL_R_FORWARD, s.omega);
        s.inWater = false;
        this.portalCrossingsByBodies++;
      } else if (s.pos[2] >= PORTAL_HALF) {
        s.worldIndex = (s.worldIndex + 5) % 6;
        s.pos[2] -= PORTAL_SPAN;
        applyMat3Vec3(s.vel, PORTAL_R_BACKWARD, s.vel);
        applyMat3Vec3(s.omega, PORTAL_R_BACKWARD, s.omega);
        s.inWater = false;
        this.portalCrossingsByBodies++;
      }
    }

    // Analytical 3D Sphere Contact Impulse + Coulomb Tangential Friction & Spin Coupling
    // For solid sphere (I = 2/5 m r^2), effective tangential impulse factor = 1 / (1 + 1/(2/5)) = 2/7!
    _resolvePlaneContact(s, nx, ny, nz, penetration, restitution, friction, matKind, activeWorld, simTime) {
      if (penetration <= 0.0) return 0.0;

      // Positional depenetration
      s.pos[0] += nx * penetration;
      s.pos[1] += ny * penetration;
      s.pos[2] += nz * penetration;

      const vn = s.vel[0] * nx + s.vel[1] * ny + s.vel[2] * nz;
      if (vn >= 0.0) return 0.0;

      const impactSpeed = -vn;
      const effRest = impactSpeed < 0.45 ? 0.0 : restitution;
      const jnOverM = -(1.0 + effRest) * vn;

      s.vel[0] += jnOverM * nx;
      s.vel[1] += jnOverM * ny;
      s.vel[2] += jnOverM * nz;

      // Contact point relative to sphere center: r_c = -radius * n
      // Slip velocity at contact patch: v_c = (v - v_n n) + ω × (-r n)
      const rcx = -s.radius * nx;
      const rcy = -s.radius * ny;
      const rcz = -s.radius * nz;

      const wxrX = s.omega[1] * rcz - s.omega[2] * rcy;
      const wxrY = s.omega[2] * rcx - s.omega[0] * rcz;
      const wxrZ = s.omega[0] * rcy - s.omega[1] * rcx;

      const vtx = (s.vel[0] - (s.vel[0] * nx + s.vel[1] * ny + s.vel[2] * nz) * nx) + wxrX;
      const vty = (s.vel[1] - (s.vel[0] * nx + s.vel[1] * ny + s.vel[2] * nz) * ny) + wxrY;
      const vtz = (s.vel[2] - (s.vel[0] * nx + s.vel[1] * ny + s.vel[2] * nz) * nz) + wxrZ;
      const vtMag = Math.hypot(vtx, vty, vtz);

      if (vtMag > 1e-4) {
        const tx = vtx / vtMag, ty = vty / vtMag, tz = vtz / vtMag;
        // No-slip impulse / m = -(2/7) * vtMag, capped by Coulomb cone μ * jnOverM
        const jtOverM = -Math.min((2.0 / 7.0) * vtMag, friction * jnOverM);
        s.vel[0] += jtOverM * tx;
        s.vel[1] += jtOverM * ty;
        s.vel[2] += jtOverM * tz;

        // Δω = (r_c × J_t) / I = (5 / (2 r^2)) * (r_c × (jtOverM * t))
        const invI_m = 2.5 / (s.radius * s.radius);
        const jtx = jtOverM * tx, jty = jtOverM * ty, jtz = jtOverM * tz;
        s.omega[0] += invI_m * (rcy * jtz - rcz * jty);
        s.omega[1] += invI_m * (rcz * jtx - rcx * jtz);
        s.omega[2] += invI_m * (rcx * jty - rcy * jtx);
      }

      // World 5 Obsidian Mirror Sea impact -> trigger radial gravity-capillary wave!
      if (matKind === "mirror" && impactSpeed > 0.35 && s.rippleCooldown <= 0.0) {
        this.recordMirrorRipple(s.pos[0], s.pos[2], simTime, impactSpeed);
        s.rippleCooldown = 0.14;
      }

      // Spatial collision impact foley if in active or adjacent visible world
      const isAudibleWorld =
        s.worldIndex === activeWorld ||
        (s.worldIndex === (activeWorld + 1) % 6 && s.pos[2] > 10.0);
      if (isAudibleWorld && impactSpeed > 0.85 && s.soundCooldown <= 0.0 && PE.Audio && PE.Audio.playCollisionImpact) {
        PE.Audio.playCollisionImpact(impactSpeed, matKind);
        s.soundCooldown = 0.09;
      }

      return impactSpeed;
    }

    _stepRigidBodySphere(s, subDt, simTime, animPhase, activeWorld, regimeMode, bureaucracyCurrent, splitX) {
      if (!s.active) return;

      s.age += subDt;
      if (s.soundCooldown > 0) s.soundCooldown -= subDt;
      if (s.rippleCooldown > 0) s.rippleCooldown -= subDt;

      // Recycle old user spheres after 26s
      if (!s.autonomous && s.age > 26.0) {
        s.active = false;
        return;
      }

      const wIdx = s.worldIndex;
      const effB = this.evalPointBureaucracy(s.pos[0], regimeMode, bureaucracyCurrent, splitX);

      // §199.4 Committee Physics Regulation:
      // Constitutional: crisp Newtonian restitution e = 0.76, low air drag
      // 204-Section Bureaucracy: e = 0.05 ("No Unauthorized Bouncing"), 8x viscous red-tape drag, 1.4 m/s OSHA speed cap!
      const restitution = MathGL.lerp(0.76, 0.05, effB);
      const friction = MathGL.lerp(0.32, 0.85, effB);

      // 1. Local Gravity Field g(x)
      evalWorldGravity(wIdx, s.pos[0], s.pos[1], s.pos[2], this._gVec);
      let ax = this._gVec[0];
      let ay = this._gVec[1];
      let az = this._gVec[2];

      // 2. Quadratic Aerodynamic Drag: F_d = -0.5 * ρ_air * C_d * A * |v| * v (plus 8x red-tape viscous drag in §199.4)
      // Sovereign auditor projectiles get a 0.38s ballistic flight window so they can strike §142.7 billboards at full impulse before red-tape arrest!
      const launchGrace = s.autonomous ? 1.0 : MathGL.smoothstep(0.36, 0.75, s.age);
      const area = Math.PI * s.radius * s.radius;
      const speed = Math.hypot(s.vel[0], s.vel[1], s.vel[2]);
      const quadDragOverM = (0.5 * RHO_AIR * 0.47 * area * speed) / s.mass;
      const redTapeViscous = effB * 6.8 * launchGrace;
      ax -= (quadDragOverM + redTapeViscous) * s.vel[0];
      ay -= (quadDragOverM + redTapeViscous) * s.vel[1];
      az -= (quadDragOverM + redTapeViscous) * s.vel[2];

      // 3. Domain-Specific Continuum Forces per World
      if (wIdx === 2) {
        // World 2 (Hokusai): Archimedes Submerged-Cap Buoyancy + Gerstner Orbital Drag!
        const waveScale = MathGL.lerp(1.0, 0.12, effB);
        const sea = evalGerstnerSea(s.pos[0], s.pos[2], animPhase, waveScale, this._seaSample);
        const subDepth = MathGL.clamp(sea.height - (s.pos[1] - s.radius), 0.0, 2.0 * s.radius);
        if (subDepth > 0.0) {
          if (!s.inWater && s.vel[1] < -1.1 && s.soundCooldown <= 0.0) {
            if (s.worldIndex === activeWorld && PE.Audio && PE.Audio.playCollisionImpact) {
              PE.Audio.playCollisionImpact(-s.vel[1], "water");
              s.soundCooldown = 0.18;
            }
          }
          s.inWater = true;
          // Exact spherical cap volume: V_sub(d) = (π d^2 / 3) * (3r - d)
          const vSub = (Math.PI * subDepth * subDepth * (3.0 * s.radius - subDepth)) / 3.0;
          const buoyMag = (RHO_WATER * G_STD * vSub) / s.mass;
          // Buoyancy acts upward + gentle wave-slope normal surge
          ax += buoyMag * sea.nx * 0.32;
          ay += buoyMag;
          az += buoyMag * sea.nz * 0.32;

          // Hydrodynamic relative velocity drag against Gerstner orbital velocity u_w
          const rvx = s.vel[0] - sea.ux;
          const rvy = s.vel[1] - sea.uy;
          const rvz = s.vel[2] - sea.uz;
          const rSpeed = Math.hypot(rvx, rvy, rvz);
          const subFrac = subDepth / (2.0 * s.radius);
          const waterDrag = (0.5 * RHO_WATER * 0.55 * area * subFrac * rSpeed) / s.mass + 2.4 * subFrac;
          ax -= waterDrag * rvx;
          ay -= waterDrag * rvy;
          az -= waterDrag * rvz;
        } else {
          s.inWater = false;
        }
      } else if (wIdx === 3) {
        // World 3 (Lascaux): Boussinesq Thermal Buoyancy Plume Updrafts over the 4 Tallow Hearths!
        for (let i = 0; i < 4; i++) {
          const th = LASCAUX_TORCHES[i];
          const dx = s.pos[0] - th[0];
          const dz = s.pos[2] - th[2];
          const r2 = dx * dx + dz * dz;
          if (r2 < 2.25 && s.pos[1] > th[1] && s.pos[1] < 7.4) {
            const hRel = s.pos[1] - th[1];
            // Boussinesq convective acceleration a = g * β * ΔT(r, y)
            const updraft = 13.5 * Math.exp(-r2 * 1.4 - hRel * 0.18) * (1.0 - effB * 0.85);
            ay += updraft;
          }
        }
      }

      // Autonomous Cross-Portal Continuum Sphere gentle corridor sustain:
      // Keeps autonomous spheres rolling/arcing through portal apertures indefinitely!
      if (s.autonomous) {
        const desiredVz = effB > 0.5 ? -1.32 : -4.65;
        if (s.vel[2] > desiredVz * 0.72) {
          az += (desiredVz - s.vel[2]) * 2.2;
        }
        // Gentle lateral centering near portal apertures so they thread |x| < 2.6m cleanly
        if (Math.abs(s.pos[0]) > 2.05) {
          ax -= (s.pos[0] - Math.sign(s.pos[0]) * 1.65) * 3.8;
        }
        // Respawn safety if an autonomous sphere ever falls into Armilla's sky abyss
        if (s.pos[1] < -7.5 || s.pos[1] > 11.5) {
          s.pos.set([(s.id - 1) * 0.9, 2.5, 13.5]);
          s.vel.set([0.15, 1.2, desiredVz]);
        }
      }

      // 4. Semi-Implicit Euler / Velocity-Verlet Step + §199.4 OSHA 1.4 m/s Speed Governor
      s.vel[0] += ax * subDt;
      s.vel[1] += ay * subDt;
      s.vel[2] += az * subDt;

      if (effB > 0.5 && launchGrace > 0.25) {
        const vMag = Math.hypot(s.vel[0], s.vel[1], s.vel[2]);
        const oshaCap = MathGL.lerp(18.0, 1.40, effB * launchGrace);
        if (vMag > oshaCap) {
          const sc = oshaCap / vMag;
          s.vel[0] *= sc;
          s.vel[1] *= sc;
          s.vel[2] *= sc;
        }
        s.omega[0] *= 1.0 - 5.5 * subDt * effB;
        s.omega[1] *= 1.0 - 5.5 * subDt * effB;
        s.omega[2] *= 1.0 - 5.5 * subDt * effB;
      }

      s.pos[0] += s.vel[0] * subDt;
      s.pos[1] += s.vel[1] * subDt;
      s.pos[2] += s.vel[2] * subDt;

      // Angular spin damping & quaternion orientation update
      const spinDecay = Math.max(0.0, 1.0 - 0.18 * subDt);
      s.omega[0] *= spinDecay;
      s.omega[1] *= spinDecay;
      s.omega[2] *= spinDecay;
      integrateQuatWorldOmega(s.quat, s.omega, subDt);

      // 5. Analytical World Boundary, Stair, Basin, Cavern, Mirror-Sea & Billboard Collisions
      this._collideSphereWithWorld(s, restitution, friction, effB, activeWorld, simTime);

      // 6. Cross-Portal Continuum Transfer at z = ±18.0m
      this._checkSpherePortalTransfer(s);
    }

    _collideSphereWithWorld(s, restitution, friction, effB, activeWorld, simTime) {
      const wIdx = s.worldIndex;
      const r = s.radius;

      // A. Portal Stone Archway Piers & Lintels at z = ±18.0m
      // Aperture is |x| <= 3.10, 0.0 <= y <= 6.60. Outside aperture, stone piers block!
      for (const zPortal of [-PORTAL_HALF, PORTAL_HALF]) {
        const dz = s.pos[2] - zPortal;
        if (Math.abs(dz) < 0.56 + r) {
          const outsideAperture = Math.abs(s.pos[0]) > (3.10 - r * 0.7) || s.pos[1] > (6.60 - r * 0.7);
          if (outsideAperture && Math.abs(s.pos[0]) < 4.55 && s.pos[1] < 8.1) {
            const signZ = dz >= 0 ? 1.0 : -1.0;
            const pen = 0.56 + r - Math.abs(dz);
            this._resolvePlaneContact(s, 0, 0, signZ, pen, restitution, friction, "stone", activeWorld, simTime);
          }
        }
      }

      // B. §142.7 Articulated 2x4 Plywood Committee Billboard at (1.85, 2.50, 6.20)
      // Active whenever Bureaucracy or Split A/B covers the billboard!
      if (effB > 0.35) {
        const bb = this.billboards[wIdx];
        const relY = s.pos[1] - bb.pivotY;
        const relX = s.pos[0] - bb.pivotX;
        if (s.pos[0] > -0.42 - r && s.pos[0] < 4.12 + r && s.pos[1] > 0.20 && s.pos[1] < 4.78 + r) {
          // Plane of tilted billboard around sole-plate (1.85, 0, 6.20):
          const boardZ = bb.pivotZ + relY * Math.sin(bb.tiltX) - relX * Math.sin(bb.yawY);
          const dz = s.pos[2] - boardZ;
          const halfThick = 0.09 + r;
          if (Math.abs(dz) < halfThick) {
            const nSign = dz >= 0 ? 1.0 : -1.0;
            const nx = -Math.sin(bb.yawY) * nSign;
            const ny = -Math.sin(bb.tiltX) * nSign;
            const nz = Math.cos(bb.tiltX) * Math.cos(bb.yawY) * nSign;
            const nLen = Math.hypot(nx, ny, nz) || 1.0;
            const pen = halfThick - Math.abs(dz);
            const preVz = s.vel[2];
            const impact = this._resolvePlaneContact(
              s, nx / nLen, ny / nLen, nz / nLen, pen,
              0.42, 0.55, "plywood", activeWorld, simTime
            );
            if (impact > 0.05) {
              // Transfer off-axis angular impulse J = m * Δv_z to the 2x4 pine struts!
              const impulseZ = s.mass * (s.vel[2] - preVz);
              const boardJ = -impulseZ;
              const boardInertia = 115.0; // Effective hinge inertia of 18mm CDX flat on 2x4 fir struts
              bb.tiltVelX = MathGL.clamp(bb.tiltVelX + (boardJ * Math.max(0.4, relY)) / boardInertia, -4.2, 4.2);
              bb.yawVelY = MathGL.clamp(bb.yawVelY - (boardJ * relX * 1.45) / boardInertia, -3.5, 3.5);
              bb.lastHitTime = simTime;
              this.billboardHits++;
              // After striking the compliance billboard, §199.4 immediately arrests rebound!
              s.age = Math.max(s.age, 0.85);
            }
          }
        }
      }

      // C. World-Specific Architectural Surfaces
      if (wIdx === 0) {
        // World 0 (Escher): Lower promenade (y=0), Inverted ceiling promenade (y=9.35),
        // Left & Right wall stairwell planes (x = ±6.1), and lateral stair ramps!
        if (Math.abs(s.pos[0]) < 4.15 && s.pos[1] < r) {
          this._resolvePlaneContact(s, 0, 1, 0, r - s.pos[1], restitution, friction, "stone", activeWorld, simTime);
        }
        if (Math.abs(s.pos[0]) < 4.15 && s.pos[1] > 9.35 - r) {
          this._resolvePlaneContact(s, 0, -1, 0, s.pos[1] - (9.35 - r), restitution, friction, "stone", activeWorld, simTime);
        }
        // Left & Right wall gravity surfaces
        if (s.pos[0] < -6.1 + r) {
          this._resolvePlaneContact(s, 1, 0, 0, (-6.1 + r) - s.pos[0], restitution, friction, "stone", activeWorld, simTime);
        }
        if (s.pos[0] > 6.1 - r) {
          this._resolvePlaneContact(s, -1, 0, 0, s.pos[0] - (6.1 - r), restitution, friction, "stone", activeWorld, simTime);
        }
        // Ascending lateral stair flights at x ≈ -5.2 (z in [4.3, 12.0]) and x ≈ +5.2 (z in [-3.7, 4.0])
        if (Math.abs(s.pos[0] + 5.2) < 0.95 && s.pos[2] <= 12.0 && s.pos[2] >= 4.3) {
          const stairY = ((12.0 - s.pos[2]) / 7.7) * 4.48;
          if (s.pos[1] < stairY + r && s.pos[1] > stairY - 0.8) {
            this._resolvePlaneContact(s, 0, 0.86, 0.50, stairY + r - s.pos[1], restitution, friction, "stone", activeWorld, simTime);
          }
        }
        if (Math.abs(s.pos[0] - 5.2) < 0.95 && s.pos[2] <= 4.0 && s.pos[2] >= -3.7) {
          const stairY = ((4.0 - s.pos[2]) / 7.7) * 4.48;
          if (s.pos[1] < stairY + r && s.pos[1] > stairY - 0.8) {
            this._resolvePlaneContact(s, 0, 0.86, 0.50, stairY + r - s.pos[1], restitution, friction, "stone", activeWorld, simTime);
          }
        }
      } else if (wIdx === 1) {
        // World 1 (Armilla): Filigree brass grate walkway (|x| <= 2.95, y = 0) + Suspended Porcelain Basins!
        if (Math.abs(s.pos[0]) <= 2.95 && s.pos[1] < r && s.pos[1] > -0.9) {
          this._resolvePlaneContact(s, 0, 1, 0, r - s.pos[1], restitution * 0.92, friction, "brass", activeWorld, simTime);
        }
        for (let i = 0; i < ARMILLA_JETS.length; i++) {
          const jet = ARMILLA_JETS[i];
          if (Math.abs(s.pos[0] - jet.bx) < 0.90 + r && Math.abs(s.pos[2] - jet.bz) < 0.54 + r) {
            if (s.pos[1] < jet.ySurf + r && s.pos[1] > jet.by - 0.35) {
              const hit = this._resolvePlaneContact(s, 0, 1, 0, jet.ySurf + r - s.pos[1], restitution * 0.55, friction, "water", activeWorld, simTime);
              if (hit > 0.4) {
                this.armillaSplashRings[i].age = 0.01;
                this.armillaSplashRings[i].strength = Math.min(2.2, 0.8 + hit * 0.25);
              }
            }
          }
        }
      } else if (wIdx === 2) {
        // World 2 (Hokusai): Sea-wall outer corridor bounds
        if (Math.abs(s.pos[0]) > 9.8 - r) {
          const sgn = s.pos[0] > 0 ? -1 : 1;
          this._resolvePlaneContact(s, sgn, 0, 0, Math.abs(s.pos[0]) - (9.8 - r), restitution, friction, "water", activeWorld, simTime);
        }
      } else if (wIdx === 3) {
        // World 3 (Lascaux): Stone cavern floor (y = 0) + Elliptical Limestone Cavern Arch ((x/6.4)^2 + (y/7.4)^2 <= 1)!
        if (s.pos[1] < r) {
          this._resolvePlaneContact(s, 0, 1, 0, r - s.pos[1], restitution * 0.82, friction * 1.2, "stone", activeWorld, simTime);
        }
        if (s.pos[1] > 0.2) {
          const rx = 6.35 - r;
          const ry = 7.35 - r;
          const q = (s.pos[0] * s.pos[0]) / (rx * rx) + (s.pos[1] * s.pos[1]) / (ry * ry);
          if (q > 1.0) {
            // Inward normal of ellipse: -∇(x^2/rx^2 + y^2/ry^2)
            let nx = -s.pos[0] / (rx * rx);
            let ny = -s.pos[1] / (ry * ry);
            const nLen = Math.hypot(nx, ny) || 1.0;
            nx /= nLen; ny /= nLen;
            const scaleBack = 1.0 / Math.sqrt(q);
            const pen = Math.hypot(s.pos[0] * (1.0 - scaleBack), s.pos[1] * (1.0 - scaleBack));
            this._resolvePlaneContact(s, nx, ny, 0, pen + 0.005, restitution * 0.84, friction, "stone", activeWorld, simTime);
          }
        }
      } else if (wIdx === 4) {
        // World 4 (Origami): Accordion-pleated vellum bridge (|x| <= 3.55, Sawtooth pleat y(z) in [-0.18, +0.06])
        if (Math.abs(s.pos[0]) <= 3.55) {
          const zMod = ((s.pos[2] % 1.2) + 1.2) % 1.2;
          const tri = zMod < 0.6 ? zMod / 0.6 : (1.2 - zMod) / 0.6;
          const pleatY = -0.18 + 0.24 * tri;
          if (s.pos[1] < pleatY + r && s.pos[1] > -1.0) {
            const slopeZ = zMod < 0.6 ? -0.37 : 0.37;
            const nLen = Math.hypot(1.0, slopeZ);
            this._resolvePlaneContact(s, 0, 1.0 / nLen, slopeZ / nLen, pleatY + r - s.pos[1], restitution * 0.85, friction, "brass", activeWorld, simTime);
          }
        }
        if (Math.abs(s.pos[0]) > 6.6 - r) {
          const sgn = s.pos[0] > 0 ? -1 : 1;
          this._resolvePlaneContact(s, sgn, 0, 0, Math.abs(s.pos[0]) - (6.6 - r), restitution, friction, "brass", activeWorld, simTime);
        }
      } else if (wIdx === 5) {
        // World 5 (Scriptorium): Crystal spine (|x| <= 2.8, y = 0.08) + Obsidian Mirror Sea (y = 0.0 -> spawns capillary waves!)
        const onSpine = Math.abs(s.pos[0]) <= 2.8;
        const floorY = onSpine ? 0.08 : 0.0;
        if (s.pos[1] < floorY + r) {
          this._resolvePlaneContact(
            s, 0, 1, 0, floorY + r - s.pos[1],
            restitution * 0.90, friction * 0.6, "mirror", activeWorld, simTime
          );
        }
        if (Math.abs(s.pos[0]) > 9.5 - r) {
          const sgn = s.pos[0] > 0 ? -1 : 1;
          this._resolvePlaneContact(s, sgn, 0, 0, Math.abs(s.pos[0]) - (9.5 - r), restitution, friction, "mirror", activeWorld, simTime);
        }
      }
    }

    // ------------------------------------------------------------------------
    // RK4 Solvers for Domain Worlds (World 0 Euler Polyhedra, World 2 Skiffs, World 4 Pendulum)
    // ------------------------------------------------------------------------
    _stepEulerPrecessionRK4(dt, effB) {
      // Torque-free Euler equations:
      //   dω1/dt = ((I2 - I3)/I1) * ω2 * ω3
      //   dω2/dt = ((I3 - I1)/I2) * ω3 * ω1
      //   dω3/dt = ((I1 - I2)/I3) * ω1 * ω2
      const throttle = 1.0 - 0.90 * effB;
      const effDt = dt * throttle;
      if (effDt <= 1e-6) return;

      for (let i = 0; i < this.eulerBodies.length; i++) {
        const b = this.eulerBodies[i];
        const [I1, I2, I3] = b.inertia;
        const c1 = (I2 - I3) / I1;
        const c2 = (I3 - I1) / I2;
        const c3 = (I1 - I2) / I3;

        const w1 = b.omegaBody[0], w2 = b.omegaBody[1], w3 = b.omegaBody[2];

        const k1_1 = c1 * w2 * w3;
        const k1_2 = c2 * w3 * w1;
        const k1_3 = c3 * w1 * w2;

        const a1 = w1 + 0.5 * effDt * k1_1;
        const a2 = w2 + 0.5 * effDt * k1_2;
        const a3 = w3 + 0.5 * effDt * k1_3;
        const k2_1 = c1 * a2 * a3;
        const k2_2 = c2 * a3 * a1;
        const k2_3 = c3 * a1 * a2;

        const m1 = w1 + 0.5 * effDt * k2_1;
        const m2 = w2 + 0.5 * effDt * k2_2;
        const m3 = w3 + 0.5 * effDt * k2_3;
        const k3_1 = c1 * m2 * m3;
        const k3_2 = c2 * m3 * m1;
        const k3_3 = c3 * m1 * m2;

        const e1 = w1 + effDt * k3_1;
        const e2 = w2 + effDt * k3_2;
        const e3 = w3 + effDt * k3_3;
        const k4_1 = c1 * e2 * e3;
        const k4_2 = c2 * e3 * e1;
        const k4_3 = c3 * e1 * e2;

        b.omegaBody[0] = w1 + (effDt / 6.0) * (k1_1 + 2 * k2_1 + 2 * k3_1 + k4_1);
        b.omegaBody[1] = w2 + (effDt / 6.0) * (k1_2 + 2 * k2_2 + 2 * k3_2 + k4_2);
        b.omegaBody[2] = w3 + (effDt / 6.0) * (k1_3 + 2 * k2_3 + 2 * k3_3 + k4_3);

        integrateQuatBodyOmega(b.quat, b.omegaBody, effDt);
      }
    }

    _stepArmillaStreams(dt, effB) {
      const flowRate = 1.0 - 0.88 * effB;
      this.jetStreamPhase += dt * flowRate;
      for (let i = 0; i < this.armillaSplashRings.length; i++) {
        const ring = this.armillaSplashRings[i];
        ring.age += dt * flowRate;
        if (ring.age >= ring.period) {
          ring.age -= ring.period;
          ring.strength = 1.0;
        }
      }
    }

    _stepHokusaiSkiffs(dt, animPhase, effB) {
      const waveScale = MathGL.lerp(1.0, 0.12, effB);
      for (let i = 0; i < this.cedarSkiffs.length; i++) {
        const sk = this.cedarSkiffs[i];
        const sea = evalGerstnerSea(sk.pos[0], sk.pos[2], animPhase, waveScale, this._seaSample);

        // Draft depth below Gerstner free surface (hull keel at y - 0.24)
        const keelY = sk.pos[1] - 0.24;
        const draft = MathGL.clamp(sea.height - keelY, 0.0, 0.65);
        const subVol = sk.maxDispVol * MathGL.clamp(draft / 0.52, 0.0, 1.25);

        // Archimedes Buoyant Force F_b = ρ_w * g * V_sub - m * g + hydrodynamic heave damping
        const fBuoyY = RHO_WATER * G_STD * subVol;
        const relVy = sk.vel[1] - sea.uy;
        const ay = (fBuoyY / sk.mass) - G_STD - 4.2 * relVy;

        // Horizontal orbital surge + gentle mooring spring around anchorX, anchorZ
        const ax = 2.6 * (sea.ux - sk.vel[0]) - 1.35 * (sk.pos[0] - sk.anchorX);
        const az = 2.6 * (sea.uz - sk.vel[2]) - 1.35 * (sk.pos[2] - sk.anchorZ);

        sk.vel[0] += ax * dt;
        sk.vel[1] += ay * dt;
        sk.vel[2] += az * dt;

        sk.pos[0] += sk.vel[0] * dt;
        sk.pos[1] += sk.vel[1] * dt;
        sk.pos[2] += sk.vel[2] * dt;

        // Hydrostatic metacentric pitch & roll torque aligning hull normal to Gerstner wave normal!
        const targetPitch = Math.atan2(sea.nz, sea.ny) * 0.88;
        const targetRoll = -Math.atan2(sea.nx, sea.ny) * 0.88;
        const kMeta = 18.0;
        const cRot = 4.6;
        sk.pitchVel += (kMeta * (targetPitch - sk.pitch) - cRot * sk.pitchVel) * dt;
        sk.rollVel += (kMeta * (targetRoll - sk.roll) - cRot * sk.rollVel) * dt;
        sk.pitch += sk.pitchVel * dt;
        sk.roll += sk.rollVel * dt;

        quatFromPitchRollYaw(sk.quat, sk.pitch, sk.roll, sk.yaw);
      }
    }

    _stepOrigamiPendulumRK4(dt, effB, activeWorld) {
      // Nonlinear Anchor-Escapement Pendulum ODE:
      //   d²θ/dt² + (b/I) dθ/dt + (g/L) sin(θ) = τ_escapement(θ, ω) / I
      const p = this.pendulum;
      const gOverL = G_STD / p.length; // 9.81 / 2.35 = 4.1745 s^-2
      const damping = 0.085 + effB * 2.85; // §199.4 red-tape viscous drag bogs down horology!
      const impulseAmp = 0.56 * (1.0 - 0.90 * effB);

      const accel = (th, om) => {
        // Deadbeat/anchor pallet impulse window |θ| in [0.04, 0.14] when moving away from center
        let escTorque = 0.0;
        const absTh = Math.abs(th);
        if (absTh > 0.035 && absTh < 0.145 && th * om > 0.0) {
          escTorque = impulseAmp * Math.sign(om);
        }
        return -gOverL * Math.sin(th) - damping * om + escTorque;
      };

      const th0 = p.theta;
      const om0 = p.omega;

      const k1_th = om0;
      const k1_om = accel(th0, om0);

      const k2_th = om0 + 0.5 * dt * k1_om;
      const k2_om = accel(th0 + 0.5 * dt * k1_th, om0 + 0.5 * dt * k1_om);

      const k3_th = om0 + 0.5 * dt * k2_om;
      const k3_om = accel(th0 + 0.5 * dt * k2_th, om0 + 0.5 * dt * k2_om);

      const k4_th = om0 + dt * k3_om;
      const k4_om = accel(th0 + dt * k3_th, om0 + dt * k3_om);

      p.theta = th0 + (dt / 6.0) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
      p.omega = om0 + (dt / 6.0) * (k1_om + 2 * k2_om + 2 * k3_om + k4_om);

      // Anchor pallet release detection: each half-swing past ±0.065 rad advances 18-tooth escape wheel by π/18 rad!
      if (p.theta > 0.065 && p.omega > 0 && p.lastReleaseSign <= 0) {
        p.lastReleaseSign = 1;
        p.targetEscAngle += Math.PI / 18.0;
        if (activeWorld === 4 && PE.Audio && PE.Audio.playEscapementTick) {
          PE.Audio.playEscapementTick(1);
        }
      } else if (p.theta < -0.065 && p.omega < 0 && p.lastReleaseSign >= 0) {
        p.lastReleaseSign = -1;
        p.targetEscAngle += Math.PI / 18.0;
        if (activeWorld === 4 && PE.Audio && PE.Audio.playEscapementTick) {
          PE.Audio.playEscapementTick(-1);
        }
      }

      // Crisp mechanical pallet recoil/advance into target tooth lock
      p.escapementAngle = MathGL.damp(p.escapementAngle, p.targetEscAngle, 15.5, dt);

      // Rotate pendulum VAO around Z by theta
      const half = p.theta * 0.5;
      p.quat[0] = 0;
      p.quat[1] = 0;
      p.quat[2] = Math.sin(half);
      p.quat[3] = Math.cos(half);
    }

    _stepHingedBillboards(dt) {
      const kStrut = 42.0; // 2x4 pine strut + sandbag restoring stiffness
      const cStrut = 3.8;  // structural wood damping
      for (let w = 0; w < 6; w++) {
        const bb = this.billboards[w];
        const aTilt = -kStrut * bb.tiltX - cStrut * bb.tiltVelX;
        const aYaw = -kStrut * 1.15 * bb.yawY - cStrut * bb.yawVelY;
        bb.tiltVelX += aTilt * dt;
        bb.yawVelY += aYaw * dt;
        bb.tiltX = MathGL.clamp(bb.tiltX + bb.tiltVelX * dt, -0.46, 0.36);
        bb.yawY = MathGL.clamp(bb.yawY + bb.yawVelY * dt, -0.38, 0.38);
      }
    }

    // ------------------------------------------------------------------------
    // Master Physics Step (Called once per animation frame)
    // ------------------------------------------------------------------------
    step(dt, simTime, animPhase, activeWorld, regimeMode, bureaucracyCurrent, splitX, paused) {
      if (paused) return;

      const subSteps = 4;
      const subDt = dt / subSteps;
      const globalEffB = regimeMode === 1 ? bureaucracyCurrent : 0.0;

      for (let stepIdx = 0; stepIdx < subSteps; stepIdx++) {
        const tSub = simTime - dt + (stepIdx + 1) * subDt;
        for (let i = 0; i < this.spheres.length; i++) {
          this._stepRigidBodySphere(
            this.spheres[i],
            subDt,
            tSub,
            animPhase,
            activeWorld,
            regimeMode,
            bureaucracyCurrent,
            splitX
          );
        }
        this._stepOrigamiPendulumRK4(subDt, globalEffB, activeWorld);
      }

      this._stepEulerPrecessionRK4(dt, globalEffB);
      this._stepArmillaStreams(dt, globalEffB);
      this._stepHokusaiSkiffs(dt, animPhase, globalEffB);
      this._stepHingedBillboards(dt);
    }

    // ------------------------------------------------------------------------
    // Camera / Player Continuum Flight & Newtonian Free-Roam Controller
    // ------------------------------------------------------------------------
    updatePlayerMotion(dt, state, camRight, checkThresholdFn) {
      const prevX = state.camPos[0];
      const prevY = state.camPos[1];
      const prevZ = state.camPos[2];
      const preWorld = state.worldIndex;

      this.prevCamVel[0] = this.camVel[0];
      this.prevCamVel[1] = this.camVel[1];
      this.prevCamVel[2] = this.camVel[2];

      const effB = state.regimeMode === 1 ? state.bureaucracyCurrent : 0.0;
      // §199.4 OSHA 1.40 m/s Speed Governor in 204-Section Bureaucracy Mode!
      const oshaSpeedCap = MathGL.lerp(24.0, 1.40, effB);

      this.localGravityLabel = evalWorldGravity(
        state.worldIndex,
        state.camPos[0],
        state.camPos[1],
        state.camPos[2],
        this._gVec
      );

      if (state.navMode === "autopilot") {
        if (!state.paused) {
          const desiredSpeed = Math.min(3.65 * state.autopilotSpeed, oshaSpeedCap);
          state.camPos[2] -= desiredSpeed * dt;
          checkThresholdFn();

          const u = (PORTAL_HALF - state.camPos[2]) / PORTAL_SPAN;
          const portalEnvelope = Math.sin(Math.PI * MathGL.clamp(u, 0, 1));
          const envelopeSq = portalEnvelope * portalEnvelope;

          const targetX = -1.55 * Math.sin(u * Math.PI * 1.65) * envelopeSq;
          const targetY = 2.55 + 0.55 * Math.sin(u * Math.PI * 2.0) * envelopeSq;

          state.camPos[0] = MathGL.damp(state.camPos[0], targetX, 5.0, dt);
          state.camPos[1] = MathGL.damp(state.camPos[1], targetY, 5.0, dt);

          const lookYaw = 0.14 * Math.cos(u * Math.PI * 1.65) * envelopeSq;
          const lookPitch = -0.03 * Math.sin(u * Math.PI * 2.0) * envelopeSq;

          state.camYaw = MathGL.damp(state.camYaw, lookYaw, 4.5, dt);
          state.camPitch = MathGL.damp(state.camPitch, lookPitch, 4.5, dt);
        }
      } else if (state.navMode === "freeroam") {
        const turnSpeed = 1.65 * dt;
        if (state.keys["ArrowLeft"]) state.camYaw -= turnSpeed;
        if (state.keys["ArrowRight"]) state.camYaw += turnSpeed;
        if (state.keys["ArrowUp"]) state.camPitch = MathGL.clamp(state.camPitch + turnSpeed * 0.7, -1.35, 1.35);
        if (state.keys["ArrowDown"]) state.camPitch = MathGL.clamp(state.camPitch - turnSpeed * 0.7, -1.35, 1.35);

        const flatFwdX = Math.sin(state.camYaw);
        const flatFwdZ = -Math.cos(state.camYaw);
        const thrustMag = state.keys["ShiftLeft"] ? 26.0 : 16.5;

        let fx = 0, fy = 0, fz = 0;
        if (state.keys["KeyW"]) { fx += flatFwdX * thrustMag; fz += flatFwdZ * thrustMag; }
        if (state.keys["KeyS"]) { fx -= flatFwdX * thrustMag; fz -= flatFwdZ * thrustMag; }
        if (state.keys["KeyD"]) { fx += camRight[0] * thrustMag; fz += camRight[2] * thrustMag; }
        if (state.keys["KeyA"]) { fx -= camRight[0] * thrustMag; fz -= camRight[2] * thrustMag; }

        if (this.gravityWalk) {
          // Gravity Walk Mode: Apply local world gravity tensor g(x) + Jump Impulse along -g_hat!
          fx += this._gVec[0];
          fy += this._gVec[1];
          fz += this._gVec[2];

          if (state.keys["Space"] && this.playerGrounded) {
            const gMag = Math.hypot(this._gVec[0], this._gVec[1], this._gVec[2]) || G_STD;
            this.camVel[0] -= (this._gVec[0] / gMag) * 5.4;
            this.camVel[1] -= (this._gVec[1] / gMag) * 5.4;
            this.camVel[2] -= (this._gVec[2] / gMag) * 5.4;
            this.playerGrounded = false;
          }
        } else {
          // Zero-G Newtonian Thruster Mode
          if (state.keys["KeyE"] || state.keys["Space"]) fy += thrustMag * 0.85;
          if (state.keys["KeyQ"] || state.keys["KeyC"]) fy -= thrustMag * 0.85;
        }

        // Viscous + Quadratic Drag (8x red-tape viscous damping in §199.4 Bureaucracy!)
        const drag = (this.gravityWalk ? 3.2 : 3.8) + effB * 14.0;
        this.camVel[0] += (fx - drag * this.camVel[0]) * dt;
        this.camVel[1] += (fy - drag * this.camVel[1]) * dt;
        this.camVel[2] += (fz - drag * this.camVel[2]) * dt;

        const vMag = Math.hypot(this.camVel[0], this.camVel[1], this.camVel[2]);
        if (vMag > oshaSpeedCap) {
          const sc = oshaSpeedCap / vMag;
          this.camVel[0] *= sc;
          this.camVel[1] *= sc;
          this.camVel[2] *= sc;
        }

        state.camPos[0] += this.camVel[0] * dt;
        state.camPos[1] += this.camVel[1] * dt;
        state.camPos[2] += this.camVel[2] * dt;

        // Player eye-height & architectural support collision
        this.playerGrounded = false;
        const eyeHeight = 1.72;
        let floorSurface = 0.0;
        if (state.worldIndex === 2) {
          const waveScale = MathGL.lerp(1.0, 0.12, effB);
          floorSurface = evalGerstnerSea(state.camPos[0], state.camPos[2], state.animPhase, waveScale, this._seaSample).height;
        } else if (state.worldIndex === 0) {
          if (Math.abs(state.camPos[0] + 5.2) < 1.0 && state.camPos[2] <= 12.0 && state.camPos[2] >= 4.3) {
            floorSurface = ((12.0 - state.camPos[2]) / 7.7) * 4.48;
          } else if (Math.abs(state.camPos[0] - 5.2) < 1.0 && state.camPos[2] <= 4.0 && state.camPos[2] >= -3.7) {
            floorSurface = ((4.0 - state.camPos[2]) / 7.7) * 4.48;
          }
        }

        if (this.gravityWalk && this._gVec[1] > 4.0) {
          // Walking upside-down on Escher's inverted ceiling promenade!
          const ceilEye = 9.35 - eyeHeight;
          if (state.camPos[1] >= ceilEye) {
            state.camPos[1] = ceilEye;
            if (this.camVel[1] > 0) this.camVel[1] = 0;
            this.playerGrounded = true;
          }
        } else if (this.gravityWalk && Math.abs(this._gVec[0]) > 4.0) {
          // Walking sideways on Escher's relativistic wall stairwells!
          if (this._gVec[0] < 0 && state.camPos[0] <= -6.1 + eyeHeight) {
            state.camPos[0] = -6.1 + eyeHeight;
            if (this.camVel[0] < 0) this.camVel[0] = 0;
            this.playerGrounded = true;
          } else if (this._gVec[0] > 0 && state.camPos[0] >= 6.1 - eyeHeight) {
            state.camPos[0] = 6.1 - eyeHeight;
            if (this.camVel[0] > 0) this.camVel[0] = 0;
            this.playerGrounded = true;
          }
        } else {
          const minY = this.gravityWalk ? floorSurface + eyeHeight : Math.max(0.55, floorSurface + 0.55);
          if (state.camPos[1] <= minY) {
            state.camPos[1] = minY;
            if (this.camVel[1] < 0) this.camVel[1] = 0;
            this.playerGrounded = true;
          }
        }

        // Portal pier collision when outside |x| <= 2.9m
        for (const zP of [-PORTAL_HALF, PORTAL_HALF]) {
          if (Math.abs(state.camPos[2] - zP) < 0.72 && (Math.abs(state.camPos[0]) > 2.92 || state.camPos[1] > 6.35)) {
            state.camPos[2] = zP + Math.sign(state.camPos[2] - zP || 1) * 0.72;
            this.camVel[2] = 0;
          }
        }

        state.camPos[0] = MathGL.clamp(state.camPos[0], -9.2, 9.2);
        state.camPos[1] = MathGL.clamp(state.camPos[1], 0.55, 8.85);
        state.camPos[2] = MathGL.clamp(state.camPos[2], -21.5, 21.5);

        checkThresholdFn();
      } else if (state.navMode === "roaming_judge") {
        if (!state.paused) state.roamAngle += dt * 0.62;
        const pivotX = 1.25;
        const pivotZ = 5.4;
        const targetX = pivotX + Math.sin(state.roamAngle) * 5.2;
        const targetZ = pivotZ + Math.cos(state.roamAngle) * 5.8;
        const targetY = 2.85 + Math.sin(state.roamAngle * 2.0) * 1.05;

        state.camPos[0] = MathGL.damp(state.camPos[0], targetX, 4.5, dt);
        state.camPos[1] = MathGL.damp(state.camPos[1], targetY, 4.5, dt);
        state.camPos[2] = MathGL.damp(state.camPos[2], targetZ, 4.5, dt);

        const dx = 1.55 - state.camPos[0];
        const dy = 2.40 - state.camPos[1];
        const dz = 5.80 - state.camPos[2];
        const desiredYaw = Math.atan2(dx, -dz);
        const desiredPitch = Math.atan2(dy, Math.hypot(dx, dz));

        let diffYaw = desiredYaw - state.camYaw;
        while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
        while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
        state.camYaw += diffYaw * (1 - Math.exp(-5.5 * dt));
        state.camPitch = MathGL.damp(state.camPitch, desiredPitch, 5.5, dt);
      } else if (state.navMode === "static_judge") {
        state.camPos[0] = MathGL.damp(state.camPos[0], 1.85, 6.5, dt);
        state.camPos[1] = MathGL.damp(state.camPos[1], 2.50, 6.5, dt);
        state.camPos[2] = MathGL.damp(state.camPos[2], 10.15, 6.5, dt);

        let diffYaw = 0.0 - state.camYaw;
        while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
        while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
        state.camYaw += diffYaw * (1 - Math.exp(-6.5 * dt));
        state.camPitch = MathGL.damp(state.camPitch, 0.0, 6.5, dt);
      }

      // Compute exact continuous physical camera velocity (unwrapping ±36m portal jumps!)
      if (state.navMode !== "freeroam") {
        let dz = state.camPos[2] - prevZ;
        if (state.worldIndex !== preWorld) {
          if (dz > 18.0) dz -= PORTAL_SPAN;
          else if (dz < -18.0) dz += PORTAL_SPAN;
        }
        const invDt = 1.0 / Math.max(1e-4, dt);
        this.camVel[0] = MathGL.damp(this.camVel[0], (state.camPos[0] - prevX) * invDt, 14.0, dt);
        this.camVel[1] = MathGL.damp(this.camVel[1], (state.camPos[1] - prevY) * invDt, 14.0, dt);
        this.camVel[2] = MathGL.damp(this.camVel[2], dz * invDt, 14.0, dt);
      }

      this.camSpeed = Math.hypot(this.camVel[0], this.camVel[1], this.camVel[2]);

      // Coordinated Banked-Turn Flight Dynamics: φ = -arctan(v_horiz * ω_yaw / g)
      let dYaw = state.camYaw - this.prevYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      this.prevYaw = state.camYaw;
      const yawRate = MathGL.clamp(dYaw / Math.max(1e-4, dt), -2.5, 2.5);
      const vHoriz = Math.hypot(this.camVel[0], this.camVel[2]);

      if (state.navMode === "autopilot" || state.navMode === "roaming_judge") {
        const coordBank = -Math.atan((vHoriz * yawRate) / G_STD);
        state.camRoll = MathGL.damp(state.camRoll, MathGL.clamp(coordBank * 2.2, -0.28, 0.28), 5.0, dt);
      } else {
        state.camRoll = MathGL.damp(state.camRoll, 0.0, 8.0, dt);
      }

      // Proper Accelerometer G-Load: |a_cam - g| / 9.81
      const axCam = (this.camVel[0] - this.prevCamVel[0]) / Math.max(1e-4, dt);
      const ayCam = (this.camVel[1] - this.prevCamVel[1]) / Math.max(1e-4, dt);
      const azCam = (this.camVel[2] - this.prevCamVel[2]) / Math.max(1e-4, dt);
      const feltG = Math.hypot(axCam - this._gVec[0], ayCam - this._gVec[1], azCam - this._gVec[2]) / G_STD;
      this.gLoad = MathGL.damp(this.gLoad, MathGL.clamp(feltG, 0.1, 3.8), 6.0, dt);

      // Specific Mechanical Energy E/m = 0.5 |v|^2 + g * y (J/kg)
      this.specificEnergy = 0.5 * this.camSpeed * this.camSpeed + G_STD * Math.max(0, state.camPos[1]);

      // Radial approach velocity toward Exit Portal (0, 2.5, -18.0) for acoustic Doppler shift!
      const rx = 0.0 - state.camPos[0];
      const ry = 2.5 - state.camPos[1];
      const rz = -PORTAL_HALF - state.camPos[2];
      const rDist = Math.hypot(rx, ry, rz) || 1.0;
      this.radialVelToExitPortal =
        (this.camVel[0] * rx + this.camVel[1] * ry + this.camVel[2] * rz) / rDist;
    }

    // ------------------------------------------------------------------------
    // Gather Renderable Rigid-Body Spheres for World `worldIdx`
    // Includes boundary-straddling clones across z = ±18.0m so spheres slice
    // seamlessly across 2-bounce FBO portal planes with zero pop!
    // ------------------------------------------------------------------------
    gatherSpheresForWorld(worldIdx) {
      let count = 0;
      const prevW = (worldIdx + 5) % 6;
      const nextW = (worldIdx + 1) % 6;

      for (let i = 0; i < this.spheres.length; i++) {
        const s = this.spheres[i];
        if (!s.active) continue;

        let matchOffsetZ = null;
        if (s.worldIndex === worldIdx) {
          matchOffsetZ = 0.0;
        } else if (s.worldIndex === prevW && s.pos[2] < -PORTAL_HALF + s.radius + 1.2) {
          matchOffsetZ = PORTAL_SPAN;
        } else if (s.worldIndex === nextW && s.pos[2] > PORTAL_HALF - s.radius - 1.2) {
          matchOffsetZ = -PORTAL_SPAN;
        }

        if (matchOffsetZ !== null && count < this._renderSpherePool.length) {
          const item = this._renderSpherePool[count++];
          item.pos[0] = s.pos[0];
          item.pos[1] = s.pos[1];
          item.pos[2] = s.pos[2] + matchOffsetZ;
          item.quat.set(s.quat);
          item.radius = s.radius;
          item.useColorOverride = s.autonomous ? 0.0 : 0.35;
          item.color[0] = 0.38;
          item.color[1] = 0.92;
          item.color[2] = 0.98;
        }
      }
      return { list: this._renderSpherePool, count };
    }

    getActiveSphereCount() {
      let n = 0;
      for (let i = 0; i < this.spheres.length; i++) {
        if (this.spheres[i].active) n++;
      }
      return n;
    }
  }

  PE.Physics = {
    ContinuumPhysicsEngine,
    ARMILLA_JETS,
    evalGerstnerSea,
    evalWorldGravity
  };
})();
