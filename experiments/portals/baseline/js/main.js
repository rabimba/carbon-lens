/**
 * AETHERIA — Endless Relativistic & Newtonian Portal Odyssey (Master Director)
 * Orchestrates:
 * - 6-DOF Newtonian/Relativistic Velocity-Verlet flight with cross-portal momentum conservation
 * - Interactive & autonomous cross-portal Newtonian test spheres (Click or Space to launch)
 * - Live Acoustic Doppler pitch shifting & modal SDF collision acoustics
 * - Real-time dual-world portal rendering & physics telemetry
 */

import { WORLD_LENGTH, createWorldInstance } from './worlds.js';
import { clamp, smoothstep, normalize3 } from './math.js';
import { CraftPhysics, ProbePhysicsSystem } from './physics.js';
import { PortalRenderer } from './renderer.js';
import { SonicPortalEngine } from './audio.js';

class EndlessPortalJourney {
  constructor() {
    this.canvas = document.getElementById('portal-canvas');
    this.renderer = new PortalRenderer(this.canvas);
    this.audio = new SonicPortalEngine();

    // Rolling 3-world multiverse queue (Current -> Next -> AfterNext)
    this.seqIndex = 0;
    this.currentWorld = createWorldInstance(0);
    this.nextWorld = createWorldInstance(1);
    this.afterNextWorld = createWorldInstance(2);

    // Physical 6-DOF craft & Newtonian cross-portal probe simulator
    this.craft = new CraftPhysics(this.currentWorld);
    this.probes = new ProbePhysicsSystem();

    this.elapsedTime = 0.0;
    this.crossingPulse = 0.0;
    this.warpBoost = 0.0;
    this.warpRequested = false;
    this.paused = false;
    this.hudHidden = false;
    this.portalsCrossed = 0;

    this.targetGazeYaw = 0.0;
    this.targetGazePitch = 0.0;
    this.gazeYaw = 0.0;
    this.gazePitch = 0.0;
    this.lastPointerMoveTime = -10.0;

    this._cacheDom();
    this._bindEvents();
    this._announceWorld(this.currentWorld, true);

    this.lastFrameTime = performance.now();
    requestAnimationFrame((now) => this._tick(now));
  }

  _cacheDom() {
    this.uiRoot = document.getElementById('hud-root');
    this.chapterBanner = document.getElementById('chapter-banner');
    this.chapterRoman = document.getElementById('chapter-roman');
    this.chapterTitle = document.getElementById('chapter-title');
    this.chapterSubtitle = document.getElementById('chapter-subtitle');
    this.chapterMeta = document.getElementById('chapter-meta');

    this.telemetryWorld = document.getElementById('telemetry-world');
    this.telemetryPhysics = document.getElementById('telemetry-physics');
    this.telemetrySpeed = document.getElementById('telemetry-speed');
    this.telemetryGload = document.getElementById('telemetry-gload');
    this.telemetryNext = document.getElementById('telemetry-next');
    this.progressFill = document.getElementById('portal-progress-fill');

    this.btnProbe = document.getElementById('btn-probe');
    this.btnAudio = document.getElementById('btn-audio');
    this.btnAudioLabel = document.getElementById('btn-audio-label');
    this.btnWarp = document.getElementById('btn-warp');
    this.btnHud = document.getElementById('btn-hud');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
  }

  _launchUserProbe(screenU = 0.5, screenV = 0.54) {
    const pose = this.craft.getPose();
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const tanHalf = this.renderer.tanHalfFov;
    const px = screenU * 2.0 - 1.0;
    const py = screenV * 2.0 - 1.0;

    const rayDir = normalize3(
      [0, 0, 1],
      pose.forward[0] + px * aspect * tanHalf * pose.right[0] + py * tanHalf * pose.up[0],
      pose.forward[1] + px * aspect * tanHalf * pose.right[1] + py * tanHalf * pose.up[1],
      pose.forward[2] + px * aspect * tanHalf * pose.right[2] + py * tanHalf * pose.up[2]
    );

    const origin = [
      pose.pos[0] + rayDir[0] * 2.2 - pose.up[0] * 0.35,
      pose.pos[1] + rayDir[1] * 2.2 - pose.up[1] * 0.35,
      pose.pos[2] + rayDir[2] * 2.2 - pose.up[2] * 0.35
    ];

    const impulseSpeed = 20.5;
    const launchVel = [
      this.craft.vel[0] + rayDir[0] * impulseSpeed,
      this.craft.vel[1] + rayDir[1] * impulseSpeed,
      this.craft.vel[2] + rayDir[2] * impulseSpeed
    ];

    this.probes.spawnProbe(origin, launchVel, this.currentWorld, true);
    this.audio.playProbeLaunch(this.currentWorld);
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.renderer.resize(false));

