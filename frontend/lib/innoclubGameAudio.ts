/** Procedural suspense / reveal audio for InnoClub Game results (Web Audio API) */

type AudioNodes = {
  master: GainNode;
  droneOscA: OscillatorNode;
  droneOscB: OscillatorNode;
  droneGain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  tickTimer: number | null;
};

class InnoClubGameAudio {
  private ctx: AudioContext | null = null;
  private nodes: AudioNodes | null = null;
  private muted = false;
  private suspenseRunning = false;
  private unlocked = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.unlocked = true;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.nodes) {
      const now = this.getContext().currentTime;
      this.nodes.master.gain.cancelScheduledValues(now);
      this.nodes.master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.05);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  async startSuspense() {
    try {
      await this.unlock();
      if (this.suspenseRunning) return;

      const ctx = this.getContext();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 1;
      master.connect(ctx.destination);

      // Low ominous drone
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.0001;
      droneGain.connect(master);

      const droneOscA = ctx.createOscillator();
      droneOscA.type = 'sawtooth';
      droneOscA.frequency.value = 55;
      const filterA = ctx.createBiquadFilter();
      filterA.type = 'lowpass';
      filterA.frequency.value = 180;
      filterA.Q.value = 4;
      droneOscA.connect(filterA);
      filterA.connect(droneGain);

      const droneOscB = ctx.createOscillator();
      droneOscB.type = 'triangle';
      droneOscB.frequency.value = 82.5;
      const filterB = ctx.createBiquadFilter();
      filterB.type = 'lowpass';
      filterB.frequency.value = 220;
      droneOscB.connect(filterB);
      filterB.connect(droneGain);

      // Heartbeat-style amplitude LFO
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 1.15;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.045;
      lfo.connect(lfoGain);
      lfoGain.connect(droneGain.gain);

      const now = ctx.currentTime;
      droneGain.gain.setValueAtTime(0.0001, now);
      droneGain.gain.exponentialRampToValueAtTime(0.07, now + 1.4);

      droneOscA.start(now);
      droneOscB.start(now);
      lfo.start(now);

      // Rising tension ticks
      let tickStep = 0;
      const tickTimer = window.setInterval(() => {
        if (this.muted || !this.suspenseRunning) return;
        this.playTick(tickStep);
        tickStep += 1;
      }, 920);

      this.nodes = { master, droneOscA, droneOscB, droneGain, lfo, lfoGain, tickTimer };
      this.suspenseRunning = true;
    } catch (e) {
      console.warn('InnoClub suspense audio failed:', e);
    }
  }

  private playTick(step: number) {
    try {
      const ctx = this.getContext();
      if (!this.nodes) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 880 + (step % 4) * 90;
      filter.Q.value = 8;
      osc.type = 'square';
      osc.frequency.value = 220 + (step % 5) * 18;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.nodes.master);
      osc.start(now);
      osc.stop(now + 0.14);

      // Occasional deeper thump
      if (step % 2 === 0) {
        const thump = ctx.createOscillator();
        const thumpGain = ctx.createGain();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(90, now);
        thump.frequency.exponentialRampToValueAtTime(42, now + 0.18);
        thumpGain.gain.setValueAtTime(0.0001, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        thump.connect(thumpGain);
        thumpGain.connect(this.nodes.master);
        thump.start(now);
        thump.stop(now + 0.24);
      }
    } catch {
      /* ignore */
    }
  }

  stopSuspense(fadeMs = 500) {
    if (!this.nodes || !this.ctx) {
      this.suspenseRunning = false;
      return;
    }
    const { master, droneOscA, droneOscB, droneGain, lfo, tickTimer } = this.nodes;
    if (tickTimer != null) window.clearInterval(tickTimer);

    try {
      const now = this.ctx.currentTime;
      const fade = Math.max(0.05, fadeMs / 1000);
      droneGain.gain.cancelScheduledValues(now);
      droneGain.gain.setValueAtTime(Math.max(0.0001, droneGain.gain.value), now);
      droneGain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      master.gain.cancelScheduledValues(now);
      window.setTimeout(() => {
        try {
          droneOscA.stop();
          droneOscB.stop();
          lfo.stop();
        } catch {
          /* already stopped */
        }
      }, fadeMs + 40);
    } catch {
      /* ignore */
    }

    this.nodes = null;
    this.suspenseRunning = false;
  }

  /** Rising whoosh + impact + short triumphant hit for champion reveal */
  async playReveal() {
    try {
      await this.unlock();
      this.stopSuspense(280);
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 1;
      master.connect(ctx.destination);

      // Rising sweep
      const sweep = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      const sweepFilter = ctx.createBiquadFilter();
      sweep.type = 'sawtooth';
      sweepFilter.type = 'lowpass';
      sweepFilter.frequency.setValueAtTime(200, now);
      sweepFilter.frequency.exponentialRampToValueAtTime(4200, now + 1.15);
      sweep.frequency.setValueAtTime(110, now);
      sweep.frequency.exponentialRampToValueAtTime(880, now + 1.15);
      sweepGain.gain.setValueAtTime(0.0001, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.12, now + 0.35);
      sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      sweep.connect(sweepFilter);
      sweepFilter.connect(sweepGain);
      sweepGain.connect(master);
      sweep.start(now);
      sweep.stop(now + 1.25);

      // Noise whoosh (buffer)
      const noiseDuration = 1.1;
      const bufferSize = Math.floor(ctx.sampleRate * noiseDuration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(400, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.9);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.08, now + 0.25);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);
      noise.stop(now + noiseDuration);

      // Impact boom
      const boomAt = now + 1.15;
      const boom = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(140, boomAt);
      boom.frequency.exponentialRampToValueAtTime(38, boomAt + 0.55);
      boomGain.gain.setValueAtTime(0.0001, boomAt);
      boomGain.gain.exponentialRampToValueAtTime(0.35, boomAt + 0.02);
      boomGain.gain.exponentialRampToValueAtTime(0.0001, boomAt + 0.7);
      boom.connect(boomGain);
      boomGain.connect(master);
      boom.start(boomAt);
      boom.stop(boomAt + 0.75);

      // Triumphant chord
      const chordAt = boomAt + 0.05;
      const chordFreqs = [261.63, 329.63, 392.0, 523.25];
      chordFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, chordAt);
        gain.gain.exponentialRampToValueAtTime(0.09, chordAt + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, chordAt + 1.6);
        osc.connect(gain);
        gain.connect(master);
        osc.start(chordAt);
        osc.stop(chordAt + 1.7);
      });

      // Sparkle chimes over money count
      for (let i = 0; i < 8; i += 1) {
        const t = chordAt + 0.15 + i * 0.14;
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.value = 1200 + i * 160;
        chimeGain.gain.setValueAtTime(0.0001, t);
        chimeGain.gain.exponentialRampToValueAtTime(0.035, t + 0.02);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        chime.connect(chimeGain);
        chimeGain.connect(master);
        chime.start(t);
        chime.stop(t + 0.22);
      }
    } catch (e) {
      console.warn('InnoClub reveal audio failed:', e);
    }
  }

  dispose() {
    this.stopSuspense(100);
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
    this.unlocked = false;
  }
}

export const innoclubGameAudio = new InnoClubGameAudio();
