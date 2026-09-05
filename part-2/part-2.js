/* ---------------------------------------------------------------------------
   part-2.js — diagram engines for "Correcting History Without Burning the
   House Down".

   One IIFE, no globals, no libraries, no network requests. Page chrome lives
   in core.js and is never touched from here, so Part 1's own diagram file can
   sit alongside this one without collisions.
--------------------------------------------------------------------------- */

(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    }
    return n;
  }
  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }
  function segment(container, onPick) {
    if (!container) return;
    each(container.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        each(container.querySelectorAll('button'), function (o) {
          o.classList.remove('is-on');
        });
        b.classList.add('is-on');
        onPick(b.getAttribute('data-v'));
      });
    });
  }
  function chips(selector, attr, onPick) {
    var btns = document.querySelectorAll(selector);
    each(btns, function (b) {
      b.addEventListener('click', function () {
        each(btns, function (o) {
          o.classList.remove('is-active');
          o.setAttribute('aria-pressed', 'false');
        });
        b.classList.add('is-active');
        b.setAttribute('aria-pressed', 'true');
        onPick(b.getAttribute(attr));
      });
    });
  }

  /* =====================================================================
     B. Bisect — narrowing to the first bad transaction
  ===================================================================== */
  (function bisect() {
    var track = document.getElementById('bisectTrack');
    var log = document.getElementById('bisectLog');
    if (!track) return;

    var N = 14;
    var FIRST_BAD = 9; // 0-indexed → version v10
    var lo, hi, marks, probe, done, timer;
    var bars = [];

    for (var i = 0; i < N; i++) {
      var col = el('div', 'p2-ver');
      col.appendChild(el('div', 'p2-ver__bar'));
      col.appendChild(el('span', 'p2-ver__num', 'v' + (i + 1)));
      track.appendChild(col);
      bars.push(col);
    }

    function reset(quiet) {
      window.clearInterval(timer);
      lo = 0;
      hi = N - 1;
      marks = {};
      probe = null;
      done = false;
      render();
      if (!quiet && log) {
        log.innerHTML = '<b>14 committed versions in range.</b> Bisect knows v1 is clean and v14 carries the bad value.';
      }
    }

    function render() {
      bars.forEach(function (col, idx) {
        col.className = 'p2-ver';
        if (done && idx === lo) col.classList.add('is-found');
        else if (probe === idx) col.classList.add('is-probe');
        else if (marks[idx] === 'bad') col.classList.add('is-bad');
        else if (marks[idx] === 'good') col.classList.add('is-good');
        else if (idx < lo || idx > hi) col.classList.add('is-out');
      });
    }

    function step() {
      if (done) return false;
      if (lo >= hi) {
        done = true;
        probe = null;
        render();
        if (log) {
          log.innerHTML =
            '<b>First bad version: v' +
            (lo + 1) +
            '.</b> Everything from here forward carries the corrupted value — that is the remediation window.';
        }
        return false;
      }
      var mid = Math.floor((lo + hi) / 2);
      probe = mid;
      render();
      var bad = mid >= FIRST_BAD;
      marks[mid] = bad ? 'bad' : 'good';
      if (bad) hi = mid;
      else lo = mid + 1;
      probe = null;
      render();
      if (log) {
        log.innerHTML =
          '<b>Probe v' +
          (mid + 1) +
          ':</b> value is ' +
          (bad ? 'wrong' : 'correct') +
          ' → search narrows to v' +
          (lo + 1) +
          '–v' +
          (hi + 1) +
          '.';
      }
      return true;
    }

    document.getElementById('bisectStep').addEventListener('click', function () {
      window.clearInterval(timer);
      step();
    });
    document.getElementById('bisectReset').addEventListener('click', function () {
      reset();
    });
    document.getElementById('bisectAuto').addEventListener('click', function () {
      reset(true);
      if (log) log.innerHTML = '<b>Running.</b> Halving the range on each probe…';
      timer = window.setInterval(function () {
        if (!step()) window.clearInterval(timer);
      }, 950);
    });

    reset();
  })();

  /* =====================================================================
     C. The decision ladder — guided + explorable
  ===================================================================== */
  (function ladder() {
    var svgRoot = document.getElementById('treeSvg');
    if (!svgRoot) return;

    var gEdges = document.getElementById('treeEdges');
    var gLabels = document.getElementById('treeLabels');
    var gNodes = document.getElementById('treeNodes');
    var aside = document.getElementById('treeAside');
    var crumbs = document.getElementById('treeCrumbs');

    var W = 186;
    var H = 58;

    var NODES = {
      root: {
        x: 10,
        y: 196,
        t: 'Bad data in production',
        s: 'Scope it with Bisect first',
        h4: 'Start here',
        p: 'Before choosing a remediation, establish which transaction first introduced the bad value and how many rows it touched. Everything below depends on that scope.',
        li: [
          'Time Travel + Bisect narrow the window precisely.',
          'Bisect only sees versions still inside the retention policy.',
          'Outside retention, scope by date range and lineage instead.'
        ],
        sec: '#step0',
        end: '#ladder',
        jumpText: 'Step 0'
      },
      rung4: {
        x: 288,
        y: 26,
        t: 'Rung 4 · Scoped rollback',
        s: 'The output should not exist',
        h4: 'Rung 4 — scoped dataset rollback',
        p: 'For when the entire output for a window should disappear rather than be corrected: an errant job, a duplicate run, a write to the wrong branch.',
        li: [
          'Incrementality is preserved; a snapshot is a separate deliberate action.',
          'OSv2-backed object types need manual reindex intervention afterward.',
          'Only successful, in-retention transactions are valid targets.',
          'Reverts data, not code — the logic still needs fixing.'
        ],
        sec: '#rung4',
        jumpText: 'Rung 4'
      },
      q2: {
        x: 288,
        y: 286,
        t: 'Semantic or value break?',
        s: 'Did the definition change?',
        h4: 'Rung 1 — the fork that decides everything',
        p: 'The run itself was fine, so the question is whether the transform now means something different, or whether it meant the right thing and produced wrong values.',
        li: [
          'Semantic break: rows were never valid under any interpretation.',
          'Value break: intent was right, a bug corrupted a bounded set of rows.'
        ],
        sec: '#rung1',
        jumpText: 'Rung 1'
      },
      rung2: {
        x: 566,
        y: 200,
        t: 'Rung 2 · Hard reset',
        s: 'semantic_version bump',
        h4: 'Rung 2 — the semantic_version hard reset',
        p: 'Raising semantic_version forces one non-incremental run: previous comes back empty and the output is written with mode=replace.',
        li: [
          'Rewrites 100% of the output, so it crosses Funnel\u2019s 80% threshold.',
          'Does not touch the separate, Funnel-owned user-edit queue.',
          'The recomputed baseline is still merged against edits by primary key.',
          'Reserve it for genuine semantic breaks, not value-level bugs.'
        ],
        sec: '#rung2',
        end: '#rung3',
        jumpText: 'Rung 2'
      },
      q3: {
        x: 566,
        y: 340,
        t: 'One-off or recurring?',
        s: 'Who owns the replay?',
        h4: 'Rung 3 — choosing a backfill pattern',
        p: 'Both backfill patterns are correct. The choice is about ownership and compute scale, not correctness.',
        li: [
          'A bounded, known window with a human deciding when to replay → A.',
          'An unknown or recurring class of drift you want caught automatically → B.'
        ],
        sec: '#rung3',
        end: '#rung4',
        jumpText: 'Rung 3'
      },
      rung3a: {
        x: 844,
        y: 290,
        t: 'Rung 3A · Aux replay',
        s: 'Append the replay window',
        h4: 'Rung 3A — the auxiliary replay dataset',
        p: 'A permanent secondary input alongside the main pipeline. Deploy the fix, then append the affected raw records; both inputs are read in added mode and union into one run.',
        li: [
          'Must always receive APPEND transactions — never a SNAPSHOT.',
          'Deduplicate to one row per primary key before the write.',
          'Rank by the source business timestamp, never a runtime timestamp.',
          'Next run sees an empty added view — no special-case code path left behind.'
        ],
        sec: '#optA',
        end: '#optB',
        pre: '#bfFig',
        bf: 'a',
        jumpText: 'Option A'
      },
      rung3b: {
        x: 844,
        y: 384,
        t: 'Rung 3B · Hash-diff CDC',
        s: 'Self-healing, more compute',
        h4: 'Rung 3B — hash-diff CDC',
        p: 'Recompute every row from the full snapshot, hash the payload, and emit only rows whose hash changed. A code fix is detected by the pipeline itself.',
        li: [
          'Genuinely idempotent: unchanged inputs and code produce an empty delta.',
          'Catches the next silent regression too, not just this one.',
          'Cost is compute — every row is recomputed on every run.',
          'Deduplicate previous to one row per key before joining, or the diff fans out.'
        ],
        sec: '#optB',
        end: '#rung4',
        pre: '#bfFig',
        bf: 'b',
        jumpText: 'Option B'
      }
    };

    var EDGES = [
      { from: 'root', to: 'rung4', label: 'pipeline run' },
      { from: 'root', to: 'q2', label: 'data or logic' },
      { from: 'q2', to: 'rung2', label: 'semantics' },
      { from: 'q2', to: 'q3', label: 'values' },
      { from: 'q3', to: 'rung3a', label: 'one window' },
      { from: 'q3', to: 'rung3b', label: 'recurring' }
    ];

    var QUESTIONS = {
      root: {
        q: 'Where did the problem originate?',
        opts: [
          {
            to: 'rung4',
            b: 'The pipeline\u2019s own execution',
            s: 'A duplicate run, a bad write, a job that wrote to the wrong branch.'
          },
          {
            to: 'q2',
            b: 'The data or the logic it was fed',
            s: 'The run completed fine; what it produced is wrong.'
          }
        ]
      },
      q2: {
        q: 'Did the transform\u2019s meaning change, or just its output?',
        opts: [
          {
            to: 'rung2',
            b: 'Its meaning changed',
            s: 'Wrong join key, wrong filter population, a changed business definition. No historical row was ever valid.'
          },
          {
            to: 'q3',
            b: 'Only its values are wrong',
            s: 'An overflowing cast, a missing null branch, a sign error. A bounded set of rows needs correcting.'
          }
        ]
      },
      q3: {
        q: 'Is this a one-off window, or a class of drift you expect again?',
        opts: [
          {
            to: 'rung3a',
            b: 'A known, bounded window',
            s: 'You know exactly which records are affected and want to decide when they replay.'
          },
          {
            to: 'rung3b',
            b: 'Recurring or not fully known',
            s: 'You would rather the pipeline detect and repair discrepancies on its own each run.'
          }
        ]
      }
    };

    var parent = {};
    var edgeLabel = {};
    EDGES.forEach(function (e) {
      parent[e.to] = e.from;
      edgeLabel[e.to] = e.label;
    });

    var mode = 'guide';
    var current = 'root';
    var nodeEls = {};
    var edgeEls = {};
    var labelEls = {};

    // edges + labels
    EDGES.forEach(function (e) {
      var a = NODES[e.from];
      var b = NODES[e.to];
      var x1 = a.x + W;
      var y1 = a.y + H / 2;
      var x2 = b.x;
      var y2 = b.y + H / 2;
      var d = 'M' + x1 + ' ' + y1 + ' C' + (x1 + 62) + ' ' + y1 + ', ' + (x2 - 62) + ' ' + y2 + ', ' + x2 + ' ' + y2;
      var p = svg('path', { class: 'p2-tedge', d: d });
      gEdges.appendChild(p);
      edgeEls[e.to] = p;

      var lab = svg('text', {
        class: 'p2-tlabel',
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2 - 7,
        'text-anchor': 'middle'
      });
      lab.textContent = e.label;
      gLabels.appendChild(lab);
      labelEls[e.to] = lab;
    });

    // nodes
    Object.keys(NODES).forEach(function (id) {
      var n = NODES[id];
      var g = svg('g', { class: 'p2-tnode', tabindex: '0', role: 'button' });
      g.setAttribute('aria-label', n.t + ' — ' + n.s);
      g.appendChild(svg('rect', { class: 'p2-tnode__box', x: n.x, y: n.y, width: W, height: H, rx: 9 }));
      var t = svg('text', { class: 'p2-tnode__t', x: n.x + 14, y: n.y + 24 });
      t.textContent = n.t;
      g.appendChild(t);
      var s = svg('text', { class: 'p2-tnode__s', x: n.x + 14, y: n.y + 41 });
      s.textContent = n.s;
      g.appendChild(s);
      g.addEventListener('click', function () {
        pick(id);
      });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          pick(id);
        }
      });
      gNodes.appendChild(g);
      nodeEls[id] = g;
    });

    function pathTo(id) {
      var chain = [id];
      var cur = id;
      while (parent[cur]) {
        cur = parent[cur];
        chain.unshift(cur);
      }
      return chain;
    }

    function pick(id) {
      if (mode === 'guide') {
        // in guided mode, only allow moving to a node on the answered path
        // or re-selecting an ancestor to rewind the decision
        var chain = pathTo(current);
        if (chain.indexOf(id) === -1) return;
      }
      current = id;
      render();
    }

    function render() {
      var chain = pathTo(current);

      // moving to a different node puts any open section back in the article
      if (openId && openId !== current) closeReader(false);

      Object.keys(nodeEls).forEach(function (id) {
        var g = nodeEls[id];
        g.classList.remove('is-path', 'is-current', 'is-off');
        if (id === current) g.classList.add('is-current');
        else if (chain.indexOf(id) !== -1) g.classList.add('is-path');
        else g.classList.add('is-off');
      });

      Object.keys(edgeEls).forEach(function (to) {
        var onPath = chain.indexOf(to) !== -1;
        edgeEls[to].classList.toggle('is-path', onPath);
        edgeEls[to].classList.toggle('is-off', !onPath);
        labelEls[to].classList.toggle('is-path', onPath);
      });

      renderCrumbs(chain);
      renderAside();
    }

    function renderCrumbs(chain) {
      crumbs.innerHTML = '';
      if (chain.length < 2) {
        crumbs.appendChild(
          el('span', 'p2-crumbs__empty', 'No decisions taken yet — answer the first question, or click any node to see how it is reached.')
        );
        return;
      }
      chain.slice(1).forEach(function (id, i) {
        if (i) crumbs.appendChild(el('span', 'p2-crumbs__sep', '›'));
        crumbs.appendChild(el('span', 'p2-crumb p2-crumb--q', NODES[parent[id]].t));
        crumbs.appendChild(el('span', 'p2-crumbs__sep', '→'));
        crumbs.appendChild(el('span', 'p2-crumb', edgeLabel[id]));
      });
    }

    function renderAside() {
      var n = NODES[current];
      var q = QUESTIONS[current];
      var showQ = mode === 'guide' && !!q;

      aside.innerHTML = '';
      aside.className = 'p2-tree__aside' + (showQ ? ' has-q' : '');

      var detail = el('div', 'p2-tree__detail');
      detail.appendChild(el('h4', null, n.h4));
      detail.appendChild(el('p', null, n.p));
      var ul = el('ul');
      n.li.forEach(function (item) {
        ul.appendChild(el('li', null, item));
      });
      detail.appendChild(ul);
      aside.appendChild(detail);

      if (showQ) {
        var wrap = el('div', 'p2-tree__q');
        var box = el('div', 'p2-qa');
        box.appendChild(el('p', 'p2-qa__q', q.q));
        var opts = el('div', 'p2-qa__opts');
        q.opts.forEach(function (o) {
          var btn = el('button', 'p2-opt');
          btn.type = 'button';
          /* Border runner. While a question is unanswered these two cards are
             the only thing the reader should act on, so each carries a live cue
             rather than a static tint: four hairline streaks chase around the
             perimeter, one edge at a time. Purely decorative, so the elements
             are aria-hidden and carry no text. */
          runners().forEach(function (r) {
            btn.appendChild(r);
          });
          var body = el('span', 'p2-opt__body');
          body.appendChild(el('b', null, o.b));
          body.appendChild(el('span', null, o.s));
          btn.appendChild(body);
          btn.addEventListener('click', function () {
            current = o.to;
            render();
          });
          opts.appendChild(btn);
        });
        box.appendChild(opts);
        wrap.appendChild(box);
        aside.appendChild(wrap);
      }

      /* Primary call to action for the in-place reader, spanning the full width
         of the aside so it reads as the panel's one closing action rather than
         as a footnote to the left column. The root node is deliberately
         excluded: the ladder sits directly below Step 0, so offering to reopen
         the section the reader just finished is backwards — there the two
         question cards are the only call to action. */
      if (current !== 'root') {
        var see = el('button', 'p2-see');
        see.type = 'button';
        var seeText = el('span', 'p2-see__text');
        seeText.appendChild(el('b', 'p2-see__t', 'Read ' + n.jumpText + ' in full'));
        seeText.appendChild(
          el(
            'span',
            'p2-see__s',
            'Opens right here as a panel \u2014 one rung at a time, no scrolling away from the ladder.'
          )
        );
        see.appendChild(seeText);
        var seeIcon = el('span', 'p2-see__icon');
        seeIcon.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
        see.appendChild(seeIcon);
        see.setAttribute('aria-haspopup', 'dialog');
        see.addEventListener('click', function () {
          openReader(current);
        });
        aside.appendChild(see);
      }
    }

    /* Top, right, bottom, left. Each streak crosses its own edge and then waits
       out the rest of the cycle, and the four are offset by a quarter cycle
       each, so a single light appears to travel continuously around the card.
       All four are empty decorative spans; the CSS carries the animation. */
    var RUNNER_EDGES = ['t', 'r', 'b', 'l'];

    function runners() {
      return RUNNER_EDGES.map(function (edge) {
        var e = el('span', 'p2-opt__run p2-opt__run--' + edge);
        e.setAttribute('aria-hidden', 'true');
        return e;
      });
    }

    /* ---- the reader ---------------------------------------------------
       A full-bleed panel slides up over the article. The article section is
       MOVED into it, not cloned, so ids stay unique, copy buttons keep
       working, and no widget is duplicated. A dashed placeholder holds its
       spot until it returns. The bar keeps the decision path visible and
       offers jump pills, so another rung can be opened without closing. */

    var rdr = document.getElementById('p2Rdr');
    var rdrRail = document.getElementById('p2RdrRail');
    var rdrScroll = document.getElementById('p2RdrScroll');
    var rdrBody = document.getElementById('p2RdrBody');
    var rdrEyebrow = document.getElementById('p2RdrEyebrow');
    var rdrTitle = document.getElementById('p2RdrTitle');
    var groups = [];
    var openId = null;
    var closeTimer = null;
    var lastY = 0;

    function headerH() {
      var h = document.querySelector('.header');
      return h ? Math.round(h.getBoundingClientRect().height) : 69;
    }

    function syncHeader() {
      document.documentElement.style.setProperty('--p2-hdr', headerH() + 'px');
    }
    syncHeader();
    window.addEventListener('resize', syncHeader);

    function sectionNodes(start, stop) {
      var out = [start];
      var n = start.nextElementSibling;
      while (n && n !== stop) {
        if (!stop && (n.tagName === 'H2' || n.tagName === 'H3')) break;
        out.push(n);
        n = n.nextElementSibling;
      }
      return out;
    }

    // A moved run of nodes plus the placeholder holding its slot in the prose.
    function lift(nodes, label) {
      var s = el('div', 'p2-moved');
      s.appendChild(el('span', null, '\u201c' + label + '\u201d is open in the reader.'));
      var back = el('button', 'p2-moved__btn', 'Put it back');
      back.type = 'button';
      back.addEventListener('click', function () {
        closeReader(false);
      });
      s.appendChild(back);
      nodes[0].parentNode.insertBefore(s, nodes[0]);
      nodes.forEach(function (node) {
        rdrBody.appendChild(node);
      });
      return { slot: s, nodes: nodes };
    }

    function blockLabel(node) {
      var t = node.querySelector('.panel__title');
      return t ? t.textContent.trim() : headingText(node);
    }

    function headingText(h) {
      var c = h.cloneNode(true);
      var num = c.querySelector('.num');
      if (num) num.remove();
      return c.textContent.trim();
    }

    function restore() {
      if (!groups.length) return;
      groups.forEach(function (g) {
        g.nodes.forEach(function (node) {
          node.classList.remove('is-rdr-head');
          g.slot.parentNode.insertBefore(node, g.slot);
        });
        g.slot.remove();
      });
      groups = [];
      rdrBody.innerHTML = '';
    }

    function renderRail(id) {
      var chain = pathTo(id);
      rdrRail.innerHTML = '';

      chain.slice(1).forEach(function (step) {
        rdrRail.appendChild(el('span', 'p2-rdr__pill is-path', edgeLabel[step]));
        rdrRail.appendChild(el('span', 'p2-rdr__sep', '\u2192'));
      });
      rdrRail.appendChild(el('span', 'p2-rdr__pill is-cur', NODES[id].t));

      var others = Object.keys(NODES).filter(function (k) {
        return NODES[k].sec && k !== id && chain.indexOf(k) === -1;
      });
      if (!others.length) return;

      rdrRail.appendChild(el('span', 'p2-rdr__sep p2-rdr__sep--jump', 'or jump:'));
      others.slice(0, 3).forEach(function (k) {
        var b = el('button', 'p2-rdr__pill', NODES[k].jumpText);
        b.type = 'button';
        b.addEventListener('click', function () {
          current = k;
          render();
          openReader(k);
        });
        rdrRail.appendChild(b);
      });
    }

    function closeReader(returnFocus) {
      if (!openId) return;
      openId = null;
      rdr.classList.remove('is-open');
      rdr.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('p2-rdr-lock');
      document.body.style.top = '';
      window.scrollTo(0, lastY);

      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        restore();
        renderAside();
        if (returnFocus) {
          var btn = aside.querySelector('.p2-see');
          if (btn) btn.focus({ preventScroll: true });
        }
      }, 540);

      // land back on the ladder, not wherever the article happened to be
      var fig = document.getElementById('treeSvg');
      if (fig) {
        var box = fig.closest('figure') || fig;
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function openReader(id) {
      var n = NODES[id];
      if (!n || !n.sec) return;
      var start = document.querySelector(n.sec);
      if (!start) return;

      clearTimeout(closeTimer);
      if (!openId) lastY = window.scrollY || window.pageYOffset || 0;
      restore();

      // A shared diagram that belongs above the section (the A/B backfill flow).
      var pre = n.pre ? document.querySelector(n.pre) : null;
      if (pre) groups.push(lift([pre], blockLabel(pre)));

      var stop = n.end ? document.querySelector(n.end) : null;
      start.classList.add('is-rdr-head');
      groups.push(lift(sectionNodes(start, stop), headingText(start)));

      // Scroll-reveal never fires inside the reader, so settle everything now.
      rdrBody.querySelectorAll('.reveal').forEach(function (r) {
        r.classList.add('is-in');
      });
      Array.prototype.forEach.call(rdrBody.children, function (c) {
        c.classList.add('is-in');
      });

      // Preselect the matching tab on a shared widget.
      if (n.bf) {
        var tab = rdrBody.querySelector('[data-backfill="' + n.bf + '"]');
        if (tab && !tab.classList.contains('is-active')) tab.click();
      }

      rdrEyebrow.textContent = n.t;
      rdrTitle.textContent = headingText(start);
      renderRail(id);

      openId = id;
      syncHeader();
      document.body.classList.add('p2-rdr-lock');
      rdr.classList.add('is-open');
      rdr.setAttribute('aria-hidden', 'false');
      rdrScroll.scrollTop = 0;
      renderAside();

      requestAnimationFrame(function () {
        rdrScroll.focus({ preventScroll: true });
      });
    }

    document.getElementById('p2RdrClose').addEventListener('click', function () {
      closeReader(true);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && openId) closeReader(true);
      if (ev.key !== 'Tab' || !openId) return;
      var f = rdr.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (ev.shiftKey && (document.activeElement === first || document.activeElement === rdrScroll)) {
        last.focus();
        ev.preventDefault();
      } else if (!ev.shiftKey && document.activeElement === last) {
        first.focus();
        ev.preventDefault();
      }
    });

    chips('[data-treemode]', 'data-treemode', function (m) {
      mode = m;
      if (m === 'guide') current = 'root';
      render();
    });
    document.getElementById('treeReset').addEventListener('click', function () {
      current = 'root';
      render();
    });

    render();
  })();

  /* =====================================================================
     C1b. Collapsible insight cards
  ===================================================================== */
  (function foldableInsights() {
    var cards = document.querySelectorAll('.p2-insight--fold');
    if (!cards.length) return;

    Array.prototype.forEach.call(cards, function (card) {
      var sum = card.querySelector('.p2-insight__sum');
      if (!sum) return;
      card.classList.add('is-ready');

      function set(open) {
        card.classList.toggle('is-open', open);
        sum.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      set(false);

      sum.addEventListener('click', function () {
        set(!card.classList.contains('is-open'));
      });
    });
  })();

  /* =====================================================================
     C2. Ledger rows — collapsible mechanics
  ===================================================================== */
  (function ledgerRows() {
    var groups = document.querySelectorAll('.p2-led');
    if (!groups.length) return;

    Array.prototype.forEach.call(groups, function (group) {
      var rows = Array.prototype.slice.call(group.querySelectorAll('.p2-led__row'));
      if (!rows.length) return;
      group.classList.add('is-ready');

      var all = group.querySelector('[data-led-all]');

      function isOpen(row) {
        return row.classList.contains('is-open');
      }

      function set(row, open) {
        row.classList.toggle('is-open', open);
        var sum = row.querySelector('.p2-led__sum');
        if (sum) sum.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      function sync() {
        if (!all) return;
        var everyOpen = rows.every(isOpen);
        all.textContent = everyOpen ? 'collapse all' : 'expand all';
        all.setAttribute('aria-pressed', everyOpen ? 'true' : 'false');
      }

      rows.forEach(function (row) {
        var sum = row.querySelector('.p2-led__sum');
        if (!sum) return;
        set(row, false);
        sum.addEventListener('click', function () {
          set(row, !isOpen(row));
          sync();
        });
      });

      if (all) {
        all.addEventListener('click', function () {
          var open = !rows.every(isOpen);
          rows.forEach(function (row) {
            set(row, open);
          });
          sync();
        });
      }

      sync();
    });
  })();

  /* =====================================================================
     D. Funnel's 80% threshold, as a dial
  ===================================================================== */
  (function threshold() {
    var range = document.getElementById('thresholdRange');
    if (!range) return;
    var val = document.getElementById('thresholdVal');
    var fill = document.getElementById('thresholdFill');
    var meter = document.getElementById('thresholdMeter');
    var badge = document.getElementById('thresholdBadge');
    var note = document.getElementById('thresholdNote');

    function render() {
      var v = Number(range.value);
      val.textContent = v + '%';
      fill.style.width = v + '%';
      var over = v > 80;
      meter.classList.toggle('is-over', over);
      badge.setAttribute('data-mode', over ? 'full' : 'incremental');
      badge.textContent = over ? 'full reindex' : 'incremental';
      if (v === 100) {
        note.textContent =
          'A semantic_version bump lands here: mode=replace rewrites every row, so Funnel abandons incremental indexing by definition. This is the case to reserve for genuine semantic breaks.';
      } else if (over) {
        note.textContent =
          'Above the default 80% line, Funnel abandons incremental indexing in favour of a full batch reindex — the same cost as a hard reset, reached by a backfill that was too broad.';
      } else if (v === 0) {
        note.textContent = 'No modified rows in the transaction: nothing for Funnel to index incrementally or otherwise.';
      } else {
        note.textContent =
          'Below the line, Funnel indexes incrementally. A targeted backfill that stays here keeps the operational loop running at normal cadence.';
      }
    }
    range.addEventListener('input', render);
    render();
  })();

  /* =====================================================================
     E. Trigger matrix — column selection
  ===================================================================== */
  (function matrix() {
    var table = document.getElementById('triggerMatrix');
    if (!table) return;
    var cap = document.getElementById('matrixCap');
    var base = cap.textContent;

    var notes = [
      'semantic_version bump — field-observed in my environment as an in-place reindex of the live pipeline for one object type. Palantir does not document the routing either way.',
      'More than 80% of rows carrying modified values in a single transaction — documented as abandoning incremental indexing in favour of a full batch reindex.',
      'An object-type schema change — documented as orchestrating a replacement pipeline in the background while the live pipeline keeps serving reads.',
      'A manual reindex from Ontology Manager — Palantir does not document which mechanism this uses. Field-observed as a replacement pipeline in one instance, queryable throughout.',
      'Funnel may provision a replacement pipeline "for performance reasons based on various heuristics" that Palantir does not enumerate — which is why none of this generalises without testing.'
    ];

    var sel = null;
    each(table.querySelectorAll('thead th[data-col]'), function (th) {
      th.addEventListener('click', function () {
        var c = th.getAttribute('data-col');
        sel = sel === c ? null : c;
        each(table.querySelectorAll('.is-sel'), function (n) {
          n.classList.remove('is-sel');
        });
        if (sel === null) {
          cap.textContent = base;
          return;
        }
        each(table.querySelectorAll('[data-col="' + sel + '"]'), function (n) {
          n.classList.add('is-sel');
        });
        cap.textContent = notes[Number(sel)];
      });
    });
  })();

  /* =====================================================================
     F. Conflict-resolution simulator
  ===================================================================== */
  (function conflict() {
    var rowHost = document.getElementById('simRow');
    if (!rowHost) return;
    var out = document.getElementById('simOutcome');

    var state = { strategy: 'edits', bump: 'no', prop: 'normal' };

    function render() {
      var editWins;
      var why;

      if (state.prop === 'editonly') {
        editWins = true;
        why =
          'Edit-only properties have no column in the backing dataset, and Palantir documents that edits to them "always apply" — no conflict-resolution strategy and no Timestamp comparison enters into it.';
      } else if (state.strategy === 'edits') {
        editWins = true;
        why =
          'Under the default Apply user edits strategy, a standing operator edit is never overwritten by the datasource — your corrected pipeline value is discarded for this property.';
      } else if (state.bump === 'yes') {
        editWins = false;
        why =
          'Apply most recent value compares the edit timestamp against a Timestamp property on the row. Your corrected run advanced it, so the pipeline value is newer and wins.';
      } else {
        editWins = false;
        why = '';
      }

      if (state.prop !== 'editonly' && state.strategy === 'recent' && state.bump === 'no') {
        editWins = true;
        why =
          'This is the trap. Apply most recent value does not compare "when the build ran" — it compares a Timestamp property on the row. A logic-only fix leaves that field untouched, so the operator edit still looks newer and still wins, even though you selected the beta strategy expecting otherwise.';
      }

      var dsValue = '4,180.00';
      var editValue = '3,999.00';
      var resolved = editWins ? editValue : dsValue;
      var tsNote = state.bump === 'yes' ? 'Timestamp advanced' : 'Timestamp unchanged';

      rowHost.innerHTML = '';

      var c1 = el('div', 'p2-row__cell' + (editWins ? ' p2-row__cell--lose' : ' p2-row__cell--win'));
      c1.appendChild(el('b', null, 'Datasource value (corrected run)'));
      var c1v = el('span');
      c1v.appendChild(el('code', null, dsValue));
      c1.appendChild(c1v);
      rowHost.appendChild(c1);

      var c2 = el('div', 'p2-row__cell' + (editWins ? ' p2-row__cell--win' : ' p2-row__cell--lose'));
      c2.appendChild(el('b', null, 'Standing user edit (operator, Tuesday)'));
      var c2v = el('span');
      c2v.appendChild(el('code', null, editValue));
      c2.appendChild(c2v);
      rowHost.appendChild(c2);

      var c3 = el('div', 'p2-row__cell');
      c3.appendChild(el('b', null, 'Resolved value in the Ontology'));
      var c3v = el('span');
      c3v.appendChild(el('code', null, resolved));
      c3.appendChild(c3v);
      rowHost.appendChild(c3);

      var c4 = el('div', 'p2-row__cell');
      c4.appendChild(el('b', null, 'Row Timestamp property'));
      var c4v = el('span');
      c4v.appendChild(el('code', null, tsNote));
      c4.appendChild(c4v);
      rowHost.appendChild(c4);

      out.setAttribute('data-w', editWins ? 'edit' : 'pipeline');
      out.innerHTML = '';
      out.appendChild(
        el('p', 'p2-outcome__head', editWins ? 'The user edit wins — your fix does not land' : 'The pipeline value wins — your fix lands')
      );
      out.appendChild(el('p', null, why));
    }

    segment(document.getElementById('simStrategy'), function (v) {
      state.strategy = v;
      render();
    });
    segment(document.getElementById('simBump'), function (v) {
      state.bump = v;
      render();
    });
    segment(document.getElementById('simProp'), function (v) {
      state.prop = v;
      render();
    });
    render();
  })();

  /* =====================================================================
     G. Funnel stage timeline — reads and writes per stage
  ===================================================================== */
  (function stages() {
    var track = document.getElementById('stageTrack');
    if (!track) return;
    var readsBox = document.getElementById('stageReads');
    var writesBox = document.getElementById('stageWrites');
    var cap = document.getElementById('stageCap');

    var STAGE_NAMES = ['Changelog', 'Merge changes', 'Indexing', 'Hydration'];

    var DATA = {
      inplace: {
        cap: 'In-place reindex of the live pipeline: field-observed for a semantic_version bump on one object type. Reads keep returning pre-reindex values for the whole cycle; writes still land immediately.',
        reads: [
          { s: 'ok', h: 'Current values', p: 'The live index is still the only index. Nothing has changed yet.' },
          { s: 'ok', h: 'Current values', p: 'Changelog datasets and recent user edits are joined by primary key. Reads are unaffected.' },
          {
            s: 'stale',
            h: 'Pre-reindex values',
            p: 'Field-observed: SQL Console kept returning the pre-bump row count. No errors, no downtime — just the old numbers.'
          },
          {
            s: 'stale',
            h: 'Pre-reindex values',
            p: 'Still the pre-bump count, including through the second hydration pass. The new count appeared only once the cycle fully completed.'
          }
        ],
        writes: [
          { s: 'ok', h: 'Applied immediately', p: 'Actions write to Funnel\u2019s offset-tracked queue and are applied to the live index at once.' },
          { s: 'ok', h: 'Applied immediately', p: 'This is the stage where queued edits are merged into the recomputed baseline by primary key.' },
          {
            s: 'ok',
            h: 'Applied immediately',
            p: 'Field test: an edit submitted during indexing reflected immediately in SQL Console — the documented read-your-writes guarantee held.'
          },
          {
            s: 'ok',
            h: 'Applied immediately',
            p: 'Field test: a second edit submitted during hydration also reflected immediately. The mechanism behind that is not documented.'
          }
        ]
      },
      replacement: {
        cap: 'Replacement pipeline: documented for object-type schema changes. The live pipeline keeps serving reads throughout, with an atomic cutover after the replacement\u2019s first successful run.',
        reads: [
          { s: 'ok', h: 'Live pipeline serving', p: 'Documented: the replacement is orchestrated in the background "without impacting the live data being served to users."' },
          { s: 'ok', h: 'Live pipeline serving', p: 'The live pipeline continues on its usual cadence while the replacement builds.' },
          { s: 'ok', h: 'Live pipeline serving', p: 'Still the live index. One reported build ran 10–12 hours for a streaming-backed object type.' },
          { s: 'ok', h: 'Cutover on success', p: 'Only "after the replacement pipeline successfully runs for the first time" does it take over.' }
        ],
        writes: [
          { s: 'unknown', h: 'Not documented', p: 'Palantir does not state what happens to concurrent Actions/user edits while a replacement pipeline runs in the background.' },
          {
            s: 'unknown',
            h: 'Not documented',
            p: 'The replacement almost certainly merges "recent user edits coming from Actions" here, since it is described as an entirely new Funnel pipeline — but the catch-up cadence is unstated.'
          },
          {
            s: 'unknown',
            h: 'Not documented',
            p: 'Whether it stays continuously in sync right up to cutover, or merges once and defers later edits, is not published. Funnel\u2019s edit queue flushes on a six-hour cadence.'
          },
          {
            s: 'unknown',
            h: 'Not documented',
            p: 'One documented case had both live and replacement pipelines stuck in failure-backoff simultaneously, needing manual intervention.'
          }
        ]
      }
    };

    var mech = 'inplace';
    var stage = 0;
    var btns = [];

    STAGE_NAMES.forEach(function (name, i) {
      var b = el('button', 'p2-stage');
      b.type = 'button';
      b.appendChild(el('span', 'p2-stage__n', 'stage ' + (i + 1)));
      b.appendChild(el('span', 'p2-stage__name', name));
      b.addEventListener('click', function () {
        stage = i;
        render();
      });
      track.appendChild(b);
      btns.push(b);
    });

    function fillBox(box, label, d) {
      box.setAttribute('data-s', d.s);
      box.innerHTML = '';
      var lab = el('div', 'p2-rw__label');
      lab.appendChild(el('span', null, label));
      box.appendChild(lab);
      box.appendChild(el('p', 'p2-rw__state', d.h));
      box.appendChild(el('p', null, d.p));
    }

    function render() {
      btns.forEach(function (b, i) {
        b.classList.toggle('is-on', i === stage);
        b.classList.toggle('is-past', i < stage);
      });
      var d = DATA[mech];
      fillBox(readsBox, 'Reads', d.reads[stage]);
      fillBox(writesBox, 'Writes', d.writes[stage]);
      cap.textContent = d.cap;
    }

    chips('[data-mech]', 'data-mech', function (m) {
      mech = m;
      render();
    });
    render();
  })();

  /* =====================================================================
     H. Rollback dual timeline
  ===================================================================== */
  (function rollback() {
    var src = document.getElementById('tlSource');
    if (!src) return;
    var tgt = document.getElementById('tlTarget');
    var range = document.getElementById('tlRange');
    var val = document.getElementById('tlVal');
    var note = document.getElementById('tlNote');
    var out = document.getElementById('tlOutcome');

    var N = 12;
    var BAD_FROM = 8; // t9 onward carries the bad output

    for (var i = 1; i <= N; i++) {
      src.appendChild(el('span', 'p2-tx p2-tx--src', 't' + i));
    }
    var cells = [];
    for (var j = 1; j <= N; j++) {
      var c = el('span', 'p2-tx', 't' + j);
      tgt.appendChild(c);
      cells.push(c);
    }
    var next = el('span', 'p2-tx is-catchup', 'next run');
    tgt.appendChild(next);

    function render() {
      var r = Number(range.value);
      val.textContent = 't' + r;
      cells.forEach(function (c, idx) {
        var t = idx + 1;
        c.className = 'p2-tx';
        if (t > r) c.classList.add('is-reverted');
        else if (t === r) c.classList.add('is-target');
        else if (t >= BAD_FROM + 1) c.classList.add('is-bad');
      });
      if (r >= N) {
        note.textContent = 'no rollback applied — output is at its latest transaction';
        out.setAttribute('data-w', 'pipeline');
        out.innerHTML = '';
        out.appendChild(el('p', 'p2-outcome__head', 'Nothing reverted yet'));
        out.appendChild(
          el(
            'p',
            null,
            'Drag left to pick a rollback target. Only successful, in-retention transactions are valid targets — a transaction removed by a retention policy cannot be rolled back to.'
          )
        );
        return;
      }
      note.textContent = 'rolled back to t' + r + ' — ' + (N - r) + ' transaction(s) reverted';
      out.setAttribute('data-w', 'edit');
      out.innerHTML = '';
      var clean = r <= BAD_FROM;
      out.appendChild(
        el(
          'p',
          'p2-outcome__head',
          clean ? 'Bad output removed — and the loop now needs manual attention' : 'Partial rollback — bad transactions remain'
        )
      );
      out.appendChild(
        el(
          'p',
          null,
          clean
            ? 'The output dataset is back to a state before t9, where the bad output began. Sources are untouched, so the next scheduled incremental run reads previous as the rolled-back state and reprocesses the input rows added since — incrementality is preserved. But the logic is not reverted, and an OSv2-backed object type needs manual intervention to reindex via a successful replacement pipeline run before the Ontology reflects any of this.'
            : 'Transactions from t9 onward carry the bad output. Rolling back only to t' +
                r +
                ' leaves some of them in place — the corrupted window is still being served.'
        )
      );
    }

    range.addEventListener('input', render);
    render();
  })();

  /* =====================================================================
     I. Backfill patterns A / B
  ===================================================================== */
  (function backfill() {
    var flow = document.getElementById('bfFlow');
    if (!flow) return;
    var scope = document.getElementById('bfScope');
    var compute = document.getElementById('bfCompute');
    var status = document.getElementById('bfStatus');
    var play = document.getElementById('bfPlay');

    var DATA = {
      a: {
        scope: ['Ownership', 'Human-triggered', 'You decide which records replay and when. The affected window is known up front and appended deliberately.'],
        compute: ['Compute profile', 'Proportional', 'Only the replay window plus the day\u2019s normal delta is processed — cost scales with the size of the damage.'],
        steps: [
          ['Deploy the fixed transform logic', 'No semantic_version change; the pipeline stays incremental.'],
          ['APPEND the affected raw records to the auxiliary replay dataset', 'Never a SNAPSHOT — that would break incrementality on this input.'],
          ['Both inputs read in added mode', 'The pipeline unions the replay rows with the normal daily delta.'],
          ['Deduplicate to one row per primary key', 'Rank by the source business timestamp, never a runtime timestamp.'],
          ['Append corrected results to the output', 'Funnel merges them against the live edit queue by primary key.'],
          ['Next run: the added view is empty again', 'No truncate, no rollback, no lingering special-case code path.']
        ]
      },
      b: {
        scope: ['Ownership', 'Pipeline-triggered', 'The pipeline detects the discrepancy itself. It will catch the next silent regression too, not just this one.'],
        compute: ['Compute profile', 'Full scan every run', 'Every source row is recomputed and hashed on every run before the delta is even calculated.'],
        steps: [
          ['Load the full source snapshot', 'Every run reads everything, not a delta.'],
          ['Apply the current transformation to every row', 'Including the fix you just deployed.'],
          ['Hash the resulting payload per row', 'sha2 over a concatenated payload keeps collision risk low at high row counts.'],
          ['Deduplicate previous to one row per primary key', 'Rank by business timestamp first, or the comparison join fans out.'],
          ['Compare hashes, emit only what changed', 'A code fix changes the hash, so the corrected rows fall out automatically.'],
          ['Write the delta as an APPEND', 'Idempotent: unchanged inputs and code produce an empty delta.']
        ]
      }
    };

    var mode = 'a';
    var timer;

    function card(host, d) {
      host.innerHTML = '';
      host.appendChild(el('p', 'p2-kicker', d[0]));
      host.appendChild(el('h5', null, d[1]));
      host.appendChild(el('p', null, d[2]));
    }

    function render() {
      window.clearInterval(timer);
      var d = DATA[mode];
      card(scope, d.scope);
      card(compute, d.compute);
      flow.innerHTML = '';
      d.steps.forEach(function (s, i) {
        var step = el('div', 'p2-flow__step is-lit');
        step.appendChild(el('span', 'p2-flow__i', String(i + 1)));
        var t = el('div', 'p2-flow__t');
        t.appendChild(el('b', null, s[0]));
        t.appendChild(el('span', null, s[1]));
        step.appendChild(t);
        flow.appendChild(step);
      });
      status.textContent = 'idle';
      status.className = 'p2-tag';
    }

    function run() {
      window.clearInterval(timer);
      var steps = flow.querySelectorAll('.p2-flow__step');
      each(steps, function (s) {
        s.classList.remove('is-lit');
      });
      var i = 0;
      status.textContent = 'running';
      status.className = 'p2-tag p2-tag--doc';
      timer = window.setInterval(function () {
        if (i >= steps.length) {
          window.clearInterval(timer);
          status.textContent = mode === 'a' ? 'window replayed' : 'delta emitted';
          status.className = 'p2-tag p2-tag--ok';
          return;
        }
        steps[i].classList.add('is-lit');
        i++;
      }, 620);
    }

    chips('[data-backfill]', 'data-backfill', function (m) {
      mode = m;
      render();
    });
    play.addEventListener('click', run);
    render();
  })();
})();
