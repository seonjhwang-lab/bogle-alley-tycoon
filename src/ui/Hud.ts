import Phaser from 'phaser';
import { C, CSS, FONT, GAME_W, LAYOUT } from '../config/constants';
import type { DayConfig } from '../config/days';
import { icon } from './Frames';
import { bounce, txt } from './Juice';

/**
 * Top HUD (y 0~28): 스테이지 · 남은 시간(무한 모드: 하트 3개 + 경과 시간) · 매출/다음 별 · 콤보·피버 · 일시정지
 *                    아래 줄: 별 진행 바 (도전 가능한 별 개수만큼 마커, 히든 스테이지는 목표 1개)
 */
export class Hud {
  private timeText: Phaser.GameObjects.Text;
  private clock: Phaser.GameObjects.Image;
  private revText: Phaser.GameObjects.Text;
  private nextText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private bar: Phaser.GameObjects.Graphics;
  private stars: Phaser.GameObjects.Image[] = [];
  private hearts: Phaser.GameObjects.Image[] = [];
  private fever: Phaser.GameObjects.Container;
  private feverText: Phaser.GameObjects.Text;
  private shownRev = 0;
  private lastSec = -1;
  private reached = 0;
  private barMax: number;
  private target = 0;
  private marks: number[];
  readonly endless: boolean;

  constructor(private scene: Phaser.Scene, private cfg: DayConfig, maxStars: number, onPause: () => void) {
    this.endless = cfg.kind === 'endless';
    this.marks = cfg.kind === 'day' ? cfg.stars.slice(0, maxStars) : cfg.kind === 'hidden' ? [cfg.stars[0]] : [];
    const H = LAYOUT.hud.h;
    const g = scene.add.graphics().setDepth(700);
    g.fillStyle(C.navy).fillRect(0, 0, GAME_W, H);
    g.fillStyle(C.slate).fillRect(0, 0, GAME_W, 1);
    g.fillStyle(C.black).fillRect(0, H - 1, GAME_W, 1);
    g.fillStyle(C.slate).fillRect(56, 3, 1, 14).fillRect(118, 3, 1, 14);

    const lab = txt(scene, 5, 3, cfg.label, { font: FONT.bold, size: 12, color: cfg.kind === 'day' ? CSS.yellow : cfg.kind === 'hidden' ? CSS.pink : CSS.cyan }).setDepth(701);
    if (lab.width > 50) lab.setScale(50 / lab.width);

    this.clock = icon(scene, 68, 10, 'ui_clock').setDepth(701);
    this.timeText = txt(scene, 78, 3, '0:00', { font: FONT.bold, size: 12, color: CSS.white }).setDepth(701);
    if (this.endless) {
      // 무한 모드: 시계 대신 하트 3개 (경과 시간은 작게)
      this.clock.setVisible(false);
      for (let i = 0; i < 3; i++) this.hearts.push(icon(scene, 66 + i * 16, 10, 'ui_heart').setDepth(701).setScale(0.75));
      this.timeText.setPosition(90, 17).setFontFamily(FONT.small).setFontSize(8).setVisible(false);
    }

    icon(scene, 129, 10, 'ui_coin').setDepth(701);
    this.revText = txt(scene, 139, 3, '0', { font: FONT.bold, size: 12, color: CSS.yellow }).setDepth(701);
    this.nextText = txt(scene, 0, 5, '', { font: FONT.small, size: 8, color: CSS.gray }).setDepth(701);

    this.comboText = txt(scene, 214, 4, '', { font: FONT.body, size: 10, color: CSS.cyan, stroke: CSS.black, strokeW: 2 }).setOrigin(1, 0).setDepth(701);

    // 피버 표시 (콤보 자리 위에 겹쳐서)
    const fi = scene.add.sprite(0, 0, 'ui_icons').setScale(0.75).play('ui_fever');
    this.feverText = txt(scene, 7, -6, 'FEVER', { font: FONT.small, size: 8, color: CSS.yellow, stroke: CSS.redDk, strokeW: 2 });
    this.fever = scene.add.container(180, 10, [fi, this.feverText]).setDepth(705).setVisible(false);

    // 일시정지 버튼
    const pb = scene.add.graphics();
    pb.fillStyle(C.slate).fillRect(0, 0, 16, 16);
    pb.fillStyle(C.grayLt).fillRect(5, 4, 2, 8).fillRect(9, 4, 2, 8);
    const pause = scene.add.container(GAME_W - 19, 2, [pb]).setDepth(702);
    pause.setInteractive(new Phaser.Geom.Rectangle(-3, -2, 22, 22), Phaser.Geom.Rectangle.Contains);
    pause.on('pointerdown', () => {
      bounce(scene, pause, 0.2);
      onPause();
    });

    // 별 진행 바
    this.bar = scene.add.graphics().setDepth(701);
    this.barMax = this.marks.length ? Math.round(this.marks[this.marks.length - 1] * 1.1) : 1;
    this.marks.forEach((s) => {
      this.stars.push(icon(scene, this.barX(s), 22, 'mini_perfect').setDepth(703).setTint(0x5a6988));
    });
    this.setRevenue(0, true);
  }

