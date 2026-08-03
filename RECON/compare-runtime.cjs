const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const out = '/root/.hermes/profiles/frontend/workspace/nodeck-clone/RECON';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  async function run(url, label) {
    const p = await ctx.newPage();
    const errs = [], cons = [], fails = [], res = [];
    p.on('pageerror', e => errs.push(String(e)));
    p.on('console', m => {
      if (m.type() === 'error' || m.type() === 'warning') cons.push({ type: m.type(), text: m.text() });
    });
    p.on('requestfailed', r => fails.push({ url: r.url(), failure: r.failure() }));
    p.on('response', r => {
      if (r.status() >= 400) res.push({ url: r.url(), status: r.status() });
    });
    await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(5000);
    await p.screenshot({ path: path.join(out, label + '-1440x900.png') });
    const init = await p.evaluate(() => ({
      url: location.href,
      title: document.title,
      bg: getComputedStyle(document.body).backgroundColor,
      text: document.body.innerText,
      slide: [...document.querySelectorAll('.slide.is-active')].map(e => e.className),
      resources: performance.getEntriesByType('resource').map(x => x.name),
    }));
    const actions = [];
    if (label.includes('home')) {
      for (let i = 0; i < 2; i++) {
        await p.keyboard.press('ArrowRight');
        await p.waitForTimeout(2200);
        actions.push(await p.evaluate(() => ({
          bg: getComputedStyle(document.body).backgroundColor,
          text: document.body.innerText.slice(0, 500),
          slide: [...document.querySelectorAll('.slide.is-active')].map(e => e.className),
        })));
        await p.screenshot({ path: path.join(out, `${label}-after-right-${i + 1}.png`) });
      }
      await p.keyboard.press('Space');
      await p.waitForTimeout(800);
      actions.push(await p.evaluate(() => {
        const overlay = document.querySelector('.nav-overlay');
        return {
          overlay: overlay ? getComputedStyle(overlay).visibility : null,
          visible: [...document.querySelectorAll('.nav-overlay__thumb')].filter(e => {
            const s = getComputedStyle(e), r = e.getBoundingClientRect();
            return s.visibility !== 'hidden' && +s.opacity > 0 && r.width > 0;
          }).length,
        };
      }));
    } else {
      await p.locator('.game-title__start').click({ force: true });
      await p.waitForTimeout(3500);
      await p.screenshot({ path: path.join(out, label + '-game.png') });
      actions.push(await p.evaluate(() => ({
        text: document.body.innerText,
        canvas: [...document.querySelectorAll('canvas')].map(c => ({ r: c.getBoundingClientRect().toJSON(), w: c.width, h: c.height })),
      })));
    }
    await p.close();
    return { url, label, init, actions, errs, cons, fails, res };
  }

  const data = [];
  for (const x of [
    ['http://127.0.0.1:44118/', 'clone-home'],
    ['https://www.nodeck.online/', 'original-home'],
    ['http://127.0.0.1:44118/404', 'clone-404'],
    ['https://www.nodeck.online/404', 'original-404'],
  ]) data.push(await run(...x));
  fs.writeFileSync(path.join(out, 'runtime-comparison.json'), JSON.stringify(data, null, 2));
  await browser.close();
  console.log(JSON.stringify(data.map(x => ({
    label: x.label,
    bg: x.init.bg,
    title: x.init.title,
    slide: x.init.slide,
    actions: x.actions.map(a => a.slide || a.overlay || a.canvas),
    errors: x.errs,
    console: x.cons,
    failed: x.fails,
    httpErrors: x.res,
  })), null, 2));
})().catch(e => { console.error(e); process.exit(1); });
