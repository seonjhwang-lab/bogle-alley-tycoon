import Phaser from 'phaser';
import { C, CSS, FONT, GAME_H, GAME_W, UPGRADES, type UpgradeId } from '../config/constants';
import type { DayConfig } from '../config/days';
import type { ProgressData } from '../systems/Progress';
import type { SoundManager } from '../systems/SoundManager';
import { icon, setIcon } from './Frames';
import { bounce, makeButton, sparkle, txt } from './Juice';

const DEPTH = 2000;

function blocker(scene: Phaser.Scene, alpha = 0.66, onTap?: () => void) {
  const r = scene.add.rectangle(0, 0, GAME_W, GAME_H, C.black, alpha).setOrigin(0, 0).setDepth(DEPTH).setInteractive();
  if (onTap) r.on('pointerdown', onTap);
  return r;
}

function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, head: number = C.red) {
  const g = scene.add.graphics().setDepth(DEPTH + 1);
  g.fillStyle(C.black).fillRect(x + 3, y + 4, w, h);
  g.fillStyle(C.black).fillRect(x + 1, y, w - 2, h).fillRect(x, y + 1, w, h - 2);
  g.fillStyle(C.cream).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(head).fillRect(x + 1, y + 1, w - 2, 20);
  for (let xx = x + 3; xx < x + w - 3; xx += 8) g.fillStyle(C.white).fillRect(xx, y + 21, 4, 2);
  return g;
}

/** 한 덩어리 팝업을 쉽게 닫기 위한 묶음 */
class Group {
  items: Phaser.GameObjects.GameObject[] = [];
  add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.items.push(o);
    const d = o as unknown as { depth?: number; setDepth?: (n: number) => void };
    if (d.setDepth && (d.depth ?? 0) < DEPTH) d.setDepth(DEPTH + 2);
    return o;
  }
  destroy() {
    for (const o of this.items) o.destroy();
    this.items = [];
  }
}

