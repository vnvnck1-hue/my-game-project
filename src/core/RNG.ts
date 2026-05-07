/** Mulberry32 — 시드 가능한 빠른 PRNG */
export class RNG {
  private state: number;

  constructor(seed = Date.now() & 0xffffffff) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) 범위 실수 */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** [min, max] 범위 정수 */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** 0~1 임계값보다 next()가 작으면 true */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** 가중치 배열에서 인덱스 선택 */
  weighted(weights: number[]): number {
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * sum;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  /** 배열에서 중복 없이 n개 뽑기 (Fisher-Yates 부분 셔플) */
  pickN<T>(arr: readonly T[], n: number): T[] {
    const copy = arr.slice();
    const out: T[] = [];
    const count = Math.min(n, copy.length);
    for (let i = 0; i < count; i++) {
      const j = this.int(i, copy.length - 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
      out.push(copy[i]);
    }
    return out;
  }
}

export const rng = new RNG();
