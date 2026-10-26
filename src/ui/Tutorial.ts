import Phaser from 'phaser';
import { C, CSS, FONT, GAME_H, GAME_W } from '../config/constants';
import { drawBubble, txt } from './Juice';

export interface GuideStep {
  /** 밝게 남길 영역 (나머지는 반투명 검정) */
  spot?: { x: number; y: number; w: number; h: number };
  /** 손가락이 가리킬 지점 */
  finger?: { x: number; y: number };
  text: string;
  /** 말풍선 위치 (기본: 화면 가운데 위쪽) */
  at?: { x: number; y: number };
  /** 어둡게 덮을지 (false면 가벼운 힌트) */
  dim?: boolean;
  skippable?: boolean;
  /** 위→아래로 미는 손가락 애니메이션 (레버 가이드) */
  swipe?: { x: number; y1: number; y2: number };
  /** 좌↔우로 문지르는 손가락 애니메이션 (떡볶이 젓기) */
  hswipe?: { y: number; x1: number; x2: number; label?: string };
}

/** 반투명 하이라이트 + 👉 손가락 + 말풍선 가이드 (입력은 막지 않는다) */
export class Tutorial {
  private dim: Phaser.GameObjects.Graphics;
  private ring: Phaser.GameObjects.Graphics;
  private finger: Phaser.GameObjects.Sprite;
  private box: Phaser.GameObjects.Container | null = null;
  private fingerTween: Phaser.Tweens.Tween | null = null;
  private spot: GuideStep['spot'] | null = null;
  private swipe: GuideStep['swipe'] | null = null;
  private swipeLabel: Phaser.GameObjects.Container | null = null;
  private skipZone: Phaser.GameObjects.Zone | null = null;

  constructor(private scene: Phaser.Scene, private onSkip?: () => void) {
    this.dim = scene.add.graphics().setDepth(1600);
    this.ring = scene.add.graphics().setDepth(1601);
    this.finger = scene.add.sprite(0, 0, 'ui_icons').setDepth(1650).setVisible(false).setScale(2);
    this.finger.play('ui_hand');
  }

