/* ==========================================================================
   1227 PONTIAC STREET VICTROLA ENGINE (Zero-Dependency Web Audio API)
   Warm Vacuum-Tube Polyphonic Synthesis + Optional 78-RPM Shellac Crackle
   ========================================================================== */

(function () {
  class AudenVictrolaAudio {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.analyser = null;
      this.muted = false;
      this.crackleEnabled = true;
      this.isPlaying = false;
      this.currentRecordId = null;
      this.scheduledTimers = [];
      this.activeNodes = [];
      this.crackleSource = null;
      this.crackleGain = null;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.72;

        // Warm 1941 vacuum-tube horn filter (tames harsh upper harmonics)
        this.hornFilter = this.ctx.createBiquadFilter();
        this.hornFilter.type = "lowpass";
        this.hornFilter.frequency.value = 2350;
        this.hornFilter.Q.value = 0.7;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;

        this.hornFilter.connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    midiToFreq(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    setMuted(flag) {
      this.muted = Boolean(flag);
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime, 0.03);
      }
    }

    setCrackle(flag) {
      this.crackleEnabled = Boolean(flag);
      if (this.crackleGain && this.ctx) {
        this.crackleGain.gain.setTargetAtTime(this.crackleEnabled ? 0.045 : 0, this.ctx.currentTime, 0.05);
      }
    }

    stop() {
      this.scheduledTimers.forEach((t) => clearTimeout(t));
      this.scheduledTimers = [];
      this.activeNodes.forEach((node) => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (_) {}
      });
      this.activeNodes = [];
      if (this.crackleSource) {
        try {
          this.crackleSource.stop();
          this.crackleSource.disconnect();
        } catch (_) {}
        this.crackleSource = null;
      }
      this.isPlaying = false;
      const endedId = this.currentRecordId;
      this.currentRecordId = null;
      if (this._onEndCallback) {
        const cb = this._onEndCallback;
        this._onEndCallback = null;
        cb(endedId);
      }
    }

    startShellacWarmth(durationSec) {
      if (!this.ctx) return;
      const sampleRate = this.ctx.sampleRate;
      const length = Math.max(1, Math.floor(sampleRate * Math.min(durationSec + 1.0, 25)));
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        // Soft brownian surface warmth + occasional tiny shellac dust pop
        lastOut = (lastOut + 0.04 * white) / 1.04;
        const pop = Math.random() < 0.0012 ? (Math.random() * 0.55 - 0.27) : 0;
        data[i] = lastOut * 0.5 + pop;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 1400;
      bandpass.Q.value = 0.9;

      const gain = this.ctx.createGain();
      gain.gain.value = this.crackleEnabled ? 0.045 : 0;

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.hornFilter);

      noise.start();
      this.crackleSource = noise;
      this.crackleGain = gain;
      this.activeNodes.push(noise, bandpass, gain);
    }

    playVoice(midi, startTime, durationSec, velocity) {
      if (!this.ctx || !midi || midi <= 0) return;
      const freq = this.midiToFreq(midi);

      // Rich chamber-orchestra blend: warm triangle body + gentle detuned sawtooth overtone
      const oscMain = this.ctx.createOscillator();
      const oscWarm = this.ctx.createOscillator();
      oscMain.type = "triangle";
      oscWarm.type = "sawtooth";

      oscMain.frequency.setValueAtTime(freq, startTime);
      oscWarm.frequency.setValueAtTime(freq * 1.0025, startTime); // Subtle analog ensemble warmth

      // Slight gentle vibrato on sustained notes
      if (durationSec > 0.65) {
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 5.1;
        lfoGain.gain.value = freq * 0.004;
        lfo.connect(lfoGain);
        lfoGain.connect(oscMain.frequency);
        lfo.start(startTime + 0.12);
        lfo.stop(startTime + durationSec + 0.08);
        this.activeNodes.push(lfo, lfoGain);
      }

      const mixWarm = this.ctx.createGain();
      mixWarm.gain.value = 0.22;

      const env = this.ctx.createGain();
      const peak = Math.min(0.24, Math.max(0.04, velocity * 0.16));
      const attack = Math.min(0.08, durationSec * 0.2);
      const release = Math.min(0.22, durationSec * 0.35);

      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(peak, startTime + attack);
      env.gain.setValueAtTime(peak * 0.86, Math.max(startTime + attack, startTime + durationSec - release));
      env.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec + 0.04);

      oscMain.connect(env);
      oscWarm.connect(mixWarm);
      mixWarm.connect(env);
      env.connect(this.hornFilter);

      oscMain.start(startTime);
      oscWarm.start(startTime);
      oscMain.stop(startTime + durationSec + 0.06);
      oscWarm.stop(startTime + durationSec + 0.06);

      this.activeNodes.push(oscMain, oscWarm, mixWarm, env);
    }

    playRecord(record, callbacks = {}) {
      this.stop();
      const ctx = this.ensureContext();
      this.currentRecordId = record.id;
      this.isPlaying = true;
      this._onEndCallback = callbacks.onEnd || null;

      const beatSec = 60 / (record.tempoBpm || 84);
      const steps = record.motifNotes || [];
      let totalSec = 0.25;
      steps.forEach((step) => {
        totalSec += (step[1] || 1) * beatSec;
      });

      if (ctx) {
        const baseTime = ctx.currentTime + 0.2;
        this.startShellacWarmth(totalSec);

        let cursor = 0;
        steps.forEach((step, idx) => {
          const notes = Array.isArray(step[0]) ? step[0] : [step[0]];
          const durSec = (step[1] || 1) * beatSec;
          const vel = step[2] !== undefined ? step[2] : 0.8;
          const perNoteScale = notes.length > 1 ? 1 / Math.sqrt(notes.length) : 1;

          notes.forEach((n) => {
            if (n > 0) {
              this.playVoice(n, baseTime + cursor, durSec * 0.96, vel * perNoteScale);
            }
          });

          const timer = setTimeout(() => {
            if (this.isPlaying && callbacks.onStep) {
              callbacks.onStep(idx, steps.length);
            }
          }, Math.max(0, (cursor + 0.15) * 1000));
          this.scheduledTimers.push(timer);

          cursor += durSec;
        });
      } else {
        // Fallback timer progression even if browser has no Web Audio
        let cursor = 0;
        steps.forEach((step, idx) => {
          const durSec = (step[1] || 1) * beatSec;
          const timer = setTimeout(() => {
            if (this.isPlaying && callbacks.onStep) {
              callbacks.onStep(idx, steps.length);
            }
          }, cursor * 1000);
          this.scheduledTimers.push(timer);
          cursor += durSec;
        });
      }

      const endTimer = setTimeout(() => {
        this.stop();
      }, (totalSec + 0.35) * 1000);
      this.scheduledTimers.push(endTimer);
    }

    playChalkTick() {
      if (this.muted) return;
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520 + Math.random() * 140, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.045);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.055);
    }

    playStampThud() {
      if (this.muted) return;
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(155, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.11);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
    }

    getWaveformSnapshot(targetArray) {
      if (this.analyser && this.isPlaying && !this.muted) {
        this.analyser.getByteTimeDomainData(targetArray);
        return true;
      }
      return false;
    }
  }

  window.audenAudio = new AudenVictrolaAudio();
})();
