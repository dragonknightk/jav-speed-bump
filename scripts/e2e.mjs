// 端到端冒烟测试：用真实 Chrome 加载扩展，验证拦截、解题页、屏蔽页、设置页。
// 需要：npm i puppeteer-core（不在项目依赖里），以及本机 Chrome。
// 用法：CHROME=/path/to/chrome node scripts/e2e.mjs
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const EXT = process.env.EXT_DIR || fileURLToPath(new URL('..', import.meta.url));
const OUT = process.env.SHOTS || '/tmp/jsb-shots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: true,
  pipe: true,
  enableExtensions: [EXT],
  args: ['--no-sandbox', '--lang=zh-CN', '--window-size=1100,900'],
  defaultViewport: { width: 1100, height: 900 },
});
const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().endsWith('background.js'), { timeout: 15000 });
const extId = new URL(swTarget.url()).host;
ok(/^[a-p]{32}$/.test(extId), `扩展已加载，ID = ${extId}`);
const sw = await swTarget.worker();
await sleep(1500);
const rules = await sw.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());
ok(rules.length === 1 && rules[0].condition.requestDomains.length > 100, `DNR 规则已安装（${rules[0]?.condition.requestDomains.length} 个域名）`);

// 关掉欢迎页
for (const p of await browser.pages()) if (p.url().includes('options.html')) { await p.screenshot({ path: `${OUT}/options-welcome.png`, fullPage: false }); }

const page = await browser.newPage();
// 拦截外网请求，用假页面响应，避免依赖网络
await page.setRequestInterception(true);
page.on('request', (r) => {
  const u = r.url();
  if (u.startsWith('chrome-extension://')) return r.continue();
  r.respond({ status: 200, contentType: 'text/html', body: '<html><body><h1>fake</h1></body></html>' });
});

const gatePrefix = `chrome-extension://${extId}/src/pages/gate.html`;
const nav = async (u) => { await page.goto('about:blank'); await page.goto(u, { waitUntil: 'domcontentloaded' }).catch(() => {}); };
const waitGate = async () => {
  for (let i = 0; i < 40; i++) { if (page.url().startsWith(gatePrefix)) { await sleep(700); return true; } await sleep(100); }
  return false;
};

// 1. 域名拦截（DNR）
await nav('https://www.pornhub.com/view_video.php?viewkey=abc');
ok(await waitGate(), `域名拦截 → ${page.url().slice(0, 110)}`);
ok(page.url().includes('#https://www.pornhub.com/view_video.php?viewkey=abc'), '原始 URL 被带到解题页');
ok(page.url().includes('gate.html#') , 'DNR 重定向生效（不是 JS 兜底）');

// 2. 子域名 + 顶级域
await nav('https://cn.xvideos.com/');
ok(await waitGate(), '子域名拦截');
await nav('https://anything.xxx/');
ok(await waitGate(), '.xxx 顶级域拦截');

// 3. 搜索关键词
await nav('https://www.google.com/search?q=nhentai+best');
{ const g = await waitGate(); ok(g && page.url().includes('kind=keyword'), 'Google 搜索关键词拦截 ' + page.url().slice(0,140)); }
await nav('https://www.baidu.com/s?wd=' + encodeURIComponent('最新番号'));
ok(await waitGate(), '百度中文关键词拦截');

// 4. 不误伤
await page.goto('https://www.google.com/search?q=java+tutorial', { waitUntil: 'domcontentloaded' });
await sleep(800);
ok(page.url().startsWith('https://www.google.com/search'), '搜索 java 不被拦截');

