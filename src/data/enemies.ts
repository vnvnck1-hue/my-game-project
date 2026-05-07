export type EnemyKind = "goblin" | "archer_goblin" | "orc";

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  atk: number;
  /** 공격 사거리(px). 근접은 28 정도 */
  range: number;
  /** 공격 사이 텀(초) */
  attackInterval: number;
  /** 이동 속도(px/sec) */
  speed: number;
  /** 충돌 반경 */
  radius: number;
  color: string;
  outline: string;
  /** 원거리 공격 — 사용 시 투사체 발사 */
  ranged?: boolean;
  projectileSpeed?: number;
  projectileColor?: string;
  /** 드랍 가중치 가산 */
  dropBonus: number;
  /** 골드 드랍 평균 */
  goldAvg: number;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  goblin: {
    kind: "goblin",
    name: "고블린",
    hp: 26,
    atk: 6,
    range: 28,
    attackInterval: 1.0,
    speed: 42,
    radius: 12,
    color: "#5fa850",
    outline: "#2a4a26",
    dropBonus: 0,
    goldAvg: 5,
  },
  archer_goblin: {
    kind: "archer_goblin",
    name: "고블린 궁수",
    hp: 18,
    atk: 8,
    range: 200,
    attackInterval: 1.6,
    speed: 36,
    radius: 11,
    color: "#7ac065",
    outline: "#2a4a26",
    ranged: true,
    projectileSpeed: 640,
    projectileColor: "#a0e090",
    dropBonus: 0.05,
    goldAvg: 8,
  },
  orc: {
    kind: "orc",
    name: "오크 탱커",
    hp: 80,
    atk: 12,
    range: 32,
    attackInterval: 1.4,
    speed: 28,
    radius: 16,
    color: "#3e7848",
    outline: "#1f3a23",
    dropBonus: 0.15,
    goldAvg: 18,
  },
};
