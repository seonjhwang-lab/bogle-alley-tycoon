import Phaser from 'phaser';
import {
  C, CARD, COLS, COUNTER_FRONT_Y, CSS, CUSTOMER_TOP_Y, CUSTOMER_ZONE, FEVER, FONT, GAME_H, GAME_W, GRIDDLE_POS, HINT_STRIP, HINT_Y,
  LAYOUT, LEVER, MONEY_Y, POT_CELLS, CELL_W, CELL_H, PRICE, PROP, SERVE_Y, SLUSH_POS, STATION_POS, LEVER as LV,
} from '../config/constants';
import { MAX_DAY, stageOf, type DayConfig } from '../config/days';
import { Progress, type ProgressData } from '../systems/Progress';
import { sfx } from '../systems/sfx';
import { Kitchen } from '../systems/Kitchen';
import { PotState, type Cooked, type Pot } from '../systems/Pot';
import { Slush, SlushState, type SlushResult } from '../systems/Slush';
import { FrontBar, OdengState, TteokState } from '../systems/FrontBar';
import { Customers, isExact, type Customer, type ServeKind } from '../systems/Customers';
import { Hand, SERVE_KIND, type Held } from '../systems/Hand';
import { Cat } from '../systems/Cat';
import { Hud } from '../ui/Hud';
import { Tutorial, type GuideStep } from '../ui/Tutorial';
import { showDayIntro, showPause, showReceipt, showShop, type DayStats } from '../ui/Popups';
import { showStory, STORY } from '../ui/StoryModal';
import { SIDE_LABEL } from '../ui/OrderCard';
import { drawBackdrop } from '../ui/Backdrop';
import { icon } from '../ui/Frames';
import { arc, bounce, burst, floatText, shake, sparkle, txt } from '../ui/Juice';

/** 가이드 말풍선 기준 위치 */
const PREP_GUIDE_Y = STATION_POS.board.y - 52;
const TOP_GUIDE_Y = CARD.y + CARD.h + 6;
const LOW_LEFT = { x: 64, y: POT_CELLS[2].y + 4 };

type Phase = 'story' | 'intro' | 'tutorial' | 'run' | 'end' | 'pause';

const IDLE_TIPS: Record<string, string> = {
  d1: '냄비 탭 → 완성 냄비 탭 → 손님 탭',
  d2: '재료 탭 → 냄비 탭 (끌어다 놓기도 OK)',
  d3: '컵·철판도 탭해서 들고 → 손님 탭',
  d4: '그릇이 떨어지기 전에 싱크대를 탭!',
  d5: '고양이가 오면 탭해서 쫓아내요!',
  h1: '세트 주문! 철판을 미리 데워 두세요',
  h2: '유도부원에겐 라면을 2번 서빙!',
  endless: '하트 3개를 지켜라! 피버로 한방',
};

const SERVE_LABEL: Record<ServeKind, string> = { ramen: '라면', ...SIDE_LABEL };

export class GameScene extends Phaser.Scene {
  private stageId = 'd1';
  private cfg!: DayConfig;
  private progress!: ProgressData;
  private maxStars = 3;
  private phase: Phase = 'intro';
  private prevPhase: Phase = 'run';
  private kitchen!: Kitchen;
  private slush!: Slush;
  private front!: FrontBar;
  private customers!: Customers;
  private hand!: Hand;
  private cat: Cat | null = null;
  private hud!: Hud;
  private tutorial!: Tutorial;
  private hintText!: Phaser.GameObjects.Text;
  private hintBg!: Phaser.GameObjects.Graphics;
  private feverFx!: Phaser.GameObjects.Graphics;
  private hintUntil = 0;

  revenue = 0;
  combo = 0;
  lives = 3;
  feverLeft = 0;
  private feverTotal = 0;
  stats: DayStats = GameScene.freshStats();
  timeLeft = 0;
  runElapsed = 0;
  private spawnIn = 0;
  private arcadeT = 0;
  private lastTickSec = -1;
  private tutKey = '';
  private tutServed = false;
  private tutCustomer: Customer | null = null;
  private hintsShown = new Set<string>();
  private guideUntil = 0;
  private pendingGuides: [string, GuideStep, number][] = [];
  private guideKey = '';

  constructor() {
    super('Game');
  }

  static freshStats(): DayStats {
    return { revenue: 0, ramen: 0, slush: 0, tteok: 0, odeng: 0, perfect: 0, tips: 0, missed: 0, mistakes: 0, bestCombo: 0, served: 0, fevers: 0, arcade: 0 };
  }

  init(data: { stage?: string; day?: number }) {
    this.stageId = stageOf(data.stage ?? data.day).id;
  }

