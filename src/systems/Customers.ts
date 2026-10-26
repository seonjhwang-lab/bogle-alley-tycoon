import Phaser from 'phaser';
import {
  C, CARD, COLS, COUNTER_FRONT_Y, BUBBLE_Y, CSS, CUSTOMER_TOP_Y, CUSTOMER_ZONE, FONT, GAME_W, TOPPINGS, type Topping,
} from '../config/constants';
import type { DayConfig, PeepKind } from '../config/days';
import type { SoundManager } from './SoundManager';
import type { Cooked } from './Pot';
import { OrderCard, sidesOf, type OrderSpec, type SideKind } from '../ui/OrderCard';
import { icon } from '../ui/Frames';
import { bounce, drawBubble, txt } from '../ui/Juice';

const ARRIVE_LINES: Record<PeepKind, string[]> = {
  kid: ['배고파요!', '라면 주세요~', '떡볶이!'],
  girl: ['한 그릇이요!', '빨리요~', '슬러시도!'],
  teacher: ['든든하게!', '반숙으로!', '어이 사장!'],
  hsgirl: ['시험 끝~!', '세트 주세요!', '치즈 듬뿍!'],
  judo: ['두 그릇!!', '단백질!', '오스!'],
};

export interface Customer {
  id: number;
  slot: number;
  kind: PeepKind;
  spec: OrderSpec;
  /** 남은 라면 그릇 수 / 날아가는 중인 그릇 수 */
  ramenLeft: number;
  ramenPending: number;
  side: Record<SideKind, { done: boolean; pending: boolean }>;
  mistake: boolean;
  patience: number;
  state: 'enter' | 'wait' | 'eat' | 'leave';
  sprite: Phaser.GameObjects.Sprite;
  card: OrderCard;
  earned: number;
}

/** 손에 든 음식 종류 (수동 서빙 대상 판정용) */
export type ServeKind = 'ramen' | SideKind;

let nextId = 1;

function weightedPick(w: number[]) {
  const sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return i;
  }
  return w.length - 1;
}

function pickToppings(cfg: DayConfig, max = cfg.maxToppings): Topping[] {
  if (!cfg.toppings.length || max <= 0) return [];
  const weights = max >= 3 ? [1, 2, 3, 3] : [1, 3, 2].slice(0, max + 1);
  const n = weightedPick(weights);
  const pick = Phaser.Utils.Array.Shuffle([...cfg.toppings]).slice(0, n) as Topping[];
  return TOPPINGS.filter((t) => pick.includes(t));
}

/** 주문 생성 — 스테이지 설정의 메뉴 범위 안에서. 라면이 있으면 사이드는 최대 2개(카드 칸 수) */
export function makeOrder(cfg: DayConfig, kind: PeepKind): OrderSpec {
  // 히든 1: 여고생 분식 세트 (치즈라면 + 컵떡볶이 + 슬러시)
  if (cfg.special === 'hs-set' && kind === 'hsgirl' && Math.random() < 0.7) {
    return { ramen: 1, toppings: ['cheese'], slush: true, tteok: true, odeng: false };
  }
  // 히든 2: 유도부원 대식가 (라면 2그릇 + 떡볶이 또는 어묵)
  if (cfg.special === 'judo' && kind === 'judo') {
    const tteok = Math.random() < 0.5;
    return { ramen: 2, toppings: pickToppings(cfg, 1), slush: false, tteok, odeng: !tteok };
  }
  const sideOnly = Math.random() < cfg.slushOnlyChance + (cfg.tteok ? 0.04 : 0);
  let slush = cfg.slush && Math.random() < cfg.slushChance;
  let tteok = cfg.tteok && Math.random() < cfg.tteokChance;
  let odeng = cfg.odeng && Math.random() < cfg.odengChance;
  if (sideOnly) {
    if (!slush && !tteok && !odeng) {
      const opts: SideKind[] = [];
      if (cfg.slush) opts.push('slush');
      if (cfg.tteok) opts.push('tteok');
      if (cfg.odeng) opts.push('odeng');
      if (opts.length) {
        const k = Phaser.Utils.Array.GetRandom(opts);
        slush = k === 'slush'; tteok = k === 'tteok'; odeng = k === 'odeng';
      }
    }
    if (slush || tteok || odeng) return { ramen: 0, toppings: [], slush, tteok, odeng };
  }
  // 라면 + 사이드 최대 2개
  const sides = [slush && 'slush', tteok && 'tteok', odeng && 'odeng'].filter(Boolean) as SideKind[];
  while (sides.length > 2) sides.splice(Math.floor(Math.random() * sides.length), 1);
  return {
    ramen: 1, toppings: pickToppings(cfg),
    slush: sides.includes('slush'), tteok: sides.includes('tteok'), odeng: sides.includes('odeng'),
  };
}