  private barX(v: number) {
    return 6 + Math.round((GAME_W - 12) * Math.min(1, v / this.barMax));
  }

  setRevenue(v: number, instant = false) {
    if (instant) this.shownRev = v;
    const next = this.marks.find((s) => s > v);
    this.nextText.setText(this.endless ? '' : next ? `/${next}` : this.cfg.kind === 'hidden' ? '클리어!' : '★'.repeat(this.marks.length));
    this.target = v;
  }

  setCombo(mult: number, combo: number) {
    this.comboText.setText(combo >= 2 ? `x${mult.toFixed(1)}` : '');
    if (combo >= 2) bounce(this.scene, this.comboText, 0.35);
  }

  /** 피버 남은 비율 (0이면 숨김) */
  setFever(p: number) {
    const on = p > 0;
    this.fever.setVisible(on);
    this.comboText.setVisible(!on);
    if (on) this.feverText.setColor(Math.floor(this.scene.time.now / 120) % 2 ? CSS.yellow : CSS.white);
  }

  setTime(sec: number, running: boolean) {
    const s = Math.max(0, Math.ceil(sec));
    this.timeText.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    if (this.endless) {
      this.nextText.setText(` ${this.timeText.text}`).setX(this.revText.x + this.revText.width + 2);
      return;
    }
    const warn = running && s <= 10;
    this.timeText.setColor(warn ? CSS.red : CSS.white);
    if (warn && s !== this.lastSec) {
      bounce(this.scene, this.timeText, 0.3);
      bounce(this.scene, this.clock, 0.4);
    }
    this.lastSec = s;
  }

  setLives(n: number) {
    this.hearts.forEach((h, i) => {
      const was = h.alpha > 0.5;
      h.setAlpha(i < n ? 1 : 0.25);
      if (was && i >= n) bounce(this.scene, h, 0.8, 0.75);
    });
  }

  /** 새로 달성한 별 개수 반환 */
  update(): number {
    if (this.shownRev !== this.target) {
      const d = this.target - this.shownRev;
      this.shownRev += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * 0.18));
      if (Math.abs(this.target - this.shownRev) < 1) this.shownRev = this.target;
      this.revText.setText(`${this.shownRev}`);
      this.nextText.setX(this.revText.x + this.revText.width + 2);
    }
    const g = this.bar;
    g.clear();
    if (this.endless) return 0;
    const x0 = 6, w = GAME_W - 12, y = 20;
    g.fillStyle(C.black).fillRect(x0 - 1, y - 1, w + 2, 6);
    g.fillStyle(C.slate).fillRect(x0, y, w, 4);
    const fx = this.barX(this.shownRev) - x0;
    g.fillStyle(C.gold).fillRect(x0, y, fx, 4);
    g.fillStyle(C.yellow).fillRect(x0, y, fx, 1);
    let reached = 0;
    this.marks.forEach((s, i) => {
      if (this.shownRev >= s) {
        reached++;
        if (this.stars[i].tintTopLeft !== 0xffffff) {
          this.stars[i].clearTint();
          bounce(this.scene, this.stars[i], 0.8);
        }
      }
    });
    const gained = reached - this.reached;
    this.reached = reached;
    return gained;
  }
}
