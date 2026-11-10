// ============================================================================
// audio.js — Generative Spatial WebAudio, Acoustic Doppler & Physics Foley Engine
// Zero external audio files: synthesizes Sabine cavern convolution reverb
// (RT60 ≈ 2.65s), acoustic Doppler shift f' = f0 * c_s / (c_s - v_r), 6 world
// musical/environmental soundscapes, RK4 horological escapement ticks, material
// collision foley (CDX plywood/2x4, water splash, limestone, brass, crystal),
// and the §119.6 60Hz/120Hz Fluorescent Ballast Hum!
// ============================================================================
(function () {
  "use strict";
  const PE = (window.PortalEngine = window.PortalEngine || {});

  const SPEED_OF_SOUND = 343.0; // m/s in dry air at 20°C

  const SCALES_HZ = [
    // 0 Escher: D Dorian chamber intervals
    [293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 587.33],
    // 1 Armilla: F Lydian crystalline water & brass harmonics
    [349.23, 392.00, 440.00, 493.88, 523.25, 659.25, 698.46],
    // 2 Hokusai: D Hirajoshi koto pentatonic
    [293.66, 311.13, 392.00, 440.00, 466.16, 587.33, 622.25],
    // 3 Lascaux: A minor pentatonic bone-flute & deep fifths
    [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25],
    // 4 Origami: C major pentatonic celesta / horology bells
    [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66],
    // 5 Scriptorium: E Lydian glass armonica & crystal fifths
    [329.63, 369.99, 466.16, 493.88, 659.25, 739.99, 987.77]
  ];

  // Sabine Reverberation Wet Send per World (RT60 = 0.161 * V / A_abs)
  // World 3 (Lascaux limestone cavern) & World 5 (Glass Scriptorium) have highest Sabine reverb;
  // World 1 (Armilla open sky) has lowest reflection density!
  const SABINE_REVERB_WET = [0.52, 0.24, 0.36, 0.82, 0.38, 0.72];

  class SpatialAudioEngine {
    constructor() {
      this.ctx = null;
      this.enabled = false;
      this.initialized = false;
      this.currentWorld = 0;
      this.bureaucracy = 0;
      this.regimeMode = 0;
      this.portalProximity = 0;
      this.radialVelocity = 0;
      this.dopplerRatio = 1.0;
      this.noteTimer = 0;
      this.tickTimer = 0;
      this.stepCounter = 0;
      this.impactNoiseBuf = null;
    }

    init() {
      if (this.initialized) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0;
      this.master.connect(this.ctx.destination);

      // Stereo panner for Constitutional music vs Bureaucracy hum in Split A/B mode
      this.musicPan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.72;
      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = "lowpass";
      this.musicFilter.frequency.value = 6500;

      // Procedural Sabine Cavern/Cathedral Convolution Reverb (RT60 ≈ 2.65s)
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this._buildSabineReverbImpulse(2.65);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.48;

      if (this.musicPan) {
        this.musicFilter.connect(this.musicPan);
        this.musicPan.connect(this.musicGain);
      } else {
        this.musicFilter.connect(this.musicGain);
      }
      this.musicGain.connect(this.master);
      this.musicFilter.connect(this.convolver);
      this.convolver.connect(this.reverbGain);
      this.reverbGain.connect(this.master);

      // Short transient noise buffer for physical collision foley (plywood/splash/stone)
      this.impactNoiseBuf = this._buildTransientNoiseBuffer(0.35);

      // Continuous ambient bed (surf / wind / cavern drone)
      this._setupAmbientBed();

      // §119.6 Fluorescent 60Hz + 120Hz + 240Hz magnetic ballast buzz
      this._setupBureaucracyBuzz();

      this.initialized = true;
    }

    // Exponential -60dB Sabine reverberation tail: exp(-6.9078 * t / RT60)
    _buildSabineReverbImpulse(rt60Seconds) {
      const rate = this.ctx.sampleRate;
      const len = Math.floor(rate * rt60Seconds);
      const buf = this.ctx.createBuffer(2, len, rate);
      const decayConst = 6.907755 / rt60Seconds;
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let seed = ch === 0 ? 1234567 : 7654321;
        for (let i = 0; i < len; i++) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          const white = seed / 2147483648 - 1.0;
          const t = i / rate;
          // Early cavern wall reflections + diffuse Sabine exponential tail
          const early = (i === 720 || i === 1640 || i === 2890) ? 0.45 : 1.0;
          data[i] = white * Math.exp(-decayConst * t) * early;
        }
      }
      return buf;
    }

    _buildTransientNoiseBuffer(seconds) {
      const rate = this.ctx.sampleRate;
      const len = Math.floor(rate * seconds);
      const buf = this.ctx.createBuffer(1, len, rate);
      const d = buf.getChannelData(0);
      let s = 987654321;
      for (let i = 0; i < len; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        d[i] = (s / 2147483648 - 1.0) * Math.exp((-i / len) * 5.0);
      }
      return buf;
    }

    _setupAmbientBed() {
      const rate = this.ctx.sampleRate;
      const len = rate * 3;
      const noiseBuf = this.ctx.createBuffer(1, len, rate);
      const d = noiseBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + w * 0.029;
        b1 = 0.985 * b1 + w * 0.032;
        b2 = 0.950 * b2 + w * 0.048;
        d[i] = (b0 + b1 + b2 + w * 0.02) * 0.35;
      }
      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = noiseBuf;
      this.noiseSource.loop = true;

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = "bandpass";
      this.noiseFilter.frequency.value = 360;
      this.noiseFilter.Q.value = 0.9;

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.value = 0.08;

      this.noiseSource.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.musicFilter);
      this.noiseSource.start();

      // Warm sub-drone oscillator (modulated by Doppler ratio!)
      this.droneOsc = this.ctx.createOscillator();
      this.droneOsc.type = "sine";
      this.droneOsc.frequency.value = 73.42;
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.07;
      this.droneOsc.connect(this.droneGain);
      this.droneGain.connect(this.musicFilter);
      this.droneOsc.start();
    }

    _setupBureaucracyBuzz() {
      this.buzzGain = this.ctx.createGain();
      this.buzzGain.gain.value = 0.0;
      this.buzzPan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      const freqs = [
        [60, "sawtooth", 0.018],
        [120, "triangle", 0.028],
        [240, "sine", 0.012]
      ];
      const buzzFilter = this.ctx.createBiquadFilter();
      buzzFilter.type = "bandpass";
      buzzFilter.frequency.value = 160;
      buzzFilter.Q.value = 1.8;

      for (const [f, type, amp] of freqs) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = f;
        g.gain.value = amp;
        o.connect(g);
        g.connect(buzzFilter);
        o.start();
      }

      if (this.buzzPan) {
        buzzFilter.connect(this.buzzPan);
        this.buzzPan.connect(this.buzzGain);
      } else {
        buzzFilter.connect(this.buzzGain);
      }
      this.buzzGain.connect(this.master);
    }

    toggle(forceOn = null) {
      if (!this.initialized) this.init();
      if (!this.ctx) return false;
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.enabled = forceOn !== null ? forceOn : !this.enabled;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.enabled ? 0.52 : 0.0, now, 0.12);
      return this.enabled;
    }

    unlockOnFirstGesture() {
      if (!this.initialized) {
        this.toggle(true);
      } else if (this.ctx && this.ctx.state === "suspended" && this.enabled) {
        this.ctx.resume();
      }
    }

    update(dt, worldIndex, bureaucracy, regimeMode, zPos, radialVel = 0.0) {
      // Compute physical acoustic Doppler shift f' = f0 * c_s / (c_s - v_r) even when muted for telemetry!
      const clampedVr = Math.max(-45.0, Math.min(45.0, radialVel));
      this.radialVelocity = clampedVr;
      this.dopplerRatio = SPEED_OF_SOUND / (SPEED_OF_SOUND - clampedVr);

      if (!this.initialized || !this.enabled || !this.ctx) return;

      this.currentWorld = worldIndex;
      this.bureaucracy = bureaucracy;
      this.regimeMode = regimeMode;
      this.portalProximity = Math.max(0, Math.min(1, 1.0 - Math.abs(zPos + 18.0) / 6.5));

      const now = this.ctx.currentTime;
      const effB = regimeMode === 2 ? 0.45 : bureaucracy;

      // Modulate sovereign music filter, Sabine reverb send & fluorescent ballast buzz
      this.musicFilter.frequency.setTargetAtTime(6200 - effB * 5100, now, 0.08);
      this.musicGain.gain.setTargetAtTime(0.75 * (1.0 - effB * 0.68), now, 0.08);
      this.reverbGain.gain.setTargetAtTime(SABINE_REVERB_WET[worldIndex] * (1.0 - effB * 0.55), now, 0.18);
      this.buzzGain.gain.setTargetAtTime(regimeMode === 2 ? 0.38 : bureaucracy * 0.85, now, 0.08);

      if (this.musicPan && this.buzzPan) {
        this.musicPan.pan.setTargetAtTime(regimeMode === 2 ? -0.45 : 0.0, now, 0.1);
        this.buzzPan.pan.setTargetAtTime(regimeMode === 2 ? 0.45 : 0.0, now, 0.1);
      }

      // World-specific ambient drone shifted by exact acoustic Doppler ratio!
      const droneRoots = [73.42, 87.31, 73.42, 55.00, 65.41, 82.41];
      this.droneOsc.frequency.setTargetAtTime(droneRoots[worldIndex] * this.dopplerRatio, now, 0.12);

      if (worldIndex === 2) {
        const swell = (260 + Math.sin(now * 0.75) * 150) * this.dopplerRatio;
        this.noiseFilter.frequency.setTargetAtTime(swell, now, 0.15);
        this.noiseGain.gain.setTargetAtTime(0.20 * (1 - effB * 0.7), now, 0.15);
      } else if (worldIndex === 1) {
        this.noiseFilter.frequency.setTargetAtTime(950 * this.dopplerRatio, now, 0.2);
        this.noiseGain.gain.setTargetAtTime(0.09 * (1 - effB * 0.7), now, 0.2);
      } else if (worldIndex === 3) {
        this.noiseFilter.frequency.setTargetAtTime(210 * this.dopplerRatio, now, 0.2);
        this.noiseGain.gain.setTargetAtTime(0.14 * (1 - effB * 0.7), now, 0.2);
      } else {
        this.noiseFilter.frequency.setTargetAtTime(480 * this.dopplerRatio, now, 0.2);
        this.noiseGain.gain.setTargetAtTime(0.04 * (1 - effB * 0.7), now, 0.2);
      }

      // Generative melodic / environmental note scheduler
      const tempoScale = 1.0 - effB * 0.65;
      this.noteTimer -= dt * tempoScale;
      if (this.noteTimer <= 0) {
        this._triggerWorldVoice(worldIndex, 1.0, this.dopplerRatio);
        // Doppler-shifted pre-bleed from the next world through the open FBO portal!
        if (this.portalProximity > 0.32 && Math.random() < this.portalProximity * 0.7) {
          this._triggerWorldVoice((worldIndex + 1) % 6, 0.38 * this.portalProximity, this.dopplerRatio);
        }
        const intervals = [0.42, 0.34, 0.55, 0.68, 0.42, 0.72];
        this.noteTimer = intervals[worldIndex] * (0.75 + Math.random() * 0.5);
      }

      // Lascaux Paleolithic hearth crackles (Note: World 4 ticks are now driven directly by RK4 pallet release!)
      this.tickTimer -= dt * tempoScale;
      if (this.tickTimer <= 0) {
        if (worldIndex === 3 && effB < 0.85) {
          if (Math.random() < 0.55) this._triggerFireCrackle();
          this.tickTimer = 0.16 + Math.random() * 0.22;
        } else {
          this.tickTimer = 0.28;
        }
      }
    }

    _triggerWorldVoice(wIdx, gainScale = 1.0, doppler = 1.0) {
      const now = this.ctx.currentTime;
      const scale = SCALES_HZ[wIdx % 6];
      this.stepCounter = (this.stepCounter + 1) % 16;

      let freq = scale[(this.stepCounter * 2 + Math.floor(Math.random() * 3)) % scale.length] * doppler;
      if (wIdx === 0) {
        const dir = this.stepCounter % 2 === 0 ? 1 : 0.5;
        freq *= dir;
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (wIdx === 0) {
        osc.type = "triangle";
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.11 * gainScale, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.95);
        osc.stop(now + 1.0);
      } else if (wIdx === 1) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * 1.5, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.54, now + 0.12);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12 * gainScale, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
        osc.stop(now + 0.6);
      } else if (wIdx === 2) {
        osc.type = "sawtooth";
        const flt = this.ctx.createBiquadFilter();
        flt.type = "lowpass";
        flt.frequency.setValueAtTime(freq * 5.0, now);
        flt.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.45);
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.09 * gainScale, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.85);
        osc.connect(flt);
        flt.connect(gain);
        gain.connect(this.musicFilter);
        osc.start(now);
        osc.stop(now + 0.9);
        return;
      } else if (wIdx === 3) {
        osc.type = "sine";
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.09 * gainScale, now + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.45);
        osc.stop(now + 1.5);
      } else if (wIdx === 4) {
        osc.type = "sine";
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.095 * gainScale, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.75);
        osc.stop(now + 0.8);
      } else {
        osc.type = "sine";
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.085 * gainScale, now + 0.32);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.9);
        osc.stop(now + 1.95);
      }

      if (wIdx !== 1) osc.frequency.setValueAtTime(freq, now);
      osc.connect(gain);
      gain.connect(this.musicFilter);
      osc.start(now);
    }

    // Triggered directly by the RK4 Nonlinear Anchor-Escapement Pendulum on pallet release!
    playEscapementTick(palletSide = 1) {
      if (!this.initialized || !this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      const baseHz = palletSide > 0 ? 1860 : 1440;
      osc.frequency.setValueAtTime(baseHz * this.dopplerRatio, now);
      g.gain.setValueAtTime(0.055, now);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.032);
      osc.connect(g);
      g.connect(this.musicFilter);
      osc.start(now);
      osc.stop(now + 0.036);
    }

    _triggerFireCrackle() {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(900 + Math.random() * 1900, now);
      g.gain.setValueAtTime(0.022, now);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.018);
      osc.connect(g);
      g.connect(this.musicFilter);
      osc.start(now);
      osc.stop(now + 0.022);
    }

    playSphereLaunch() {
      if (!this.initialized || !this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
      g.gain.setValueAtTime(0.11, now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.11);
      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.12);
    }

    // Material-Accurate Rigid-Body Collision Impact Foley (Proportional to Impulse Speed!)
    playCollisionImpact(impactSpeed, matKind = "stone") {
      if (!this.initialized || !this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const amp = Math.min(0.28, Math.max(0.025, impactSpeed * 0.024));

      if (matKind === "plywood") {
        // Hollow 18mm CDX pine plywood slap + 2x4 pine strut / sandbag thud (§142.7!)
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(175, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);
        g.gain.setValueAtTime(amp * 1.25, now);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.19);
        osc.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.21);

        if (this.impactNoiseBuf) {
          const ns = this.ctx.createBufferSource();
          ns.buffer = this.impactNoiseBuf;
          const bp = this.ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 640;
          bp.Q.value = 2.2;
          const ng = this.ctx.createGain();
          ng.gain.setValueAtTime(amp * 0.9, now);
          ng.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);
          ns.connect(bp);
          bp.connect(ng);
          ng.connect(this.convolver);
          ng.connect(this.master);
          ns.start(now);
        }
      } else if (matKind === "water") {
        // Hydrodynamic water splash + bubble resonance
        if (this.impactNoiseBuf) {
          const ns = this.ctx.createBufferSource();
          ns.buffer = this.impactNoiseBuf;
          const bp = this.ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.setValueAtTime(1150, now);
          bp.frequency.exponentialRampToValueAtTime(380, now + 0.22);
          bp.Q.value = 1.4;
          const ng = this.ctx.createGain();
          ng.gain.setValueAtTime(amp * 0.85, now);
          ng.gain.exponentialRampToValueAtTime(0.0008, now + 0.25);
          ns.connect(bp);
          bp.connect(ng);
          ng.connect(this.musicFilter);
          ns.start(now);
        }
      } else if (matKind === "mirror") {
        // Obsidian Mirror Sea crystal harmonic chime
        [987.77, 1480.0].forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f * this.dopplerRatio, now);
          g.gain.setValueAtTime(amp * (idx === 0 ? 0.55 : 0.28), now);
          g.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);
          osc.connect(g);
          g.connect(this.convolver);
          g.connect(this.master);
          osc.start(now);
          osc.stop(now + 0.68);
        });
      } else if (matKind === "brass") {
        // Resonant brass grate / clockwork clink
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(740 * this.dopplerRatio, now);
        g.gain.setValueAtTime(amp * 0.65, now);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);
        osc.connect(g);
        g.connect(this.musicFilter);
        osc.start(now);
        osc.stop(now + 0.30);
      } else {
        // Limestone / Escher stone knock into Sabine cavern reverb
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(230, now);
        osc.frequency.exponentialRampToValueAtTime(82, now + 0.08);
        g.gain.setValueAtTime(amp * 0.8, now);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.11);
        osc.connect(g);
        g.connect(this.convolver);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.13);
      }
    }

    playPortalCrossing() {
      if (!this.initialized || !this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140 * this.dopplerRatio, now);
      osc.frequency.exponentialRampToValueAtTime(560 * this.dopplerRatio, now + 0.32);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.16, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
      osc.connect(g);
      g.connect(this.convolver);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.6);
    }

    playBureaucracyStamp() {
      if (!this.initialized || !this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      g.gain.setValueAtTime(0.24, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.18);
    }

    playQuarantineAlert() {
      if (!this.initialized || !this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      [587.33, 880.0, 1174.66].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.07);
        g.gain.setValueAtTime(0.11, now + idx * 0.07);
        g.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.07 + 0.45);
        osc.connect(g);
        g.connect(this.master);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.48);
      });
    }
  }

  PE.Audio = new SpatialAudioEngine();
})();
