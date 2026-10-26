/**
 * Smoke test: runs the page scripts in jsdom to verify the article list / FAQ / accordion / tabs.
 * Run:NODE_PATH=/Users/liaochunjian/.workbuddy/binaries/node/workspace/node_modules \
 *       node tools/smoke_test.js
 */
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const results = [];

function load(file) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(e.message));
  vc.on('error', (m) => errors.push(String(m)));
  return JSDOM.fromFile(path.join(ROOT, file), {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
  }).then((dom) => new Promise((resolve) => {
    dom.window.addEventListener('load', () => setTimeout(() => resolve({ dom, errors }), 300));
  }));
}

function check(name, cond, extra) {
  results.push({ name, ok: !!cond, extra: extra || '' });
}

(async () => {
  // 1) Home page
  {
    const { dom, errors } = await load('index.html');
    const d = dom.window.document;
    check('index: no script errors', errors.length === 0, errors.join('; '));
    check('index: 4 nav links (Contact Us removed)', d.querySelectorAll('#site-nav .nav__link').length === 4,
      String(d.querySelectorAll('#site-nav .nav__link').length));
    check('index: no Contact Us nav entry',
      !/联系我们/.test(d.querySelector('#site-nav').textContent));
    check('index: hero headline present', /crosses borders/i.test(d.querySelector('h1').textContent));
    check('index: at least 6 cards', d.querySelectorAll('.card').length >= 6,
      String(d.querySelectorAll('.card').length));
    check('index: exactly one GET ACCESS (header CTA)',
      d.querySelectorAll('.nav .btn').length === 0 &&
      d.querySelectorAll('.header__cta .btn').length === 1);
    check('index: What Sets Us Apart module',
      /What Sets Us Apart/i.test(d.body.textContent));
    check('index: mission module',
      /Money moves freely/i.test(d.body.textContent));
    check('index: brand name is Aplen Baruch',
      /Aplen Baruch/.test(d.body.textContent));
    check('index: no standalone SGB in display text', !/\bSGB\b/.test(d.body.textContent));
    dom.window.close();
  }

  // 2) FAQ: 57 items rendered + search + expand
  {
    const { dom, errors } = await load('faq.html');
    const d = dom.window.document;
    check('faq: no script errors', errors.length === 0, errors.join('; '));
    const items = d.querySelectorAll('[data-faq-list] .accordion__item');
    check('faq: 57 items rendered (App download Q&As removed)', items.length === 57, String(items.length));
    check('faq: no App/download leftovers',
      !/\bapp\b|download|app store|google play/i.test(d.querySelector('[data-faq-list]').textContent));
    check('faq: category chips rendered', d.querySelectorAll('[data-faq-chips] .chip').length >= 5,
      String(d.querySelectorAll('[data-faq-chips] .chip').length));

    const btn = d.querySelector('[data-faq-list] .accordion__trigger');
    btn.click();
    check('faq: accordion expands', btn.getAttribute('aria-expanded') === 'true');
    const panel = d.getElementById(btn.getAttribute('aria-controls'));
    check('faq: panel visible when expanded', panel && !panel.hidden);

    // search
    const input = d.querySelector('[data-faq-search]');
    input.value = 'crypto';
    input.dispatchEvent(new dom.window.Event('input'));
    await new Promise((r) => setTimeout(r, 400));
    const filtered = d.querySelectorAll('[data-faq-list] .accordion__item').length;
    check('faq: search filter works', filtered > 0 && filtered < 63, String(filtered));
    dom.window.close();
  }

  // 4) Compliance centre: tab switching
  {
    const { dom, errors } = await load('legal.html');
    const d = dom.window.document;
    check('legal: no script errors', errors.length === 0, errors.join('; '));
    check('legal: 4 tab panels', d.querySelectorAll('[role="tabpanel"]').length === 4);
    d.getElementById('tab-privacy').click();
    check('legal: switches to Privacy Notice',
      d.getElementById('tab-privacy').getAttribute('aria-selected') === 'true' &&
      !d.getElementById('privacy').hidden);
    check('legal: terms panel hidden', d.getElementById('terms').hidden);
    dom.window.close();
  }

  // 4.5) Site-wide scan: no leftover App-download links, class names or copy
  {
    const fs = require('fs');
    const BAN = /(apps\.apple\.com|play\.google\.com|appgallery|download-apk|store-badges|qr-box|download-card|下载 App|扫码|法律与合规)/i;
    const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
    const hits = files.filter(f => BAN.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/main.css'), 'utf8');
    const cssHits = /(store-badges|qr-box|download-card)/.test(css);
    check('site-wide: no App-download leftovers (HTML)', hits.length === 0, hits.join(', '));
    check('site-wide: no App-download leftovers (CSS)', !cssHits);
  }
  // 4.6) Site-wide scan: all page copy must be English (no CJK characters)
  {
    const fs = require('fs');
    const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
    const cjk = files.filter(f => /[\u4e00-\u9fff]/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    check('site-wide: no Chinese text left in HTML', cjk.length === 0, cjk.join(', '));
  }
  // 4.7) Language switcher: every page carries the two slots + i18n script
  {
    const fs = require('fs');
    const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
    const bad = files.filter(f => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      return (src.match(/data-lang-slot/g) || []).length !== 2 ||
             !src.includes('assets/js/i18n.js') ||
             !src.includes('ab_lang');
    });
    check('site-wide: language switcher slots on every page', bad.length === 0, bad.join(', '));
  }

  // 4.8) Every internal link must resolve to an existing file (nginx has no fallback controller)
  {
    const fs = require('fs');
    const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
    const broken = [];
    files.forEach((f) => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const hrefs = src.match(/href="([^"]+)"/g) || [];
      hrefs.forEach((raw) => {
        const href = raw.slice(6, -1);
        if (/^(https?:|mailto:|tel:|javascript:)/.test(href)) return;
        const target = href.split('#')[0];
        if (!target) return;                       /* pure in-page anchor */
        if (!fs.existsSync(path.join(ROOT, target))) broken.push(`${f} -> ${href}`);
      });
    });
    check('site-wide: no broken internal links', broken.length === 0, broken.join(', '));
  }
  // 4.9) Files required for nginx deployment exist
  {
    const fs = require('fs');
    const need = ['404.html', 'robots.txt', 'deploy/nginx.conf', '.gitignore'];
    const missing = need.filter((f) => !fs.existsSync(path.join(ROOT, f)));
    check('deploy: nginx package files present', missing.length === 0, missing.join(', '));
  }
  // 4.10) 404 error page renders cleanly
  {
    const { dom, errors } = await load('404.html');
    const d = dom.window.document;
    check('404: no script errors', errors.length === 0, errors.join('; '));
    check('404: headline rendered', /Page not found/.test(d.querySelector('h1').textContent));
    check('404: nav + footer chrome present',
      !!d.querySelector('#site-nav') && !!d.querySelector('.site-footer'));
    dom.window.close();
  }

  // 5) Forms
  {
    const { dom, errors } = await load('contact.html');
    const d = dom.window.document;
    check('contact: no script errors', errors.length === 0, errors.join('; '));
    check('contact: no GET ACCESS in nav (header CTA only)',
      d.querySelectorAll('#site-nav .btn').length === 0 &&
      d.querySelectorAll('.header__cta .btn').length === 1);
    d.getElementById('c-name').value = 'Test';
    d.getElementById('c-email').value = 'a@b.com';
    d.getElementById('c-message').value = 'hello';
    d.querySelector('form[data-demo-form]').dispatchEvent(new dom.window.Event('submit', { cancelable: true, bubbles: true }));
    check('contact: form submit success state',
      d.querySelector('[data-form-success]').classList.contains('is-visible'));
    dom.window.close();
  }

  const failed = results.filter((r) => !r.ok);
  results.forEach((r) => console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.extra ? '  → ' + r.extra : ''}`));
  console.log(`\nPassed ${results.length - failed.length}/${results.length}`);
  process.exit(failed.length ? 1 : 0);
})();
