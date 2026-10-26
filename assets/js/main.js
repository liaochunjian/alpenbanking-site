/*!
 * Aplen Baruch site - global interaction script
 * Modules: navigation / accordion / tabs / scroll reveal / back to top / article list and detail / FAQ / forms
 * Note: vanilla ES5+ syntax with no third-party dependencies; every interaction supports keyboard use and ARIA state sync.
 */
(function () {
  'use strict';

  var doc = document;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  /* ------------------------------------------------------------- Navigation */
  function initNav() {
    var toggle = $('[data-nav-toggle]');
    var nav = $('#site-nav');
    var overlay = $('[data-nav-overlay]');
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      if (overlay) overlay.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      doc.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = nav.querySelector('a, button');
        if (first) first.focus();
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    if (overlay) overlay.addEventListener('click', function () { setOpen(false); });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 900) setOpen(false);
      });
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setOpen(false);
    });
  }

  /* -------------------------------------------------------------- Accordion */
  /**
   * Binds interactions for the accordion items inside a given container.
   * Extracted into a standalone function so dynamically rendered content (e.g. FAQ) can bind events after insertion.
   */
  function bindAccordion(acc) {
    var single = acc.getAttribute('data-accordion') === 'single';
    $$('.accordion__trigger', acc).forEach(function (btn) {
      if (btn.dataset.accordionBound === 'true') return;   // avoid duplicate binding
      btn.dataset.accordionBound = 'true';
      btn.addEventListener('click', function () {
        var panel = doc.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) return;
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        if (single && !expanded) {
          $$('.accordion__trigger', acc).forEach(function (other) {
            if (other === btn) return;
            other.setAttribute('aria-expanded', 'false');
            var p = doc.getElementById(other.getAttribute('aria-controls'));
            if (p) p.hidden = true;
          });
        }
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        panel.hidden = expanded;
      });
    });
  }

  function initAccordion() {
    $$('[data-accordion]').forEach(bindAccordion);
  }

  /* ------------------------------------------------------------------ Tabs */
  function initTabs() {
    $$('[data-tabs]').forEach(function (wrap) {
      var btns = $$('[role="tab"]', wrap);
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var panels = $$('[role="tabpanel"]', wrap);
          btns.forEach(function (b) {
            var on = b === btn;
            b.setAttribute('aria-selected', on ? 'true' : 'false');
            b.tabIndex = on ? 0 : -1;
            var p = doc.getElementById(b.getAttribute('aria-controls'));
            if (p) p.hidden = !on;
          });
        });
        btn.addEventListener('keydown', function (e) {
          var i = btns.indexOf(btn);
          var next = null;
          if (e.key === 'ArrowRight') next = btns[(i + 1) % btns.length];
          if (e.key === 'ArrowLeft') next = btns[(i - 1 + btns.length) % btns.length];
          if (next) { next.focus(); next.click(); e.preventDefault(); }
        });
      });

      // support jumping straight to a tab via URL hash (e.g. legal.html#privacy)
      var hash = (window.location.hash || '').replace('#', '');
      if (!hash) return;
      var target = doc.getElementById(hash);
      if (!target || target.getAttribute('role') !== 'tabpanel') return;
      var owner = btns.filter(function (b) { return b.getAttribute('aria-controls') === hash; })[0];
      if (owner && owner.getAttribute('aria-selected') !== 'true') owner.click();
    });
  }

  /* ---------------------------------------------- Scroll reveal / back to top */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  function initToTop() {
    var btn = $('[data-to-top]');
    if (!btn) return;
    var onScroll = function () {
      btn.classList.toggle('is-visible', window.scrollY > 480);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* -------------------------------------------------------- Image fallback */
  function initImageFallback() {
    $$('img[data-fallback]').forEach(function (img) {
      img.addEventListener('error', function () {
        img.style.visibility = 'hidden';
        var parent = img.parentElement;
        if (parent) parent.classList.add('media-fallback');
      });
    });
  }

  /* ------------------------------------- Article list and detail modal */
  var PAGE_SIZE = 9;

  function loadBodies(cb) {
    if (window.SGB_ARTICLE_BODIES) { cb(window.SGB_ARTICLE_BODIES); return; }
    var s = doc.createElement('script');
    s.src = 'assets/js/data-articles-body.js';
    s.onload = function () { cb(window.SGB_ARTICLE_BODIES || {}); };
    doc.body.appendChild(s);
  }

  function createModal() {
    var modal = doc.createElement('div');
    modal.className = 'article-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'article-modal-title');
    modal.innerHTML =
      '<div class="article-modal__backdrop" data-modal-close></div>' +
      '<div class="article-modal__dialog">' +
      '<button type="button" class="article-modal__close" aria-label="Close article" data-modal-close>✕</button>' +
      '<span class="article-modal__tag"></span>' +
      '<h2 id="article-modal-title"></h2>' +
      '<p class="text-muted article-modal__meta"></p>' +
      '<div class="article-modal__body"></div>' +
      '</div>';
    doc.body.appendChild(modal);

    var lastFocus = null;
    function close() {
      modal.hidden = true;
      doc.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    $$('[data-modal-close]', modal).forEach(function (el) {
      el.addEventListener('click', close);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) close();
    });
    return {
      open: function (article) {
        lastFocus = doc.activeElement;
        $('.article-modal__tag', modal).textContent = article.category || article.kindLabel;
        $('#article-modal-title', modal).textContent = article.title;
        $('.article-modal__meta', modal).textContent = article.dateLabel || '';
        var body = $('.article-modal__body', modal);
        body.innerHTML = '<p class="text-muted">Loading article…</p>';
        var html = '';
        if (article.image) {
          html += '<img class="article-modal__hero" src="' + article.image +
                  '" alt="' + article.title.replace(/"/g, '') + '" loading="lazy">';
        }
        loadBodies(function (bodies) {
          var text = bodies[article.id] || '<p>' + (article.excerpt || '') + '</p>';
          body.innerHTML = html + text +
            (article.source ? '<p class="text-muted" style="margin-top:1.5rem;font-size:.85rem">Source: ' +
              '<a href="' + article.source + '" target="_blank" rel="noopener">www.sgb.com</a></p>' : '');
        });
        modal.hidden = false;
        doc.body.style.overflow = 'hidden';
        $('.article-modal__close', modal).focus();
      }
    };
  }

  function initArticles() {
    var grid = $('[data-article-grid]');
    if (!grid || !window.SGB_ARTICLES) return;
    var articles = window.SGB_ARTICLES.slice();
    var modal = createModal();
    var state = { kind: 'all', q: '', shown: PAGE_SIZE };

    var chips = $$('[data-filter-kind]');
    var search = $('[data-article-search]');
    var count = $('[data-article-count]');
    var moreBtn = $('[data-article-more]');

    function match(a) {
      if (state.kind !== 'all' && a.kind !== state.kind) return false;
      if (!state.q) return true;
      var q = state.q.toLowerCase();
      return (a.title + ' ' + a.excerpt + ' ' + a.category).toLowerCase().indexOf(q) > -1;
    }

    function cardHTML(a) {
      var media = a.image
        ? '<img src="' + a.image + '" alt="' + a.title.replace(/"/g, '') +
          '" loading="lazy" decoding="async" data-fallback>'
        : '';
      return '<article class="article-card">' +
        '<div class="article-card__media">' + media +
        '<span class="article-card__tag">' + (a.category || a.kindLabel) + '</span></div>' +
        '<div class="article-card__body">' +
        '<span class="article-card__date">' + (a.dateLabel || '') + '</span>' +
        '<h3 class="article-card__title">' + a.title + '</h3>' +
        '<p class="article-card__excerpt">' + (a.excerpt || '') + '</p>' +
        '<button type="button" class="article-card__more" data-article-id="' + a.id + '">Read more →</button>' +
        '</div></article>';
    }

    function render(reset) {
      if (reset) state.shown = PAGE_SIZE;
      var list = articles.filter(match);
      var slice = list.slice(0, state.shown);
      grid.innerHTML = slice.map(cardHTML).join('');
      if (count) count.textContent = list.length + ' articles in total, showing ' + slice.length;
      if (moreBtn) moreBtn.hidden = slice.length >= list.length;

      $$('[data-article-id]', grid).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var a = articles.filter(function (x) { return x.id === btn.getAttribute('data-article-id'); })[0];
          if (a) modal.open(a);
        });
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        state.kind = chip.getAttribute('data-filter-kind');
        render(true);
      });
    });
    if (search) {
      var timer = null;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.q = search.value.trim();
          render(true);
        }, 180);
      });
    }
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        state.shown += PAGE_SIZE;
        render(false);
      });
    }
    render(true);
  }

  /* ------------------------------------------------------------------- FAQ */
  function initFaq() {
    var wrap = $('[data-faq-list]');
    if (!wrap || !window.SGB_FAQ) return;
    var items = window.SGB_FAQ.slice();
    var cats = [];
    items.forEach(function (i) { if (cats.indexOf(i.category) === -1) cats.push(i.category); });
    var state = { cat: 'all', q: '' };

    var chipWrap = $('[data-faq-chips]');
    if (chipWrap) {
      chipWrap.innerHTML =
        '<button type="button" class="chip is-active" data-faq-cat="all">All (' + items.length + ')</button>' +
        cats.map(function (c) {
          var n = items.filter(function (i) { return i.category === c; }).length;
          return '<button type="button" class="chip" data-faq-cat="' + c + '">' + c + ' (' + n + ')</button>';
        }).join('');
      $$('[data-faq-cat]', chipWrap).forEach(function (chip) {
        chip.addEventListener('click', function () {
          $$('[data-faq-cat]', chipWrap).forEach(function (c) { c.classList.remove('is-active'); });
          chip.classList.add('is-active');
          state.cat = chip.getAttribute('data-faq-cat');
          render();
        });
      });
    }

    var search = $('[data-faq-search]');
    if (search) {
      var timer = null;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { state.q = search.value.trim().toLowerCase(); render(); }, 180);
      });
    }

    function render() {
      var list = items.filter(function (i) {
        if (state.cat !== 'all' && i.category !== state.cat) return false;
        if (state.q && (i.q + i.a).toLowerCase().indexOf(state.q) === -1) return false;
        return true;
      });
      wrap.innerHTML = list.map(function (i, idx) {
        var pid = 'faq-panel-' + idx;
        var bid = 'faq-btn-' + idx;
        return '<div class="accordion__item">' +
          '<h3 style="margin:0"><button type="button" class="accordion__trigger" id="' + bid +
          '" aria-expanded="false" aria-controls="' + pid + '">' +
          '<span>' + i.q + '</span><span class="accordion__icon" aria-hidden="true">+</span></button></h3>' +
          '<div class="accordion__panel" id="' + pid + '" role="region" aria-labelledby="' + bid + '" hidden>' +
          '<p>' + i.a + '</p></div></div>';
      }).join('');
      if (!list.length) {
        wrap.innerHTML = '<p class="text-muted">No matching questions. Try different keywords.</p>';
      }
      bindAccordion(wrap);   // dynamically inserted accordion items need rebinding
    }
    render();
  }

  /* ----------------------------------------------------------------- Forms */
  function initForms() {
    $$('form[data-demo-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        var ok = form.querySelector('[data-form-success]');
        if (ok) {
          ok.classList.add('is-visible');
          ok.setAttribute('role', 'status');
        }
        form.reset();
      });
    });
  }

  /* ----------------------------------------------------------- Footer year */
  function initYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* --------------------------------------------------------------- Bootstrap */
  function ready(fn) {
    if (doc.readyState !== 'loading') fn();
    else doc.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initNav();
    initAccordion();
    initTabs();
    initReveal();
    initToTop();
    initImageFallback();
    initArticles();
    initFaq();
    initForms();
    initYear();
  });
})();
