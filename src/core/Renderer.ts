import { STAGE_W, STAGE_H } from "./Stage";

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly width = STAGE_W;
  readonly height = STAGE_H;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = STAGE_W;
    canvas.height = STAGE_H;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.fitToContainer();
    window.addEventListener("resize", () => this.fitToContainer());
  }

  /** 부모 컨테이너(#frame)는 480x854 고정. 디바이스 컨테이너(#device) 안에서 CSS scale로 뷰포트 핏 */
  private fitToContainer(): void {
    const frame = document.getElementById("frame");
    if (!frame) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sx = vw / STAGE_W;
    const sy = vh / STAGE_H;
    const s = Math.min(sx, sy, 1.5);
    frame.style.transform = `scale(${s})`;
  }

  clear(): void {
    this.ctx.fillStyle = "#0d0a18";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
