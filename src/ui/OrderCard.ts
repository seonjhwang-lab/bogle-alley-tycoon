import Phaser from 'phaser';
import { C, CARD, COLS, CSS, FONT, TOPPING_ICON, type Topping } from '../config/constants';
import { icon } from './Frames';
import { txt } from './Juice';

export type SideKind = 'slush' | 'tteok' | 'odeng';
export const SIDE_ICON: Record<SideKind, string> = { slush: 'ui_slush', tteok: 'ui_tteok', odeng: 'ui_odeng' };
export const SIDE_LABEL: Record<SideKind, string> = { slush: '슬러시', tteok: '떡볶이', odeng: '어묵' };

export interface OrderSpec {
  /** 라면 그릇 수 (0 · 1 · 유도부원 2) — 여러 그릇이면 모두 같은 토핑 */
  ramen: number;
  toppings: Topping[];
  slush: boolean;
  tteok: boolean;
  odeng: boolean;
}

export function sidesOf(spec: OrderSpec): SideKind[] {
  const out: SideKind[] = [];
  if (spec.slush) out.push('slush');
  if (spec.tteok) out.push('tteok');
  if (spec.odeng) out.push('odeng');
  return out;
}

/**
 * 오버쿡 스타일 그림 레시피 카드 (56x50, 글씨 없음)
 *   ┌ 인내심 바 (초록→노랑→빨강) ┐
 *   │ [그릇(x2)] [사이드][사이드] │
 *   │ [토핑][토핑][토핑]          │
 */
export class OrderCard {
  readonly root: Phaser.GameObjects.Container;
  private bar: Phaser.GameObjects.Graphics;
  private bg: Phaser.GameObjects.Graphics;
  private ramenParts: Phaser.GameObjects.Image[] = [];
  private ramenPos = { x: 0, y: 0 };
  private sideIcons = new Map<SideKind, Phaser.GameObjects.Image>();
  private checks: Phaser.GameObjects.Graphics;
  private countText: Phaser.GameObjects.Text | null = null;
  private glow = false;
  private target = false;

  constructor(private scene: Phaser.Scene, readonly slot: number, readonly spec: OrderSpec) {
    const x = COLS[slot] - CARD.w / 2;
    this.bg = scene.add.graphics();
    this.drawBg();
    const parts: Phaser.GameObjects.GameObject[] = [this.bg];
    const sides = sidesOf(spec);

    if (spec.ramen > 0) {
      const plain = spec.toppings.length === 0 && sides.length === 0;
      if (plain) {
        // 기본 라면만: 그릇 하나를 크게
        this.ramenPos = { x: CARD.w / 2, y: 29 };
        this.ramenParts.push(icon(scene, this.ramenPos.x, this.ramenPos.y, 'ui_bowl').setScale(2));
      } else {
        this.ramenPos = { x: 12, y: 18 };
        this.ramenParts.push(icon(scene, 12, 18, 'ui_bowl'));
        spec.toppings.forEach((t, i) => this.ramenParts.push(icon(scene, 12 + i * 16, 37, TOPPING_ICON[t])));
        if (spec.toppings.length) {
          const plus = scene.add.graphics();
          plus.fillStyle(C.brownDk).fillRect(11, 27, 3, 1).fillRect(12, 26, 1, 3);
          parts.push(plus);
        }
      }
      if (spec.ramen > 1) {
        this.countText = txt(scene, this.ramenPos.x + (plain ? 14 : 7), this.ramenPos.y - (plain ? 14 : 9), `x${spec.ramen}`, {
          font: FONT.bold, size: 12, color: CSS.red, stroke: CSS.white, strokeW: 2,
        });
        parts.push(this.countText);
      }
      sides.forEach((k, i) => {
        const im = icon(scene, 28 + i * 16, 18, SIDE_ICON[k]);
        this.sideIcons.set(k, im);
      });
    } else {
      // 사이드만 주문
      const n = sides.length;
      sides.forEach((k, i) => {
        const im = n === 1
          ? icon(scene, CARD.w / 2, 28, SIDE_ICON[k]).setScale(2)
          : icon(scene, CARD.w / 2 + (i - (n - 1) / 2) * (n === 2 ? 20 : 16), 28, SIDE_ICON[k]);
        this.sideIcons.set(k, im);
      });
    }
    parts.push(...this.ramenParts, ...this.sideIcons.values());

    this.checks = scene.add.graphics();
    this.bar = scene.add.graphics();
    parts.push(this.checks, this.bar);
    this.root = scene.add.container(x, CARD.y, parts).setDepth(400);
    this.root.y = CARD.y - 14;
    this.root.alpha = 0;
    scene.tweens.add({ targets: this.root, y: CARD.y, alpha: 1, duration: 260, ease: 'Back.Out' });
  }