  create() {
    this.cfg = stageOf(this.stageId);
    this.progress = Progress.get();
    this.maxStars = Progress.maxStars(this.progress);
    this.phase = 'intro';
    this.revenue = 0;
    this.combo = 0;
    this.lives = 3;
    this.feverLeft = 0;
    this.stats = GameScene.freshStats();
    this.timeLeft = this.cfg.durationSec * 1000;
    this.runElapsed = 0;
    this.spawnIn = 600;
    this.arcadeT = 0;
    this.tutKey = '';
    this.tutServed = false;
    this.tutCustomer = null;
    this.hintsShown = new Set();
    this.pendingGuides = [];
    this.guideKey = '';
    this.lastTickSec = -1;

    drawBackdrop(this);

    this.hintText = txt(this, GAME_W / 2, HINT_Y, '', { font: FONT.body, size: 10, color: CSS.cream, stroke: CSS.black, strokeW: 2 })
      .setOrigin(0.5, 0).setDepth(601);
    this.hintBg = this.add.graphics().setDepth(600);
    this.feverFx = this.add.graphics().setDepth(640);

    this.hud = new Hud(this, this.cfg, this.maxStars, () => this.pause());
    this.hud.setTime(this.cfg.durationSec, false);
    if (this.cfg.kind === 'endless') { this.hud.setLives(3); this.hud.setTime(0, false); }

    this.kitchen = new Kitchen(this, this.cfg, this.progress, sfx, {
      pressPot: (pot, p) => this.hand.press({ kind: 'pot', pot }, p),
      onToppingSelect: () => this.hand.cancel(),
      hint: (m, c, ms) => this.hint(m, c, ms),
      event: (name, data) => this.onEvent(name, data),
    });
    this.slush = new Slush(this, sfx, {
      press: (p) => this.hand.press({ kind: 'slush' }, p),
      hint: (m, c) => this.hint(m, c),
      event: (n) => this.onEvent(n),
    }, this.cfg.slush);
    this.front = new FrontBar(this, this.cfg, this.progress, sfx, {
      press: (kind, p) => this.hand.press({ kind }, p),
      hint: (m, c, ms) => this.hint(m, c, ms),
      event: (n) => this.onEvent(n),
    });
    this.customers = new Customers(this, this.cfg, sfx);
    if (this.progress.upgrades.arcade) this.customers.patienceScale = PROP.arcadePatience;
    this.customers.on('arrive', (c: Customer) => this.onArrive(c));
    this.customers.on('complete', (c: Customer) => this.onComplete(c));
    this.customers.on('angry', (c: Customer) => this.onAngry(c));
    this.customers.on('eaten', (c: Customer) => {
      if (this.cfg.dishes && c.spec.ramen > 0) for (let i = 0; i < c.spec.ramen; i++) this.time.delayedCall(i * 250, () => this.kitchen.returnDirty(COLS[c.slot], COUNTER_FRONT_Y + 5));
    });
    this.customers.on('tap', (_slot: number, c: Customer | null) => this.onCustomerTap(c));
    this.events.on('hand-drop', (slot: number) => this.hand.tapCustomer(this.customers.slots[slot]));

    this.hand = new Hand(this, sfx, {
      valid: (h) => this.heldValid(h),
      deliver: (h, c) => this.deliver(h, c),
      visual: (h, on) => this.heldVisual(h, on),
      picked: (h) => this.onPicked(h),
      hint: (m, c, ms) => this.hint(m, c, ms),
    });

    if (this.cfg.cat) {
      this.cat = new Cat(this, this.kitchen, sfx,
        (amount, what) => {
          if (what === 'gold') this.addRevenue(-amount, null);
          this.hint(what === 'gold' ? '고양이가 매출을 훔쳐갔어요!' : '고양이가 썬 대파를 먹었어요!', CSS.red);
        },
        () => this.addRevenue(5, null));
    } else this.cat = null;
    this.tutorial = new Tutorial(this, () => this.finishTutorial(true));

    if (this.cfg.delayedBurner) this.kitchen.pots[this.cfg.delayedBurner.index].setLockLabel(`${this.cfg.delayedBurner.afterSec}초 뒤`);

    this.input.on('pointerdown', () => sfx.unlock());
    (window as unknown as { __bogle: GameScene }).__bogle = this;
    (window as unknown as { __layout: unknown }).__layout = {
      W: GAME_W, H: GAME_H,
      pots: POT_CELLS.map((c) => [c.x + 30, c.y + 39]),
      trash: POT_CELLS.map((c) => [c.x + CELL_W - 10, c.y + CELL_H - 10]),
      st: Object.fromEntries(Object.entries(STATION_POS).map(([k, v]) => [k, [v.x + 28, v.y + 22]])),
      lever: { x: LEVER.x, top: LEVER.top, bottom: LEVER.bottom }, cup: [this.slush.cupAt.x, this.slush.cupAt.y],
      cupTrash: [141, SLUSH_POS.y + 70],
      slots: COLS.map((x) => [x, Math.round(CARD.y + CARD.h / 2)]),
      slotsBody: COLS.map((x) => [x, CUSTOMER_TOP_Y + 16]),
      griddle: [this.front.tteokAt.x, this.front.tteokAt.y], ladle: [this.front.ladleAt.x, this.front.ladleAt.y],
      odeng: [this.front.odengAt.x, this.front.odengAt.y],
      front: { y: LAYOUT.front.y, h: LAYOUT.front.h }, zone: CUSTOMER_ZONE,
      empty: [128, POT_CELLS[0].y + CELL_H - 2],
      center: [GAME_W / 2, Math.round(GAME_H / 2)],
    };

    // 스토리(처음 한 번) → 스테이지 안내 → 영업
    const storyKey = this.cfg.id;
    if (STORY[storyKey] && !this.progress.story.includes(storyKey)) {
      this.phase = 'story';
      showStory(this, storyKey, sfx, () => {
        this.progress.story.push(storyKey);
        Progress.save();
        this.phase = 'intro';
        showDayIntro(this, this.cfg, sfx, () => this.afterIntro());
      });
    } else {
      showDayIntro(this, this.cfg, sfx, () => this.afterIntro());
    }
  }

  // ─── 흐름 ────────────────────────────────────────────────────
  private afterIntro() {
    if (this.cfg.day === 1 && !this.progress.tutorialDone) this.beginTutorial();
    else this.beginRun();
  }

  private beginTutorial() {
    this.phase = 'tutorial';
    const p0 = this.kitchen.pots[0];
    p0.unlock(false);
    p0.noBurn = true;
    this.kitchen.pots[1].setLockLabel('튜토리얼 후');
    this.customers.frozen = true;
    this.tutCustomer = this.customers.spawn({ ramen: 1, toppings: [], slush: false, tteok: false, odeng: false }, 1);
    this.hint('튜토리얼: 손가락을 따라 해 보세요', CSS.yellow, 99999);
  }

