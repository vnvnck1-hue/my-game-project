import { Entity } from "./Entity";
import type { GameContext } from "../core/Types";
import { floorGroundY, FIELD_LEFT, FIELD_RIGHT } from "../core/Stage";
import type { ItemDef, ItemSlot } from "../data/items";
import { spawnFloatingText, spawnParticleBurst } from "../effects/Effects";
import type { TraitMods } from "../data/traits";

export type CharacterClass = "warrior" | "archer" | "mage";

export interface CharacterBase {
  className: CharacterClass;
  baseHp: number;
  baseAtk: number;
  range: number;
  attackInterval: number;
  speed: number;
  /** 사거리 안에서도 유지하려는 최소 거리 (kiting) */
  preferredDistance: number;
  /** 기본 색 */
  primary: string;
  secondary: string;
  /** 캐릭터 표시 폭 */
  radius: number;
  /** 마나 충전량 (공격당) */
  manaPerHit: number;
  /** 궁극기 컷 */
  ultMana: number;
}

export const CLASS_DEFS: Record<CharacterClass, CharacterBase> = {
  warrior: {
    className: "warrior",
    baseHp: 440,
    baseAtk: 14,
    range: 30,
    attackInterval: 0.85,
    speed: 210, // 가장 빠름 — 근접 탱커라 적과 거리 신속히 좁힘
    preferredDistance: 0, // 붙어서 친다
    primary: "#e25656",
    secondary: "#ffd86b",
    radius: 14,
    manaPerHit: 8,
    ultMana: 100,
  },
  archer: {
    className: "archer",
    baseHp: 130,
    baseAtk: 11,
    range: 240,
    attackInterval: 0.7,
    speed: 75, // 두 번째로 빠름 — 거리 유지가 주목적
    preferredDistance: 180,
    primary: "#5dbf6b",
    secondary: "#a3e0a8",
    radius: 12,
    manaPerHit: 6,
    ultMana: 100,
  },
  mage: {
    className: "mage",
    baseHp: 100,
    baseAtk: 17,
    range: 220,
    attackInterval: 1.05,
    speed: 50, // 가장 느림 — 후방 유지
    preferredDistance: 200,
    primary: "#5d8bd9",
    secondary: "#b8d4ff",
    radius: 12,
    manaPerHit: 9,
    ultMana: 100,
  },
};

export class Character extends Entity {
  def: CharacterBase;
  /** 공격 쿨다운 (초) */
  attackCD = 0;
  /** 마나 0..ultMana */
  mana = 0;
  /** 장비 슬롯 */
  equipment: Partial<Record<ItemSlot, ItemDef>> = {};
  /** 적용된 파티 특성 (참조) */
  mods: TraitMods | null = null;
  /** 점프 표현용 y 오프셋 */
  jumpOffsetY = 0;
  /** 스윙 애니메이션 진행도 0..1 */
  swing = 0;
  /** 사망 후 부활까지 페이드 (선택) */
  deathTimer = 0;

  constructor(public characterClass: CharacterClass, x: number, floor: number) {
    const def = CLASS_DEFS[characterClass];
    super("ally", x, floor, floorGroundY(floor), def.baseHp);
    this.def = def;
  }

  /** 장비/특성 반영한 최종 공격력 */
  effectiveAtk(): number {
    let atk = this.def.baseAtk;
    let pct = 0;
    for (const k in this.equipment) {
      const it = this.equipment[k as ItemSlot];
      if (it) pct += it.atkBonus;
    }
    if (this.mods) pct += this.mods.atkPct;
    return atk * (1 + pct / 100);
  }

  effectiveMaxHp(): number {
    let hpPct = 0;
    for (const k in this.equipment) {
      const it = this.equipment[k as ItemSlot];
      if (it) hpPct += it.hpBonus;
    }
    if (this.mods) hpPct += this.mods.hpPct;
    return this.def.baseHp * (1 + hpPct / 100);
  }

  effectiveAttackInterval(): number {
    let asPct = 0;
    for (const k in this.equipment) {
      const it = this.equipment[k as ItemSlot];
      if (it?.asBonus) asPct += it.asBonus;
    }
    if (this.mods) asPct += this.mods.asPct;
    return this.def.attackInterval / (1 + asPct / 100);
  }

  effectiveCritRate(): number {
    let pct = 5; // 베이스 5%
    for (const k in this.equipment) {
      const it = this.equipment[k as ItemSlot];
      if (it?.critBonus) pct += it.critBonus;
    }
    if (this.mods) pct += this.mods.critRatePct;
    return Math.min(80, pct) / 100;
  }

