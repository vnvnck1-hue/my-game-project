import type { GameContext } from "../core/Types";
import { Character } from "../entities/Character";
import type { EquipmentSystem } from "../systems/EquipmentSystem";
import { RARITY_COLOR } from "../data/items";
import type { TraitDef } from "../data/traits";

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector(sel) as T | null;

const el = (tag: string, cls?: string, html?: string): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

export class UI {
  root: HTMLElement;
  topHud!: HTMLElement;
  goldEl!: HTMLElement;
  stageBar!: HTMLElement;
  stageNameEl!: HTMLElement;
  waveFillEl!: HTMLElement;
  waveTextEl!: HTMLElement;
  inventoryEl!: HTMLElement;
  skillBar!: HTMLElement;
  bottomNav!: HTMLElement;
  pauseBtn!: HTMLElement;

  constructor(rootId: string) {
    const root = document.getElementById(rootId);
    if (!root) throw new Error(`#${rootId} not found`);
    this.root = root;
    this.build();
  }

  private build(): void {
    this.root.innerHTML = "";
    // ----- Top HUD -----
    const top = el("div", "top-hud");
    const day = el("div", "day-badge", "45");
    const goldWrap = el("div", "currency gold");
    goldWrap.append(el("span", "icon"), el("span", "value", "0"));
    this.goldEl = goldWrap.querySelector(".value")!;
    const gemWrap = el("div", "currency gem");
    gemWrap.append(el("span", "icon"), el("span", "value", "3,210"));
    const crystalWrap = el("div", "currency crystal");
    crystalWrap.append(el("span", "icon"), el("span", "value", "1,850"));
    const menu = el("button", "menu-btn");
    menu.append(el("span"), el("span"), el("span"));
    menu.addEventListener("click", () => this.toast("준비 중"));
    top.append(day, goldWrap, gemWrap, crystalWrap, menu);
    this.topHud = top;
    this.root.append(top);

    // ----- Stage Bar -----
    const sb = el("div", "stage-bar");
    const timer = el("div", "timer-box");
    timer.append(el("div", "speed", "x1.5"), el("div", "time", "00:58"));
    const info = el("div", "stage-info");
    const name = el("div", "stage-name", "Tower 1F");
    const trackWrap = el("div", "wave-track");
    const fill = el("div", "wave-fill");
    const skull = el("div", "wave-skull");
    trackWrap.append(fill, skull);
    const waveText = el("div", "wave-text", "Wave 1 / 1");
    info.append(name, trackWrap, waveText);
    const pause = el("div", "pause-btn");
    pause.addEventListener("click", () => {
      const evt = new CustomEvent("autobattler:toggle-pause");
      window.dispatchEvent(evt);
    });
    sb.append(timer, info, pause);
    this.stageBar = sb;
    this.stageNameEl = name;
    this.waveFillEl = fill;
    this.waveTextEl = waveText;
    this.pauseBtn = pause;
    this.root.append(sb);

    // ----- Skill Bar (layout only) -----
    const skill = el("div", "skill-bar");
    const auto = el("div", "skill-slot auto", "⚔");
    auto.append(el("div", "label", "AUTO"));
    auto.addEventListener("click", () => {
      const evt = new CustomEvent("autobattler:toggle-auto-equip");
      window.dispatchEvent(evt);
    });
    const slot = (icon: string, count: string, color: string) => {
      const s = el("div", "skill-slot");
      const ic = el("div", "icon");
      ic.style.color = color;
      ic.style.fontSize = "22px";
      ic.textContent = icon;
      s.append(ic);
      const cn = el("div", "count");
      cn.textContent = count;
      s.append(cn);
      s.addEventListener("click", () => this.toast("스킬은 준비 중"));
      return s;
    };
    skill.append(
      auto,
      slot("➷", "7", "#5dff8a"),
      slot("✦", "12", "#b46cff"),
      slot("🔥", "8", "#ff8a3a"),
      slot("🛡", "10", "#5db8ff"),
      slot("⚡", "20", "#ffd86b"),
    );
    const fast = el("div", "skill-slot fast", "⏩");
    fast.append(el("div", "label", "x2"));
    fast.addEventListener("click", () => this.toast("배속은 준비 중"));
    skill.append(fast);
    this.skillBar = skill;
    this.root.append(skill);

    // ----- Inventory -----
    const inv = el("div", "inventory");
    this.inventoryEl = inv;
    this.root.append(inv);
    this.renderInventory(null);

    // ----- Bottom Nav -----
    const nav = el("div", "bottom-nav");
    const tab = (icon: string, label: string, active = false, notice = false) => {
      const t = el("div", `nav-tab${active ? " active" : ""}${notice ? " has-notice" : ""}`);
      t.append(el("div", "nav-icon", icon), el("div", "nav-label", label));
      if (!active) t.addEventListener("click", () => this.toast(`${label} — 준비 중`));
      return t;
    };
    nav.append(
      tab("🏪", "상점"),
      tab("🛡", "영웅"),
      tab("⚔", "전투", true),
      tab("🏰", "타워"),
      tab("🎁", "인벤토리", false, true),
    );
    this.bottomNav = nav;
    this.root.append(nav);
  }

