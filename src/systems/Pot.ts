import Phaser from 'phaser';
import { C, CELL_H, CELL_W, CSS, FONT, POT_T, TOPPING_MINI, type Topping } from '../config/constants';
import type { SoundManager } from './SoundManager';
import { frameOf, icon, setIcon } from '../ui/Frames';
import { bounce, burst, drawBubble, floatText, shake, txt } from '../ui/Juice';

/**
 * 양은냄비 — 냄비 직접 터치 상태 머신
 *
 *   EMPTY ──탭──▶ HEATING ──3.0s──▶ BOILING(골든 2.5s → 센불 4.5s) ──(방치)──▶ BURNT
 *                    │ 탭(조금 일찍)        │ 탭: 골든=PERFECT / 그 외=GOOD
 *                    └────────────────────┴──▶ SIMMERING ──3.5s──▶ READY ──(7s 방치)──▶ BURNT
 *   SIMMERING·READY: 토핑 투입 가능 (재료 탭 → 냄비 탭)
 *   READY 탭 = 서빙 대기 선택(HELD_POT) → 손님 탭으로 서빙 / BURNT 3탭 = 닦기 → EMPTY
 *   HEATING~READY 언제든 휴지통 = EMPTY  (어떤 상태에서도 냄비가 멈추지 않는다)
 */
export enum PotState {
  LOCKED = 'LOCKED',
  EMPTY = 'EMPTY',
  HEATING = 'HEATING',
  BOILING = 'BOILING',
  SIMMERING = 'SIMMERING',
  READY = 'READY',
  BURNT = 'BURNT',
}

export type NoodleGrade = 'perfect' | 'good';
export interface Cooked { toppings: Set<Topping>; noodle: NoodleGrade }

export interface PotTimings { heat: number; golden: number; late: number; simmer: number; ready: number }

export interface PotHooks {
  onTap: (pot: Pot, p: Phaser.Input.Pointer) => void;
  onTrash: (pot: Pot) => void;
  onState: (pot: Pot, prev: PotState) => void;
}

export class Pot {
  state: PotState = PotState.LOCKED;
  t = 0;
  toppings = new Set<Topping>();
  pending = new Set<Topping>();
  noodle: NoodleGrade | null = null;
  scrubs = 0;
  noBurn = false;
  lastTap = -9999;
  timings: PotTimings = { ...POT_T };

  readonly x: number;
  readonly y: number;
  readonly cx: number;
  readonly cy: number;

  private root: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private overlays: Record<Topping, Phaser.GameObjects.Image>;
  private gauge: Phaser.GameObjects.Graphics;
  private minis: Phaser.GameObjects.Container;
  private badge: Phaser.GameObjects.Container;
  private badgeG: Phaser.GameObjects.Graphics;
  private badgeIcon: Phaser.GameObjects.Image;
  private badgeText: Phaser.GameObjects.Text;
  private badgeSub: Phaser.GameObjects.Text;
  private badgeKey = '';
  private arrow: Phaser.GameObjects.Container;
  private kettle: Phaser.GameObjects.Image;
  private trashBtn: Phaser.GameObjects.Container;
  private lockLayer: Phaser.GameObjects.Container;
  private lockText: Phaser.GameObjects.Text;
  private zone: Phaser.GameObjects.Zone;
  private bob: Phaser.Tweens.Tween | null = null;
  private lateShown = false;
  private heldG!: Phaser.GameObjects.Graphics;
  /** 서빙 대기 선택(HELD_POT) 중인지 */
  held = false;