  /** 장비 변경 또는 특성 갱신 후 최대 체력 비례 보정 */
  refreshMaxHp(): void {
    const newMax = this.effectiveMaxHp();
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = newMax;
    this.hp = Math.min(newMax, newMax * ratio || newMax);
  }

  /** 자동 장착 — 같은 슬롯이 비었거나 더 낮은 등급이면 교체 */
  tryAutoEquip(item: ItemDef, ctx: GameContext): boolean {
    const cur = this.equipment[item.slot];
    if (!cur) {
      this.equipment[item.slot] = item;
      this.refreshMaxHp();
      spawnFloatingText(
        ctx.floatingTexts,
        this.x,
        this.y - 30,
        `+${item.name}`,
        "#a3e0a8",
        1.0,
      );
      return true;
    }
    return false;
  }

  /** 슬롯 강제 장착 (수동) */
  equip(item: ItemDef): ItemDef | undefined {
    const prev = this.equipment[item.slot];
    this.equipment[item.slot] = item;
    this.refreshMaxHp();
    return prev;
  }

  update(dt: number, ctx: GameContext): void {
    if (!this.alive) {
      this.deathTimer += dt;
      return;
    }
    this.attackCD = Math.max(0, this.attackCD - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hitPulse = Math.max(0, this.hitPulse - dt);
    this.landImpulse = Math.max(0, this.landImpulse - dt);
    this.swing = Math.max(0, this.swing - dt * 6);
    if (Math.abs(this.knockbackX) > 0.01) {
      this.x += this.knockbackX * dt * 8;
      this.knockbackX *= 1 - dt * 8;
      this.x = Math.max(FIELD_LEFT + 8, Math.min(FIELD_RIGHT - 8, this.x));
    }
  }

  /** 공격 트리거 — 마나 누적·스윙 진입 */
  triggerAttack(): void {
    this.attackCD = this.effectiveAttackInterval();
    this.swing = 1;
    this.mana = Math.min(this.def.ultMana, this.mana + this.def.manaPerHit);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) {
      // 페이드 아웃
      const a = Math.max(0, 1 - this.deathTimer * 1.6);
      ctx.save();
      ctx.globalAlpha = a;
      this.drawBody(ctx, true);
      ctx.restore();
      return;
    }
    this.drawBody(ctx, false);
  }

  private drawBody(ctx: CanvasRenderingContext2D, dead: boolean): void {
    const px = this.x;
    const py = this.y - this.jumpOffsetY;
    // ----- 트윈 합성 (피봇 = 바닥. translate(px, py)에서 py가 발 위치라 ctx.scale은 자동으로 바닥 기준 Y) -----
    // 1) 숨쉬기 — 1초에 두 번(2Hz), 살짝 위아래로 부풀어 올랐다 가라앉음. 4% 진폭
    const breathY = 1 + Math.sin(performance.now() * 0.001 * Math.PI * 2 * 2) * 0.04;
    // 2) 피격 squash & stretch — X는 늘어나고 Y는 짜부됨
    const hp = this.hitPulse;
    const hitX = 1 + hp * 0.7;
    const hitY = 1 - hp * 0.45;
    // 3) 점프 스트레치 / 착지 스쿼시 — Entity.jumpStretchY는 AISystem이 점프 중 갱신, 착지 시 landImpulse가 0~0.18s
    const land = this.landImpulse;
    const landY = land > 0 ? 1 - (land / 0.18) * 0.30 : 1;
    const landX = land > 0 ? 1 + (land / 0.18) * 0.20 : 1;
    const scaleX = hitX * landX;
    const scaleY = breathY * hitY * this.jumpStretchY * landY;
    const swing = this.swing;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(this.facing * scaleX, scaleY);

    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, this.def.radius * 0.8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 몸통 (네모 픽셀 캐릭터)
    const bodyW = this.def.radius * 1.6;
    const bodyH = 22;
    const bodyTop = -bodyH - 4;
    ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.def.primary;
    ctx.fillRect(-bodyW / 2, bodyTop, bodyW, bodyH);

    // 머리
    const headSize = 12;
    ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : "#f5d0a8"; // 살색
    ctx.fillRect(-headSize / 2, bodyTop - headSize, headSize, headSize);

    // 클래스별 모자/머리
    this.drawHead(ctx, bodyTop - headSize, headSize);

    // 무기/도구
    if (!dead) this.drawWeapon(ctx, bodyTop, bodyH, swing);

    // 윤곽선
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.strokeRect(-bodyW / 2, bodyTop, bodyW, bodyH);
    ctx.strokeRect(-headSize / 2, bodyTop - headSize, headSize, headSize);

    ctx.restore();

    // 체력/마나 바
    if (!dead) this.drawBars(ctx);
  }

