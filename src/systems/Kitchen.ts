import Phaser from 'phaser';
import {
  BOWL_SHELF, C, CSS, FONT, SHELF_ROWS, POT_CELLS, POT_T, POT_T_FAST, STATION_POS, STATION_W, TOPPING_ICON,
  type StationId, type Topping,
} from '../config/constants';
import type { DayConfig } from '../config/days';
import type { ProgressData } from './Progress';
import type { SoundManager } from './SoundManager';
import { Pot, PotState, type Cooked, type PotHooks } from './Pot';
import { frameOf, icon } from '../ui/Frames';
import { arc, bounce, burst, floatText, sparkle, txt } from '../ui/Juice';

export interface KitchenHooks {
  /** READY 냄비를 눌렀을 때 — 서빙 대기 선택(HELD_POT) 처리 (GameScene의 손) */
  pressPot: (pot: Pot, p: Phaser.Input.Pointer) => void;
  /** 재료를 집었을 때 — 다른 선택(냄비·슬러시 등)을 내려놓게 */
  onToppingSelect: () => void;
  /** 아래 안내 줄 메시지 */
  hint: (msg: string, color?: string, ms?: number) => void;
  /** 튜토리얼 등에서 쓰는 이벤트 */
  event: (name: string, data?: unknown) => void;
}

interface Held { t: Topping; station: StationId; until: number }
interface DragCand { station: StationId; t: Topping; x0: number; y0: number; id: number }

const STATION_LABEL: Record<StationId, string> = { board: '도마·대파', egg: '계란', cheese: '치즈', sink: '싱크대' };
const STATION_UNLOCK_DAY: Record<StationId, number> = { board: 2, egg: 2, cheese: 3, sink: 4 };

export class Kitchen {
  /** 영업(또는 튜토리얼) 중에만 입력을 받는다 */
  enabled = false;
  pots: Pot[] = [];
  held: Held | null = null;
  private drag: DragCand | null = null;
  private dragging = false;
  private ghost: Phaser.GameObjects.Image | null = null;

  // 손질대
  private stationSprite = {} as Record<StationId, Phaser.GameObjects.Sprite>;
  private stationGauge = {} as Record<StationId, Phaser.GameObjects.Graphics>;
  private stationGlow = {} as Record<StationId, Phaser.GameObjects.Graphics>;
  private stationLock = {} as Record<StationId, Phaser.GameObjects.Container>;
  private unlocked = {} as Record<StationId, boolean>;
  blockedBy: StationId | null = null; // 고양이가 앉은 스테이션
  chop = 0;
  scallionReady = false;
  readonly chopsNeeded: number;

  // 그릇·설거지
  readonly dishes: boolean;
  cleanBowls = 3;
  dirtyBowls = 0;
  private washP = 0;
  private autoWashT = 0;
  private shelf: Phaser.GameObjects.Container;
  private shelfText: Phaser.GameObjects.Text;
  private sinkHint = false;

  constructor(private scene: Phaser.Scene, private cfg: DayConfig, private progress: ProgressData, private sfx: SoundManager, private hooks: KitchenHooks) {
    this.chopsNeeded = progress.upgrades.knife ? 1 : 3;
    this.dishes = cfg.dishes;

    const timings = {
      heat: progress.upgrades.burner ? POT_T_FAST.heat : POT_T.heat,
      golden: POT_T.golden,
      late: POT_T.late,
      simmer: progress.upgrades.burner ? POT_T_FAST.simmer : POT_T.simmer,
      ready: POT_T.ready,
    };
    const potHooks: PotHooks = {
      onTap: (p, ptr) => this.onPotTap(p, ptr),
      onTrash: (p) => this.onTrash(p),
      onState: (p, prev) => this.hooks.event('pot', { pot: p, prev }),
    };
    POT_CELLS.forEach((cell, i) => {
      const p = new Pot(scene, i, cell, sfx, potHooks);
      p.timings = { ...timings };
      this.pots.push(p);
    });
    this.pots.forEach((p, i) => {
      if (i < cfg.burners) p.lock(''); else p.lock(`Day ${i === 2 ? 4 : 5}`);
    });

    this.buildStations();
    this.shelfText = txt(scene, BOWL_SHELF.x + BOWL_SHELF.w - 6, BOWL_SHELF.y + 4, '', {
      font: FONT.bold, size: 12, color: CSS.white, stroke: CSS.black, strokeW: 2,
    }).setOrigin(1, 0).setDepth(260);
    this.shelf = scene.add.container(0, 0).setDepth(250);
    this.drawShelf();

    // 드래그 (스테이션 → 냄비)
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
  }

