import type { Entity } from "../entities/Entity";
import type { Projectile } from "../entities/Projectile";
import type { Drop } from "../entities/Drop";
import type { FloatingText, Particle } from "../effects/Effects";
import type { Camera } from "./Camera";
import type { TweenManager } from "./Tween";
import type { RNG } from "./RNG";

/**
 * 모든 시스템·엔티티가 공유하는 게임 컨텍스트.
 * 시스템들이 필요한 객체에 접근할 수 있는 단일 진입점.
 */
export interface GameContext {
  allies: Entity[];
  enemies: Entity[];
  projectiles: Projectile[];
  drops: Drop[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  camera: Camera;
  tween: TweenManager;
  rng: RNG;
  /** 누적 게임 시간(초) */
  time: number;
  /** 현재 스테이지/웨이브 인덱스 (1-based) */
  stage: number;
  wave: number;
  wavesPerStage: number;
  /** 진행도 0~1 (게이지) */
  waveProgress: number;
  /** 골드 */
  gold: number;
  /** 게임 오버 플래그 */
  gameOver: boolean;
  /** 특성 모달 활성 (게임 일시정지) */
  pickerActive: boolean;
}
