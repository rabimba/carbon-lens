// Stage 2 Acoustic Engine: Pure WebAudio 1941 Victrola Synthesizer, Scansion Percussion & Tactile Studio Foley
window.AUDEN_STUDIO = window.AUDEN_STUDIO || {};

class AudenAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.muted = false;
    this.volume = 0.72;
    this.shellacCrackleEnabled = true;
    this.activeTimers = [];
    this.activeNodes = [];
    this.crackleNodes = null;
    this.isPlayingVictrola = false;
    this.isPlayingProsody = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.82;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val)));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setShellacCrackle(enabled) {
    this.shellacCrackleEnabled = Boolean(enabled);
    if (!this.shellacCrackleEnabled) {
      this.stopShellacCrackle();
    } else if (this.isPlayingVictrola) {
      this.startShellacCrackle();
    }
  }

  // Tactile sound of Auden's crimson wax grease-pencil slashing vellum
  playGreasePencilStrike(isCorrect = true) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;

    // Paper rasp noise buffer
    const duration = 0.26;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.sin((i / data.length) * Math.PI);
      const grain = (i % 29 < 7) ? 1.35 : 0.55;
      data[i] = (Math.random() * 2 - 1) * env * grain;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(1750, now + duration);
    filter.Q.value = 1.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);

    // Subtle desk-wood resonant confirmation chord
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(isCorrect ? 293.66 : 164.81, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(isCorrect ? 440.0 : 130.81, now + 0.28);
    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.11, now + 0.09);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now + 0.06);
    osc.stop(now + 0.36);
  }

  // Dry calcium chalk tap on Angell Hall slate
  playChalkTap() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Soft laid-vellum page whisper
  playPaperTurn() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const dur = 0.09;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.sin((i / ch.length) * Math.PI) * 0.35;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1600;
    const g = ctx.createGain();
    g.gain.value = 0.08;
    src.connect(hp);
    hp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
  }

  // Prosodic Scansion Beat: stressed lift (´) vs. unstressed dip (˘)
  playSyllablePulse(isStressed, hasCaesuraAfter = false) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;

    if (isStressed) {
      // Warm resonant cedar + pizzicato fifth for metrical lift
      const fund = ctx.createOscillator();
      const fifth = ctx.createOscillator();
      const g = ctx.createGain();

      fund.type = "triangle";
      fifth.type = "sine";
      fund.frequency.setValueAtTime(220, now);
      fund.frequency.exponentialRampToValueAtTime(196, now + 0.19);
      fifth.frequency.setValueAtTime(329.63, now);

      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

      fund.connect(g);
      fifth.connect(g);
      g.connect(this.masterGain);

      fund.start(now);
      fifth.start(now);
      fund.stop(now + 0.22);
      fifth.stop(now + 0.22);
    } else {
      // Light fountain-pen nib click for unstressed syllable
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.065);
      g.gain.setValueAtTime(0.075, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.08);
    }

    if (hasCaesuraAfter) {
      // Gentle breath harmonic at Anglo-Saxon medial caesura ||
      const chime = ctx.createOscillator();
      const cg = ctx.createGain();
      chime.type = "sine";
      chime.frequency.setValueAtTime(880, now + 0.14);
      cg.gain.setValueAtTime(0.001, now + 0.13);
      cg.gain.linearRampToValueAtTime(0.035, now + 0.16);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.29);
      chime.connect(cg);
      cg.connect(this.masterGain);
      chime.start(now + 0.13);
      chime.stop(now + 0.30);
    }
  }

  startShellacCrackle() {
    const ctx = this.ensureContext();
    if (!ctx || this.crackleNodes || !this.shellacCrackleEnabled) return;

    const seconds = 3;
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const out = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      let sample = (b0 + b1 + b2) * 0.14;
      // Occasional 78-rpm shellac dust pop
      if (Math.random() < 0.00065) {
        sample += (Math.random() * 2 - 1) * 0.42;
      }
      out[i] = sample;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1850;
    bp.Q.value = 0.9;

    const gain = ctx.createGain();
    gain.gain.value = 0.09;

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    this.crackleNodes = { src, gain };
  }

  stopShellacCrackle() {
    if (this.crackleNodes) {
      try {
        this.crackleNodes.src.stop();
        this.crackleNodes.src.disconnect();
      } catch (_) {}
      this.crackleNodes = null;
    }
  }

  stopAll() {
    this.activeTimers.forEach((id) => clearTimeout(id));
    this.activeTimers = [];
    this.activeNodes.forEach((node) => {
      try {
        if (typeof node.stop === "function") node.stop();
        node.disconnect();
      } catch (_) {}
    });
    this.activeNodes = [];
    this.stopShellacCrackle();
    this.isPlayingVictrola = false;
    this.isPlayingProsody = false;
  }

  // Synthesize an authentic 1941 Victrola Operatic / Contrapuntal Plate
  playVictrolaPlate(plate, onStepChange, onComplete) {
    this.stopAll();
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.isPlayingVictrola = true;
    if (this.shellacCrackleEnabled) {
      this.startShellacCrackle();
    }

    // Warm 1941 wooden Victrola horn resonance filter
    const hornFilter = ctx.createBiquadFilter();
    hornFilter.type = "lowpass";
    hornFilter.frequency.value = 2650;
    hornFilter.Q.value = 1.15;
    hornFilter.connect(this.masterGain);
    this.activeNodes.push(hornFilter);

    let offsetSec = 0.12;
    const baseTime = ctx.currentTime;

    plate.scoreSteps.forEach((step, idx) => {
      const startAt = baseTime + offsetSec;
      const dur = step.dur;

      // Schedule UI callback
      const uiTimer = setTimeout(() => {
        if (this.isPlayingVictrola && typeof onStepChange === "function") {
          onStepChange(idx, step);
        }
      }, Math.max(0, offsetSec * 1000));
      this.activeTimers.push(uiTimer);

      // Sub-bass voice
      if (step.bass) {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = "triangle";
        bassOsc.frequency.setValueAtTime(step.bass, startAt);
        bassGain.gain.setValueAtTime(0.001, startAt);
        bassGain.gain.linearRampToValueAtTime(0.18, startAt + 0.06);
        bassGain.gain.setValueAtTime(0.15, startAt + dur * 0.72);
        bassGain.gain.exponentialRampToValueAtTime(0.001, startAt + dur * 0.98);

        bassOsc.connect(bassGain);
        bassGain.connect(hornFilter);
        bassOsc.start(startAt);
        bassOsc.stop(startAt + dur);
        this.activeNodes.push(bassOsc);
      }

      // Polyphonic chord voices with slight warm ensemble detuning
      step.notes.forEach((freq, voiceIdx) => {
        const oscA = ctx.createOscillator();
        const oscB = ctx.createOscillator();
        const voiceGain = ctx.createGain();

        oscA.type = step.wave || "triangle";
        oscB.type = "sine";
        oscA.frequency.setValueAtTime(freq, startAt);
        oscB.frequency.setValueAtTime(freq, startAt);
        oscA.detune.value = (voiceIdx % 2 === 0 ? 3.5 : -3.5);

        const peak = 0.085 / Math.sqrt(step.notes.length * 0.5);
        voiceGain.gain.setValueAtTime(0.001, startAt);
        voiceGain.gain.linearRampToValueAtTime(peak, startAt + 0.07);
        voiceGain.gain.setValueAtTime(peak * 0.85, startAt + dur * 0.75);
        voiceGain.gain.exponentialRampToValueAtTime(0.001, startAt + dur * 0.99);

        oscA.connect(voiceGain);
        oscB.connect(voiceGain);
        voiceGain.connect(hornFilter);

        oscA.start(startAt);
        oscB.start(startAt);
        oscA.stop(startAt + dur);
        oscB.stop(startAt + dur);
        this.activeNodes.push(oscA, oscB);
      });

      offsetSec += dur + 0.06;
    });

    const endTimer = setTimeout(() => {
      this.stopShellacCrackle();
      this.isPlayingVictrola = false;
      if (typeof onComplete === "function") onComplete();
    }, (offsetSec + 0.15) * 1000);
    this.activeTimers.push(endTimer);
  }
}

window.AUDEN_STUDIO.audio = new AudenAudioEngine();