export function recipeScore(spec: OrderSpec, cooked: Cooked) {
  let s = 0;
  for (const t of TOPPINGS) {
    const want = spec.toppings.includes(t);
    const has = cooked.toppings.has(t);
    if (want === has) s += 1;
  }
  return s / TOPPINGS.length;
}

export function isExact(spec: OrderSpec, cooked: Cooked) {
  return recipeScore(spec, cooked) === 1;
}

/** 카운터 너머 손님 + 주문 카드 관리 */
export class Customers extends Phaser.Events.EventEmitter {
  slots: (Customer | null)[] = [null, null, null, null];
  private bubbles = new Map<number, Phaser.GameObjects.Container>();
  private arrows: Phaser.GameObjects.Container[] = [];
  frozen = false;
  /** 인내심 감소 배율 (미니 오락기 0.75) */
  patienceScale = 1;
  /** 무한 모드 등에서 인내심 시간을 바꿀 때 */
  patienceSec: number;

  constructor(private scene: Phaser.Scene, private cfg: DayConfig, private sfx: SoundManager) {
    super();
    this.patienceSec = cfg.patienceSec;
    // 손님 열 전체(주문 카드 ~ 매대 직전)를 서빙 대상 터치 영역으로
    for (let i = 0; i < 4; i++) {
      const z = scene.add.zone(COLS[i] - CUSTOMER_ZONE.w / 2, CUSTOMER_ZONE.y, CUSTOMER_ZONE.w, CUSTOMER_ZONE.h)
        .setOrigin(0, 0).setDepth(450).setInteractive();
      z.on('pointerdown', () => this.emit('tap', i, this.slots[i]));
      // "여기로 서빙!" 화살표
      const a = icon(scene, 0, 0, 'ui_arrow');
      const t = txt(scene, 0, -10, '여기!', { font: FONT.small, size: 8, color: CSS.yellow, stroke: CSS.black, strokeW: 2 }).setOrigin(0.5, 1);
      const box = scene.add.container(COLS[i], CUSTOMER_TOP_Y + 2, [a, t]).setDepth(470).setVisible(false);
      scene.tweens.add({ targets: box, y: CUSTOMER_TOP_Y + 6, yoyo: true, repeat: -1, duration: 260, ease: 'Sine.InOut' });
      this.arrows.push(box);
    }
  }

  get list() {
    return this.slots.filter((c): c is Customer => !!c);
  }

  get waiting() {
    return this.list.filter((c) => c.state === 'wait');
  }

  freeSlots() {
    const out: number[] = [];
    for (let i = 0; i < 4; i++) if (!this.slots[i]) out.push(i);
    return out;
  }

  count() {
    return this.list.filter((c) => c.state === 'enter' || c.state === 'wait').length;
  }

  private pickKind(): PeepKind {
    const ws = this.cfg.peeps.map(([, w]) => w);
    return this.cfg.peeps[weightedPick(ws)][0];
  }

