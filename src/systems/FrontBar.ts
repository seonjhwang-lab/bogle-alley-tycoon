import Phaser from 'phaser';
import {
  ARCADE_POS, C, COUNTER_FRONT_H, COUNTER_FRONT_Y, CSS, FONT, GRIDDLE_POS, ODENG, ODENG_POS, TTEOK, TV_POS,
} from '../config/constants';
import type { DayConfig } from '../config/days';
import type { ProgressData } from './Progress';
import type { SoundManager } from './SoundManager';
import { frameOf, icon, setIcon } from '../ui/Frames';
import { bounce, burst, floatText, txt } from '../ui/Juice';

/**
 * 전방 매대 (손님 바로 앞)
 *
 *  떡볶이 철판 (Day 3~)
 *    EMPTY ─탭(리필)→ COOK 3s → GLOSSY 9s → STICKY('저어주세요!') 8s → BURNT
 *      GLOSSY: 탭 = 서빙 선택(HELD_TTEOKBOKKI) → 손님 탭. 4컵 서빙하면 EMPTY
 *      STICKY: 좌우 스와이프 / 국자 버튼 / 탭 = 저어서 GLOSSY로 회복
 *      BURNT : 3번 탭해서 긁어내기 → EMPTY
 *
 *  사각 어묵탕 (Day 4~)
 *    EMPTY ─탭→ COOK 2.5s(꼬치 3개) → READY ─탭(HELD_ODENG)→ 손님 탭 1개씩 → 0개면 EMPTY
 */
export enum TteokState { LOCKED = 'LOCKED', EMPTY = 'EMPTY', COOK = 'COOK', GLOSSY = 'GLOSSY', STICKY = 'STICKY', BURNT = 'BURNT' }
export enum OdengState { LOCKED = 'LOCKED', EMPTY = 'EMPTY', COOK = 'COOK', READY = 'READY' }

export interface FrontHooks {
  /** 서빙 가능한 철판/어묵탕을 눌렀을 때 → 손(선택) 처리 */
  press: (kind: 'tteok' | 'odeng', p: Phaser.Input.Pointer) => void;
  hint: (msg: string, color?: string, ms?: number) => void;
  event: (name: string, data?: unknown) => void;
}

const TTEOK_X0 = 8;          // frontbar 아트의 떡볶이 층 x 범위 (8..55)
const TTEOK_W = 48;

export class FrontBar {
  enabled = false;
  tteok = TteokState.LOCKED;
  portions = 0;
  tt = 0;
  scrubs = 0;
  odeng = OdengState.LOCKED;
  sticks = 0;
  ot = 0;

  private griddle: Phaser.GameObjects.Image;
  private layer: Phaser.GameObjects.Sprite;
  private ladle: Phaser.GameObjects.Image;
  private ladleBtn: Phaser.GameObjects.Container;
  private tLabel: Phaser.GameObjects.Text;
  private tGauge: Phaser.GameObjects.Graphics;
  private pot: Phaser.GameObjects.Sprite;
  private stickImgs: Phaser.GameObjects.Image[] = [];
  private oLabel: Phaser.GameObjects.Text;
  private oGauge: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private held: 'tteok' | 'odeng' | null = null;
  private swipe: { x0: number; id: number; stirred: boolean } | null = null;
  readonly tteokAt = { x: GRIDDLE_POS.x + 32, y: GRIDDLE_POS.y + 20 };
  readonly odengAt = { x: ODENG_POS.x + 32, y: ODENG_POS.y + 18 };
  readonly ladleAt = { x: GRIDDLE_POS.x + 56, y: GRIDDLE_POS.y + 6 };
  private tv: Phaser.GameObjects.Sprite | null = null;
  private arcade: Phaser.GameObjects.Sprite | null = null;

