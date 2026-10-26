import Phaser from 'phaser';
import { C, CSS, CUP_TRASH, FONT, GAME_W, LEVER, SLUSH, SLUSH_GAUGE, SLUSH_POS } from '../config/constants';
import type { SoundManager } from './SoundManager';
import { frameOf, icon } from '../ui/Frames';
import { bounce, burst, floatText, shake, txt } from '../ui/Juice';

/**
 * 슬러시 기계 — 오른쪽 끝 '레버 아래로 당기기' 방식 (v2.2)
 *
 *   [게이지][  기계 + 컵  ]   [레버]
 *    136~146   150~198         204~240   ← 손가락은 오른쪽 레버에만 올라가므로 게이지·컵을 가리지 않는다
 *
 *  - 레버를 잡고 아래로 당기면 당긴 깊이(pull)만큼 빠르게 차오름 (15% 이하는 멈춤, 30~50%는 천천히, 100%는 빠르게)
 *  - 손을 떼면 레버가 스프링으로 '철컥!' 올라가며 추출 정지 → 평가 (80~92% = PERFECT) → 완성 컵 대기(CUP_READY)
 *  - 완성 컵은 절대 자동으로 날아가지 않는다: 컵 탭(HELD_SLUSH) → 원하는 손님 탭 (드래그도 가능)
 *  - 컵 옆 작은 휴지통 = 잘못 뽑은 컵 버리기
 *  - 100% 초과 = 넘침 → 2초 정지 + 컵을 2번 탭해서 닦기
 */
export enum SlushState { LOCKED = 'LOCKED', IDLE = 'IDLE', HOLDING = 'HOLDING', CUP_READY = 'CUP_READY', OVERFLOW = 'OVERFLOW' }

export interface SlushResult { quality: number; perfect: boolean }

export interface SlushHooks {
  /** 완성 컵을 눌렀을 때 → 손(선택) 처리 */
  press: (p: Phaser.Input.Pointer) => void;
  hint: (msg: string, color?: string) => void;
  event: (name: string) => void;
}

const TRAVEL = LEVER.bottom - LEVER.top;

/** 당긴 깊이 → 초당 채움 비율 */
export function pourRate(pull: number) {
  if (pull <= SLUSH.deadZone) return 0;
  const t = (pull - SLUSH.deadZone) / (1 - SLUSH.deadZone);
  return (0.22 + 0.78 * Math.pow(t, 1.4)) * (1000 / SLUSH.fillMs);
}

export class Slush {
  enabled = false;
  state = SlushState.LOCKED;
  fill = 0;
  /** 0(레버 위) ~ 1(끝까지 당김) */
  pull = 0;
  private poured = false;
  /** 마지막 추출 결과 (테스트·디버그용) */
  last: SlushResult | 'too-little' | 'overflow' | null = null;
  private cupResult: SlushResult | null = null;
  private lockMs = 0;
  private wipes = 0;
  private machine: Phaser.GameObjects.Sprite;
  private cup: Phaser.GameObjects.Image;
  private gauge: Phaser.GameObjects.Graphics;
  private track: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Image;
  private knobTween: Phaser.Tweens.Tween | null = null;
  private cupPrompt: Phaser.GameObjects.Text;
  private leverPrompt: Phaser.GameObjects.Text;
  private root: Phaser.GameObjects.Container;
  private lockLayer: Phaser.GameObjects.Container;
  private holdPointer: number | null = null;
  private trashBtn: Phaser.GameObjects.Container;
  private heldG: Phaser.GameObjects.Graphics;
  /** 서빙 대기 선택(HELD_SLUSH) 중인지 */
  held = false;
  private grabOffset = 0;
  private pouringSfx = false;
  readonly cx = SLUSH_POS.x + 24;
  /** 컵 중심 (서빙 출발점, 테스트용) */
  readonly cupAt = { x: SLUSH_POS.x + 24, y: SLUSH_POS.y + 51 };