  toast(msg: string): void {
    const t = el("div", "toast", msg);
    this.root.append(t);
    setTimeout(() => t.remove(), 1700);
  }

  /** 게임 컨텍스트 기반 매 프레임 갱신 (가벼움) */
  syncHud(ctx: GameContext): void {
    this.goldEl.textContent = formatNumber(ctx.gold);
    this.stageNameEl.textContent = `Tower ${ctx.stage}F`;
    this.waveTextEl.textContent = `Wave ${ctx.wave} / ${ctx.wavesPerStage}`;
    const pct = Math.max(0, Math.min(1, ctx.waveProgress)) * 100;
    this.waveFillEl.style.width = `${pct}%`;
  }

  /** 인벤토리 그리드 렌더 (변경 시 호출) */
  renderInventory(equipment: EquipmentSystem | null): void {
    const grid = this.inventoryEl;
    grid.innerHTML = "";
    const slots = 20; // 5x4
    for (let i = 0; i < slots; i++) {
      const slot = el("div", "inv-slot") as HTMLDivElement;
      const e = equipment?.inventory[i];
      if (e) {
        slot.dataset.rarity = e.item.rarity;
        const icon = el("div", "inv-icon", e.item.icon);
        icon.style.color = RARITY_COLOR[e.item.rarity];
        slot.append(icon);
        slot.title = `${e.item.name} (${e.item.rarity})`;
        slot.addEventListener("click", () => {
          const evt = new CustomEvent("autobattler:inv-click", { detail: { index: i } });
          window.dispatchEvent(evt);
        });
      }
      grid.append(slot);
    }
  }

  /** 특성 모달 표시 (Promise<TraitDef>로 선택 결과 반환) */
  showTraitPicker(options: TraitDef[]): Promise<TraitDef> {
    return new Promise((resolve) => {
      const modal = el("div", "trait-picker");
      modal.append(el("h2", undefined, "특성 선택"));
      modal.append(el("p", "sub", "파티 전체에 적용됩니다."));
      const cards = el("div", "trait-cards");
      for (const t of options) {
        const card = el("div", "trait-card");
        card.style.setProperty("--accent", t.color);
        const icon = el("div", "trait-icon", t.icon);
        const name = el("div", "name", t.name);
        const desc = el("div", "desc", t.desc);
        card.append(icon, name, desc);
        card.addEventListener("click", () => {
          modal.remove();
          resolve(t);
        });
        cards.append(card);
      }
      modal.append(cards);
      this.root.append(modal);
    });
  }

  showGameOver(stage: number, wave: number, onRestart: () => void): void {
    const ov = el("div", "game-over");
    ov.append(el("h1", undefined, "GAME OVER"));
    ov.append(el("p", undefined, `도달 — Tower ${stage}F  Wave ${wave}`));
    const btn = el("button", "btn", "다시 시작");
    btn.addEventListener("click", () => {
      ov.remove();
      onRestart();
    });
    ov.append(btn);
    this.root.append(ov);
  }

  setPaused(paused: boolean): void {
    this.pauseBtn.classList.toggle("paused", paused);
    this.pauseBtn.title = paused ? "계속" : "일시정지";
  }

  /** 외부 querySelector 보조 */
  q<T extends HTMLElement = HTMLElement>(sel: string): T | null {
    return $(sel, this.root);
  }
}

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return Math.floor(n).toString();
}
