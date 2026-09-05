/* ---------------------------------------------------------------------------
   core.js — page chrome shared by every article in the series.

   Extracted verbatim (behaviour-for-behaviour) from Part 1's app.js so the two
   articles cannot drift. Part-specific diagram code lives in its own file
   (part-2.js) and never touches anything in here.

   Handles: theme, reading progress, TOC scroll-spy, reveal-on-scroll,
   code copy buttons.

   No dependencies. No third-party requests.
--------------------------------------------------------------------------- */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- theme ---------- */
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  setTheme(mq.matches ? 'dark' : 'light');
  mq.addEventListener('change', function (e) {
    setTheme(e.matches ? 'dark' : 'light');
  });
  var themeBtn = document.querySelector('[data-theme-toggle]');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- reading progress ---------- */
  var bar = document.getElementById('progress');
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct.toFixed(2) + '%';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- TOC scroll-spy ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  var targets = tocLinks
    .map(function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    })
    .filter(Boolean);

  if (targets.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          tocLinks.forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id);
          });
        });
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );
    targets.forEach(function (t) {
      spy.observe(t);
    });
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            obs.unobserve(en.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    reveals.forEach(function (r) {
      ro.observe(r);
    });
  } else {
    reveals.forEach(function (r) {
      r.classList.add('is-in');
    });
  }

  /* ---------- copy buttons ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.copy-btn'), function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.getAttribute('data-copy'));
      if (!el) return;
      var text = el.innerText;
      var done = function () {
        btn.textContent = 'copied';
        setTimeout(function () {
          btn.textContent = 'copy';
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
        } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    });
  });
})();
