import { Renderer } from "./Renderer";
import { GameLoop } from "./GameLoop";
import { Camera } from "./Camera";
import { TweenManager } from "./Tween";
import { RNG } from "./RNG";
import {
  drawStageBackground,
  STAGE_W,
  floorTopY,
  FLOOR_HEIGHT,
} from "./Stage";
import type { GameContext } from "./Types";

import { Character } from "../entities/Character";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Drop } from "../entities/Drop";
import {
  drawFloatingTexts,
  drawParticles,
  updateFloatingTexts,
  updateParticles,
  spawnFloatingText,
} from "../effects/Effects";

import { AISystem } from "../systems/AISystem";
import { CombatSystem } from "../systems/CombatSystem";
import { WaveSystem } from "../systems/WaveSystem";
import { DropSystem } from "../systems/DropSystem";
import { EquipmentSystem } from "../systems/EquipmentSystem";
import { TraitSystem } from "../systems/TraitSystem";
import { UltimateSystem } from "../systems/UltimateSystem";

import { UI } from "../ui/UI";

export class Game {
  renderer: Renderer;
  loop: GameLoop;
  ui: UI;

  ctx: GameContext;
  party: Character[] = [];

  combat: CombatSystem;
  ai: AISystem;
  wave: WaveSystem;
  drop: DropSystem;
  equipment: EquipmentSystem;
  trait: TraitSystem;
  ult: UltimateSystem;

  private offerPending = false;

  constructor(canvas: HTMLCanvasElement, uiRootId: string) {
    this.renderer = new Renderer(canvas);
    this.ui = new UI(uiRootId);

    this.ctx = {
      allies: [],
      enemies: [],
      projectiles: [],
      drops: [],
      floatingTexts: [],
      particles: [],
      camera: new Camera(),
      tween: new TweenManager(),
      rng: new RNG(),
      time: 0,
      stage: 1,
      wave: 1,
      wavesPerStage: 1,
      waveProgress: 0,
      gold: 0,
      gameOver: false,
      pickerActive: false,
    };

    this.combat = new CombatSystem();
    this.ai = new AISystem(this.combat);
    this.wave = new WaveSystem();
    this.drop = new DropSystem();
    this.equipment = new EquipmentSystem();
    this.trait = new TraitSystem();
    this.ult = new UltimateSystem();

    this.equipment.onChange = () => this.ui.renderInventory(this.equipment);

    this.wave.onWaveClear = (stage, wv) => {
      // 3웨이브 누적마다 특성 제안
      const total = (stage - 1) * 100 + wv;
      if (total % 3 === 0) {
        this.offerPending = true;
      }
    };

    this.loop = new GameLoop((dt) => this.tick(dt));

    this.spawnParty();
    this.wave.start(this.ctx);
    this.trait.attachToParty(this.party);

    this.bindEvents();
  }

  start(): void {
    this.loop.start();
  }

  spawnParty(): void {
    this.party = [];
    this.ctx.allies = [];
    const positions: Array<{ cls: "warrior" | "archer" | "mage"; x: number; floor: number }> = [
      { cls: "warrior", x: 200, floor: 1 },
      { cls: "archer", x: 130, floor: 2 },
      { cls: "mage", x: 90, floor: 2 },
    ];
    for (const p of positions) {
      const c = new Character(p.cls, p.x, p.floor);
      this.party.push(c);
      this.ctx.allies.push(c);
    }
  }

