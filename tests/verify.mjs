// v3.0 헤드리스 검증 — 2단계 수동 타겟팅 · 전방 매대 · 소품 · 히든/별5 · 무한 모드
//   VP=360x520 node verify.mjs  (기본 390x844)
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://localhost:5173/';
const [VW, VH] = (process.env.VP || '390x844').split('x').map(Number);
const browser = await puppeteer.launch({ args: [...chromium.args], executablePath: await chromium.executablePath(), headless: true,
  defaultViewport: { width: VW, height: VH, deviceScaleFactor: 1, isMobile: true, hasTouch: true } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, info = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
const KEY = 'bogle-alley-tycoon-v3';
const ALL_STORY = ['d1', 'd2', 'd3', 'd4', 'd5', 'h1', 'h2', 'endless'];
const store = (o = {}) => ({
  wallet: 0, upgrades: { burner: false, knife: false, autowash: false, arcade: false, tv: false },
  best: [1, 1, 1, 1, 0], bestRevenue: [0, 0, 0, 0, 0], unlocked: 5, tutorialDone: true,
  h1Unlocked: false, h1Cleared: false, h2Unlocked: false, h2Cleared: false, endlessUnlocked: false,
  hiddenBest: { h1: 0, h2: 0 }, endlessBest: { revenue: 0, served: 0 }, story: ALL_STORY, news: [], ...o,
});

async function open(url, st, { closeIntro = true } = {}) {
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message));
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate((st, KEY) => { localStorage.clear(); if (st) localStorage.setItem(KEY, JSON.stringify(st)); }, st, KEY);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(1300);
  const rect = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, gh: window.__game.config.height }; });
  page.S = (x, y) => [rect.l + x * rect.w / 240, rect.t + y * rect.h / rect.gh];
  page.tap = async (x, y) => page.mouse.click(...page.S(x, y));
  page.drag = async (x, y, x2, y2, steps = 8) => {
    const a = page.S(x, y), b = page.S(x2, y2);
    await page.mouse.move(...a); await page.mouse.down();
    for (let k = 1; k <= steps; k++) { await page.mouse.move(a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps); await sleep(16); }
    await page.mouse.up();
  };
  page.ev = (fn, ...args) => page.evaluate(fn, ...args);
  if (closeIntro && url.includes('stage=')) {
    page.L = await page.ev(() => window.__layout);
    await page.tap(...page.L.center); await sleep(500);
  }
  return page;
}
const L = (p) => p.L;
// 손님 소환 (특정 슬롯·주문) + 도착까지 대기, 자동 손님 등장 멈춤
async function guests(p, list, keep = false) {
  await p.ev(([list, keep]) => {
    const s = window.__bogle; s.spawnIn = 1e12;
    const cs = s.debug.customers; cs.frozen = true;
    // 자연 등장한 손님은 모두 내보낸다 (슬롯이 차 있으면 다른 칸에 생기고, 화살표 개수 검사도 흐트러지므로)
    for (const c of cs.slots) {
      if (c && c.state !== 'leave' && (!keep || list.some(([sl]) => sl === c.slot))) { c.card.remove(false); s.tweens.killTweensOf(c.sprite); cs['walkAway'](c, false); }
    }
    for (const [slot, spec, kind] of list) cs.spawn(spec, slot, kind);
  }, [list, keep]);
  await p.ev(() => { window.__speed = 4; });
  await sleep(900);
  await p.ev(() => { window.__speed = 1; });
}
const spec = (o) => ({ ramen: 1, toppings: [], slush: false, tteok: false, odeng: false, ...o });
const potsOf = (p) => p.ev(() => window.__bogle.debug.kitchen.pots.map(x => x.state));
// 냄비 하나를 READY까지 (실제 탭 사용)
async function cook(p, i, fast = true) {
  await p.tap(...L(p).pots[i]); await sleep(300);
  if (fast) await p.ev(() => { window.__speed = 4; });
  for (let k = 0; k < 40; k++) { if ((await potsOf(p))[i] === 'BOILING') break; await sleep(60); }
  await p.ev(() => { window.__speed = 1; });
  await p.tap(...L(p).pots[i]); await sleep(300);
  if (fast) await p.ev(() => { window.__speed = 4; });
  for (let k = 0; k < 60; k++) { if ((await potsOf(p))[i] === 'READY') break; await sleep(60); }
  await p.ev(() => { window.__speed = 1; });
}

