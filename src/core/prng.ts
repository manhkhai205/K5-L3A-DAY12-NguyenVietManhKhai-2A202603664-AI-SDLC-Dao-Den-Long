/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 * Used across src/core/ to guarantee 100% deterministic headless execution.
 * Never use Math.random() in src/core/.
 */
export class PRNG {
  private state: number;

  constructor(seed: number | string = 12345) {
    this.state = typeof seed === 'string' ? PRNG.hashString(seed) : seed >>> 0;
    if (this.state === 0) {
      this.state = 1;
    }
  }

  public static hashString(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Returns a deterministic float in [0, 1) */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a deterministic float in [min, max) */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Alias for range(min, max) */
  public nextRange(min: number, max: number): number {
    return this.range(min, max);
  }

  /** Returns a deterministic integer in [min, max] inclusive */
  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public getState(): number {
    return this.state >>> 0;
  }
}
