import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:5173/?day=5';
const browser = await puppeteer.launch({ args: [...chromium.args], executablePath: await chromium.executablePath(), headless: true,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } });
const page = await browser.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
// 스토리 컷신은 본 것으로 처리 (컷신 화면에서 무작위 탭만 하다 끝나지 않게)
await page.goto(url.split('?')[0], { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  localStorage.setItem('bogle-alley-tycoon-v3', JSON.stringify({
    wallet: 0, upgrades: { burner: false, knife: false, autowash: false, arcade: true, tv: true },
    best: [3, 3, 3, 3, 0], bestRevenue: [0, 0, 0, 0, 0], unlocked: 5, tutorialDone: true,
    story: ['d1', 'd2', 'd3', 'd4', 'd5', 'h1', 'h2', 'endless'], news: [],
  }));
});
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const rect = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, gh: window.__game.config.height }; });
const S = (x, y) => [rect.l + x * rect.w / 240, rect.t + y * rect.h / rect.gh];
const L = await page.evaluate(() => window.__layout);
const H = L.H, KY = L.pots[0][1] - 39, PY = L.st.board[1] - 22;
const tap = async (x, y) => { const [a, b] = S(x, y); await page.mouse.click(a, b); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const state = () => page.evaluate(() => { const s = window.__bogle; const k = s.debug.kitchen;
  return { phase: s.debug.phase, pots: k.pots.map(p => p.state), held: k.held && k.held.t, blocked: k.blockedBy, clean: k.cleanBowls, dirty: k.dirtyBowls,
    slush: s.debug.slush.state, cust: s.debug.customers.list.length, rev: s.revenue, time: Math.round(s.timeLeft / 1000) }; });

await tap(...L.center); await sleep(300);           // 인트로 닫기
await page.evaluate(() => { window.__speed = 3; });

// ── 1) 무작위 연타 ─────────────────────────────────────────
const POTS = L.pots;
const ZONES = [
  () => POTS[Math.floor(Math.random() * 4)],                                   // 냄비
  () => [6 + Math.random() * 120, KY + Math.random() * (PY - KY)],             // 주방 전체
  () => [2 + Math.random() * 236, PY + Math.random() * (H - PY)],              // 손질대
  () => [130 + Math.random() * 110, L.lever.top - 10 + Math.random() * 90],    // 슬러시(게이지·컵·레버)
  () => [Math.random() * 240, 32 + Math.random() * (KY - 32)],                 // 카운터·카드
  () => [56 + Math.random() * 120, PY + 6 + Math.random() * 40],               // 계란·치즈
  () => L.trash[0],                                                            // 휴지통
];
let n = 0;
const t0 = Date.now();
while (Date.now() - t0 < 26000) {
  const r = Math.random();
  if (r < 0.08) {               // 같은 냄비 미친 듯이 연타
    const [x, y] = POTS[Math.floor(Math.random() * 4)];
    for (let k = 0; k < 8; k++) { await tap(x, y); n++; }
  } else if (r < 0.16) {        // 손질대 → 냄비 드래그
    const [sx, sy] = [L.st.board, L.st.egg, L.st.cheese][Math.floor(Math.random() * 3)];
    const [ex, ey] = POTS[Math.floor(Math.random() * 4)];
    const [a, b] = S(sx, sy), [c, d] = S(ex, ey);
    await page.mouse.move(a, b); await page.mouse.down();
    for (let k = 1; k <= 5; k++) await page.mouse.move(a + (c - a) * k / 5, b + (d - b) * k / 5);
    await page.mouse.up(); n++;
  } else if (r < 0.24) {        // 슬러시 레버: 아무 깊이로 당겼다가 아무 때나 놓기 (위·아래로 흔들기 포함)
    const [a, b] = S(L.lever.x, L.lever.top + Math.random() * 10);
    const [, e] = S(L.lever.x, L.lever.top + Math.random() * (L.lever.bottom - L.lever.top + 30));
    await page.mouse.move(a, b); await page.mouse.down();
    for (let k = 1; k <= 6; k++) { await page.mouse.move(a + (Math.random() - 0.5) * 40, b + (e - b) * k / 6); await sleep(Math.random() * 120); }
    if (Math.random() < 0.3) await page.mouse.move(a, b - 40);
    await sleep(Math.random() * 600); await page.mouse.up(); n++;
  } else {
    const [x, y] = ZONES[Math.floor(Math.random() * ZONES.length)]();
    await tap(x, y); n++;
  }
  const st = await page.evaluate(() => window.__bogle.debug.phase);
  if (st !== 'run') { await page.evaluate(() => { if (window.__bogle.debug.phase === 'pause') {} }); }
  if (st === 'end' || st === 'pause') break;
}
console.log('random actions:', n, 'state after:', JSON.stringify(await state()));

// ── 2) 복구 검증: 탭만으로 모든 냄비를 비우고 한 바퀴 조리 ─────────────
await page.evaluate(() => { window.__speed = 1; });
const s1 = await state();
if (s1.phase !== 'run') { console.log('phase not run:', s1.phase); }
// 토핑 선택 중이면 취소되도록 빈 곳 탭은 하지 않고 기다림 (6초 자동 취소)
for (let i = 0; i < 4; i++) {
  for (let guard = 0; guard < 8; guard++) {
    const st = (await state()).pots[i];
    if (st === 'EMPTY') break;
    if (st === 'BURNT') { await tap(...POTS[i]); await sleep(300); continue; }
    if (['HEATING', 'BOILING', 'SIMMERING', 'READY'].includes(st)) { await tap(...L.trash[i]); await sleep(300); continue; } // 휴지통
    await sleep(300);
  }
}
// 슬러시도 먹통 없이 IDLE로 돌아오는지 (넘침이면 2초 후 컵 2번 탭)
for (let guard = 0; guard < 6; guard++) {
  const sl = (await state()).slush;
  if (sl === 'IDLE') break;
  if (sl === 'HOLDING') { await page.mouse.up(); }
  if (sl === 'OVERFLOW') { await sleep(2100); await tap(...L.cup); await sleep(120); await tap(...L.cup); }
  if (sl === 'CUP_READY') { await tap(...L.cupTrash); }   // v3: 완성 컵은 옆 휴지통으로 버림 (컵 탭 = 집기)
  await sleep(300);
}
const s2 = await state();
console.log('slush after recovery:', s2.slush);
console.log('after recovery:', JSON.stringify(s2.pots), 'held:', s2.held);
// 각 냄비 풀사이클: 물 → (3.2s) 면 → (3.7s) READY
for (let i = 0; i < 4; i++) { await tap(...POTS[i]); await sleep(300); }
await sleep(3000);
for (let i = 0; i < 4; i++) await tap(...POTS[i]);
const s3 = await state();
await sleep(3900);
const s4 = await state();
console.log('after noodle:', JSON.stringify(s3.pots), ' after cook:', JSON.stringify(s4.pots));
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
await page.screenshot({ path: '/tmp/claude-0/stress_end.png' });
await browser.close();