  private finishTutorial(skipped = false) {
    if (this.phase !== 'tutorial') return;
    this.tutorial.clear();
    this.progress.tutorialDone = true;
    Progress.save();
    this.kitchen.pots[0].noBurn = false;
    this.customers.frozen = false;
    if (!skipped) {
      this.tutorial.show({ text: '잘했어요! 이제 진짜 영업 시작!\n완성 냄비 → 손님, 잊지 마세요', dim: false, at: { x: GAME_W / 2, y: LAYOUT.kitchen.y + 30 } });
      this.time.delayedCall(1800, () => this.tutorial.clear());
    }
    this.hint('', CSS.cream, 0);
    this.beginRun();
  }

  private beginRun() {
    this.phase = 'run';
    const delayed = this.cfg.delayedBurner?.index;
    this.kitchen.openBurners(delayed);
    if (delayed !== undefined) this.kitchen.pots[delayed].setLockLabel(`${this.cfg.delayedBurner!.afterSec}초 뒤`);
    this.spawnIn = this.customers.count() ? 2500 : 500;
    sfx.bell();
    if (this.cfg.day === 3) this.time.delayedCall(400, () => this.leverGuide('slush-intro'));
  }

  private endStage() {
    this.phase = 'end';
    this.tutorial.clear();
    this.hand.cancel();
    this.kitchen.cancelHold();
    sfx.whistle();
    this.customers.closeShop();
    this.slush.stop();
    this.cat?.leave();
    this.feverLeft = 0;
    this.hud.setFever(0);
    this.feverFx.clear();
    this.hint('', CSS.cream, 0);
    const endless = this.cfg.kind === 'endless';
    const banner = txt(this, GAME_W / 2, Math.round(GAME_H / 2), endless ? '영업 끝!' : '영업 종료!', { font: FONT.bold, size: 12, color: CSS.yellow, stroke: CSS.redDk, strokeW: 3 })
      .setOrigin(0.5).setDepth(1900).setScale(0.3);
    this.tweens.add({ targets: banner, scale: 3, duration: 380, ease: 'Back.Out' });
    shake(this, 0.006, 200);

    this.stats.revenue = this.revenue;
    const p = this.progress;
    p.wallet += this.revenue;
    let stars = 0, cleared = false, bonus = 0, record = false;
    const news: string[] = [];
    if (this.cfg.kind === 'day') {
      stars = Math.min(this.maxStars, this.cfg.stars.filter((s) => this.revenue >= s).length);
      const i = this.cfg.day - 1;
      p.best[i] = Math.max(p.best[i], stars);
      p.bestRevenue[i] = Math.max(p.bestRevenue[i], this.revenue);
      if (stars >= 1) p.unlocked = Math.max(p.unlocked, Math.min(MAX_DAY, this.cfg.day + 1));
      const before = [p.h1Unlocked, p.h2Unlocked];
      Progress.refreshUnlocks();
      if (!before[0] && p.h1Unlocked) news.push('히든 스테이지 「여고생 군단」 해금!');
      if (!before[1] && p.h2Unlocked) news.push('히든 스테이지 「유도부 강습」 해금!');
    } else if (this.cfg.kind === 'hidden') {
      cleared = this.revenue >= this.cfg.stars[0];
      const key = this.cfg.id as 'h1' | 'h2';
      record = this.revenue > p.hiddenBest[key];
      p.hiddenBest[key] = Math.max(p.hiddenBest[key], this.revenue);
      if (cleared && key === 'h1' && !p.h1Cleared) {
        p.h1Cleared = true;
        bonus = 500;
        p.wallet += bonus;
        p.news.push('star4');
        news.push('★★★★ 별 4개 도전 등급 해금!');
      }
      if (cleared && key === 'h2' && !p.h2Cleared) {
        p.h2Cleared = true;
        p.endlessUnlocked = true;
        p.news.push('star5', 'endless');
        news.push('★★★★★ 전설의 맛집 등급 해금!', '무한 리필 서바이벌 해금!');
      }
    } else {
      record = this.revenue > p.endlessBest.revenue;
      if (record) p.endlessBest = { revenue: this.revenue, served: this.stats.served };
    }
    Progress.save();
    (window as unknown as { __lastResult: unknown }).__lastResult = { stage: this.cfg.id, day: this.cfg.day, stars, cleared, bonus, record, ...this.stats };

    this.time.delayedCall(1500, () => {
      banner.destroy();
      const canNext = this.cfg.kind === 'day' && stars >= 1 && this.cfg.day < MAX_DAY;
      showReceipt(this, this.cfg, this.stats, { stars, maxStars: this.maxStars, cleared, bonus, record, news }, p, sfx, {
        next: canNext ? () => this.scene.restart({ stage: `d${this.cfg.day + 1}` }) : undefined,
        retry: () => this.scene.restart({ stage: this.cfg.id }),
        title: () => this.scene.start('Title'),
        shop: () => showShop(this, p, sfx, () => Progress.save()),
      });
    });
  }

  private pause() {
    if (this.phase !== 'run' && this.phase !== 'tutorial') return;
    this.prevPhase = this.phase;
    this.phase = 'pause';
    this.tweens.pauseAll();
    this.time.paused = true;
    sfx.click();
    showPause(this, sfx, {
      resume: () => { this.time.paused = false; this.tweens.resumeAll(); this.phase = this.prevPhase; },
      retry: () => { this.time.paused = false; this.scene.restart({ stage: this.cfg.id }); },
      title: () => { this.time.paused = false; this.scene.start('Title'); },
    });
  }

  // ─── 안내 줄 ─────────────────────────────────────────────────
  hint(msg: string, color: string = CSS.cream, ms = 1600) {
    this.hintText.setText(msg).setColor(color);
    this.hintUntil = this.time.now + ms;
    if (msg) bounce(this, this.hintText, 0.12);
  }

