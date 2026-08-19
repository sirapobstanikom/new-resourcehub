// Procedural 8-bit Web Audio Synthesizer

class SoundEffects {
  private ctx: AudioContext | null = null;
  private marioBgmRunning = false;
  private marioBgmTimer: number | null = null;
  private marioBgmStep = 0;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playCoinSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      
      // Classic Mario Coin sound: B5 (987.77 Hz) for 0.08s then E6 (1318.51 Hz) for 0.25s
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  playBumpSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  playPowerupSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      });
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  playFailSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const notes = [523.25, 392.0, 329.63, 261.63, 196.0, 130.81];
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      });
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  private playMarioBgmTone(freq: number, when: number, durationSec: number, volume: number) {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, when);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(when);
    osc.stop(when + durationSec + 0.02);
  }

  /**
   * BGM สไตล์ Mario แบบ procedural (ไม่มีไฟล์เสียง)
   * เริ่มได้เมื่อผู้เล่นกด/คลิก (กัน autoplay ถูกบล็อก)
   */
  playMarioBgm() {
    try {
      if (this.marioBgmRunning) return;
      this.marioBgmRunning = true;
      this.marioBgmStep = 0;

      const ctx = this.getContext();
      ctx.resume();

      const stepSec = 0.12; // จังหวะเพลง
      const volume = 0.035; // เบากว่า SFX

      // ลายทำนองแบบ simplified (จำลองบรรยากาศ Mario)
      // ตัวเลขเป็นความถี่ (Hz) และ len เป็นจำนวน step
      const seq: Array<{ f: number; len: number }> = [
        { f: 659.25, len: 1 }, // E5
        { f: 659.25, len: 1 },
        { f: 659.25, len: 1 },
        { f: 523.25, len: 1 }, // C5
        { f: 659.25, len: 1 },
        { f: 783.99, len: 2 }, // G5
        { f: 587.33, len: 1 }, // D5
        { f: 523.25, len: 1 }, // C5
        { f: 493.88, len: 2 }, // B4
        { f: 523.25, len: 1 }, // C5
        { f: 587.33, len: 1 }, // D5
        { f: 659.25, len: 2 }, // E5
        { f: 0, len: 1 }, // rest
        { f: 523.25, len: 1 },
        { f: 493.88, len: 1 },
        { f: 440.0, len: 2 }, // A4
      ];

      const tick = () => {
        if (!this.marioBgmRunning) return;
        const now = ctx.currentTime;
        const i = this.marioBgmStep % seq.length;
        const note = seq[i];
        const duration = stepSec * note.len;
        if (note.f > 0) {
          this.playMarioBgmTone(note.f, now, duration, volume);
        }
        this.marioBgmStep++;
        this.marioBgmTimer = window.setTimeout(tick, Math.round(stepSec * 1000 * 0.98));
      };

      tick();
    } catch (e) {
      console.warn('Mario BGM error', e);
      this.stopMarioBgm();
    }
  }

  stopMarioBgm() {
    this.marioBgmRunning = false;
    if (this.marioBgmTimer != null) {
      window.clearTimeout(this.marioBgmTimer);
      this.marioBgmTimer = null;
    }
  }
}

export const soundEffects = new SoundEffects();
