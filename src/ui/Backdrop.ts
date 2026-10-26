import Phaser from 'phaser';
import {
  BOWL_SHELF, C, COUNTER_FRONT_H, COUNTER_FRONT_Y, GAME_W, LAYOUT, POT_CELLS, SHELF_ROWS, SLUSH_POS, STATION_POS, STATION_W,
} from '../config/constants';

/**
 * 화면 높이가 기기마다 달라지므로, 배경을 고정 이미지 한 장이 아니라
 * 반복 타일 + 원본 아트 조각(크롭)으로 레이아웃에 맞춰 조립한다.
 */

/** BootScene에서 한 번: 반복 타일 텍스처 생성 */
export function makeTileTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // 가게 벽 타일 (아이보리 + 줄눈)
  g.clear().fillStyle(C.cream).fillRect(0, 0, 10, 10).fillStyle(C.tan).fillRect(0, 0, 10, 1).fillRect(0, 0, 1, 10);
  g.generateTexture('tile_wall', 10, 10);
  // 가스레인지 철판 (6줄마다 밝은 줄)
  g.clear().fillStyle(C.navy).fillRect(0, 0, 8, 6).fillStyle(C.slate).fillRect(0, 0, 8, 1);
  g.generateTexture('tile_stove', 8, 6);
  // 스테인리스 (12px마다 세로 결)
  g.clear().fillStyle(C.grayLt).fillRect(0, 0, 12, 4).fillStyle(C.gray).fillRect(0, 0, 1, 4);
  g.generateTexture('tile_steel', 12, 4);
  // 원목 작업대 (9px 판재 두 장)
  g.clear().fillStyle(C.tan).fillRect(0, 0, 32, 9).fillStyle(0xd77643).fillRect(0, 9, 32, 9)
    .fillStyle(C.brown).fillRect(0, 0, 32, 1).fillRect(0, 9, 32, 1).fillRect(13, 4, 1, 1).fillRect(27, 14, 1, 1);
  g.generateTexture('tile_wood', 32, 18);
  // 전방 매대 상판 (스테인리스 가로 결)
  g.clear().fillStyle(C.grayLt).fillRect(0, 0, 16, 4).fillStyle(C.white).fillRect(0, 0, 16, 1).fillStyle(C.gray).fillRect(5, 2, 6, 1);
  g.generateTexture('tile_bar', 16, 4);
  g.destroy();
}

/** 원본 kitchen_bg 아트에서 화구 셀이 있던 자리 (조각을 잘라 쓰기 위함) */
const ART_CELLS = [[4, 2], [66, 2], [4, 86], [66, 86]];