  constructor(private scene: Phaser.Scene, private sfx: SoundManager, private hooks: SlushHooks, enabled: boolean) {
    const by = SLUSH_POS.y + 64;
    this.machine = scene.add.sprite(0, 0, 'slush_machine').setOrigin(0.5, 1);
    this.machine.play('slush_idle');
    this.cup = scene.add.image(0, 0, 'slush_machine', frameOf(scene, 'slush_machine', 'slush_cup')).setOrigin(0.5, 1).setVisible(false);
    this.root = scene.add.container(this.cx, by, [this.machine, this.cup]).setDepth(300);
    this.gauge = scene.add.graphics().setDepth(301);

    // ── 레버 트랙 + 손잡이 ──
    this.track = scene.add.graphics().setDepth(302);
    this.knob = icon(scene, LEVER.x, LEVER.top, 'ui_knob').setScale(2).setDepth(305).setOrigin(0.47, 0.45);

    this.cupPrompt = txt(scene, this.cx, SLUSH_POS.y - 1, '', { font: FONT.small, size: 8, color: CSS.cyan, stroke: CSS.black, strokeW: 2 })
      .setOrigin(0.5, 1).setDepth(320).setVisible(false);
    this.leverPrompt = txt(scene, LEVER.x - 1, LEVER.bottom + 9, '당기기', { font: FONT.small, size: 8, color: CSS.yellow, stroke: CSS.black, strokeW: 2 })
      .setOrigin(0.5, 0).setDepth(320);
    scene.tweens.add({ targets: [this.cupPrompt, this.leverPrompt], y: '-=2', yoyo: true, repeat: -1, duration: 400 });

    // 완성 컵 버리기 휴지통 (받침대 위)
    const tg = scene.add.graphics();
    tg.fillStyle(C.black, 0.6).fillRect(-8, -8, 16, 16);
    this.trashBtn = scene.add.container(CUP_TRASH.x, CUP_TRASH.y, [tg, icon(scene, 0, 0, 'ui_trash')]).setDepth(325).setVisible(false);
    this.trashBtn.setInteractive(new Phaser.Geom.Rectangle(-10, -10, 20, 20), Phaser.Geom.Rectangle.Contains);
    this.trashBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      if (!this.enabled) return;
      bounce(scene, this.trashBtn, 0.3);
      this.discardCup();
    });
    this.heldG = scene.add.graphics().setDepth(319);

    // 잠금 (Day 3 이전)
    const lg = scene.add.graphics();
    lg.fillStyle(C.black, 0.66).fillRect(SLUSH_GAUGE.x - 4, SLUSH_POS.y - 6, GAME_W - (SLUSH_GAUGE.x - 4) - 2, 80);
    const li = icon(scene, 186, SLUSH_POS.y + 26, 'ui_lock');
    const lt = txt(scene, 186, SLUSH_POS.y + 38, 'Day 3', { font: FONT.small, size: 8, color: CSS.grayLt }).setOrigin(0.5, 0);
    this.lockLayer = scene.add.container(0, 0, [lg, li, lt]).setDepth(330);

    // ── 입력 영역: 레버(오른쪽) / 컵·기계(왼쪽) 분리 ──
    const lz = scene.add.zone(LEVER.zoneX, LEVER.top - 16, GAME_W - LEVER.zoneX, TRAVEL + 34).setOrigin(0, 0).setInteractive().setDepth(312);
    lz.on('pointerdown', (p: Phaser.Input.Pointer) => this.onLeverDown(p));
    const cz = scene.add.zone(SLUSH_GAUGE.x - 4, SLUSH_POS.y - 6, LEVER.zoneX - (SLUSH_GAUGE.x - 4), 78).setOrigin(0, 0).setInteractive().setDepth(311);
    cz.on('pointerdown', (p: Phaser.Input.Pointer) => this.onCupDown(p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.holdPointer === p.id && this.state === SlushState.HOLDING) this.setPull(this.pullFromY(p.y));
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.holdPointer === p.id) this.releaseLever();
    });
    scene.input.on('gameout', () => {
      if (this.holdPointer !== null) this.releaseLever();
    });
    // 테스트용 좌표 노출 (손가락=레버 영역과 게이지·컵이 겹치지 않는지 검증)
    (window as unknown as { __leverGeo: unknown }).__leverGeo = {
      x: LEVER.x, top: LEVER.top, bottom: LEVER.bottom, zoneX: LEVER.zoneX,
      gauge: { x0: SLUSH_GAUGE.x - 1, x1: SLUSH_GAUGE.x + SLUSH_GAUGE.w + 5, y0: SLUSH_GAUGE.y, y1: SLUSH_GAUGE.y + SLUSH_GAUGE.h },
      cup: { x0: SLUSH_POS.x + 17, x1: SLUSH_POS.x + 31, y0: SLUSH_POS.y + 43, y1: SLUSH_POS.y + 57 },
      machine: { x0: SLUSH_POS.x, x1: SLUSH_POS.x + 48 },
    };
    if (enabled) this.unlock(); else this.leverPrompt.setVisible(false);
    this.drawGauge();
    this.drawTrack();
  }

  unlock() {
    this.state = SlushState.IDLE;
    this.lockLayer.setVisible(false);
    this.leverPrompt.setVisible(true);
  }

  get locked() {
    return this.state === SlushState.LOCKED;
  }

  /** 레버 손잡이의 현재 화면 y */
  get knobY() {
    return LEVER.top + this.pull * TRAVEL;
  }

  private pullFromY(y: number) {
    return Phaser.Math.Clamp((y - this.grabOffset - LEVER.top) / TRAVEL, 0, 1);
  }

  // ─── 입력 ───────────────────────────────────────────────────
  private onLeverDown(p: Phaser.Input.Pointer) {
    if (!this.enabled) return;
    switch (this.state) {
      case SlushState.LOCKED:
        this.sfx.error();
        this.hooks.hint('슬러시 기계는 Day 3에 열려요', CSS.grayLt);
        return;
      case SlushState.OVERFLOW:
        this.hooks.hint('넘쳤어요! 컵을 2번 탭해서 닦아요', CSS.cyan);
        return;
      case SlushState.CUP_READY:
        this.hooks.hint('완성 컵부터! 컵 탭 → 손님 탭 (버리려면 휴지통)', CSS.grayLt);
        this.flashCup();
        return;
      case SlushState.IDLE:
        // 손잡이 근처 어디를 잡아도 그 자리에서 이어 당기도록 (손잡이가 손가락으로 순간이동하지 않게)
        this.grabOffset = Phaser.Math.Clamp(p.y - this.knobY, -16, 16);
        this.pressLever(p.id);
        return;
      default:
    }
  }

  private onCupDown(p: Phaser.Input.Pointer) {
    if (!this.enabled) return;
    switch (this.state) {
      case SlushState.LOCKED:
        this.sfx.error();
        this.hooks.hint('슬러시 기계는 Day 3에 열려요', CSS.grayLt);
        return;
      case SlushState.OVERFLOW:
        this.wipe();
        return;
      case SlushState.CUP_READY:
        this.hooks.press(p);
        return;
      case SlushState.IDLE:
        this.hooks.hint('오른쪽 레버를 아래로 당겨요 ▼', CSS.yellow);
        this.flashLever();
        return;
      default:
    }
  }

  /** 레버 잡기 (테스트·봇도 사용) */
  pressLever(pointerId = -1) {
    if (this.state !== SlushState.IDLE || !this.enabled) return false;
    this.state = SlushState.HOLDING;
    this.holdPointer = pointerId;
    this.fill = 0;
    this.poured = false;
    this.knobTween?.stop();
    this.knob.setFrame(frameOf(this.scene, 'ui_icons', 'ui_knob', 1));
    this.cup.setVisible(true).setFrame(frameOf(this.scene, 'slush_machine', 'slush_cup'));
    this.leverPrompt.setVisible(false);
    this.sfx.leverGrab();
    this.hooks.event('slush-pull');
    return true;
  }

  setPull(v: number) {
    if (this.state !== SlushState.HOLDING) return;
    this.pull = Phaser.Math.Clamp(v, 0, 1);
    this.knob.y = this.knobY;
  }

  /** 손 떼기 → 스프링 복귀 + 평가 */
  releaseLever() {
    this.holdPointer = null;
    if (this.state !== SlushState.HOLDING) return;
    this.springBack();
    this.stopPourFx();
    if (!this.poured || this.fill < 0.03) {
      // 당기지 않고 뗀 경우: 조용히 원위치
      this.cup.setVisible(false);
      this.toIdle();
      return;
    }
    const f = this.fill;
    const x = this.cx, y = SLUSH_POS.y + 44;
    let r: SlushResult | null = null;
    if (f >= SLUSH.goldMin && f <= SLUSH.goldMax) {
      r = { quality: 1, perfect: true };
      floatText(this.scene, x, y - 20, 'PERFECT!', CSS.yellow, true);
      this.sfx.perfect();
      burst(this.scene, x, y, [C.orange, C.yellow, C.white, C.green], 16, 70);
      shake(this.scene, 0.004, 90);
    } else if (f > SLUSH.goldMax) {
      r = { quality: 0.8, perfect: false };
      floatText(this.scene, x, y - 16, '넘칠 뻔! GOOD', CSS.orange);
    } else if (f >= SLUSH.okMin) {
      r = { quality: 0.6, perfect: false };
      floatText(this.scene, x, y - 16, '조금 부족…', CSS.cream);
    } else {
      this.last = 'too-little';
      floatText(this.scene, x, y - 16, '너무 적어요!', CSS.pink);
      this.sfx.error();
      this.cup.setVisible(false);
      this.toIdle();
      return;
    }
    this.cupResult = r;
    this.last = r;
    this.state = SlushState.CUP_READY;
    this.cupPrompt.setText('컵 탭 → 손님').setColor(CSS.yellow).setVisible(true);
    this.trashBtn.setVisible(true);
    this.hooks.event('slush-cup');
  }

  private springBack() {
    const from = this.pull;
    this.pull = 0;
    this.knob.setFrame(frameOf(this.scene, 'ui_icons', 'ui_knob', 0));
    this.knobTween?.stop();
    if (from > 0.02) {
      this.sfx.spring();
      this.knobTween = this.scene.tweens.add({ targets: this.knob, y: LEVER.top, duration: 240, ease: 'Back.Out' });
      // 철컥! 하고 트랙 끝에 부딪히는 반동
      this.scene.time.delayedCall(90, () => {
        burst(this.scene, LEVER.x, LEVER.top - 6, [C.white, C.grayLt], 5, 30);
        floatText(this.scene, LEVER.x - 8, LEVER.top - 4, '철컥!', CSS.white);
      });
    } else {
      this.knob.y = LEVER.top;
    }
  }

  private flashLever() {
    this.scene.tweens.add({ targets: this.knob, scale: 2.4, yoyo: true, duration: 120, repeat: 1, onComplete: () => this.knob.setScale(2) });
  }

  get cupReady() {
    return this.state === SlushState.CUP_READY && !!this.cupResult;
  }

  /** 완성 컵을 손님에게 건네기 (서빙 확정 시 GameScene이 호출) */
  takeCup(): SlushResult | null {
    if (!this.cupReady) return null;
    const r = this.cupResult;
    this.cup.setVisible(false);
    this.cupResult = null;
    this.setHeld(false);
    this.toIdle();
    return r;
  }

  /** 잘못 뽑은 컵 버리기 */
  discardCup() {
    if (!this.cupReady) return;
    this.cup.setVisible(false);
    this.cupResult = null;
    this.setHeld(false);
    this.sfx.trash();
    floatText(this.scene, this.cx, SLUSH_POS.y + 10, '버림', CSS.grayLt);
    this.hooks.event('slush-discard');
    this.toIdle();
  }

  /** 서빙 대기 선택 표시 (컵 주위 초록 테두리 + 컵이 살짝 뜸) */
  setHeld(on: boolean) {
    if (on === this.held) return;
    this.held = on;
    this.scene.tweens.add({ targets: this.cup, y: on ? -3 : 0, duration: 120, ease: 'Back.Out' });
    this.cupPrompt.setText(on ? '손님을 탭!' : '컵 탭 → 손님').setVisible(this.cupReady);
    this.drawHeld();
  }

  private drawHeld() {
    const g = this.heldG;
    g.clear();
    if (!this.held) return;
    const on = Math.floor(this.scene.time.now / 150) % 2 === 0;
    g.lineStyle(2, on ? C.green : C.yellow).strokeRect(this.cupAt.x - 10, this.cupAt.y - 12, 20, 20);
  }

  private flashCup() {
    this.scene.tweens.add({ targets: this.cup, scale: 1.25, yoyo: true, duration: 110, repeat: 1, onComplete: () => this.cup.setScale(1) });
  }

  private stopPourFx() {
    if (this.pouringSfx) {
      this.sfx.holdStop();
      this.pouringSfx = false;
    }
    if (this.state !== SlushState.OVERFLOW) this.machine.play('slush_idle', true);
  }

  private overflow() {
    this.state = SlushState.OVERFLOW;
    this.last = 'overflow';
    this.holdPointer = null;
    this.springBack();
    this.stopPourFx();
    this.sfx.splash();
    shake(this.scene, 0.008, 200);
    this.machine.play('slush_overflow');
    this.cup.setFrame(frameOf(this.scene, 'slush_machine', 'slush_cup_overflow'));
    this.lockMs = SLUSH.overflowLock;
    this.wipes = 0;
    floatText(this.scene, this.cx, SLUSH_POS.y + 18, '넘쳤다!!', CSS.red, true);
    burst(this.scene, this.cx, SLUSH_POS.y + 46, [C.orange, C.gold], 20, 80);
    this.cupPrompt.setText('컵 닦기! 탭탭').setColor(CSS.cyan).setVisible(true);
  }

  private wipe() {
    this.wipes++;
    this.sfx.scrub();
    bounce(this.scene, this.root, 0.06);
    burst(this.scene, this.cx, SLUSH_POS.y + 48, [C.white, C.cyan], 6, 40);
    this.tryRecover();
  }

  private tryRecover() {
    if (this.state !== SlushState.OVERFLOW) return;
    if (this.lockMs <= 0 && this.wipes >= 2) {
      this.cup.setVisible(false);
      floatText(this.scene, this.cx, SLUSH_POS.y + 18, '깨끗!', CSS.cyan);
      this.toIdle();
    }
  }

  private toIdle() {
    this.state = SlushState.IDLE;
    this.trashBtn?.setVisible(false);
    if (this.held) { this.held = false; this.cup.y = 0; this.heldG.clear(); }
    this.fill = 0;
    this.poured = false;
    this.machine.play('slush_idle');
    this.machine.setX(0);
    this.cupPrompt.setVisible(false);
    this.leverPrompt.setVisible(true);
    this.drawGauge();
  }

  /** 영업 종료 시 */
  stop() {
    if (this.state === SlushState.HOLDING) {
      this.holdPointer = null;
      this.springBack();
      this.stopPourFx();
      this.cup.setVisible(false);
      this.toIdle();
    }
  }

  update(dt: number) {
    if (this.state === SlushState.HOLDING) {
      const rate = pourRate(this.pull);
      if (rate > 0) {
        if (!this.pouringSfx) {
          this.sfx.holdStart();
          this.pouringSfx = true;
          this.machine.play('slush_pull', true);
        }
        this.poured = true;
        this.fill += (rate * dt) / 1000;
        this.sfx.holdUpdate(this.fill);
        // 당긴 깊이에 맞춰 기계 애니메이션 속도도 변화
        this.machine.anims.timeScale = 0.5 + this.pull;
      } else if (this.pouringSfx) {
        this.sfx.holdStop();
        this.pouringSfx = false;
        this.machine.play('slush_idle', true);
      }
      const lvl = Math.min(5, Math.floor(this.fill * 5.5));
      this.cup.setFrame(frameOf(this.scene, 'slush_machine', 'slush_cup', lvl));
      if (this.fill > 1) this.overflow();
    } else if (this.state === SlushState.OVERFLOW) {
      if (this.lockMs > 0) {
        this.lockMs -= dt;
        this.machine.setX(Math.sin(this.lockMs / 30) > 0 ? 1 : -1);
        if (this.lockMs <= 0) this.machine.setX(0);
      }
      this.tryRecover();
    }
    if (this.state !== SlushState.HOLDING) this.machine.anims.timeScale = 1;
    this.drawHeld();
    this.drawGauge();
    this.drawTrack();
  }

  // ─── 그리기 ─────────────────────────────────────────────────
  private drawTrack() {
    const g = this.track;
    g.clear();
    const x = LEVER.x;
    const t = LEVER.top - 4, b = LEVER.bottom + 4;
    // 받침판
    g.fillStyle(C.black).fillRect(x - 7, t - 3, 13, b - t + 6);
    g.fillStyle(C.gray).fillRect(x - 6, t - 2, 11, b - t + 4);
    g.fillStyle(C.grayLt).fillRect(x - 6, t - 2, 11, 1);
    // 홈
    g.fillStyle(C.black).fillRect(x - 2, t, 4, b - t);
    // 당긴 만큼 홈이 노랗게 (얼마나 세게 당겼는지 한눈에)
    if (this.state === SlushState.HOLDING && this.pull > 0) {
      const col = this.pull <= SLUSH.deadZone ? C.grayDk : this.pull < 0.6 ? C.gold : C.orange;
      g.fillStyle(col).fillRect(x - 1, LEVER.top, 2, Math.round(this.knobY - LEVER.top));
    }
    // 눈금: 느리게 / 빠르게
    for (let i = 1; i <= 4; i++) {
      const yy = Math.round(LEVER.top + (TRAVEL * i) / 4);
      g.fillStyle(C.grayDk).fillRect(x - 6, yy, 3, 1);
    }
    if (this.state === SlushState.LOCKED) this.knob.setAlpha(0.6); else this.knob.setAlpha(1);
  }

  private drawGauge() {
    const g = this.gauge;
    const { x, y, w, h } = SLUSH_GAUGE;
    g.clear();
    if (this.state === SlushState.LOCKED) return;
    g.fillStyle(C.black).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(C.navy).fillRect(x, y, w, h);
    const gy0 = y + h - Math.round(h * SLUSH.goldMax);
    const gy1 = y + h - Math.round(h * SLUSH.goldMin);
    g.fillStyle(C.greenDkr).fillRect(x, gy0, w, gy1 - gy0);
    const f = Phaser.Math.Clamp(this.state === SlushState.OVERFLOW ? 1 : this.fill, 0, 1);
    const fh = Math.round(h * f);
    const inGold = f >= SLUSH.goldMin && f <= SLUSH.goldMax;
    const col = this.state === SlushState.OVERFLOW ? C.red : inGold ? C.green : C.orange;
    g.fillStyle(col).fillRect(x + 1, y + h - fh, w - 2, fh);
    const blink = inGold && Math.floor(this.scene.time.now / 80) % 2;
    g.lineStyle(1, blink ? C.white : C.green).strokeRect(x - 0.5, gy0 - 0.5, w + 1, gy1 - gy0 + 1);
    // 초록 구간 옆 ◀ 표시 (게이지가 작아도 목표가 눈에 띄게)
    const my = Math.round((gy0 + gy1) / 2);
    g.fillStyle(C.green).fillRect(x + w + 2, my - 2, 1, 5).fillRect(x + w + 3, my - 1, 1, 3).fillRect(x + w + 4, my, 1, 1);
    // 현재 수위 눈금선
    if (f > 0) g.fillStyle(C.white).fillRect(x - 2, y + h - fh, 2, 1);
    g.fillStyle(C.white).fillRect(x + 1, y + 1, 1, h - 2);
  }
}
