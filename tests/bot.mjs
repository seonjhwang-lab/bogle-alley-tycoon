// 자동 플레이 봇 (v3: 2단계 수동 타겟팅)
//   node bot.mjs [none|all|props|full] [골든 적중률 0.8] [반응 ms 250]
//   STAGES=d1,d2,h1  (기본 d1~d5) · SHOTS=n 중간 스크린샷 · SPEED=4
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const [,, upgrades = 'none', perfectRate = '0.8', reaction = '250'] = process.argv;
const browser = await puppeteer.launch({ args: [...chromium.args], executablePath: await chromium.executablePath(), headless: true,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1 } });
const results = [];
const stages = (process.env.STAGES || 'd1,d2,d3,d4,d5').split(',');
const SPEED = Number(process.env.SPEED || 4);
const DUR = { d1: 60, d2: 75, d3: 90, d4: 100, d5: 120, h1: 90, h2: 100, endless: 240 };
for (const stage of stages) {
  const page = await browser.newPage();
  page.setDefaultTimeout(600000);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await page.evaluate((up) => {
    const all = up === 'all' || up === 'full', props = up === 'props' || up === 'full';
    const data = {
      wallet: 0, upgrades: { burner: all, knife: all, autowash: all, arcade: props, tv: props },
      best: [3, 3, 3, 3, 3], bestRevenue: [0, 0, 0, 0, 0], unlocked: 5, tutorialDone: true,
      h1Unlocked: true, h1Cleared: false, h2Unlocked: true, h2Cleared: false, endlessUnlocked: true,
      hiddenBest: { h1: 0, h2: 0 }, endlessBest: { revenue: 0, served: 0 },
      story: ['d1', 'd2', 'd3', 'd4', 'd5', 'h1', 'h2', 'endless'], news: [],
    };
    localStorage.setItem('bogle-alley-tycoon-v3', JSON.stringify(data));
  }, upgrades);
  await page.goto('http://localhost:5173/?stage=' + stage, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate((PR, REACT, SPEED) => {
    window.__speed = SPEED;
    const s = window.__bogle;
    s.children.list.filter(o => o.type === 'Rectangle' && o.input).forEach(o => o.emit('pointerdown'));
    const d = s.debug;
    const k = d.kitchen, cs = d.customers, sl = d.slush, fb = d.front, hand = d.hand;
    const assign = new Map();   // pot index → customer id (토핑 맞추기)
    const plan = new Map();     // pot index → 면 넣을 시각
    let target = null;          // 손에 든 것을 줄 손님
    let toppingPot = null;      // 재료를 집은 뒤 넣을 냄비
    let lastAct = 0;
    const act = () => { const now = performance.now(); if (now - lastAct < REACT / SPEED) return false; lastAct = now; return true; };
    const byPatience = (a, b) => a.patience - b.patience;
    const wantsOf = (kind) => cs.waiting.filter(c => cs.wants(c, kind)).sort(byPatience);
    const exactFor = (c, p) => c.spec.toppings.length === p.toppings.size && c.spec.toppings.every(t => p.toppings.has(t));
    setInterval(() => {
      if (d.phase !== 'run') return;
      if (!act()) return;
      const cat = d.cat; if (cat && k.blockedBy) { cat.shoo(); return; }
      // 1) 손에 든 것 → 정한 손님에게
      if (hand.held) {
        if (target && cs.wants(target, { pot: 'ramen', slush: 'slush', tteok: 'tteok', odeng: 'odeng' }[hand.held.kind])) {
          if (!hand.tapCustomer(target)) hand.cancel();
        } else hand.cancel();
        target = null;
        return;
      }
      // 2) 집어 둔 재료 → 냄비
      if (k.held && toppingPot) { k.tapPot(toppingPot); toppingPot = null; return; }
      const pots = k.pots.filter(p => p.active);
      // 3) 완성 라면: 정확히 맞는 손님 우선 → 집기
      for (const p of pots) if (p.state === 'READY') {
        const ws = wantsOf('ramen');
        const want = assign.get(p.index);
        const c = ws.find(x => x.id === want && exactFor(x, p)) || ws.find(x => exactFor(x, p));
        if (c && (!k.dishes || k.cleanBowls > 0)) { hand.select({ kind: 'pot', pot: p }); target = c; assign.delete(p.index); return; }
      }
      // 4) 슬러시 컵
      if (sl.cupReady) {
        const c = wantsOf('slush')[0];
        if (c) { hand.select({ kind: 'slush' }); target = c; } else sl.discardCup();
        return;
      }
      // 5) 떡볶이 철판
      if (fb.tteok === 'STICKY') { fb.stir(); return; }
      if (fb.tteok === 'BURNT') { fb['scrub'](); return; }
      if (fb.tteok === 'EMPTY' && wantsOf('tteok').length) { fb.refill(); return; }
      if (fb.tteokServable) { const c = wantsOf('tteok')[0]; if (c) { hand.select({ kind: 'tteok' }); target = c; return; } }
      // 6) 어묵탕
      if (fb.odeng === 'EMPTY' && wantsOf('odeng').length) { fb.startOdeng(); return; }
      if (fb.odengServable) { const c = wantsOf('odeng')[0]; if (c) { hand.select({ kind: 'odeng' }); target = c; return; } }
      // 7) 탄 냄비
      for (const p of pots) if (p.state === 'BURNT') { k.tapPot(p); return; }
      // 8) 면 넣기 (골든 확률)
      for (const p of pots) if (p.state === 'BOILING') {
        if (!plan.has(p.index)) plan.set(p.index, Math.random() < PR ? 300 + Math.random() * (p.timings.golden - 600) : p.timings.golden + 200 + Math.random() * 1500);
        if (p.t >= plan.get(p.index)) { plan.delete(p.index); k.tapPot(p); return; }
      } else plan.delete(p.index);
      // 9) 토핑: 냄비마다 손님 하나를 정해 그 레시피대로 (재료 탭 → 냄비 탭)
      const ramenWaiting = cs.waiting.filter(c => c.ramenLeft - c.ramenPending > 0);
      for (const p of pots) if (p.state === 'SIMMERING' || p.state === 'READY') {
        let c = cs.list.find(x => x.id === assign.get(p.index));
        if (!c || c.state !== 'wait' || c.ramenLeft - c.ramenPending <= 0) {
          const taken = new Set([...assign.values()]);
          c = ramenWaiting.filter(x => !taken.has(x.id) || x.ramenLeft > 1).sort(byPatience)[0];
          if (c) assign.set(p.index, c.id); else continue;
        }
        for (const t of c.spec.toppings) {
          if (p.toppings.has(t) || p.pending.has(t)) continue;
          if (t === 'scallion' && !k.scallionReady) { k.tapStation('board'); return; }
          k.tapStation(t === 'scallion' ? 'board' : t);
          if (k.held) toppingPot = p;
          return;
        }
      }
      // 10) 미리 대파 썰기 · 설거지
      if (k.isUnlocked('board') && !k.scallionReady && cs.waiting.some(c => c.spec.toppings.includes('scallion'))) { k.tapStation('board'); return; }
      if (k.dishes && k.dirtyBowls > 0 && k.cleanBowls < 2) { k.tapStation('sink'); return; }
      // 11) 슬러시 뽑기 (레버)
      if (!sl.locked && sl.state === 'IDLE' && wantsOf('slush').length) {
        sl.pressLever(99); sl.setPull(1);
        const tgt = Math.random() < PR ? 0.86 : 0.7;
        const iv = setInterval(() => {
          if (sl.state !== 'HOLDING') { clearInterval(iv); return; }
          if (sl.fill > tgt - 0.2) sl.setPull(0.45);
          if (sl.fill >= tgt) { sl.releaseLever(); clearInterval(iv); }
        }, 8);
        return;
      }
      // 12) 물 붓기: 남은 라면 그릇 수만큼 냄비 가동
      const cooking = pots.filter(p => ['HEATING', 'BOILING', 'SIMMERING', 'READY'].includes(p.state)).length;
      const demand = ramenWaiting.reduce((a, c) => a + c.ramenLeft - c.ramenPending, 0) + 1;
      for (const p of pots) if (p.state === 'EMPTY' && cooking < demand) { k.tapPot(p); return; }
      if (k.dishes && k.dirtyBowls > 0) { k.tapStation('sink'); return; }
    }, 10);
  }, Number(perfectRate), Number(reaction), SPEED);
  const dur = DUR[stage] ?? 90;
  const shots = Number(process.env.SHOTS || 0);
  for (let i = 1; i <= shots; i++) {
    await new Promise(r => setTimeout(r, (dur / SPEED) * 1000 / (shots + 1)));
    await page.screenshot({ path: `/tmp/claude-0/v3/bot_${stage}_${i}.png` });
  }
  // 끝날 때까지 대기 (무한 모드는 끝날 때까지)
  for (let i = 0; i < 600; i++) {
    const r = await page.evaluate(() => window.__lastResult && window.__lastResult.stage);
    if (r) break;
    await new Promise(r => setTimeout(r, 500));
  }
  if (process.env.RECEIPT) { await new Promise(r => setTimeout(r, 3500)); await page.screenshot({ path: `/tmp/claude-0/v3/receipt_${stage}.png` }); }
  const res = await page.evaluate(() => window.__lastResult);
  results.push({ stage, ...res, errs: errs.length, errMsg: errs.slice(0, 2) });
  await page.close();
}
console.log(JSON.stringify(results.map(r => ({ stage: r.stage, rev: r.revenue, stars: r.stars, cleared: r.cleared, ramen: r.ramen, slush: r.slush, tteok: r.tteok, odeng: r.odeng, served: r.served, perfect: r.perfect, missed: r.missed, mistakes: r.mistakes, fevers: r.fevers, errs: r.errs, errMsg: r.errMsg }))));
await browser.close();
