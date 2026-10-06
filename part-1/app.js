
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
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    bar.style.width = pct.toFixed(2) + '%';
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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

  /* ---------- diagram 1: architecture ---------- */
  var ARCH = {
    dataset: {
      kicker: 'Tier 1 · dataset layer',
      title: 'Files, wrapped in transactions',
      body:
        'A dataset is a logical wrapper around a collection of files in a backing filesystem — HDFS or cloud storage such as S3 — with Foundry maintaining the logical-to-physical mapping. Structured datasets hold tabular files, typically Parquet, plus column metadata.',
      bullets: [
        'Every change is a transaction: SNAPSHOT, APPEND, UPDATE, DELETE',
        'APPEND adds files and cannot modify existing ones',
        'UPDATE may overwrite files, which breaks downstream incrementality',
        'File-facing tools live here: Contour, Pipeline Builder, Code Repositories',
        'Foundry SQL reads from this tier and the Ontology tier alike'
      ]
    },
    semantic: {
      kicker: 'Tier 2 · semantic elements',
      title: 'The nouns of the business',
      body:
        'Object types, their properties, and the link types that connect them. This is the shared vocabulary that Workshop apps, Functions, and AIP agents all resolve against — not a BI-layer view over a warehouse table.',
      bullets: [
        'Object types are backed by datasources, including streaming ones',
        'Link types model real relationships, enabling search-arounds',
        'The same object type serves apps, agents, and SQL alike'
      ]
    },
    kinetic: {
      kicker: 'Tier 2 · kinetic elements',
      title: 'The verbs, and who may use them',
      body:
        'Actions, Functions, and dynamic security. This is the half of the Ontology with no lakehouse analogue: it is how a user or an agent is permitted to change the state of the world, under enforced rules.',
      bullets: [
        'Actions define validated, permissioned state changes',
        'Functions compute derived logic on object sets',
        'Dynamic security governs row- and object-level visibility'
      ]
    },
    storage: {
      kicker: 'Tier 2 · storage & query',
      title: 'Object Storage v2, not a KV cache',
      body:
        'Funnel converts merged rows into index files and writes them into a separate index dataset. OSv2 then downloads those index files onto the disks of its search nodes — a step called hydration — and serves reads, search-arounds, and aggregations through a Spark-based query execution layer.',
      bullets: [
        'Index files land in a dataset first, then hydrate onto node disks',
        'All indexed data is ephemeral; durability lives in the file layer',
        'OSv2 is a component of the Ontology, not a synonym for it'
      ]
    },
    consumers: {
      kicker: 'Operational surfaces',
      title: 'Reads that go through the Ontology',
      body:
        'Workshop applications and AIP agents consume object types, links, and Actions rather than querying the file layer. That indirection is what makes permissions, validation, and audit consistent across every consumer.',
      bullets: [
        'Workshop builds operational UIs directly on object types',
        'AIP agents invoke Actions as tools, subject to the same rules',
        'Foundry SQL deliberately spans both tiers: datasets, tables, and object types'
      ]
    },
    actions: {
      kicker: 'Writeback · step 1',
      title: 'The Actions service builds an instruction',
      body:
        'When a user submits an Action, the Actions service validates it and sends a modification instruction to Funnel, which stores it in a Funnel-managed queue with tracked offsets so nothing is lost or double-applied.',
      bullets: [
        'Validation and permissions are enforced before the write is emitted',
        'The offset-tracked queue is managed by Funnel, not by Actions',
        'Under OSv2, only objects used to generate edits are version-checked'
      ]
    },
    funnel: {
      kicker: 'Writeback · steps 2 and 3',
      title: 'Funnel applies, then flushes',
      body:
        'Funnel applies the edit logic immediately to the index in the object databases, so subsequent reads reflect the write. Because indexed data is ephemeral, it periodically flushes accumulated edits into persistent, Funnel-owned Foundry datasets.',
      bullets: [
        'Immediate index application gives read-your-writes behavior',
        'A merged dataset combines datasource rows with user edits',
        'Rebuilt on each new datasource transaction, or every 6 hours if edits exist'
      ]
    },
    merged: {
      kicker: 'Writeback · durable copy',
      title: 'The dataset you cannot see',
      body:
        'The merged dataset is owned and managed internally by Funnel, so it never appears in your pipeline build graph. Persistence still happens in the file layer — you just do not own that file.',
      bullets: [
        'Not user-accessible and not part of your lineage graph',
        'Use Workflow Lineage for downstream Ontology dependencies',
        'Use the opt-in Action log, or object-type edit history, for forensics'
      ]
    }
  };

  var aside = document.getElementById('archAside');
  var archNodes = Array.prototype.slice.call(document.querySelectorAll('#archSvg .node'));

  function renderAside(key) {
    var d = ARCH[key];
    if (!d || !aside) return;
    var html =
      '<p class="arch__kicker">' +
      d.kicker +
      '</p><h4>' +
      d.title +
      '</h4><p>' +
      d.body +
      '</p><ul>' +
      d.bullets
        .map(function (b) {
          return '<li>' + b + '</li>';
        })
        .join('') +
      '</ul>';
    aside.innerHTML = html;
  }

  function selectNode(node) {
    archNodes.forEach(function (n) {
      n.classList.toggle('is-active', n === node);
    });
    renderAside(node.getAttribute('data-key'));
  }

  archNodes.forEach(function (n) {
    n.addEventListener('click', function () {
      selectNode(n);
    });
    n.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectNode(n);
      }
    });
  });
  if (archNodes.length) selectNode(archNodes[0]);

  var flowToggle = document.getElementById('flowToggle');
  var archSvg = document.getElementById('archSvg');
  if (flowToggle && archSvg) {
    flowToggle.classList.add('is-active');
    flowToggle.addEventListener('click', function () {
      var on = archSvg.classList.toggle('is-flowing');
      flowToggle.setAttribute('aria-pressed', String(on));
      flowToggle.classList.toggle('is-active', on);
      flowToggle.textContent = on ? 'animate flow' : 'flow paused';
    });
  }

  /* ---------- diagram 2: transaction explorer ---------- */
  var TX = {
    snapshot: {
      files: [
        { name: 'part-0000.parquet', state: 'new' },
        { name: 'part-0001.parquet', state: 'new' },
        { name: 'part-0002.parquet', state: 'new' },
        { name: 'previous files', state: 'dropped' }
      ],
      ok: 'false',
      badge: 'Resets incrementality',
      note:
        'A SNAPSHOT replaces the entire dataset view with the files written in this transaction. Downstream incremental transforms have no append history to build on, so they process everything again.'
    },
    append: {
      files: [
        { name: 'part-0000.parquet', state: 'kept' },
        { name: 'part-0001.parquet', state: 'kept' },
        { name: 'part-0002.parquet', state: 'new' },
        { name: 'part-0003.parquet', state: 'new' }
      ],
      ok: 'true',
      badge: 'Fully incremental',
      note:
        'An APPEND adds new files to the view and cannot modify existing ones. This is the transaction type that makes cheap incremental computation possible: added output rows can be derived from added input rows alone.'
    },
    update: {
      files: [
        { name: 'part-0000.parquet', state: 'kept' },
        { name: 'part-0001.parquet', state: 'rewritten' },
        { name: 'part-0002.parquet', state: 'new' }
      ],
      ok: 'false',
      badge: 'Breaks incrementality',
      note:
        'An UPDATE adds files and may overwrite the contents of existing ones. Because history is no longer append-only, downstream consumers must fall back to full snapshot processing — the most common cause of a pipeline that silently stops running incrementally.'
    },
    delete: {
      files: [
        { name: 'part-0000.parquet', state: 'kept' },
        { name: 'part-0001.parquet', state: 'dropped' },
        { name: 'part-0002.parquet', state: 'kept' }
      ],
      ok: 'partial',
      badge: 'Reference removal only',
      note:
        'A DELETE removes the reference to a file from the dataset view. The underlying file is not erased from the backing filesystem, and the removal is not an append — plan for a snapshot downstream.'
    }
  };

  var txTabs = document.getElementById('txTabs');
  var txFiles = document.getElementById('txFiles');
  var txBadge = document.getElementById('txBadge');
  var txNote = document.getElementById('txNote');

  function renderTx(key) {
    var d = TX[key];
    if (!d) return;
    txFiles.innerHTML = d.files
      .map(function (f) {
        return '<span class="file file--' + f.state + '">' + f.name + '</span>';
      })
      .join('');
    txBadge.setAttribute('data-ok', d.ok);
    txBadge.textContent = d.badge;
    txNote.textContent = d.note;
    Array.prototype.forEach.call(txTabs.children, function (b) {
      var on = b.getAttribute('data-tx') === key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
  }

  if (txTabs) {
    Array.prototype.forEach.call(txTabs.children, function (b) {
      b.addEventListener('click', function () {
        renderTx(b.getAttribute('data-tx'));
      });
    });
    renderTx('snapshot');
  }

  /* ---------- diagram 3: writeback stepper ---------- */
  var STEPS = [
    {
      label: 'Instruction',
      kicker: 'Step 1 · Actions service',
      title: 'The edit becomes a queued instruction',
      body:
        'A user clicks a button in a Workshop app, or an AIP agent invokes an Action. The Actions service validates the submission and sends a modification instruction to Funnel, which stores it in a Funnel-managed queue with tracked offsets.',
      meta: ['queue owner: Funnel', 'offsets tracked', 'no Spark job involved']
    },
    {
      label: 'Live index',
      kicker: 'Step 2 · object databases',
      title: 'Logic is applied to the index immediately',
      body:
        'Funnel applies the edit logic to the index in the object databases right away, so the next read reflects the change. Under OSv2 the Actions service only version-checks objects directly used to generate the edits, which reduces StaleObject conflicts at the cost of a weaker guarantee.',
      meta: ['read-your-writes', 'weaker version check', 'still ephemeral']
    },
    {
      label: 'Flush',
      kicker: 'Step 3 · durable persistence',
      title: 'Edits are flushed into Foundry datasets',
      body:
        'Because all indexed data is ephemeral, edits are periodically flushed into persistent Foundry datasets owned and managed by Funnel. A merged dataset combines datasource rows with user edits, rebuilt on each new datasource transaction — or every 6 hours if edits exist.',
      meta: ['merged dataset', 'rebuild ≤ 6 hours', 'not in your build graph']
    },
    {
      label: 'Forensics',
      kicker: 'Step 4 · observability',
      title: 'Where the audit trail actually lives',
      body:
        'The merged dataset is invisible to your pipeline graph, but the trail is not missing. Workflow Lineage shows downstream usage of an object property, including dependent Actions. The Action log — opt-in, configured per action type — maps each submission to a [LOG]-prefixed object capturing action RID, version, timestamp, user ID, and edited primary keys. For every edit regardless of Action, enable edit history on the object type.',
      meta: ['Workflow Lineage', 'Action log is opt-in', 'edit history for all edits']
    }
  ];

  var rail = document.getElementById('rail');
  var stageCard = document.getElementById('stageCard');
  var stepIdx = 0;
  var timer = null;

  if (rail && stageCard) {
    rail.innerHTML = STEPS.map(function (s, i) {
      return (
        '<button class="rail__item" data-step="' +
        i +
        '"><span class="rail__dot">' +
        (i + 1) +
        '</span><span class="rail__label">' +
        s.label +
        '</span></button>'
      );
    }).join('');

    function renderStep(i) {
      stepIdx = (i + STEPS.length) % STEPS.length;
      var s = STEPS[stepIdx];
      stageCard.innerHTML =
        '<p class="stage-card__kicker">' +
        s.kicker +
        '</p><h4>' +
        s.title +
        '</h4><p>' +
        s.body +
        '</p><div class="stage-card__meta">' +
        s.meta
          .map(function (m) {
            return '<span class="pill">' + m + '</span>';
          })
          .join('') +
        '</div>';
      Array.prototype.forEach.call(rail.children, function (el, idx) {
        el.classList.toggle('is-active', idx === stepIdx);
        el.classList.toggle('is-done', idx < stepIdx);
      });
    }

    Array.prototype.forEach.call(rail.children, function (el) {
      el.addEventListener('click', function () {
        stop();
        renderStep(parseInt(el.getAttribute('data-step'), 10));
      });
    });

    var playBtn = document.getElementById('stepPlay');
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (playBtn) {
        playBtn.textContent = 'play';
        playBtn.classList.remove('is-active');
      }
    }
    function start() {
      timer = setInterval(function () {
        renderStep(stepIdx + 1);
      }, 4200);
      if (playBtn) {
        playBtn.textContent = 'pause';
        playBtn.classList.add('is-active');
      }
    }
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        timer ? stop() : start();
      });
    }
    var prev = document.getElementById('stepPrev');
    var next = document.getElementById('stepNext');
    if (prev)
      prev.addEventListener('click', function () {
        stop();
        renderStep(stepIdx - 1);
      });
    if (next)
      next.addEventListener('click', function () {
        stop();
        renderStep(stepIdx + 1);
      });

    renderStep(0);
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