    window.addEventListener('pointermove', (e) => {
      this.lastPointerMoveTime = this.elapsedTime;
      this.uiRoot.classList.remove('ui-idle');

      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2.0 - 1.0;
      const ny = 1.0 - (e.clientY / Math.max(1, window.innerHeight)) * 2.0;
      this.targetGazeYaw = nx * 0.14;
      this.targetGazePitch = ny * 0.09;
    }, { passive: true });

    // Clicking anywhere on the 3D viewport launches a Newtonian Test Sphere along that exact ray!
    this.canvas.addEventListener('pointerdown', async (e) => {
      if (e.button !== 0) return;
      if (!this.audio.enabled && !this.audio.initialized) {
        const active = await this.audio.enableIfSuspended(this.currentWorld);
        this._updateAudioButton(active);
      }
      const u = e.clientX / Math.max(1, window.innerWidth);
      const v = 1.0 - e.clientY / Math.max(1, window.innerHeight);
      this._launchUserProbe(u, v);
    });

    this.btnProbe.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!this.audio.enabled && !this.audio.initialized) {
        const active = await this.audio.enableIfSuspended(this.currentWorld);
        this._updateAudioButton(active);
      }
      this._launchUserProbe(0.5, 0.55);
    });

    this.btnAudio.addEventListener('click', async (e) => {
      e.stopPropagation();
      const active = await this.audio.toggle(this.currentWorld);
      this._updateAudioButton(active);
    });

    this.btnWarp.addEventListener('click', (e) => {
      e.stopPropagation();
      this.warpRequested = true;
    });

    this.btnHud.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleHud();
    });

    this.btnFullscreen.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleFullscreen();
    });

    window.addEventListener('keydown', async (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!this.audio.enabled && !this.audio.initialized) {
          const active = await this.audio.enableIfSuspended(this.currentWorld);
          this._updateAudioButton(active);
        }
        this._launchUserProbe(0.5, 0.55);
      } else if (e.code === 'KeyP') {
        this.paused = !this.paused;
      } else if (e.code === 'KeyM') {
        const active = await this.audio.toggle(this.currentWorld);
        this._updateAudioButton(active);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyN') {
        this.warpRequested = true;
      } else if (e.code === 'KeyH') {
        this._toggleHud();
      } else if (e.code === 'KeyF') {
        this._toggleFullscreen();
      }
    });
  }

  _updateAudioButton(active) {
    this.btnAudio.classList.toggle('is-active', active);
    this.btnAudioLabel.textContent = active ? 'Sound On' : 'Enable Sound';
  }

  _toggleHud() {
    this.hudHidden = !this.hudHidden;
    this.uiRoot.classList.toggle('hud-hidden', this.hudHidden);
  }

  _toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  _announceWorld(world, initial = false) {
    clearTimeout(this._bannerTimeout);

    const cycleTag = world.cycle > 1 ? ` · CYCLE ${String(world.cycle).padStart(2, '0')}` : '';
    this.chapterRoman.textContent = `WORLD ${world.roman}${cycleTag}`;
    this.chapterTitle.textContent = world.name;
    this.chapterSubtitle.textContent = world.subtitle;
    this.chapterMeta.textContent = world.classification;

    const [r, g, b] = world.portalAccent.map((v) => Math.round(clamp(v / 1.5, 0.2, 1.0) * 255));
    document.documentElement.style.setProperty('--portal-accent', `rgb(${r}, ${g}, ${b})`);

    this.chapterBanner.classList.remove('is-visible');
    void this.chapterBanner.offsetWidth;
    this.chapterBanner.classList.add('is-visible');

    this._bannerTimeout = setTimeout(() => {
      this.chapterBanner.classList.remove('is-visible');
    }, initial ? 4600 : 3800);

    this.telemetryWorld.textContent = `${world.roman} · ${world.name}`;
    this.telemetryPhysics.textContent = world.physicsSummary;
  }

  _promoteNextWorld() {
    const oldWorld = this.currentWorld;
    this.seqIndex += 1;
    this.portalsCrossed += 1;
    this.currentWorld = this.nextWorld;
    this.nextWorld = this.afterNextWorld;
    this.afterNextWorld = createWorldInstance(this.seqIndex + 2);

    // Conserve exact 3D velocity vector v, acceleration a, and roll angular momentum across portal!
    this.craft.promoteAcrossPortal(oldWorld, this.currentWorld);

    this.crossingPulse = 1.0;
    this.warpRequested = false;

    this.audio.triggerPortalCrossing(this.currentWorld);
    this._announceWorld(this.currentWorld, false);
  }

  _tick(nowMs) {
    requestAnimationFrame((nextMs) => this._tick(nextMs));

    const rawDt = (nowMs - this.lastFrameTime) * 0.001;
    this.lastFrameTime = nowMs;
    const dt = clamp(rawDt, 0.001, 0.045);

    if (this.paused) {
      return;
    }

    this.elapsedTime += dt;
    this.renderer.updateAdaptiveQuality(rawDt, this.elapsedTime);

    const pointerIdle = (this.elapsedTime - this.lastPointerMoveTime) > 3.6;
    if (pointerIdle) {
      this.uiRoot.classList.add('ui-idle');
      this.targetGazeYaw = 0.0;
      this.targetGazePitch = 0.0;
    }

    const portalCentering = smoothstep(WORLD_LENGTH - 22.0, WORLD_LENGTH - 4.0, this.craft.pos[2]);
    const effYaw = this.targetGazeYaw * (1.0 - portalCentering);
    const effPitch = this.targetGazePitch * (1.0 - portalCentering);

    const spring = 1.0 - Math.exp(-dt * 3.8);
    this.gazeYaw += (effYaw - this.gazeYaw) * spring;
    this.gazePitch += (effPitch - this.gazePitch) * spring;

    const targetWarp = (this.warpRequested && this.craft.pos[2] < WORLD_LENGTH - 12.0) ? 2.4 : 0.0;
    if (this.craft.pos[2] >= WORLD_LENGTH - 12.0) {
      this.warpRequested = false;
    }
    this.warpBoost += (targetWarp - this.warpBoost) * (1.0 - Math.exp(-dt * 4.2));

    // 1. Step 6-DOF Newtonian/Relativistic Craft Flight Integrator
    this.craft.step(
      dt,
      this.currentWorld,
      this.nextWorld,
      this.elapsedTime,
      this.warpBoost,
      this.gazeYaw,
      this.gazePitch
    );

    // 2. Seamless Euclidean Portal Crossing with 100% Momentum Conservation
    while (this.craft.pos[2] >= WORLD_LENGTH) {
      this._promoteNextWorld();
    }

    // 3. Step Cross-Portal Newtonian Test Spheres (Velocity Verlet + SDF Collisions + Buoyancy/Drag)
    this.probes.step(
      dt,
      this.craft,
      this.currentWorld,
      this.nextWorld,
      this.afterNextWorld,
      this.elapsedTime,
      (impactSpeed, restitution, probePos, camPos, inCurrent) => {
        this.audio.playProbeCollision(impactSpeed, restitution, probePos, camPos, inCurrent);
      }
    );

    this.crossingPulse *= Math.exp(-dt * 2.8);

    // 4. Update Physical Acoustic Doppler Shift f' = f * c_s / (c_s - v_r)
    this.audio.update(dt, this.craft, this.currentWorld);

    // 5. Update Physics & Transit Telemetry
    const zNow = clamp(this.craft.pos[2], 0.0, WORLD_LENGTH);
    const distRemaining = Math.max(0.0, WORLD_LENGTH - zNow);
    this.telemetrySpeed.textContent = `${this.craft.speed.toFixed(1)} m/s`;
    this.telemetryGload.textContent = `${this.craft.gLoad.toFixed(2)} G`;
    this.telemetryNext.textContent = `${this.nextWorld.name} · ${Math.ceil(distRemaining)} m`;
    this.progressFill.style.transform = `scaleX(${(zNow / WORLD_LENGTH).toFixed(4)})`;

    // 6. Render Dual-World Frame + Cross-Portal Newtonian Test Spheres
    const pose = this.craft.getPose();
    const probesCurrent = this.probes.getProbesInWorld(this.currentWorld.sequenceIndex);
    const probesNext = this.probes.getProbesInWorld(this.nextWorld.sequenceIndex);

    this.renderer.renderFrame({
      currentWorld: this.currentWorld,
      nextWorld: this.nextWorld,
      afterNextWorld: this.afterNextWorld,
      pose,
      probesCurrent,
      probesNext,
      time: this.elapsedTime,
      crossingPulse: this.crossingPulse + this.warpBoost * 0.12
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new EndlessPortalJourney();
  } catch (err) {
    console.error(err);
    const fallback = document.getElementById('webgl-error');
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = `Unable to initialize WebGL2 Portal Engine: ${err.message}`;
    }
  }
});
