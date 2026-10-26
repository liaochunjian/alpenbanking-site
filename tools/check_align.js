/* 一次性校验：全站 6 页 × 多断点 —— 页头/主体对齐 + 无横向溢出 */
(async () => {
  const { createRequire } = require('module');
  const req = createRequire('/Users/liaochunjian/.workbuddy/binaries/node/workspace/');
  const { launch } = req('puppeteer-core');
  const browser = await launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  const base = 'http://127.0.0.1:8123/';
  const pages = ['index', 'personal', 'business', 'faq', 'contact', 'legal'];
  const widths = [1600, 1440, 1392, 1024, 768, 680, 390, 360];
  let bad = 0;

  for (const p of pages) {
    for (const w of widths) {
      await page.setViewport({ width: w, height: 900 });
      await page.goto(base + p + '.html', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 250));
      const r = await page.evaluate(() => {
        const head = document.querySelector('.site-header .container');
        const mainC = document.querySelector('main .container:not(.container--narrow)');
        if (!head || !mainC) return null;
        const h = head.getBoundingClientRect(), m = mainC.getBoundingClientRect();
        const doc = document.documentElement;
        return { hl: h.left, hr: h.right, ml: m.left, mr: m.right,
                 sw: doc.scrollWidth, vw: doc.clientWidth };
      });
      if (!r) { console.log(`FAIL ${p} @${w} 未取到容器`); bad++; continue; }
      const dl = Math.abs(r.hl - r.ml), dr = Math.abs(r.hr - r.mr);
      const ok = dl < 1 && dr < 1 && r.sw <= r.vw + 1;
      if (!ok) { bad++; console.log(`FAIL ${p} @${w}  ΔL=${dl.toFixed(1)} ΔR=${dr.toFixed(1)} scroll=${r.sw}/${r.vw}`); }
    }
    console.log(`${p}: 完成`);
  }
  console.log(bad === 0 ? '\n全部通过：页头与主体左右边缘完全对齐，且无横向滚动' : `\n${bad} 项不通过`);

  // 用 SIGKILL 结束 Chrome，跳过 macOS code-sign clone 的清理删除步骤
  try { process.kill(browser.process().pid, 'SIGKILL'); } catch (e) {}
  try { browser.disconnect(); } catch (e) {}
  process.exit(bad === 0 ? 0 : 1);
})();
