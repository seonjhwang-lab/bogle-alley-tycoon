import Phaser from 'phaser';
import { C, CSS, FONT, GAME_H, GAME_W } from '../config/constants';
import { DAYS } from '../config/days';
import { Progress } from '../systems/Progress';
import { sfx } from '../systems/sfx';
import { icon } from '../ui/Frames';
import { bounce, makeButton, txt } from '../ui/Juice';
import { showConfirm, showShop } from '../ui/Popups';
import { drawBackdrop } from '../ui/Backdrop';

const NEWS_TEXT: Record<string, string> = {
  h1: '히든 스테이지 「여고생 군단」이 열렸어요!',
  h2: '히든 스테이지 「유도부 강습」이 열렸어요!',
  star4: '★4 도전 등급 해금! Day 기록을 더 높여 보세요',
  star5: '★5 전설의 맛집 등급 해금!',
  endless: '무한 리필 서바이벌이 열렸어요!',
};

/** 타이틀 · Day 선택 · 히든 스테이지 · 무한 모드 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const p = Progress.get();
    Progress.refreshUnlocks();
    const maxStars = Progress.maxStars(p);
    drawBackdrop(this, { depthCounterFront: 0 });
    this.add.rectangle(0, 0, GAME_W, GAME_H, C.black, 0.66).setOrigin(0, 0).setDepth(500);

    // 화면 높이(340~520)에 맞춘 세로 배치: 로고 / (냄비) / Day 5줄 / 히든·무한 / 하단 메뉴
    const H = GAME_H;
    const compact = H < 420;
    const bottomTop = H - 82;
    const logoY = compact ? 20 : 36;
    const l1 = txt(this, GAME_W / 2, logoY, '보글보글', { font: FONT.bold, size: 12, color: CSS.yellow, stroke: CSS.redDk, strokeW: 3 }).setOrigin(0.5).setScale(compact ? 2.3 : 3).setDepth(510);
    txt(this, GAME_W / 2, logoY + (compact ? 26 : 34), '골목 타이쿤', { font: FONT.bold, size: 12, color: CSS.white, stroke: CSS.redDk, strokeW: 3 }).setOrigin(0.5).setScale(compact ? 1.5 : 2).setDepth(510);
    this.tweens.add({ targets: l1, y: logoY - 3, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.InOut' });
    let listTop = logoY + (compact ? 40 : 54);
    if (H >= 470) {
      const pot = this.add.sprite(GAME_W / 2, listTop + 16, 'pot_modular').play('pot_boiling_gold').setDepth(510);
      this.tweens.add({ targets: pot, scaleY: { from: 1.06, to: 0.95 }, yoyo: true, repeat: -1, duration: 140 });
      listTop += 44;
    }
    const specialH = 36;
    const step = Math.min(34, Math.floor((bottomTop - listTop - specialH - 6) / DAYS.length));
    const used = step * DAYS.length + specialH + 6;
    const listTopY = listTop + Math.max(0, Math.floor((bottomTop - listTop - used) / 2));

    // ── Day 1~5 ──
    const bx = 20, bw = GAME_W - 40, bh = Math.min(30, step - 3);
    const dayCenters: number[][] = [];
    DAYS.forEach((d, i) => {
      const y = listTopY + i * step;
      dayCenters.push([GAME_W / 2, y + Math.round(bh / 2)]);
      const locked = d.day > p.unlocked;
      const g = this.add.graphics();
      const fill = locked ? C.slate : d.day === p.unlocked ? C.redDk : C.brownDk;
      g.fillStyle(C.black).fillRect(1, 2, bw - 2, bh);
      g.fillStyle(C.black).fillRect(1, 0, bw - 2, bh).fillRect(0, 1, bw, bh - 2);
      g.fillStyle(fill).fillRect(1, 1, bw - 2, bh - 2);
      g.fillStyle(C.white, 0.15).fillRect(2, 2, bw - 4, 1);
      const parts: Phaser.GameObjects.GameObject[] = [g];
      parts.push(txt(this, 7, 2, `DAY ${d.day}`, { font: FONT.bold, size: 12, color: locked ? CSS.gray : CSS.yellow }));
      const maxW = locked ? bw - 30 : bw - 76;
      const sub = txt(this, 7, bh - 11, locked ? '이전 날을 별 1개 이상으로 마치면 열려요' : `${d.title} · ${d.durationSec}초`, { font: FONT.small, size: 8, color: locked ? CSS.gray : CSS.cream });
      if (sub.width > maxW) sub.setScale(maxW / sub.width, 1);
      parts.push(sub);
      if (locked) {
        parts.push(icon(this, bw - 14, bh / 2, 'ui_lock'));
      } else {
        // 별 슬롯: 도전 가능한 개수만 진하게 (★4·★5는 히든 스테이지 클리어로 열림)
        for (let k = 0; k < 5; k++) {
          const sx = bw - 64 + k * 12;
          if (k < maxStars) parts.push(icon(this, sx, 8, k < p.best[i] ? 'ui_star' : 'ui_star_empty').setScale(0.75));
          else parts.push(icon(this, sx, 8, 'ui_star_empty').setScale(0.6).setAlpha(0.3));
        }
        if (p.bestRevenue[i]) parts.push(txt(this, bw - 6, bh - 11, `${p.bestRevenue[i]}G`, { font: FONT.small, size: 8, color: CSS.grayLt }).setOrigin(1, 0));
      }
      const c = this.add.container(bx, y, parts).setDepth(510);
      if (!locked) {
        c.setInteractive(new Phaser.Geom.Rectangle(0, 0, bw, bh), Phaser.Geom.Rectangle.Contains);
        c.on('pointerdown', () => this.go(c, `d${d.day}`));
        if (d.day === p.unlocked) this.tweens.add({ targets: c, x: bx + 2, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.InOut' });
      } else c.setAlpha(0.8);
    });

    // ── 히든 스테이지 2종 + 무한 모드 (한 줄에 타일 3개) ──
    const sy = listTopY + DAYS.length * step + 4;
    const tw = Math.floor((bw - 8) / 3);
    const tiles: { id: string; open: boolean; icon: string; name: string; sub: string; color: number }[] = [
      { id: 'h1', open: p.h1Unlocked, icon: 'ui_ribbon', name: '여고생 군단', sub: p.h1Cleared ? `클리어 ${p.hiddenBest.h1}G` : p.h1Unlocked ? '깨면 ★4 해금' : '★3 달성 시', color: C.magenta },
      { id: 'h2', open: p.h2Unlocked, icon: 'ui_belt', name: '유도부 강습', sub: p.h2Cleared ? `클리어 ${p.hiddenBest.h2}G` : p.h2Unlocked ? '깨면 ★5 해금' : '별12 / D5 클리어', color: C.blueDk },
      { id: 'endless', open: p.endlessUnlocked, icon: 'ui_trophy', name: '무한 리필', sub: p.endlessUnlocked ? `최고 ${p.endlessBest.revenue}G` : '유도부 클리어', color: C.redDk },
    ];
    const tileCenters: Record<string, number[]> = {};
    tiles.forEach((t, i) => {
      const x = bx + i * (tw + 4);
      tileCenters[t.id] = [x + tw / 2, sy + specialH / 2];
      const g = this.add.graphics();
      g.fillStyle(C.black).fillRect(0, 0, tw, specialH);
      g.fillStyle(t.open ? t.color : C.slate).fillRect(1, 1, tw - 2, specialH - 2);
      g.fillStyle(C.white, 0.18).fillRect(2, 2, tw - 4, 1);
      const parts: Phaser.GameObjects.GameObject[] = [g];
      parts.push(icon(this, 10, 11, t.open ? t.icon : 'ui_lock'));
      const nm = txt(this, 19, 4, t.open ? t.name : '???', { font: FONT.small, size: 8, color: t.open ? CSS.white : CSS.gray });
      if (nm.width > tw - 21) nm.setScale((tw - 21) / nm.width, 1);
      parts.push(nm);
      const sb = txt(this, tw / 2, specialH - 12, t.sub, { font: FONT.small, size: 8, color: t.open ? CSS.yellow : CSS.gray }).setOrigin(0.5, 0);
      if (sb.width > tw - 4) sb.setScale((tw - 4) / sb.width, 1);
      parts.push(sb);
      const c = this.add.container(x, sy, parts).setDepth(510);
      c.setInteractive(new Phaser.Geom.Rectangle(0, 0, tw, specialH), Phaser.Geom.Rectangle.Contains);
      if (t.open) {
        c.on('pointerdown', () => this.go(c, t.id));
        if (p.news.includes(t.id)) this.tweens.add({ targets: c, alpha: 0.55, yoyo: true, repeat: -1, duration: 300 });
      } else {
        c.on('pointerdown', () => { sfx.unlock(); sfx.error(); bounce(this, c, 0.08); });
      }
    });
    (window as unknown as { __titleLayout: unknown }).__titleLayout = { days: dayCenters, tiles: tileCenters, H: GAME_H };

    // ── 하단: 지갑 · 업그레이드 · 소리 · 초기화 ──
    const walletLabel = () => `내 지갑 ${p.wallet}G · 별 ${Progress.totalStars(p)}개`;
    const walletT = txt(this, GAME_W / 2, H - 78, walletLabel(), { font: FONT.body, size: 10, color: CSS.yellow, stroke: CSS.black, strokeW: 2 }).setOrigin(0.5, 0).setDepth(510);
    makeButton(this, 20, H - 62, 124, 24, '가게 업그레이드', {
      fill: C.blue, depth: 510, onClick: () => {
        sfx.unlock();
        showShop(this, p, sfx, () => { Progress.save(); walletT.setText(walletLabel()); });
      },
    });
    makeButton(this, 150, H - 62, 70, 24, sfx.muted ? '소리 OFF' : '소리 ON', {
      fill: C.slate, depth: 510, onClick: () => {
        sfx.unlock();
        sfx.toggleMute();
        this.scene.restart();
      },
    });
    const reset = txt(this, GAME_W / 2, H - 32, '진행 초기화', { font: FONT.small, size: 8, color: CSS.gray }).setOrigin(0.5, 0).setDepth(510).setInteractive();
    reset.on('pointerdown', () => showConfirm(this, '지갑·별·업그레이드·히든\n기록을 모두 지울까요?', '지우기', () => { Progress.reset(); this.scene.restart(); }));
    txt(this, GAME_W / 2, H - 16, '완성품 탭 → 손님 탭 · 소리를 켜고 즐겨요', { font: FONT.small, size: 8, color: CSS.grayLt }).setOrigin(0.5, 0).setDepth(510);

    // 새로 열린 것 알림 (한 번)
    const news = p.news.filter((n) => NEWS_TEXT[n]);
    news.forEach((n, i) => this.time.delayedCall(500 + i * 2200, () => this.toast(NEWS_TEXT[n])));
    if (p.news.length) this.time.delayedCall(400, () => { p.news = []; Progress.save(); });

    this.input.once('pointerdown', () => sfx.unlock());
  }

  private go(c: Phaser.GameObjects.Container, stage: string) {
    sfx.unlock();
    sfx.click();
    bounce(this, c, 0.06);
    this.time.delayedCall(120, () => this.scene.start('Game', { stage }));
  }

  private toast(msg: string) {
    const t = txt(this, GAME_W / 2, -10, msg, { font: FONT.body, size: 10, color: CSS.yellow, stroke: CSS.black, strokeW: 3 }).setOrigin(0.5, 0).setDepth(900);
    if (t.width > GAME_W - 8) t.setScale((GAME_W - 8) / t.width);
    sfx.unlockJingle();
    this.tweens.add({ targets: t, y: 4, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1900, duration: 300, onComplete: () => t.destroy() });
  }
}