// ── 1. Day 1 튜토리얼 (스토리 → 인트로 → 2단계 서빙) ────────────────
{
  const p = await open(BASE, null, { closeIntro: false });
  const tl = await p.ev(() => window.__titleLayout);
  await p.tap(...tl.days[0]); await sleep(900);
  const st = await p.ev(() => ({ story: window.__story && window.__story.key, phase: window.__bogle.debug.phase }));
  check('첫 시작: 프롤로그 스토리 컷신 (1999년 봄…)', st.story === 'd1' && st.phase === 'story', JSON.stringify(st));
  await p.screenshot({ path: '/tmp/claude-0/v3/verify_story.png' });
  for (let i = 0; i < 8; i++) { await p.ev(() => window.__story.advance()); await sleep(120); }
  await p.ev(() => window.__story.finish()); await sleep(500);
  p.L = await p.ev(() => window.__layout);
  await p.tap(...L(p).center); await sleep(700);
  const k1 = await p.ev(() => [window.__bogle.debug.phase, window.__bogle['tutKey']]);
  check('Day1 튜토리얼 STEP1 (빈 냄비 탭)', k1[0] === 'tutorial' && k1[1] === 'pour', k1.join('/'));
  await p.tap(...L(p).pots[0]); await sleep(400);
  await sleep(2900);
  check('보글보글 → STEP2 면 넣기', (await p.ev(() => window.__bogle['tutKey'])) === 'noodle');
  await p.tap(...L(p).pots[0]); await sleep(300);
  check('골든타임 탭 = PERFECT', (await p.ev(() => window.__bogle.debug.kitchen.pots[0].noodle)) === 'perfect');
  await sleep(3700);
  const k4 = await p.ev(() => window.__bogle['tutKey']);
  check('완성 → "1. 완성된 냄비를 탭하세요!"', k4 === 'serve', k4);
  await p.tap(...L(p).pots[0]); await sleep(300);
  const k5 = await p.ev(() => ({ key: window.__bogle['tutKey'], held: window.__bogle.debug.kitchen.pots[0].held, state: window.__bogle.debug.kitchen.pots[0].state, rev: window.__bogle.revenue }));
  check('완성 냄비 탭 → 자동 서빙 없이 HELD_POT + "2. 전달할 손님을 탭"', k5.key === 'serve-target' && k5.held && k5.state === 'READY' && k5.rev === 0, JSON.stringify(k5));
  await p.screenshot({ path: '/tmp/claude-0/v3/verify_tut_target.png' });
  const slot = await p.ev(() => window.__bogle['tutCustomer'].slot);
  await p.tap(...L(p).slotsBody[slot]); await sleep(1100);
  const k6 = await p.ev(() => ({ ph: window.__bogle.debug.phase, done: JSON.parse(localStorage.getItem('bogle-alley-tycoon-v3')).tutorialDone, rev: window.__bogle.revenue }));
  check('손님 탭 → 그 손님에게 서빙 + 튜토리얼 저장', k6.ph === 'run' && k6.done && k6.rev > 0, JSON.stringify(k6));
  check('Day1 페이지 에러 없음', p.errs.length === 0, p.errs.join(' | '));
  await p.close();
}