  private drawHintBg() {
    const g = this.hintBg;
    g.clear();
    if (HINT_STRIP || !this.hintText.text) return;
    const w = Math.min(GAME_W - 4, Math.ceil(this.hintText.width) + 10);
    g.fillStyle(C.black, 0.85).fillRect(Math.round(GAME_W / 2 - w / 2), HINT_Y - 2, w, 15);
  }

  /** 슬러시 레버: 위→아래로 미는 손가락 가이드 (Day 3 시작 + Day 3 첫 슬러시 주문) */
  private leverGuide(key: 'slush' | 'slush-intro' = 'slush') {
    if (this.phase !== 'run' || this.cfg.day !== 3 || this.hintsShown.has(key) || this.slush.state !== SlushState.IDLE) return;
    if (key === 'slush' && this.guideKey === 'slush') return;
    this.hintsShown.add(key);
    const text = key === 'slush-intro'
      ? '새 기계: 슬러시!\n오른쪽 빨간 레버를\n아래로 당기세요\n깊이 당길수록 빨라요'
      : '슬러시 주문!\n레버를 당기고\n게이지가 초록일 때\n손을 떼세요';
    this.tutorial.show({ swipe: { x: LV.x, y1: LV.top + 2, y2: LV.bottom }, text, at: LOW_LEFT, dim: false });
    this.guideKey = 'slush';
    this.guideUntil = this.time.now + (key === 'slush-intro' ? 6000 : 5000);
  }

  // ─── 매출 · 피버 ─────────────────────────────────────────────
  get mult() {
    return (1 + 0.1 * Math.min(this.combo, 5)) * (this.feverLeft > 0 ? FEVER.mult : 1);
  }

  private addRevenue(v: number, at: { x: number; y: number } | null, label?: string, color: string = CSS.yellow, big = false) {
    this.revenue = Math.max(0, this.revenue + v);
    this.hud.setRevenue(this.revenue);
    if (at) floatText(this, at.x, at.y, label ?? `${v >= 0 ? '+' : ''}${v}G`, color, big);
  }

  private startFever() {
    this.feverTotal = FEVER.ms + (this.progress.upgrades.tv ? PROP.tvFeverMs : 0);
    this.feverLeft = this.feverTotal;
    this.stats.fevers++;
    sfx.fanfare();
    shake(this, 0.006, 160);
    const t = txt(this, GAME_W / 2, LAYOUT.kitchen.y - 4, 'FEVER TIME!', { font: FONT.bold, size: 12, color: CSS.yellow, stroke: CSS.redDk, strokeW: 3 })
      .setOrigin(0.5).setDepth(1900).setScale(0.5);
    this.tweens.add({ targets: t, scale: 2, duration: 300, ease: 'Back.Out', yoyo: true, hold: 500, onComplete: () => t.destroy() });
    this.hint(`피버! ${Math.round(this.feverTotal / 1000)}초 동안 매출 x${FEVER.mult}`, CSS.pink, 2000);
  }

  private drawFever() {
    const g = this.feverFx;
    g.clear();
    this.hud.setFever(this.feverLeft);
    if (this.feverLeft <= 0) return;
    const on = Math.floor(this.time.now / 140) % 2;
    const col = on ? C.hotPink : C.yellow;
    g.fillStyle(col, 0.85).fillRect(0, LAYOUT.hud.h, 2, GAME_H).fillRect(GAME_W - 2, LAYOUT.hud.h, 2, GAME_H);
    const p = this.feverLeft / this.feverTotal;
    g.fillStyle(C.hotPink).fillRect(0, LAYOUT.hud.h, Math.round(GAME_W * p), 2);
  }

  // ─── 손(선택) ───────────────────────────────────────────────
  private heldValid(h: Held) {
    switch (h.kind) {
      case 'pot': return !!h.pot && h.pot.state === PotState.READY;
      case 'slush': return this.slush.cupReady;
      case 'tteok': return this.front.tteokServable;
      case 'odeng': return this.front.odengServable;
    }
  }

  private heldVisual(h: Held, on: boolean) {
    if (h.kind === 'pot') h.pot?.setHeld(on);
    else if (h.kind === 'slush') this.slush.setHeld(on);
    else this.front.setHeld(on ? h.kind : null);
    if (h.kind === 'pot' && h.pot && on) {
      const cooked: Cooked = { toppings: h.pot.toppings, noodle: h.pot.noodle ?? 'good' };
      this.customers.showTargets('ramen', cooked);
    } else this.customers.showTargets(on ? SERVE_KIND[h.kind] : null);
  }

  private onPicked(h: Held) {
    this.kitchen.cancelHold();
    const kind = SERVE_KIND[h.kind];
    this.onEvent(`picked-${h.kind}`);
    if (!this.customers.anyWants(kind)) {
      this.hint(`지금 ${SERVE_LABEL[kind]}을(를) 기다리는 손님이 없어요`, CSS.grayLt, 2000);
      return;
    }
    // 새 메뉴가 나오는 날에는 '2. 손님 탭' 가이드를 한 번
    const intro: Record<ServeKind, number> = { ramen: 1, slush: 3, tteok: 3, odeng: 4 };
    if (this.phase === 'run' && (this.cfg.feat === intro[kind] || (this.cfg.special === 'judo' && kind === 'ramen'))) {
      const c = this.customers.waiting.find((x) => this.customers.wants(x, kind));
      if (c) this.guide(`target-${kind}`, {
        finger: { x: COLS[c.slot], y: CUSTOMER_TOP_Y + 18 }, text: '2. 전달할 손님을 탭하세요!\n(카드를 탭해도 돼요)', at: LOW_LEFT, dim: false,
      }, true);
    }
  }

