import type { GameContext } from "../core/Types";
import { Character } from "../entities/Character";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { spawnFloatingText, spawnParticleBurst } from "../effects/Effects";

/**
 * 마나가 풀이면 자동으로 궁극기 발동.
 */
export class UltimateSystem {
  update(_dt: number, ctx: GameContext): void {
    for (const c of ctx.allies) {
      if (!(c instanceof Character)) continue;
      if (!c.alive) continue;
      if (c.mana < c.def.ultMana) continue;
      // 적이 없으면 보류
      const anyEnemy = ctx.enemies.some((e) => e.alive);
      if (!anyEnemy) continue;
      this.cast(c, ctx);
    }
  }

  private cast(c: Character, ctx: GameContext): void {
    c.mana = 0;
    if (c.def.className === "warrior") {
      this.warriorTaunt(c, ctx);
    } else if (c.def.className === "archer") {
      this.archerStorm(c, ctx);
    } else {
      this.mageMeteor(c, ctx);
    }
    spawnFloatingText(ctx.floatingTexts, c.x, c.y - 56, "ULT!", "#ffd86b", 1.5);
    ctx.camera.flash("#ffd86b", 0.25);
    ctx.camera.shake(6);
  }

  /** 전사 — 광역 도발 공격: 주변 적 큰 피해 + 강한 넉백 */
  private warriorTaunt(c: Character, ctx: GameContext): void {
    const radius = 110;
    const baseDmg = c.effectiveAtk() * 3;
    spawnParticleBurst(ctx.particles, c.x, c.y - 16, 36, "#ff8a3a", 280, {
      shape: "spark",
      size: 7,
      maxLife: 0.55,
    });
    spawnParticleBurst(ctx.particles, c.x, c.y - 16, 16, "#ffd86b", 160, {
      shape: "circle",
      size: 5,
      maxLife: 0.5,
    });
    for (const e of ctx.enemies) {
      if (!(e instanceof Enemy) || !e.alive) continue;
      const dx = e.x - c.x;
      const dy = e.y - 16 - (c.y - 16);
      if (dx * dx + dy * dy <= radius * radius) {
        const crit = Math.random() < c.effectiveCritRate();
        const dmg = Math.round(baseDmg * (crit ? 1.5 : 1));
        const dead = e.takeDamage(dmg);
        e.knockbackX = (dx >= 0 ? 1 : -1) * 50;
        spawnFloatingText(ctx.floatingTexts, e.x, e.y - 30, `${dmg}!`, "#ffd86b", 1.4);
        if (dead) ctx.camera.shake(2);
      }
    }
  }

  /** 궁수 — 화살 폭풍: 사거리 안 적 모두에게 다단 화살 */
  private archerStorm(c: Character, ctx: GameContext): void {
    const dmg = c.effectiveAtk() * 0.85;
    const startX = c.x;
    const startY = c.y - 22;
    let waves = 0;
    const fire = () => {
      const targets = ctx.enemies.filter((e) => e.alive).slice(0, 8);
      for (const t of targets) {
        const dx = t.x - startX;
        const dy = t.y - 16 - startY;
        const len = Math.max(1, Math.hypot(dx, dy));
        const speed = 960;
        ctx.projectiles.push(
          new Projectile({
            x: startX,
            y: startY,
            vx: (dx / len) * speed + (Math.random() - 0.5) * 80,
            vy: (dy / len) * speed + (Math.random() - 0.5) * 60,
            damage: dmg,
            side: "ally",
            color: "#a3ffb0",
            kind: "arrow",
            radius: 3,
            life: 1.4,
            floor: c.floor,
            source: c,
          }),
        );
      }
      waves++;
      if (waves < 3) setTimeout(fire, 180);
    };
    fire();
  }

  /** 마법사 — 메테오 (무작위 위치 3개) */
  private mageMeteor(c: Character, ctx: GameContext): void {
    const dmg = c.effectiveAtk() * 2.4;
    const blastBoost = 1 + (c.mods?.blastPct ?? 0) / 100;
    const drops = 3;
    for (let i = 0; i < drops; i++) {
      // 적이 있으면 적 위치 근처 중심
      const candidates = ctx.enemies.filter((e) => e.alive);
      let tx = 240;
      let tfloor = c.floor;
      if (candidates.length > 0) {
        const t = candidates[Math.floor(Math.random() * candidates.length)];
        tx = t.x + (Math.random() - 0.5) * 40;
        tfloor = t.floor;
      }
      const startX = tx + (Math.random() - 0.5) * 80;
      const startY = -50 - i * 20;
      const targetY = c.y - 20;
      // 위에서 아래로 떨어지는 메테오 — life 시간 후 detonate
      const time = 0.55 + i * 0.15;
      const vy = (targetY - startY) / time;
      const vx = (tx - startX) / time;
      void tfloor;
      ctx.projectiles.push(
        new Projectile({
          x: startX,
          y: startY,
          vx: vx,
          vy: vy,
          damage: dmg,
          side: "ally",
          color: "#ff8a3a",
          kind: "meteor",
          radius: 8,
          life: time,
          floor: c.floor,
          blastRadius: 70 * blastBoost,
          source: c,
          scale: 1.6,
        }),
      );
    }
  }
}
