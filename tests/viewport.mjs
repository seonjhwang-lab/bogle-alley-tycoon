// 뷰포트별 풀블리드 검증 + 슬러시 레버 드래그 테스트
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const base = process.argv[2] || 'http://localhost:5173/';
const outDir = process.argv[3] || '/tmp/claude-0/v22';
const vps = (process.env.VPS || '360x640,360x520,390x660,412x700,390x844').split(',').map(s => s.split('x').map(Number));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
const report = [];
for (const [w, h] of vps) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const measure = () => page.evaluate(() => {
    const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); const g = window.__game;
    return { left: +r.left.toFixed(2), right: +(innerWidth - r.right).toFixed(2), top: +r.top.toFixed(2), bottom: +(innerHeight - r.bottom).toFixed(2),
      gw: g.config.width, gh: g.config.height, scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
      layoutBottom: window.__layout ? window.__layout.front.y : null };
  });
  const toScreen = (x, y) => page.evaluate(([x, y]) => {
    const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__game;
    return [r.left + x * r.width / g.config.width, r.top + y * r.height / g.config.height];
  }, [x, y]);
  // 1) 타이틀 (스토리는 본 것으로, 히든 1 해금 상태)
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.setItem('bogle-alley-tycoon-v3', JSON.stringify({ wallet: 1200, upgrades: { burner: false, knife: false, autowash: false, arcade: true, tv: true },
    best: [3, 2, 1, 0, 0], bestRevenue: [600, 700, 500, 0, 0], unlocked: 4, tutorialDone: true, h1Unlocked: true, h1Cleared: false, h2Unlocked: false, h2Cleared: false,
    endlessUnlocked: false, hiddenBest: { h1: 0, h2: 0 }, endlessBest: { revenue: 0, served: 0 }, story: ['d1', 'd2', 'd3', 'd4', 'd5', 'h1', 'h2', 'endless'], news: [] })));
  await page.goto(base, { waitUntil: 'networkidle0' }); await sleep(1200);
  const mt = await measure();
  await page.screenshot({ path: `${outDir}/title_${w}x${h}.png` });
  // 2) Day 3 인트로 → 영업 (레버 가이드)
  await page.goto(base + (base.includes('?') ? '&' : '?') + 'day=3', { waitUntil: 'networkidle0' }); await sleep(1500);
  await page.screenshot({ path: `${outDir}/intro3_${w}x${h}.png` });
  const [cx, cy] = await toScreen(120, 20); await page.mouse.click(cx, cy);
  await sleep(1300);
  await page.screenshot({ path: `${outDir}/guide3_${w}x${h}.png` });
  const mg = await measure();
  // 3) 레버 드래그: 손잡이를 잡고 60%까지 → 초록 구간에 들어오면 떼기
  const L = await page.evaluate(() => { const s = window.__bogle.debug.slush; return { knobY: s.knobY, state: s.state }; });
  const lever = await page.evaluate(() => ({ x: 222, top: 0 }));
  const geo = await page.evaluate(() => window.__leverGeo || null);
  const [kx, ky] = await toScreen(geo.x, L.knobY);
  const [, by] = await toScreen(geo.x, geo.bottom);
  await page.mouse.move(kx, ky); await page.mouse.down();
  let shot = false, peakPull = 0;
  for (let k = 1; k <= 10; k++) { await page.mouse.move(kx, ky + (by - ky) * 0.6 * k / 10); await sleep(16); }
  let st;
  for (let i = 0; i < 300; i++) {
    st = await page.evaluate(() => { const s = window.__bogle.debug.slush; return { fill: s.fill, pull: s.pull, state: s.state }; });
    peakPull = Math.max(peakPull, st.pull);
    if (!shot && st.fill > 0.45) { await page.screenshot({ path: `${outDir}/pull_${w}x${h}.png` }); shot = true; }
    if (st.fill >= 0.84) break;
    await sleep(10);
  }
  const fillAtRelease = st.fill;
  await page.mouse.up();
  await sleep(60);
  const after = await page.evaluate(() => { const s = window.__bogle.debug.slush; return { state: s.state, pull: s.pull, knobY: s.knobY }; });
  await page.screenshot({ path: `${outDir}/release_${w}x${h}.png` });
  await sleep(400);
  report.push({ vp: `${w}x${h}`, title: mt, game: mg, lever: { peakPull: +peakPull.toFixed(2), fillAtRelease: +fillAtRelease.toFixed(3), after }, errs });
  await page.close();
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
