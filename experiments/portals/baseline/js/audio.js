/**
 * Procedural Spatial WebAudio Engine ("Sonic Portals") with Physical Acoustics:
 * - Exact 3D Acoustic Doppler Pitch Shift: f' = f * c_s / (c_s - v_r) relative to the R=8.23m Portal Ring
 * - Inverse-Distance & Stereo-Panned Modal Impact Acoustics for Newtonian Probe Collisions
 * - 7-Voice Harmonic Choir, Algorithmic Cathedral Reverb & World-Specific Fluid/Atmospheric Noise
 */

import { WORLD_LENGTH } from './worlds.js';

function midiToFreq(midi) {
  return 440.0 * Math.pow(2.0, (midi - 69.0) / 12.0);
}

export class SonicPortalEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.initialized = false;
    this.voices = [];
    this.masterGain = null;
    this.padFilter = null;
    this.atmoFilter = null;
    this.atmoGain = null;
    this.portalShimmerOsc = null;
    this.portalShimmerSub = null;
    this.portalShimmerGain = null;
    this.reverbSend = null;
    this.currentWorld = null;
    this._chimeTimer = 0;
    this.lastDopplerRatio = 1.0;
  }

  _buildReverbImpulse(ctx, duration = 4.2, decay = 2.6) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp = 0.0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.sin(Math.min(1.0, t * 28.0) * Math.PI * 0.5) * Math.pow(1.0 - t, decay);
        const white = Math.random() * 2.0 - 1.0;
        const damp = 0.12 + 0.32 * (1.0 - t);
        lp = lp + damp * (white - lp);
        data[i] = lp * env * 0.65;
      }
    }
    return impulse;
  }

  _buildPinkNoiseBuffer(ctx, seconds = 6.0) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(2, length, rate);

    for (let ch = 0; ch < 2; ch++) {
      const out = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2.0 - 1.0;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  init(initialWorld) {
    if (this.initialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;
    this.currentWorld = initialWorld;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 4;
    comp.attack.value = 0.02;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.0001;
    this.masterGain.connect(comp);

    const convolver = ctx.createConvolver();
    convolver.buffer = this._buildReverbImpulse(ctx);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.52;
    convolver.connect(reverbGain);
    reverbGain.connect(this.masterGain);
    this.reverbSend = convolver;

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 920;
    this.padFilter.Q.value = 0.85;
    this.padFilter.connect(this.masterGain);
    this.padFilter.connect(this.reverbSend);

    const chord = initialWorld.chordMidi;
    for (let i = 0; i < 7; i++) {
      const freq = midiToFreq(chord[i]);
      const voiceGain = ctx.createGain();
      const baseAmp = i === 0 ? 0.13 : i < 3 ? 0.085 : 0.052;
      voiceGain.gain.value = baseAmp;

      const panner = ctx.createStereoPanner();
      panner.pan.value = i === 0 ? 0.0 : ((i % 2 === 0 ? 1 : -1) * (0.18 + i * 0.08));

      const oscA = ctx.createOscillator();
      oscA.type = i < 2 ? 'sine' : 'triangle';
      oscA.frequency.value = freq;
      oscA.detune.value = -4.5 - i * 0.6;

      const oscB = ctx.createOscillator();
      oscB.type = i === 0 ? 'triangle' : 'sawtooth';
      oscB.frequency.value = freq;
      oscB.detune.value = 4.5 + i * 0.6;

      const subMixB = ctx.createGain();
      subMixB.gain.value = i === 0 ? 0.35 : 0.22;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.07 + i * 0.031;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = baseAmp * 0.28;
      lfo.connect(lfoDepth);
      lfoDepth.connect(voiceGain.gain);

      oscA.connect(voiceGain);
      oscB.connect(subMixB);
      subMixB.connect(voiceGain);
      voiceGain.connect(panner);
      panner.connect(this.padFilter);

      oscA.start();
      oscB.start();
      lfo.start();

      this.voices.push({ oscA, oscB, voiceGain, baseAmp });
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = this._buildPinkNoiseBuffer(ctx);
    noiseSrc.loop = true;

    this.atmoFilter = ctx.createBiquadFilter();
    this.atmoFilter.type = 'bandpass';
    this.atmoFilter.frequency.value = 420;
    this.atmoFilter.Q.value = 1.4;

    this.atmoGain = ctx.createGain();
    this.atmoGain.gain.value = 0.14;

    noiseSrc.connect(this.atmoFilter);
    this.atmoFilter.connect(this.atmoGain);
    this.atmoGain.connect(this.masterGain);
    this.atmoGain.connect(this.reverbSend);
    noiseSrc.start();

    // Dual-harmonic Portal Ring Resonator (driven by physical Acoustic Doppler shift f' = f * c_s / (c_s - v_r)!)
    const baseResFreq = midiToFreq(chord[4] + 12);
    this._portalBaseFreq = baseResFreq;

    this.portalShimmerOsc = ctx.createOscillator();
    this.portalShimmerOsc.type = 'sine';
    this.portalShimmerOsc.frequency.value = baseResFreq;

    this.portalShimmerSub = ctx.createOscillator();
    this.portalShimmerSub.type = 'triangle';
    this.portalShimmerSub.frequency.value = baseResFreq * 0.5;

    const subGain = ctx.createGain();
    subGain.gain.value = 0.38;

    this.portalShimmerGain = ctx.createGain();
    this.portalShimmerGain.gain.value = 0.0;

    this.portalShimmerOsc.connect(this.portalShimmerGain);
    this.portalShimmerSub.connect(subGain);
    subGain.connect(this.portalShimmerGain);
    this.portalShimmerGain.connect(this.reverbSend);
    this.portalShimmerGain.connect(this.masterGain);

    this.portalShimmerOsc.start();
    this.portalShimmerSub.start();

    this.initialized = true;
    this._applyWorldTimbre(initialWorld, 0.1);
  }

  async toggle(currentWorld) {
    if (!this.initialized) {
      this.init(currentWorld);
    }
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (_) {
        return false;
      }
    }

    this.enabled = !this.enabled;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.exponentialRampToValueAtTime(this.enabled ? 0.72 : 0.0001, now + 0.85);
    return this.enabled;
  }

  async enableIfSuspended(currentWorld) {
    if (this.enabled) return true;
    return this.toggle(currentWorld);
  }

  _applyWorldTimbre(world, glideSec = 1.65) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < this.voices.length; i++) {
      const midi = world.chordMidi[i % world.chordMidi.length];
      const freq = midiToFreq(midi);
      const v = this.voices[i];
      v.oscA.frequency.cancelScheduledValues(now);
      v.oscB.frequency.cancelScheduledValues(now);
      v.oscA.frequency.setValueAtTime(Math.max(20, v.oscA.frequency.value), now);
      v.oscB.frequency.setValueAtTime(Math.max(20, v.oscB.frequency.value), now);
      v.oscA.frequency.exponentialRampToValueAtTime(freq, now + glideSec);
      v.oscB.frequency.exponentialRampToValueAtTime(freq, now + glideSec);
    }

    let atmoFreq = 460;
    let atmoQ = 1.4;
    let atmoVol = 0.14;
    let padBaseCutoff = 920;

    switch (world.audioCharacter) {
      case 'abyssal-liquid':
        atmoFreq = 165; atmoQ = 2.4; atmoVol = 0.22; padBaseCutoff = 620;
        break;
      case 'singularity-drone':
        atmoFreq = 90; atmoQ = 3.0; atmoVol = 0.26; padBaseCutoff = 780;
        break;
      case 'pastoral-wind':
        atmoFreq = 680; atmoQ = 1.1; atmoVol = 0.16; padBaseCutoff = 1180;
        break;
      case 'cathedral-choir':
        atmoFreq = 340; atmoQ = 2.8; atmoVol = 0.11; padBaseCutoff = 880;
        break;
      case 'desert-mirage':
        atmoFreq = 520; atmoQ = 1.9; atmoVol = 0.18; padBaseCutoff = 960;
        break;
      case 'glacial-bells':
        atmoFreq = 1150; atmoQ = 1.6; atmoVol = 0.12; padBaseCutoff = 1280;
        break;
      case 'cosmic-nexus':
        atmoFreq = 390; atmoQ = 1.5; atmoVol = 0.16; padBaseCutoff = 1150;
        break;
      default:
        atmoFreq = 520; atmoQ = 1.3; atmoVol = 0.14; padBaseCutoff = 1040;
    }

    this._basePadCutoff = padBaseCutoff;
    this._portalBaseFreq = midiToFreq(world.chordMidi[4] + 12);
    this.atmoFilter.frequency.setTargetAtTime(atmoFreq, now, 0.7);
    this.atmoFilter.Q.setTargetAtTime(atmoQ, now, 0.7);
    this.atmoGain.gain.setTargetAtTime(atmoVol, now, 0.7);
  }

  /**
   * Updates Acoustic Doppler Pitch Shift f' = f * c_s / (c_s - v_r) relative to the nearest
   * 3D Portal Ring (radius R = 8.23m), plus speed-dependent wind rush and generative chimes.
   */
  update(dt, craft, world) {
    // Compute exact 3D slant radial velocity relative to the nearest Portal Ring (z=0 receding or z=WORLD_LENGTH approaching)
    const dzExit = WORLD_LENGTH - craft.pos[2];
    const dzEntry = -craft.pos[2]; // Negative when receding behind craft
    const dzNearest = Math.abs(dzExit) < Math.abs(dzEntry) ? dzExit : dzEntry;

    // Slant range to the physical emitting ring of radius R_ring = 8.23m
    const ringR = 8.23;
    const slantRange = Math.hypot(dzNearest, ringR);
    // Exact line-of-sight radial velocity component v_r (positive approaching, 0 at plane, negative receding!)
    const vrRing = (craft.vel[2] * dzNearest) / slantRange;

    // Exact physical speed of sound c_s in each world's medium (e.g. 295 m/s polar air, 365 m/s desert air, 1500 m/s seawater)
    // Acoustic Doppler formula: f' = f_0 * c_s / (c_s - v_r)
    const cMedium = world.soundSpeed || 343.0;
    const safeVr = Math.max(-cMedium * 0.65, Math.min(cMedium * 0.65, vrRing));
    const dopplerRatio = cMedium / (cMedium - safeVr);
    this.lastDopplerRatio = dopplerRatio;

    if (!this.initialized || !this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    const baseCut = this._basePadCutoff || 920;

    // Inverse-square proximity envelope to the nearest portal ring
    const ringProx = 1.0 / (1.0 + (dzNearest * dzNearest) / 480.0);
    const targetCutoff = baseCut + ringProx * 1550 + Math.max(0, craft.speed - 11.0) * 45.0;
    this.padFilter.frequency.setTargetAtTime(targetCutoff, now, 0.06);

    // Apply exact Doppler shifted frequency f' = f_0 * c_s / (c_s - v_r) to the Portal Ring Resonators!
    const fShifted = (this._portalBaseFreq || 587.33) * dopplerRatio;
    this.portalShimmerOsc.frequency.setTargetAtTime(fShifted, now, 0.04);
    this.portalShimmerSub.frequency.setTargetAtTime(fShifted * 0.5, now, 0.04);
    this.portalShimmerGain.gain.setTargetAtTime(ringProx * 0.105, now, 0.06);

    this._chimeTimer -= dt;
    if (this._chimeTimer <= 0.0) {
      this._chimeTimer = 2.6 + Math.random() * 3.4;
      const noteIdx = 3 + Math.floor(Math.random() * 4);
      const midi = world.chordMidi[noteIdx % world.chordMidi.length] + (Math.random() > 0.55 ? 12 : 0);
      this._playBellPartial(midiToFreq(midi), 0.030, 2.8, (Math.random() * 2.0 - 1.0) * 0.65);
    }
  }

  _playBellPartial(freq, peakGain, duration, panVal = 0.0) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    pan.pan.value = Math.max(-1.0, Math.min(1.0, panVal));

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(pan);
    pan.connect(this.reverbSend);
    pan.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /**
   * Subtle electromagnetic/kinetic impulse sound when launching a Newtonian Test Sphere.
   */
  playProbeLaunch(world) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseF = midiToFreq(world.chordMidi[2] + 12);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseF * 0.75, now);
    osc.frequency.exponentialRampToValueAtTime(baseF * 1.5, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.reverbSend);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.30);
  }

  /**
   * Physical Modal Impact Chime when a Newtonian Test Sphere ricochets off an SDF surface:
   * Amplitude & brightness scale with normal impact speed |v·n| and material restitution e,
   * attenuated by inverse distance!
   */
  playProbeCollision(impactSpeed, restitution, probePos, camPos, inCurrentWorld) {
    if (!this.ctx || !this.enabled || !this.currentWorld) return;
    const dx = probePos[0] - camPos[0];
    const dy = probePos[1] - camPos[1];
    const dz = (inCurrentWorld ? probePos[2] : probePos[2] + WORLD_LENGTH) - camPos[2];
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 85.0) return;

    const distAtten = 1.0 / (1.0 + dist * 0.08);
    const velScale = Math.min(1.0, impactSpeed / 18.0);
    const gain = 0.055 * velScale * distAtten * (inCurrentWorld ? 1.0 : 0.55);
    if (gain < 0.002) return;

    const chord = this.currentWorld.chordMidi;
    const note = chord[Math.min(chord.length - 1, 2 + Math.floor(velScale * 4))] + (restitution > 0.72 ? 12 : 0);
    const pan = Math.max(-0.9, Math.min(0.9, dx / Math.max(8.0, dist)));
    const decay = 0.55 + restitution * 1.85;
    this._playBellPartial(midiToFreq(note), gain, decay, pan);
  }

  triggerPortalCrossing(newWorld) {
    this.currentWorld = newWorld;
    if (!this.initialized || !this.ctx) return;

    this._applyWorldTimbre(newWorld, 1.55);
    if (!this.enabled) return;

    const now = this.ctx.currentTime;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(96, now);
    subOsc.frequency.exponentialRampToValueAtTime(34, now + 1.35);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.24, now + 0.06);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 1.5);

    for (let i = 0; i < 4; i++) {
      const midi = newWorld.chordMidi[3 + i] + 12;
      setTimeout(() => {
        this._playBellPartial(midiToFreq(midi), 0.042, 3.4, (i - 1.5) * 0.35);
      }, i * 110);
    }
  }
}
