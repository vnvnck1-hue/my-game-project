import type { EnemyKind } from "./enemies";

/**
 * 무한 스테이지 — stage·wave에 따라 적 스폰 스케줄을 절차적으로 생성.
 * 후반으로 갈수록 다양성 + HP 스케일 증가.
 */

export interface SpawnEntry {
  kind: EnemyKind;
  /** 스폰 사이드: 좌우 0=왼쪽, 1=오른쪽 */
  fromRight: boolean;
  /** 스폰 층 0~2 */
  floor: number;
  /** 웨이브 시작 후 발생까지 지연(초) */
  delay: number;
  /** HP/atk 스케일 곱 (스테이지 깊이 반영) */
  scale: number;
}

/** 1웨이브 분 스케줄 생성 */
export function buildWaveSpawns(stage: number, wave: number): SpawnEntry[] {
  const out: SpawnEntry[] = [];
  // 스테이지 깊이가 깊어질수록 적 수 + 스케일 상승
  const depth = stage - 1; // 0-based
  const baseCount = 3 + Math.min(8, depth);
  const waveBoost = Math.floor((wave - 1) * 0.7);
  const total = baseCount + waveBoost;
  const scale = 1 + depth * 0.18 + (wave - 1) * 0.08;

  // 적 풀 — 스테이지에 따라 다양성 증가
  const pool: EnemyKind[] = ["goblin"];
  if (stage >= 2 || wave >= 2) pool.push("archer_goblin");
  if (stage >= 3 || (stage === 2 && wave >= 3)) pool.push("orc");
  // 후반엔 오크 비중 증가
  const expanded: EnemyKind[] =
    depth >= 4 ? [...pool, "orc", "archer_goblin"] : pool;

  for (let i = 0; i < total; i++) {
    const kind = expanded[i % expanded.length];
    out.push({
      kind,
      fromRight: i % 2 === 0, // 좌우 교차
      floor: i % 3,
      delay: i * 0.55 + Math.random() * 0.2,
      scale,
    });
  }
  return out;
}

/** 한 스테이지의 웨이브 수 */
export function wavesForStage(stage: number): number {
  if (stage <= 2) return 1;
  if (stage <= 5) return 2 + Math.floor((stage - 3) * 0.5);
  return Math.min(5, 3 + Math.floor((stage - 6) / 2));
}