// ── 2. 재료 → 냄비 수동 투입 (냄비 1개여도 자동 투입 없음) ───────────
{
  const p = await open(BASE + '?stage=d2', store());
  await guests(p, [[0, spec({ toppings: ['egg', 'scallion'] }), 'kid']]);
  await cook(p, 0);
  await p.ev(() => { window.__bogle.debug.kitchen.pots[0].t = 0; });
  // SIMMERING이 아니라 READY여도 넣을 수 있어야 하므로, 먼저 계란을 READY 냄비에
  await p.tap(...L(p).st.egg); await sleep(250);
  const a = await p.ev(() => { const k = window.__bogle.debug.kitchen; return { held: k.held && k.held.t, toppings: [...k.pots[0].toppings], arrow: k.pots[0]['arrow'].visible }; });
  check('냄비 1개여도 계란 탭 → 자동으로 안 들어감 (선택 + "넣기" 화살표)', a.held === 'egg' && a.toppings.length === 0 && a.arrow, JSON.stringify(a));
  await p.tap(...L(p).pots[0]); await sleep(500);
  const b = await p.ev(() => { const k = window.__bogle.debug.kitchen; return { held: k.held, toppings: [...k.pots[0].toppings], state: k.pots[0].state }; });
  check('냄비를 탭해야 투입 (READY 라면에도 추가 토핑 가능)', !b.held && b.toppings.includes('egg') && b.state === 'READY', JSON.stringify(b));
  // 같은 재료 다시 탭 = 취소
  for (let i = 0; i < 3; i++) { await p.tap(...L(p).st.board); await sleep(120); }
  await p.tap(...L(p).st.board); await sleep(150);
  await p.tap(...L(p).st.board); await sleep(150);
  const c = await p.ev(() => window.__bogle.debug.kitchen.held);
  check('같은 재료 다시 탭 → 선택 취소', c === null, JSON.stringify(c));
  // 드래그 앤 드롭
  await p.drag(...L(p).st.board, ...L(p).pots[0]); await sleep(400);
  const d = await p.ev(() => [...window.__bogle.debug.kitchen.pots[0].toppings]);
  check('재료 → 냄비 드래그 앤 드롭', d.includes('scallion'), JSON.stringify(d));
  // 넣을 냄비가 없으면 선택 대기 안 함
  await p.tap(...L(p).trash[0]); await sleep(200);
  await p.tap(...L(p).st.egg); await sleep(200);
  check('넣을 냄비가 하나도 없으면 선택하지 않음', (await p.ev(() => window.__bogle.debug.kitchen.held)) === null);
  check('Day2 페이지 에러 없음', p.errs.length === 0, p.errs.join(' | '));
  await p.close();
}

// ── 3. 완성 냄비 → 내가 고른 손님 (2번/3번 슬롯 지정) + 취소·드래그 ──────
{
  const p = await open(BASE + '?stage=d2', store());
  await guests(p, [[0, spec(), 'kid'], [1, spec(), 'girl'], [2, spec(), 'teacher']]);
  await cook(p, 0);
  await p.tap(...L(p).pots[0]); await sleep(300);
  const a = await p.ev(() => { const s = window.__bogle.debug; return { held: s.hand.held && s.hand.held.kind, pot: s.kitchen.pots[0].state, left: s.customers.slots.map(c => c && c.ramenLeft), arrows: s.customers['arrows'].map(x => x.visible) }; });
  check('완성 냄비 탭 → 자동 서빙 안 됨 · 손님 3명 위에 "여기!" 화살표', a.held === 'pot' && a.pot === 'READY' && a.left.join() === '1,1,1,' && a.arrows.slice(0, 3).every(Boolean), JSON.stringify(a));
  await p.tap(...L(p).slots[2]); await sleep(900);
  const b = await p.ev(() => window.__bogle.debug.customers.slots.map(c => c && c.ramenLeft));
  check('3번 슬롯 손님(카드) 탭 → 정확히 그 손님에게만 서빙', b[2] === null || b[2] === 0 ? b[0] === 1 && b[1] === 1 : false, JSON.stringify(b));
  // 다시 탭 = 취소, 빈 곳 탭 = 취소
  await cook(p, 0);
  await p.tap(...L(p).pots[0]); await sleep(200);
  await p.tap(...L(p).pots[0]); await sleep(300);
  const c1 = await p.ev(() => !!window.__bogle.debug.hand.held);
  await p.tap(...L(p).pots[0]); await sleep(200);
  await p.tap(...L(p).empty); await sleep(300);
  const c2 = await p.ev(() => !!window.__bogle.debug.hand.held);
  check('같은 냄비 다시 탭 / 빈 곳 탭 → 선택 취소', !c1 && !c2, `${c1}/${c2}`);
  // 드래그 서빙 → 2번 슬롯
  await p.drag(...L(p).pots[0], ...L(p).slotsBody[1], 10); await sleep(900);
  const d = await p.ev(() => window.__bogle.debug.customers.slots.map(c => c && c.ramenLeft));
  check('완성 냄비를 2번 슬롯 손님에게 드래그 → 그 손님에게 서빙', (d[1] === null || d[1] === 0) && d[0] === 1, JSON.stringify(d));
  // 주문 안 한 손님에게는 거절
  await guests(p, [[3, spec({ ramen: 0, slush: true }), 'girl']], true);
  await cook(p, 1);
  await p.tap(...L(p).pots[1]); await sleep(200);
  await p.tap(...L(p).slots[3]); await sleep(300);
  const e = await p.ev(() => ({ held: !!window.__bogle.debug.hand.held, pot: window.__bogle.debug.kitchen.pots[1].state }));
  check('라면을 안 시킨 손님 탭 → 거절, 계속 들고 있음', e.held && e.pot === 'READY', JSON.stringify(e));
  check('서빙 테스트 페이지 에러 없음', p.errs.length === 0, p.errs.join(' | '));
  await p.close();
}

