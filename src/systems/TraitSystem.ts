import type { GameContext } from "../core/Types";
import { Character } from "../entities/Character";
import { TRAIT_DEFS, newTraitMods, type TraitDef, type TraitMods } from "../data/traits";

/**
 * 로그라이크 특성 시스템.
 * - 3웨이브마다 트리거 (`shouldOffer`)
 * - 풀에서 3개 무작위 추천 (중복 가능 — 누적 강화 재미)
 * - 선택 시 `mods`에 누적 적용 → 캐릭터들이 mods를 참조해 스탯 환산.
 */
export class TraitSystem {
  mods: TraitMods = newTraitMods();
  /** 마지막으로 제공한 wave (중복 방지) */
  lastOfferedWaveKey = "";

  /** 3웨이브마다 1회 (스테이지·웨이브 누적 기준) */
  shouldOffer(ctx: GameContext): boolean {
    const totalWave = (ctx.stage - 1) * 100 + ctx.wave;
    const key = `s${ctx.stage}w${ctx.wave}`;
    if (this.lastOfferedWaveKey === key) return false;
    if (totalWave % 3 !== 0) return false;
    this.lastOfferedWaveKey = key;
    return true;
  }

  pickOptions(ctx: GameContext): TraitDef[] {
    return ctx.rng.pickN(TRAIT_DEFS, 3);
  }

  apply(def: TraitDef, characters: Character[]): void {
    def.apply(this.mods);
    // 캐릭터 mods 참조 갱신 + HP 비례 보정
    for (const c of characters) {
      c.mods = this.mods;
      c.refreshMaxHp();
    }
  }

  attachToParty(characters: Character[]): void {
    for (const c of characters) c.mods = this.mods;
  }
}
