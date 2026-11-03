// Calcul mental : carrés de 1 à 20 et tables de 2 à 9 (onglet « Mental »).
(() => {
  const $ = id => document.getElementById(id);
  const KEY = 'carres.v1';
  const fmtS = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';

  // ---------- Persistance (facultative : l'app marche sans) ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  const saved = load();
  const state = {
    topic: saved.topic === 'tb' ? 'tb' : 'sq',
    tsel: Array.isArray(saved.tsel) && saved.tsel.length ? saved.tsel : [2, 3, 4, 5, 6, 7, 8, 9],
    daily: saved.daily || { day: '', fast: 0 },          // bonnes réponses rapides du jour
    streak: saved.streak || { count: 0, last: '', best: 0 }, // last = dernier jour où l'objectif a été atteint
    // ancienne version : stats/best/last à la racine = carrés
    sq: saved.sq || { stats: saved.stats || {}, best: saved.best || 0, last: saved.last ?? null },
    tb: saved.tb || { stats: {}, best: 0, last: null },
  };
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  const D = () => state[state.topic];
  const st = item => (D().stats[item] ||= { box: -1, seen: 0, ok: 0 });
  const lvl = item => { const b = st(item).box; return b < 0 ? '' : 'l' + b; };

  // ---------- Dessin : un rectangle de rows × cols carreaux ----------
  // mode 'sq' : découpe 10 / u des carrés ; un nombre : sépare les colonnes à cet indice
  function vizEl(rows, cols, mode, label) {
    const g = document.createElement('div');
    g.className = 'viz';
    g.style.setProperty('--cols', cols);
    g.style.setProperty('--rows', rows);
    g.setAttribute('role', 'img');
    g.setAttribute('aria-label', label);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const c = document.createElement('span');
      if (mode === 'sq') c.className = (i < 10 && j < 10) ? 'a' : (i >= 10 && j >= 10) ? 'c' : 'b';
      else if (typeof mode === 'number') c.className = j < mode ? 'a' : 'b';
      else c.className = 'a';
      frag.appendChild(c);
    }
    g.appendChild(frag);
    return g;
  }

  // ---------- Thème : carrés ----------
  const SQ_ITEMS = Array.from({ length: 20 }, (_, i) => String(i + 1));
  function sqTip(n) {
    const sq = n * n;
    if (n === 20) return `<p>2 × 2 = 4, puis on ajoute deux zéros.</p><span class="calc">20² = 400</span>`;
    if (n === 15) return `<p>Finit par 5 : 1 × 2 = 2, puis on colle 25.</p><span class="calc">15² = 225</span>`;
    if (n === 5) return `<p>Finit par 5 : 0 × 1 = 0, puis on colle 25.</p><span class="calc">5² = 25</span>`;
    if (n > 10) {
      const u = n - 10;
      return `<p>${n} = 10 + ${u}, donc 100 + 2 × 10 × ${u} + ${u}².</p>
        <span class="calc">100 + ${20 * u} + ${u * u} = ${sq}</span>
        <div class="legend"><span><i class="c-a"></i>10×10 = 100</span><span><i class="c-b"></i>2 bandes de 10×${u} = ${20 * u}</span><span><i class="c-c"></i>${u}×${u} = ${u * u}</span></div>`;
    }
    if (n === 1) return `<p>Un seul carreau.</p><span class="calc">1² = 1</span>`;
    const p = n - 1;
    return `<p>${n} lignes de ${n} carreaux. Depuis ${p}² = ${p * p} : on ajoute ${p} + ${n}.</p>
      <span class="calc">${p * p} + ${p} + ${n} = ${sq}</span>`;
  }
  const SQ = {
    noun: 'carrés', fast: 4000, items: () => SQ_ITEMS, all: SQ_ITEMS,
    question(it) { const n = +it; return { html: `<span>${n}</span><sup>2</sup>`, text: `${n}²`, answer: n * n }; },
    explain(it) {
      const n = +it;
      return { title: `${n}² = ${n * n}`, viz: vizEl(n, n, n > 10 ? 'sq' : null, `Un carré de ${n} sur ${n} carreaux`), tip: sqTip(n) };
    },
  };

  // ---------- Thème : tables de 2 à 9 ----------
  const TB_ALL = [];
  for (let a = 2; a <= 9; a++) for (let b = a; b <= 9; b++) TB_ALL.push(a + 'x' + b);
  const key = (a, b) => Math.min(a, b) + 'x' + Math.max(a, b);
  const parse = it => it.split('x').map(Number);
  function tbStrategy(a, b) {
    const p = a * b;
    if (a === b) return { f: a, m: a, split: null, html: `<p>C'est un carré : ${a}² = ${p}.</p><span class="calc">${a} × ${a} = ${p}</span>` };
    const f = [2, 5, 9, 4, 8, 3, 6, 7].find(x => x === a || x === b);
    const m = f === a ? b : a;
    switch (f) {
      case 2: return { f, m, split: 1, html: `<p>× 2, c'est le double.</p><span class="calc">${m} + ${m} = ${p}</span>` };
      case 5: return { f, m, split: null, html: `<p>× 5, c'est la moitié de × 10.</p><span class="calc">${m * 10} ÷ 2 = ${p}</span>` };
      case 9: return { f, m, split: null, html: `<p>× 9, c'est dix fois moins une fois. Les chiffres du résultat font 9.</p><span class="calc">${m * 10} − ${m} = ${p}</span>` };
      case 4: return { f, m, split: 2, html: `<p>× 4 : on double deux fois.</p><span class="calc">${m} → ${2 * m} → ${p}</span>` };
      case 8: return { f, m, split: 4, html: `<p>× 8 : on double trois fois.</p><span class="calc">${m} → ${2 * m} → ${4 * m} → ${p}</span>` };
      case 3: return { f, m, split: 2, html: `<p>× 3 : le double, plus une fois.</p><span class="calc">${2 * m} + ${m} = ${p}</span>` };
      case 6: return { f, m, split: 5, html: `<p>× 6 : cinq fois, plus une fois.</p><span class="calc">${5 * m} + ${m} = ${p}</span>` };
      default: return { f, m, split: 5, html: `<p>× 7 : cinq fois, plus deux fois.</p><span class="calc">${5 * m} + ${2 * m} = ${p}</span>` };
    }
  }
  const TB = {
    noun: 'produits', fast: 2500, all: TB_ALL,
    items: () => TB_ALL.filter(it => { const [a, b] = parse(it); return state.tsel.includes(a) || state.tsel.includes(b); }),
    question(it) {
      let [a, b] = parse(it);
      if (a !== b && Math.random() < 0.5) [a, b] = [b, a];
      return { html: `<span>${a}</span><span class="x">×</span><span>${b}</span>`, text: `${a} × ${b}`, answer: a * b };
    },
    explain(it) {
      const [a, b] = parse(it);
      const s = tbStrategy(a, b);
      let legend = '';
      if (s.split) legend = `<div class="legend"><span><i class="c-a"></i>${s.split} × ${s.m} = ${s.split * s.m}</span><span><i class="c-b"></i>${s.f - s.split} × ${s.m} = ${(s.f - s.split) * s.m}</span></div>`;
      return {
        title: `${a} × ${b} = ${a * b}`,
        viz: vizEl(s.m, s.f, s.split, `${s.m} lignes de ${s.f} carreaux`),
        tip: s.html + legend,
      };
    },
  };
  const TOPICS = { sq: SQ, tb: TB };
  const T = () => TOPICS[state.topic];

  // ---------- Progression ----------
  // box : -1 jamais vu, 0 raté récemment, 1..5 de plus en plus sûr ET rapide
  function record(item, ok, ms) {
    const s = st(item);
    s.seen++;
    if (ok) {
      s.ok++;
      if (ms < T().fast) s.box = Math.min(5, Math.max(1, s.box + 1));
      else s.box = s.box >= 3 ? s.box - 1 : Math.max(1, s.box); // juste mais lent : pas encore automatique
    } else {
      s.box = 0;
    }
    dayJustDone = false;
    if (ok && ms < T().fast) {
      rollDay();
      state.daily.fast++;
      if (state.daily.fast === GOAL) completeDay();
    }
    save();
    renderMastery();
    renderRev();
    renderDaily();
  }

  // ---------- Série du jour ----------
  const GOAL = 30;
  let dayJustDone = false;
  const dayKey = (offset = 0) => {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  function rollDay() {
    if (state.daily.day !== dayKey()) state.daily = { day: dayKey(), fast: 0 };
  }
  // la série reste vivante tant que l'objectif a été atteint aujourd'hui ou hier
  function streakNow() {
    const s = state.streak;
    return s.last === dayKey() || s.last === dayKey(-1) ? s.count : 0;
  }
  function completeDay() {
    const s = state.streak;
    if (s.last === dayKey()) return;
    s.count = s.last === dayKey(-1) ? s.count + 1 : 1;
    s.last = dayKey();
    s.best = Math.max(s.best, s.count);
    dayJustDone = true;
    $('daily').classList.remove('pop'); void $('daily').offsetWidth; $('daily').classList.add('pop');
  }
  function renderDaily() {
    rollDay();
    const n = state.daily.fast, k = streakNow(), done = n >= GOAL;
    const el = $('daily');
    el.classList.toggle('done', done);
    el.classList.toggle('on', k > 0);
    $('d-streak').textContent = k;
    $('d-fill').style.width = Math.min(100, 100 * n / GOAL) + '%';
    $('d-count').textContent = done ? `${n}/${GOAL} ✓` : `${n}/${GOAL}`;
    el.title = done
      ? `Série du jour validée. ${k} jour${k > 1 ? 's' : ''} d'affilée.`
      : `Objectif du jour : ${GOAL} bonnes réponses rapides. ${k ? `Valide-le pour passer à ${k + 1} jours d'affilée.` : ''}`;
    el.setAttribute('aria-label', `${k} jours d'affilée. Série du jour : ${n} sur ${GOAL}.`);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderDaily(); });

  const WEIGHT = { '-1': 6, 0: 10, 1: 6, 2: 4, 3: 2.5, 4: 1.2, 5: 0.6 };
  let retry = null; // un calcul raté revient 3 questions plus tard
  function pick(prev) {
    const items = T().items();
    if (retry && --retry.in <= 0 && retry.item !== prev && items.includes(retry.item)) {
      const it = retry.item; retry = null; return it;
    }
    const pool = items.length > 1 ? items.filter(it => it !== prev) : items;
    const w = pool.map(it => WEIGHT[st(it).box]);
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { if ((r -= w[i]) <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  // ---------- Bandeau de maîtrise ----------
  let currentTrain = null;
  function renderMastery() {
    const m = $('mastery');
    if (state.topic === 'sq') {
      m.className = 'mastery';
      m.innerHTML = SQ_ITEMS.map(it =>
        `<div class="tile lv ${lvl(it)} ${it === currentTrain ? 'now' : ''}" title="${it}² = ${it * it}">${it}</div>`).join('');
    } else {
      m.className = 'tgrid';
      let h = '<span></span>';
      for (let c = 2; c <= 9; c++) h += `<span class="th">${c}</span>`;
      for (let r = 2; r <= 9; r++) {
        h += `<span class="th">${r}</span>`;
        for (let c = 2; c <= 9; c++) {
          const k = key(r, c);
          const off = !(state.tsel.includes(r) || state.tsel.includes(c));
          h += `<span class="tc lv ${lvl(k)} ${k === currentTrain ? 'now' : ''} ${off ? 'off' : ''}" title="${r} × ${c} = ${r * c}"></span>`;
        }
      }
      m.innerHTML = h;
    }
  }

  // ---------- Tables ciblées ----------
  function renderChips() {
    const c = $('chips');
    const allOn = state.tsel.length === 8;
    let h = '';
    for (let n = 2; n <= 9; n++) h += `<button class="chip" data-t="${n}" aria-pressed="${state.tsel.includes(n)}">${n}</button>`;
    h += `<button class="chip all" data-t="all" aria-pressed="${allOn}">Toutes</button>`;
    c.innerHTML = h;
  }
  $('chips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const t = b.dataset.t;
    if (t === 'all') state.tsel = [2, 3, 4, 5, 6, 7, 8, 9];
    else {
      const n = +t;
      // un appui sur une table quand tout est coché = ne garder qu'elle
      if (state.tsel.length === 8) state.tsel = [n];
      else if (state.tsel.includes(n)) { if (state.tsel.length > 1) state.tsel = state.tsel.filter(x => x !== n); }
      else state.tsel = [...state.tsel, n].sort((a, b) => a - b);
    }
    save(); renderChips();
    if (view === 'train') { train.next(); }
    else renderMastery();
  });

  // ---------- Moteur de quiz (partagé) ----------
  function makePad(el, quiz) {
    const keys = ['1','2','3','4','5','6','7','8','9','del','0','ok'];
    el.innerHTML = keys.map(k =>
      k === 'del' ? `<button class="k-del" data-k="del" aria-label="Effacer">⌫</button>`
      : k === 'ok' ? `<button class="k-ok" data-k="ok">OK</button>`
      : `<button data-k="${k}">${k}</button>`).join('');
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const k = b.dataset.k;
      if (k === 'del') quiz.back(); else if (k === 'ok') quiz.submit(); else quiz.digit(k);
    });
  }

  function Quiz({ q, ans, card, onResult }) {
    this.item = null; this.shown = null; this.buf = ''; this.locked = false; this.t0 = 0;
    this.next = () => {
      this.item = pick(this.item);
      this.shown = T().question(this.item);
      this.buf = ''; this.locked = false;
      q.innerHTML = this.shown.html;
      ans.textContent = '';
      card.classList.remove('good', 'bad', 'shake');
      this.t0 = performance.now();
      if (this.onShow) this.onShow(this.item);
    };
    this.digit = d => {
      if (this.locked || this.buf.length >= 3) return;
      if (this.buf === '' && d === '0') return;
      this.buf += d; ans.textContent = this.buf;
      if (this.buf.length === String(this.shown.answer).length) this.submit();
    };
    this.back = () => { if (this.locked) return; this.buf = this.buf.slice(0, -1); ans.textContent = this.buf; };
    this.submit = () => {
      if (this.locked || !this.buf) return;
      this.locked = true;
      const ok = +this.buf === this.shown.answer;
      const ms = performance.now() - this.t0;
      record(this.item, ok, ms);
      onResult(ok, this.item, this.shown, +this.buf, ms);
    };
  }

  // ---------- Entraînement ----------
  let streak = 0;
  function defaultHint() {
    return `Validation automatique · objectif : moins de ${fmtS(T().fast)}`;
  }
  const train = new Quiz({
    q: $('t-q'), ans: $('t-ans'), card: $('t-card'),
    onResult(ok, item, shown, given, ms) {
      if (ok) {
        streak++;
        $('t-card').classList.add('good');
        const fast = ms < T().fast;
        const k = streakNow();
        $('t-hint').innerHTML = dayJustDone
          ? `<b>Série du jour validée !</b> ${k} jour${k > 1 ? 's' : ''} d'affilée.`
          : fast
            ? `Juste en <b>${fmtS(ms)}</b>${streak >= 3 ? ` · ${streak} de suite` : ''}`
            : `Juste en <b class="slow">${fmtS(ms)}</b> : trop lent pour compter dans la série du jour.`;
        setTimeout(train.next, dayJustDone ? 1600 : fast ? 450 : 800);
      } else {
        streak = 0;
        retry = { item, in: 3 };
        $('t-card').classList.add('bad', 'shake');
        $('t-ans').innerHTML = `<s>${given}</s><span class="reveal">${shown.answer}</span>`;
        $('t-hint').textContent = 'Ce calcul reviendra dans quelques questions.';
        const ex = $('t-explain');
        const e = T().explain(item);
        ex.innerHTML = '';
        ex.appendChild(e.viz);
        const t = document.createElement('div');
        t.className = 'tip';
        t.innerHTML = `<h3>${shown.text} = ${shown.answer}</h3>${e.tip}`;
        ex.appendChild(t);
        ex.hidden = false;
        $('t-pad').hidden = true;
        $('t-next').hidden = false;
        $('t-next').focus({ preventScroll: true });
      }
    }
  });
  train.onShow = item => {
    currentTrain = item;
    $('t-explain').hidden = true; $('t-pad').hidden = false; $('t-next').hidden = true;
    renderMastery();
  };
  $('t-next').addEventListener('click', () => { $('t-hint').textContent = defaultHint(); train.next(); });
  makePad($('t-pad'), train);

  // ---------- Chrono ----------
  const DURATION = 60000;
  let chronoOn = false, tEnd = 0, score = 0, tries = 0, okMs = 0, misses = [], raf = 0;
  const chrono = new Quiz({
    q: $('c-q'), ans: $('c-ans'), card: $('c-card'),
    onResult(ok, item, shown, given, ms) {
      tries++;
      if (ok) {
        score++; okMs += ms;
        $('c-card').classList.add('good');
        $('c-score').textContent = score + ' ✓';
        setTimeout(() => chronoOn && chrono.next(), 150);
      } else {
        misses.push({ shown, given });
        $('c-card').classList.add('bad', 'shake');
        $('c-ans').innerHTML = `<s>${given}</s><span class="reveal">${shown.answer}</span>`;
        setTimeout(() => chronoOn && chrono.next(), 900);
      }
    }
  });
  makePad($('c-pad'), chrono);

  function showChrono(which) {
    for (const id of ['c-start', 'c-run', 'c-end']) $(id).hidden = id !== which;
  }
  function renderChronoStart() {
    $('c-title').textContent = `60 secondes, un maximum de ${T().noun}`;
    $('c-best').textContent = D().best;
    $('c-last').textContent = D().last ?? '–';
  }
  function startChrono() {
    score = 0; tries = 0; okMs = 0; misses = []; chronoOn = true;
    $('c-score').textContent = '0 ✓';
    showChrono('c-run');
    tEnd = performance.now() + DURATION;
    chrono.next();
    tick();
  }
  function tick() {
    const left = Math.max(0, tEnd - performance.now());
    $('c-fill').style.transform = `scaleX(${left / DURATION})`;
    $('c-fill').classList.toggle('low', left < 10000);
    $('c-sec').textContent = Math.ceil(left / 1000);
    if (left <= 0) return endChrono();
    raf = requestAnimationFrame(tick);
  }
  function endChrono() {
    chronoOn = false; chrono.locked = true; cancelAnimationFrame(raf);
    const d = D();
    const isRecord = score > d.best;
    if (isRecord) d.best = score;
    d.last = score; save();
    $('c-end-title').innerHTML = isRecord && score > 0 ? 'Nouveau record <span class="badge">' + score + '</span>' : 'Temps écoulé';
    $('c-res').textContent = score;
    $('c-acc').textContent = tries ? Math.round(100 * score / tries) + ' %' : '–';
    $('c-avg').textContent = score ? fmtS(okMs / score) : '–';
    $('c-miss-wrap').hidden = !misses.length;
    $('c-miss').innerHTML = misses.map(m => `<li>${m.shown.text} = ${m.shown.answer}<span>tu as écrit ${m.given}</span></li>`).join('');
    showChrono('c-end');
    renderChronoStart();
  }
  function stopChrono() {
    if (!chronoOn) return;
    chronoOn = false; chrono.locked = true; cancelAnimationFrame(raf);
    showChrono('c-start');
  }
  $('c-go').addEventListener('click', startChrono);
  $('c-again').addEventListener('click', startChrono);

  // ---------- Révision ----------
  const selected = { sq: '17', tb: '7x8' };
  function renderDetail() {
    const d = $('detail');
    const e = T().explain(selected[state.topic]);
    d.innerHTML = '';
    d.appendChild(e.viz);
    const t = document.createElement('div');
    t.className = 'tip';
    t.innerHTML = `<h3>${e.title}</h3>${e.tip}`;
    d.appendChild(t);
  }
  function renderRev() {
    const isSq = state.topic === 'sq';
    const s = state.streak;
    $('rstats').innerHTML = `Maîtrisés : <b>${T().all.filter(it => st(it).box >= 4).length}/${T().all.length}</b>`
      + ` · Record de série : <b>${s.best}</b> jour${s.best > 1 ? 's' : ''}`;
    $('sq-list').hidden = !isSq; $('tricks-sq').hidden = !isSq;
    $('tb-rev').hidden = isSq; $('tricks-tb').hidden = isSq; $('rnote').hidden = isSq;
    if (isSq) {
      $('sq-list').innerHTML = SQ_ITEMS.map(it =>
        `<button class="sq" data-it="${it}" aria-pressed="${it === selected.sq}">
          <span class="dot ${lvl(it)}"></span><span class="n">${it}²</span><span class="v">${it * it}</span>
        </button>`).join('');
    } else {
      let h = '<span class="th">×</span>';
      for (let c = 2; c <= 9; c++) h += `<span class="th">${c}</span>`;
      for (let r = 2; r <= 9; r++) {
        h += `<span class="th">${r}</span>`;
        for (let c = 2; c <= 9; c++) {
          const k = key(r, c);
          h += `<button class="rc lv ${lvl(k)}" data-it="${k}" aria-pressed="${k === selected.tb}" aria-label="${r} fois ${c} égale ${r * c}">${r * c}</button>`;
        }
      }
      $('rtable').innerHTML = h;
    }
  }
  function onRevClick(e) {
    const b = e.target.closest('[data-it]'); if (!b) return;
    selected[state.topic] = b.dataset.it;
    renderRev(); renderDetail();
    $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('sq-list').addEventListener('click', onRevClick);
  $('rtable').addEventListener('click', onRevClick);

  function resetBar() {
    $('reset').innerHTML = `<button class="ghost-btn" id="reset-ask">Réinitialiser la progression des ${state.topic === 'sq' ? 'carrés' : 'tables'}</button>`;
    $('reset-ask').onclick = resetAsk;
  }
  function resetAsk() {
    $('reset').innerHTML = `<span>Effacer la progression et le record des ${state.topic === 'sq' ? 'carrés' : 'tables'} ?</span>
      <button class="ghost-btn danger" id="reset-yes">Effacer</button>
      <button class="ghost-btn" id="reset-no">Annuler</button>`;
    $('reset-yes').onclick = () => {
      state[state.topic] = { stats: {}, best: 0, last: null };
      streak = 0; retry = null;
      save(); renderMastery(); renderRev(); renderChronoStart(); resetBar();
    };
    $('reset-no').onclick = resetBar;
  }

  // ---------- Onglets et thème ----------
  let view = 'train';
  function syncChips() { $('chips').hidden = state.topic !== 'tb' || view === 'table'; }
  function setView(v) {
    if (view === 'chrono' && v !== 'chrono') stopChrono();
    view = v;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v));
    for (const k of ['train', 'chrono', 'table']) $('v-' + k).hidden = k !== v;
    if (v === 'chrono') { renderChronoStart(); showChrono('c-start'); }
    syncChips();
  }
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (b) setView(b.dataset.view);
  });

  function setTopic(t) {
    stopChrono();
    state.topic = t; save();
    document.querySelectorAll('.topic button').forEach(b => b.setAttribute('aria-pressed', b.dataset.topic === t));
    streak = 0; retry = null; train.item = null;
    $('t-hint').textContent = defaultHint();
    renderChips(); syncChips();
    renderRev(); renderDetail(); renderChronoStart(); resetBar();
    if (view === 'chrono') showChrono('c-start');
    train.next();
  }
  document.querySelector('.topic').addEventListener('click', e => {
    const b = e.target.closest('button'); if (b && b.dataset.topic !== state.topic) setTopic(b.dataset.topic);
  });

  // ---------- Clavier physique ----------
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (window.AM && window.AM.view !== 'mental') return;
    let quiz = null;
    if (view === 'train') quiz = train;
    else if (view === 'chrono') {
      if (chronoOn) quiz = chrono;
      else if (e.key === 'Enter' && $('c-run').hidden) { e.preventDefault(); return startChrono(); }
    }
    if (!quiz) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); quiz.digit(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); quiz.back(); }
    else if (e.key === 'Enter') {
      if (document.activeElement && document.activeElement.closest('.chips, .topic, .tabs')) return;
      e.preventDefault();
      if (quiz === train && !$('t-next').hidden) $('t-next').click();
      else quiz.submit();
    }
  });

  // l'app principale arrête le chrono quand on quitte l'onglet Calcul mental
  window.AMmental = { stop: stopChrono };

  renderDaily();
  setTopic(state.topic);
})();
