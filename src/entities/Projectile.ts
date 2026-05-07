import type { GameContext } from "../core/Types";
import type { Side } from "./Entity";
import { Entity } from "./Entity";
import { Enemy } from "./Enemy";
import { Character, applyLifesteal } from "./Character";
import { spawnFloatingText, spawnParticleBurst } from "../effects/Effects";

export type ProjectileKind = "arrow" | "magic" | "meteor";

export interface ProjectileInit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  side: Side;
  color: string;
  kind: ProjectileKind;
  radius: number;
  life: number;
  floor: number;
  /** 폭발 시 반경 — magic/meteor 등 */
  blastRadius?: number;
  /** 발사한 캐릭터(흡혈 적용을 위해) */
  source?: Character;
  /** 치명타 여부 */
  crit?: boolean;
  /** 메테오 같은 표시 강조용 스케일 */
  scale?: number;
}

export class Projectile {
  alive = true;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  side: Side;
  color: string;
  kind: ProjectileKind;
  radius: number;
  life: number;
  floor: number;
  blastRadius?: number;
  source?: Character;
  crit: boolean;
  scale: number;

  constructor(init: ProjectileInit) {
    this.x = init.x;
    this.y = init.y;
    this.vx = init.vx;
    this.vy = init.vy;
    this.damage = init.damage;
    this.side = init.side;
    this.color = init.color;
    this.kind = init.kind;
    this.radius = init.radius;
    this.life = init.life;
    this.floor = init.floor;
    this.blastRadius = init.blastRadius;
    this.source = init.source;
    this.crit = init.crit ?? false;
    this.scale = init.scale ?? 1;
  }

  update(dt: number, ctx: GameContext): void {
    if (!this.alive) return;
    this.life -= dt;
    if (this.kind === "meteor") {
      this.vy += 380 * dt; // 중력
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.life <= 0) {
      this.detonate(ctx);
      return;
    }
    if (this.x < -50 || this.x > 530 || this.y < -50 || this.y > 900) {
      this.alive = false;
      return;
    }
    // 충돌
    const targets = this.side === "ally" ? ctx.enemies : ctx.allies;
    for (const t of targets) {
      if (!t.alive) continue;
      if (Math.abs(t.x - this.x) < 14 + this.radius && Math.abs(t.y - 16 - this.y) < 18) {
        this.hit(t, ctx);
        return;
      }
    }
  }

  private hit(target: Entity, ctx: GameContext): void {
    if (this.blastRadius && this.blastRadius > 0) {
      this.detonate(ctx);
      return;
    }
    const dmg = Math.round(this.damage);
    const dead = target.takeDamage(dmg);
    const kbBase = dead ? 30 : 10;
    target.knockbackX = (this.vx > 0 ? 1 : -1) * kbBase * (this.crit ? 3 : 1);
    spawnFloatingText(
      ctx.floatingTexts,
      target.x + (Math.random() - 0.5) * 6,
      target.y - 30,
      this.crit ? `${dmg}!` : `${dmg}`,
      this.crit ? "#ffd86b" : "#ffffff",
      this.crit ? 1.3 : 1,
    );
    spawnParticleBurst(ctx.particles, target.x, target.y - 16, this.crit ? 8 : 4, this.color, 140, {
      shape: "spark",
      size: 4,
      maxLife: 0.35,
    });
    if (dead && this.source) applyLifesteal(this.source, dmg, ctx);
    if (dead && target instanceof Enemy) ctx.camera.shake(2);
    this.alive = false;
  }

  private detonate(ctx: GameContext): void {
    if (!this.blastRadius || this.blastRadius <= 0) {
      this.alive = false;
      return;
    }
    const r = this.blastRadius;
    const cx = this.x;
    const cy = this.y;
    const targets = this.side === "ally" ? ctx.enemies : ctx.allies;
    let killed = 0;
    for (const t of targets) {
      if (!t.alive) continue;
      const dx = t.x - cx;
      const dy = t.y - 16 - cy;
      if (dx * dx + dy * dy <= r * r) {
        const falloff = 1 - Math.min(1, Math.hypot(dx, dy) / r) * 0.4;
        const dmg = Math.round(this.damage * falloff);
        const dead = t.takeDamage(dmg);
        const kbBase = dead ? 28 : 14;
        t.knockbackX = (dx >= 0 ? 1 : -1) * kbBase * (this.crit ? 3 : 1);
        spawnFloatingText(
          ctx.floatingTexts,
          t.x,
          t.y - 30,
          this.crit ? `${dmg}!` : `${dmg}`,
          this.crit ? "#ffd86b" : "#ffe9a8",
          this.crit ? 1.3 : 1,
        );
        if (dead) killed++;
        if (dead && this.source) applyLifesteal(this.source, dmg, ctx);
      }
    }
    // 폭발 파티클
    const ringColor = this.kind === "meteor" ? "#ff8a3a" : "#ffd86b";
    spawnParticleBurst(ctx.particles, cx, cy, 18, ringColor, 220, {
      shape: "spark",
      size: 6,
      maxLife: 0.45,
    });
    spawnParticleBurst(ctx.particles, cx, cy, 10, "#ff4a1a", 120, {
      shape: "circle",
      size: 4,
      maxLife: 0.5,
    });
    ctx.camera.shake(this.kind === "meteor" ? 9 : 4 + killed);
    if (this.kind === "meteor") ctx.camera.flash("#ffe9a8", 0.45);
    this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;
    if (this.kind === "arrow") {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.atan2(this.vy, this.vx));
      ctx.fillStyle = this.color;
      ctx.fillRect(-7, -1, 12, 2);
      ctx.fillStyle = "#fff";
      ctx.fillRect(4, -2, 4, 4);
      ctx.restore();
    } else if (this.kind === "magic") {
      const r = this.radius * this.scale;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 1.6);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.5, this.color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // meteor
      const r = this.radius * this.scale;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 2);
      grad.addColorStop(0, "#fff8d8");
      grad.addColorStop(0.5, "#ff8a3a");
      grad.addColorStop(1, "rgba(255,40,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 2, 0, Math.PI * 2);
      ctx.fill();
      // 꼬리
      ctx.strokeStyle = "rgba(255,160,80,0.6)";
      ctx.lineWidth = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.06, this.y - this.vy * 0.06);
      ctx.stroke();
    }
  }
}
