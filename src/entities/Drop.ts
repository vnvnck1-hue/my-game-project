import type { GameContext } from "../core/Types";
import type { ItemDef } from "../data/items";
import { RARITY_COLOR } from "../data/items";
import { floorGroundY } from "../core/Stage";

export type DropKind = "gold" | "item";

export interface DropInit {
  kind: DropKind;
  x: number;
  y: number;
  /** 떨어진 층 (지면 계산용) */
  floor: number;
  /** 골드일 때 수량 */
  gold?: number;
  /** 아이템일 때 def */
  item?: ItemDef;
}

/** 캐릭터가 이 거리 이내로 접근하면 자동 흡수 시작 */
const ATTRACT_RADIUS = 48;

export class Drop {
  alive = true;
  kind: DropKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  floor: number;
  age = 0;
  /** 자동 흡수 페이즈 */
  homing = false;
  gold?: number;
  item?: ItemDef;

  constructor(init: DropInit) {
    this.kind = init.kind;
    this.x = init.x;
    this.y = init.y;
    this.floor = init.floor;
    this.vx = (Math.random() - 0.5) * 90;
    this.vy = -200 + Math.random() * 60;
    this.gold = init.gold;
    this.item = init.item;
  }

  update(dt: number, ctx: GameContext): void {
    if (!this.alive) return;
    this.age += dt;

    if (!this.homing) {
      // 물리 — 떨어진 층의 지면에 정착
      this.vy += 600 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const ground = floorGroundY(this.floor);
      if (this.y >= ground && this.vy > 0) {
        this.y = ground;
        this.vy *= -0.45;
        this.vx *= 0.55;
        if (Math.abs(this.vy) < 30) this.vy = 0;
      }
      // 거의 정지 상태면 vx 감쇠
      if (Math.abs(this.vy) < 10) this.vx *= 1 - dt * 4;

      // 캐릭터 접근 감지 — 같은 층 + 거리 ATTRACT_RADIUS 이내
      for (const a of ctx.allies) {
        if (!a.alive) continue;
        if (a.floor !== this.floor) continue;
        const dx = a.x - this.x;
        const dy = a.y - 16 - this.y;
        if (dx * dx + dy * dy <= ATTRACT_RADIUS * ATTRACT_RADIUS) {
          this.homing = true;
          break;
        }
      }
    } else {
      // 자동 흡수 — 가장 가까운 살아있는 아군에게 빨려들어감
      let tx = this.x;
      let ty = this.y - 16;
      let best = Infinity;
      for (const a of ctx.allies) {
        if (!a.alive) continue;
        const dx = a.x - this.x;
        const dy = a.y - 16 - this.y;
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          tx = a.x;
          ty = a.y - 16;
        }
      }
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      // 시작은 부드럽게, 가까워질수록 가속
      const speed = 320 + (1 - Math.min(1, d / ATTRACT_RADIUS)) * 600;
      this.x += (dx / d) * speed * dt;
      this.y += (dy / d) * speed * dt;
      if (d < 14) {
        this.collect(ctx, tx, ty);
      }
    }
  }

  collect(ctx: GameContext, tx: number, ty: number): void {
    this.alive = false;
    if (this.kind === "gold" && this.gold) {
      ctx.gold += this.gold;
    } else if (this.kind === "item" && this.item) {
      // EquipmentSystem에 위임 — 자동 모드라면 자동 장착, 아니면 인벤토리로
      // (실제 처리는 main의 inventory hook에서)
      const evt = new CustomEvent("autobattler:item-pickup", { detail: { item: this.item } });
      window.dispatchEvent(evt);
    }
    // 약한 반짝임
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;
    const t = this.age * 8;
    const wobble = Math.sin(t) * 1.2;
    if (this.kind === "gold") {
      ctx.save();
      ctx.translate(this.x, this.y + wobble);
      const grad = ctx.createRadialGradient(-2, -2, 0, 0, 0, 12);
      grad.addColorStop(0, "#ffe066");
      grad.addColorStop(1, "#a06a10");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // 반짝임
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(-4, -4, 3, 3);
      ctx.restore();
    } else if (this.kind === "item" && this.item) {
      const color = RARITY_COLOR[this.item.rarity];
      ctx.save();
      ctx.translate(this.x, this.y + wobble);
      // 빛
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 1.5);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 박스
      ctx.fillStyle = color;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-10, -10, 20, 20);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(-6, -6, 4, 4);
      ctx.restore();
    }
  }
}