// ── 4. 슬러시: 레버 → 완성 컵 대기 → 컵 탭 → 지정 손님 / 휴지통 ───────
{
  const p = await open(BASE + '?stage=d3', store());
  await sleep(1200);
  await guests(p, [[1, spec({ ramen: 0, slush: true }), 'girl'], [3, spec({ ramen: 0, slush: true }), 'kid']]);
  const geo = await p.ev(() => window.__leverGeo);
  const ky = await p.ev(() => window.__bogle.debug.slush.knobY);
  const [ax, ay] = p.S(geo.x, ky), [, by] = p.S(geo.x, geo.bottom);
  await p.mouse.move(ax, ay); await p.mouse.down();
  for (let k = 1; k <= 8; k++) { await p.mouse.move(ax, ay + (by - ay) * 0.55 * k / 8); await sleep(16); }
  let st;
  for (let i = 0; i < 400; i++) { st = await p.ev(() => { const s = window.__bogle.debug.slush; return { f: s.fill, pull: s.pull }; }); if (st.f >= 0.83) break; await sleep(8); }
  await p.mouse.up(); await sleep(700);
  const a = await p.ev(() => { const s = window.__bogle.debug; return { st: s.slush.state, last: s.slush.last, done: s.customers.slots.map(c => c && c.side.slush.done) }; });
  check('레버 드래그 → 초록에서 놓기 = PERFECT, 손님에게 자동으로 안 날아감(CUP_READY)', a.st === 'CUP_READY' && a.last && a.last.perfect && !a.done[1] && !a.done[3], JSON.stringify(a));
  check('레버 터치 영역 ⟂ 게이지·컵 (좌우 분리)', geo.zoneX >= geo.machine.x1 && geo.zoneX > geo.cup.x1 && geo.zoneX > geo.gauge.x1, `레버 x≥${geo.zoneX}, 컵 ${geo.cup.x0}~${geo.cup.x1}, 게이지 ${geo.gauge.x0}~${geo.gauge.x1}`);
  await p.tap(...L(p).cup); await sleep(250);
  const b = await p.ev(() => ({ held: window.__bogle.debug.hand.held && window.__bogle.debug.hand.held.kind, h: window.__bogle.debug.slush.held }));
  check('완성 컵 탭 → HELD_SLUSH', b.held === 'slush' && b.h, JSON.stringify(b));
  await p.tap(...L(p).slotsBody[3]); await sleep(900);
  const c = await p.ev(() => window.__bogle.debug.customers.slots.map(x => x && x.side.slush.done));
  check('4번 슬롯 손님 탭 → 그 손님만 슬러시 받음', c[3] === null || c[3] === true ? c[1] === false : false, JSON.stringify(c));
  // 휴지통
  await p.ev(() => { const s = window.__bogle.debug.slush; s.pressLever(3); s.setPull(0.8); });
  await sleep(1000);
  await p.ev(() => window.__bogle.debug.slush.releaseLever()); await sleep(100);
  const d0 = await p.ev(() => window.__bogle.debug.slush.state);
  await p.tap(...L(p).cupTrash); await sleep(200);
  const d1 = await p.ev(() => window.__bogle.debug.slush.state);
  check('컵 옆 휴지통 → 잘못 뽑은 컵 버리기', d0 === 'CUP_READY' && d1 === 'IDLE', `${d0} → ${d1}`);
  // 컵 → 손님 드래그
  await p.ev(() => { const s = window.__bogle.debug.slush; s.pressLever(3); s.setPull(0.8); });
  await sleep(1000);
  await p.ev(() => window.__bogle.debug.slush.releaseLever()); await sleep(100);
  await p.drag(...L(p).cup, ...L(p).slotsBody[1], 10); await sleep(900);
  const e = await p.ev(() => window.__bogle.debug.customers.slots.map(x => x && x.side.slush.done));
  check('완성 컵 → 2번 슬롯 손님 드래그 서빙', e[1] === null || e[1] === true, JSON.stringify(e));
  // 넘침 → 2번 닦기
  await p.ev(() => { const s = window.__bogle.debug.slush; s.pressLever(5); s.setPull(1); });
  await sleep(1500);
  const o1 = await p.ev(() => window.__bogle.debug.slush.state);
  await sleep(2100);
  await p.tap(...L(p).cup); await sleep(120); await p.tap(...L(p).cup); await sleep(200);
  check('100% 초과 → 넘침 → 컵 2번 탭으로 복구', o1 === 'OVERFLOW' && (await p.ev(() => window.__bogle.debug.slush.state)) === 'IDLE', o1);
  check('슬러시 페이지 에러 없음', p.errs.length === 0, p.errs.join(' | '));
  await p.close();
}