  private drawHead(ctx: CanvasRenderingContext2D, headTopY: number, size: number): void {
    if (this.characterClass === "warrior") {
      // 노란 머리
      ctx.fillStyle = "#ffd86b";
      ctx.fillRect(-size / 2, headTopY, size, 4);
    } else if (this.characterClass === "archer") {
      // 녹색 후드
      ctx.fillStyle = "#3a8a4a";
      ctx.fillRect(-size / 2 - 1, headTopY - 1, size + 2, 5);
    } else {
      // 마법사 보라 모자
      ctx.fillStyle = "#7d4dbf";
      ctx.beginPath();
      ctx.moveTo(-size / 2 - 2, headTopY + 1);
      ctx.lineTo(size / 2 + 2, headTopY + 1);
      ctx.lineTo(0, headTopY - size * 0.9);
      ctx.closePath();
      ctx.fill();
      // 별
      ctx.fillStyle = "#ffd86b";
      ctx.fillRect(-1, headTopY - 4, 2, 2);
    }
    // 눈
    ctx.fillStyle = "#1a1230";
    ctx.fillRect(-3, headTopY + 5, 2, 2);
    ctx.fillRect(1, headTopY + 5, 2, 2);
  }

  private drawWeapon(
    ctx: CanvasRenderingContext2D,
    bodyTop: number,
    bodyH: number,
    swing: number,
  ): void {
    if (this.characterClass === "warrior") {
      const ang = swing > 0 ? -swing * 1.2 + 0.3 : 0.3;
      ctx.save();
      ctx.translate(6, bodyTop + bodyH * 0.3);
      ctx.rotate(ang);
      // 검 손잡이
      ctx.fillStyle = "#5a3a20";
      ctx.fillRect(-1, 0, 3, 5);
      // 검날
      ctx.fillStyle = "#dde6f0";
      ctx.fillRect(-1, -16, 3, 16);
      ctx.fillStyle = "#7a8a98";
      ctx.fillRect(-2, -2, 5, 2);
      ctx.restore();
    } else if (this.characterClass === "archer") {
      // 활
      ctx.save();
      ctx.translate(7, bodyTop + bodyH * 0.4);
      ctx.strokeStyle = "#6a4020";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 8, -Math.PI / 2.4, Math.PI / 2.4);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
      ctx.restore();
    } else {
      // 지팡이
      ctx.save();
      ctx.translate(6, bodyTop + bodyH * 0.2);
      ctx.fillStyle = "#5a3a20";
      ctx.fillRect(0, 0, 2, 14);
      // 보주
      const gx = 1;
      const gy = -2;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 5);
      grad.addColorStop(0, "#d8b8ff");
      grad.addColorStop(1, "#7a4dbf");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBars(ctx: CanvasRenderingContext2D): void {
    const w = 28;
    const h = 4;
    const x = this.x - w / 2;
    const y = this.y - 50;
    // HP
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#7d2a2a";
    ctx.fillRect(x, y, w, h);
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = "#3aff5a";
    ctx.fillRect(x, y, w * hpRatio, h);
    // Mana
    const my = y + h + 2;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 1, my - 1, w + 2, h + 2);
    ctx.fillStyle = "#1a2a4a";
    ctx.fillRect(x, my, w, h);
    const manaRatio = Math.max(0, this.mana / this.def.ultMana);
    ctx.fillStyle = "#5db8ff";
    ctx.fillRect(x, my, w * manaRatio, h);
    if (manaRatio >= 1) {
      // 풀게이지 펄스
      ctx.strokeStyle = "#ffd86b";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x - 0.5, my - 0.5, w + 1, h + 1);
    }
  }
}

/** 처치/피해 입었을 때 흡혈 — 명세서: 흡혈 특성 8% */
export function applyLifesteal(c: Character, dmg: number, ctx: GameContext): void {
  const pct = c.mods?.lifestealPct ?? 0;
  if (pct <= 0) return;
  const heal = Math.max(0, (dmg * pct) / 100);
  if (heal <= 0) return;
  c.hp = Math.min(c.maxHp, c.hp + heal);
  spawnParticleBurst(ctx.particles, c.x, c.y - 24, 4, "#5dff8a", 70, {
    shape: "circle",
    size: 2,
    maxLife: 0.4,
    gravity: -60,
  });
}