  show(step: GuideStep) {
    this.clear();
    this.spot = step.spot ?? null;
    if (step.dim !== false) {
      const g = this.dim;
      g.fillStyle(C.black, 0.55);
      if (step.spot) {
        const { x, y, w, h } = step.spot;
        g.fillRect(0, 0, GAME_W, y);
        g.fillRect(0, y + h, GAME_W, GAME_H - y - h);
        g.fillRect(0, y, x, h);
        g.fillRect(x + w, y, GAME_W - x - w, h);
      } else {
        g.fillRect(0, 0, GAME_W, GAME_H);
      }
    }
    if (step.finger) {
      this.finger.setVisible(true).setPosition(step.finger.x + 4, step.finger.y - 14);
      this.fingerTween = this.scene.tweens.add({ targets: this.finger, y: step.finger.y - 10, yoyo: true, repeat: -1, duration: 260, ease: 'Sine.InOut' });
    }

    if (step.swipe) {
      const { x, y1, y2 } = step.swipe;
      this.swipe = step.swipe;
      this.finger.setVisible(true).setPosition(x + 4, y1 - 14).setAlpha(1);
      this.fingerTween = this.scene.tweens.add({
        targets: this.finger, y: { from: y1 - 14, to: y2 - 14 }, duration: 750, ease: 'Sine.InOut',
        hold: 260, repeat: -1, repeatDelay: 220,
        onRepeat: () => this.finger.setAlpha(1),
      });
      // 레버 트랙 바로 아래 "아래로 당기세요!" 꼬리표 (게이지·컵보다 아래쪽이라 가리지 않음)
      const t = txt(this.scene, 0, 0, '아래로 당기세요!', { font: FONT.small, size: 8, color: CSS.white, stroke: CSS.black, strokeW: 2 }).setOrigin(1, 0.5);
      const bg = this.scene.add.graphics();
      const tw = Math.ceil(t.width) + 8;
      bg.fillStyle(C.red).fillRect(-tw + 2, -6, tw, 12).fillStyle(C.black).fillRect(-tw + 2, 6, tw, 1);
      t.setPosition(-2, 0);
      this.swipeLabel = this.scene.add.container(Math.min(GAME_W - 2, x + 14), y2 + 15, [bg, t]).setDepth(1660);
      this.scene.tweens.add({ targets: this.swipeLabel, y: y2 + 13, yoyo: true, repeat: -1, duration: 300 });
    }

    if (step.hswipe) {
      const { y, x1, x2 } = step.hswipe;
      this.finger.setVisible(true).setPosition(x1 + 4, y - 14).setAlpha(1);
      this.fingerTween = this.scene.tweens.add({ targets: this.finger, x: x2 + 4, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      if (step.hswipe.label) {
        const t = txt(this.scene, 0, 0, step.hswipe.label, { font: FONT.small, size: 8, color: CSS.white, stroke: CSS.black, strokeW: 2 }).setOrigin(0.5, 0.5);
        const bg = this.scene.add.graphics();
        const tw = Math.ceil(t.width) + 8;
        bg.fillStyle(C.orange).fillRect(-tw / 2, -6, tw, 12).fillStyle(C.black).fillRect(-tw / 2, 6, tw, 1);
        this.swipeLabel = this.scene.add.container(Math.round((x1 + x2) / 2), y - 30, [bg, t]).setDepth(1660);
      }
    }

    // 말풍선
    const lines = step.text.split('\n');
    const texts = lines.map((l, i) => txt(this.scene, 0, 0 + i * 13, l, { font: FONT.body, size: 10, color: CSS.black }));
    const w = Math.min(GAME_W - 12, Math.max(...texts.map((t) => Math.ceil(t.width))) + 16);
    const h = lines.length * 13 + 10 + (step.skippable ? 12 : 0);
    const at = step.at ?? { x: GAME_W / 2, y: 120 };
    const bx = Math.round(Phaser.Math.Clamp(at.x - w / 2, 6, GAME_W - w - 6));
    const by = Math.round(at.y);
    const g = this.scene.add.graphics();
    drawBubble(g, 0, 0, w, h, C.white, C.black, null);
    g.fillStyle(C.yellow).fillRect(1, 1, 3, h - 2);
    const parts: Phaser.GameObjects.GameObject[] = [g];
    texts.forEach((t) => { t.setPosition(9, 5 + t.y); parts.push(t); });
    if (step.skippable) {
      const s = txt(this.scene, w - 6, h - 12, '건너뛰기 ▶', { font: FONT.small, size: 8, color: CSS.gray }).setOrigin(1, 0);
      parts.push(s);
      this.skipZone = this.scene.add.zone(bx + w - 60, by + h - 16, 60, 18).setOrigin(0, 0).setDepth(1702).setInteractive();
      this.skipZone.on('pointerdown', () => this.onSkip?.());
    }
    this.box = this.scene.add.container(bx, by, parts).setDepth(1700);
    this.box.setScale(0.8).setAlpha(0);
    this.scene.tweens.add({ targets: this.box, scale: 1, alpha: 1, duration: 160, ease: 'Back.Out' });
  }

  clear() {
    this.dim.clear();
    this.ring.clear();
    this.fingerTween?.stop();
    this.fingerTween = null;
    this.finger.setVisible(false);
    this.box?.destroy();
    this.box = null;
    this.skipZone?.destroy();
    this.skipZone = null;
    this.spot = null;
    this.swipe = null;
    this.swipeLabel?.destroy();
    this.swipeLabel = null;
  }

  get swiping() { return !!this.swipe; }

  update(now: number) {
    this.ring.clear();
    if (this.swipe) {
      // 레버 트랙을 따라 흘러내리는 ▼ 화살표 3개
      const { x, y1, y2 } = this.swipe;
      const span = y2 - y1;
      const phase = (now % 900) / 900;
      for (let i = 0; i < 3; i++) {
        const k = (phase + i / 3) % 1;
        const yy = Math.round(y1 + k * span);
        const a = Math.sin(k * Math.PI);
        this.ring.fillStyle(C.yellow, a);
        const ax = x - 13;
        this.ring.fillRect(ax - 3, yy, 7, 1).fillRect(ax - 2, yy + 1, 5, 1).fillRect(ax - 1, yy + 2, 3, 1).fillRect(ax, yy + 3, 1, 1);
      }
    }
    if (!this.spot) return;
    const { x, y, w, h } = this.spot;
    const on = Math.floor(now / 220) % 2 === 0;
    this.ring.lineStyle(2, on ? C.yellow : C.gold).strokeRect(x - 1, y - 1, w + 2, h + 2);
  }
}

