import type { GameContext } from "../core/Types";
import { Enemy } from "../entities/Enemy";
import { buildWaveSpawns, wavesForStage, type SpawnEntry } from "../data/waves";
import { FIELD_LEFT, FIELD_RIGHT, FLOOR_COUNT } from "../core/Stage";
import { spawnFloatingText, spawnParticleBurst } from "../effects/Effects";

export type WavePhase = "idle" | "active" | "intermission" | "stage_clear";

export class WaveSystem {
  phase: WavePhase = "idle";
  /** 남은 스폰 큐 */
  spawnQueue: SpawnEntry[] = [];
  /** 웨이브 시작 후 흐른 시간 */
  waveTime = 0;
  /** intermission 카운트다운 */
  pauseTime = 0;
  /** 누적 스폰 수(목표 처치 카운트 기준) */
  totalSpawned = 0;
  killedThisWave = 0;
  /**
   * 외부 콜백 — 스테이지 클리어, 특정 웨이브 도달 등 알림.
   */
  onStageClear?: () => void;
  onWaveStart?: (stage: number, wave: number) => void;
  onWaveClear?: (stage: number, wave: number) => void;

  start(ctx: GameContext): void {
    ctx.stage = 1;
    ctx.wave = 1;
    ctx.wavesPerStage = wavesForStage(1);
    this.beginWave(ctx);
  }

  private beginWave(ctx: GameContext): void {
    this.spawnQueue = buildWaveSpawns(ctx.stage, ctx.wave);
    this.totalSpawned = this.spawnQueue.length;
    this.killedThisWave = 0;
    this.waveTime = 0;
    this.phase = "active";
    ctx.waveProgress = 0;
    this.onWaveStart?.(ctx.stage, ctx.wave);
  }

  update(dt: number, ctx: GameContext): void {
    if (this.phase === "idle") return;
    if (this.phase === "intermission" || this.phase === "stage_clear") {
      this.pauseTime -= dt;
      if (this.pauseTime <= 0) {
        // 다음 웨이브 또는 다음 스테이지
        if (this.phase === "stage_clear") {
          ctx.stage += 1;
          ctx.wave = 1;
          ctx.wavesPerStage = wavesForStage(ctx.stage);
          this.onStageClear?.();
        } else {
          ctx.wave += 1;
        }
        this.beginWave(ctx);
      }
      return;
    }

    // active
    this.waveTime += dt;
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.waveTime) {
      const sp = this.spawnQueue.shift()!;
      // 필드 전역 랜덤 스폰 — x: 필드 폭 안 무작위, floor: 0~2 무작위
      const margin = 24;
      const x = ctx.rng.range(FIELD_LEFT + margin, FIELD_RIGHT - margin);
      const floor = ctx.rng.int(0, FLOOR_COUNT - 1);
      const e = new Enemy(sp.kind, x, floor, sp.scale);
      // 가장 가까운 아군 쪽을 바라보도록
      let facingX = 240;
      let bestDist = Infinity;
      for (const a of ctx.allies) {
        if (!a.alive) continue;
        const d = Math.abs(a.x - x);
        if (d < bestDist) {
          bestDist = d;
          facingX = a.x;
        }
      }
      e.facing = facingX >= x ? 1 : -1;
      // 등장 연출 — 발치 먼지
      spawnParticleBurst(ctx.particles, x, e.y, 8, "#7d6a4a", 90, {
        shape: "circle",
        size: 2,
        maxLife: 0.45,
        gravity: 60,
      });
      ctx.enemies.push(e);
    }

    // 모든 적 처치 (스폰 큐 비고 + 적 0)
    const remaining = ctx.enemies.filter((e) => e.alive).length;
    const totalLeft = remaining + this.spawnQueue.length;
    ctx.waveProgress = 1 - totalLeft / Math.max(1, this.totalSpawned);

    if (this.spawnQueue.length === 0 && remaining === 0) {
      this.completeWave(ctx);
    }
  }

  private completeWave(ctx: GameContext): void {
    ctx.waveProgress = 1;
    this.onWaveClear?.(ctx.stage, ctx.wave);
    spawnFloatingText(
      ctx.floatingTexts,
      240,
      330,
      ctx.wave >= ctx.wavesPerStage ? `STAGE ${ctx.stage} CLEAR!` : `WAVE ${ctx.wave} CLEAR`,
      "#ffd86b",
      1.6,
    );
    if (ctx.wave >= ctx.wavesPerStage) {
      this.phase = "stage_clear";
      this.pauseTime = 0.8;
    } else {
      this.phase = "intermission";
      this.pauseTime = 0.6;
    }
  }
}