export function drawBackdrop(scene: Phaser.Scene, opts: { depthCounterFront?: number } = {}) {
  const { counter, kitchen, prep } = LAYOUT;

  // ── 카운터: 벽 타일 + 가게 아트(선반·소품) ──
  const imgY = COUNTER_FRONT_Y - 96;            // shop_bg 아트의 바닥(96)을 전방 매대 윗변에 맞춤
  if (imgY > counter.y) scene.add.tileSprite(0, counter.y, GAME_W, imgY - counter.y, 'tile_wall').setOrigin(0, 0).setDepth(0);
  const cropTop = Math.max(0, counter.y - imgY);
  scene.add.image(0, imgY, 'shop_bg', '0').setOrigin(0, 0).setCrop(0, cropTop, GAME_W, 96 - cropTop).setDepth(0);

  // ── 전방 매대: 나무 난간 + 스테인리스 상판 + 빨간 앞 테두리 (손님 하반신을 가림) ──
  const fd = opts.depthCounterFront ?? 160;
  const fy = COUNTER_FRONT_Y, fh = COUNTER_FRONT_H;
  scene.add.tileSprite(0, fy + 4, GAME_W, fh - 10, 'tile_bar').setOrigin(0, 0).setDepth(fd);
  const fg = scene.add.graphics().setDepth(fd);
  fg.fillStyle(C.tan).fillRect(0, fy, GAME_W, 4);                 // 손님 쪽 나무 난간
  fg.fillStyle(C.cream).fillRect(0, fy, GAME_W, 1);
  fg.fillStyle(C.brown).fillRect(0, fy + 3, GAME_W, 1);
  fg.fillStyle(C.gray, 0.6).fillRect(0, fy + 4, GAME_W, 2);        // 난간 그림자
  const ly = fy + fh - 6;                                          // 빨간 앞 테두리
  fg.fillStyle(C.red).fillRect(0, ly, GAME_W, 5);
  fg.fillStyle(C.pink).fillRect(0, ly, GAME_W, 1);
  fg.fillStyle(C.redDk).fillRect(0, ly + 4, GAME_W, 1);
  for (let x = 4; x < GAME_W; x += 16) fg.fillStyle(C.white).fillRect(x, ly + 2, 6, 1);
  fg.fillStyle(C.black).fillRect(0, fy + fh - 1, GAME_W, 1);

  // ── 주방: 가스레인지 / 칸막이 / 스테인리스 ──
  scene.add.tileSprite(0, kitchen.y, 128, kitchen.h, 'tile_stove').setOrigin(0, 0).setDepth(100);
  scene.add.tileSprite(131, kitchen.y, GAME_W - 131, kitchen.h, 'tile_steel').setOrigin(0, 0).setDepth(100);
  const g = scene.add.graphics().setDepth(101);
  g.fillStyle(C.gray).fillRect(128, kitchen.y, 3, kitchen.h);
  g.fillStyle(C.grayLt).fillRect(128, kitchen.y, 1, kitchen.h);
  g.fillStyle(C.grayDk).fillRect(0, kitchen.y, GAME_W, 1);

  // 화구 받침 패널: 원본 아트의 각 셀 조각을 새 위치로 (셀이 작아도 넘치지 않게 52px)
  POT_CELLS.forEach((cell, i) => {
    const [ax, ay] = ART_CELLS[i];
    scene.add.image(cell.x - ax, cell.y - ay, 'kitchen_bg', '0').setOrigin(0, 0)
      .setCrop(ax + 2, ay + 12, 56, 52).setDepth(101);
  });

  // 슬러시 받침대 (아트 조각)
  const standY = SLUSH_POS.y + 64;
  scene.add.image(134 - 140, standY - 70, 'kitchen_bg', '0').setOrigin(0, 0).setCrop(140, 70, 92, 10).setDepth(101);
  // 그릇 선반: 높이에 따라 1~2단 (36px 간격 판재)
  {
    const { x, y, w, h } = BOWL_SHELF;
    const sg = scene.add.graphics().setDepth(101);
    sg.fillStyle(C.brownDk).fillRect(x, y, w, h);
    sg.fillStyle(C.plum).fillRect(x + 2, y + 2, w - 4, h - 4);
    for (let k = 1; k <= SHELF_ROWS; k++) {
      const yy = Math.min(y + 36 * k, y + h - 4);
      sg.fillStyle(C.tan).fillRect(x, yy, w, 4);
      sg.fillStyle(C.cream).fillRect(x, yy, w, 1);
      sg.fillStyle(C.brown).fillRect(x, yy + 3, w, 1);
    }
    sg.fillStyle(C.tan).fillRect(x, y, w, 3);
    sg.fillStyle(C.cream).fillRect(x, y, w, 1);
  }

  // ── 손질대: 원목 + 스테인리스 립 + 스테이션 매트 ──
  scene.add.tileSprite(0, prep.y, GAME_W, prep.h, 'tile_wood').setOrigin(0, 0).setDepth(102);
  const p = scene.add.graphics().setDepth(103);
  p.fillStyle(C.grayLt).fillRect(0, prep.y, GAME_W, 3);
  p.fillStyle(C.white).fillRect(0, prep.y, GAME_W, 1);
  p.fillStyle(C.gray).fillRect(0, prep.y + 2, GAME_W, 1);
  for (const id of Object.keys(STATION_POS) as (keyof typeof STATION_POS)[]) {
    const { x, y } = STATION_POS[id];
    p.fillStyle(C.brown).fillRect(x, y - 2, STATION_W, 62);
    p.fillStyle(C.brownDk).fillRect(x + 1, y - 1, STATION_W - 2, 60);
    p.fillStyle(C.brown).fillRect(x + 1, y - 1, STATION_W - 2, 1);
  }
  p.fillStyle(C.brownDk).fillRect(0, prep.y + prep.h - 3, GAME_W, 3);
}
