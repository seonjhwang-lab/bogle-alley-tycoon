import Phaser from 'phaser';
import { GAME_H, GAME_W, idealHeight } from './config/constants';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#181425',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  render: { powerPreference: 'high-performance' },
  scene: [BootScene, TitleScene, GameScene],
});

(window as unknown as { __game: Phaser.Game }).__game = game;

/**
 * 화면 크기가 크게 바뀌면(회전·웹뷰 크기 확정 지연 등) 타이틀 화면에서만 레이아웃을 다시 계산한다.
 * 영업 중에는 FIT으로 전체가 보이게 유지하고, 다음에 타이틀로 돌아올 때 반영한다.
 */
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const el = document.getElementById('game');
    const r = el?.getBoundingClientRect();
    if (!r || r.width < 50 || r.height < 50) return;
    const want = idealHeight(r.width, r.height);
    if (Math.abs(want - GAME_H) < 4) return;
    const onTitle = game.scene.isActive('Title') || game.scene.isActive('Boot');
    if (!onTitle) return;
    try {
      const k = 'bogle-relayout';
      const now = Date.now();
      const log = (JSON.parse(sessionStorage.getItem(k) || '[]') as number[]).filter((t) => now - t < 10000);
      if (log.length >= 2) return; // 크기가 계속 출렁이면 무한 새로고침 방지
      log.push(now);
      sessionStorage.setItem(k, JSON.stringify(log));
    } catch {
      return;
    }
    location.reload();
  }, 350);
});
