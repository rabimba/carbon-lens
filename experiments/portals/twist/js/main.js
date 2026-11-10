// ============================================================================
// main.js — Real-Time WebGL2 Recursive FBO Portal Engine, Continuum Physics
// Orchestrator, Governance Regime Switcher (480w Constitution vs. 204-Section
// Bureaucracy vs. Draggable Split A/B Fork), & Novelty Quarantine Inspector
// ============================================================================
(function () {
  "use strict";
  const PE = (window.PortalEngine = window.PortalEngine || {});
  const { MathGL, GLUtils } = PE;

  const PORTAL_SPAN = 36.0;
  const PORTAL_HALF = 18.0;
  const G_STD = 9.81;
  const FOV_DEG = 62.0;
  const FOV_RAD = (FOV_DEG * Math.PI) / 180.0;
  const TAN_HALF_FOV = Math.tan(FOV_RAD * 0.5);

  const REGIME = {
    CONSTITUTIONAL: 0,
    BUREAUCRACY: 1,
    SPLIT: 2
  };

  const NAV = {
    AUTOPILOT: "autopilot",
    FREEROAM: "freeroam",
    ROAMING_JUDGE: "roaming_judge",
    STATIC_JUDGE: "static_judge"
  };

  const state = {
    worldIndex: 0,
    portalsTraversed: 0,
    regimeMode: REGIME.CONSTITUTIONAL,
    bureaucracyCurrent: 0.0,
    bureaucracyTarget: 0.0,
    splitX: 0.50,
    draggingSplit: false,

    navMode: NAV.AUTOPILOT,
    autopilotSpeed: 1.0,
    paused: false,
    hudHidden: false,
    activeDrawerTab: null,

    // Camera state
    camPos: new Float32Array([0.0, 2.55, 15.2]),
    camYaw: 0.0,
    camPitch: 0.0,
    camRoll: 0.0,
    roamAngle: 0.0,

    // Time & Animation accumulators
    time: 0.0,
    animPhase: 0.0,
    tropeTimer: 0.0,
    tropeBlocksCount: 4118,

    // FPS & HUD telemetry throttle
    fps: 60,
    fpsFrames: 0,
    fpsAccum: 0,
    hudPhysAccum: 0,

    // Input state
    keys: Object.create(null),
    pointerDown: false,
    downX: 0,
    downY: 0,
    downTime: 0,
    movedDist: 0,
    lastMouseX: 0,
    lastMouseY: 0
  };

  let gl = null;
  let canvas = null;
  let ledger = null;
  let physics = null;
  let programs = null;

  let worldVAOs = [];
  let billboardVAOs = [];
  let sphereVAO = null;
  let eulerPolyVAO = null;
  let cedarSkiffVAO = null;
  let pendulumVAO = null;
  let splashRingVAO = null;
  let exitPortalVAO = null;
  let entryPortalVAO = null;
  let cycloneVAO = null;
  let particleVAO = null;
  let emptyVAO = null;

  let textures = null;
  let fboNext = null;
  let fboDeep = null;
  let fboPrev = null;

  // Pre-allocated matrices & scratch vectors (zero GC per frame)
  const projMat = MathGL.createMat4();
  const viewMat = MathGL.createMat4();
  const identityMat = MathGL.createMat4();
  const modelMat = MathGL.createMat4();
  const identityQuat = new Float32Array([0, 0, 0, 1]);
  const scratchPos = new Float32Array(3);
  const launchDir = new Float32Array(3);
  const camRight = new Float32Array(3);
  const camUp = new Float32Array(3);
  const camFwd = new Float32Array(3);
  const virtualPos = new Float32Array(3);

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------
  async function boot() {
    ledger = await PE.loadGovernanceLedger();
    state.tropeBlocksCount = ledger.novelty_ledger.quarantined_tropes[0].blocked_spawns;
    physics = new PE.Physics.ContinuumPhysicsEngine();

    canvas = document.getElementById("portal-canvas");
    gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      depth: true,
      stencil: false,
      powerPreference: "high-performance"
    });

    if (!gl) {
      document.getElementById("webgl-fallback").hidden = false;
      return;
    }

    initShadersAndResources();
    handleResize();
    window.addEventListener("resize", handleResize);

    initInputHandlers();
    initHUD();
    applyURLParams();
    updateWorldHUD(true);

    let prevNow = performance.now();
    function frame(now) {
      const rawDt = (now - prevNow) * 0.001;
      prevNow = now;
      const dt = Math.min(0.05, Math.max(0.0005, rawDt));

      updateSimulation(dt);
      renderMultiverse();
      updateLiveTelemetry(dt);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initShadersAndResources() {
    const S = PE.Shaders;

    const skyProg = GLUtils.createProgram(gl, S.SKY_VS, S.SKY_FS, "SkyProgram");
    const worldProg = GLUtils.createProgram(gl, S.WORLD_VS, S.WORLD_FS, "WorldProgram");
    const portalProg = GLUtils.createProgram(gl, S.PORTAL_VS, S.PORTAL_FS, "PortalProgram");
    const particleProg = GLUtils.createProgram(gl, S.PARTICLE_VS, S.PARTICLE_FS, "ParticleProgram");

    const worldUniforms = GLUtils.cacheUniforms(gl, worldProg, [
      "uProj", "uView", "uModel", "uAnimPhase", "uEscapementAngle",
      "uWaveAmpScale", "uTropeAlpha", "uCamPos",
      "uWorldIndex", "uTime", "uBureaucracy", "uRegimeMode", "uSplitX",
      "uResolution", "uClipDir", "uClipZ",
      "uColorOverride", "uUseColorOverride",
      "uTexFacadeFront", "uTexPlywoodBack", "uTexStamp"
    ]);
    worldUniforms.uRipples =
      gl.getUniformLocation(worldProg, "uRipples[0]") ||
      gl.getUniformLocation(worldProg, "uRipples");

    programs = {
      sky: {
        prog: skyProg,
        u: GLUtils.cacheUniforms(gl, skyProg, [
          "uCamRight", "uCamUp", "uCamFwd", "uAspect", "uTanHalfFov",
          "uWorldIndex", "uTime", "uBureaucracy", "uRegimeMode", "uSplitX", "uResolution"
        ])
      },
      world: {
        prog: worldProg,
        u: worldUniforms
      },
      portal: {
        prog: portalProg,
        u: GLUtils.cacheUniforms(gl, portalProg, [
          "uProj", "uView", "uPortalTex", "uResolution", "uTime", "uRimColor",
          "uBureaucracy", "uRegimeMode", "uSplitX", "uClipDir", "uClipZ"
        ])
      },
      particle: {
        prog: particleProg,
        u: GLUtils.cacheUniforms(gl, particleProg, [
          "uProj", "uView", "uAnimPhase", "uWorldIndex", "uResolution",
          "uBureaucracy", "uRegimeMode", "uSplitX", "uClipDir", "uClipZ"
        ])
      }
    };

    emptyVAO = gl.createVertexArray();
    worldVAOs = PE.Geometry.buildAllWorlds(gl);
    billboardVAOs = PE.Geometry.buildHingedBillboards(gl);
    sphereVAO = PE.Geometry.buildPhysicsSphereVAO(gl);
    eulerPolyVAO = PE.Geometry.buildEulerPolyhedronVAO(gl);
    cedarSkiffVAO = PE.Geometry.buildCedarSkiffVAO(gl);
    pendulumVAO = PE.Geometry.buildPendulumVAO(gl);
    splashRingVAO = PE.Geometry.buildSplashRingVAO(gl);
    exitPortalVAO = PE.Geometry.buildPortalVolumeVAO(gl, true);
    entryPortalVAO = PE.Geometry.buildPortalVolumeVAO(gl, false);
    cycloneVAO = PE.Geometry.buildQuarantinedCycloneVAO(gl);
    particleVAO = PE.Geometry.buildParticleCloudVAO(gl, 420);
    textures = GLUtils.createProceduralTextures(gl);

    const initW = Math.max(64, window.innerWidth);
    const initH = Math.max(64, window.innerHeight);
    fboNext = GLUtils.createPortalFBO(gl, initW, initH);
    fboDeep = GLUtils.createPortalFBO(gl, initW * 0.5, initH * 0.5);
    fboPrev = GLUtils.createPortalFBO(gl, initW, initH);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
  }

  function handleResize() {
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const w = Math.max(64, Math.floor(window.innerWidth * dpr));
    const h = Math.max(64, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    GLUtils.resizePortalFBO(gl, fboNext, w, h);
    GLUtils.resizePortalFBO(gl, fboDeep, Math.floor(w * 0.5), Math.floor(h * 0.5));
    GLUtils.resizePortalFBO(gl, fboPrev, w, h);
  }

  // --------------------------------------------------------------------------
  // Cross-Portal Threshold & Continuum Physics Simulation Step
  // --------------------------------------------------------------------------
  function checkPortalThresholdCrossing() {
    const inArchwayX = Math.abs(state.camPos[0]) < 3.15;
    const inArchwayY = state.camPos[1] > 0.05 && state.camPos[1] < 6.65;
    if (!inArchwayX || !inArchwayY) return;

    // Note: Camera velocity physics.camVel is conserved across R_AB = I_3!
    if (state.camPos[2] <= -PORTAL_HALF) {
      state.worldIndex = (state.worldIndex + 1) % 6;
      state.camPos[2] += PORTAL_SPAN;
      state.portalsTraversed++;
      PE.Audio.playPortalCrossing();
      updateWorldHUD(true);
    } else if (state.camPos[2] >= PORTAL_HALF) {
      state.worldIndex = (state.worldIndex + 5) % 6;
      state.camPos[2] -= PORTAL_SPAN;
      state.portalsTraversed++;
      PE.Audio.playPortalCrossing();
      updateWorldHUD(true);
    }
  }

  function updateSimulation(dt) {
    state.bureaucracyCurrent = MathGL.damp(
      state.bureaucracyCurrent,
      state.bureaucracyTarget,
      7.5,
      dt
    );

    if (!state.paused) {
      state.time += dt;
      // §199.4 Angular Velocity & Wave Dampening when in Full Bureaucracy mode
      const motionThrottle =
        state.regimeMode === REGIME.BUREAUCRACY
          ? 1.0 - 0.88 * state.bureaucracyCurrent
          : 1.0;
      state.animPhase += dt * motionThrottle;
    }

    if (state.tropeTimer > 0) {
      state.tropeTimer = Math.max(0, state.tropeTimer - dt);
      const banner = document.getElementById("quarantine-toast");
      if (state.tropeTimer <= 0 && banner) {
        banner.classList.remove("visible");
      }
    }

    // Refresh horizontal basis for WASD thrusters & step continuum player + world physics
    MathGL.computeCameraBasis(state.camYaw, state.camPitch, 0.0, camRight, camUp, camFwd);
    physics.updatePlayerMotion(dt, state, camRight, checkPortalThresholdCrossing);

    physics.step(
      dt,
      state.time,
      state.animPhase,
      state.worldIndex,
      state.regimeMode,
      state.bureaucracyCurrent,
      state.splitX,
      state.paused
    );

    PE.Audio.update(
      dt,
      state.worldIndex,
      state.bureaucracyCurrent,
      state.regimeMode,
      state.camPos[2],
      physics.radialVelToExitPortal
    );
  }

  // --------------------------------------------------------------------------
  // Multi-Pass Recursive FBO Portal & Dynamic Rigid-Body Rendering Pipeline
  // --------------------------------------------------------------------------
  function drawDynamicDomainBodies(wp, worldIdx) {
    const effB = state.regimeMode === REGIME.BUREAUCRACY ? state.bureaucracyCurrent : 0.0;

    if (worldIdx === 0) {
      // World 0 (Escher): 3 Triaxial Polyhedra under RK4 Torque-Free Euler Precession!
      gl.bindVertexArray(eulerPolyVAO.vao);
      gl.uniform1f(wp.u.uUseColorOverride, 0.0);
      for (let i = 0; i < physics.eulerBodies.length; i++) {
        const b = physics.eulerBodies[i];
        MathGL.fromPosQuatScale(modelMat, b.pos, b.quat, b.scale);
        gl.uniformMatrix4fv(wp.u.uModel, false, modelMat);
        gl.drawElements(gl.TRIANGLES, eulerPolyVAO.indexCount, gl.UNSIGNED_INT, 0);
      }
    } else if (worldIdx === 1) {
      // World 1 (Armilla): Torricelli Parabolic Water Streams (x = x0 + v0*t + 0.5*g*t^2) + Splash Rings!
      const jets = PE.Physics.ARMILLA_JETS;
      const effluxScale = 1.0 - 0.52 * effB;

      gl.bindVertexArray(sphereVAO.vao);
      gl.uniform1f(wp.u.uUseColorOverride, 0.85);
      gl.uniform3f(wp.u.uColorOverride, 0.58, 0.92, 1.0);

      for (let j = 0; j < jets.length; j++) {
        const jet = jets[j];
        const v0 = jet.vEfflux * effluxScale;
        for (let k = 0; k < 6; k++) {
          const frac = ((k / 6.0) + (physics.jetStreamPhase / jet.tHit) + jet.phaseOffset) % 1.0;
          const tau = frac * jet.tHit;
          scratchPos[0] = jet.x0 + jet.signX * v0 * tau;
          scratchPos[1] = jet.y0 - 0.5 * G_STD * tau * tau;
          scratchPos[2] = jet.z0;
          MathGL.fromPosQuatScale(modelMat, scratchPos, identityQuat, 0.075, 0.058, 0.058);
          gl.uniformMatrix4fv(wp.u.uModel, false, modelMat);
          gl.drawElements(gl.TRIANGLES, sphereVAO.indexCount, gl.UNSIGNED_INT, 0);
        }
      }

      // Momentum-conserving expanding splash rings inside porcelain basins
      gl.bindVertexArray(splashRingVAO.vao);
      gl.uniform1f(wp.u.uUseColorOverride, 0.0);
      for (let i = 0; i < physics.armillaSplashRings.length; i++) {
        const ring = physics.armillaSplashRings[i];
        const prog = MathGL.clamp(ring.age / ring.period, 0.0, 1.0);
        const rad = (0.07 + 0.42 * prog) * ring.strength;
        const sy = Math.max(0.15, (1.0 - prog) * 1.1);
        scratchPos[0] = ring.x;
        scratchPos[1] = ring.y;
        scratchPos[2] = ring.z;
        MathGL.fromPosQuatScale(modelMat, scratchPos, identityQuat, rad, sy, rad);
        gl.uniformMatrix4fv(wp.u.uModel, false, modelMat);
        gl.drawElements(gl.TRIANGLES, splashRingVAO.indexCount, gl.UNSIGNED_INT, 0);
      }
    } else if (worldIdx === 2) {
      // World 2 (Hokusai): Archimedes Submerged-Volume Buoyant Edo Cedar Skiffs!
      gl.bindVertexArray(cedarSkiffVAO.vao);
      gl.uniform1f(wp.u.uUseColorOverride, 0.0);
      for (let i = 0; i < physics.cedarSkiffs.length; i++) {
        const sk = physics.cedarSkiffs[i];
        MathGL.fromPosQuatScale(modelMat, sk.pos, sk.quat, 1.0);
        gl.uniformMatrix4fv(wp.u.uModel, false, modelMat);
        gl.drawElements(gl.TRIANGLES, cedarSkiffVAO.indexCount, gl.UNSIGNED_INT, 0);
      }
    } else if (worldIdx === 4) {
      // World 4 (Origami): RK4 Nonlinear Anchor-Escapement Pendulum driving Gear Train!
      const p = physics.pendulum;
      gl.bindVertexArray(pendulumVAO.vao);
      gl.uniform1f(wp.u.uUseColorOverride, 0.0);
      MathGL.fromPosQuatScale(modelMat, p.pivot, p.quat, 1.0);
      gl.uniformMatrix4fv(wp.u.uModel, false, modelMat);
      gl.drawElements(gl.TRIANGLES, pendulumVAO.indexCount, gl.UNSIGNED_INT, 0);
    }

    // Cross-Portal Rigid-Body Spheres (Autonomous + User-Launched + FBO Boundary Clones!)
    const { list, count } = physics.gatherSpheresForWorld(worldIdx);
    if (count > 0) {
      gl.bindVertexArray(sphereVAO.vao);
      for (let i = 0; i < count; i++) {
        const spItem = list[i];
        MathGL.fromPosQuatScale(modelMat, spItem.pos, spItem.quat, spItem.radius);
        gl.uniformMatrix4fv(wp.u.uModel, false, modelMat);
        gl.uniform1f(wp.u.uUseColorOverride, spItem.useColorOverride);
        gl.uniform3f(wp.u.uColorOverride, spItem.color[0], spItem.color[1], spItem.color[2]);
        gl.drawElements(gl.TRIANGLES, sphereVAO.indexCount, gl.UNSIGNED_INT, 0);
      }
      gl.uniform1f(wp.u.uUseColorOverride, 0.0);
    }
  }

  function drawWorldSlice(worldIdx, eyePos, targetW, targetH, clipDir, clipZ, exitPortalTex, entryPortalTex, showTrope) {
    const aspect = targetW / Math.max(1, targetH);
    MathGL.perspective(projMat, FOV_RAD, aspect, 0.08, 120.0);
    MathGL.viewFromBasis(viewMat, eyePos, camRight, camUp, camFwd);

    gl.viewport(0, 0, targetW, targetH);
    gl.clearColor(0.05, 0.05, 0.07, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. Procedural Skybox Pass (depth mask off)
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    const sp = programs.sky;
    gl.useProgram(sp.prog);
    gl.uniform3fv(sp.u.uCamRight, camRight);
    gl.uniform3fv(sp.u.uCamUp, camUp);
    gl.uniform3fv(sp.u.uCamFwd, camFwd);
    gl.uniform1f(sp.u.uAspect, aspect);
    gl.uniform1f(sp.u.uTanHalfFov, TAN_HALF_FOV);
    gl.uniform1i(sp.u.uWorldIndex, worldIdx);
    gl.uniform1f(sp.u.uTime, state.time);
    gl.uniform1f(sp.u.uBureaucracy, state.bureaucracyCurrent);
    gl.uniform1i(sp.u.uRegimeMode, state.regimeMode);
    gl.uniform1f(sp.u.uSplitX, state.splitX);
    gl.uniform2f(sp.u.uResolution, targetW, targetH);
    gl.bindVertexArray(emptyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);

    // 2. Sovereign 3D World Architecture + Articulated §142.7 Billboard + Dynamic Physics
    const wp = programs.world;
    const waveScale =
      state.regimeMode === REGIME.BUREAUCRACY
        ? MathGL.lerp(1.0, 0.12, state.bureaucracyCurrent)
        : 1.0;

    gl.useProgram(wp.prog);
    gl.uniformMatrix4fv(wp.u.uProj, false, projMat);
    gl.uniformMatrix4fv(wp.u.uView, false, viewMat);
    gl.uniformMatrix4fv(wp.u.uModel, false, identityMat);
    gl.uniform1f(wp.u.uAnimPhase, state.animPhase);
    gl.uniform1f(wp.u.uEscapementAngle, physics.pendulum.escapementAngle);
    gl.uniform1f(wp.u.uWaveAmpScale, waveScale);
    gl.uniform1f(wp.u.uTropeAlpha, Math.min(1.0, state.tropeTimer / 0.8));
    gl.uniform3fv(wp.u.uCamPos, eyePos);
    gl.uniform1i(wp.u.uWorldIndex, worldIdx);
    gl.uniform1f(wp.u.uTime, state.time);
    gl.uniform1f(wp.u.uBureaucracy, state.bureaucracyCurrent);
    gl.uniform1i(wp.u.uRegimeMode, state.regimeMode);
    gl.uniform1f(wp.u.uSplitX, state.splitX);
    gl.uniform2f(wp.u.uResolution, targetW, targetH);
    gl.uniform1i(wp.u.uClipDir, clipDir);
    gl.uniform1f(wp.u.uClipZ, clipZ);
    gl.uniform3f(wp.u.uColorOverride, 1.0, 1.0, 1.0);
    gl.uniform1f(wp.u.uUseColorOverride, 0.0);
    if (wp.u.uRipples) {
      gl.uniform4fv(wp.u.uRipples, physics.rippleData);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.facadeFronts[worldIdx]);
    gl.uniform1i(wp.u.uTexFacadeFront, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.plywoodBack);
    gl.uniform1i(wp.u.uTexPlywoodBack, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures.complianceStamp);
    gl.uniform1i(wp.u.uTexStamp, 2);

    // 2A. Static World Architecture + Static Compliance Props
    const mesh = worldVAOs[worldIdx];
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_INT, 0);

    // 2B. Articulated §142.7 Hinged 2x4 Plywood Billboard (jolts & tilts when struck by spheres!)
    if (state.regimeMode === REGIME.SPLIT || state.bureaucracyCurrent > 0.02) {
      const bb = physics.billboards[worldIdx];
      MathGL.fromPivotHinge(modelMat, bb.pivotX, bb.pivotY, bb.pivotZ, bb.tiltX, bb.yawY);
      gl.uniformMatrix4fv(wp.u.uModel, false, modelMat);
      const bbMesh = billboardVAOs[worldIdx];
      gl.bindVertexArray(bbMesh.vao);
      gl.drawElements(gl.TRIANGLES, bbMesh.indexCount, gl.UNSIGNED_INT, 0);
      gl.uniformMatrix4fv(wp.u.uModel, false, identityMat);
    }

    // 2C. Optional Quarantined Pet-Trope Hologram (Reindeer, Manta Rays & Storks Cyclone!)
    if (showTrope && state.tropeTimer > 0.01) {
      gl.bindVertexArray(cycloneVAO.vao);
      gl.drawElements(gl.TRIANGLES, cycloneVAO.indexCount, gl.UNSIGNED_INT, 0);
    }

    // 2D. Domain Physics Bodies + Cross-Portal Rigid-Body Spheres
    drawDynamicDomainBodies(wp, worldIdx);

    // 3. Live FBO Portal Windows (Recessed anti-clip volumes)
    if (exitPortalTex || entryPortalTex) {
      const pp = programs.portal;
      gl.useProgram(pp.prog);
      gl.uniformMatrix4fv(pp.u.uProj, false, projMat);
      gl.uniformMatrix4fv(pp.u.uView, false, viewMat);
      gl.uniform2f(pp.u.uResolution, targetW, targetH);
      gl.uniform1f(pp.u.uTime, state.time);
      gl.uniform1f(pp.u.uBureaucracy, state.bureaucracyCurrent);
      gl.uniform1i(pp.u.uRegimeMode, state.regimeMode);
      gl.uniform1f(pp.u.uSplitX, state.splitX);
      gl.uniform1i(pp.u.uClipDir, clipDir);
      gl.uniform1f(pp.u.uClipZ, clipZ);

      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      if (exitPortalTex) {
        const nextPalette = ledger.novelty_ledger.worlds[(worldIdx + 1) % 6].palette[0];
        const rimRgb = MathGL.hexToRgb(nextPalette);
        gl.uniform3f(pp.u.uRimColor, rimRgb[0], rimRgb[1], rimRgb[2]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, exitPortalTex);
        gl.uniform1i(pp.u.uPortalTex, 0);
        gl.bindVertexArray(exitPortalVAO.vao);
        gl.drawElements(gl.TRIANGLES, exitPortalVAO.indexCount, gl.UNSIGNED_SHORT, 0);
      }

      if (entryPortalTex) {
        const prevPalette = ledger.novelty_ledger.worlds[(worldIdx + 5) % 6].palette[0];
        const rimRgb = MathGL.hexToRgb(prevPalette);
        gl.uniform3f(pp.u.uRimColor, rimRgb[0], rimRgb[1], rimRgb[2]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, entryPortalTex);
        gl.uniform1i(pp.u.uPortalTex, 0);
        gl.bindVertexArray(entryPortalVAO.vao);
        gl.drawElements(gl.TRIANGLES, entryPortalVAO.indexCount, gl.UNSIGNED_SHORT, 0);
      }
      gl.disable(gl.CULL_FACE);
    }

    // 4. Atmospheric & Boussinesq Plume GPU Particles
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    const ptp = programs.particle;
    gl.useProgram(ptp.prog);
    gl.uniformMatrix4fv(ptp.u.uProj, false, projMat);
    gl.uniformMatrix4fv(ptp.u.uView, false, viewMat);
    gl.uniform1f(ptp.u.uAnimPhase, state.animPhase);
    gl.uniform1i(ptp.u.uWorldIndex, worldIdx);
    gl.uniform2f(ptp.u.uResolution, targetW, targetH);
    gl.uniform1f(ptp.u.uBureaucracy, state.bureaucracyCurrent);
    gl.uniform1i(ptp.u.uRegimeMode, state.regimeMode);
    gl.uniform1f(ptp.u.uSplitX, state.splitX);
    gl.uniform1i(ptp.u.uClipDir, clipDir);
    gl.uniform1f(ptp.u.uClipZ, clipZ);
    gl.bindVertexArray(particleVAO.vao);
    gl.drawArrays(gl.POINTS, 0, particleVAO.count);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function renderMultiverse() {
    MathGL.computeCameraBasis(state.camYaw, state.camPitch, state.camRoll, camRight, camUp, camFwd);

    const currW = state.worldIndex;
    const nextW = (currW + 1) % 6;
    const deepW = (currW + 2) % 6;
    const prevW = (currW + 5) % 6;

    // Pass 1: Recursive Bounce #2 (World i+2 into half-res fboDeep)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboDeep.fbo);
    virtualPos[0] = state.camPos[0];
    virtualPos[1] = state.camPos[1];
    virtualPos[2] = state.camPos[2] + PORTAL_SPAN * 2.0;
    drawWorldSlice(deepW, virtualPos, fboDeep.width, fboDeep.height, 1, 18.02, null, null, false);

    // Pass 2: Primary Forward Portal (World i+1 into full-res fboNext, showing fboDeep inside its exit portal!)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboNext.fbo);
    virtualPos[0] = state.camPos[0];
    virtualPos[1] = state.camPos[1];
    virtualPos[2] = state.camPos[2] + PORTAL_SPAN;
    drawWorldSlice(nextW, virtualPos, fboNext.width, fboNext.height, 1, 18.02, fboDeep.colorTex, null, false);

    // Pass 3: Backward Entry Portal (World i-1 into fboPrev when camera can see +Z archway)
    let usePrevPortal = false;
    if (camFwd[2] > -0.45 || state.camPos[2] > 12.0) {
      usePrevPortal = true;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboPrev.fbo);
      virtualPos[0] = state.camPos[0];
      virtualPos[1] = state.camPos[1];
      virtualPos[2] = state.camPos[2] - PORTAL_SPAN;
      drawWorldSlice(prevW, virtualPos, fboPrev.width, fboPrev.height, -1, -18.02, null, null, false);
    }

    // Pass 4: Main Screen Render (World i with live fboNext & fboPrev portals!)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    drawWorldSlice(
      currW,
      state.camPos,
      canvas.width,
      canvas.height,
      0,
      0.0,
      fboNext.colorTex,
      usePrevPortal ? fboPrev.colorTex : null,
      true
    );
  }

  // --------------------------------------------------------------------------
  // Interactive Controls, Physics Sandbox Launchers & HUD Synchronization
  // --------------------------------------------------------------------------
  function fireSphereCenterRay() {
    MathGL.computeCameraBasis(state.camYaw, state.camPitch, state.camRoll, camRight, camUp, camFwd);
    launchDir[0] = camFwd[0];
    launchDir[1] = camFwd[1];
    launchDir[2] = camFwd[2];
    physics.launchSphere(state.worldIndex, state.camPos, launchDir, physics.camVel, 12.6);
  }

  function fireSphereScreenPoint(clientX, clientY) {
    MathGL.computeCameraBasis(state.camYaw, state.camPitch, state.camRoll, camRight, camUp, camFwd);
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const ndcX = (clientX / w) * 2.0 - 1.0;
    const ndcY = 1.0 - (clientY / h) * 2.0;
    const aspect = w / h;

    let rx = camFwd[0] + ndcX * aspect * TAN_HALF_FOV * camRight[0] + ndcY * TAN_HALF_FOV * camUp[0];
    let ry = camFwd[1] + ndcX * aspect * TAN_HALF_FOV * camRight[1] + ndcY * TAN_HALF_FOV * camUp[1];
    let rz = camFwd[2] + ndcX * aspect * TAN_HALF_FOV * camRight[2] + ndcY * TAN_HALF_FOV * camUp[2];
    const rLen = Math.hypot(rx, ry, rz) || 1.0;
    launchDir[0] = rx / rLen;
    launchDir[1] = ry / rLen;
    launchDir[2] = rz / rLen;
    physics.launchSphere(state.worldIndex, state.camPos, launchDir, physics.camVel, 12.8);
  }

  function toggleGravityWalk() {
    physics.gravityWalk = !physics.gravityWalk;
    if (physics.gravityWalk && state.navMode !== NAV.FREEROAM) {
      setNavMode(NAV.FREEROAM);
    }
    const gBtn = document.getElementById("btn-gravity");
    if (gBtn) {
      gBtn.innerHTML = physics.gravityWalk
        ? `Gravity: ON <kbd>G</kbd>`
        : `Gravity: OFF <kbd>G</kbd>`;
      gBtn.classList.toggle("active", physics.gravityWalk);
    }
  }

  function setRegime(mode) {
    state.regimeMode = mode;
    if (mode === REGIME.CONSTITUTIONAL) {
      state.bureaucracyTarget = 0.0;
    } else if (mode === REGIME.BUREAUCRACY) {
      state.bureaucracyTarget = 1.0;
      PE.Audio.playBureaucracyStamp();
    } else {
      state.bureaucracyTarget = 1.0;
      PE.Audio.playBureaucracyStamp();
    }

    document.querySelectorAll("[data-regime]").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.regime) === mode);
    });

    const splitOverlay = document.getElementById("split-overlay");
    if (splitOverlay) {
      splitOverlay.hidden = mode !== REGIME.SPLIT;
      updateSplitHandleUI();
    }

    updateWorldHUD(false);
  }

  function setNavMode(mode) {
    state.navMode = mode;
    if (mode === NAV.ROAMING_JUDGE) {
      state.roamAngle = -0.55;
    }
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nav === mode);
    });
    updateJudgeCallout();
  }

  function jumpToWorld(idx) {
    state.worldIndex = ((idx % 6) + 6) % 6;
    if (state.navMode === NAV.AUTOPILOT) {
      state.camPos[0] = 0;
      state.camPos[1] = 2.55;
      state.camPos[2] = 15.5;
    }
    PE.Audio.playPortalCrossing();
    updateWorldHUD(true);
  }

  function triggerQuarantinedTropeTest() {
    state.tropeTimer = 2.8;
    state.tropeBlocksCount += 1;
    PE.Audio.playQuarantineAlert();

    const countEl = document.getElementById("trope-block-count");
    if (countEl) countEl.textContent = state.tropeBlocksCount.toLocaleString();

    const toast = document.getElementById("quarantine-toast");
    if (toast) {
      toast.classList.add("visible");
    }
  }

  function updateSplitHandleUI() {
    const line = document.getElementById("split-divider-line");
    if (line) {
      line.style.left = `${(state.splitX * 100).toFixed(2)}%`;
    }
  }

  function updateJudgeCallout() {
    const banner = document.getElementById("judge-alert-pill");
    if (!banner || !ledger) return;
    const w = ledger.novelty_ledger.worlds[state.worldIndex];
    const isBur = state.regimeMode === REGIME.BUREAUCRACY || state.regimeMode === REGIME.SPLIT;

    if (state.navMode === NAV.STATIC_JUDGE) {
      banner.hidden = false;
      banner.className = isBur ? "judge-pill warning" : "judge-pill ok";
      banner.innerHTML = isBur
        ? `<strong>STATIC JUDGE TRIPOD #1 (§142.7):</strong> Score <b>${w.bureaucracy_static_score}%</b> — Hinged plywood billboard blocks view! Click or press <kbd>F</kbd> to jolt it with a sphere, or <kbd>R</kbd> to orbit behind it.`
        : `<strong>STATIC JUDGE TRIPOD #1:</strong> Score <b>${w.static_judge_score_constitutional}%</b> — Honest 3D depth, no billboard needed. Press <kbd>B</kbd> to test Bureaucracy exploit.`;
    } else if (state.navMode === NAV.ROAMING_JUDGE) {
      banner.hidden = false;
      banner.className = isBur ? "judge-pill danger" : "judge-pill ok";
      banner.innerHTML = isBur
        ? `<strong>ROAMING PHYSICS DRONE (Article III):</strong> Score CRASHED to <b>${w.bureaucracy_roaming_score}%</b> — Unfinished CDX plywood & 2x4 struts exposed! Click billboard to fire a sphere at its struts.`
        : `<strong>ROAMING PHYSICS DRONE (Article III):</strong> Sovereign 3D Score <b>${w.roaming_judge_score}%</b> — Full 360° volumetric parallax & domain physics verified.`;
    } else {
      banner.hidden = true;
    }
  }

  let titleCardTimeout = null;
  function updateWorldHUD(showTitleCard) {
    if (!ledger) return;
    const w = ledger.novelty_ledger.worlds[state.worldIndex];
    const nextW = ledger.novelty_ledger.worlds[(state.worldIndex + 1) % 6];
    const isBur = state.regimeMode === REGIME.BUREAUCRACY;

    document.getElementById("hud-world-index").textContent = `REALM 0${w.index + 1} / 06`;
    document.getElementById("hud-world-title").textContent = w.title;
    document.getElementById("hud-world-sub").textContent = `${w.inspiration}  •  ${w.builder_agent}`;
    document.getElementById("hud-next-portal").textContent = `Portal Ahead → ${nextW.title}`;

    const swatchRow = document.getElementById("hud-palette-swatches");
    swatchRow.innerHTML = "";
    w.palette.forEach((hex, idx) => {
      const chip = document.createElement("span");
      chip.className = "swatch-chip";
      chip.style.background = isBur ? "#8a867b" : hex;
      chip.title = `${w.palette_names[idx]} (${hex})`;
      swatchRow.appendChild(chip);
    });

    document.querySelectorAll(".world-dot").forEach((dot, idx) => {
      dot.classList.toggle("active", idx === state.worldIndex);
    });

    document.getElementById("metric-novelty").textContent = w.novelty_cosine_score.toFixed(2);

    const roamEl = document.getElementById("metric-roaming-score");
    const statEl = document.getElementById("metric-static-score");
    const ruleWordsEl = document.getElementById("metric-rule-words");
    const ctxTaxEl = document.getElementById("metric-context-tax");
    const physNote = document.getElementById("hud-physics-note");
    const clauseNote = document.getElementById("hud-violation-note");

    if (physNote && w.physics_law) {
      physNote.textContent = isBur
        ? `§199.4 OSHA Cap: v <= 1.40 m/s, 8x Red-Tape Drag, e = 0.05`
        : `Law: ${w.physics_law}`;
    }

    if (state.regimeMode === REGIME.CONSTITUTIONAL) {
      roamEl.textContent = `${w.roaming_judge_score}%`;
      roamEl.className = "metric-val good";
      statEl.textContent = `${w.static_judge_score_constitutional}%`;
      ruleWordsEl.textContent = "480 / 500 w";
      ctxTaxEl.textContent = "0.55% ctx";
      clauseNote.textContent = `Acoustic: ${w.acoustic_signature}`;
      clauseNote.className = "violation-note constitutional";
    } else if (state.regimeMode === REGIME.BUREAUCRACY) {
      roamEl.textContent = `${w.bureaucracy_roaming_score}% (FACADE!)`;
      roamEl.className = "metric-val bad";
      statEl.textContent = `${w.bureaucracy_static_score}% (GAMED)`;
      ruleWordsEl.textContent = "87,500 w (§204)";
      ctxTaxEl.textContent = "91.4% ctx (-92% output)";
      clauseNote.textContent = w.bureaucracy_violation_summary;
      clauseNote.className = "violation-note bureaucracy";
    } else {
      roamEl.textContent = `${w.roaming_judge_score}% vs ${w.bureaucracy_roaming_score}%`;
      roamEl.className = "metric-val split";
      statEl.textContent = `${w.static_judge_score_constitutional}% | ${w.bureaucracy_static_score}%`;
      ruleWordsEl.textContent = "480w ◄► 87,500w";
      ctxTaxEl.textContent = "0.55% ◄► 91.4%";
      clauseNote.textContent = `Drag vertical divider! Right side applies: ${w.bureaucracy_violation_summary}`;
      clauseNote.className = "violation-note bureaucracy";
    }

    updateJudgeCallout();

    if (showTitleCard) {
      const card = document.getElementById("world-title-card");
      document.getElementById("card-kicker").textContent = `PORTAL THRESHOLD 0${w.index + 1}  •  NOVELTY ${w.novelty_cosine_score.toFixed(2)}`;
      document.getElementById("card-title").textContent = w.title;
      document.getElementById("card-sub").textContent = w.inspiration;
      card.classList.add("show");
      clearTimeout(titleCardTimeout);
      titleCardTimeout = setTimeout(() => card.classList.remove("show"), 3100);
    }
  }

  function updateLiveTelemetry(dt) {
    state.fpsFrames++;
    state.fpsAccum += dt;
    state.hudPhysAccum += dt;

    if (state.hudPhysAccum >= 0.14 && physics) {
      state.hudPhysAccum = 0;
      const kinEl = document.getElementById("metric-kinematics");
      if (kinEl) {
        const isCapped = state.regimeMode === REGIME.BUREAUCRACY && state.bureaucracyCurrent > 0.6;
        kinEl.textContent = `${physics.camSpeed.toFixed(2)} m/s • ${physics.gLoad.toFixed(2)}G`;
        kinEl.className = isCapped ? "metric-val split" : "metric-val good";
      }
      const geEl = document.getElementById("metric-gravity-energy");
      if (geEl) {
        const shortG = physics.localGravityLabel.split(" ")[0];
        geEl.textContent = `${shortG} • ${physics.specificEnergy.toFixed(1)} J/kg`;
      }
    }

    if (state.fpsAccum >= 0.4) {
      state.fps = Math.round(state.fpsFrames / state.fpsAccum);
      state.fpsFrames = 0;
      state.fpsAccum = 0;
      const fpsEl = document.getElementById("metric-fps");
      if (fpsEl) fpsEl.textContent = `${state.fps} FPS`;
      const portalsEl = document.getElementById("metric-portals-count");
      if (portalsEl) {
        portalsEl.textContent = `${state.portalsTraversed}p / ${physics.getActiveSphereCount()}b`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Drawer Tabs (480w Constitution | Semantic Novelty Ledger | 204-Sec Rulebook)
  // --------------------------------------------------------------------------
  function openDrawerTab(tabName) {
    const drawer = document.getElementById("inspector-drawer");
    if (state.activeDrawerTab === tabName) {
      state.activeDrawerTab = null;
      drawer.hidden = true;
    } else {
      state.activeDrawerTab = tabName;
      drawer.hidden = false;
      renderDrawerContent(tabName);
    }
    document.querySelectorAll("[data-drawer]").forEach((b) => {
      b.classList.toggle("active", b.dataset.drawer === state.activeDrawerTab);
    });
  }

  function renderDrawerContent(tab) {
    const body = document.getElementById("drawer-body");
    const title = document.getElementById("drawer-title");
    if (!body || !ledger) return;

    if (tab === "constitution") {
      const c = ledger.constitution;
      title.textContent = `${c.title} (${c.word_count} / ${c.word_cap} Words)`;
      body.innerHTML = `
        <div class="drawer-banner good">
          <strong>Zero-Net-Regulation Cap:</strong> ${c.amendment_rule}
          <span>Context Used: <b>${c.context_budget_pct}%</b> • Builder Throughput: <b>${c.world_throughput_multiplier}</b></span>
        </div>
        <div class="articles-list">
          ${c.articles
            .map(
              (a) => `
            <article class="clause-card">
              <div class="clause-head"><span class="badge-pill">${a.id}</span> <h4>${a.title}</h4></div>
              <p>${a.text}</p>
            </article>`
            )
            .join("")}
        </div>
      `;
    } else if (tab === "novelty") {
      const nl = ledger.novelty_ledger;
      title.textContent = "Semantic Novelty, Physics Laws & Quarantined Tropes";
      body.innerHTML = `
        <div class="drawer-banner split">
          <div>
            <strong>Anti-Mode-Collapse Gate:</strong> Max Allowed Jaccard Overlap ≤ <b>${nl.max_allowed_jaccard}</b> • Min Cosine Novelty ≥ <b>${nl.min_required_cosine_novelty}</b>
          </div>
          <button id="drawer-spawn-trope-btn" class="action-pill danger-btn">
            [!] Test Uncoordinated Agent ("Spawn Reindeer-Manta-Stork Cyclone") [T]
          </button>
        </div>
        <h4 class="subhead">Quarantined Fable 5.2 Attractor Tropes</h4>
        <div class="trope-grid">
          ${nl.quarantined_tropes
            .map(
              (t, idx) => `
            <div class="trope-card">
              <div class="trope-top">
                <span class="status-tag">${t.status}</span>
                <span class="blocked-num">${idx === 0 ? state.tropeBlocksCount.toLocaleString() : t.blocked_spawns.toLocaleString()} blocked</span>
              </div>
              <h5>${t.label}</h5>
              <p>${t.origin_pathology}</p>
            </div>`
            )
            .join("")}
        </div>
        <h4 class="subhead">6 Sovereign Realms — Orthogonality &amp; Domain Physics Matrix</h4>
        <div class="world-ledger-list">
          ${nl.worlds
            .map(
              (w) => `
            <div class="world-ledger-row ${w.index === state.worldIndex ? "current" : ""}" data-jump-world="${w.index}">
              <div>
                <strong>0${w.index + 1}. ${w.title}</strong>
                <small>${w.physics_law || w.primitives.join(" • ")}</small>
              </div>
              <div class="ledger-metrics">
                <span>Cosine: <b>${w.novelty_cosine_score.toFixed(2)}</b></span>
                <span>Jaccard: <b>${w.max_prior_jaccard.toFixed(2)}</b></span>
              </div>
            </div>`
            )
            .join("")}
        </div>
      `;
      const btn = document.getElementById("drawer-spawn-trope-btn");
      if (btn) btn.addEventListener("click", triggerQuarantinedTropeTest);
      body.querySelectorAll("[data-jump-world]").forEach((row) => {
        row.addEventListener("click", () => {
          jumpToWorld(Number(row.dataset.jumpWorld));
          renderDrawerContent("novelty");
        });
      });
    } else if (tab === "bureaucracy") {
      const br = ledger.bureaucracy_rulebook;
      title.textContent = `${br.title}`;
      body.innerHTML = `
        <div class="drawer-banner warn">
          <strong>204 Sections • 87,500 Words:</strong> Consumes <b>${br.context_window_consumed_pct}%</b> of builder context window and crashes world output by <b>${br.world_throughput_drop_pct}%</b>.
          <div class="banner-actions">
            <button id="drawer-snap-j1" class="action-pill">Snap to Static Judge #1 [J]</button>
            <button id="drawer-orbit-r" class="action-pill">Orbit Behind Plywood Facade [R]</button>
          </div>
        </div>
        <div class="articles-list">
          ${br.excerpts
            .map(
              (ex) => `
            <article class="clause-card bureaucracy-card">
              <div class="clause-head"><span class="badge-pill warn-pill">${ex.section}</span> <h4>${ex.heading}</h4></div>
              <p>${ex.clause}</p>
            </article>`
            )
            .join("")}
        </div>
      `;
      document.getElementById("drawer-snap-j1")?.addEventListener("click", () => {
        if (state.regimeMode === REGIME.CONSTITUTIONAL) setRegime(REGIME.BUREAUCRACY);
        setNavMode(NAV.STATIC_JUDGE);
      });
      document.getElementById("drawer-orbit-r")?.addEventListener("click", () => {
        if (state.regimeMode === REGIME.CONSTITUTIONAL) setRegime(REGIME.BUREAUCRACY);
        setNavMode(NAV.ROAMING_JUDGE);
      });
    }
  }

  // --------------------------------------------------------------------------
  // DOM, URL Params & Input Wiring
  // --------------------------------------------------------------------------
  function applyURLParams() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      if (params.has("world")) {
        state.worldIndex = ((Number(params.get("world")) % 6) + 6) % 6;
      }
      if (params.has("regime")) {
        const r = Number(params.get("regime"));
        if ([0, 1, 2].includes(r)) {
          setRegime(r);
          state.bureaucracyCurrent = state.bureaucracyTarget;
        }
      }
      if (params.has("nav")) {
        const n = params.get("nav");
        if (Object.values(NAV).includes(n)) {
          setNavMode(n);
          if (n === NAV.STATIC_JUDGE) {
            state.camPos[0] = 1.85;
            state.camPos[1] = 2.50;
            state.camPos[2] = 10.15;
            state.camYaw = 0;
            state.camPitch = 0;
          } else if (n === NAV.ROAMING_JUDGE) {
            state.roamAngle = 2.35;
            state.camPos[0] = 1.25 + Math.sin(2.35) * 5.2;
            state.camPos[1] = 2.85;
            state.camPos[2] = 5.4 + Math.cos(2.35) * 5.8;
          }
        }
      }
      if (params.has("z")) {
        state.camPos[2] = parseFloat(params.get("z"));
      }
      if (params.get("launch") === "1") {
        fireSphereCenterRay();
      }
    } catch (_e) {
      // Ignore malformed query params
    }
  }

  function initHUD() {
    const worldBar = document.getElementById("world-dots-bar");
    ledger.novelty_ledger.worlds.forEach((w, idx) => {
      const btn = document.createElement("button");
      btn.className = "world-dot" + (idx === 0 ? " active" : "");
      btn.textContent = `0${idx + 1}`;
      btn.title = `${w.title} — ${w.physics_law || w.inspiration}`;
      btn.addEventListener("click", () => jumpToWorld(idx));
      worldBar.appendChild(btn);
    });

    document.querySelectorAll("[data-regime]").forEach((btn) => {
      btn.addEventListener("click", () => setRegime(Number(btn.dataset.regime)));
    });

    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => setNavMode(btn.dataset.nav));
    });

    document.querySelectorAll("[data-drawer]").forEach((btn) => {
      btn.addEventListener("click", () => openDrawerTab(btn.dataset.drawer));
    });

    document.getElementById("drawer-close")?.addEventListener("click", () => {
      state.activeDrawerTab = null;
      document.getElementById("inspector-drawer").hidden = true;
      document.querySelectorAll("[data-drawer]").forEach((b) => b.classList.remove("active"));
    });

    document.getElementById("btn-launch-sphere")?.addEventListener("click", () => {
      fireSphereCenterRay();
    });

    document.getElementById("btn-gravity")?.addEventListener("click", () => {
      toggleGravityWalk();
    });

    document.getElementById("btn-test-trope")?.addEventListener("click", triggerQuarantinedTropeTest);

    const audioBtn = document.getElementById("btn-audio");
    audioBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const on = PE.Audio.toggle();
      audioBtn.textContent = on ? "Audio: ON" : "Audio: OFF";
      audioBtn.classList.toggle("active", on);
    });

    const speedInput = document.getElementById("autopilot-speed");
    speedInput?.addEventListener("input", () => {
      state.autopilotSpeed = parseFloat(speedInput.value);
    });

    const hudBtn = document.getElementById("btn-hide-hud");
    hudBtn?.addEventListener("click", toggleHUDVisibility);

    const restoreBtn = document.getElementById("restore-hud-pill");
    restoreBtn?.addEventListener("click", toggleHUDVisibility);

    // Split-screen drag handle
    const splitLine = document.getElementById("split-divider-line");
    splitLine?.addEventListener("pointerdown", (e) => {
      state.draggingSplit = true;
      splitLine.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    window.addEventListener("pointermove", (e) => {
      if (!state.draggingSplit) return;
      state.splitX = MathGL.clamp(e.clientX / Math.max(1, window.innerWidth), 0.08, 0.92);
      updateSplitHandleUI();
    });
    window.addEventListener("pointerup", () => {
      state.draggingSplit = false;
    });
  }

  function toggleHUDVisibility() {
    state.hudHidden = !state.hudHidden;
    document.body.classList.toggle("hud-hidden", state.hudHidden);
  }

  function initInputHandlers() {
    const unlockAudioUI = () => {
      if (!PE.Audio.initialized) {
        const on = PE.Audio.toggle(true);
        const audioBtn = document.getElementById("btn-audio");
        if (audioBtn) {
          audioBtn.textContent = on ? "Audio: ON" : "Audio: OFF";
          audioBtn.classList.toggle("active", on);
        }
      }
    };

    canvas.addEventListener("pointerdown", (e) => {
      unlockAudioUI();
      if (state.draggingSplit) return;
      state.pointerDown = true;
      state.downX = e.clientX;
      state.downY = e.clientY;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      state.downTime = performance.now();
      state.movedDist = 0.0;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!state.pointerDown) return;
      const dx = e.clientX - state.lastMouseX;
      const dy = e.clientY - state.lastMouseY;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      state.movedDist += Math.hypot(dx, dy);

      if (state.movedDist > 5.0) {
        if (state.navMode !== NAV.FREEROAM) {
          setNavMode(NAV.FREEROAM);
        }
        state.camYaw += dx * 0.0042;
        state.camPitch = MathGL.clamp(state.camPitch - dy * 0.0038, -1.38, 1.38);
      }
    });

    canvas.addEventListener("pointerup", (e) => {
      if (state.pointerDown && state.movedDist < 5.0 && performance.now() - state.downTime < 400) {
        // Quick click on 3D viewport -> launch rigid-body physics sphere along exact 3D cursor ray!
        fireSphereScreenPoint(e.clientX, e.clientY);
      }
      state.pointerDown = false;
    });

    window.addEventListener("pointerup", () => {
      state.pointerDown = false;
    });

    window.addEventListener("keydown", (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      unlockAudioUI();
      state.keys[e.code] = true;

      if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code) && state.navMode !== NAV.FREEROAM) {
        setNavMode(NAV.FREEROAM);
      }

      if (e.code === "KeyF") {
        fireSphereCenterRay();
      } else if (e.code === "KeyG") {
        toggleGravityWalk();
      } else if (e.code === "KeyB") {
        const next = (state.regimeMode + 1) % 3;
        setRegime(next);
      } else if (e.code === "KeyV") {
        setRegime(state.regimeMode === REGIME.SPLIT ? REGIME.CONSTITUTIONAL : REGIME.SPLIT);
      } else if (e.code === "KeyJ") {
        if (state.regimeMode === REGIME.CONSTITUTIONAL) setRegime(REGIME.BUREAUCRACY);
        setNavMode(NAV.STATIC_JUDGE);
      } else if (e.code === "KeyR") {
        setNavMode(NAV.ROAMING_JUDGE);
      } else if (e.code === "KeyP") {
        setNavMode(NAV.AUTOPILOT);
      } else if (e.code === "KeyT") {
        triggerQuarantinedTropeTest();
      } else if (e.code === "KeyH") {
        toggleHUDVisibility();
      } else if (e.code === "KeyM") {
        const on = PE.Audio.toggle();
        const audioBtn = document.getElementById("btn-audio");
        if (audioBtn) {
          audioBtn.textContent = on ? "Audio: ON" : "Audio: OFF";
          audioBtn.classList.toggle("active", on);
        }
      } else if (e.code >= "Digit1" && e.code <= "Digit6") {
        jumpToWorld(Number(e.code.replace("Digit", "")) - 1);
      }
    });

    window.addEventListener("keyup", (e) => {
      state.keys[e.code] = false;
    });
  }

  PE.getDiagnostics = function () {
    return {
      state,
      physics,
      ledger
    };
  };

  window.addEventListener("DOMContentLoaded", boot);
})();
