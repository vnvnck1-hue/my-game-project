export type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
  easeInQuad: (t: number) => t * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export interface Tween {
  duration: number;
  elapsed: number;
  easing: EasingFn;
  onUpdate: (t: number) => void;
  onComplete?: () => void;
  done: boolean;
}

export class TweenManager {
  private tweens: Tween[] = [];

  add(
    duration: number,
    onUpdate: (t: number) => void,
    easing: EasingFn = Easing.easeOutQuad,
    onComplete?: () => void,
  ): Tween {
    const tween: Tween = { duration, elapsed: 0, easing, onUpdate, onComplete, done: false };
    this.tweens.push(tween);
    return tween;
  }

  update(dt: number): void {
    for (const tw of this.tweens) {
      if (tw.done) continue;
      tw.elapsed += dt;
      const t = Math.min(tw.elapsed / tw.duration, 1);
      tw.onUpdate(tw.easing(t));
      if (t >= 1) {
        tw.done = true;
        tw.onComplete?.();
      }
    }
    this.tweens = this.tweens.filter((tw) => !tw.done);
  }

  clear(): void {
    this.tweens = [];
  }
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
