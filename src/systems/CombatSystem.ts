import type { GameContext } from "../core/Types";
import { Character, applyLifesteal } from "../entities/Character";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { spawnFloatingText, spawnParticleBurst } from "../effects/Effects";

export class CombatSystem {
  /**
   * 전사 근접 — 정면 부채꼴 안의 적을 모두 타격(반달 베기 느낌).
   */
  warriorMelee(c: Character, ctx: GameContext): void {
    c.triggerAttack();
    const reach = c.def.range + 14;
    const baseDmg = c.effectiveAtk();
    const crit = Math.random() < c.effectiveCritRate();
    const dmg = Math.round(baseDmg * (crit ? 2 : 1));
    let hits = 0;
    let lastTarget: Enemy | null = null;
    for (const en of ctx.enemies) {
      if (!(en instanceof Enemy) || !en.alive) continue;
      if (en.floor !== c.floor) continue;
      const dx = en.x - c.x;
      if (Math.sign(dx) !== c.facing && Math.abs(dx) > 6) continue;
      if (Math.abs(dx) > reach) continue;
      const dead = en.takeDamage(dmg);
      en.knockbackX = c.facing * (dead ? 36 : 18);
      hits++;
      lastTarget = en;
      spawnFloatingText(
        ctx.floatingTexts,
        en.x + (Math.random() - 0.5) * 6,
        en.y - 30,
        crit ? `${dmg}!` : `${dmg}`,
        crit ? "#ffd86b" : "#ffffff",
        crit ? 1.3 : 1,
      );
      spawnParticleBurst(ctx.particles, en.x, en.y - 16, crit ? 8 : 4, "#ffd86b", 130, {
        shape: "spark",
        size: 4,
        maxLife: 0.35,
      });
      if (dead) applyLifesteal(c, dmg, ctx);
    }
    if (hits > 0) {
      ctx.camera.shake(2 + (crit ? 2 : 0));
      // 반달 슬래시 자취
      this.drawSlashTrail(ctx, c);
    }
    void lastTarget;
  }

  archerShoot(c: Character, target: Enemy, ctx: GameContext): void {
    c.triggerAttack();
    const baseDmg = c.effectiveAtk();
    const crit = Math.random() < c.effectiveCritRate();
    const dmg = baseDmg * (crit ? 2 : 1);
    const startX = c.x + c.facing * 10;
    const startY = c.y - 22;
    const dx = target.x - startX;
    const dy = target.y - 16 - startY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const speed = 840;
    ctx.projectiles.push(
      new Projectile({
        x: startX,
        y: startY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        damage: dmg,
        side: "ally",
        color: "#a3e0a8",
        kind: "arrow",
        radius: 3,
        life: 1.4,
        floor: c.floor,
        source: c,
        crit,
      }),
    );
  }

  mageCast(c: Character, target: Enemy, ctx: GameContext): void {
    c.triggerAttack();
    const baseDmg = c.effectiveAtk();
    const crit = Math.random() < c.effectiveCritRate();
    const dmg = baseDmg * (crit ? 2 : 1);
    const startX = c.x + c.facing * 10;
    const startY = c.y - 24;
    const dx = target.x - startX;
    const dy = target.y - 16 - startY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const speed = 720;
    const blastBoost = 1 + (c.mods?.blastPct ?? 0) / 100;
    ctx.projectiles.push(
      new Projectile({
        x: startX,
        y: startY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        damage: dmg,
        side: "ally",
        color: "#9d6cff",
        kind: "magic",
        radius: 6,
        life: 1.6,
        floor: c.floor,
        blastRadius: 36 * blastBoost,
        source: c,
        crit,
      }),
    );
  }

  enemyMelee(e: Enemy, target: Character, ctx: GameContext): void {
    e.attackCD = e.def.attackInterval;
    const dmg = Math.round(e.effectiveAtk());
    const dead = target.takeDamage(dmg);
    target.knockbackX = -e.facing * (dead ? 24 : 8);
    spawnFloatingText(ctx.floatingTexts, target.x, target.y - 30, `${dmg}`, "#ff6b8a", 1);
    spawnParticleBurst(ctx.particles, target.x, target.y - 16, 4, "#ff4a4a", 100, {
      shape: "spark",
      size: 3,
      maxLife: 0.3,
    });
    if (dead) ctx.camera.shake(3);
  }

  enemyRanged(e: Enemy, target: Character, ctx: GameContext): void {
    e.attackCD = e.def.attackInterval;
    e.fireProjectile(target, ctx);
  }

  /** 슬래시 자취 — 입자로 가짜 호 그리기 */
  private drawSlashTrail(ctx: GameContext, c: Character): void {
    const cx = c.x + c.facing * 10;
    const cy = c.y - 18;
    for (let i = 0; i < 10; i++) {
      const ang = -0.6 + (i / 9) * 1.2;
      const r = 26 + Math.random() * 6;
      const x = cx + Math.cos(ang) * r * c.facing;
      const y = cy + Math.sin(ang) * r;
      ctx.particles.push({
        x,
        y,
        vx: c.facing * 30,
        vy: 0,
        life: 0.18,
        maxLife: 0.18,
        size: 3,
        color: "#fff7c8",
        alive: true,
        shape: "circle",
        gravity: 0,
      });
    }
  }
}
