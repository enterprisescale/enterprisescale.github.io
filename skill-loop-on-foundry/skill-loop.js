/* ---------------------------------------------------------------------------
   skill-loop.js — the eight-beat play and the role cards.

   One IIFE, no globals, no dependencies, no network. Page chrome (theme,
   progress bar, TOC, reveal) lives in core.js and is not touched here.

   Layout is fixed from the first beat: nodes never move, they appear.
--------------------------------------------------------------------------- */

(function () {
  'use strict';

  var panel = document.getElementById('slPanel');
  var svg = document.getElementById('slSvg');
  if (!panel || !svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---------- data: nodes ---------- */
  var NODES = [
    { id: 'REQ', x: 40, y: 160, w: 140, h: 60, t: 'Request', s: 'a new pattern type', paper: 'TASK' },
    { id: 'CB', x: 210, y: 160, w: 160, h: 60, t: 'Contract Builder', s: 'asks the missing questions' },
    { id: 'ORCH', x: 430, y: 150, w: 180, h: 80, t: 'Orchestrator', s: 'runs the approved plan' },
    { id: 'STATE', x: 430, y: 40, w: 180, h: 60, t: 'Private Loop State', s: 'parent-only · run metrics', cls: 'state' },
    { id: 'HUMAN', x: 430, y: 280, w: 180, h: 60, t: 'Human Supervisor', s: 'approves once · pause list', cls: 'human' },
    { id: 'IMPL', x: 690, y: 70, w: 170, h: 60, t: 'Implementation Skill', s: 'TypeScript + Python/Spark', paper: 'INFERENCE AGENT' },
    { id: 'ACC', x: 690, y: 230, w: 170, h: 60, t: 'Acceptance Skill', s: 'PASS · FAIL · BLOCKED' },
    { id: 'PROP', x: 885, y: 150, w: 145, h: 60, t: 'Unmerged Proposal', s: 'no merge, no deploy' },
    { id: 'WIKI', x: 40, y: 490, w: 140, h: 60, t: 'Wiki', s: 'episodes and lessons', paper: 'WIKI LAYER', cls: 'learn' },
    { id: 'LOG', x: 260, y: 490, w: 170, h: 60, t: 'Skill Change Log', s: 'proposals · verdicts', paper: 'SKILL-IMPACT.MD', cls: 'learn' },
    { id: 'EVAL', x: 520, y: 490, w: 170, h: 60, t: 'Impact Evaluator', s: 'expected vs actual', paper: 'IMPROVEMENT GATE', cls: 'learn' },
    { id: 'STR', x: 790, y: 490, w: 170, h: 60, t: 'Strengthener', s: 'proposes skill edits', paper: 'SKILL PROPOSER', cls: 'learn' }
  ];

  /* ---------- data: edges ---------- */
  var EDGES = [
    { id: 'p_req_impl', d: 'M180 190 C 320 190 560 100 690 100' },
    { id: 'p_impl_wiki', d: 'M775 130 C 775 330 150 300 150 490', cls: 'learn' },
    { id: 'p_wiki_str', d: 'M180 535 C 400 610 620 610 790 535', cls: 'learn' },
    { id: 'p_str_impl', d: 'M875 490 C 905 300 775 300 775 130', cls: 'learn' },
    { id: 'p_str_log', d: 'M790 505 C 620 455 520 455 430 505', cls: 'learn' },
    { id: 'e_impl_acc', d: 'M775 130 L775 230' },
    { id: 'e_acc_prop', d: 'M860 260 C 878 260 878 180 885 180' },
    { id: 'e_acc_human', d: 'M690 265 C 650 265 650 310 610 310', cls: 'human' },
    { id: 'e_human_impl', d: 'M520 280 C 520 150 600 100 690 100', cls: 'human' },
    { id: 'e_req_orch', d: 'M180 190 L430 190' },
    { id: 'e_orch_impl', d: 'M610 165 C 650 165 650 100 690 100', both: true },
    { id: 'e_orch_acc', d: 'M610 215 C 650 215 650 260 690 260', both: true },
    { id: 'e_orch_prop', d: 'M610 190 L885 190' },
    { id: 'e_orch_state', d: 'M520 150 L520 100', both: true },
    { id: 'e_orch_human', d: 'M520 230 L520 280', both: true, cls: 'human' },
    { id: 'e_req_cb', d: 'M180 190 L210 190' },
    { id: 'e_cb_orch', d: 'M370 190 L430 190' },
    { id: 'e_wiki_cb', d: 'M180 500 C 230 500 290 380 290 220', cls: 'learn' },
    { id: 'e_orch_log', d: 'M450 230 C 450 400 345 380 345 490', both: true, cls: 'learn' },
    { id: 'e_orch_eval', d: 'M590 230 C 590 380 605 380 605 490', both: true, cls: 'learn' },
    { id: 'e_wiki_eval', d: 'M180 522 C 300 452 450 452 520 505', cls: 'learn' },
    { id: 'e_orch_str', d: 'M600 228 C 720 400 875 380 875 490', cls: 'learn' },
    { id: 'e_str_human', d: 'M800 490 C 720 440 690 310 610 310', cls: 'human' },
    { id: 'e_orch_impl_edit', d: 'M600 152 C 630 40 660 40 720 70', dotted: true },
    { id: 'e_orch_acc_edit', d: 'M600 228 C 630 330 680 330 720 290', dotted: true },
    { id: 'e_state_wiki', d: 'M430 62 C 12 62 12 330 60 490', cls: 'learn' }
  ];

  /* ---------- data: edge labels ---------- */
  var LABELS = [
    { id: 'l_task', x: 430, y: 128, t: 'task' },
    { id: 'l_traces', x: 470, y: 300, t: 'traces' },
    { id: 'l_patterns', x: 485, y: 596, t: 'patterns' },
    { id: 'l_patch', d: 1, x: 905, y: 300, t: 'patch skill' },
    { id: 'l_record', x: 610, y: 448, t: 'record outcome' },
    { id: 'l_request', x: 430, y: 128, t: 'request' },
    { id: 'l_blocked', x: 650, y: 296, t: 'BLOCKED' },
    { id: 'l_rulings', x: 560, y: 118, t: 'rulings' },
    { id: 'l_delta1', x: 650, y: 128, t: 'delta handoff' },
    { id: 'l_delta2', x: 650, y: 244, t: 'delta handoff' },
    { id: 'l_plan', x: 566, y: 260, t: 'plan · pauses' },
    { id: 'l_pins', x: 566, y: 130, t: 'pinned versions' },
    { id: 'l_evidence', x: 660, y: 398, t: 'evidence ↓ verdict ↑' },
    { id: 'l_invoke', x: 850, y: 398, t: 'invoke + evidence' },
    { id: 'l_proposals', x: 735, y: 372, t: 'proposals' },
    { id: 'l_edit1', x: 690, y: 36, t: 'v+1, separately approved' },
    { id: 'l_edit2', x: 690, y: 336, t: 'v+1' },
    { id: 'l_metrics', x: 13, y: 300, t: 'run metrics → wiki', rot: -90 }
  ];

  /* ---------- data: beats ---------- */
  var ORCH_EDGES = ['e_orch_impl', 'e_orch_acc', 'e_orch_prop', 'e_orch_state', 'e_orch_human'];
  var LEARN_EDGES = [
    'e_orch_log', 'e_orch_eval', 'e_wiki_eval', 'e_orch_str', 'e_str_human', 'p_wiki_str',
    'e_orch_impl_edit', 'e_orch_acc_edit', 'e_state_wiki'
  ];
  var ALL_NODES = NODES.map(function (n) { return n.id; });

  var BEATS = [
    {
      k: 'Beat 1 · The paper',
      t: 'WikiSkill runs tasks, compiles the traces into a wiki, and lets a proposer edit the skill. The skill is the product; the task output is scored, not kept as a deliverable. Five of its pieces are drawn here where they will end up.',
      on: ['REQ', 'IMPL', 'WIKI', 'STR', 'LOG'],
      edges: ['p_req_impl', 'p_impl_wiki', 'p_wiki_str', 'p_str_impl', 'p_str_log'],
      labels: ['l_task', 'l_traces', 'l_patterns', 'l_patch', 'l_record'],
      paper: ['REQ', 'IMPL', 'WIKI', 'STR', 'LOG']
    },
    {
      k: 'Beat 2 · The inversion',
      t: 'First mapping on Foundry: an implementation skill and an acceptance skill on a global branch, ending in a proposal nobody merges automatically. The proposal is the product. The learn layer goes quiet.',
      on: ['REQ', 'IMPL', 'ACC', 'PROP'],
      dim: ['WIKI', 'STR', 'LOG'],
      edges: ['p_req_impl', 'e_impl_acc', 'e_acc_prop'],
      labels: ['l_request']
    },
    {
      k: 'Beat 3 · Four incidents',
      t: 'Commits landed outside the loop. One runtime could not validate both repositories. Scope grew. A yearless pattern acquired a year. Each incident became a reason the loop is allowed to stop and ask.',
      on: ['REQ', 'IMPL', 'ACC', 'PROP', 'HUMAN'],
      dim: ['WIKI', 'STR', 'LOG'],
      edges: ['p_req_impl', 'e_impl_acc', 'e_acc_prop', 'e_acc_human', 'e_human_impl'],
      labels: ['l_request', 'l_blocked', 'l_rulings']
    },
    {
      k: 'Beat 4 · One plan, one approval',
      t: 'An orchestrator runs the plan; the human approves it once and rules only on the pause list. Workers never talk to each other and never see the loop\u2019s private state, which records every transition and the run\u2019s metrics.',
      on: ['REQ', 'IMPL', 'ACC', 'PROP', 'HUMAN', 'ORCH', 'STATE'],
      dim: ['WIKI', 'STR', 'LOG'],
      edges: ['e_req_orch'].concat(ORCH_EDGES),
      labels: ['l_delta1', 'l_delta2', 'l_plan']
    },
    {
      k: 'Beat 5 · Ask before building',
      t: 'The first skill you talk to writes no code. It reads the wiki, asks the missing questions, settles ambiguous policy, and produces the contract the acceptance skill will test. Questions settled at this stage do not surface later as pauses.',
      on: ['REQ', 'CB', 'IMPL', 'ACC', 'PROP', 'HUMAN', 'ORCH', 'STATE', 'WIKI'],
      dim: ['STR', 'LOG'],
      edges: ['e_req_cb', 'e_cb_orch', 'e_wiki_cb'].concat(ORCH_EDGES),
      labels: ['l_delta1', 'l_delta2', 'l_plan']
    },
    {
      k: 'Beat 6 · Versions everywhere',
      t: 'Every skill carries a version and every edit bumps it. The plan pins the versions it was approved against; the orchestrator checks for version drift at each invocation, next to branch drift. Same failure: the world changed under an approved plan.',
      on: ['REQ', 'CB', 'IMPL', 'ACC', 'PROP', 'HUMAN', 'ORCH', 'STATE', 'WIKI'],
      dim: ['STR', 'LOG'],
      edges: ['e_req_cb', 'e_cb_orch', 'e_wiki_cb'].concat(ORCH_EDGES),
      labels: ['l_delta1', 'l_delta2', 'l_plan', 'l_pins'],
      versions: ['CB', 'ORCH', 'IMPL', 'ACC']
    },
    {
      k: 'Beat 7 · The paper, reattached',
      t: 'The paper\u2019s loop returns, around the build loop rather than instead of it. Proposals predict their effect, an evaluator checks the prediction once enough comparable runs exist, and a human applies the change as a separately approved edit. Only the two worker skills are ever the target.',
      on: ALL_NODES,
      edges: ['e_req_cb', 'e_cb_orch', 'e_wiki_cb'].concat(ORCH_EDGES).concat(LEARN_EDGES),
      labels: ['l_plan', 'l_pins', 'l_evidence', 'l_invoke', 'l_proposals', 'l_edit1', 'l_edit2', 'l_metrics'],
      versions: ['CB', 'ORCH', 'IMPL', 'ACC', 'EVAL', 'STR'],
      paper: ['IMPL', 'WIKI', 'LOG', 'EVAL', 'STR']
    },
    {
      k: 'Beat 8 · Where it stands',
      t: 'Implemented and running. Six requests so far; no comparable-run metrics yet. Click any box to see its role, what it reads, what it produces, and what it corresponds to in the paper.',
      on: ALL_NODES,
      edges: ['e_req_cb', 'e_cb_orch', 'e_wiki_cb'].concat(ORCH_EDGES).concat(LEARN_EDGES),
      labels: ['l_plan', 'l_pins', 'l_evidence', 'l_invoke', 'l_proposals', 'l_edit1', 'l_edit2', 'l_metrics'],
      versions: ['CB', 'ORCH', 'IMPL', 'ACC', 'EVAL', 'STR'],
      paper: ['IMPL', 'WIKI', 'LOG', 'EVAL', 'STR'],
      final: true
    }
  ];

  /* ---------- data: role cards ---------- */
  var CARDS = {
    REQ: {
      title: 'Request',
      role: 'The unit of work: support one new pattern type, end to end, as a single controlled engineering change across the repositories it touches.',
      reads: 'A person who knows what they want and has not yet said all of it.',
      produces: 'The starting point for the contract builder.',
      paper: 'A task from the benchmark. The paper\u2019s tasks come with their own answer key; this one does not.'
    },
    CB: {
      title: 'Contract Builder',
      role: 'First touchpoint. Asks the missing questions, resolves ambiguous policy, and turns the request into an executable contract with positive and negative cases and the evidence each runtime must show.',
      reads: 'The request and the wiki.',
      produces: 'The contract the orchestrator plans against and the acceptance skill tests against, plus its own version stamp.',
      paper: 'No counterpart. Enterprise addition for requests that arrive without an answer key.'
    },
    ORCH: {
      title: 'Orchestrator',
      role: 'Runs the approved plan (implementation, acceptance, cross-runtime acceptance, unmerged proposal). Passes each worker a delta handoff, never the whole history. Checks branch state and skill versions before each invocation. Pauses only for the eight listed conditions.',
      reads: 'The contract, the private loop state, worker results, evaluator recommendations, human rulings.',
      produces: 'Worker invocations, state transitions, the change-log record of every skill proposal and decision, and the separately approved skill edits.',
      paper: 'The outer-loop harness. Fixed code in the paper; a human-edited skill here.'
    },
    STATE: {
      title: 'Private Loop State',
      role: 'One record per loop, written after every accepted transition and before every pause, so a pause always has a durable picture of where things stood.',
      reads: 'Nothing on its own; the orchestrator writes it.',
      produces: 'Resume state, the pinned skill versions, and the final run metrics: iterations to PASS, blocks, rulings, repairs, time to proposal.',
      paper: 'The harness\u2019s own bookkeeping, which the paper keeps in variables and on disk.'
    },
    HUMAN: {
      title: 'Human Supervisor',
      role: 'Approves the plan once. Rules on the pause list: branch drift, a failed or blocked worker, scope expansion, conflicting requirements, production mutation, merge or deployment, an unexpected resource, and any change to a semantic version or historical data. Approves or modifies every skill edit.',
      reads: 'The plan, pause reports, strengthener proposals.',
      produces: 'Rulings, merges (outside the loop), skill-edit decisions.',
      paper: 'No human in the loop. The paper\u2019s gate is a number; here the gate is advisory and a person decides.'
    },
    IMPL: {
      title: 'Implementation Skill',
      role: 'Makes the code change on the global branch, test-first, across the TypeScript and Python/Spark repositories, one write target per invocation, with an assessment of historical impact.',
      reads: 'Its delta handoff from the orchestrator. Never the wiki, never the loop state.',
      produces: 'Commits on the branch and a structured result for the orchestrator.',
      paper: 'The Inference Agent with its skill set. One of the two skills the strengthener may change.'
    },
    ACC: {
      title: 'Acceptance Skill',
      role: 'Independently tests the change against the contract, including regression checks and cross-runtime provenance, and returns PASS, FAIL or BLOCKED. Designs its own tests rather than relying on the implementation\u2019s.',
      reads: 'The contract and its delta handoff.',
      produces: 'A verdict and evidence; FAIL routes back through the orchestrator for targeted rework, BLOCKED goes to the human.',
      paper: 'The validation score, made structural: it checks how the answer was produced, not only the total. The other skill the strengthener may change.'
    },
    PROP: {
      title: 'Unmerged Proposal',
      role: 'The end of every build loop: a Global Branch proposal or pull request that a person reviews. The loop never merges, deploys, activates stored patterns, or touches production data.',
      reads: 'Nothing.',
      produces: 'A reviewable change and the time-to-proposal metric.',
      paper: 'The task output, which the paper discards. Here it is the product.'
    },
    WIKI: {
      title: 'Wiki',
      role: 'Append-only record of each loop: outcome, lessons, links to the proposal. Human-reviewed before it lands. Read by the contract builder, the evaluator and the strengthener, never by the workers.',
      reads: 'Run metrics and lessons via a human-reviewed update.',
      produces: 'Context for the next contract and evidence for the learn loop.',
      paper: 'The wiki layer, currently closer to the paper\u2019s logs.md than to its compiled pattern pages. Never rolled back, in both.'
    },
    LOG: {
      title: 'Skill Change Log',
      role: 'Parent-only, append-only record of every skill proposal, the human\u2019s decision and modifications, the exact version transition, and the evaluator\u2019s later assessment.',
      reads: 'Written by the orchestrator only.',
      produces: 'The evidence bundle for the evaluator and the strengthener, including rejected proposals so they are not proposed again.',
      paper: 'skill-impact.md, which the harness writes programmatically and the proposer must read.'
    },
    EVAL: {
      title: 'Impact Evaluator',
      role: 'Read-only and independently versioned. Compares each skill change\u2019s predicted effect with the actual run metrics across comparable loops that ran the exact applied version. Below five such loops it says wait, unless a functional or safety regression is concrete.',
      reads: 'The wiki, applied change records, run-metric projections with no pointers to internal state.',
      produces: 'A recommendation (invoke, wait, not needed, investigate a regression) with confidence, confounders and excluded loops, persisted by the orchestrator.',
      paper: 'The strict-improvement gate, made advisory. The paper reverts automatically; here a human decides.'
    },
    STR: {
      title: 'Strengthener',
      role: 'Proposes edits to the implementation and acceptance skills only. Each proposal states its expected effect on the run metrics and the metrics that must not get worse. Never edits anything itself.',
      reads: 'The wiki, the two current skill definitions, and a bounded bundle of applied changes, prior assessments and rejections.',
      produces: 'Future-only proposals with a structured change log entry, for a human to approve, modify or reject.',
      paper: 'The Skill Proposer: one atomic proposal per cycle. The paper\u2019s proposer does not have to predict its effect; this one does.'
    }
  };

  /* ---------- build the SVG ---------- */
  var gEdges = document.getElementById('slEdges');
  var gLabels = document.getElementById('slLabels');
  var gNodes = document.getElementById('slNodes');
  var nodeEls = {}, edgeEls = {}, labelEls = {}, verEls = {}, paperEls = {};

  EDGES.forEach(function (e) {
    var cls = 'sl-edge';
    if (e.both) cls += ' sl-edge--both';
    if (e.dotted) cls += ' sl-edge--dotted';
    if (e.cls) cls += ' sl-edge--' + e.cls;
    edgeEls[e.id] = el('path', { d: e.d, 'class': cls, 'data-edge': e.id }, gEdges);
  });

  LABELS.forEach(function (l) {
    var g = el('g', { 'class': 'sl-elabel', 'data-label': l.id }, gLabels);
    if (l.rot) g.setAttribute('transform', 'rotate(' + l.rot + ' ' + l.x + ' ' + l.y + ')');
    var w = l.t.length * 7.2 + 14;
    el('rect', { 'class': 'sl-elabel__bg', x: l.x - w / 2, y: l.y - 9, width: w, height: 13, rx: 3 }, g);
    var tx = el('text', { x: l.x, y: l.y, 'text-anchor': 'middle' }, g);
    tx.textContent = l.t;
    labelEls[l.id] = g;
  });

  NODES.forEach(function (n) {
    var g = el('g', {
      'class': 'sl-node' + (n.cls ? ' sl-node--' + n.cls : ''),
      'data-node': n.id,
      role: 'button',
      tabindex: '-1',
      'aria-label': n.t + ' — show role'
    }, gNodes);
    el('rect', { 'class': 'sl-node__box', x: n.x, y: n.y, width: n.w, height: n.h }, g);
    var t = el('text', { 'class': 'sl-node__t', x: n.x + n.w / 2, y: n.y + (n.h === 80 ? 36 : 31), 'text-anchor': 'middle' }, g);
    t.textContent = n.t;
    var s = el('text', { 'class': 'sl-node__s', x: n.x + n.w / 2, y: n.y + (n.h === 80 ? 55 : 48), 'text-anchor': 'middle' }, g);
    s.textContent = n.s;
    if (n.paper) {
      var p = el('text', { 'class': 'sl-node__paper', x: n.x + n.w / 2, y: n.y + 13, 'text-anchor': 'middle' }, g);
      p.textContent = 'PAPER \u00b7 ' + n.paper;
      p.style.opacity = '0';
      p.style.transition = 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)';
      paperEls[n.id] = p;
    }
    var vg = el('g', { 'class': 'sl-ver' }, g);
    el('rect', { 'class': 'sl-ver__pill', x: n.x + n.w - 30, y: n.y - 17, width: 26, height: 16 }, vg);
    var vt = el('text', { 'class': 'sl-ver__t', x: n.x + n.w - 17, y: n.y - 5.5, 'text-anchor': 'middle' }, vg);
    vt.textContent = 'vN';
    verEls[n.id] = vg;
    nodeEls[n.id] = g;
  });

  /* ---------- state ---------- */
  var beat = 0;
  var timer = null;
  var selected = null;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var capK = document.getElementById('slCaptionK');
  var capT = document.getElementById('slCaptionT');
  var playBtn = document.getElementById('slPlay');
  var prevBtn = document.getElementById('slPrev');
  var nextBtn = document.getElementById('slNext');
  var endBtn = document.getElementById('slEnd');
  var beatBtns = Array.prototype.slice.call(panel.querySelectorAll('.sl-beat'));
  var card = document.getElementById('slCard');

  function inList(list, id) {
    return !!list && list.indexOf(id) !== -1;
  }

  function render(prevIndex) {
    var b = BEATS[beat];
    var prev = typeof prevIndex === 'number' && prevIndex >= 0 ? BEATS[prevIndex] : null;
    var highlight = prev && prevIndex === beat - 1;

    NODES.forEach(function (n) {
      var g = nodeEls[n.id];
      var on = inList(b.on, n.id);
      var dim = inList(b.dim, n.id);
      g.classList.toggle('is-on', on || dim);
      g.classList.toggle('is-dim', dim && !on);
      g.classList.toggle('is-new', !!(highlight && on && !inList(prev.on, n.id)));
      g.classList.toggle('is-click', on);
      g.setAttribute('tabindex', on ? '0' : '-1');
      g.setAttribute('aria-hidden', on || dim ? 'false' : 'true');
      verEls[n.id].classList.toggle('is-on', inList(b.versions, n.id));
      if (paperEls[n.id]) paperEls[n.id].style.opacity = inList(b.paper, n.id) ? '1' : '0';
      if (!on && selected === n.id) closeCard();
    });

    EDGES.forEach(function (e) {
      var p = edgeEls[e.id];
      var on = inList(b.edges, e.id);
      p.classList.toggle('is-on', on);
      p.classList.toggle('is-new', !!(highlight && on && !inList(prev.edges, e.id)));
    });

    LABELS.forEach(function (l) {
      labelEls[l.id].classList.toggle('is-on', inList(b.labels, l.id));
    });

    capK.textContent = b.k;
    capT.textContent = b.t;

    beatBtns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(parseInt(btn.getAttribute('data-beat'), 10) === beat));
    });
    prevBtn.disabled = beat === 0;
    nextBtn.disabled = beat === BEATS.length - 1;
    panel.classList.toggle('is-final', !!b.final);
  }

  function go(i, fromUser) {
    if (i < 0 || i >= BEATS.length) return;
    var prev = beat;
    beat = i;
    render(prev);
    if (fromUser) stop();
    if (beat === BEATS.length - 1) stop();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    playBtn.setAttribute('aria-pressed', 'false');
    playBtn.textContent = beat === BEATS.length - 1 ? 'replay' : 'play';
  }

  function play() {
    if (beat === BEATS.length - 1) {
      beat = -1;
    }
    go(beat + 1, false);
    if (beat === BEATS.length - 1) return;
    playBtn.setAttribute('aria-pressed', 'true');
    playBtn.textContent = 'pause';
    timer = setInterval(function () {
      if (beat >= BEATS.length - 1) {
        stop();
        return;
      }
      go(beat + 1, false);
    }, reduced ? 5200 : 4600);
  }

  /* ---------- role cards ---------- */
  function openCard(id) {
    var c = CARDS[id];
    if (!c) return;
    selected = id;
    NODES.forEach(function (n) {
      nodeEls[n.id].classList.toggle('is-sel', n.id === id);
    });
    document.getElementById('slCardTitle').textContent = c.title;
    document.getElementById('slCardRole').textContent = c.role;
    document.getElementById('slCardReads').textContent = c.reads;
    document.getElementById('slCardProduces').textContent = c.produces;
    document.getElementById('slCardPaper').textContent = c.paper;
    card.hidden = false;
    stop();
  }

  function closeCard() {
    selected = null;
    card.hidden = true;
    NODES.forEach(function (n) {
      nodeEls[n.id].classList.remove('is-sel');
    });
  }

  /* ---------- wiring ---------- */
  playBtn.addEventListener('click', function () {
    if (timer) stop();
    else play();
  });
  prevBtn.addEventListener('click', function () { go(beat - 1, true); });
  nextBtn.addEventListener('click', function () { go(beat + 1, true); });
  endBtn.addEventListener('click', function () { go(BEATS.length - 1, true); });
  beatBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      go(parseInt(btn.getAttribute('data-beat'), 10), true);
    });
  });

  NODES.forEach(function (n) {
    var g = nodeEls[n.id];
    function act() {
      if (!g.classList.contains('is-click')) return;
      if (selected === n.id) closeCard();
      else openCard(n.id);
    }
    g.addEventListener('click', act);
    g.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault();
        act();
      }
    });
  });
  document.getElementById('slCardClose').addEventListener('click', function () {
    var id = selected;
    closeCard();
    if (id && nodeEls[id]) nodeEls[id].focus();
  });

  Array.prototype.forEach.call(document.querySelectorAll('.sl-jump'), function (btn) {
    btn.addEventListener('click', function () {
      var i = parseInt(btn.getAttribute('data-jump'), 10);
      go(i, true);
      var top = panel.getBoundingClientRect().top + window.pageYOffset - 84;
      if (reduced || !('scrollBehavior' in document.documentElement.style)) window.scrollTo(0, top);
      else window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  panel.classList.add('is-ready');
  render(-1);
})();