// 5. SPA：pushState 到搜索结果
await page.goto('https://www.bing.com/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => history.pushState({}, '', '/search?q=hentai'));
ok(await waitGate(), 'SPA history.pushState 搜索被拦截');

// 6. 解题页：自动解三组题，验证完整流程
await nav('https://www.pornhub.com/');
await waitGate();
await page.waitForSelector('#stage > *', { timeout: 5000 });
await sleep(300);
ok(await page.$('#urgeSvg svg'), '解题页有冲动曲线');
await page.screenshot({ path: `${OUT}/gate.png` });

async function solveCurrent() {
  const title = await page.$eval('#ptitle', (e) => e.textContent);
  if (title.includes('数独')) {
    await page.evaluate(async () => {
      const { solve } = await import('/src/puzzles/sudoku.js');
      const inputs = [...document.querySelectorAll('.sudoku input')];
      const grid = inputs.map((i) => Number(i.value) || 0);
      const sol = solve(grid);
      inputs.forEach((inp, i) => { if (!inp.readOnly) { inp.value = String(sol[i]); inp.dispatchEvent(new Event('input')); } });
    });
  } else if (title.includes('数织')) {
    const coords = await page.evaluate(async () => {
      const { logicSolve } = await import('/src/puzzles/nonogram.js');
      const rows = [...document.querySelectorAll('.nono .rc')].map((e) => e.textContent.trim().split(/\s+/).map(Number));
      const cols = [...document.querySelectorAll('.nono .cc')].map((e) => e.innerText.trim().split(/\s+/).map(Number));
      const { grid } = logicSolve({ rows, cols });
      const out = [];
      const trs = [...document.querySelectorAll('.nono tr')].slice(1);
      grid.forEach((row, r) => row.forEach((v, c) => { if (v === 1) { const b = trs[r].querySelectorAll('.cell')[c].getBoundingClientRect(); out.push([b.x + b.width / 2, b.y + b.height / 2]); } }));
      return out;
    });
    for (const [x, y] of coords) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); }
  } else if (title.includes('心算')) {
    // 故意答错一次，验证整组重来
    await page.type('.arith input', '1');
    await page.keyboard.press('Enter');
    const err = await page.$eval('.msg', (e) => e.textContent);
    ok(err.includes('重新开始'), `心算答错会重置：${err}`);
    for (let i = 0; i < 10; i++) {
      const q = await page.$eval('.arith-q', (e) => e.textContent);
      const expr = q.replace('= ?', '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      const ans = Function(`return (${expr})`)();
      await page.$eval('.arith input', (e) => { e.value = ''; });
      await page.type('.arith input', String(ans));
      await page.keyboard.press('Enter');
    }
  } else if (title.includes('24')) {
    for (let i = 0; i < 8; i++) {
      if (await page.$eval('#ptitle', (e) => !e.textContent.includes('24'))) break;
      const done = await page.evaluate(async () => {
        const inp = document.querySelector('.expr');
        if (!inp || inp.disabled) return true;
        const { solve24 } = await import('/src/puzzles/twentyfour.js');
        const nums = [...document.querySelectorAll('.card')].map((c) => Number(c.dataset.v));
        inp.value = solve24(nums).solutions[0];
        inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        return false;
      });
      if (done) break;
      await sleep(150);
    }
  }
  return title;
}
const titles = [];
for (let n = 0; n < 3; n++) {
  titles.push(await solveCurrent());
  await sleep(900);
}
console.log(`  解题组合：${titles.join(' + ')}`);
for (let i = 0; i < 40 && !page.url().includes('blocked.html'); i++) await sleep(100);
ok(page.url().includes('blocked.html'), '做完题后进入屏蔽页（依然屏蔽）');
await page.waitForSelector('.reasons button');
await page.screenshot({ path: `${OUT}/blocked.png` });
await page.click('.reasons button:nth-child(2)'); // 压力
await page.waitForSelector('#altPanel:not([hidden]) .alt');
await page.screenshot({ path: `${OUT}/blocked-alts.png` });
const logs = await sw.evaluate(() => chrome.storage.local.get('logs').then((x) => x.logs));
const last = logs[logs.length - 1];
ok(last.completed && last.reason === 'stress' && last.puzzleMs > 0 && last.domain === 'www.pornhub.com', `记录已保存：${JSON.stringify({ domain: last.domain, reason: last.reason, puzzleMs: last.puzzleMs, puzzles: last.puzzles })}`);
ok(logs.length >= 7, `共 ${logs.length} 条触发记录`);

// 7. 设置页：添加立即生效，移除需要等待
const opt = await browser.newPage();
await opt.goto(`chrome-extension://${extId}/src/pages/options.html`);
await opt.type('#domainInput', 'https://www.example-bad-site.com/abc');
await opt.click('#domainAdd');
await sleep(800);
const r2 = await sw.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());
ok(r2[0].condition.requestDomains.includes('example-bad-site.com'), '新增域名立即进入 DNR 规则');
await nav('https://example-bad-site.com/');
ok(await waitGate(), '新增域名立即被拦截');
await opt.bringToFront();
await opt.click('#domainList .item button');
await opt.waitForSelector('.modal');
await opt.screenshot({ path: `${OUT}/options-remove.png` });
const btns = await opt.$$('.modal button');
await btns[0].click(); // 24 小时后
await sleep(600);
const s = await sw.evaluate(() => chrome.storage.local.get('settings').then((x) => x.settings));
ok(s.pendingRemovals.length === 1 && s.pendingRemovals[0].effectiveAt - Date.now() > 23.9 * 3600000, '移除进入 24 小时等待');
const r3 = await sw.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());
ok(r3[0].condition.requestDomains.includes(s.pendingRemovals[0].value), '等待期间仍然屏蔽');
await opt.screenshot({ path: `${OUT}/options.png`, fullPage: true });

// 7b. 解锁流程：做完三组题立即移除
await page.bringToFront();
await page.goto(`${gatePrefix}?mode=unlock&pid=${s.pendingRemovals[0].id}`);
await page.waitForSelector('#stage > *');
await sleep(300);
ok(await page.$eval('#urge', (e) => !e.hidden) && Boolean(await page.$('#urgeSvg svg')), '解锁页同样展示冲动曲线');
for (let n = 0; n < 3; n++) { await solveCurrent(); await sleep(900); }
for (let i = 0; i < 40 && !page.url().includes('options.html'); i++) await sleep(100);
const s2 = await sw.evaluate(() => chrome.storage.local.get('settings').then((x) => x.settings));
ok(page.url().includes('unlocked') && s2.pendingRemovals.length === 0 && !s2.customDomains.includes('example-bad-site.com'), '解锁做题后立即移除');
const r4 = await sw.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());
ok(!r4[0].condition.requestDomains.includes('example-bad-site.com'), '移除后 DNR 规则同步');
await opt.bringToFront();

// 8. 统计页 / 弹窗
await opt.goto(`chrome-extension://${extId}/src/pages/stats.html`);
await opt.waitForSelector('#daily svg');
ok((await opt.$$('#daily svg rect')).length === 30, '统计页渲染 30 天柱状图');
await opt.screenshot({ path: `${OUT}/stats.png`, fullPage: true });
await opt.goto(`chrome-extension://${extId}/src/pages/popup.html`);
await sleep(400);
await opt.setViewport({ width: 300, height: 200 });
await opt.screenshot({ path: `${OUT}/popup.png` });

await browser.close();
console.log(failures ? `\n✗ ${failures} 项失败` : '\n✓ 端到端测试全部通过');
process.exit(failures ? 1 : 0);
