export type TraitId =
  | "atk_train"
  | "rapid_fire"
  | "vitality"
  | "blast_amp"
  | "lifesteal"
  | "crit_master";

export interface TraitDef {
  id: TraitId;
  name: string;
  desc: string;
  /** 카드 아이콘 (이모지 — 추후 스프라이트 교체 예정) */
  icon: string;
  /** 카드 강조 색상 */
  color: string;
  /** 같은 특성을 다시 뽑은 만큼 누적 적용 */
  apply: (m: TraitMods) => void;
}

export interface TraitMods {
  /** 공격력 +x % */
  atkPct: number;
  /** 공격 속도 +x % */
  asPct: number;
  /** 최대 체력 +x % */
  hpPct: number;
  /** 폭발 반경 +x % (마법사 마탄/궁극) */
  blastPct: number;
  /** 피해량의 x %를 회복 */
  lifestealPct: number;
  /** 치명타 확률 +x %p */
  critRatePct: number;
}

export const newTraitMods = (): TraitMods => ({
  atkPct: 0,
  asPct: 0,
  hpPct: 0,
  blastPct: 0,
  lifestealPct: 0,
  critRatePct: 0,
});

export const TRAIT_DEFS: TraitDef[] = [
  {
    id: "atk_train",
    name: "공격 훈련",
    desc: "공격력 +20%",
    icon: "⚔️",
    color: "#ff6a4a",
    apply: (m) => {
      m.atkPct += 20;
    },
  },
  {
    id: "rapid_fire",
    name: "연사",
    desc: "공격속도 +18%",
    icon: "🏹",
    color: "#5dff8a",
    apply: (m) => {
      m.asPct += 18;
    },
  },
  {
    id: "vitality",
    name: "생명력",
    desc: "최대 체력 +25%",
    icon: "❤️",
    color: "#ff5a7a",
    apply: (m) => {
      m.hpPct += 25;
    },
  },
  {
    id: "blast_amp",
    name: "강화 마탄",
    desc: "폭발 범위 +30%",
    icon: "💥",
    color: "#ffb84a",
    apply: (m) => {
      m.blastPct += 30;
    },
  },
  {
    id: "lifesteal",
    name: "흡혈",
    desc: "처치 시 8% 회복",
    icon: "🩸",
    color: "#c43a3a",
    apply: (m) => {
      m.lifestealPct += 8;
    },
  },
  {
    id: "crit_master",
    name: "치명 강화",
    desc: "치명타 +12%",
    icon: "🎯",
    color: "#ffd86b",
    apply: (m) => {
      m.critRatePct += 12;
    },
  },
];