  spawn(spec?: OrderSpec, slotWanted?: number, kindWanted?: PeepKind): Customer | null {
    const free = this.freeSlots();
    if (!free.length) return null;
    const slot = slotWanted !== undefined && free.includes(slotWanted) ? slotWanted : Phaser.Utils.Array.GetRandom(free);
    const kind = kindWanted ?? this.pickKind();
    const fromLeft = COLS[slot] < GAME_W / 2 ? true : COLS[slot] > GAME_W / 2 ? false : Math.random() < 0.5;
    const sx = fromLeft ? -20 : GAME_W + 20;
    const sprite = this.scene.add.sprite(sx, CUSTOMER_TOP_Y, 'peeps').setOrigin(0.5, 0).setScale(2).setDepth(150);
    sprite.play(`${kind}_walk`);
    sprite.setFlipX(!fromLeft);
    const order = spec ?? makeOrder(this.cfg, kind);
    const card = new OrderCard(this.scene, slot, order);
    const c: Customer = {
      id: nextId++, slot, kind, spec: order, ramenLeft: order.ramen, ramenPending: 0,
      side: {
        slush: { done: !order.slush, pending: false },
        tteok: { done: !order.tteok, pending: false },
        odeng: { done: !order.odeng, pending: false },
      },
      mistake: false, patience: 1, state: 'enter', sprite, card, earned: 0,
    };
    this.slots[slot] = c;
    const dist = Math.abs(COLS[slot] - sx);
    this.scene.tweens.add({
      targets: sprite, x: COLS[slot], duration: (dist / 90) * 1000, ease: 'Linear',
      onComplete: () => {
        if (c.state !== 'enter') return;
        c.state = 'wait';
        sprite.play(`${kind}_idle`);
        sprite.setFlipX(false);
        bounce(this.scene, sprite, 0.08, 2);
        this.sfx.bell();
        this.say(c, Phaser.Utils.Array.GetRandom(ARRIVE_LINES[kind]), 1400);
        this.emit('arrive', c);
      },
    });
    return c;
  }

  // ─── 말풍선 리액션 ─────────────────────────────────────────
  say(c: Customer, text: string, ms = 1200, iconTag?: string, color: string = CSS.black) {
    this.bubbles.get(c.id)?.destroy();
    const parts: Phaser.GameObjects.GameObject[] = [];
    const g = this.scene.add.graphics();
    parts.push(g);
    let w = 6;
    const h = 14;
    let t: Phaser.GameObjects.Text | null = null;
    if (text) {
      t = txt(this.scene, 0, 0, text, { font: FONT.small, size: 8, color });
      w += Math.ceil(t.width);
    }
    let ic: Phaser.GameObjects.Image | null = null;
    if (iconTag) {
      ic = icon(this.scene, 0, 0, iconTag);
      w += 9;
    }
    drawBubble(g, 0, 0, w, h, C.white, C.black, 'down', 6);
    let cx = 3;
    if (ic) { ic.setPosition(cx + 4, 7); parts.push(ic); cx += 9; }
    if (t) { t.setPosition(cx, 3); parts.push(t); }
    const bx = Phaser.Math.Clamp(COLS[c.slot] + 2, 2, GAME_W - w - 2);
    const box = this.scene.add.container(bx, BUBBLE_Y, parts).setDepth(420);
    box.setScale(0.4);
    this.scene.tweens.add({ targets: box, scale: 1, duration: 140, ease: 'Back.Out' });
    this.scene.time.delayedCall(ms, () => {
      if (!box.active) return;
      this.scene.tweens.add({ targets: box, alpha: 0, duration: 160, onComplete: () => box.destroy() });
    });
    this.bubbles.set(c.id, box);
  }

  // ─── 수동 서빙 판정 ─────────────────────────────────────────
  /** 이 손님이 지금 그 음식을 받을 수 있나 */
  wants(c: Customer, kind: ServeKind) {
    if (c.state !== 'wait') return false;
    if (kind === 'ramen') return c.ramenLeft - c.ramenPending > 0;
    const s = c.side[kind];
    return !s.done && !s.pending;
  }

  anyWants(kind: ServeKind) {
    return this.waiting.some((c) => this.wants(c, kind));
  }

  /** 들고 있는 음식을 받을 수 있는 손님에게 화살표 + 노란 카드 테두리 */
  showTargets(kind: ServeKind | null, exactFor?: Cooked) {
    for (let i = 0; i < 4; i++) {
      const c = this.slots[i];
      const on = !!kind && !!c && this.wants(c, kind);
      this.arrows[i].setVisible(on);
      c?.card.setTarget(on);
      if (c && kind === 'ramen' && exactFor) c.card.setGlow(on && isExact(c.spec, exactFor));
    }
  }

  /** 카드 강조: 지금 완성된 라면 중 정확히 맞는 것이 있는 주문 */
  highlightFor(readyCooked: Cooked[]) {
    for (const c of this.list) {
      const on = c.state === 'wait' && c.ramenLeft > 0 && readyCooked.some((k) => isExact(c.spec, k));
      c.card.setGlow(on);
    }
  }

