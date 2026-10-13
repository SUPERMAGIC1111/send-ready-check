/* ui-kit.js — behaviour for bouncy tabs, glass nav, elastic pulse button.
   Vanilla, no dependencies. Call UIKit.mount() after the markup is in the DOM. */
(function (root) {
  'use strict';

  var reduced = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* ---------- 1. bouncy content tabs ----------
     Markup contract:
       .tabs > .tabs__list[role=tablist] > .tabs__pill + .tabs__tab[role=tab][aria-controls]
            > .tabs__stage > .tabs__panel[role=tabpanel][id]
     The pill is a single element moved with transform+width, so it overshoots
     past the target and settles — that is the whole bounce. */
  function mountTabs(rootEl) {
    var list = rootEl.querySelector('.tabs__list');
    var stage = rootEl.querySelector('.tabs__stage');
    var pill = rootEl.querySelector('.tabs__pill');
    var tabs = [].slice.call(rootEl.querySelectorAll('.tabs__tab'));
    if (!list || !stage || !tabs.length) return;

    var current = Math.max(0, tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }));

    function panelFor(tab) { return document.getElementById(tab.getAttribute('aria-controls')); }

    function movePill(tab, animate) {
      if (!pill) return;
      var x = tab.offsetLeft - list.clientLeft;
      if (!animate) pill.style.transition = 'none';
      pill.style.width = tab.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + x + 'px)';
      if (!animate) { void pill.offsetWidth; pill.style.transition = ''; }
    }

    function select(next, viaKeyboard) {
      next = (next + tabs.length) % tabs.length;
      var from = panelFor(tabs[current]);
      var to = panelFor(tabs[next]);
      if (!to) return;

      tabs.forEach(function (t, i) {
        t.setAttribute('aria-selected', i === next ? 'true' : 'false');
        t.tabIndex = i === next ? 0 : -1;
      });

      // Lock the stage at its current height, swap, then animate to the new one.
      var startH = stage.offsetHeight;
      if (from && from !== to) from.hidden = true;
      to.hidden = false;
      to.classList.remove('is-entering');
      void to.offsetWidth;
      to.classList.add('is-entering');

      var endH = to.offsetHeight;
      if (reduced()) {
        stage.style.height = '';
      } else {
        stage.style.height = startH + 'px';
        void stage.offsetHeight;
        stage.style.height = endH + 'px';
        var done = function (e) {
          if (e.propertyName !== 'height') return;
          stage.style.height = '';
          stage.removeEventListener('transitionend', done);
        };
        stage.addEventListener('transitionend', done);
      }

      current = next;
      movePill(tabs[next], true);
      tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (viaKeyboard) tabs[next].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.setAttribute('role', 'tab');
      tab.tabIndex = i === current ? 0 : -1;
      tab.addEventListener('click', function () { select(i, false); });
    });

    list.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); select(current + 1, true); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); select(current - 1, true); }
      else if (k === 'Home') { e.preventDefault(); select(0, true); }
      else if (k === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
    });

    // Initial paint, plus re-measure when the row reflows.
    var sync = function () { movePill(tabs[current], false); };
    sync();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
    if (window.ResizeObserver) new ResizeObserver(sync).observe(list);
    else window.addEventListener('resize', sync);
  }

  /* ---------- 2. glass nav ----------
     Glass is pure CSS; this only thickens the tint once the bar has
     something scrolled underneath it. */
  function mountGlassNav(nav) {
    var probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;top:0;height:1px;width:1px;pointer-events:none';
    (nav.offsetParent || document.body).insertBefore(probe, (nav.offsetParent || document.body).firstChild);

    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { threshold: 1 }).observe(probe);
  }

  /* ---------- 3. elastic pulse button ----------
     Press squashes on a fast ease; release returns on a spring that
     overshoots. The ring is one element whose animation is restarted. */
  function mountPulse(btn) {
    if (!btn.querySelector('.pulse__ring')) {
      var ring = document.createElement('span');
      ring.className = 'pulse__ring';
      ring.setAttribute('aria-hidden', 'true');
      btn.appendChild(ring);
    }
    var press = function () { btn.classList.add('is-pressed'); };
    var release = function () { btn.classList.remove('is-pressed'); };

    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') press(); });
    btn.addEventListener('keyup', release);
    btn.addEventListener('blur', release);

    btn.addEventListener('click', function () {
      btn.classList.remove('is-pulsing');
      void btn.offsetWidth;          // restart the keyframes
      btn.classList.add('is-pulsing');
    });
    btn.addEventListener('animationend', function (e) {
      if (e.animationName === 'ring') btn.classList.remove('is-pulsing');
    });
  }

  function mount(scope) {
    scope = scope || document;
    [].forEach.call(scope.querySelectorAll('.tabs'), mountTabs);
    [].forEach.call(scope.querySelectorAll('.nav.glass'), mountGlassNav);
    [].forEach.call(scope.querySelectorAll('.pulse'), mountPulse);
  }

  var api = { mount: mount, mountTabs: mountTabs, mountPulse: mountPulse, mountGlassNav: mountGlassNav };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.UIKit = api;
})(typeof self !== 'undefined' ? self : this);
