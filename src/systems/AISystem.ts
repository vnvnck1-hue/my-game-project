import type { GameContext } from "../core/Types";
import { Character } from "../entities/Character";
import { Enemy } from "../entities/Enemy";
import { FIELD_LEFT, FIELD_RIGHT, FLOOR_COUNT, floorGroundY } from "../core/Stage";
import { CombatSystem } from "./CombatSystem";

const FLOOR_SWITCH_COOLDOWN = 1.4;

interface AIState {
  floorSwitchCD: number;
  jumpT: number; // 0..1 점프 진행
  jumpFromFloor: number;
  jumpToFloor: number;
}

const aiStates = new WeakMap<Character | Enemy, AIState>();
const getState = (e: Character | Enemy): AIState => {
  let s = aiStates.get(e);
  if (!s) {
    s = { floorSwitchCD: 0, jumpT: 0, jumpFromFloor: e.floor, jumpToFloor: e.floor };
    aiStates.set(e, s);
  }
  return s;
};

export class AISystem {
  constructor(private combat: CombatSystem) {}

  update(dt: number, ctx: GameContext): void {
    for (const c of ctx.allies) {
      if (!(c instanceof Character)) continue;
      if (!c.alive) continue;
      this.updateCharacter(c, dt, ctx);
    }
    for (const e of ctx.enemies) {
      if (!(e instanceof Enemy)) continue;
      if (!e.alive) continue;
      this.updateEnemy(e, dt, ctx);
    }
  }

  private updateCharacter(c: Character, dt: number, ctx: GameContext): void {
    const s = getState(c);
    s.floorSwitchCD = Math.max(0, s.floorSwitchCD - dt);

    // 점프 보간 — y lerp + 호 모양 + 만화풍 stretch&squash
    if (s.jumpT < 1) {
      const prevT = s.jumpT;
      s.jumpT = Math.min(1, s.jumpT + dt * 2.4);
      const t = s.jumpT;
      const fromY = floorGroundY(s.jumpFromFloor);
      const toY = floorGroundY(s.jumpToFloor);
      c.y = fromY + (toY - fromY) * t;
      const peak = 26;
      c.jumpOffsetY = peak * Math.sin(Math.PI * t);
      // 상승 구간(0~0.5): 위로 늘어남(stretch). 하강 구간(0.5~1): 다시 정상으로.
      // sin 곡선 그대로 쓰면 양쪽 대칭 — 점프 내내 키 큰 모양 유지
      c.jumpStretchY = 1 + Math.sin(Math.PI * t) * 0.32;
      // AI 타겟팅용 floor 정보는 중간 지점 이후 도착 층으로
      c.floor = t < 0.5 ? s.jumpFromFloor : s.jumpToFloor;
      if (s.jumpT >= 1) {
        c.y = toY;
        c.jumpOffsetY = 0;
        c.jumpStretchY = 1;
        c.floor = s.jumpToFloor;
        // 착지 — 짧은 squash 트리거 (만화풍 "탁" 짜부)
        if (prevT < 1) c.landImpulse = 0.18;
      }
      return; // 점프 중엔 다른 행동 X
    }
    c.jumpOffsetY = 0;
    c.jumpStretchY = 1;

    const target = this.pickTargetForChar(c, ctx);

    if (!target) {
      // 적이 없으면 정지
      return;
    }

    // 적과의 같은 층 여부
    if (target.floor !== c.floor && s.floorSwitchCD <= 0) {
      // 층 전환
      s.jumpFromFloor = c.floor;
      s.jumpToFloor = target.floor;
      s.jumpT = 0;
      s.floorSwitchCD = FLOOR_SWITCH_COOLDOWN;
      return;
    }

    const dx = target.x - c.x;
    const dist = Math.abs(dx);
    c.facing = dx >= 0 ? 1 : -1;

    const range = c.def.range;
    const preferred = c.def.preferredDistance;

    if (c.def.className === "warrior") {
      // 추적 → 사거리 안에서 공격
      if (dist > range - 4) {
        c.x += Math.sign(dx) * c.def.speed * dt;
      }
      if (dist <= range && c.attackCD <= 0) {
        this.combat.warriorMelee(c, ctx);
      }
    } else if (c.def.className === "archer") {
      // 거리 유지
      if (dist < preferred - 18) {
        c.x -= Math.sign(dx) * c.def.speed * dt;
      } else if (dist > preferred + 18) {
        c.x += Math.sign(dx) * c.def.speed * dt;
      }
      if (dist <= range && c.attackCD <= 0) {
        this.combat.archerShoot(c, target, ctx);
      }
    } else {
      // mage — 후방 유지 + 사거리 안일 때 발사
      if (dist < preferred - 14) {
        c.x -= Math.sign(dx) * c.def.speed * dt;
      } else if (dist > preferred + 18) {
        c.x += Math.sign(dx) * c.def.speed * dt;
      }
      if (dist <= range && c.attackCD <= 0) {
        this.combat.mageCast(c, target, ctx);
      }
    }

    c.x = Math.max(FIELD_LEFT + 16, Math.min(FIELD_RIGHT - 16, c.x));
  }