  private bindEvents(): void {
    window.addEventListener("autobattler:item-pickup", (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.item) return;
      this.equipment.pickUp(detail.item, this.party, this.ctx);
      this.equipment.trimInventory(20);
    });
    window.addEventListener("autobattler:toggle-pause", () => {
      const paused = this.loop.togglePause();
      this.ui.setPaused(paused);
    });
    window.addEventListener("autobattler:toggle-auto-equip", () => {
      const on = this.equipment.toggleAuto();
      this.ui.toast(on ? "자동 장착 ON" : "자동 장착 OFF");
    });
    window.addEventListener("autobattler:inv-click", (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const idx = detail.index as number;
      const entry = this.equipment.inventory[idx];
      if (!entry) return;
      // 살아있는 캐릭터 중 슬롯이 비었거나 등급이 낮은 첫 캐릭터에게
      const target =
        this.party.find((c) => c.alive && !c.equipment[entry.item.slot]) ??
        this.party.find((c) => c.alive);
      if (!target) return;
      this.equipment.manualEquipFromInventory(idx, target);
    });
  }

  private async maybeOfferTrait(): Promise<void> {
    if (!this.offerPending) return;
    if (this.ctx.pickerActive) return;
    this.offerPending = false;
    this.ctx.pickerActive = true;
    const opts = this.trait.pickOptions(this.ctx);
    const picked = await this.ui.showTraitPicker(opts);
    this.trait.apply(picked, this.party);
    spawnFloatingText(this.ctx.floatingTexts, 240, 320, picked.name, "#ffd86b", 1.4);
    this.ctx.camera.flash("#ffd86b", 0.3);
    this.ctx.pickerActive = false;
  }

  private tick(dt: number): void {
    if (this.ctx.gameOver) {
      // 정지 — 카메라/이펙트만 갱신
      this.ctx.camera.update(dt);
      updateFloatingTexts(this.ctx.floatingTexts, dt);
      updateParticles(this.ctx.particles, dt);
      this.render();
      return;
    }

    if (this.ctx.pickerActive) {
      // 모달 중엔 시뮬 정지, 시각 효과만 살짝
      this.ctx.camera.update(dt);
      updateFloatingTexts(this.ctx.floatingTexts, dt);
      updateParticles(this.ctx.particles, dt);
      this.render();
      return;
    }

    this.ctx.time += dt;

    // 시스템 update
    this.ai.update(dt, this.ctx);
    this.combat;
    this.wave.update(dt, this.ctx);
    this.ult.update(dt, this.ctx);

    // 엔티티 update
    for (const a of this.ctx.allies) a.update(dt, this.ctx);
    for (const e of this.ctx.enemies) e.update(dt, this.ctx);
    for (const p of this.ctx.projectiles) p.update(dt, this.ctx);
    for (const d of this.ctx.drops) d.update(dt, this.ctx);

    // Drop pruning + kill processing
    this.drop.update(dt, this.ctx);
    this.ctx.projectiles = this.ctx.projectiles.filter((p) => p.alive);
    this.ctx.drops = this.ctx.drops.filter((d) => d.alive);

    // Tween/Effect/Camera
    this.ctx.tween.update(dt);
    this.ctx.camera.update(dt);
    updateFloatingTexts(this.ctx.floatingTexts, dt);
    updateParticles(this.ctx.particles, dt);

    // 게임 오버 판정
    if (this.party.every((c) => !c.alive)) {
      this.ctx.gameOver = true;
      this.ui.showGameOver(this.ctx.stage, this.ctx.wave, () => this.restart());
    }

    // 트레잇 모달
    void this.maybeOfferTrait();

    // UI HUD sync
    this.ui.syncHud(this.ctx);

    // Render
    this.render();
  }

  private render(): void {
    const r = this.renderer;
    const ctx = r.ctx;
    r.clear();
    this.ctx.camera.applyTransform(ctx);

    // Stage 배경
    drawStageBackground(ctx);

    // 엔티티 — 아래쪽 층(높은 y)부터 그리려면 y로 정렬
    const drawables: Array<{ y: number; draw: (c: CanvasRenderingContext2D) => void }> = [];
    for (const a of this.ctx.allies) drawables.push({ y: a.y, draw: (c) => a.draw(c) });
    for (const e of this.ctx.enemies) drawables.push({ y: e.y, draw: (c) => e.draw(c) });
    for (const d of this.ctx.drops) drawables.push({ y: d.y, draw: (c) => d.draw(c) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw(ctx);

    // 투사체는 위에
    for (const p of this.ctx.projectiles) p.draw(ctx);

    // 파티클 / 텍스트
    drawParticles(this.ctx.particles, ctx);
    drawFloatingTexts(this.ctx.floatingTexts, ctx);

    this.ctx.camera.resetTransform(ctx);

    // 화면 플래시 오버레이
    this.ctx.camera.drawFlash(ctx, STAGE_W, r.height);

    // (디버그) 층 가이드 라인은 생략 — Stage 배경에 이미 표시
    void floorTopY;
    void FLOOR_HEIGHT;
  }

  restart(): void {
    this.ctx.gameOver = false;
    this.ctx.allies = [];
    this.ctx.enemies = [];
    this.ctx.projectiles = [];
    this.ctx.drops = [];
    this.ctx.floatingTexts = [];
    this.ctx.particles = [];
    this.ctx.gold = 0;
    this.ctx.time = 0;
    this.ctx.waveProgress = 0;
    this.ctx.pickerActive = false;
    this.equipment.inventory = [];
    this.trait.mods = (function () {
      // newTraitMods inline
      return {
        atkPct: 0,
        asPct: 0,
        hpPct: 0,
        blastPct: 0,
        lifestealPct: 0,
        critRatePct: 0,
      };
    })();
    this.spawnParty();
    this.wave = new WaveSystem();
    this.wave.onWaveClear = (stage, wv) => {
      const total = (stage - 1) * 100 + wv;
      if (total % 3 === 0) this.offerPending = true;
    };
    this.wave.start(this.ctx);
    this.trait.attachToParty(this.party);
    this.equipment.onChange?.();
  }
}
