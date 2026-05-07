export class Camera {
  shakeAmount = 0;
  shakeDecay = 8;
  offsetX = 0;
  offsetY = 0;
  flashAlpha = 0;
  flashColor = "#ffffff";

  /** 입력 강도를 절반으로 적용 — 강한 쉐이킹 시 어지러움 완화 */
  static readonly INTENSITY = 0.5;
  shake(amount: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount * Camera.INTENSITY);
  }

  flash(color = "#ffffff", alpha = 0.3): void {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
  }

  update(dt: number): void {
    if (this.shakeAmount > 0.01) {
      const a = this.shakeAmount;
      this.offsetX = (Math.random() - 0.5) * 2 * a;
      this.offsetY = (Math.random() - 0.5) * 2 * a;
      this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeDecay * dt);
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
      this.shakeAmount = 0;
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.4);
    }
  }

  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
  }

  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  drawFlash(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.flashAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.flashAlpha;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