  private onCustomerTap(c: Customer | null) {
    if (this.phase !== 'run' && this.phase !== 'tutorial') return;
    if (this.hand.held) { this.hand.tapCustomer(c); return; }
    if (this.kitchen.held) { this.hint('재료는 냄비에 넣어요! 냄비를 탭', CSS.yellow); return; }
    if (c && c.state === 'wait') this.hint('완성된 음식을 먼저 탭해서 들고 오세요', CSS.grayLt);
  }

  /** 손에 든 것을 이 손님에게 — 성공하면 true */
  private deliver(h: Held, c: Customer): boolean {
    if (this.phase !== 'run' && this.phase !== 'tutorial') return false;
    const kind = SERVE_KIND[h.kind];
    if (!this.customers.wants(c, kind)) {
      sfx.error();
      c.card.shake();
      this.hint(c.state === 'wait' ? `이 손님은 ${SERVE_LABEL[kind]}을(를) 기다리지 않아요` : '아직 주문 전이에요', CSS.orange);
      return false;
    }
    const to = { x: COLS[c.slot], y: SERVE_Y };
    switch (h.kind) {
      case 'pot': {
        const pot = h.pot!;
        if (!this.kitchen.hasCleanBowl()) {
          sfx.error();
          this.hint('깨끗한 그릇이 없어요! 싱크대를 탭!', CSS.red, 2200);
          this.kitchen.flashSink();
          this.guide('sink-empty', { finger: { x: STATION_POS.sink.x + 28, y: STATION_POS.sink.y + 20 }, text: '싱크대를 탭해서\n그릇을 닦아요!', at: { x: 150, y: PREP_GUIDE_Y }, dim: false }, true);
          return false;
        }
        const exact = isExact(c.spec, { toppings: pot.toppings, noodle: pot.noodle ?? 'good' });
        c.ramenPending++;
        const cooked = pot.take();
        if (!cooked) { c.ramenPending--; return false; }
        this.kitchen.useBowl();
        this.fly('ui_bowl', pot.cx, pot.cy - 8, to, () => this.onRamenArrive(c, cooked, exact));
        break;
      }
      case 'slush': {
        const r = this.slush.takeCup();
        if (!r) return false;
        c.side.slush.pending = true;
        this.fly('ui_slush', this.slush.cupAt.x, this.slush.cupAt.y, to, () => this.onSideArrive(c, 'slush', r));
        break;
      }
      case 'tteok': {
        if (!this.front.takeTteok()) return false;
        c.side.tteok.pending = true;
        this.fly('ui_tteok', this.front.tteokAt.x, this.front.tteokAt.y, to, () => this.onSideArrive(c, 'tteok'));
        break;
      }
      case 'odeng': {
        if (!this.front.takeOdeng()) return false;
        c.side.odeng.pending = true;
        this.fly('ui_odeng', this.front.odengAt.x, this.front.odengAt.y, to, () => this.onSideArrive(c, 'odeng'));
        break;
      }
    }
    this.onEvent(`served-${kind}`);
    return true;
  }

  private fly(tag: string, x: number, y: number, to: { x: number; y: number }, done: () => void) {
    const o = icon(this, x, y, tag).setScale(2).setDepth(1800);
    sfx.whoosh();
    arc(this, o, to.x, to.y, 420, () => { o.destroy(); done(); }, 30);
  }

  private onRamenArrive(c: Customer, cooked: Cooked, exact: boolean) {
    if (c.state !== 'wait') { c.ramenPending = Math.max(0, c.ramenPending - 1); return; }
    const at = { x: COLS[c.slot], y: MONEY_Y };
    let pay: number;
    if (exact) {
      pay = PRICE.ramen + PRICE.topping * cooked.toppings.size + (cooked.noodle === 'perfect' ? PRICE.perfectNoodle : 0);
    } else {
      pay = Math.round(PRICE.ramen * 0.5);
      this.stats.mistakes++;
    }
    pay = Math.round(pay * this.mult);
    this.stats.ramen++;
    if (exact && cooked.noodle === 'perfect') this.stats.perfect++;
    c.earned += pay;
    this.addRevenue(pay, at, exact ? (cooked.noodle === 'perfect' ? `PERFECT +${pay}G` : `+${pay}G`) : `실수! +${pay}G`, exact ? CSS.yellow : CSS.orange, exact && cooked.noodle === 'perfect');
    sfx.coin();
    burst(this, at.x, at.y + 10, [C.yellow, C.gold, C.white], 10, 50);
    if (!exact) shake(this, 0.003, 80);
    this.customers.deliverRamen(c, exact);
    if (this.phase === 'tutorial' && c === this.tutCustomer) this.tutServed = true;
  }

  private onSideArrive(c: Customer, kind: 'slush' | 'tteok' | 'odeng', r?: SlushResult) {
    if (c.state !== 'wait') { c.side[kind].pending = false; return; }
    let pay = kind === 'slush' ? PRICE.slush * (r?.quality ?? 1) + (r?.perfect ? PRICE.slushPerfect : 0) : kind === 'tteok' ? PRICE.tteok : PRICE.odeng;
    pay = Math.round(pay * this.mult);
    this.stats[kind]++;
    if (r?.perfect) this.stats.perfect++;
    c.earned += pay;
    const label = kind === 'slush' && r?.perfect ? `시원~ +${pay}G` : kind === 'tteok' ? `매콤 +${pay}G` : kind === 'odeng' ? `따끈 +${pay}G` : `+${pay}G`;
    this.addRevenue(pay, { x: COLS[c.slot], y: MONEY_Y }, label, kind === 'slush' ? CSS.cyan : kind === 'tteok' ? CSS.pink : CSS.yellow, !!r?.perfect);
    sfx.coin();
    this.customers.deliverSide(c, kind, !!r?.perfect);
  }