  /** 영업 시작 시 화구를 연다 (지연 화구 제외) */
  openBurners(exceptIndex?: number) {
    this.pots.forEach((p, i) => {
      if (i < this.cfg.burners && i !== exceptIndex) p.unlock(false);
    });
  }

  // ─── 손질대 ───────────────────────────────────────────────────
  private buildStations() {
    const s = this.scene;
    (Object.keys(STATION_POS) as StationId[]).forEach((id) => {
      const { x, y } = STATION_POS[id];
      const cx = x + STATION_W / 2;
      const frame = id === 'board' ? 'board_0' : id === 'egg' ? 'egg_basket' : id === 'cheese' ? 'cheese_plate' : 'sink_0';
      const glow = s.add.graphics().setDepth(199);
      const sp = s.add.sprite(cx, y + 22, 'prep', frameOf(s, 'prep', frame)).setDepth(200);
      const label = txt(s, cx, y + 45, STATION_LABEL[id], { font: FONT.small, size: 8, color: CSS.cream }).setOrigin(0.5, 0).setDepth(201);
      const gauge = s.add.graphics().setDepth(202);
      this.stationSprite[id] = sp;
      this.stationGauge[id] = gauge;
      this.stationGlow[id] = glow;
      void label;
      const unlocked = this.cfg.day >= STATION_UNLOCK_DAY[id];
      this.unlocked[id] = unlocked;
      const lg = s.add.graphics();
      lg.fillStyle(C.black, 0.7).fillRect(x, y - 1, STATION_W, 60);
      const li = icon(s, cx, y + 20, 'ui_lock');
      const lt = txt(s, cx, y + 31, `Day ${STATION_UNLOCK_DAY[id]}`, { font: FONT.small, size: 8, color: CSS.grayLt }).setOrigin(0.5, 0);
      this.stationLock[id] = s.add.container(0, 0, [lg, li, lt]).setDepth(230).setVisible(!unlocked);

      const zone = s.add.zone(x, y - 2, STATION_W, 62).setOrigin(0, 0).setDepth(210).setInteractive();
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.onStationDown(id, p));
    });
    this.drawStationGauges();
  }

  private toppingOf(id: StationId): Topping | null {
    if (id === 'egg') return 'egg';
    if (id === 'cheese') return 'cheese';
    if (id === 'board') return this.scallionReady ? 'scallion' : null;
    return null;
  }

  private onStationDown(id: StationId, p: Phaser.Input.Pointer) {
    if (!this.enabled) return;
    if (!this.unlocked[id]) {
      this.sfx.error();
      this.hooks.hint(`Day ${STATION_UNLOCK_DAY[id]}에 열려요`, CSS.grayLt);
      return;
    }
    if (this.blockedBy === id) {
      this.sfx.meow();
      this.hooks.hint('고양이가 앉아 있어요! 고양이를 탭!', CSS.orange);
      bounce(this.scene, this.stationSprite[id], 0.1);
      return;
    }
    if (id === 'sink') {
      this.washOnce();
      return;
    }
    if (id === 'board' && !this.scallionReady) {
      this.chopOnce();
      return;
    }
    // 같은 스테이션을 다시 탭 → 들고 있던 토핑 취소
    if (this.held && this.held.station === id) {
      this.cancelHold('취소했어요');
      return;
    }
    const t = this.toppingOf(id);
    if (!t) return;
    this.drag = { station: id, t, x0: p.x, y0: p.y, id: p.id };
    this.dragging = false;
    bounce(this.scene, this.stationSprite[id], 0.1);
  }

  private chopOnce() {
    this.chop++;
    this.sfx.chop();
    const sp = this.stationSprite.board;
    sp.setFrame(frameOf(this.scene, 'prep', 'board_chop'));
    bounce(this.scene, sp, 0.08);
    burst(this.scene, sp.x - 4, sp.y + 4, [C.green, C.cream, C.white], 5, 26);
    this.scene.time.delayedCall(90, () => this.refreshBoard());
    if (this.chop >= this.chopsNeeded) {
      this.scallionReady = true;
      this.chop = this.chopsNeeded;
      sparkle(this.scene, sp.x, sp.y);
      floatText(this.scene, sp.x, sp.y - 16, '썬 대파 준비!', CSS.green);
      this.hooks.event('scallion-ready');
    }
    this.drawStationGauges();
  }

  private refreshBoard() {
    const sp = this.stationSprite.board;
    if (this.scallionReady) sp.setFrame(frameOf(this.scene, 'prep', 'board_ready'));
    else {
      const stage = this.chopsNeeded === 1 ? 0 : Math.min(2, this.chop);
      sp.setFrame(frameOf(this.scene, 'prep', `board_${stage}`));
    }
  }

  private consumeScallion() {
    this.scallionReady = false;
    this.chop = 0;
    this.refreshBoard();
    this.drawStationGauges();
  }

  // ─── 토핑 투입: 재료 탭(선택) → 냄비 탭 (냄비가 1개여도 자동으로 들어가지 않음) ──
  eligible(t: Topping) {
    return this.pots.filter((p) => p.active && p.canAcceptTopping(t));
  }

  toppingTap(id: StationId, t: Topping) {
    const el = this.eligible(t);
    if (el.length === 0) {
      this.sfx.error();
      const anyCooking = this.pots.some((p) => p.state === PotState.SIMMERING || p.state === PotState.READY);
      this.hooks.hint(anyCooking ? '그 토핑은 이미 들어 있어요' : '면이 익는 중이거나 완성된 냄비에만 넣어요', CSS.grayLt);
      return;
    }
    this.hooks.onToppingSelect();
    this.held = { t, station: id, until: this.scene.time.now + 6000 };
    this.sfx.pick();
    bounce(this.scene, this.stationSprite[id], 0.14);
    this.hooks.hint('넣을 냄비를 탭하세요! (같은 재료 다시 탭 = 취소)', CSS.yellow, 6000);
    this.hooks.event('hold', t);
  }

  /** 테스트·봇용: 스테이션 탭 */
  tapStation(id: StationId) {
    this.onStationDown(id, { x: -999, y: -999, id: -1 } as Phaser.Input.Pointer);
    const d = this.drag;
    if (d) {
      this.drag = null;
      this.toppingTap(d.station, d.t);
    }
  }

  /** 테스트·봇용: 냄비 탭 */
  tapPot(pot: Pot) {
    pot.lastTap = -9999;
    this.onPotTap(pot, { x: pot.cx, y: pot.cy, id: -1 } as Phaser.Input.Pointer);
  }

  cancelHold(msg?: string) {
    if (!this.held) return;
    this.held = null;
    if (msg) this.sfx.unpick();
    this.hooks.hint(msg ?? '', CSS.grayLt, msg ? 1200 : 0);
  }

  private flyTopping(from: StationId, t: Topping, pot: Pot, start?: { x: number; y: number }) {
    pot.pending.add(t);
    if (t === 'scallion') this.consumeScallion();
    const sp = this.stationSprite[from];
    const ghost = icon(this.scene, start?.x ?? sp.x, start?.y ?? sp.y - 6, TOPPING_ICON[t]).setDepth(1800);
    this.sfx.whoosh();
    arc(this.scene, ghost, pot.cx, pot.cy - 6, start ? 160 : 260, () => {
      ghost.destroy();
      pot.pending.delete(t);
      if (!pot.addTopping(t)) {
        // 날아가는 사이 냄비가 비워졌다면 재료를 돌려준다
        if (t === 'scallion') { this.scallionReady = true; this.chop = this.chopsNeeded; this.refreshBoard(); this.drawStationGauges(); }
        this.hooks.hint('냄비 상태가 바뀌어서 재료를 돌려놨어요', CSS.grayLt);
      } else {
        this.hooks.event('topping', { pot, t });
      }
    }, start ? 16 : 30);
  }

  // ─── 드래그 앤 드롭 ───────────────────────────────────────────
  private onMove(p: Phaser.Input.Pointer) {
    const d = this.drag;
    if (!d || p.id !== d.id) return;
    if (!this.dragging && Phaser.Math.Distance.Between(p.x, p.y, d.x0, d.y0) > 8) {
      this.dragging = true;
      this.cancelHold();
      this.hooks.onToppingSelect();
      this.ghost = icon(this.scene, p.x, p.y, TOPPING_ICON[d.t]).setDepth(1800).setScale(1.5);
    }
    if (this.dragging && this.ghost) this.ghost.setPosition(Math.round(p.x), Math.round(p.y - 10));
  }

  private onUp(p: Phaser.Input.Pointer) {
    const d = this.drag;
    if (!d || p.id !== d.id) return;
    this.drag = null;
    if (!this.enabled) {
      this.dragging = false;
      this.ghost?.destroy();
      this.ghost = null;
      return;
    }
    if (!this.dragging) {
      this.toppingTap(d.station, d.t);
      return;
    }
    this.dragging = false;
    const gx = this.ghost?.x ?? p.x, gy = this.ghost?.y ?? p.y;
    this.ghost?.destroy();
    this.ghost = null;
    const pot = this.pots.find((q) => q.contains(p.x, p.y));
    if (pot && pot.active && pot.canAcceptTopping(d.t)) {
      if (d.t === 'scallion' && !this.scallionReady) return;
      this.flyTopping(d.station, d.t, pot, { x: gx, y: gy });
    } else {
      this.sfx.error();
      this.hooks.hint(pot ? '그 냄비엔 넣을 수 없어요' : '냄비 위에 놓아 주세요', CSS.grayLt);
    }
  }

  // ─── 냄비 탭 ─────────────────────────────────────────────────
  private onPotTap(pot: Pot, ptr: Phaser.Input.Pointer) {
    if (!this.enabled) return;
    const now = this.scene.time.now;
    if (pot.state === PotState.LOCKED) {
      this.sfx.error();
      this.hooks.hint('아직 꺼진 화구예요', CSS.grayLt);
      return;
    }
    // 토핑을 고르는 중이면 그 토핑부터 처리
    if (this.held) {
      const h = this.held;
      this.held = null;
      this.hooks.hint('', CSS.grayLt, 0);
      if (pot.canAcceptTopping(h.t) && (h.t !== 'scallion' || this.scallionReady)) {
        this.flyTopping(h.station, h.t, pot);
      } else {
        this.sfx.error();
        this.hooks.hint('그 냄비엔 넣을 수 없어서 취소했어요', CSS.grayLt);
      }
      return;
    }
    if (pot.state !== PotState.READY && !pot.guardTap(now)) return;
    switch (pot.state) {
      case PotState.EMPTY:
        pot.pour();
        break;
      case PotState.HEATING:
      case PotState.BOILING: {
        const g = pot.addNoodle();
        if (g) this.hooks.event('noodle', { pot, grade: g });
        break;
      }
      case PotState.SIMMERING:
        this.sfx.click();
        this.hooks.hint(this.cfg.toppings.length ? '면이 익는 중! 지금 토핑을 넣어요' : '면이 익는 중이에요…', CSS.cream);
        break;
      case PotState.READY:
        this.hooks.pressPot(pot, ptr);
        break;
      case PotState.BURNT:
        pot.scrub();
        break;
    }
  }

  private onTrash(pot: Pot) {
    if (!this.enabled) return;
    if (this.held) this.cancelHold();
    for (const t of pot.pending) if (t === 'scallion') { this.scallionReady = true; this.chop = this.chopsNeeded; this.refreshBoard(); }
    pot.dump();
    this.hooks.event('trash', pot);
  }

  // ─── 그릇 & 설거지 ───────────────────────────────────────────
  hasCleanBowl() {
    return !this.dishes || this.cleanBowls > 0;
  }

  useBowl() {
    if (!this.dishes) return;
    this.cleanBowls = Math.max(0, this.cleanBowls - 1);
    this.drawShelf();
  }

  /** 손님이 다 먹은 빈 그릇 → 카운터 → 싱크대 */
  returnDirty(fromX: number, fromY: number) {
    if (!this.dishes) return;
    const d = icon(this.scene, fromX, fromY, 'ui_bowl_dirty').setDepth(1700);
    this.scene.tweens.add({ targets: d, y: fromY - 3, yoyo: true, duration: 120 });
    this.scene.time.delayedCall(700, () => {
      const sink = this.stationSprite.sink;
      arc(this.scene, d, sink.x, sink.y - 2, 420, () => {
        d.destroy();
        this.dirtyBowls++;
        this.sfx.scrub();
        this.refreshSink();
        this.hooks.event('dirty');
      }, 24);
    });
  }

  private washOnce(auto = false) {
    if (this.dirtyBowls <= 0) {
      if (!auto) {
        this.sfx.click();
        this.hooks.hint(this.dishes ? '닦을 그릇이 없어요' : '싱크대는 Day 4부터 써요', CSS.grayLt);
      }
      return;
    }
    const sp = this.stationSprite.sink;
    sp.play('sink_wash');
    this.scene.time.delayedCall(280, () => {
      sp.anims.stop();
      this.setSinkFrame();
    });
    this.sfx.wash();
    bounce(this.scene, sp, 0.06);
    this.washP += auto ? 1 : 1 / 3;
    if (this.washP >= 0.999) {
      this.washP = 0;
      this.dirtyBowls--;
      const b = icon(this.scene, sp.x, sp.y - 4, 'ui_bowl').setDepth(1700);
      arc(this.scene, b, BOWL_SHELF.x + 20 + (this.cleanBowls % 4) * 18, BOWL_SHELF.y + 28, 380, () => {
        b.destroy();
        this.cleanBowls++;
        this.drawShelf();
        sparkle(this.scene, BOWL_SHELF.x + 30, BOWL_SHELF.y + 26);
      }, 30);
      floatText(this.scene, sp.x, sp.y - 18, auto ? '자동 세척!' : '뽀득!', CSS.cyan);
      this.hooks.event('washed');
    }
    this.refreshSink();
  }

  private refreshSink() {
    const sp = this.stationSprite.sink;
    if (!sp.anims.isPlaying) this.setSinkFrame();
    this.drawStationGauges();
  }

  private setSinkFrame() {
    const sp = this.stationSprite.sink;
    sp.setFrame(frameOf(this.scene, 'prep', this.dirtyBowls === 0 ? 'sink_0' : this.dirtyBowls < 3 ? 'sink_1' : 'sink_2'));
  }

  private drawShelf() {
    this.shelf.removeAll(true);
    if (!this.dishes) {
      // 장식용 그릇 (Day 1~3은 그릇 무제한)
      for (let i = 0; i < 4; i++) this.shelf.add(icon(this.scene, BOWL_SHELF.x + 14 + i * 20, BOWL_SHELF.y + 28, 'ui_bowl'));
      if (SHELF_ROWS > 1) for (let i = 0; i < 3; i++) this.shelf.add(icon(this.scene, BOWL_SHELF.x + 24 + i * 20, BOWL_SHELF.y + 64, 'ui_slush'));
      this.shelfText.setText('');
      return;
    }
    const n = this.cleanBowls;
    for (let i = 0; i < Math.min(n, 4 * SHELF_ROWS); i++) {
      const row = Math.floor(i / 4);
      this.shelf.add(icon(this.scene, BOWL_SHELF.x + 14 + (i % 4) * 20, BOWL_SHELF.y + 28 + row * 36, 'ui_bowl'));
    }
    this.shelfText.setText(`그릇 ${n}`).setColor(n === 0 ? CSS.red : CSS.white);
    if (n === 0) {
      const warn = txt(this.scene, BOWL_SHELF.x + BOWL_SHELF.w / 2, BOWL_SHELF.y + Math.min(40, BOWL_SHELF.h / 2 + 4), '그릇 없음!\n싱크대 탭', {
        font: FONT.body, size: 10, color: CSS.red, stroke: CSS.black, strokeW: 2, align: 'center',
      }).setOrigin(0.5);
      this.shelf.add(warn);
    }
  }

  flashSink() {
    this.sinkHint = true;
    this.scene.time.delayedCall(2500, () => (this.sinkHint = false));
  }

  private drawStationGauges() {
    const gb = this.stationGauge.board;
    gb.clear();
    if (this.unlocked.board) {
      const { x, y } = STATION_POS.board;
      const w = STATION_W - 12;
      gb.fillStyle(C.black).fillRect(x + 5, y + 55, w + 2, 5);
      for (let i = 0; i < this.chopsNeeded; i++) {
        const sw = Math.floor(w / this.chopsNeeded) - 1;
        gb.fillStyle(i < this.chop ? C.green : C.slate).fillRect(x + 6 + i * (sw + 1), y + 56, sw, 3);
      }
    }
    const gs = this.stationGauge.sink;
    gs.clear();
    if (this.unlocked.sink && this.dishes) {
      const { x, y } = STATION_POS.sink;
      const w = STATION_W - 12;
      gs.fillStyle(C.black).fillRect(x + 5, y + 55, w + 2, 5);
      gs.fillStyle(C.slate).fillRect(x + 6, y + 56, w, 3);
      gs.fillStyle(C.cyan).fillRect(x + 6, y + 56, Math.round(w * this.washP), 3);
      if (this.dirtyBowls > 0) {
        const n = Math.min(this.dirtyBowls, 9);
        for (let i = 0; i < n; i++) gs.fillStyle(C.red).fillRect(x + 6 + i * 4, y - 2, 3, 3);
      }
    }
  }

  // ─── 고양이용 ───────────────────────────────────────────────
  stationCenter(id: StationId) {
    const sp = this.stationSprite[id];
    return { x: sp.x, y: sp.y };
  }

  isUnlocked(id: StationId) {
    return this.unlocked[id];
  }

  /** 고양이가 썬 대파를 먹어버림 */
  stealScallion() {
    if (!this.scallionReady) return false;
    this.consumeScallion();
    return true;
  }

  // ─── 매 프레임 ───────────────────────────────────────────────
  update(dt: number, now: number) {
    for (const p of this.pots) p.update(dt);

    // 들고 있는 토핑: 시간 초과 또는 넣을 냄비가 없어지면 자동 취소 (먹통 방지)
    if (this.held) {
      if (now > this.held.until) this.cancelHold('토핑 선택 시간이 지나 취소했어요');
      else if (this.eligible(this.held.t).length === 0) this.cancelHold();
    }
    const showArrowsFor = this.held?.t ?? (this.dragging ? this.drag?.t : undefined);
    for (const p of this.pots) p.setArrow(!!showArrowsFor && p.active && p.canAcceptTopping(showArrowsFor));

    // 스테이션 강조
    const blink = Math.floor(now / 160) % 2 === 0;
    for (const id of Object.keys(this.stationGlow) as StationId[]) {
      const g = this.stationGlow[id];
      g.clear();
      const { x, y } = STATION_POS[id];
      let on = false;
      if (this.held?.station === id) on = true;
      if (id === 'sink' && this.dishes && (this.sinkHint || (this.cleanBowls === 0 && this.dirtyBowls > 0))) on = blink;
      if (id === 'board' && this.scallionReady) on = blink && !this.held;
      if (on) g.lineStyle(2, C.yellow).strokeRect(x, y - 2, STATION_W, 62);
    }

    // 자동 설거지 보조
    if (this.dishes && this.progress.upgrades.autowash) {
      this.autoWashT += dt;
      if (this.autoWashT >= 3500) {
        this.autoWashT = 0;
        if (this.dirtyBowls > 0) this.washOnce(true);
      }
    }
  }

  /** 서빙 강조용: 지금 READY 상태인 냄비들의 내용물 */
  readyCooked(): Cooked[] {
    return this.pots.filter((p) => p.state === PotState.READY).map((p) => ({ toppings: p.toppings, noodle: p.noodle ?? 'good' }));
  }
}