// ── 5. 전방 매대: 떡볶이 철판 (윤기 → 졸음 → 젓기, 4컵 → 리필) ───────────
{
  const p = await open(BASE + '?stage=d3', store());
  await p.ev(() => { window.__speed = 4; });
  for (let k = 0; k < 80; k++) { if ((await p.ev(() => window.__bogle.debug.front.tteok)) === 'GLOSSY') break; await sleep(50); }
  await p.ev(() => { window.__speed = 1; });
  const g0 = await p.ev(() => ({ s: window.__bogle.debug.front.tteok, n: window.__bogle.debug.front.portions }));
  check('Day3 시작: 떡볶이 철판 조리 → 윤기(GLOSSY) 4컵', g0.s === 'GLOSSY' && g0.n === 4, JSON.stringify(g0));
  await guests(p, [[0, spec({ ramen: 0, tteok: true }), 'kid'], [2, spec({ ramen: 0, tteok: true }), 'girl']]);
  await p.tap(...L(p).griddle); await sleep(250);
  const a = await p.ev(() => ({ held: window.__bogle.debug.hand.held && window.__bogle.debug.hand.held.kind, n: window.__bogle.debug.front.portions }));
  check('윤기 나는 철판 탭 → HELD_TTEOKBOKKI (자동 서빙 없음)', a.held === 'tteok' && a.n === 4, JSON.stringify(a));
  await p.tap(...L(p).slots[2]); await sleep(900);
  const b = await p.ev(() => ({ done: window.__bogle.debug.customers.slots.map(c => c && c.side.tteok.done), n: window.__bogle.debug.front.portions }));
  check('3번 슬롯 손님 탭 → 종이컵 떡볶이 서빙 (4→3컵)', (b.done[2] === null || b.done[2] === true) && b.done[0] === false && b.n === 3, JSON.stringify(b));
  // 졸아붙음 → 좌우 스와이프로 젓기
  await p.ev(() => { window.__bogle.debug.front.tt = 99999; }); await sleep(200);
  const s1 = await p.ev(() => window.__bogle.debug.front.tteok);
  const [gx, gy] = L(p).griddle;
  await p.drag(gx - 14, gy, gx + 14, gy, 6); await sleep(300);
  const s2 = await p.ev(() => window.__bogle.debug.front.tteok);
  check('방치 → STICKY("저어주세요!") → 좌우 스와이프로 윤기 회복', s1 === 'STICKY' && s2 === 'GLOSSY', `${s1} → ${s2}`);
  await p.ev(() => { window.__bogle.debug.front.tt = 99999; }); await sleep(200);
  await p.tap(...L(p).ladle); await sleep(200);
  check('국자 버튼 탭으로도 젓기', (await p.ev(() => window.__bogle.debug.front.tteok)) === 'GLOSSY');
  // 4컵 다 팔면 EMPTY → 탭 리필
  await p.ev(() => { const f = window.__bogle.debug.front; f.takeTteok(); f.takeTteok(); f.takeTteok(); });
  const e0 = await p.ev(() => window.__bogle.debug.front.tteok);
  await p.tap(...L(p).griddle); await sleep(200);
  const e1 = await p.ev(() => ({ s: window.__bogle.debug.front.tteok, n: window.__bogle.debug.front.portions }));
  check('4컵 서빙 후 EMPTY → 철판 탭 1번으로 리필', e0 === 'EMPTY' && e1.s === 'COOK' && e1.n === 4, `${e0} → ${JSON.stringify(e1)}`);
  // 탐 → 3번 긁기
  await p.ev(() => { const f = window.__bogle.debug.front; f.tteok = 'STICKY'; f.tt = 99999; }); await sleep(200);
  const bt = await p.ev(() => window.__bogle.debug.front.tteok);
  for (let i = 0; i < 3; i++) { await p.tap(...L(p).griddle); await sleep(120); }
  check('졸음 방치 → BURNT → 3번 탭으로 긁어내기', bt === 'BURNT' && (await p.ev(() => window.__bogle.debug.front.tteok)) === 'EMPTY', bt);
  await p.screenshot({ path: '/tmp/claude-0/v3/verify_tteok.png' });
  check('떡볶이 페이지 에러 없음', p.errs.length === 0, p.errs.join(' | '));
  await p.close();
}

