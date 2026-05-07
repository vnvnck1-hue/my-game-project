import type { GameContext } from "../core/Types";
import { Enemy } from "../entities/Enemy";
import { Drop } from "../entities/Drop";
import { ITEM_DEFS, RARITY_WEIGHTS, type Rarity, type ItemDef } from "../data/items";

export class DropSystem {
  /**
   * 매 프레임 적 사망 감지 → 드랍 결정.
   * Enemy.alive가 false가 된 후 한 번만 처리하기 위해 처리됨 표식 사용.
   */
  private processed = new WeakSet<Enemy>();

  update(_dt: number, ctx: GameContext): void {
    for (const e of ctx.enemies) {
      if (!(e instanceof Enemy)) continue;
      if (e.alive || this.processed.has(e)) continue;
      this.processed.add(e);
      this.onKill(e, ctx);
    }
    // 사망 페이드 후 청소
    for (let i = ctx.enemies.length - 1; i >= 0; i--) {
      const e = ctx.enemies[i];
      if (e instanceof Enemy && !e.alive && e.deathTimer > 0.7) {
        ctx.enemies.splice(i, 1);
      }
    }
  }

  private onKill(e: Enemy, ctx: GameContext): void {
    // 골드 — 항상
    const gold = Math.max(
      1,
      Math.round(e.def.goldAvg * (0.7 + ctx.rng.next() * 0.6) * (1 + (ctx.stage - 1) * 0.1)),
    );
    ctx.drops.push(new Drop({ kind: "gold", x: e.x, y: e.y - 18, floor: e.floor, gold }));

    // 아이템 — 확률
    const baseChance = 0.18 + e.def.dropBonus + ctx.stage * 0.012;
    if (ctx.rng.chance(Math.min(0.7, baseChance))) {
      const item = this.rollItem(ctx);
      if (item) {
        ctx.drops.push(new Drop({ kind: "item", x: e.x, y: e.y - 18, floor: e.floor, item }));
      }
    }
  }

  private rollItem(ctx: GameContext): ItemDef | null {
    const rarities: Rarity[] = ["common", "rare", "epic", "legendary"];
    const weights = rarities.map((r) => {
      const base = RARITY_WEIGHTS[r];
      // 스테이지가 깊을수록 상위 등급 가중치 ↑
      if (r === "rare") return base + ctx.stage * 1.5;
      if (r === "epic") return base + ctx.stage * 0.8;
      if (r === "legendary") return base + ctx.stage * 0.3;
      return Math.max(5, base - ctx.stage * 0.5);
    });
    const r = rarities[ctx.rng.weighted(weights)];
    const pool = ITEM_DEFS.filter((i) => i.rarity === r);
    if (pool.length === 0) return null;
    return ctx.rng.pick(pool);
  }
}
