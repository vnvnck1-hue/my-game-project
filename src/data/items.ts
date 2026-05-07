export type Rarity = "common" | "rare" | "epic" | "legendary";
export type ItemSlot = "weapon" | "armor" | "accessory";

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  /** 효과 합산. 캐릭터 스탯에 곱연산 또는 합연산 적용 */
  atkBonus: number; // %
  hpBonus: number; // %
  /** 치명타 확률 가산(%p) */
  critBonus?: number;
  /** 공격 속도 가산(%) */
  asBonus?: number;
  icon: string; // 단일 이모지/문자 — 도형 렌더 placeholder
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#9a9a9a",
  rare: "#3a7be0",
  epic: "#a154c4",
  legendary: "#e0a93a",
};

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 28,
  epic: 9,
  legendary: 3,
};

const def = (
  id: string,
  name: string,
  slot: ItemSlot,
  rarity: Rarity,
  atkBonus: number,
  hpBonus: number,
  icon: string,
  extra: Partial<Pick<ItemDef, "critBonus" | "asBonus">> = {},
): ItemDef => ({
  id,
  name,
  slot,
  rarity,
  atkBonus,
  hpBonus,
  icon,
  ...extra,
});

export const ITEM_DEFS: ItemDef[] = [
  // weapons
  def("w_short_sword", "단검", "weapon", "common", 8, 0, "🗡"),
  def("w_long_sword", "장검", "weapon", "rare", 16, 0, "⚔"),
  def("w_great_sword", "대검", "weapon", "epic", 28, 0, "🗡", { critBonus: 5 }),
  def("w_legend_blade", "전설의 검", "weapon", "legendary", 50, 5, "⚔", { critBonus: 10 }),

  // armor
  def("a_cloth", "천 갑옷", "armor", "common", 0, 12, "🛡"),
  def("a_chain", "사슬 갑옷", "armor", "rare", 0, 24, "🛡"),
  def("a_plate", "판금 갑옷", "armor", "epic", 2, 40, "🛡"),
  def("a_dragon", "드래곤 갑옷", "armor", "legendary", 8, 70, "🛡"),

  // accessories
  def("c_ring", "반지", "accessory", "common", 4, 4, "💍"),
  def("c_amulet", "목걸이", "accessory", "rare", 8, 8, "📿", { asBonus: 5 }),
  def("c_orb", "마력 구슬", "accessory", "epic", 14, 10, "🔮", { asBonus: 10, critBonus: 3 }),
  def("c_relic", "고대 유물", "accessory", "legendary", 22, 18, "✨", { asBonus: 15, critBonus: 8 }),
];

/** 슬롯별 아이템 풀 */
export const itemsBySlot: Record<ItemSlot, ItemDef[]> = {
  weapon: ITEM_DEFS.filter((i) => i.slot === "weapon"),
  armor: ITEM_DEFS.filter((i) => i.slot === "armor"),
  accessory: ITEM_DEFS.filter((i) => i.slot === "accessory"),
};

export const itemsByRarity: Record<Rarity, ItemDef[]> = {
  common: ITEM_DEFS.filter((i) => i.rarity === "common"),
  rare: ITEM_DEFS.filter((i) => i.rarity === "rare"),
  epic: ITEM_DEFS.filter((i) => i.rarity === "epic"),
  legendary: ITEM_DEFS.filter((i) => i.rarity === "legendary"),
};