// ── 6. 전방 매대: 어묵탕 (Day 4) + 설거지 연동 ─────────────────────────
{
  const p = await open(BASE + '?stage=d4', store());
  await guests(p, [[1, spec({ ramen: 0, odeng: true }), 'kid'], [3, spec({ ramen: 0, odeng: true }), 'teacher']]);
  await p.tap(...L(p).odeng); await sleep(200);
  const a = await p.ev(() => ({ s: window.__bogle.debug.front.odeng, n: window.__bogle.debug.front.sticks }));
  await sleep(2700);
  const a2 = await p.ev(() => window.__bogle.debug.front.odeng);
  check('빈 어묵탕 탭 → 꼬치 3개 COOK → 2.5초 뒤 READY', a.s === 'COOK' && a.n === 3 && a2 === 'READY', `${JSON.stringify(a)} → ${a2}`);
  await p.tap(...L(p).odeng); await sleep(200);
  const h = await p.ev(() => window.__bogle.debug.hand.held && window.__bogle.debug.hand.held.kind);
  await p.tap(...L(p).slots[3]); await sleep(900);
  const b = await p.ev(() => ({ done: window.__bogle.debug.customers.slots.map(c => c && c.side.odeng.done), n: window.__bogle.debug.front.sticks }));
  check('익은 어묵탕 탭(HELD_ODENG) → 4번 슬롯 손님 탭 → 그 손님만 받음 (3→2개)', h === 'odeng' && (b.done[3] === null || b.done[3] === true) && b.done[1] === false && b.n === 2, `${h} ${JSON.stringify(b)}`);
  // 그릇 0개 → 라면 서빙 막힘 → 설거지 후 성공
  await guests(p, [[0, spec(), 'girl']]);
  await p.ev(() => { const k = window.__bogle.debug.kitchen; k.cleanBowls = 0; k.dirtyBowls = 1; k['drawShelf'](); });
  await cook(p, 0);
  await p.tap(...L(p).pots[0]); await sleep(200);
  await p.tap(...L(p).slots[0]); await sleep(300);
  const c = await p.ev(() => ({ pot: window.__bogle.debug.kitchen.pots[0].state, held: !!window.__bogle.debug.hand.held }));
  check('깨끗한 그릇 0개 → 손님 탭해도 서빙 막힘 (냄비 READY·들고 있음)', c.pot === 'READY' && c.held, JSON.stringify(c));
  for (let i = 0; i < 3; i++) { await p.tap(...L(p).st.sink); await sleep(150); }
  await sleep(500);
  await p.tap(...L(p).slots[0]); await sleep(900);
  check('설거지 3탭 → 그릇 생김 → 다시 손님 탭하면 서빙', (await p.ev(() => window.__bogle.debug.kitchen.pots[0].state)) === 'EMPTY');
  check('어묵 페이지 에러 없음', p.errs.length === 0, p.errs.join(' | '));
  await p.close();
}

