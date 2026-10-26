import type { Topping } from './constants';

export type StageKind = 'day' | 'hidden' | 'endless';
export type PeepKind = 'kid' | 'girl' | 'teacher' | 'hsgirl' | 'judo';

/**
 * 스테이지 설정 — 일반 Day 1~5, 히든 스테이지 2종, 무한 모드가 같은 형식을 쓴다.
 *   id      'd1'~'d5' · 'h1'(여고생 군단) · 'h2'(유도부 강습) · 'endless'
 *   feat    해금 기준 Day (스테이션·철판·어묵탕 잠금은 이 값으로 판단)
 */
export interface DayConfig {
  id: string;
  kind: StageKind;
  /** 일반 Day 번호 (히든·무한 모드는 6·7·8) */
  day: number;
  feat: number;
  label: string;            // HUD 왼쪽 위 (예: DAY 3 / 히든1 / 무한)
  title: string;
  /** 0 = 시간 제한 없음 (무한 모드) */
  durationSec: number;
  burners: number;
  delayedBurner?: { index: number; afterSec: number };
  toppings: Topping[];
  maxToppings: number;
  slush: boolean;
  slushChance: number;
  slushOnlyChance: number;
  tteok: boolean;
  tteokChance: number;
  odeng: boolean;
  odengChance: number;
  dishes: boolean;
  cat: boolean;
  maxCustomers: number;
  spawnSec: [number, number];
  patienceSec: number;
  /** 별 1~5개 기준 매출 (히든 스테이지는 stars[0] = 클리어 목표) */
  stars: number[];
  peeps: [PeepKind, number][];
  /** 특수 주문 규칙 */
  special?: 'hs-set' | 'judo';
  intro: { headline: string; lines: string[]; icons: string[] };
}

const NORMAL: [PeepKind, number][] = [['kid', 1], ['girl', 1], ['teacher', 1]];

export const DAYS: DayConfig[] = [
  {
    id: 'd1', kind: 'day', day: 1, feat: 1, label: 'DAY 1', title: '기본 라면', durationSec: 60, burners: 2, delayedBurner: { index: 1, afterSec: 15 },
    toppings: [], maxToppings: 0, slush: false, slushChance: 0, slushOnlyChance: 0, tteok: false, tteokChance: 0, odeng: false, odengChance: 0,
    dishes: false, cat: false, maxCustomers: 2, spawnSec: [5.5, 8], patienceSec: 40,
    stars: [220, 400, 540, 640, 760], peeps: NORMAL,
    intro: { headline: '첫 영업 날!', lines: ['냄비를 탭해 라면을 끓이고', '완성 냄비 → 손님 순서로 탭해 서빙!', '2번 화구는 15초 뒤에 켜져요.'], icons: ['ui_bowl'] },
  },
  {
    id: 'd2', kind: 'day', day: 2, feat: 2, label: 'DAY 2', title: '계란 & 대파', durationSec: 75, burners: 2,
    toppings: ['egg', 'scallion'], maxToppings: 2, slush: false, slushChance: 0, slushOnlyChance: 0, tteok: false, tteokChance: 0, odeng: false, odengChance: 0,
    dishes: false, cat: false, maxCustomers: 3, spawnSec: [5, 7.5], patienceSec: 42,
    stars: [380, 700, 980, 1180, 1420], peeps: NORMAL,
    intro: {
      headline: '새 재료 해금!',
      lines: ['도마를 3번 탭해 대파를 썰고', '재료 탭 → 냄비 탭으로 넣어요.', '면이 익는 중이거나 완성된 냄비에 쏙!'],
      icons: ['ui_scallion_cut', 'ui_egg'],
    },
  },
  {
    id: 'd3', kind: 'day', day: 3, feat: 3, label: 'DAY 3', title: '치즈 · 슬러시 · 떡볶이', durationSec: 90, burners: 2,
    toppings: ['egg', 'scallion', 'cheese'], maxToppings: 2, slush: true, slushChance: 0.35, slushOnlyChance: 0.1,
    tteok: true, tteokChance: 0.35, odeng: false, odengChance: 0,
    dishes: false, cat: false, maxCustomers: 3, spawnSec: [4.8, 7], patienceSec: 46,
    stars: [520, 1000, 1450, 1800, 2250], peeps: NORMAL,
    intro: {
      headline: '슬러시 & 떡볶이 해금!',
      lines: ['레버를 아래로 당겨 슬러시, 컵 탭 → 손님 탭', '떡볶이 철판이 졸면 좌우로 문질러 저어요', '윤기 나는 철판 탭 → 손님 탭으로 서빙!'],
      icons: ['ui_slush', 'ui_tteok'],
    },
  },
  {
    id: 'd4', kind: 'day', day: 4, feat: 4, label: 'DAY 4', title: '설거지 & 어묵탕', durationSec: 100, burners: 3,
    toppings: ['egg', 'scallion', 'cheese'], maxToppings: 2, slush: true, slushChance: 0.3, slushOnlyChance: 0.08,
    tteok: true, tteokChance: 0.3, odeng: true, odengChance: 0.3,
    dishes: true, cat: false, maxCustomers: 4, spawnSec: [4.2, 6.2], patienceSec: 48,
    stars: [560, 1000, 1500, 1900, 2450], peeps: NORMAL,
    intro: {
      headline: '화구 3개 + 설거지 + 어묵!',
      lines: ['손님이 먹은 그릇은 싱크대에서 닦아요.', '빈 어묵탕을 탭하면 꼬치 3개가 익어요.', '익은 어묵탕 탭 → 손님 탭!'],
      icons: ['ui_bowl_dirty', 'ui_odeng'],
    },
  },
  {
    id: 'd5', kind: 'day', day: 5, feat: 5, label: 'DAY 5', title: '하교 시간 러시', durationSec: 120, burners: 4,
    toppings: ['egg', 'scallion', 'cheese'], maxToppings: 3, slush: true, slushChance: 0.32, slushOnlyChance: 0.08,
    tteok: true, tteokChance: 0.3, odeng: true, odengChance: 0.3,
    dishes: true, cat: true, maxCustomers: 4, spawnSec: [3.6, 5.4], patienceSec: 46,
    stars: [640, 1150, 1800, 2300, 3000], peeps: NORMAL,
    intro: {
      headline: '전설의 하교 시간!',
      lines: ['화구 4개 풀가동, 풀토핑 주문!', '도둑고양이가 손질대에 올라오면', '고양이를 탭해서 쫓아내세요!'],
      icons: ['ui_fire', 'ui_bell'],
    },
  },
];