  constructor(private scene: Phaser.Scene, readonly index: number, cell: { x: number; y: number }, private sfx: SoundManager, private hooks: PotHooks) {
    this.x = cell.x;
    this.y = cell.y;
    this.cx = cell.x + 30;
    this.cy = cell.y + 39;

    this.sprite = scene.add.sprite(0, 0, 'pot_modular');
    this.sprite.play('pot_empty');
    const ov = (t: Topping) => scene.add.image(0, 0, 'pot_modular', frameOf(scene, 'pot_modular', `pot_topping_${t}`)).setVisible(false);
    this.overlays = { egg: ov('egg'), scallion: ov('scallion'), cheese: ov('cheese') };
    this.root = scene.add.container(this.cx, this.cy, [this.sprite, this.overlays.egg, this.overlays.scallion, this.overlays.cheese]).setDepth(300);

    this.gauge = scene.add.graphics().setDepth(305);
    this.minis = scene.add.container(this.cx, this.y + 5).setDepth(305);

    this.kettle = icon(scene, this.cx, this.cy - 2, 'ui_kettle').setDepth(306).setAlpha(0.85);
    scene.tweens.add({ targets: this.kettle, y: this.cy - 5, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut' });

    // 행동 뱃지 (면 넣기 / 서빙 / 닦기)
    this.badgeG = scene.add.graphics();
    this.badgeIcon = icon(scene, 0, 0, 'mini_ramen');
    this.badgeText = txt(scene, 0, 0, '', { font: FONT.body, size: 10, color: CSS.black });
    this.badgeSub = txt(scene, 0, 0, 'TAP!', { font: FONT.small, size: 8, color: CSS.white, stroke: CSS.black, strokeW: 2 }).setOrigin(0.5, 0);
    this.badge = scene.add.container(this.cx, this.cy - 10, [this.badgeG, this.badgeIcon, this.badgeText, this.badgeSub]).setDepth(320).setVisible(false);

    // 토핑 대상 화살표
    const arr = icon(scene, 0, 0, 'ui_arrow');
    arr.setData('anim', true);
    const arrTxt = txt(scene, 0, -14, '넣기', { font: FONT.small, size: 8, color: CSS.yellow, stroke: CSS.black, strokeW: 2 }).setOrigin(0.5, 1);
    this.arrow = scene.add.container(this.cx, this.y + 20, [arr, arrTxt]).setDepth(330).setVisible(false);
    scene.tweens.add({ targets: this.arrow, y: this.y + 24, yoyo: true, repeat: -1, duration: 260, ease: 'Sine.InOut' });

    // 휴지통 버튼
    const tg = scene.add.graphics();
    tg.fillStyle(C.black, 0.55).fillRect(-9, -9, 18, 18);
    const ti = icon(scene, 0, 0, 'ui_trash');
    this.trashBtn = scene.add.container(this.x + CELL_W - 10, this.y + CELL_H - 10, [tg, ti]).setDepth(340).setVisible(false);
    this.trashBtn.setInteractive(new Phaser.Geom.Rectangle(-10, -10, 20, 20), Phaser.Geom.Rectangle.Contains);
    this.trashBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      bounce(scene, this.trashBtn, 0.3);
      this.hooks.onTrash(this);
    });

    // 잠금 레이어
    const lg = scene.add.graphics();
    lg.fillStyle(C.black, 0.62).fillRect(this.x + 2, this.y + 12, CELL_W - 4, CELL_H - 14);
    const li = icon(scene, this.cx, this.cy - 4, 'ui_lock');
    this.lockText = txt(scene, this.cx, this.cy + 8, '', { font: FONT.small, size: 8, color: CSS.cream, stroke: CSS.black, strokeW: 2, align: 'center' }).setOrigin(0.5, 0);
    this.lockLayer = scene.add.container(0, 0, [lg, li, this.lockText]).setDepth(350);

    // 셀 전체가 터치 영역 (큼직하게)
    this.zone = scene.add.zone(this.x, this.y, CELL_W, CELL_H).setOrigin(0, 0).setDepth(310).setInteractive();
    this.zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.hooks.onTap(this, p));
    this.heldG = scene.add.graphics().setDepth(318);

