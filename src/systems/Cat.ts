import Phaser from 'phaser';
import { C, CSS, FONT, GAME_W, type StationId } from '../config/constants';
import type { Kitchen } from './Kitchen';
import type { SoundManager } from './SoundManager';
import { burst, floatText, txt } from '../ui/Juice';

/**
 * 도둑고양이 (Day 5) — 손질대 위로 슬금슬금 올라와 스테이션 하나를 깔고 앉는다.
 * 탭하면 도망, 5초 방치하면 썬 대파를 먹거나 매출을 훔쳐 달아난다.
 * 어떤 경우에도 스테이션은 최대 5초 뒤 다시 풀린다.
 */
export class Cat {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private alert: Phaser.GameObjects.Text | null = null;
  private state: 'none' | 'walk' | 'sit' | 'flee' = 'none';
  private timer = 0;
  private target: StationId | null = null;
  nextIn = 14000;

  constructor(private scene: Phaser.Scene, private kitchen: Kitchen, private sfx: SoundManager, private onSteal: (amount: number, what: 'scallion' | 'gold') => void, private onShoo: () => void) {}

  get active() {
    return this.state !== 'none';
  }

  private spawn() {
    const options: StationId[] = (['board', 'egg', 'cheese'] as StationId[]).filter((s) => this.kitchen.isUnlocked(s));
    if (!options.length) return;
    this.target = Phaser.Utils.Array.GetRandom(options);
    const dest = this.kitchen.stationCenter(this.target);
    const fromLeft = dest.x > GAME_W / 2 ? false : true;
    const y = dest.y - 6;
    const s = this.scene.add.sprite(fromLeft ? -20 : GAME_W + 20, y, 'peeps').setOrigin(0.5, 1).setScale(2).setDepth(1500);
    s.play('cat_walk');
    s.setFlipX(fromLeft);
    s.setInteractive(new Phaser.Geom.Rectangle(-2, 4, 20, 22), Phaser.Geom.Rectangle.Contains);
    s.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      this.shoo();
    });
    this.sprite = s;
    this.state = 'walk';
    this.sfx.meow();
    this.scene.tweens.add({
      targets: s, x: dest.x, duration: (Math.abs(dest.x - s.x) / 70) * 1000, ease: 'Linear',
      onComplete: () => {
        if (this.state !== 'walk') return;
        this.state = 'sit';
        this.timer = 5000;
        s.play('cat_idle');
        this.kitchen.blockedBy = this.target;
        this.alert = txt(this.scene, s.x, s.y - 50, '!?', { font: FONT.bold, size: 12, color: CSS.red, stroke: CSS.white, strokeW: 2 })
          .setOrigin(0.5, 1).setDepth(1510);
        this.scene.tweens.add({ targets: this.alert, y: this.alert.y - 4, yoyo: true, repeat: -1, duration: 200 });
      },
    });
  }

  private clearAlert() {
    this.alert?.destroy();
    this.alert = null;
  }

  shoo() {
    const s = this.sprite;
    if (!s || (this.state !== 'walk' && this.state !== 'sit')) return;
    this.state = 'flee';
    this.kitchen.blockedBy = null;
    this.clearAlert();
    this.scene.tweens.killTweensOf(s);
    s.clearTint();
    s.play('cat_flee');
    this.sfx.hiss();
    burst(this.scene, s.x, s.y - 20, [C.orange, C.white, C.cream], 14, 70);
    floatText(this.scene, s.x, s.y - 44, '훠이!', CSS.green, true);
    this.onShoo();
    const tx = s.x < GAME_W / 2 ? -24 : GAME_W + 24;
    s.setFlipX(tx > s.x);
    this.scene.time.delayedCall(240, () => {
      if (!s.active) return;
      s.play('cat_walk');
      this.scene.tweens.add({ targets: s, x: tx, duration: 520, ease: 'Quad.In', onComplete: () => this.cleanup() });
    });
  }

  private steal() {
    const s = this.sprite!;
    this.state = 'flee';
    this.kitchen.blockedBy = null;
    this.clearAlert();
    s.clearTint();
    s.play('cat_steal');
    this.sfx.meow();
    if (this.target === 'board' && this.kitchen.stealScallion()) {
      floatText(this.scene, s.x, s.y - 44, '대파를 먹었다!', CSS.red);
      this.onSteal(0, 'scallion');
    } else {
      floatText(this.scene, s.x, s.y - 44, '냠! -20G', CSS.red);
      this.onSteal(20, 'gold');
    }
    const tx = Math.random() < 0.5 ? -24 : GAME_W + 24;
    s.setFlipX(tx > s.x);
    this.scene.tweens.add({ targets: s, x: tx, duration: 900, onComplete: () => this.cleanup() });
  }

  private cleanup() {
    this.sprite?.destroy();
    this.sprite = null;
    this.state = 'none';
    this.target = null;
  }

  /** 영업 종료 */
  leave() {
    if (this.state === 'walk' || this.state === 'sit') {
      this.kitchen.blockedBy = null;
      this.clearAlert();
      this.cleanup();
    }
  }

  update(dt: number) {
    if (this.state === 'none') {
      this.nextIn -= dt;
      if (this.nextIn <= 0) {
        this.spawn();
        this.nextIn = Phaser.Math.Between(16000, 24000);
      }
    } else if (this.state === 'sit' && this.sprite) {
      this.timer -= dt;
      this.sprite.setTint(Math.floor(this.timer / 150) % 2 ? 0xffffff : 0xffc0c0);
      if (this.timer <= 0) this.steal();
    }
  }
}
