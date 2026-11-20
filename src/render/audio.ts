/**
 * 100% Procedural Web Audio Synthesizer ("Sáng tạo của tôi" - Category F)
 * Supports all required sound cues across Phase 1 & Phase 2.
 */
export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public volume = 0.8;

  private ensureContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainLevel = 0.14,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(gainLevel * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  public playFireflyPickup(): void {
    this.playTone(587.33, 880, 0.16, 'sine', 0.14);
  }

  public playLanternLit(): void {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, idx) => this.playTone(f, f, 0.5, 'triangle', 0.12, idx * 0.06));
  }

  public playPulse(): void {
    this.playTone(330, 990, 0.28, 'sine', 0.16);
  }

  public playShadowHit(): void {
    this.playTone(160, 55, 0.28, 'sawtooth', 0.18);
  }

  public playJump(): void {
    this.playTone(240, 480, 0.14, 'sine', 0.1);
  }

  public playDash(): void {
    this.playTone(520, 260, 0.15, 'triangle', 0.12);
  }

  public playShadeSpawn(): void {
    this.playTone(110, 82.4, 0.35, 'sawtooth', 0.09);
  }

  public playWin(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.playTone(f, f, 0.45, 'triangle', 0.15, i * 0.09)
    );
  }

  public playLose(): void {
    [392.0, 349.23, 329.63, 261.63].forEach((f, i) =>
      this.playTone(f, f, 0.45, 'sawtooth', 0.14, i * 0.11)
    );
  }

  public playCountdownTick(): void {
    this.playTone(880, 880, 0.07, 'square', 0.08);
  }
}