    this.applyLocked(true, '');
  }

  // ─── 잠금 ────────────────────────────────────────────────────
  private applyLocked(locked: boolean, label: string) {
    this.lockLayer.setVisible(locked);
    this.lockText.setText(label);
    if (locked) {
      this.state = PotState.LOCKED;
      this.sprite.play('pot_empty').setAlpha(0.5);
      this.kettle.setVisible(false);
      this.refresh();
    }
  }

  lock(label: string) {
    this.applyLocked(true, label);
  }

  setLockLabel(label: string) {
    this.lockText.setText(label);
  }

  unlock(withFx = true) {
    if (this.state !== PotState.LOCKED) return;
    this.lockLayer.setVisible(false);
    this.sprite.setAlpha(1);
    this.enter(PotState.EMPTY);
    if (withFx) {
      this.root.setScale(0.3);
      this.scene.tweens.add({ targets: this.root, scale: 1, duration: 380, ease: 'Back.Out' });
      burst(this.scene, this.cx, this.cy, [C.yellow, C.gold, C.white, C.orange], 18, 80);
    }
  }

  get active() {
    return this.state !== PotState.LOCKED;
  }

  // ─── 조회 ────────────────────────────────────────────────────
  get boilProgress() {
    // 물 붓기~탐 까지 전체 진행 0~1 (게이지용)
    const { heat, golden, late } = this.timings;
    if (this.state === PotState.HEATING) return (this.t / heat) * (heat / (heat + golden + late));
    if (this.state === PotState.BOILING) return (heat + this.t) / (heat + golden + late);
    return 0;
  }

  get inGolden() {
    return this.state === PotState.BOILING && this.t < this.timings.golden;
  }

  canAcceptTopping(t: Topping, ignorePending = false) {
    if (this.state !== PotState.SIMMERING && this.state !== PotState.READY) return false;
    if (this.toppings.has(t)) return false;
    if (!ignorePending && this.pending.has(t)) return false;
    return true;
  }

  contains(px: number, py: number) {
    return px >= this.x && px < this.x + CELL_W && py >= this.y && py < this.y + CELL_H;
  }

  // ─── 행동 ────────────────────────────────────────────────────
  /** 오입력 방지: 같은 냄비를 너무 빨리 두 번 탭하면 두 번째는 무시 */
  guardTap(now: number) {
    if (now - this.lastTap < POT_T.tapGuard) return false;
    this.lastTap = now;
    return true;
  }

  pour() {
    if (this.state !== PotState.EMPTY) return false;
    this.enter(PotState.HEATING);
    this.sfx.pour();
    bounce(this.scene, this.root, 0.15);
    const g = this.scene.add.graphics().setDepth(325);
    g.fillStyle(C.cyan).fillRect(this.cx + 6, this.cy - 30, 2, 16);
    g.fillStyle(C.blue).fillRect(this.cx + 8, this.cy - 30, 1, 16);
    this.scene.tweens.add({ targets: g, alpha: 0, delay: 220, duration: 160, onComplete: () => g.destroy() });
    burst(this.scene, this.cx + 6, this.cy - 8, [C.cyan, C.white, C.blue], 10, 34);
    return true;
  }

  /** 면+스프 — HEATING/BOILING이면 무조건 들어간다 */
  addNoodle(): NoodleGrade | null {
    if (this.state !== PotState.HEATING && this.state !== PotState.BOILING) return null;
    const grade: NoodleGrade = this.inGolden ? 'perfect' : 'good';
    this.noodle = grade;
    if (grade === 'perfect') {
      floatText(this.scene, this.cx, this.cy - 22, 'PERFECT!', CSS.yellow, true);
      this.sfx.perfect();
      burst(this.scene, this.cx, this.cy - 8, [C.yellow, C.gold, C.white, C.green], 16, 74);
      shake(this.scene, 0.004, 90);
    } else {
      floatText(this.scene, this.cx, this.cy - 22, this.state === PotState.HEATING ? '조금 일찍! GOOD' : '조금 늦게! GOOD', CSS.cream);
    }
    this.sfx.plop();
    this.enter(PotState.SIMMERING);
    bounce(this.scene, this.root, 0.22);
    burst(this.scene, this.cx, this.cy - 8, [C.cream, C.red, C.orange], 8, 40);
    return grade;
  }

  addTopping(t: Topping) {
    if (!this.canAcceptTopping(t, true)) return false;
    this.toppings.add(t);
    this.refreshOverlays();
    const o = this.overlays[t];
    o.setScale(1.7).setAlpha(0.3).setY(-12);
    this.scene.tweens.add({ targets: o, scale: 1, alpha: 1, y: 0, duration: 220, ease: 'Back.Out' });
    this.sfx.pop();
    bounce(this.scene, this.root, 0.12);
    burst(this.scene, this.cx, this.cy - 6, [C.white, C.yellow], 6, 30);
    this.refresh();
    return true;
  }

  take(): Cooked | null {
    if (this.state !== PotState.READY) return null;
    const c: Cooked = { toppings: new Set(this.toppings), noodle: this.noodle ?? 'good' };
    this.enter(PotState.EMPTY);
    bounce(this.scene, this.root, 0.2);
    return c;
  }

  dump() {
    if (![PotState.HEATING, PotState.BOILING, PotState.SIMMERING, PotState.READY].includes(this.state)) return false;
    this.sfx.trash();
    burst(this.scene, this.cx, this.cy, [C.grayLt, C.cyan, C.cream], 10, 50);
    floatText(this.scene, this.cx, this.cy - 18, '버림', CSS.grayLt);
    this.enter(PotState.EMPTY);
    return true;
  }

  scrub() {
    if (this.state !== PotState.BURNT) return false;
    this.scrubs++;
    this.sfx.scrub();
    this.root.x = this.cx + (this.scrubs % 2 ? 2 : -2);
    this.scene.tweens.add({ targets: this.root, x: this.cx, duration: 80 });
    burst(this.scene, this.cx, this.cy - 2, [C.white, C.cyan, C.grayLt], 6, 35);
    if (this.scrubs >= 3) {
      floatText(this.scene, this.cx, this.cy - 18, '반짝반짝!', CSS.cyan);
      this.enter(PotState.EMPTY);
    } else {
      this.refresh();
    }
    return true;
  }

  setArrow(on: boolean) {
    this.arrow.setVisible(on);
  }

  /** 서빙 대기 선택: 초록 테두리 + 살짝 떠오름 */
  setHeld(on: boolean) {
    if (on === this.held) return;
    this.held = on;
    if (this.bob) { this.bob.stop(); this.bob = null; }
    this.scene.tweens.add({ targets: this.root, y: this.cy - (on ? 4 : 0), duration: 140, ease: 'Back.Out' });
    if (on) bounce(this.scene, this.root, 0.12);
    this.badgeKey = '';
    this.drawHeld();
    this.drawBadge();
  }

  private drawHeld() {
    const g = this.heldG;
    g.clear();
    if (!this.held) return;
    const on = Math.floor(this.scene.time.now / 150) % 2 === 0;
    g.lineStyle(2, on ? C.green : C.yellow).strokeRect(this.x + 1, this.y + 1, CELL_W - 2, CELL_H - 2);
    g.fillStyle(C.green, 0.12).fillRect(this.x + 2, this.y + 2, CELL_W - 4, CELL_H - 4);
  }

  // ─── 상태 전이 ───────────────────────────────────────────────
  private enter(s: PotState) {
    const prev = this.state;
    this.state = s;
    if (this.held && s !== PotState.READY) {
      this.held = false;
      this.root.y = this.cy;
      this.heldG?.clear();
    }
    this.t = 0;
    this.bob?.stop();
    this.bob = null;
    this.root.setScale(1);
    this.lateShown = false;
    switch (s) {
      case PotState.EMPTY:
        this.sprite.play('pot_empty', true);
        this.toppings.clear();
        this.pending.clear();
        this.noodle = null;
        this.scrubs = 0;
        break;
      case PotState.HEATING:
        this.sprite.play('pot_heating', true);
        break;
      case PotState.BOILING:
        this.sprite.play('pot_boiling_gold', true);
        this.sfx.boil();
        floatText(this.scene, this.cx, this.cy - 22, '보글보글!', CSS.cyan, true);
        this.bob = this.scene.tweens.add({
          targets: this.root, scaleY: { from: 1.07, to: 0.95 }, scaleX: { from: 0.96, to: 1.04 },
          yoyo: true, repeat: -1, duration: 130, ease: 'Sine.InOut',
        });
        break;
      case PotState.SIMMERING:
        this.sprite.play('pot_simmering', true);
        break;
      case PotState.READY:
        this.sprite.play('pot_ready', true);
        floatText(this.scene, this.cx, this.cy - 22, '완성!', CSS.green);
        this.sfx.click();
        break;
      case PotState.BURNT:
        this.sprite.play('pot_burnt', true);
        this.toppings.clear();
        this.pending.clear();
        this.scrubs = 0;
        this.sfx.sizzle();
        shake(this.scene, 0.006, 140);
        floatText(this.scene, this.cx, this.cy - 22, '탔다!!', CSS.red, true);
        break;
    }
    this.refreshOverlays();
    this.refresh();
    if (prev !== s) this.hooks.onState(this, prev);
  }

  private refreshOverlays() {
    const show = this.state === PotState.SIMMERING || this.state === PotState.READY;
    for (const t of Object.keys(this.overlays) as Topping[]) this.overlays[t].setVisible(show && this.toppings.has(t));
  }

  // ─── 매 프레임 ───────────────────────────────────────────────
  update(dt: number) {
    const { heat, golden, late, simmer, ready } = this.timings;
    switch (this.state) {
      case PotState.HEATING:
        this.t += dt;
        if (this.t >= heat) this.enter(PotState.BOILING);
        break;
      case PotState.BOILING:
        this.t += dt;
        if (!this.lateShown && this.t >= golden) {
          // 골든타임 종료 — 센불로 계속 끓는다 (면은 여전히 넣을 수 있음)
          this.lateShown = true;
          this.bob?.stop();
          this.bob = null;
          this.root.setScale(1);
          this.sprite.play('pot_boiling', true);
        }
        if (this.noBurn) this.t = Math.min(this.t, golden + late - 1);
        else if (this.t >= golden + late) this.enter(PotState.BURNT);
        break;
      case PotState.SIMMERING:
        this.t += dt;
        if (this.t >= simmer) this.enter(PotState.READY);
        break;
      case PotState.READY:
        this.t += dt;
        if (this.noBurn) this.t = Math.min(this.t, ready - 1);
        else if (this.t >= ready) this.enter(PotState.BURNT);
        break;
    }
    this.refresh();
  }

  // ─── 그리기 ──────────────────────────────────────────────────
  private refresh() {
    this.drawHeld();
    this.drawGauge();
    this.drawMinis();
    this.drawBadge();
    this.kettle.setVisible(this.state === PotState.EMPTY);
    this.trashBtn.setVisible([PotState.HEATING, PotState.BOILING, PotState.SIMMERING, PotState.READY].includes(this.state));
  }

  private drawGauge() {
    const g = this.gauge;
    g.clear();
    const x = this.x + 5, y = this.y + 11, w = CELL_W - 10, h = 5;
    if (this.state === PotState.LOCKED || this.state === PotState.EMPTY || this.state === PotState.BURNT) return;
    g.fillStyle(C.black).fillRect(x - 1, y - 1, w + 2, h + 2);
    const now = this.scene.time.now;
    if (this.state === PotState.HEATING || this.state === PotState.BOILING) {
      const { heat, golden, late } = this.timings;
      const total = heat + golden + late;
      const wH = Math.round((w * heat) / total);
      const wG = Math.round((w * golden) / total);
      // 구간 트랙
      g.fillStyle(C.blueDk).fillRect(x, y, wH, h);
      g.fillStyle(C.greenDkr).fillRect(x + wH, y, wG, h);
      g.fillStyle(C.brownDk).fillRect(x + wH + wG, y, w - wH - wG, h);
      // 진행 채움
      const p = Phaser.Math.Clamp(this.boilProgress, 0, 1);
      const fx = Math.round(w * p);
      g.fillStyle(C.blue).fillRect(x, y, Math.min(fx, wH), h);
      if (fx > wH) g.fillStyle(this.inGolden && Math.floor(now / 90) % 2 ? C.yellow : C.green).fillRect(x + wH, y, Math.min(fx, wH + wG) - wH, h);
      if (fx > wH + wG) g.fillStyle(C.orange).fillRect(x + wH + wG, y, fx - wH - wG, h);
      // 커서
      g.fillStyle(C.white).fillRect(x + Math.min(fx, w - 1), y - 2, 1, h + 4);
      // 골든 구간 테두리
      g.lineStyle(1, C.green).strokeRect(x + wH - 0.5, y - 1.5, wG + 1, h + 3);
    } else if (this.state === PotState.SIMMERING) {
      const p = Phaser.Math.Clamp(this.t / this.timings.simmer, 0, 1);
      g.fillStyle(C.redDk).fillRect(x, y, w, h);
      g.fillStyle(C.red).fillRect(x, y, Math.round(w * p), h);
      g.fillStyle(C.pink).fillRect(x, y, Math.round(w * p), 1);
    } else if (this.state === PotState.READY) {
      const p = 1 - Phaser.Math.Clamp(this.t / this.timings.ready, 0, 1);
      const warn = !this.noBurn && p < 0.35 && Math.floor(now / 140) % 2;
      g.fillStyle(C.greenDkr).fillRect(x, y, w, h);
      g.fillStyle(warn ? C.red : C.green).fillRect(x, y, Math.round(w * p), h);
    }
  }

  private minisKey = '';
  private drawMinis() {
    const show = this.state === PotState.SIMMERING || this.state === PotState.READY;
    const list: string[] = [];
    if (show) {
      if (this.noodle === 'perfect') list.push('mini_perfect');
      for (const t of ['egg', 'scallion', 'cheese'] as Topping[]) if (this.toppings.has(t)) list.push(TOPPING_MINI[t]);
    }
    const key = list.join(',');
    if (key === this.minisKey) return;
    this.minisKey = key;
    this.minis.removeAll(true);
    const total = list.length * 9 - 1;
    list.forEach((tag, i) => {
      const im = icon(this.scene, -total / 2 + 4 + i * 9, 0, tag);
      this.minis.add(im);
    });
  }

  private drawBadge() {
    let key = '';
    if (this.state === PotState.BOILING) key = this.inGolden ? 'noodle-gold' : 'noodle-late';
    else if (this.state === PotState.READY) key = this.held ? 'held' : 'serve';
    else if (this.state === PotState.BURNT) key = `scrub${this.scrubs}`;
    if (key === this.badgeKey) return;
    this.badgeKey = key;
    this.scene.tweens.killTweensOf(this.badge);
    this.badge.y = this.cy - 10 - (this.held ? 4 : 0);
    if (!key) {
      this.badge.setVisible(false);
      return;
    }
    let label = '', sub = 'TAP!', fill: number = C.white, line: number = C.black, ic = 'mini_ramen', subColor: string = CSS.white;
    if (key === 'noodle-gold') { label = '면 넣기!'; fill = C.green; line = C.greenDkr; ic = 'mini_ramen'; subColor = CSS.yellow; }
    else if (key === 'noodle-late') { label = '면 넣기!'; fill = C.gold; line = C.brownDk; ic = 'mini_ramen'; }
    else if (key === 'serve') { label = '서빙!'; fill = C.yellow; line = C.brownDk; ic = 'mini_heart'; subColor = CSS.yellow; }
    else if (key === 'held') { label = '손님 탭!'; fill = C.green; line = C.greenDkr; ic = 'mini_heart'; sub = '▲'; subColor = CSS.yellow; }
    else { label = '닦기!'; fill = C.grayLt; line = C.black; ic = 'mini_ramen'; sub = `탭 ${3 - this.scrubs}번`; }
    this.badgeText.setText(label).setColor(key === 'noodle-gold' ? CSS.white : CSS.black);
    this.badgeText.setStroke(CSS.greenDk, key === 'noodle-gold' ? 2 : 0);
    setIcon(this.badgeIcon, ic);
    this.badgeIcon.setVisible(key !== 'scrub0' && !key.startsWith('scrub'));
    const iconW = this.badgeIcon.visible ? 10 : 0;
    const w = Math.ceil(this.badgeText.width) + iconW + 8;
    const h = 15;
    this.badgeG.clear();
    drawBubble(this.badgeG, -w / 2, -h / 2, w, h, fill, line, null);
    this.badgeIcon.setPosition(-w / 2 + 4 + 4, 0);
    this.badgeText.setPosition(Math.round(-w / 2 + 4 + iconW), -6);
    this.badgeSub.setText(sub).setColor(subColor).setPosition(0, h / 2 - 1);
    this.badge.setVisible(true);
    this.badge.setScale(0.5);
    this.scene.tweens.add({ targets: this.badge, scale: 1, duration: 180, ease: 'Back.Out' });
    if (key !== 'noodle-late' && !key.startsWith('scrub')) {
      const by = this.cy - 10 - (this.held ? 4 : 0);
      this.scene.tweens.add({ targets: this.badge, y: { from: by, to: by - 3 }, yoyo: true, repeat: -1, duration: 300, ease: 'Sine.InOut' });
    } else {
      this.badge.y = this.cy - 10;
    }
  }
}