  // ─── 손님 이벤트 ─────────────────────────────────────────────
  private onArrive(c: Customer) {
    if (this.phase !== 'run') return;
    const sp = c.spec;
    if (sp.toppings.includes('scallion') && !this.kitchen.scallionReady) {
      this.guide('scallion', {
        finger: { x: STATION_POS.board.x + 28, y: STATION_POS.board.y + 22 },
        text: `대파 주문! 도마를 ${this.kitchen.chopsNeeded}번 탭해\n썰어 두세요`, at: { x: 70, y: PREP_GUIDE_Y }, dim: false,
      });
    } else if (sp.toppings.includes('egg')) {
      this.guide('egg', {
        finger: { x: STATION_POS.egg.x + 28, y: STATION_POS.egg.y + 22 },
        text: '면이 익는 동안\n1. 계란 바구니를 탭!\n2. 넣을 냄비를 탭!', at: { x: 100, y: PREP_GUIDE_Y - 12 }, dim: false,
      });
    } else if (sp.toppings.includes('cheese')) {
      this.guide('cheese', {
        finger: { x: STATION_POS.cheese.x + 28, y: STATION_POS.cheese.y + 22 },
        text: '치즈 주문!\n1. 치즈 탭 → 2. 냄비 탭', at: { x: 150, y: PREP_GUIDE_Y }, dim: false,
      });
    }
    if (sp.slush) this.leverGuide();
    if (sp.tteok && this.cfg.feat === 3) {
      if (this.front.tteok === TteokState.GLOSSY) this.tteokServeGuide();
    }
    if (sp.odeng && this.cfg.feat === 4 && this.front.odeng === OdengState.EMPTY) {
      this.guide('odeng', {
        finger: { x: this.front.odengAt.x, y: this.front.odengAt.y }, text: '어묵 주문!\n빈 어묵탕을 탭하면\n꼬치 3개가 익어요 (2.5초)', at: { x: 176, y: TOP_GUIDE_Y }, dim: false,
      });
    }
  }

  private tteokServeGuide() {
    this.guide('tteok', {
      finger: { x: this.front.tteokAt.x, y: this.front.tteokAt.y }, text: '떡볶이 주문!\n1. 윤기 나는 철판을 탭\n2. 떡볶이 손님을 탭', at: { x: 64, y: TOP_GUIDE_Y }, dim: false,
    });
  }

  private onComplete(c: Customer) {
    this.stats.served++;
    let tip = PRICE.tipMax * Math.max(0, c.patience) * this.mult * (this.progress.upgrades.tv ? PROP.tvTipMult : 1);
    const king = c.kind === 'judo' && c.spec.ramen >= 2;
    if (king) tip *= PRICE.judoTipMult;
    tip = Math.round(tip);
    if (tip > 0) {
      this.stats.tips += tip;
      this.time.delayedCall(260, () => this.addRevenue(tip, { x: COLS[c.slot], y: MONEY_Y - 12 }, king ? `왕팁! +${tip}G` : `팁 +${tip}G`, CSS.pink, king));
      if (king) this.time.delayedCall(260, () => sparkle(this, COLS[c.slot], MONEY_Y));
    }
    if (c.mistake) this.combo = 0;
    else {
      this.combo++;
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
      if (this.combo % FEVER.every === 0) this.startFever();
    }
    this.hud.setCombo(this.mult, this.combo);
  }

  private onAngry(c: Customer) {
    this.stats.missed++;
    this.combo = 0;
    this.hud.setCombo(this.mult, this.combo);
    this.addRevenue(-PRICE.missPenalty, { x: COLS[c.slot], y: MONEY_Y }, `-${PRICE.missPenalty}G`, CSS.red);
    shake(this, 0.005, 140);
    if (this.cfg.kind === 'endless' && this.phase === 'run') {
      this.lives--;
      this.hud.setLives(this.lives);
      sfx.lifeLost();
      if (this.lives <= 0) this.endStage();
      else this.hint(`손님을 놓쳤어요! 남은 하트 ${this.lives}개`, CSS.red, 1800);
    }
  }

  // ─── 이벤트 (튜토리얼·힌트) ──────────────────────────────────
  /** 가이드 키 → 그 가이드를 닫는 이벤트들 */
  private static GUIDE_DONE: Record<string, string[]> = {
    scallion: ['scallion-ready'], hold: ['topping'], egg: ['hold', 'topping'], cheese: ['hold', 'topping'],
    dirty: ['washed'], 'sink-empty': ['washed'], slush: ['slush-pull'], cup: ['picked-slush', 'slush-discard'],
    tteok: ['picked-tteok'], stir: ['tteok-stir'], odeng: ['odeng-start'], 'odeng-serve': ['picked-odeng'],
    'target-ramen': ['served-ramen'], 'target-slush': ['served-slush'], 'target-tteok': ['served-tteok'], 'target-odeng': ['served-odeng'],
    burnt: ['pot'],
  };