// ── 7. 소품: 오락기·TV 애니메이션 + 효과 ──────────────────────────────
{
  const p = await open(BASE + '?stage=d2', store({ upgrades: { burner: false, knife: false, autowash: false, arcade: true, tv: true } }));
  const f = async () => p.ev(() => { const fb = window.__bogle.debug.front; return [fb['tv'].anims.currentFrame.index, fb['arcade'].anims.currentFrame.index, fb['tv'].anims.isPlaying, fb['arcade'].anims.isPlaying]; });
  const seen = { tv: new Set(), ar: new Set() };
  for (let i = 0; i < 12; i++) { const [t, a] = await f(); seen.tv.add(t); seen.ar.add(a); await sleep(110); }
  check('브라운관 TV·미니 오락기 6프레임 애니메이션 계속 재생', seen.tv.size >= 4 && seen.ar.size >= 4, `TV 프레임 ${[...seen.tv]} / 오락기 ${[...seen.ar]}`);
  const ps = await p.ev(() => window.__bogle.debug.customers.patienceScale);
  const r0 = await p.ev(() => window.__bogle.revenue);
  await p.ev(() => { window.__bogle.spawnIn = 1e12; window.__speed = 4; }); await sleep(2200); await p.ev(() => { window.__speed = 1; });
  const r1 = await p.ev(() => window.__bogle.revenue);
  check('오락기 효과: 인내심 25% 천천히 + 8초마다 +15G', ps === 0.75 && r1 - r0 >= 15, `scale ${ps}, +${r1 - r0}G`);
  await p.ev(() => { const s = window.__bogle; s.combo = 4; s['onComplete']({ slot: 0, kind: 'kid', patience: 1, mistake: false, spec: { ramen: 1 } }); });
  const fv = await p.ev(() => ({ left: window.__bogle.feverLeft, total: window.__bogle['feverTotal'] }));
  check('TV 효과: 피버 타임 8초 + 3초 = 11초', fv.total === 11000 && fv.left > 0, JSON.stringify(fv));
  await p.screenshot({ path: '/tmp/claude-0/v3/verify_props.png' });
  check('소품 페이지 에러 없음', p.errs.length === 0, p.errs.join(' | '));
  await p.close();
}

// ── 8. 히든 스테이지 · 별 5개 · 무한 모드 ──────────────────────────────
{
  // 별 3개 최초 달성 → 히든1 해금
  const p = await open(BASE, store({ best: [3, 0, 0, 0, 0], unlocked: 2, story: ['d1', 'd2', 'd3', 'd4', 'd5'] }), { closeIntro: false });
  const t1 = await p.ev(() => ({ h1: JSON.parse(localStorage.getItem('bogle-alley-tycoon-v3') || '{}').h1Unlocked, tiles: window.__titleLayout.tiles }));
  check('별 3개 달성 기록 → 타이틀에 히든 스테이지 1 배너 해금', t1.h1 === true && !!t1.tiles.h1, JSON.stringify(t1.h1));
  await p.tap(...t1.tiles.h1); await sleep(900);
  const s1 = await p.ev(() => ({ id: window.__bogle.debug.cfg.id, story: window.__story && window.__story.key }));
  check('히든1 진입 시 스토리 컷신(여고생 반장)', s1.id === 'h1' && s1.story === 'h1', JSON.stringify(s1));
  await p.ev(() => window.__story && window.__story.finish()); await sleep(400);
  p.L = await p.ev(() => window.__layout);
  await p.tap(...p.L.center); await sleep(1600);
  const kinds = await p.ev(() => { const s = window.__bogle; s.spawnIn = 0; return s.debug.customers.list.map(c => c.kind + ':' + JSON.stringify(c.spec)); });
  await p.ev(() => { const s = window.__bogle; s.revenue = 2000; s.timeLeft = 50; }); await sleep(2600);
  const r = await p.ev(() => ({ res: window.__lastResult, p: JSON.parse(localStorage.getItem('bogle-alley-tycoon-v3')) }));
  check('히든1 클리어 → 보너스 500G + 별 4개 도전 등급', r.res.cleared && r.res.bonus === 500 && r.p.h1Cleared, `${JSON.stringify({ cleared: r.res.cleared, bonus: r.res.bonus })} ${kinds.slice(0, 2).join(' | ')}`);
  await sleep(2500);
  await p.screenshot({ path: '/tmp/claude-0/v3/verify_h1_receipt.png' });
  await p.close();
}
{
  // 유도부: 라면 2그릇을 같은 손님에게 2번
  const p = await open(BASE + '?stage=h2', store({ h1Unlocked: true, h1Cleared: true, h2Unlocked: true, best: [3, 3, 3, 3, 1] }));
  await guests(p, [[2, { ramen: 2, toppings: [], slush: false, tteok: true, odeng: false }, 'judo']]);
  // 냄비를 하나씩 완성 → 바로 서빙 (먼저 끓인 냄비가 기다리다 타지 않게)
  await cook(p, 0);
  await p.tap(...L(p).pots[0]); await sleep(200); await p.tap(...L(p).slots[2]); await sleep(900);
  const a = await p.ev(() => { const c = window.__bogle.debug.customers.slots[2]; return { left: c.ramenLeft, st: c.state }; });
  check('유도부원 x2: 1그릇 서빙 후에도 대기 (1/2)', a.left === 1 && a.st === 'wait', JSON.stringify(a));
  await cook(p, 1);
  await p.tap(...L(p).pots[1]); await sleep(200); await p.tap(...L(p).slots[2]); await sleep(900);
  // (냄비 2개를 끓이는 사이 철판이 졸았을 수 있으니 윤기 상태로 맞춰 둠)
  await p.ev(() => { const f = window.__bogle.debug.front; f.tteok = 'GLOSSY'; f.tt = 0; f.portions = 4; f['refresh'](); });
  await p.tap(...L(p).griddle); await sleep(200);
  const tips0 = await p.ev(() => window.__bogle.stats.tips);
  await p.tap(...L(p).slots[2]); await sleep(1300);
  const b = await p.ev(() => ({ tips: window.__bogle.stats.tips, served: window.__bogle.stats.served }));
  check('라면 2번 + 떡볶이 → 완성 + 왕팁(일반 팁 x3)', b.served === 1 && b.tips - tips0 >= 30, JSON.stringify({ ...b, tips0 }));
  await p.ev(() => { const s = window.__bogle; s.revenue = 3000; s.timeLeft = 50; }); await sleep(2600);
  const r = await p.ev(() => JSON.parse(localStorage.getItem('bogle-alley-tycoon-v3')));
  check('유도부 클리어 → 별 5개 등급 + 무한 모드 해금', r.h2Cleared && r.endlessUnlocked, JSON.stringify({ h2: r.h2Cleared, endless: r.endlessUnlocked }));
  await p.close();
  // 타이틀: 별 5칸 + 무한 모드 타일
  const t = await open(BASE, r, { closeIntro: false });
  await t.screenshot({ path: '/tmp/claude-0/v3/verify_title5.png' });
  const tl = await t.ev(() => window.__titleLayout);
  check('타이틀: 무한 리필 서바이벌 타일 열림', !!tl.tiles.endless);
  await t.close();
}
{
  const p = await open(BASE + '?stage=endless', store({ h2Cleared: true, endlessUnlocked: true, h1Cleared: true }));
  const a = await p.ev(() => ({ lives: window.__bogle.lives, dur: window.__bogle.debug.cfg.durationSec }));
  await guests(p, [[0, spec(), 'kid'], [1, spec(), 'kid'], [2, spec(), 'kid']]);
  await p.ev(() => { const cs = window.__bogle.debug.customers; cs.frozen = false; cs.list.forEach(c => { c.patience = 0.01; }); });
  await sleep(2600);
  const b = await p.ev(() => ({ lives: window.__bogle.lives, phase: window.__bogle.debug.phase, res: window.__lastResult && window.__lastResult.stage }));
  check('무한 모드: 시간 제한 없음 · 손님 3명 놓치면 종료', a.lives === 3 && a.dur === 0 && b.lives === 0 && b.phase === 'end' && b.res === 'endless', JSON.stringify({ a, b }));
  check('히든·무한 페이지 에러 없음', p.errs.length === 0, p.errs.join(' | '));
  await p.close();
}

