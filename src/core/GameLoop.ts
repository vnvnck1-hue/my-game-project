export type TickFn = (dt: number) => void;

export class GameLoop {
  private running = false;
  private lastT = 0;
  private rafId = 0;
  paused = false;
  /** dt 캡 (탭 비활성화 후 복귀 등) */
  private maxDt = 0.0666;

  constructor(private tick: TickFn) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dtSec = Math.min((t - this.lastT) / 1000, this.maxDt);
      this.lastT = t;
      if (!this.paused) this.tick(dtSec);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }
}