  private onEvent(name: string, data?: unknown) {
    if (name === 'hold') {
      const pots = this.kitchen.eligible(data as never);
      if (pots.length) this.guide('hold', { finger: { x: pots[0].cx, y: pots[0].cy }, text: '2. 넣을 냄비를 탭하세요!\n(끌어다 놓아도 돼요)', at: { x: 120, y: TOP_GUIDE_Y }, dim: false }, true);
    }
    if (name === 'dirty') {
      this.guide('dirty', { finger: { x: STATION_POS.sink.x + 28, y: STATION_POS.sink.y + 20 }, text: '빈 그릇이 왔어요!\n싱크대를 3번 탭해 닦기', at: { x: 150, y: PREP_GUIDE_Y }, dim: false });
    }
    if (name === 'pot') {
      const { pot } = data as { pot: Pot };
      if (pot.state === PotState.BURNT) {
        this.combo = 0;
        this.hud.setCombo(this.mult, 0);
        this.guide('burnt', { finger: { x: pot.cx, y: pot.cy }, text: '탄 냄비는 3번 탭해서 닦아요', at: { x: 120, y: TOP_GUIDE_Y }, dim: false });
      }
    }
    if (name === 'slush-pull') {
      this.hintsShown.add('slush');
      this.hintsShown.add('slush-intro');
    }
    if (name === 'slush-cup' && this.cfg.feat <= 3) {
      this.guide('cup', { finger: { x: this.slush.cupAt.x, y: this.slush.cupAt.y }, text: '슬러시 완성!\n1. 완성된 컵을 탭하세요!\n2. 슬러시 손님을 탭!', at: LOW_LEFT, dim: false }, true);
    }
    if (name === 'tteok-ready' && this.cfg.feat === 3 && this.customers.anyWants('tteok')) this.tteokServeGuide();
    if (name === 'tteok-sticky') {
      this.guide('stir', {
        hswipe: { y: this.front.tteokAt.y + 2, x1: GRIDDLE_POS.x + 14, x2: GRIDDLE_POS.x + 46, label: '좌우로 문질러!' },
        text: '떡볶이가 졸아붙어요!\n철판을 좌우로 문지르거나\n노란 국자 버튼을 탭해 저어요', at: { x: 120, y: TOP_GUIDE_Y }, dim: false,
      }, true);
    }
    if (name === 'odeng-ready' && this.cfg.feat === 4) {
      this.guide('odeng-serve', { finger: { x: this.front.odengAt.x, y: this.front.odengAt.y }, text: '어묵 완성!\n1. 어묵탕을 탭\n2. 어묵 손님을 탭', at: { x: 176, y: TOP_GUIDE_Y }, dim: false });
    }
    if (this.guideKey && GameScene.GUIDE_DONE[this.guideKey]?.includes(name)) {
      if (this.guideKey === 'burnt') {
        const { pot } = (data ?? {}) as { pot?: Pot };
        if (!pot || pot.state === PotState.BURNT) return;
      }
      this.tutorial.clear();
      this.guideKey = '';
    }
    // 대기 중인 가이드가 이미 해결됐으면 버린다
    this.pendingGuides = this.pendingGuides.filter(([k]) => !GameScene.GUIDE_DONE[k]?.includes(name));
  }

  /** 한 번만 보여주는 가벼운 힌트. 다른 가이드가 떠 있으면 대기열 (urgent = 바로 교체) */
  private guide(key: string, step: GuideStep, urgent = false) {
    if (this.phase !== 'run' || this.hintsShown.has(key)) return;
    if (this.guideKey && (!urgent || this.guideKey === 'slush')) {
      if (this.guideKey !== key && !this.pendingGuides.some(([k]) => k === key)) this.pendingGuides.push([key, step, urgent ? 1 : 0]);
      return;
    }
    this.hintsShown.add(key);
    this.tutorial.show(step);
    this.guideKey = key;
    this.guideUntil = this.time.now + (urgent ? 5000 : 4000);
  }

  // ─── 튜토리얼 단계 (냄비 1번 상태로 결정) ──────────────────────
  private updateTutorial() {
    const p0 = this.kitchen.pots[0];
    let key = '';
    if (this.tutServed) key = 'done';
    else if (p0.state === PotState.EMPTY) key = 'pour';
    else if (p0.state === PotState.HEATING) key = 'wait-boil';
    else if (p0.state === PotState.BOILING) key = 'noodle';
    else if (p0.state === PotState.SIMMERING) key = 'wait-cook';
    else if (p0.state === PotState.READY) key = p0.held ? 'serve-target' : 'serve';
    else if (p0.state === PotState.BURNT) key = 'scrub';
    if (key === this.tutKey) return;
    this.tutKey = key;
    const cell = POT_CELLS[0];
    const spot = { x: cell.x, y: cell.y, w: CELL_W, h: CELL_H };
    const finger = { x: p0.cx, y: p0.cy };
    const at = { x: 150, y: POT_CELLS[2].y + 4 };
    switch (key) {
      case 'pour':
        this.tutorial.show({ spot, finger, text: 'STEP 1\n빈 냄비를 탭해\n물을 부으세요!', at, skippable: true });
        break;
      case 'wait-boil':
        this.tutorial.show({ spot: { x: cell.x, y: cell.y, w: CELL_W, h: 18 }, text: '물이 데워지는 중…\n게이지가 초록색이 되면\n보글보글 끓어요!', at, skippable: true });
        break;
      case 'noodle':
        this.tutorial.show({ spot, finger, text: 'STEP 2\n보글보글! 지금 냄비를\n다시 탭해 면을 넣으세요!', at, skippable: true });
        break;
      case 'wait-cook':
        this.tutorial.show({ spot, text: '면이 익는 중…\n(3.5초)', at, skippable: true });
        break;
      case 'serve':
        this.tutorial.show({ spot, finger, text: 'STEP 3 서빙\n1. 완성된 냄비를 탭하세요!\n(초록 테두리 = 들었어요)', at, skippable: true });
        break;
      case 'serve-target': {
        const s = this.tutCustomer?.slot ?? 1;
        this.tutorial.show({
          spot: { x: COLS[s] - CUSTOMER_ZONE.w / 2, y: CUSTOMER_ZONE.y, w: CUSTOMER_ZONE.w, h: CUSTOMER_ZONE.h },
          finger: { x: COLS[s], y: CUSTOMER_TOP_Y + 18 },
          text: 'STEP 3 서빙\n2. 전달할 손님을 탭하세요!\n(주문 카드를 탭해도 OK)', at, skippable: true,
        });
        break;
      }
      case 'scrub':
        this.tutorial.show({ spot, finger, text: '앗, 탔어요!\n냄비를 3번 탭해 닦아요', at, skippable: true });
        break;
      case 'done':
        this.finishTutorial(false);
        break;
    }
  }