// ── 9. 별 4·5개 계산 ────────────────────────────────────────────────
{
  const p = await open(BASE + '?stage=d2', store({ h1Cleared: true, h2Cleared: true }));
  await p.ev(() => { const s = window.__bogle; s.revenue = 99999; s.timeLeft = 50; }); await sleep(2600);
  const r5 = await p.ev(() => window.__lastResult.stars);
  await p.close();
  const q = await open(BASE + '?stage=d2', store({ h1Cleared: true }));
  await q.ev(() => { const s = window.__bogle; s.revenue = 99999; s.timeLeft = 50; }); await sleep(2600);
  const r4 = await q.ev(() => window.__lastResult.stars);
  await sleep(3000);
  await q.screenshot({ path: '/tmp/claude-0/v3/verify_receipt4.png' });
  await q.close();
  const z = await open(BASE + '?stage=d2', store());
  await z.ev(() => { const s = window.__bogle; s.revenue = 99999; s.timeLeft = 50; }); await sleep(2600);
  const r3 = await z.ev(() => window.__lastResult.stars);
  await z.close();
  check('별 상한: 기본 3 → 히든1 클리어 4 → 히든2 클리어 5', r3 === 3 && r4 === 4 && r5 === 5, `${r3}/${r4}/${r5}`);
}

console.log(results.join('\n'));
const fail = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${results.length - fail}/${results.length} PASS`);
await browser.close();