  constructor(private scene: Phaser.Scene, cfg: DayConfig, progress: ProgressData, private sfx: SoundManager, private hooks: FrontHooks) {
    const D = 170;
    // ── 떡볶이 철판 ──
    this.griddle = scene.add.image(GRIDDLE_POS.x, GRIDDLE_POS.y, 'frontbar', frameOf(scene, 'frontbar', 'griddle')).setOrigin(0, 0).setDepth(D);
    this.layer = scene.add.sprite(GRIDDLE_POS.x, GRIDDLE_POS.y, 'frontbar').setOrigin(0, 0).setDepth(D + 1).setVisible(false);
    this.ladle = icon(scene, GRIDDLE_POS.x + 20, GRIDDLE_POS.y + 14, 'ui_ladle').setDepth(D + 3).setVisible(false);
    const lb = scene.add.graphics();
    lb.fillStyle(C.black).fillRect(-9, -9, 18, 18);
    lb.fillStyle(C.yellow).fillRect(-8, -8, 16, 16);
    this.ladleBtn = scene.add.container(this.ladleAt.x, this.ladleAt.y, [lb, icon(scene, 0, 0, 'ui_ladle')]).setDepth(D + 6).setVisible(false);
    this.ladleBtn.setInteractive(new Phaser.Geom.Rectangle(-11, -11, 22, 22), Phaser.Geom.Rectangle.Contains);
    this.ladleBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      if (!this.enabled) return;
      bounce(scene, this.ladleBtn, 0.3);
      this.stir();
    });
    this.tLabel = txt(scene, this.tteokAt.x, GRIDDLE_POS.y + 2, '', { font: FONT.small, size: 8, color: CSS.yellow, stroke: CSS.black, strokeW: 2 })
      .setOrigin(0.5, 0.5).setDepth(D + 5);
    this.tGauge = scene.add.graphics().setDepth(D + 4);

    // ── 어묵탕 ──
    this.pot = scene.add.sprite(ODENG_POS.x, ODENG_POS.y, 'frontbar').setOrigin(0, 0).setDepth(D);
    this.pot.play('odeng_pot');
    for (let i = 0; i < ODENG.sticks; i++) {
      this.stickImgs.push(icon(scene, ODENG_POS.x + 22 + i * 10, ODENG_POS.y + 9, 'ui_stick_raw').setDepth(D - 1).setVisible(false));
    }
    this.oLabel = txt(scene, this.odengAt.x, ODENG_POS.y + 2, '', { font: FONT.small, size: 8, color: CSS.yellow, stroke: CSS.black, strokeW: 2 })
      .setOrigin(0.5, 0.5).setDepth(D + 5);
    this.oGauge = scene.add.graphics().setDepth(D + 4);
    this.glow = scene.add.graphics().setDepth(D + 7);

    // ── 소품 (상점에서 산 경우만) ──
    if (progress.upgrades.tv) this.tv = scene.add.sprite(TV_POS.x, TV_POS.y, 'props').setOrigin(0, 0).setDepth(D).play('tv');
    if (progress.upgrades.arcade) this.arcade = scene.add.sprite(ARCADE_POS.x, ARCADE_POS.y, 'props').setOrigin(0, 0).setDepth(D).play('arcade');

    // ── 입력 ──
    const zy = COUNTER_FRONT_Y + 2, zh = COUNTER_FRONT_H - 2;
    const gz = scene.add.zone(GRIDDLE_POS.x + 2, zy, 62, zh).setOrigin(0, 0).setDepth(D + 5).setInteractive();
    gz.on('pointerdown', (p: Phaser.Input.Pointer) => this.onGriddleDown(p));
    const oz = scene.add.zone(ODENG_POS.x, zy, 64, zh).setOrigin(0, 0).setDepth(D + 5).setInteractive();
    oz.on('pointerdown', (p: Phaser.Input.Pointer) => this.onOdengDown(p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));

    // 잠금 / 초기 상태
    if (cfg.tteok) {
      this.tteok = TteokState.EMPTY;
      this.refill(true);
    } else this.lockOverlay(GRIDDLE_POS.x + 4, '떡볶이', 'Day 3');
    if (cfg.odeng) this.odeng = OdengState.EMPTY;
    else this.lockOverlay(ODENG_POS.x + 8, '어묵탕', 'Day 4');
    this.refresh();
  }

  private lockOverlay(x: number, name: string, day: string) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(190);
    g.fillStyle(C.black, 0.62).fillRect(x, GRIDDLE_POS.y + 8, 56, 24);
    icon(s, x + 12, GRIDDLE_POS.y + 20, 'ui_lock').setDepth(191);
    txt(s, x + 22, GRIDDLE_POS.y + 12, name, { font: FONT.small, size: 8, color: CSS.cream }).setDepth(191);
    txt(s, x + 22, GRIDDLE_POS.y + 21, day, { font: FONT.small, size: 8, color: CSS.grayLt }).setDepth(191);
  }

  // ─── 입력 ───────────────────────────────────────────────────
  private onGriddleDown(p: Phaser.Input.Pointer) {
    if (!this.enabled) return;
    switch (this.tteok) {
      case TteokState.LOCKED:
        this.sfx.error();
        this.hooks.hint('떡볶이 철판은 Day 3에 열려요', CSS.grayLt);
        return;
      case TteokState.EMPTY:
        this.refill();
        return;
      case TteokState.COOK:
        this.sfx.click();
        this.hooks.hint('떡볶이가 끓는 중이에요…', CSS.cream);
        return;
      case TteokState.GLOSSY:
        this.hooks.press('tteok', p);
        return;
      case TteokState.STICKY:
        // 좌우로 문지르면 바로, 그냥 탭해도 손을 뗄 때 젓기
        this.swipe = { x0: p.x, id: p.id, stirred: false };
        return;
      case TteokState.BURNT:
        this.scrub();
        return;
    }
  }

  private onMove(p: Phaser.Input.Pointer) {
    const s = this.swipe;
    if (!s || s.id !== p.id || s.stirred) return;
    if (Math.abs(p.x - s.x0) > 10) {
      s.stirred = true;
      this.stir();
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    const s = this.swipe;
    if (!s || s.id !== p.id) return;
    this.swipe = null;
    if (!s.stirred && this.enabled && this.tteok === TteokState.STICKY) this.stir();
  }

  private onOdengDown(p: Phaser.Input.Pointer) {
    if (!this.enabled) return;
    switch (this.odeng) {
      case OdengState.LOCKED:
        this.sfx.error();
        this.hooks.hint('어묵탕은 Day 4에 열려요', CSS.grayLt);
        return;
      case OdengState.EMPTY:
        this.startOdeng();
        return;
      case OdengState.COOK:
        this.sfx.click();
        this.hooks.hint('어묵이 익는 중이에요…', CSS.cream);
        return;
      case OdengState.READY:
        this.hooks.press('odeng', p);
        return;
    }
  }

  // ─── 떡볶이 ─────────────────────────────────────────────────
  refill(silent = false) {
    if (this.tteok !== TteokState.EMPTY) return;
    this.tteok = TteokState.COOK;
    this.tt = 0;
    this.portions = TTEOK.portions;
    if (!silent) {
      this.sfx.griddle();
      bounce(this.scene, this.griddle, 0.08);
      burst(this.scene, this.tteokAt.x, this.tteokAt.y, [C.red, C.orange, C.cream], 12, 50);
      floatText(this.scene, this.tteokAt.x, GRIDDLE_POS.y + 4, '떡볶이 리필!', CSS.orange);
      this.hooks.event('tteok-refill');
    }
    this.refresh();
  }

  /** 저어서 윤기 회복 (GLOSSY도 젓기 가능 → 타이머 초기화) */
  stir() {
    if (this.tteok !== TteokState.STICKY && this.tteok !== TteokState.GLOSSY) return false;
    const wasSticky = this.tteok === TteokState.STICKY;
    this.tteok = TteokState.GLOSSY;
    this.tt = 0;
    this.sfx.stir();
    // 국자가 좌우로 휘젓는 연출
    this.ladle.setVisible(true).setPosition(GRIDDLE_POS.x + 16, GRIDDLE_POS.y + 14).setAngle(-20);
    this.scene.tweens.killTweensOf(this.ladle);
    this.scene.tweens.add({
      targets: this.ladle, x: GRIDDLE_POS.x + 48, angle: 20, yoyo: true, repeat: 1, duration: 120, ease: 'Sine.InOut',
      onComplete: () => this.ladle.setVisible(false),
    });
    burst(this.scene, this.tteokAt.x, this.tteokAt.y, [C.red, C.white, C.pink], 8, 40);
    if (wasSticky) floatText(this.scene, this.tteokAt.x, GRIDDLE_POS.y + 2, '윤기 회복!', CSS.pink);
    this.hooks.event('tteok-stir');
    this.refresh();
    return true;
  }

  private scrub() {
    this.scrubs++;
    this.sfx.scrub();
    bounce(this.scene, this.griddle, 0.08);
    burst(this.scene, this.tteokAt.x, this.tteokAt.y, [C.grayLt, C.black, C.white], 6, 34);
    if (this.scrubs >= TTEOK.scrubs) {
      this.tteok = TteokState.EMPTY;
      this.portions = 0;
      this.scrubs = 0;
      floatText(this.scene, this.tteokAt.x, GRIDDLE_POS.y + 2, '깨끗! 다시 리필', CSS.cyan);
    }
    this.refresh();
  }

  get tteokServable() {
    return this.tteok === TteokState.GLOSSY && this.portions > 0;
  }

  /** 종이컵 한 컵 덜어 가기 */
  takeTteok() {
    if (!this.tteokServable) return false;
    this.portions--;
    bounce(this.scene, this.layer, 0.08);
    if (this.portions <= 0) {
      this.tteok = TteokState.EMPTY;
      this.hooks.hint('떡볶이를 다 팔았어요! 철판을 탭해 리필', CSS.orange, 2000);
    }
    this.refresh();
    return true;
  }

  // ─── 어묵 ───────────────────────────────────────────────────
  startOdeng() {
    if (this.odeng !== OdengState.EMPTY) return;
    this.odeng = OdengState.COOK;
    this.ot = 0;
    this.sticks = ODENG.sticks;
    this.sfx.plop();
    this.stickImgs.forEach((s, i) => {
      s.setVisible(true).setY(ODENG_POS.y - 8);
      this.scene.tweens.add({ targets: s, y: ODENG_POS.y + 9, duration: 220, delay: i * 70, ease: 'Bounce.Out' });
    });
    burst(this.scene, this.odengAt.x, this.odengAt.y, [C.tan, C.cream, C.white], 8, 36);
    this.hooks.event('odeng-start');
    this.refresh();
  }

  get odengServable() {
    return this.odeng === OdengState.READY && this.sticks > 0;
  }

  takeOdeng() {
    if (!this.odengServable) return false;
    this.sticks--;
    if (this.sticks <= 0) {
      this.odeng = OdengState.EMPTY;
      this.hooks.hint('어묵이 다 떨어졌어요! 어묵탕을 탭', CSS.orange, 1800);
    }
    this.refresh();
    return true;
  }

  // ─── 선택 표시 ───────────────────────────────────────────────
  setHeld(kind: 'tteok' | 'odeng' | null) {
    this.held = kind;
    if (kind === 'tteok') bounce(this.scene, this.layer, 0.1);
    this.drawGlow();
  }

  private drawGlow() {
    const g = this.glow;
    g.clear();
    if (!this.held) return;
    const r = this.held === 'tteok' ? { x: GRIDDLE_POS.x + 2, y: GRIDDLE_POS.y + 9, w: 60, h: 22 } : { x: ODENG_POS.x + 9, y: ODENG_POS.y + 9, w: 46, h: 22 };
    const on = Math.floor(this.scene.time.now / 150) % 2 === 0;
    g.lineStyle(2, on ? C.green : C.yellow).strokeRect(r.x, r.y, r.w, r.h);
  }

  // ─── 매 프레임 ───────────────────────────────────────────────
  update(dt: number) {
    if (this.tteok === TteokState.COOK) {
      this.tt += dt;
      if (this.tt >= TTEOK.cook) {
        this.tteok = TteokState.GLOSSY;
        this.tt = 0;
        floatText(this.scene, this.tteokAt.x, GRIDDLE_POS.y + 2, '윤기 좔좔!', CSS.pink);
        this.sfx.click();
        this.hooks.event('tteok-ready');
        this.refresh();
      }
    } else if (this.tteok === TteokState.GLOSSY) {
      this.tt += dt;
      if (this.tt >= TTEOK.glossy) {
        this.tteok = TteokState.STICKY;
        this.tt = 0;
        this.sfx.sizzle();
        floatText(this.scene, this.tteokAt.x, GRIDDLE_POS.y + 2, '저어주세요!', CSS.orange, true);
        this.hooks.event('tteok-sticky');
        this.refresh();
      }
    } else if (this.tteok === TteokState.STICKY) {
      this.tt += dt;
      if (this.tt >= TTEOK.sticky) {
        this.tteok = TteokState.BURNT;
        this.tt = 0;
        this.scrubs = 0;
        this.sfx.sizzle();
        floatText(this.scene, this.tteokAt.x, GRIDDLE_POS.y + 2, '떡볶이가 탔다!', CSS.red, true);
        this.hooks.event('tteok-burnt');
        this.refresh();
      }
    }
    if (this.odeng === OdengState.COOK) {
      this.ot += dt;
      if (this.ot >= ODENG.cook) {
        this.odeng = OdengState.READY;
        floatText(this.scene, this.odengAt.x, ODENG_POS.y + 2, '어묵 완성!', CSS.yellow);
        this.sfx.click();
        this.hooks.event('odeng-ready');
        this.refresh();
      }
    }
    this.drawGauges();
    this.drawGlow();
    // 경고 깜빡임
    const blink = Math.floor(this.scene.time.now / 220) % 2 === 0;
    if (this.tteok === TteokState.STICKY) this.ladleBtn.setAlpha(blink ? 1 : 0.6);
  }

  /** 미니 오락기: 동전이 튀어 오르는 연출 (보상은 GameScene이 지급) */
  arcadeCoin() {
    if (!this.arcade) return null;
    const x = ARCADE_POS.x + 16, y = ARCADE_POS.y + 2;
    const c = icon(this.scene, x, y, 'ui_coin').setDepth(1850);
    c.setData('anim', true);
    this.scene.tweens.add({ targets: c, y: y - 18, duration: 320, ease: 'Quad.Out', yoyo: true, hold: 120, onComplete: () => c.destroy() });
    bounce(this.scene, this.arcade, 0.1);
    return { x, y: y - 6 };
  }

  get hasTv() { return !!this.tv; }
  get hasArcade() { return !!this.arcade; }

  // ─── 그리기 ─────────────────────────────────────────────────
  private refresh() {
    // 떡볶이 층
    const t = this.tteok;
    const tag = t === TteokState.COOK ? 'tteok_cook' : t === TteokState.GLOSSY ? 'tteok_glossy'
      : t === TteokState.STICKY ? 'tteok_sticky' : t === TteokState.BURNT ? 'tteok_burnt' : '';
    if (tag && (t === TteokState.BURNT || this.portions > 0)) {
      this.layer.setVisible(true);
      if (this.layer.anims.currentAnim?.key !== tag) this.layer.play(tag);
      const n = t === TteokState.BURNT ? TTEOK.portions : this.portions;
      this.layer.setCrop(0, 0, TTEOK_X0 + Math.round((TTEOK_W * n) / TTEOK.portions), 32);
    } else {
      this.layer.setVisible(false);
    }
    this.ladleBtn.setVisible(t === TteokState.STICKY);
    const tl = t === TteokState.EMPTY ? '탭: 리필' : t === TteokState.STICKY ? '저어주세요!' : t === TteokState.BURNT ? `긁기 ${TTEOK.scrubs - this.scrubs}번` : '';
    this.tLabel.setText(tl).setColor(t === TteokState.STICKY ? CSS.orange : t === TteokState.BURNT ? CSS.red : CSS.yellow);
    // 어묵
    const o = this.odeng;
    this.stickImgs.forEach((s, i) => {
      const vis = (o === OdengState.COOK || o === OdengState.READY) && i < this.sticks;
      s.setVisible(vis);
      if (vis) setIcon(s, o === OdengState.READY ? 'ui_stick_done' : 'ui_stick_raw');
    });
    this.oLabel.setText(o === OdengState.EMPTY ? '탭: 어묵 넣기' : o === OdengState.READY ? `${this.sticks}개` : '');
  }

  private drawGauges() {
    const g = this.tGauge;
    g.clear();
    const gx = GRIDDLE_POS.x + 8, gy = GRIDDLE_POS.y + 31, gw = 48;
    if (this.tteok === TteokState.COOK || this.tteok === TteokState.GLOSSY || this.tteok === TteokState.STICKY) {
      g.fillStyle(C.black).fillRect(gx - 1, gy - 1, gw + 2, 4);
      if (this.tteok === TteokState.COOK) {
        g.fillStyle(C.redDk).fillRect(gx, gy, gw, 2);
        g.fillStyle(C.orange).fillRect(gx, gy, Math.round((gw * this.tt) / TTEOK.cook), 2);
      } else if (this.tteok === TteokState.GLOSSY) {
        const p = 1 - this.tt / TTEOK.glossy;
        g.fillStyle(C.greenDkr).fillRect(gx, gy, gw, 2);
        g.fillStyle(p < 0.3 ? C.gold : C.green).fillRect(gx, gy, Math.round(gw * p), 2);
      } else {
        const p = 1 - this.tt / TTEOK.sticky;
        g.fillStyle(C.redDk).fillRect(gx, gy, gw, 2);
        g.fillStyle(Math.floor(this.scene.time.now / 140) % 2 ? C.red : C.orange).fillRect(gx, gy, Math.round(gw * p), 2);
      }
    }
    const og = this.oGauge;
    og.clear();
    if (this.odeng === OdengState.COOK) {
      const ox = ODENG_POS.x + 14, oy = ODENG_POS.y + 31, ow = 36;
      og.fillStyle(C.black).fillRect(ox - 1, oy - 1, ow + 2, 4);
      og.fillStyle(C.brownDk).fillRect(ox, oy, ow, 2);
      og.fillStyle(C.gold).fillRect(ox, oy, Math.round((ow * this.ot) / ODENG.cook), 2);
    }
  }
}