  // ─── 매 프레임 ───────────────────────────────────────────────
  update(_t: number, delta: number) {
    const speed = (window as unknown as { __speed?: number }).__speed ?? 1;
    this.tweens.timeScale = speed;
    this.time.timeScale = speed;
    this.anims.globalTimeScale = speed;
    const dt = Math.min(delta, 60) * speed;
    const now = this.time.now;

    const live = this.phase === 'run' || this.phase === 'tutorial';
    this.kitchen.enabled = live;
    this.slush.enabled = live;
    this.front.enabled = live;
    const gained = this.hud.update();
    if (gained > 0 && this.cfg.kind === 'day') {
      sfx.star(Math.max(0, Math.min(2, this.cfg.stars.filter((s) => this.revenue >= s).length - 1)));
      floatText(this, GAME_W / 2, 44, '별 획득!', CSS.yellow, true);
    } else if (gained > 0 && this.cfg.kind === 'hidden') {
      sfx.fanfare();
      floatText(this, GAME_W / 2, 44, '목표 달성! 클리어 확정', CSS.pink, true);
    }
    this.tutorial.update(now);
    if (this.hintText.text && now > this.hintUntil) this.hintText.setText('');
    if (HINT_STRIP && !this.hintText.text && this.phase === 'run') this.hintText.setText(IDLE_TIPS[this.cfg.id] ?? '').setColor(CSS.grayLt);
    this.drawHintBg();
    if (this.guideKey && now > this.guideUntil) {
      this.tutorial.clear();
      this.guideKey = '';
    }
    if (!this.guideKey && this.pendingGuides.length && this.phase === 'run') {
      const [k, step, urgent] = this.pendingGuides.shift()!;
      this.guide(k, step, !!urgent);
    }

    if (!live) return;

    this.kitchen.update(dt, now);
    this.slush.update(dt);
    this.front.update(dt);
    this.customers.update(dt, now);
    this.hand.update();
    if (!this.hand.held) this.customers.highlightFor(this.kitchen.readyCooked());

    if (this.phase === 'tutorial') {
      this.updateTutorial();
      return;
    }

    // 피버
    if (this.feverLeft > 0) this.feverLeft = Math.max(0, this.feverLeft - dt);
    this.drawFever();

    // 미니 오락기: 8초마다 +15G
    if (this.front.hasArcade) {
      this.arcadeT += dt;
      if (this.arcadeT >= PROP.arcadeCoinMs) {
        this.arcadeT = 0;
        const at = this.front.arcadeCoin();
        if (at) {
          this.stats.arcade += PROP.arcadeCoin;
          this.addRevenue(PROP.arcadeCoin, at, `+${PROP.arcadeCoin}G`, CSS.yellow);
          sfx.coin();
        }
      }
    }

    // 영업 시간 (무한 모드는 경과 시간)
    this.runElapsed += dt;
    const endless = this.cfg.kind === 'endless';
    if (endless) {
      this.hud.setTime(this.runElapsed / 1000, true);
      // 시간이 갈수록 손님이 빨리 오고, 인내심도 조금씩 짧아짐
      this.customers.patienceSec = this.cfg.patienceSec * Math.max(0.68, 1 - this.runElapsed / 420000);
    } else {
      this.timeLeft -= dt;
      this.hud.setTime(this.timeLeft / 1000, true);
      const sec = Math.ceil(this.timeLeft / 1000);
      if (sec <= 10 && sec !== this.lastTickSec && sec > 0) {
        sfx.tick(sec <= 3);
        this.lastTickSec = sec;
      }
    }

    // 지연 화구
    const db = this.cfg.delayedBurner;
    if (db) {
      const pot = this.kitchen.pots[db.index];
      const remain = db.afterSec * 1000 - this.runElapsed;
      if (pot.state === PotState.LOCKED) {
        if (remain <= 0) {
          pot.unlock(true);
          sfx.unlockJingle();
          floatText(this, pot.cx, pot.cy - 20, `${db.index + 1}번 화구 가동!`, CSS.yellow, true);
        } else pot.setLockLabel(`${Math.ceil(remain / 1000)}초 뒤`);
      }
    }

    this.cat?.update(dt);

    // 손님 등장
    this.spawnIn -= dt;
    const burnersNow = this.kitchen.pots.filter((p) => p.active).length;
    const cap = Math.min(this.cfg.maxCustomers, this.cfg.day === 1 ? burnersNow : this.cfg.maxCustomers);
    if (this.customers.count() === 0) this.spawnIn = Math.min(this.spawnIn, 900);
    if (this.spawnIn <= 0 && (endless || this.timeLeft > 7000)) {
      if (this.customers.count() < cap && this.customers.spawn()) {
        const [a, b] = this.cfg.spawnSec;
        const k = endless ? Math.max(0.45, 1 - this.runElapsed / 240000) : 1;
        this.spawnIn = Phaser.Math.FloatBetween(a, b) * 1000 * k;
      } else {
        this.spawnIn = 700;
      }
    }

    if (!endless && this.timeLeft <= 0) this.endStage();
  }

  // 테스트·디버그용 접근자
  get debug() {
    return {
      kitchen: this.kitchen, customers: this.customers, slush: this.slush, front: this.front, hand: this.hand,
      phase: this.phase, cfg: this.cfg, cat: this.cat, tutorial: this.tutorial, guideKey: this.guideKey,
    };
  }
}
