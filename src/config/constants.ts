// ─────────────────────────────────────────────────────────────
//  보글보글 골목 타이쿤 v3.0 — 전역 상수 & 동적 레이아웃
//  가로 240 고정, 세로는 부팅 시점 화면 비율로 계산 (340~520)
//  → 어떤 폰 비율에서도 가로가 화면 좌우 끝까지 꽉 찬다
//
//   ┌ HUD ───────────────────────────┐  28
//   │ 카운터: 주문 카드 + 손님         │  80~
//   │ 전방 매대: 떡볶이 · TV · 오락기 · 어묵 │  34~
//   │ 주방: 화구 2x2 | 슬러시 · 그릇 선반 │  132~
//   │ 손질대: 도마 · 계란 · 치즈 · 싱크대 │  64~
//   └────────────────────────────────┘
// ─────────────────────────────────────────────────────────────

export const GAME_W = 240;
export const MIN_H = 340;
export const MAX_H = 520;

/** 게임이 들어갈 컨테이너(#game)의 실제 크기 — 없으면 창 크기 */
function measureViewport() {
  if (typeof window === 'undefined') return { w: 360, h: 640 };
  const el = document.getElementById('game');
  const r = el?.getBoundingClientRect();
  const w = r && r.width > 0 ? r.width : window.innerWidth;
  const h = r && r.height > 0 ? r.height : window.innerHeight;
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

/** 내림(floor)으로 계산해 항상 '가로 기준'으로 꽉 차게 만든다 (세로 여유 < 1 논리px) */
export function idealHeight(vw: number, vh: number) {
  return Math.max(MIN_H, Math.min(MAX_H, Math.floor((GAME_W * vh) / vw)));
}

const VP = measureViewport();
export const GAME_H = idealHeight(VP.w, VP.h);

// ── 높이 배분 ────────────────────────────────────────────────
//  최소 = HUD 28 + 카운터 80 + 전방 매대 34 + 주방 132 + 손질대 64 = 338
//  남는 높이는 ① 주방 셀(+18) ② 안내 줄(+18) ③ 전방 매대(+8) ④ 카운터(+40) ⑤ 나머지 3등분
const BASE = { hud: 28, counter: 80, front: 34, kitchen: 132, prep: 64 };
let rest = GAME_H - (BASE.hud + BASE.counter + BASE.front + BASE.kitchen + BASE.prep);
const kitchenGrow = Math.min(rest, 18); rest -= kitchenGrow;
const HINT_H = rest >= 18 ? 18 : 0; rest -= HINT_H;
const frontGrow = Math.min(rest, 8); rest -= frontGrow;
const counterGrow = Math.min(rest, 40); rest -= counterGrow;
const spareC = Math.floor(rest / 3);
const spareK = Math.floor(rest / 3);
const spareP = rest - spareC - spareK;

const HUD_H = BASE.hud;
const COUNTER_H = BASE.counter + counterGrow + spareC;
const FRONT_H = BASE.front + frontGrow;
const KITCHEN_H = BASE.kitchen + kitchenGrow + spareK;
const PREP_H = BASE.prep + HINT_H + spareP;

export const LAYOUT = {
  hud: { y: 0, h: HUD_H },
  counter: { y: HUD_H, h: COUNTER_H },
  front: { y: HUD_H + COUNTER_H, h: FRONT_H },
  kitchen: { y: HUD_H + COUNTER_H + FRONT_H, h: KITCHEN_H },
  prep: { y: HUD_H + COUNTER_H + FRONT_H + KITCHEN_H, h: PREP_H },
} as const;

// ── 카운터 (손님 + 주문 카드) ─────────────────────────────────
/** 전방 매대(카운터 상판) 시작 y 와 높이 — 손님 하반신은 이 띠 뒤로 가린다 */
export const COUNTER_FRONT_Y = LAYOUT.front.y;
export const COUNTER_FRONT_H = FRONT_H;
/** 손님/주문 카드 4열 */
export const COLS = [30, 90, 150, 210] as const;
export const CARD = { y: LAYOUT.counter.y + 4 + Math.max(0, Math.floor((COUNTER_H - 110) / 3)), w: 56, h: 50 } as const;
/** 2배 확대 손님 스프라이트의 위쪽 y (허리 아래는 매대에 가림) */
export const CUSTOMER_TOP_Y = COUNTER_FRONT_Y - 34;
/** 손님 말풍선 · 서빙 도착 · 금액 표시 y */
export const BUBBLE_Y = CUSTOMER_TOP_Y - 4;
export const SERVE_Y = CUSTOMER_TOP_Y + 22;
export const MONEY_Y = CUSTOMER_TOP_Y + 8;
/** 서빙 대상 터치 영역: 손님 한 명의 열 전체 (주문 카드 ~ 매대 직전) */
export const CUSTOMER_ZONE = { y: CARD.y - 4, h: COUNTER_FRONT_Y - (CARD.y - 4), w: 60 } as const;

// ── 전방 매대 (64x32 / 32x32 스프라이트를 매대 바닥선에 맞춰 놓음) ─────
const frontBottom = LAYOUT.front.y + FRONT_H;            // 매대 앞 테두리 아래
const onBar = frontBottom - 34;                          // 32px 스프라이트 윗변
export const GRIDDLE_POS = { x: 0, y: onBar, w: 64, h: 32 } as const;      // 떡볶이 철판
export const ODENG_POS = { x: 176, y: onBar, w: 64, h: 32 } as const;      // 사각 어묵탕
export const TV_POS = { x: 64, y: onBar } as const;                         // 브라운관 TV (32x32)
export const ARCADE_POS = { x: 144, y: onBar } as const;                    // 미니 오락기 (32x32)

// ── 주방 (화구 2x2 + 오른쪽 슬러시·그릇 선반) ─────────────────
export const CELL_W = 60;
/** 화구 셀 높이 (64~73). 냄비 스프라이트 중심 = (x+30, y+39) */
export const CELL_H = 64 + Math.floor(kitchenGrow / 2);
const kLeft = KITCHEN_H - CELL_H * 2;           // 셀 2줄을 빼고 남는 세로 공간
const kPadTop = Math.floor(kLeft / 3);
const kGap = Math.floor(kLeft / 3);
const row0 = LAYOUT.kitchen.y + kPadTop;
const row1 = row0 + CELL_H + kGap;
export const POT_CELLS = [
  { x: 4, y: row0 },
  { x: 66, y: row0 },
  { x: 4, y: row1 },
  { x: 66, y: row1 },
] as const;

/** 슬러시 구역: 왼쪽 = 게이지 + 기계(컵) / 오른쪽 끝 = 레버 트랙 */
const machineTop = LAYOUT.kitchen.y + 2 + kPadTop;
export const SLUSH_POS = { x: 150, y: machineTop } as const;                 // 48x64 좌상단
export const SLUSH_GAUGE = { x: 136, y: machineTop + 2, w: 10, h: 60 } as const;
export const LEVER = { x: 224, top: machineTop + 4, bottom: machineTop + 60, zoneX: 204 } as const;
/** 완성 컵 옆 작은 휴지통 (받침대 위, 게이지 아래) */
export const CUP_TRASH = { x: 141, y: machineTop + 70 } as const;
const shelfY = machineTop + 78;
export const BOWL_SHELF = {
  x: 138, y: shelfY, w: 96,
  h: Math.max(40, Math.min(76, LAYOUT.kitchen.y + KITCHEN_H - shelfY - 2)),
} as const;
/** 선반 단 수 (짧은 화면은 1단) */
export const SHELF_ROWS = BOWL_SHELF.h >= 76 ? 2 : 1;

// ── 손질대 ───────────────────────────────────────────────────
export const STATION_IDS = ['board', 'egg', 'cheese', 'sink'] as const;
export type StationId = (typeof STATION_IDS)[number];
const stationY = LAYOUT.prep.y + 3 + Math.floor(spareP / 2);
export const STATION_POS: Record<StationId, { x: number; y: number }> = {
  board: { x: 2, y: stationY },
  egg: { x: 61, y: stationY },
  cheese: { x: 120, y: stationY },
  sink: { x: 179, y: stationY },
};
export const STATION_W = 56;
export const STATION_H = 62; // 매트 전체 (스프라이트 44 + 라벨·게이지)
/** 맨 아래 안내 줄 (공간이 부족한 화면에서는 주방-손질대 경계에 토스트로 뜸) */
export const HINT_STRIP = HINT_H > 0;
export const HINT_Y = HINT_STRIP ? LAYOUT.prep.y + PREP_H - HINT_H + 3 : LAYOUT.prep.y - 9;

// ─── 조리 타이밍 (ms) ─────────────────────────────────────────
export const POT_T = {
  heat: 3000,       // 물 붓고 끓기 시작할 때까지
  golden: 2500,     // 골든타임 (PERFECT 구간, 게이지 초록)
  late: 4500,       // 골든타임 이후에도 면 투입 가능, 지나면 물이 졸아 탐
  simmer: 3500,     // 면이 익는 시간 (토핑 투입 구간)
  ready: 7000,      // 완성 후 서빙 대기 — 넘기면 탐
  tapGuard: 260,    // 같은 냄비 연타 오입력 방지
} as const;

/** 소품 효과 */
export const PROP = { arcadePatience: 0.75, arcadeCoinMs: 8000, arcadeCoin: 15, tvFeverMs: 3000, tvTipMult: 1.2 } as const;

/** 고화력 버너 업그레이드 시 */
export const POT_T_FAST = { heat: 2000, simmer: 2600 } as const;

export const SLUSH = {
  /** 레버를 끝까지 당겼을 때 컵이 가득 차는 시간(ms) — 덜 당기면 더 느리게 */
  fillMs: 1100,
  /** 이보다 덜 당기면 나오지 않음 */
  deadZone: 0.15,
  goldMin: 0.8,
  goldMax: 0.92,
  okMin: 0.6,
  overflowLock: 2000,
} as const;

// ─── 경제 ─────────────────────────────────────────────────────
export const PRICE = {
  ramen: 40,
  topping: 10,
  perfectNoodle: 10,
  slush: 20,
  slushPerfect: 10,
  tteok: 25,
  odeng: 15,
  tipMax: 15,
  /** 유도부원 '왕팁' 배율 */
  judoTipMult: 3,
  missPenalty: 10,
} as const;

/** 떡볶이 철판 (ms) */
export const TTEOK = {
  cook: 3000,       // 리필 후 윤기 날 때까지
  glossy: 9000,     // 윤기 유지 → 지나면 졸아붙음(저어주세요!)
  sticky: 8000,     // 눌어붙은 채 방치 → 탐
  portions: 4,      // 한 판 = 4컵
  scrubs: 3,        // 탄 철판 긁기
} as const;

/** 어묵탕 (ms) */
export const ODENG = { cook: 2500, sticks: 3 } as const;

/** 피버 타임: 콤보가 5의 배수가 될 때 */
export const FEVER = { every: 5, ms: 8000, mult: 1.5 } as const;

export const UPGRADES = {
  burner: { name: '고화력 버너', desc: '물 끓는 시간 3초→2초\n면 익는 시간 단축', price: 400, icon: 'ui_flame_up' },
  knife: { name: '명품 식칼', desc: '대파 썰기 3번 → 1번', price: 300, icon: 'ui_knife' },
  autowash: { name: '자동 설거지 보조', desc: '3.5초마다 그릇 1개\n자동으로 닦아요', price: 600, icon: 'ui_autowash' },
  arcade: { name: '문방구 미니 오락기', desc: '손님 인내심 25% 천천히\n8초마다 +15G', price: 600, icon: 'ui_arcade' },
  tv: { name: '90년대 브라운관 TV', desc: '피버 타임 +3초\n모든 팁 +20%', price: 900, icon: 'ui_tv' },
} as const;
export type UpgradeId = keyof typeof UPGRADES;

// ─── 색 (Endesga 32) ─────────────────────────────────────────
export const C = {
  black: 0x181425, navy: 0x262b44, slate: 0x3a4466, grayDk: 0x5a6988, gray: 0x8b9bb4,
  grayLt: 0xc0cbdc, white: 0xffffff, red: 0xe43b44, redDk: 0xa22633, orange: 0xf77622,
  gold: 0xfeae34, yellow: 0xfee761, green: 0x63c74d, greenDk: 0x3e8948, greenDkr: 0x265c42,
  cyan: 0x2ce8f5, blue: 0x0099db, blueDk: 0x124e89, cream: 0xead4aa, tan: 0xe4a672,
  brown: 0xb86f50, brownDk: 0x733e39, plum: 0x3e2731, pink: 0xf6757a, hotPink: 0xff0044,
  magenta: 0xb55088, purple: 0x68386c,
} as const;

export const CSS = {
  black: '#181425', navy: '#262b44', white: '#ffffff', yellow: '#fee761', gold: '#feae34',
  red: '#e43b44', redDk: '#a22633', orange: '#f77622', green: '#63c74d', greenDk: '#3e8948',
  cyan: '#2ce8f5', cream: '#ead4aa', brownDk: '#733e39', grayLt: '#c0cbdc', gray: '#8b9bb4',
  pink: '#f6757a', plum: '#3e2731', blue: '#0099db', tan: '#e4a672',
} as const;

export const FONT = {
  small: 'Galmuri7',   // 8px
  body: 'Galmuri9',    // 10px
  bold: 'Galmuri11B',  // 12px bold
} as const;

export type Topping = 'egg' | 'scallion' | 'cheese';
export const TOPPINGS: Topping[] = ['egg', 'scallion', 'cheese'];
export const TOPPING_LABEL: Record<Topping, string> = { egg: '계란', scallion: '대파', cheese: '치즈' };
export const TOPPING_ICON: Record<Topping, string> = { egg: 'ui_egg', scallion: 'ui_scallion_cut', cheese: 'ui_cheese' };
export const TOPPING_MINI: Record<Topping, string> = { egg: 'mini_egg', scallion: 'mini_scallion', cheese: 'mini_cheese' };
