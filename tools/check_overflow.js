/* 检查各断点下是否出现横向滚动条，并定位溢出元素 */
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
  const url = process.argv[2] || 'http://127.0.0.1:8123/index.html';

  for (const w of [1600, 1440, 1366, 1024, 768, 680, 390, 360]) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 300));
    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const over = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth - doc.clientWidth > 2 && el.getBoundingClientRect().width > doc.clientWidth + 2) {
          over.push(el.tagName + '.' + String(el.className).split(' ')[0] +
            ' w=' + Math.round(el.getBoundingClientRect().width));
        }
      });
      return { vw: doc.clientWidth, sw: doc.scrollWidth, over: over.slice(0, 5) };
    });
    const ok = r.sw <= r.vw ? 'OK ' : '溢出';
    console.log(`${ok} ${w}px  viewport=${r.vw} scrollWidth=${r.sw}${r.over.length ? '  ← ' + r.over.join(' | ') : ''}`);
  }
  await browser.close();
})();
