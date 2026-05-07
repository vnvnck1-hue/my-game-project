import { Entity } from "./Entity";
import type { GameContext } from "../core/Types";
import { ENEMY_DEFS, type EnemyDef, type EnemyKind } from "../data/enemies";
import { floorGroundY, FIELD_LEFT, FIELD_RIGHT } from "../core/Stage";
import { Projectile } from "./Projectile";

export class Enemy extends Entity {
  def: EnemyDef;
  attackCD = 0;
  scale: number;
  /** 피격 사망 페이드 */
  deathTimer = 0;

  constructor(kind: EnemyKind, x: number, floor: number, scale: number) {
    const def = ENEMY_DEFS[kind];
    super("enemy", x, floor, floorGroundY(floor), def.hp * scale);
    this.def = def;
    this.scale = scale;
    this.facing = -1;
  }

  effectiveAtk(): number {
    return this.def.atk * this.scale;
  }

  fireProjectile(target: Entity, ctx: GameContext): void {
    if (!this.def.ranged) return;
    const speed = this.def.projectileSpeed ?? 560;
    const color = this.def.projectileColor ?? "#a0e090";
    const startX = this.x + this.facing * 8;
    const startY = this.y - 18;
    const dx = target.x - startX;
    const dy = target.y - 16 - startY;
    const len = Math.max(1, Math.hypot(dx, dy));
    ctx.projectiles.push(
      new Projectile({
        x: startX,
        y: startY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        damage: this.effectiveAtk(),
        side: "enemy",
        color,
        kind: "arrow",
        radius: 3,
        life: 1.6,
        floor: this.floor,
      }),
    );
  }

  update(dt: number, _ctx: GameContext): void {
    if (!this.alive) {
      this.deathTimer += dt;
      return;
    }
    this.attackCD = Math.max(0, this.attackCD - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hitPulse = Math.max(0, this.hitPulse - dt);
    this.landImpulse = Math.max(0, this.landImpulse - dt);
    if (Math.abs(this.knockbackX) > 0.01) {
      this.x += this.knockbackX * dt * 8;
      this.knockbackX *= 1 - dt * 8;
      this.x = Math.max(FIELD_LEFT - 30, Math.min(FIELD_RIGHT + 30, this.x));
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) {
      const a = Math.max(0, 1 - this.deathTimer * 1.6);
      ctx.save();
      ctx.globalAlpha = a;
      this.drawBody(ctx);
      ctx.restore();
      return;
    }
    this.drawBody(ctx);
    this.drawHpBar(ctx);
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const px = this.x;
    const py = this.y;
    // 트윈 합성 (피봇 = 바닥. py는 발 위치라 ctx.scale이 자동으로 바닥 기준 Y)
    // 적 종류마다 살짝 다른 호흡 위상으로 어색함 줄임 — id 사용
    const phase = this.id * 0.7;
    const breathY = 1 + Math.sin(performance.now() * 0.001 * Math.PI * 2 * 2 + phase) * 0.04;
    const hp = this.hitPulse;
    const hitX = 1 + hp * 0.7;
    const hitY = 1 - hp * 0.45;
    const land = this.landImpulse;
    const landY = land > 0 ? 1 - (land / 0.18) * 0.30 : 1;
    const landX = land > 0 ? 1 + (land / 0.18) * 0.20 : 1;
    const scaleX = hitX * landX;
    const scaleY = breathY * hitY * this.jumpStretchY * landY;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(this.facing * scaleX, scaleY);

    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, this.def.radius, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const radius = this.def.radius;
    const bodyW = radius * 1.6;
    const bodyH = this.def.kind === "orc" ? 26 : 18;
    const headSize = this.def.kind === "orc" ? 13 : 11;
    const bodyTop = -bodyH - 4;

    // 몸통
    ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.def.color;
    ctx.fillRect(-bodyW / 2, bodyTop, bodyW, bodyH);

    // 머리
    ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.def.color;
    ctx.fillRect(-headSize / 2, bodyTop - headSize, headSize, headSize);

    // 눈
    ctx.fillStyle = "#ff5050";
    ctx.fillRect(-3, bodyTop - headSize + 4, 2, 2);
    ctx.fillRect(1, bodyTop - headSize + 4, 2, 2);

    // 무기
    if (this.def.kind === "orc") {
      // 도끼
      ctx.fillStyle = "#5a3a20";
      ctx.fillRect(5, bodyTop + 2, 2, bodyH * 0.7);
      ctx.fillStyle = "#aab4be";
      ctx.fillRect(4, bodyTop, 6, 5);
    } else if (this.def.kind === "archer_goblin") {
      // 작은 활
      ctx.strokeStyle = "#6a4020";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(6, bodyTop + bodyH * 0.45, 5, -Math.PI / 2.4, Math.PI / 2.4);
      ctx.stroke();
    } else {
      // 곡도
      ctx.fillStyle = "#aab4be";
      ctx.fillRect(5, bodyTop + 2, 2, bodyH * 0.6);
    }

    // 윤곽선
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = this.def.outline;
    ctx.strokeRect(-bodyW / 2, bodyTop, bodyW, bodyH);
    ctx.strokeRect(-headSize / 2, bodyTop - headSize, headSize, headSize);
    ctx.restore();
  }

  private drawHpBar(ctx: CanvasRenderingContext2D): void {
    const w = 22;
    const h = 3;
    const x = this.x - w / 2;
    const y = this.y - (this.def.kind === "orc" ? 50 : 42);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#3a1212";
    ctx.fillRect(x, y, w, h);
    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = "#ff4660";
    ctx.fillRect(x, y, w * ratio, h);
  }
}