  private drawBg() {
    const g = this.bg, w = CARD.w, h = CARD.h;
    g.clear();
    g.fillStyle(C.black, 0.5).fillRect(2, 3, w, h);
    const edge = this.target ? C.yellow : this.glow ? C.gold : C.brownDk;
    g.fillStyle(edge).fillRect(0, 1, w, h - 2).fillRect(1, 0, w - 2, h);
    if (this.target) g.fillStyle(C.yellow).fillRect(-1, 2, w + 2, h - 4);
    g.fillStyle(C.cream).fillRect(1, 1, w - 2, h - 2);
    if (this.target) g.lineStyle(1, C.orange).strokeRect(1.5, 1.5, w - 3, h - 3);
    g.fillStyle(C.white).fillRect(2, 9, w - 4, 1);
    g.fillStyle(C.tan, 0.5).fillRect(2, h - 4, w - 4, 1);
    // 집게 핀
    g.fillStyle(C.gray).fillRect(w / 2 - 4, -2, 8, 3);
    g.fillStyle(C.grayLt).fillRect(w / 2 - 3, -2, 6, 1);
  }

  /** 정확히 맞는 완성 라면이 있을 때 (옅은 금색 테두리) */
  setGlow(on: boolean) {
    if (on === this.glow) return;
    this.glow = on;
    this.drawBg();
  }

  /** 지금 들고 있는 음식을 받을 수 있는 손님 (노란 굵은 테두리) */
  setTarget(on: boolean) {
    if (on === this.target) return;
    this.target = on;
    this.drawBg();
  }

  setPatience(p: number, now: number) {
    const g = this.bar;
    g.clear();
    const x = 4, y = 3, w = CARD.w - 8, h = 4;
    g.fillStyle(C.black).fillRect(x - 1, y - 1, w + 2, h + 2);
    let col: number = p > 0.55 ? C.green : p > 0.28 ? C.gold : C.red;
    if (p <= 0.28 && Math.floor(now / 150) % 2) col = C.hotPink;
    g.fillStyle(C.slate).fillRect(x, y, w, h);
    g.fillStyle(col).fillRect(x, y, Math.max(0, Math.round(w * p)), h);
    g.fillStyle(C.white, 0.4).fillRect(x, y, Math.max(0, Math.round(w * p)), 1);
  }

  private check(cx: number, cy: number, color: number) {
    const g = this.checks;
    g.fillStyle(C.black).fillRect(cx - 1, cy + 1, 4, 4).fillRect(cx + 2, cy + 2, 4, 4).fillRect(cx + 5, cy - 3, 4, 7);
    g.fillStyle(color).fillRect(cx, cy + 2, 2, 2).fillRect(cx + 2, cy + 3, 2, 2).fillRect(cx + 4, cy + 1, 2, 2).fillRect(cx + 6, cy - 2, 2, 3);
  }

  /** 라면 한 그릇 도착 — 남은 그릇이 있으면 'n/2'만 갱신 */
  markRamen(ok: boolean, left: number) {
    if (left > 0) {
      this.countText?.setText(`${this.spec.ramen - left}/${this.spec.ramen}`).setColor(CSS.greenDk);
      this.pop();
      return;
    }
    this.countText?.setVisible(false);
    for (const p of this.ramenParts) p.setAlpha(0.35);
    this.check(this.ramenPos.x - 4, this.ramenPos.y - 4, ok ? C.green : C.orange);
    this.pop();
  }

  markSide(kind: SideKind) {
    const im = this.sideIcons.get(kind);
    if (!im) return;
    im.setAlpha(0.35);
    this.check(im.x - 4, im.y - 4, C.green);
    this.pop();
  }

  pop() {
    this.scene.tweens.add({ targets: this.root, scaleY: { from: 1.12, to: 1 }, duration: 180, ease: 'Back.Out' });
  }

  shake() {
    const x0 = COLS[this.slot] - CARD.w / 2;
    this.scene.tweens.add({ targets: this.root, x: { from: x0 - 3, to: x0 }, duration: 160, ease: 'Bounce.Out' });
  }

  remove(happy: boolean) {
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root, y: this.root.y + (happy ? -12 : 10), alpha: 0, duration: 260,
      onComplete: () => this.root.destroy(),
    });
  }
}
