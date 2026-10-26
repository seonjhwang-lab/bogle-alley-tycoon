import Phaser from 'phaser';
import { CUSTOMER_ZONE, COLS, COUNTER_FRONT_Y } from '../config/constants';
import type { SoundManager } from './SoundManager';
import type { Pot } from './Pot';
import type { Customer, ServeKind } from './Customers';
import { icon } from '../ui/Frames';

/**
 * 손(선택) — 2단계 수동 타겟팅의 '완성품 → 손님' 단계
 *
 *   완성 냄비 / 슬러시 컵 / 윤기 나는 철판 / 익은 어묵탕을 탭 → HELD (초록 테두리 + 손님 위 '여기!' 화살표)
 *   → 원하는 손님(또는 그 주문 카드)을 탭하면 그 손님에게만 서빙
 *   같은 것을 다시 탭 / 빈 곳 탭 = 취소 · 다른 완성품 탭 = 바꿔 들기 · 손님에게 끌어다 놓기도 가능
 */
export type HeldKind = 'pot' | 'slush' | 'tteok' | 'odeng';
export interface Held { kind: HeldKind; pot?: Pot }

export interface HandHooks {
  /** 들고 있는 것이 아직 유효한가 (냄비가 탔다든지 하면 자동 취소) */
  valid: (h: Held) => boolean;
  /** 손님에게 서빙 시도 — 성공하면 true (손에서 내려놓음) */
  deliver: (h: Held, c: Customer) => boolean;
  /** 선택 표시 켜기/끄기 */
  visual: (h: Held, on: boolean) => void;
  /** 새로 집었을 때 (재료 선택 해제 · 가이드) */
  picked: (h: Held) => void;
  hint: (msg: string, color?: string, ms?: number) => void;
}

const GHOST: Record<HeldKind, string> = { pot: 'ui_bowl', slush: 'ui_slush', tteok: 'ui_tteok', odeng: 'ui_odeng' };
export const SERVE_KIND: Record<HeldKind, ServeKind> = { pot: 'ramen', slush: 'slush', tteok: 'tteok', odeng: 'odeng' };

export class Hand {
  held: Held | null = null;
  private cand: { id: number; x0: number; y0: number; again: boolean } | null = null;
  private dragging = false;
  private ghost: Phaser.GameObjects.Image | null = null;
  /** 같은 입력(pointerdown)으로 막 집었으면 빈 곳 탭 취소를 건너뛴다 */
  private pickedAt = -1;

  constructor(private scene: Phaser.Scene, private sfx: SoundManager, private hooks: HandHooks) {
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    // 아무것도 없는 곳을 탭하면 내려놓기
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!this.held || over.length) return;
      if (this.pickedAt === p.downTime) return;
      this.cancel('내려놓았어요');
    });
  }

  same(a: Held | null, b: Held) {
    return !!a && a.kind === b.kind && a.pot === b.pot;
  }

  get kind(): ServeKind | null {
    return this.held ? SERVE_KIND[this.held.kind] : null;
  }

  /** 완성품을 눌렀을 때 (각 시스템이 호출). 같은 것을 다시 누르면 손을 뗄 때 취소 */
  press(h: Held, p: Phaser.Input.Pointer) {
    const again = this.same(this.held, h);
    if (!again) this.select(h);
    this.pickedAt = p.downTime;
    this.cand = { id: p.id, x0: p.x, y0: p.y, again };
    this.dragging = false;
  }

  select(h: Held) {
    if (this.held) this.hooks.visual(this.held, false);
    this.held = h;
    this.hooks.visual(h, true);
    this.sfx.pick();
    this.hooks.picked(h);
    this.hooks.hint('받을 손님을 탭하세요! (다시 탭 = 취소)', '#fee761', 4000);
  }

  cancel(msg?: string) {
    if (!this.held) return;
    this.hooks.visual(this.held, false);
    this.held = null;
    this.endDrag();
    if (msg) {
      this.sfx.unpick();
      this.hooks.hint(msg, '#c0cbdc', 900);
    }
  }

  /** 손님 열(카드 또는 손님)을 탭 */
  tapCustomer(c: Customer | null) {
    if (!this.held) return false;
    if (!c) {
      this.cancel('내려놓았어요');
      return false;
    }
    const h = this.held;
    if (this.hooks.deliver(h, c)) {
      this.hooks.visual(h, false);
      this.held = null;
      return true;
    }
    return false;
  }

  private onMove(p: Phaser.Input.Pointer) {
    const d = this.cand;
    if (!d || d.id !== p.id || !this.held) return;
    if (!this.dragging && Phaser.Math.Distance.Between(p.x, p.y, d.x0, d.y0) > 8) {
      this.dragging = true;
      this.ghost = icon(this.scene, p.x, p.y, GHOST[this.held.kind]).setDepth(1800).setScale(2).setAlpha(0.9);
    }
    if (this.dragging && this.ghost) this.ghost.setPosition(Math.round(p.x), Math.round(p.y - 12));
  }

  private onUp(p: Phaser.Input.Pointer) {
    const d = this.cand;
    if (!d || d.id !== p.id) return;
    this.cand = null;
    if (!this.held) { this.endDrag(); return; }
    if (this.dragging) {
      // 끌어다 놓기: 손님 열 위에서 놓으면 서빙, 아니면 계속 들고 있음
      const slot = Hand.slotAt(p.x, p.y);
      this.endDrag();
      if (slot !== null) this.scene.events.emit('hand-drop', slot);
      return;
    }
    if (d.again) this.cancel('내려놓았어요');
  }

  private endDrag() {
    this.dragging = false;
    this.ghost?.destroy();
    this.ghost = null;
  }

  static slotAt(x: number, y: number): number | null {
    if (y < CUSTOMER_ZONE.y || y >= COUNTER_FRONT_Y + 4) return null;
    for (let i = 0; i < 4; i++) if (Math.abs(x - COLS[i]) <= CUSTOMER_ZONE.w / 2) return i;
    return null;
  }

  update() {
    if (this.held && !this.hooks.valid(this.held)) this.cancel();
  }
}