export const MAX_DAY = DAYS.length;

/** 히든 스테이지 1: 여고생 군단 (아무 Day에서 별 3개 최초 달성 시 해금) */
export const HIDDEN1: DayConfig = {
  id: 'h1', kind: 'hidden', day: 6, feat: 5, label: '히든 1', title: '여고생 군단 등장!', durationSec: 90, burners: 3,
  toppings: ['egg', 'scallion', 'cheese'], maxToppings: 2, slush: true, slushChance: 0.6, slushOnlyChance: 0.05,
  tteok: true, tteokChance: 0.6, odeng: false, odengChance: 0,
  dishes: false, cat: false, maxCustomers: 4, spawnSec: [4.2, 6], patienceSec: 50,
  stars: [1800], peeps: [['hsgirl', 4], ['girl', 2]], special: 'hs-set',
  intro: {
    headline: '시험 끝! 분식 세트 러시',
    lines: ['치즈라면 + 컵떡볶이 + 슬러시 세트 주문!', '떡볶이 철판을 미리 데워 두세요.', '목표 매출을 넘기면 클리어!'],
    icons: ['ui_ribbon', 'ui_tteok', 'ui_slush'],
  },
};

/** 히든 스테이지 2: 유도부 강습 (총 별 12개 이상 또는 Day 5 클리어 시 해금) */
export const HIDDEN2: DayConfig = {
  id: 'h2', kind: 'hidden', day: 7, feat: 5, label: '히든 2', title: '유도부 강습!', durationSec: 100, burners: 4,
  toppings: ['egg', 'scallion', 'cheese'], maxToppings: 1, slush: true, slushChance: 0.25, slushOnlyChance: 0.05,
  tteok: true, tteokChance: 0.4, odeng: true, odengChance: 0.4,
  dishes: false, cat: false, maxCustomers: 4, spawnSec: [4.4, 6.4], patienceSec: 56,
  stars: [2300], peeps: [['judo', 5], ['teacher', 1], ['kid', 1]], special: 'judo',
  intro: {
    headline: '대식가 유도부 등장!',
    lines: ['유도부원은 라면 2그릇 + 떡볶이/어묵!', '같은 손님에게 라면을 2번 따로 서빙해요.', '다 채우면 왕팁! 목표 매출 = 클리어'],
    icons: ['ui_belt', 'ui_bowl', 'ui_odeng'],
  },
};

/** 무한 리필 서바이벌: 손님 3명 놓칠 때까지 */
export const ENDLESS: DayConfig = {
  id: 'endless', kind: 'endless', day: 8, feat: 5, label: '무한', title: '무한 리필 서바이벌', durationSec: 0, burners: 4,
  toppings: ['egg', 'scallion', 'cheese'], maxToppings: 3, slush: true, slushChance: 0.3, slushOnlyChance: 0.08,
  tteok: true, tteokChance: 0.3, odeng: true, odengChance: 0.3,
  dishes: true, cat: true, maxCustomers: 4, spawnSec: [5, 7], patienceSec: 48,
  stars: [], peeps: [['kid', 2], ['girl', 2], ['teacher', 2], ['hsgirl', 1], ['judo', 1]],
  intro: {
    headline: '손님 3명 놓치면 끝!',
    lines: ['시간 제한 없이 손님이 점점 빨리 와요.', '하트 3개를 지키며 최고 기록에 도전!', '피버 타임으로 단숨에 점수를 올려요.'],
    icons: ['ui_heart', 'ui_trophy'],
  },
};

export const STAGES: Record<string, DayConfig> = Object.fromEntries(
  [...DAYS, HIDDEN1, HIDDEN2, ENDLESS].map((d) => [d.id, d]),
);

export function stageOf(id: string | number | undefined): DayConfig {
  if (typeof id === 'number') return DAYS[Math.max(0, Math.min(MAX_DAY - 1, id - 1))];
  return (id && STAGES[id]) || DAYS[0];
}
