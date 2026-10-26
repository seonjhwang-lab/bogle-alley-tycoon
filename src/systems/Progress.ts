import type { UpgradeId } from '../config/constants';

/** 영업일 사이에 이어지는 진행 상황 (브라우저에 저장, 실패해도 게임은 정상 동작) */
export interface ProgressData {
  wallet: number;
  upgrades: Record<UpgradeId, boolean>;
  best: number[];        // Day별 최고 별 개수 (0~5)
  bestRevenue: number[];
  unlocked: number;      // 플레이 가능한 최대 Day
  tutorialDone: boolean;
  /** 히든 스테이지 · 무한 모드 */
  h1Unlocked: boolean;
  h1Cleared: boolean;
  h2Unlocked: boolean;
  h2Cleared: boolean;
  endlessUnlocked: boolean;
  hiddenBest: { h1: number; h2: number };
  endlessBest: { revenue: number; served: number };
  /** 이미 본 스토리 컷신 키 */
  story: string[];
  /** 타이틀에서 한 번 크게 알려 줄 새 해금 ('h1' | 'h2' | 'endless' | 'star4' | 'star5') */
  news: string[];
}

const KEY = 'bogle-alley-tycoon-v3';
const OLD_KEY = 'bogle-alley-tycoon-v2';

function fresh(): ProgressData {
  return {
    wallet: 0,
    upgrades: { burner: false, knife: false, autowash: false, arcade: false, tv: false },
    best: [0, 0, 0, 0, 0],
    bestRevenue: [0, 0, 0, 0, 0],
    unlocked: 1,
    tutorialDone: false,
    h1Unlocked: false, h1Cleared: false, h2Unlocked: false, h2Cleared: false, endlessUnlocked: false,
    hiddenBest: { h1: 0, h2: 0 },
    endlessBest: { revenue: 0, served: 0 },
    story: [],
    news: [],
  };
}

/** v2 저장(별 3개 시스템)을 v3로 옮긴다 — 지갑·업그레이드·별·해금 Day·튜토리얼 유지 */
function migrate(old: Partial<ProgressData>): ProgressData {
  const d = fresh();
  d.wallet = old.wallet ?? 0;
  d.upgrades = { ...d.upgrades, ...(old.upgrades ?? {}) };
  d.best = (old.best ?? d.best).map((n) => Math.min(3, n));
  d.bestRevenue = old.bestRevenue ?? d.bestRevenue;
  d.unlocked = old.unlocked ?? 1;
  d.tutorialDone = !!old.tutorialDone;
  d.story = ['prologue', 'd1'];
  return d;
}

let cache: ProgressData | null = null;

export const Progress = {
  get(): ProgressData {
    if (cache) return cache;
    let data = fresh();
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProgressData>;
        data = { ...data, ...parsed, upgrades: { ...data.upgrades, ...(parsed.upgrades ?? {}) } };
      } else {
        const old = window.localStorage.getItem(OLD_KEY);
        if (old) data = migrate(JSON.parse(old));
      }
    } catch {
      /* 저장소 없음 — 메모리로만 진행 */
    }
    cache = data;
    Progress.refreshUnlocks();
    return data;
  },
  save() {
    if (!cache) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      /* ignore */
    }
  },
  reset() {
    cache = fresh();
    this.save();
  },
  /** 현재 도전 가능한 최대 별 (3 → 히든1 클리어 4 → 히든2 클리어 5) */
  maxStars(p: ProgressData = Progress.get()) {
    return p.h2Cleared ? 5 : p.h1Cleared ? 4 : 3;
  },
  totalStars(p: ProgressData = Progress.get()) {
    return p.best.reduce((a, b) => a + b, 0);
  },
  /** 별·클리어 기록으로 히든 스테이지 해금 여부를 다시 계산 (새로 열린 것은 news에 추가) */
  refreshUnlocks() {
    const p = cache;
    if (!p) return;
    const add = (k: string) => { if (!p.news.includes(k)) p.news.push(k); };
    if (!p.h1Unlocked && p.best.some((b) => b >= 3)) { p.h1Unlocked = true; add('h1'); }
    if (!p.h2Unlocked && (Progress.totalStars(p) >= 12 || p.best[4] >= 1)) { p.h2Unlocked = true; add('h2'); }
  },
};