// ─── Day 시작 안내 ──────────────────────────────────────────────
export function showDayIntro(scene: Phaser.Scene, cfg: DayConfig, sfx: SoundManager, onClose: () => void) {
  const grp = new Group();
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    sfx.click();
    grp.destroy();
    onClose();
  };
  grp.add(blocker(scene, 0.62, close));
  const w = 210, h = 176, x = (GAME_W - w) / 2, y = Math.round((GAME_H - h) / 2) - 8;
  const head = cfg.kind === 'hidden' ? C.magenta : cfg.kind === 'endless' ? C.blueDk : cfg.day === 1 ? C.red : C.greenDk;
  grp.add(panel(scene, x, y, w, h, head));
  const ttl = grp.add(txt(scene, GAME_W / 2, y + 5, `${cfg.label} · ${cfg.title}`, { font: FONT.bold, size: 12, color: CSS.white, stroke: CSS.black, strokeW: 2 }).setOrigin(0.5, 0));
  if (ttl.width > w - 8) ttl.setScale((w - 8) / ttl.width);
  grp.add(txt(scene, GAME_W / 2, y + 32, cfg.intro.headline, { font: FONT.bold, size: 12, color: CSS.redDk }).setOrigin(0.5, 0));
  const n = cfg.intro.icons.length;
  cfg.intro.icons.forEach((tag, i) => {
    const im = grp.add(icon(scene, GAME_W / 2 + (i - (n - 1) / 2) * 40, y + 68, tag).setScale(2));
    scene.tweens.add({ targets: im, y: im.y - 3, yoyo: true, repeat: -1, duration: 420 + i * 60, ease: 'Sine.InOut' });
  });
  if (cfg.day === 3) {
    // 미니 레버 시연: 빨간 손잡이가 아래로 쭉 → 철컥 올라감 + 손가락
    const lx = x + w - 22, t = y + 40, b = y + 70;
    const tg = grp.add(scene.add.graphics());
    tg.fillStyle(C.black).fillRect(lx - 4, t - 4, 8, b - t + 8);
    tg.fillStyle(C.gray).fillRect(lx - 3, t - 3, 6, b - t + 6);
    tg.fillStyle(C.black).fillRect(lx - 1, t, 2, b - t);
    const knob = grp.add(icon(scene, lx, t, 'ui_knob').setOrigin(0.47, 0.45));
    const hand = grp.add(scene.add.sprite(lx + 3, t - 7, 'ui_icons').play('ui_hand'));
    scene.tweens.add({ targets: [knob], y: b, duration: 800, ease: 'Sine.InOut', hold: 250, repeat: -1, repeatDelay: 250,
      onRepeat: () => { knob.y = t; } });
    scene.tweens.add({ targets: [hand], y: b - 7, duration: 800, ease: 'Sine.InOut', hold: 250, repeat: -1, repeatDelay: 250,
      onRepeat: () => { hand.y = t - 7; } });
    grp.add(txt(scene, lx, b + 6, '당기기', { font: FONT.small, size: 8, color: CSS.redDk }).setOrigin(0.5, 0));
  }
  cfg.intro.lines.forEach((l, i) => {
    const t = grp.add(txt(scene, GAME_W / 2, y + 92 + i * 14, l, { font: FONT.body, size: 10, color: CSS.plum }).setOrigin(0.5, 0));
    if (t.width > w - 10) t.setScale((w - 10) / t.width, 1);
  });
  const goal = cfg.kind === 'endless' ? '시간 제한 없음 · 하트 3개' : cfg.kind === 'hidden' ? `영업 시간 ${cfg.durationSec}초 · 목표 ${cfg.stars[0]}G = 클리어` : `영업 시간 ${cfg.durationSec}초 · 목표 ★ ${cfg.stars[0]}G`;
  grp.add(txt(scene, GAME_W / 2, y + h - 30, goal, { font: FONT.small, size: 8, color: CSS.brownDk }).setOrigin(0.5, 0));
  // 5초 자동 시작 바
  const bar = grp.add(scene.add.graphics());
  const start = scene.time.now;
  const tick = () => {
    if (closed) return;
    const p = Math.min(1, (scene.time.now - start) / 5000);
    bar.clear();
    bar.fillStyle(C.tan).fillRect(x + 12, y + h - 14, w - 24, 4);
    bar.fillStyle(C.green).fillRect(x + 12, y + h - 14, Math.round((w - 24) * (1 - p)), 4);
    if (p >= 1) close();
  };
  const ev = scene.time.addEvent({ delay: 50, loop: true, callback: tick });
  grp.items.push({ destroy: () => ev.remove() } as unknown as Phaser.GameObjects.GameObject);
  grp.add(txt(scene, GAME_W / 2, y + h - 8, '탭해서 바로 시작', { font: FONT.small, size: 8, color: CSS.gray }).setOrigin(0.5, 0));
  sfx.unlock();
  if (cfg.day > 1) sfx.unlockJingle();
}

// ─── 영업 정산 영수증 ───────────────────────────────────────────
export interface DayStats {
  revenue: number; ramen: number; slush: number; tteok: number; odeng: number; perfect: number; tips: number;
  missed: number; mistakes: number; bestCombo: number; served: number; fevers: number; arcade: number;
}

export interface StageResult {
  stars: number;          // 일반 Day
  maxStars: number;       // 도전 가능한 별 (3~5)
  cleared: boolean;       // 히든 스테이지
  bonus: number;          // 첫 클리어 보너스
  record: boolean;        // 최고 기록 갱신
  news: string[];         // 새로 해금된 것
}