  deliverRamen(c: Customer, exact: boolean) {
    c.ramenPending = Math.max(0, c.ramenPending - 1);
    c.ramenLeft = Math.max(0, c.ramenLeft - 1);
    if (!exact) c.mistake = true;
    c.card.markRamen(exact && !c.mistake, c.ramenLeft);
    bounce(this.scene, c.sprite, 0.12, 2);
    if (!exact) this.say(c, '이게 아닌데…', 1200);
    else if (c.ramenLeft > 0) this.say(c, '한 그릇 더!', 900);
    else this.say(c, '', 900, 'mini_heart');
    this.checkComplete(c);
  }

  deliverSide(c: Customer, kind: SideKind, perfect = false) {
    c.side[kind].pending = false;
    c.side[kind].done = true;
    c.card.markSide(kind);
    bounce(this.scene, c.sprite, 0.12, 2);
    const line = kind === 'slush' ? (perfect ? '시원해!' : '') : kind === 'tteok' ? '매콤!' : '따끈~';
    this.say(c, line, 900, line ? undefined : 'mini_heart');
    this.checkComplete(c);
  }

  /** 완성된 주문인지 */
  isFull(c: Customer) {
    return c.ramenLeft === 0 && sidesOf(c.spec).every((k) => c.side[k].done);
  }

  private checkComplete(c: Customer) {
    if (!this.isFull(c) || c.state !== 'wait') return;
    c.state = 'eat';
    c.sprite.play(`${c.kind}_eat`);
    c.card.remove(true);
    this.emit('complete', c);
    this.scene.time.delayedCall(1800, () => {
      this.emit('eaten', c);
      this.walkAway(c, false);
    });
  }

  private angry(c: Customer) {
    c.state = 'leave';
    c.card.remove(false);
    c.sprite.play(`${c.kind}_angry`);
    this.sfx.angry();
    this.say(c, '흥!', 900, undefined, CSS.red);
    this.emit('angry', c);
    this.scene.time.delayedCall(600, () => this.walkAway(c, true));
  }

  private walkAway(c: Customer, angry: boolean) {
    c.state = 'leave';
    this.slots[c.slot] = this.slots[c.slot] === c ? null : this.slots[c.slot];
    if (!c.sprite.active) return;
    c.sprite.play(angry ? `${c.kind}_angry` : `${c.kind}_walk`);
    const toLeft = COLS[c.slot] < GAME_W / 2;
    c.sprite.setFlipX(toLeft);
    const tx = toLeft ? -24 : GAME_W + 24;
    this.scene.tweens.add({
      targets: c.sprite, x: tx, duration: (Math.abs(tx - c.sprite.x) / (angry ? 130 : 90)) * 1000,
      onComplete: () => c.sprite.destroy(),
    });
  }

  /** 영업 종료: 남은 손님은 조용히 퇴장 */
  closeShop() {
    this.showTargets(null);
    for (const c of this.list) {
      if (c.state === 'leave') continue;
      if (c.state === 'wait' || c.state === 'enter') c.card.remove(false);
      this.scene.tweens.killTweensOf(c.sprite);
      this.walkAway(c, false);
    }
  }

  update(dt: number, now: number) {
    for (const c of this.list) {
      if (c.state === 'wait' && !this.frozen) {
        c.patience -= (dt / 1000 / this.patienceSec) * this.patienceScale;
        if (c.patience < 0.28 && c.sprite.anims.currentAnim?.key !== `${c.kind}_angry`) {
          c.sprite.play(`${c.kind}_angry`);
          this.say(c, '빨리요!', 900, undefined, CSS.red);
        }
        if (c.patience <= 0) this.angry(c);
      }
      if (c.state === 'wait' || c.state === 'enter') c.card.setPatience(Math.max(0, c.patience), now);
    }
  }

  /** 카운터 상판 위에 올라갈 물건(빈 그릇 등)의 y */
  static counterTopY() {
    return COUNTER_FRONT_Y + 3;
  }

  /** 테스트용: 슬롯 i 손님 영역 중심 */
  static slotCenter(i: number) {
    return { x: COLS[i], y: Math.round(CARD.y + CARD.h / 2) };
  }
}
