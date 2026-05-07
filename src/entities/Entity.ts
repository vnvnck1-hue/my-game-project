export type Side = "ally" | "enemy";

let _id = 0;
export const nextId = () => ++_id;

export interface IEntity {
  id: number;
  side: Side;
  x: number;
  /** 현재 층 (0 = 최상층, 2 = 최하층) */
  floor: number;
  /** 발 위치 기준 y (Stage.floorGroundY로 결정) */
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  /** 피격 플래시 타이머 (초) */
  hitFlash: number;
  /** 히트 스케일 펄스 타이머 (초) */
  hitPulse: number;
  /** 넉백용 임시 x 오프셋 */
  knockbackX: number;
  /** 바라보는 방향 ( -1: 좌, +1: 우 ) */
  facing: 1 | -1;
  /** 점프 중일 때 세로 스트레치 (1 = 평소, >1 = 위로 늘어남, <1 = 짜부됨) */
  jumpStretchY: number;
  /** 착지 직후 스쿼시 타이머 (초) — 0이면 스쿼시 없음 */
  landImpulse: number;
}

export abstract class Entity implements IEntity {
  id = nextId();
  hp: number;
  alive = true;
  hitFlash = 0;
  hitPulse = 0;
  knockbackX = 0;
  facing: 1 | -1 = 1;
  jumpStretchY = 1;
  landImpulse = 0;

  constructor(
    public side: Side,
    public x: number,
    public floor: number,
    public y: number,
    public maxHp: number,
  ) {
    this.hp = maxHp;
  }

  takeDamage(dmg: number): boolean {
    if (!this.alive) return false;
    this.hp -= dmg;
    this.hitFlash = 0.16;
    // 강한 squash & stretch — 그릴 때 X는 +70% 늘리고 Y는 -45% 짜부 → 임팩트감
    this.hitPulse = 0.32;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  abstract update(dt: number, ctx: import("../core/Types").GameContext): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;
}
