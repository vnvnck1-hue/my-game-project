import type { GameContext } from "../core/Types";
import { Character } from "../entities/Character";
import type { ItemDef, ItemSlot } from "../data/items";
import { RARITY_ORDER } from "../data/items";
import { spawnFloatingText } from "../effects/Effects";

/**
 * 장비 + 인벤토리 시스템.
 * - 인벤토리: 캐릭터에 장착되지 않은 아이템 풀.
 * - 자동 장착: 새 아이템을 받으면 가장 잘 어울리는(빈 슬롯/낮은 등급) 캐릭터에 자동 배치.
 * - 수동 모드일 땐 인벤토리에 적재만, 클릭 시 캐릭터별 슬롯에 강제 장착 가능.
 */

export interface InventoryEntry {
  item: ItemDef;
}

export class EquipmentSystem {
  inventory: InventoryEntry[] = [];
  /** 자동 장착 모드 */
  autoEquip = true;
  /** 인벤토리 변경 시 UI 갱신 알림 */
  onChange?: () => void;

  pickUp(item: ItemDef, characters: Character[], ctx: GameContext): void {
    if (this.autoEquip) {
      const placed = this.tryAutoEquipBest(item, characters, ctx);
      if (placed) {
        this.onChange?.();
        return;
      }
    }
    // 인벤토리에 적재
    this.inventory.push({ item });
    this.onChange?.();
  }

  private tryAutoEquipBest(item: ItemDef, characters: Character[], ctx: GameContext): boolean {
    // 1) 같은 슬롯 비어있는 가장 알맞은 캐릭터
    const fit = this.preferredCharacter(item, characters);
    const order = fit ? [fit, ...characters.filter((c) => c !== fit)] : characters;

    for (const c of order) {
      if (!c.alive) continue;
      const cur = c.equipment[item.slot];
      if (!cur) {
        c.equipment[item.slot] = item;
        c.refreshMaxHp();
        spawnFloatingText(ctx.floatingTexts, c.x, c.y - 36, `+${item.name}`, "#a3e0a8", 1);
        return true;
      }
    }
    // 2) 더 낮은 등급이면 교체
    for (const c of order) {
      if (!c.alive) continue;
      const cur = c.equipment[item.slot];
      if (cur && RARITY_ORDER[item.rarity] > RARITY_ORDER[cur.rarity]) {
        c.equipment[item.slot] = item;
        c.refreshMaxHp();
        spawnFloatingText(ctx.floatingTexts, c.x, c.y - 36, `▲ ${item.name}`, "#ffd86b", 1.1);
        // 교체된 아이템은 인벤토리로
        this.inventory.push({ item: cur });
        return true;
      }
    }
    return false;
  }

  /** 클래스 친화도(휴리스틱)에 따라 우선 장착 대상 선택 */
  private preferredCharacter(item: ItemDef, characters: Character[]): Character | null {
    // weapon/armor/accessory 아이템 자체는 클래스 무관 — atk/hp/as/crit 보너스 합산.
    // 단순히 빈 슬롯이 있는 첫 캐릭터를 선호.
    return (
      characters.find((c) => c.alive && !c.equipment[item.slot]) ??
      characters.find((c) => c.alive) ??
      null
    );
  }

  /** 인벤토리에서 슬롯의 N번 아이템을 특정 캐릭터에 수동 장착 */
  manualEquipFromInventory(invIndex: number, c: Character): void {
    const e = this.inventory[invIndex];
    if (!e) return;
    const slot: ItemSlot = e.item.slot;
    const prev = c.equipment[slot];
    c.equipment[slot] = e.item;
    c.refreshMaxHp();
    if (prev) {
      this.inventory.splice(invIndex, 1, { item: prev });
    } else {
      this.inventory.splice(invIndex, 1);
    }
    this.onChange?.();
  }

  toggleAuto(): boolean {
    this.autoEquip = !this.autoEquip;
    this.onChange?.();
    return this.autoEquip;
  }

  /** 인벤토리 슬롯 소진 시 가장 낮은 등급 아이템부터 자동 정리 */
  trimInventory(maxSlots = 20): void {
    if (this.inventory.length <= maxSlots) return;
    this.inventory.sort((a, b) => RARITY_ORDER[b.item.rarity] - RARITY_ORDER[a.item.rarity]);
    this.inventory.length = maxSlots;
    this.onChange?.();
  }
}