export function showReceipt(scene: Phaser.Scene, cfg: DayConfig, stats: DayStats, res: StageResult, progress: ProgressData, sfx: SoundManager, actions: {
  next?: () => void; retry: () => void; title: () => void; shop: () => void;
}) {
  const grp = new Group();
  grp.add(blocker(scene, 0.7));
  const w = 180, x = (GAME_W - w) / 2;
  const paperH = Math.min(286, GAME_H - 74);
  const paper = scene.add.container(x, GAME_H).setDepth(DEPTH + 1);
  grp.add(paper);
  const g = scene.add.graphics();
  g.fillStyle(C.black, 0.4).fillRect(3, 3, w, paperH);
  g.fillStyle(C.white).fillRect(0, 0, w, paperH);
  for (let xx = 0; xx < w; xx += 6) {
    g.fillStyle(C.white).fillTriangle(xx, paperH, xx + 6, paperH, xx + 3, paperH + 4);
    g.fillStyle(C.white).fillTriangle(xx, 0, xx + 6, 0, xx + 3, -4);
  }
  paper.add(g);
  const compact = paperH < 270;
  const step = compact ? 12 : 13;
  const line = (yy: number, l: string, r: string, color: string = CSS.plum, bold = false) => {
    const a = txt(scene, 10, yy, l, { font: bold ? FONT.bold : FONT.body, size: bold ? 12 : 10, color });
    const b = txt(scene, w - 10, yy, r, { font: bold ? FONT.bold : FONT.body, size: bold ? 12 : 10, color }).setOrigin(1, 0);
    const dots = scene.add.graphics();
    dots.fillStyle(C.grayLt);
    for (let xx = 12 + Math.ceil(a.width); xx < w - 12 - Math.ceil(b.width); xx += 3) dots.fillRect(xx, yy + (bold ? 9 : 8), 1, 1);
    paper.add([dots, a, b]);
  };
  const dash = (yy: number) => {
    const d = scene.add.graphics();
    d.fillStyle(C.gray);
    for (let xx = 8; xx < w - 8; xx += 4) d.fillRect(xx, yy, 2, 1);
    paper.add(d);
  };
  paper.add(txt(scene, w / 2, 7, '보글보글 분식', { font: FONT.bold, size: 12, color: CSS.black }).setOrigin(0.5, 0));
  paper.add(txt(scene, w / 2, 22, `${cfg.label} 영업 정산서`, { font: FONT.small, size: 8, color: CSS.gray }).setOrigin(0.5, 0));
  dash(33);
  let yy = 38;
  // 메뉴별 (0인 줄은 생략해서 짧은 화면에도 들어가게)
  const menu = `라면 ${stats.ramen}` + (stats.tteok ? ` · 떡 ${stats.tteok}` : '') + (stats.odeng ? ` · 어묵 ${stats.odeng}` : '') + (stats.slush ? ` · 슬 ${stats.slush}` : '');
  line(yy, '판매', menu); yy += step;
  line(yy, '만족한 손님', `${stats.served}명`); yy += step;
  line(yy, 'PERFECT', `${stats.perfect}회`); yy += step;
  line(yy, '최고 콤보 / 피버', `${stats.bestCombo} / ${stats.fevers}회`); yy += step;
  line(yy, '팁', `${stats.tips}G`); yy += step;
  if (stats.arcade) { line(yy, '미니 오락기', `${stats.arcade}G`); yy += step; }
  line(yy, '놓친 손님', `${stats.missed}명`, stats.missed ? CSS.red : CSS.plum); yy += step;
  if (stats.mistakes) { line(yy, '레시피 실수', `${stats.mistakes}회`, CSS.orange); yy += step; }
  dash(yy + 2); yy += 7;
  line(yy, '합계 매출', `${stats.revenue}G`, CSS.black, true); yy += 18;
  if (res.bonus) { line(yy, '첫 클리어 보너스', `+${res.bonus}G`, CSS.greenDk); yy += step; }

  const starImgs: Phaser.GameObjects.Image[] = [];
  let verdict = '';
  let verdictColor: string = CSS.greenDk;
  if (cfg.kind === 'day') {
    const n = res.maxStars;
    const labels = cfg.stars.slice(0, n).map((s, i) => `${i + 1}★${s}`).join(' ');
    const lt = txt(scene, w / 2, yy, labels, { font: FONT.small, size: 8, color: CSS.gray }).setOrigin(0.5, 0);
    if (lt.width > w - 8) lt.setScale((w - 8) / lt.width, 1);
    paper.add(lt);
    yy += 11;
    const gap = n === 3 ? 36 : n === 4 ? 30 : 26;
    for (let i = 0; i < n; i++) {
      const s = icon(scene, w / 2 + (i - (n - 1) / 2) * gap, yy + 14, 'ui_star_empty').setScale(n === 5 ? 1.5 : 2);
      starImgs.push(s);
      paper.add(s);
    }
    const st = res.stars;
    verdict = st === 0 ? '조금만 더 힘내요!' : st === 1 ? '무난한 하루!' : st === 2 ? '단골이 늘었어요!' : st === 3 ? '소문난 분식집!' : st === 4 ? '동네 맛집 등극!' : '전설의 맛집!!';
    if (st === 0) verdictColor = CSS.redDk;
    yy += 32;
  } else if (cfg.kind === 'hidden') {
    verdict = res.cleared ? '스테이지 클리어!' : `실패… 목표 ${cfg.stars[0]}G`;
    verdictColor = res.cleared ? CSS.greenDk : CSS.redDk;
    const ic = icon(scene, w / 2, yy + 12, res.cleared ? 'ui_trophy' : (cfg.id === 'h1' ? 'ui_ribbon' : 'ui_belt')).setScale(2);
    paper.add(ic);
    yy += 30;
  } else {
    verdict = res.record ? '최고 기록 갱신!!' : `최고 기록 ${progress.endlessBest.revenue}G`;
    verdictColor = res.record ? CSS.greenDk : CSS.plum;
    paper.add(icon(scene, w / 2, yy + 12, 'ui_trophy').setScale(2));
    yy += 30;
  }
  const vt = txt(scene, w / 2, yy, verdict, { font: FONT.bold, size: 12, color: verdictColor }).setOrigin(0.5, 0).setAlpha(0);
  paper.add(vt);
  dash(paperH - 20);
  paper.add(txt(scene, w / 2, paperH - 15, `내 지갑 (누적)  ${progress.wallet}G`, { font: FONT.body, size: 10, color: CSS.brownDk }).setOrigin(0.5, 0));

  sfx.receipt();
  const targetY = Math.max(6, Math.round((GAME_H - paperH - 62) / 2));
  const reveal = () => {
    scene.tweens.add({ targets: vt, alpha: 1, duration: 200 });
    if (res.cleared || res.record) sfx.fanfare();
    buttons();
    res.news.forEach((n, i) => scene.time.delayedCall(400 + i * 700, () => banner(n, i)));
  };
  scene.tweens.add({
    targets: paper, y: targetY, duration: 700, ease: 'Cubic.Out',
    onComplete: () => {
      if (!starImgs.length) { scene.time.delayedCall(300, reveal); return; }
      starImgs.forEach((im, i) => {
        scene.time.delayedCall(300 + i * 340, () => {
          if (i < res.stars) {
            setIcon(im, 'ui_star');
            bounce(scene, im, 0.6, im.scaleX);
            sparkle(scene, x + im.x, targetY + im.y);
            sfx.star(Math.min(2, i));
          }
          if (i === starImgs.length - 1) reveal();
        });
      });
    },
  });

  /** 해금 알림 띠: 검은 리본 위에 글자 (영수증 머리글과 겹쳐도 읽히게), 여러 개면 아래로 쌓는다 */
  const banner = (msg: string, i: number) => {
    const y = 4 + i * 18;
    const t = txt(scene, GAME_W / 2, y + 3, msg, { font: FONT.body, size: 10, color: CSS.yellow, stroke: CSS.black, strokeW: 2 }).setOrigin(0.5, 0);
    if (t.width > GAME_W - 12) t.setScale((GAME_W - 12) / t.width);
    const bg = scene.add.graphics();
    bg.fillStyle(C.black, 0.88).fillRect(0, y, GAME_W, 16);
    bg.fillStyle(C.yellow).fillRect(0, y, GAME_W, 1).fillRect(0, y + 15, GAME_W, 1);
    const box = scene.add.container(0, 0, [bg, t]).setDepth(DEPTH + 10);
    grp.add(box);
    box.setDepth(DEPTH + 10);
    sfx.unlockJingle();
    scene.tweens.add({ targets: box, alpha: { from: 0, to: 1 }, x: { from: -20, to: 0 }, duration: 260, ease: 'Back.Out' });
    scene.tweens.add({ targets: box, alpha: 0, delay: 3200, duration: 400 });
  };

  const buttons = () => {
    const by = targetY + paperH + 10;
    const bw = 104, gap = 6;
    if (actions.next) {
      grp.add(makeButton(scene, GAME_W / 2 - bw - gap / 2, by + 4, bw, 22, '다음 날 ▶', { fill: C.green, onClick: () => { grp.destroy(); actions.next!(); } }));
      grp.add(makeButton(scene, GAME_W / 2 + gap / 2, by + 4, bw, 22, '가게 업그레이드', { fill: C.blue, onClick: () => actions.shop() }));
    } else {
      grp.add(makeButton(scene, GAME_W / 2 - bw / 2, by + 4, bw, 22, '가게 업그레이드', { fill: C.blue, onClick: () => actions.shop() }));
    }
    grp.add(makeButton(scene, GAME_W / 2 - bw - gap / 2, by + 32, bw, 20, '다시 하기', { fill: C.orange, size: 10, onClick: () => { grp.destroy(); actions.retry(); } }));
    grp.add(makeButton(scene, GAME_W / 2 + gap / 2, by + 32, bw, 20, '처음 화면', { fill: C.slate, size: 10, onClick: () => { grp.destroy(); actions.title(); } }));
  };
  return grp;
}

