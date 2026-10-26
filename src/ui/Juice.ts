import Phaser from 'phaser';
import { C, CSS, FONT, GAME_W } from '../config/constants';

/** 타격감 유틸: 텍스트 · 플로팅 텍스트 · 스케일 바운스 · 화면 흔들림 · 픽셀 파티클 · 포물선 비행 */

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, opts: {
  font?: string; size?: number; color?: string; stroke?: string; strokeW?: number; align?: string;
} = {}) {
  return scene.add.text(Math.round(x), Math.round(y), s, {
    fontFamily: opts.font ?? FONT.body,
    fontSize: `${opts.size ?? 10}px`,
    color: opts.color ?? CSS.white,
    stroke: opts.stroke ?? CSS.black,
    strokeThickness: opts.strokeW ?? 0,
    align: opts.align ?? 'left',
    resolution: 1,
  });
}

export function floatText(scene: Phaser.Scene, x: number, y: number, s: string, color: string = CSS.yellow, big = false) {
  const t = txt(scene, x, y, s, {
    font: big ? FONT.bold : FONT.body,
    size: big ? 12 : 10,
    color,
    stroke: CSS.black,
    strokeW: 2,
  }).setOrigin(0.5, 1).setDepth(1900);
  const half = Math.ceil(t.width / 2) + 2;
  t.x = Math.round(Phaser.Math.Clamp(x, half, GAME_W - half));
  t.setScale(0.4);
  scene.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.Out' });
  scene.tweens.add({
    targets: t, y: y - (big ? 22 : 16), duration: 700, ease: 'Cubic.Out',
    onComplete: () => scene.tweens.add({ targets: t, alpha: 0, y: t.y - 4, duration: 240, onComplete: () => t.destroy() }),
  });
  return t;
}

type Scalable = Phaser.GameObjects.GameObject & { setScale: (x: number, y?: number) => unknown; scaleX: number; scaleY: number };

export function bounce(scene: Phaser.Scene, target: Scalable, amount = 0.18, base = 1) {
  scene.tweens.killTweensOf(target);
  target.setScale(base);
  scene.tweens.add({
    targets: target,
    scaleX: { from: base * (1 + amount), to: base },
    scaleY: { from: base * (1 - amount * 0.7), to: base },
    duration: 220,
    ease: 'Back.Out',
  });
}

export function shake(scene: Phaser.Scene, strength = 0.004, ms = 90) {
  scene.cameras.main.shake(ms, strength);
}

export function burst(scene: Phaser.Scene, x: number, y: number, colors: number[], n = 10, speed = 50) {
  for (let i = 0; i < n; i++) {
    const p = scene.add.image(x, y, 'px').setTint(colors[i % colors.length]).setDepth(1850);
    p.setScale(Phaser.Math.Between(1, 2));
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(a) * v * 0.5,
      y: y + Math.sin(a) * v * 0.5 - 6,
      alpha: 0,
      duration: 360 + Math.random() * 240,
      ease: 'Quad.Out',
      onComplete: () => p.destroy(),
    });
  }
}

export function sparkle(scene: Phaser.Scene, x: number, y: number) {
  burst(scene, x, y, [C.yellow, C.white, C.gold], 12, 60);
}

/** 포물선 비행 */
export function arc(scene: Phaser.Scene, obj: Phaser.GameObjects.Image, tx: number, ty: number, ms: number, onDone: () => void, lift = 36) {
  const sx = obj.x, sy = obj.y;
  const peak = Math.min(sy, ty) - lift;
  const counter = { t: 0 };
  scene.tweens.add({
    targets: counter, t: 1, duration: ms, ease: 'Linear',
    onUpdate: () => {
      const t = counter.t;
      obj.x = Math.round(Phaser.Math.Linear(sx, tx, t));
      obj.y = Math.round((1 - t) * (1 - t) * sy + 2 * (1 - t) * t * peak + t * t * ty);
      obj.angle = Math.sin(t * Math.PI) * 12;
    },
    onComplete: onDone,
  });
}

/** 픽셀 말풍선 박스 (둥근 모서리 1px) */
export function drawBubble(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, line: number, tail?: 'down' | 'up' | null, tailX?: number) {
  g.fillStyle(line).fillRect(x + 1, y, w - 2, h).fillRect(x, y + 1, w, h - 2);
  g.fillStyle(fill).fillRect(x + 1, y + 1, w - 2, h - 2);
  if (tail) {
    const tx = Math.round(tailX ?? x + w / 2);
    if (tail === 'down') {
      g.fillStyle(line).fillRect(tx - 3, y + h - 1, 7, 1).fillRect(tx - 2, y + h, 5, 1).fillRect(tx - 1, y + h + 1, 3, 1).fillRect(tx, y + h + 2, 1, 1);
      g.fillStyle(fill).fillRect(tx - 2, y + h - 1, 5, 1).fillRect(tx - 1, y + h, 3, 1).fillRect(tx, y + h + 1, 1, 1);
    } else {
      g.fillStyle(line).fillRect(tx - 3, y, 7, 1).fillRect(tx - 2, y - 1, 5, 1).fillRect(tx - 1, y - 2, 3, 1).fillRect(tx, y - 3, 1, 1);
      g.fillStyle(fill).fillRect(tx - 2, y, 5, 1).fillRect(tx - 1, y - 1, 3, 1).fillRect(tx, y - 2, 1, 1);
    }
  }
}

/** 버튼 (나무 질감 + 그림자) — 눌렀을 때 1px 내려감 */
export function makeButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, opts: {
  fill?: number; top?: number; color?: string; font?: string; size?: number; onClick: () => void; depth?: number; disabled?: boolean;
}) {
  const g = scene.add.graphics();
  const fill = opts.disabled ? C.grayDk : (opts.fill ?? C.green);
  const top = opts.disabled ? C.gray : (opts.top ?? C.yellow);
  const draw = (pressed: boolean) => {
    g.clear();
    const oy = pressed ? 1 : 0;
    if (!pressed) g.fillStyle(C.black).fillRect(1, 2, w - 2, h);
    g.fillStyle(C.black).fillRect(1, oy, w - 2, h).fillRect(0, oy + 1, w, h - 2);
    g.fillStyle(fill).fillRect(1, oy + 1, w - 2, h - 2);
    g.fillStyle(top, 0.5).fillRect(2, oy + 2, w - 4, 1);
  };
  draw(false);
  const t = txt(scene, w / 2, h / 2, label, {
    font: opts.font ?? FONT.body, size: opts.size ?? 10, color: opts.disabled ? CSS.grayLt : (opts.color ?? CSS.white), stroke: CSS.black, strokeW: 0,
  }).setOrigin(0.5, 0.5);
  const root = scene.add.container(x, y, [g, t]).setDepth(opts.depth ?? 2100);
  if (!opts.disabled) {
    root.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    root.on('pointerdown', () => { draw(true); t.y = h / 2 + 1; });
    root.on('pointerout', () => { draw(false); t.y = h / 2; });
    root.on('pointerup', () => { draw(false); t.y = h / 2; opts.onClick(); });
  }
  return root;
}