  private updateEnemy(e: Enemy, dt: number, ctx: GameContext): void {
    const s = getState(e);
    s.floorSwitchCD = Math.max(0, s.floorSwitchCD - dt);

    if (s.jumpT < 1) {
      const prevT = s.jumpT;
      s.jumpT = Math.min(1, s.jumpT + dt * 2);
      const t = s.jumpT;
      const fromY = floorGroundY(s.jumpFromFloor);
      const toY = floorGroundY(s.jumpToFloor);
      // y는 부드러운 lerp + 호 모양 점프 오프셋
      e.y = fromY + (toY - fromY) * t - Math.sin(Math.PI * t) * 22;
      e.floor = t < 0.5 ? s.jumpFromFloor : s.jumpToFloor;
      // 만화풍 stretch
      e.jumpStretchY = 1 + Math.sin(Math.PI * t) * 0.28;
      if (s.jumpT >= 1) {
        e.y = toY;
        e.floor = s.jumpToFloor;
        e.jumpStretchY = 1;
        if (prevT < 1) e.landImpulse = 0.18;
      }
      return;
    }
    e.jumpStretchY = 1;

    const target = this.pickClosestAlly(e, ctx);
    if (!target) {
      // 천천히 좌측으로 이동
      e.x -= e.def.speed * dt * 0.5;
      return;
    }

    if (target.floor !== e.floor && s.floorSwitchCD <= 0 && Math.random() < 0.6) {
      s.jumpFromFloor = e.floor;
      s.jumpToFloor = target.floor;
      s.jumpT = 0;
      s.floorSwitchCD = FLOOR_SWITCH_COOLDOWN + Math.random() * 0.5;
      return;
    }

    const dx = target.x - e.x;
    const dist = Math.abs(dx);
    e.facing = dx >= 0 ? 1 : -1;
    const desired = e.def.range - 6;
    if (dist > desired) {
      e.x += Math.sign(dx) * e.def.speed * dt;
    }
    if (dist <= e.def.range && e.attackCD <= 0) {
      if (e.def.ranged) {
        this.combat.enemyRanged(e, target, ctx);
      } else {
        this.combat.enemyMelee(e, target, ctx);
      }
    }
  }

  private pickTargetForChar(c: Character, ctx: GameContext): Enemy | null {
    let best: Enemy | null = null;
    let bestScore = Infinity;
    for (const en of ctx.enemies) {
      if (!(en instanceof Enemy)) continue;
      if (!en.alive) continue;
      const dx = Math.abs(en.x - c.x);
      const dyFloor = Math.abs(en.floor - c.floor);
      // 같은 층 우선, 그 다음 가까움
      const score = dx + dyFloor * 200;
      if (score < bestScore) {
        bestScore = score;
        best = en;
      }
    }
    return best;
  }

  private pickClosestAlly(e: Enemy, ctx: GameContext): Character | null {
    let best: Character | null = null;
    let bestScore = Infinity;
    for (const a of ctx.allies) {
      if (!(a instanceof Character)) continue;
      if (!a.alive) continue;
      const dx = Math.abs(a.x - e.x);
      const dyFloor = Math.abs(a.floor - e.floor);
      const score = dx + dyFloor * 200;
      if (score < bestScore) {
        bestScore = score;
        best = a;
      }
    }
    return best;
  }

  /** 외부에서 강제 floor 반영 (스폰용) */
  static setFloor(e: Enemy | Character, floor: number): void {
    e.floor = Math.max(0, Math.min(FLOOR_COUNT - 1, floor));
    e.y = floorGroundY(e.floor);
  }
}