// ─── 업그레이드 상점 ─────────────────────────────────────────────
export function showShop(scene: Phaser.Scene, progress: ProgressData, sfx: SoundManager, onBuy: () => void, onClose?: () => void) {
  const grp = new Group();
  const close = () => { grp.destroy(); onClose?.(); };
  grp.add(blocker(scene, 0.72, close));
  const ids = Object.keys(UPGRADES) as UpgradeId[];
  const rowH = GAME_H >= 380 ? 50 : 46;
  const w = 220, h = 62 + ids.length * rowH, x = (GAME_W - w) / 2, y = Math.max(4, Math.round((GAME_H - h) / 2));
  grp.add(panel(scene, x, y, w, h, C.blue));
  grp.add(scene.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive().setDepth(DEPTH + 1));
  grp.add(txt(scene, GAME_W / 2, y + 5, '가게 업그레이드', { font: FONT.bold, size: 12, color: CSS.white, stroke: CSS.black, strokeW: 2 }).setOrigin(0.5, 0));
  const xBtn = grp.add(txt(scene, x + w - 14, y + 4, 'X', { font: FONT.bold, size: 12, color: CSS.white }).setInteractive());
  xBtn.on('pointerdown', close);
  const walletT = grp.add(txt(scene, GAME_W / 2, y + 28, '', { font: FONT.body, size: 10, color: CSS.brownDk }).setOrigin(0.5, 0));
  const rows: Phaser.GameObjects.GameObject[] = [];
  const render = () => {
    for (const r of rows) r.destroy();
    rows.length = 0;
    walletT.setText(`내 지갑  ${progress.wallet}G`);
    ids.forEach((id, i) => {
      const u = UPGRADES[id];
      const ry = y + 42 + i * rowH;
      const g = scene.add.graphics().setDepth(DEPTH + 2);
      g.fillStyle(id === 'arcade' || id === 'tv' ? C.gold : C.tan).fillRect(x + 6, ry, w - 12, rowH - 4);
      g.fillStyle(C.white, 0.5).fillRect(x + 7, ry + 1, w - 14, 1);
      g.fillStyle(C.slate).fillRect(x + 10, ry + 5, 34, 34);
      const ic = icon(scene, x + 27, ry + 22, u.icon).setScale(2).setDepth(DEPTH + 2);
      const name = txt(scene, x + 50, ry + 4, u.name, { font: FONT.body, size: 10, color: CSS.plum }).setDepth(DEPTH + 2);
      const desc = txt(scene, x + 50, ry + 17, u.desc, { font: FONT.small, size: 8, color: CSS.brownDk }).setDepth(DEPTH + 2).setLineSpacing(1);
      rows.push(g, ic, name, desc);
      const owned = progress.upgrades[id];
      const can = !owned && progress.wallet >= u.price;
      const btn = makeButton(scene, x + w - 58, ry + rowH - 24, 50, 18, owned ? '보유 중' : `${u.price}G`, {
        fill: can ? C.green : C.redDk, disabled: owned, size: 10, depth: DEPTH + 3,
        onClick: () => {
          if (progress.wallet < u.price) {
            sfx.error();
            bounce(scene, btn, 0.2);
            return;
          }
          progress.wallet -= u.price;
          progress.upgrades[id] = true;
          sfx.buy();
          sparkle(scene, x + 27, ry + 22);
          onBuy();
          render();
        },
      });
      rows.push(btn);
    });
  };
  render();
  grp.items.push({ destroy: () => rows.forEach((r) => r.destroy()) } as unknown as Phaser.GameObjects.GameObject);
  grp.add(txt(scene, GAME_W / 2, y + h - 14, '소품은 전방 매대에 놓여요 · 다음 영업부터 적용', { font: FONT.small, size: 8, color: CSS.gray }).setOrigin(0.5, 0));
  return grp;
}

// ─── 일시정지 ───────────────────────────────────────────────────
export function showPause(scene: Phaser.Scene, sfx: SoundManager, actions: { resume: () => void; retry: () => void; title: () => void }) {
  const grp = new Group();
  grp.add(blocker(scene, 0.7));
  const w = 160, h = 150, x = (GAME_W - w) / 2, y = Math.round((GAME_H - h) / 2);
  grp.add(panel(scene, x, y, w, h, C.slate));
  grp.add(txt(scene, GAME_W / 2, y + 5, '잠깐 쉬어요', { font: FONT.bold, size: 12, color: CSS.white }).setOrigin(0.5, 0));
  const bw = 120, bx = (GAME_W - bw) / 2;
  grp.add(makeButton(scene, bx, y + 32, bw, 22, '계속하기', { fill: C.green, onClick: () => { grp.destroy(); actions.resume(); } }));
  const soundBtn = makeButton(scene, bx, y + 60, bw, 22, sfx.muted ? '소리 켜기' : '소리 끄기', {
    fill: C.blue, onClick: () => { sfx.toggleMute(); grp.destroy(); showPause(scene, sfx, actions); },
  });
  grp.add(soundBtn);
  grp.add(makeButton(scene, bx, y + 88, bw, 22, '처음부터 다시', { fill: C.orange, onClick: () => { grp.destroy(); actions.retry(); } }));
  grp.add(makeButton(scene, bx, y + 116, bw, 22, '처음 화면', { fill: C.slate, onClick: () => { grp.destroy(); actions.title(); } }));
  return grp;
}

// ─── 확인 창 (진행 초기화 등) ─────────────────────────────────────
export function showConfirm(scene: Phaser.Scene, text: string, okLabel: string, onOk: () => void) {
  const grp = new Group();
  grp.add(blocker(scene, 0.7, () => grp.destroy()));
  const w = 180, h = 96, x = (GAME_W - w) / 2, y = Math.round((GAME_H - h) / 2);
  grp.add(panel(scene, x, y, w, h, C.redDk));
  grp.add(scene.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive().setDepth(DEPTH + 1));
  grp.add(txt(scene, GAME_W / 2, y + 30, text, { font: FONT.body, size: 10, color: CSS.plum, align: 'center' }).setOrigin(0.5, 0));
  grp.add(makeButton(scene, x + 12, y + h - 30, 74, 20, '취소', { fill: C.slate, onClick: () => grp.destroy() }));
  grp.add(makeButton(scene, x + w - 86, y + h - 30, 74, 20, okLabel, { fill: C.red, onClick: () => { grp.destroy(); onOk(); } }));
  return grp;
}
