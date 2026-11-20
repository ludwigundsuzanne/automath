// Réflexes : carrés de 1 à 25, cubes de 1 à 20, tables de 2 à 9 et rangs de l'alphabet.
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
    topic: ['tb', 'cu', 'ab', 'rc'].includes(saved.topic) ? saved.topic : 'sq',
    tsel: Array.isArray(saved.tsel) && saved.tsel.length ? saved.tsel : [2, 3, 4, 5, 6, 7, 8, 9],
    daily: saved.daily || { day: '', fast: 0 },          // bonnes réponses rapides du jour
    streak: saved.streak || { count: 0, last: '', best: 0 }, // last = dernier jour où l'objectif a été atteint
    // ancienne version : stats/best/last à la racine = carrés
    sq: saved.sq || { stats: saved.stats || {}, best: saved.best || 0, last: saved.last ?? null },
    tb: saved.tb || { stats: {}, best: 0, last: null },
    cu: saved.cu || { stats: {}, best: 0, last: null },
    ab: saved.ab || { stats: {}, best: 0, last: null },
    rc: saved.rc || { stats: {}, best: 0, last: null },
  };
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  const D = () => state[state.topic];
  const st = item => (D().stats[item] ||= { box: -1, seen: 0, ok: 0 });
  const lvl = item => { const b = st(item).box; return b < 0 ? '' : 'l' + b; };

  // ---------- Dessin : un rectangle de rows × cols carreaux ----------
  // mode 'sq' : découpe 10 / u des carrés (20 / u au-delà de 20) ; un nombre : sépare les colonnes à cet indice
  function vizEl(rows, cols, mode, label) {
    const g = document.createElement('div');
    g.className = 'viz';
    g.style.setProperty('--cols', cols);
    g.style.setProperty('--rows', rows);
    g.setAttribute('role', 'img');
    g.setAttribute('aria-label', label);
    const frag = document.createDocumentFragment(), base = rows > 20 ? 20 : 10;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const c = document.createElement('span');
      if (mode === 'sq') c.className = (i < base && j < base) ? 'a' : (i >= base && j >= base) ? 'c' : 'b';
      else if (typeof mode === 'number') c.className = j < mode ? 'a' : 'b';
      else c.className = 'a';
      frag.appendChild(c);
    }
    g.appendChild(frag);
    return g;
  }

  // ---------- Thème : carrés ----------
  const SQ_ITEMS = Array.from({ length: 25 }, (_, i) => String(i + 1));
  function sqTip(n) {
    const sq = n * n;
    if (n === 20) return `<p>2 × 2 = 4, puis on ajoute deux zéros.</p><span class="calc">20² = 400</span>`;
    if (n === 25) return `<p>Finit par 5 : 2 × 3 = 6, puis on colle 25.</p><span class="calc">25² = 625</span>`;
    if (n > 20) {
      const u = n - 20;
      return `<p>${n} = 20 + ${u}, donc 400 + 2 × 20 × ${u} + ${u}².</p>
        <span class="calc">400 + ${40 * u} + ${u * u} = ${sq}</span>
        <div class="legend"><span><i class="c-a"></i>20×20 = 400</span><span><i class="c-b"></i>2 bandes de 20×${u} = ${40 * u}</span><span><i class="c-c"></i>${u}×${u} = ${u * u}</span></div>`;
    }
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
    noun: 'carrés', fast: 4000, items: () => SQ_ITEMS, all: SQ_ITEMS, card: it => ({ n: `${it}²`, v: sp(it * it) }),
    question(it) {
      const n = +it;
      if (n > 1 && Math.random() < 0.5) return { html: `<span class="rev">${sp(n * n)} = ?</span><sup>2</sup>`, text: `${sp(n * n)} = ?²`, answer: n, rev: true };
      return { html: `<span>${n}</span><sup>2</sup>`, text: `${n}²`, answer: n * n };
    },
    explain(it, shown) {
      const n = +it;
      return { title: `${n}² = ${sp(n * n)}`, viz: vizEl(n, n, n > 10 ? 'sq' : null, `Un carré de ${n} sur ${n} carreaux`), tip: shown && shown.rev ? sqRootTip(n) : sqTip(n) };
    },
  };

  // ---------- Thème : cubes de 1 à 20 ----------
  const CU_ITEMS = Array.from({ length: 20 }, (_, i) => String(i + 1));
  const sp = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  function cuTip(n) {
    const s = n * n, c = s * n;
    if (n === 1) return `<p>1 × 1 × 1.</p><span class="calc">1³ = 1</span>`;
    if (n === 10 || n === 20) return `<p>${n / 10}³ = ${(n / 10) ** 3}, puis on ajoute trois zéros.</p><span class="calc">${n}³ = ${sp(c)}</span>`;
    if (n < 10) return `<p>Le carré, fois ${n} : ${n}² = ${s}.</p><span class="calc">${s} × ${n} = ${sp(c)}</span>`;
    const u = n - 10;
    return `<p>Le carré, fois ${n} : ${n}² = ${s}, puis ${s} × 10 + ${s} × ${u}.</p>
      <span class="calc">${sp(s * 10)} + ${sp(s * u)} = ${sp(c)}</span>`;
  }
  const CU = {
    noun: 'cubes', fast: 5000, items: () => CU_ITEMS, all: CU_ITEMS, card: it => ({ n: `${it}³`, v: sp(it ** 3) }),
    question(it) {
      const n = +it;
      if (n > 1 && Math.random() < 0.5) return { html: `<span class="rev">${sp(n ** 3)} = ?</span><sup>3</sup>`, text: `${sp(n ** 3)} = ?³`, answer: n, rev: true };
      return { html: `<span>${n}</span><sup>3</sup>`, text: `${n}³`, answer: n ** 3 };
    },
    explain(it, shown) {
      const n = +it;
      return { title: `${n}³ = ${sp(n ** 3)}`, viz: vizEl(n, n, n > 10 ? 'sq' : null, `Une face de ${n} sur ${n}, empilée ${n} fois`), tip: shown && shown.rev ? cuRootTip(n) : cuTip(n) };
    },
  };

  // ---------- Retrouver la racine (sens inverse) ----------
  const SQ_END = { 0: [0], 1: [1, 9], 4: [2, 8], 5: [5], 6: [4, 6], 9: [3, 7] };
  const CU_END = { 0: 0, 1: 1, 2: 8, 3: 7, 4: 4, 5: 5, 6: 6, 7: 3, 8: 2, 9: 9 };
  function sqRootTip(n) {
    const v = n * n, d = v % 10;
    if (n < 10) return `<p>Carré à connaître par cœur.</p><span class="calc">${n}² = ${v}</span>`;
    if (n % 10 === 0) return `<p>${sp(v)} = ${(n / 10) ** 2} suivi de deux zéros, donc ${n / 10}² suivi d'un zéro.</p><span class="calc">${sp(v)} = ${n}²</span>`;
    const lo = Math.floor(n / 10) * 10, ends = SQ_END[d];
    let how = `${sp(v)} est entre ${sp(lo * lo)} (${lo}²) et ${sp((lo + 10) ** 2)} (${lo + 10}²)`;
    if (ends.length > 1) how += `, et ${v < (lo + 5) ** 2 ? 'avant' : 'après'} ${sp((lo + 5) ** 2)} (${lo + 5}²)`;
    return `<p>${sp(v)} finit par ${d} : la racine finit par ${ends.join(' ou ')}. ${how}.</p><span class="calc">${sp(v)} = ${n}²</span>`;
  }
  function cuRootTip(n) {
    const v = n ** 3, d = v % 10;
    if (n === 10 || n === 20) return `<p>${sp(v)} = ${(n / 10) ** 3} suivi de trois zéros.</p><span class="calc">${sp(v)} = ${n}³</span>`;
    const where = n < 10 ? `${sp(v)} est sous 1 000 (10³) : la racine a un seul chiffre` : `${sp(v)} est entre 1 000 (10³) et 8 000 (20³) : la racine est entre 10 et 20`;
    return `<p>Un cube finit par ${d} seulement si sa racine finit par ${CU_END[d]}. ${where}.</p><span class="calc">${sp(v)} = ${n}³</span>`;
  }

  // ---------- Thème : reconnaître un carré ou un cube ----------
  const isSq = x => { const r = Math.round(Math.sqrt(x)); return r * r === x; };
  const isCu = x => { const r = Math.round(Math.cbrt(x)); return r ** 3 === x; };
  const RC_CHOICES = ['Carré', 'Cube', 'Les deux', 'Aucun'];
  const rcKind = x => (isSq(x) && isCu(x) ? 'Les deux' : isSq(x) ? 'Carré' : isCu(x) ? 'Cube' : 'Aucun');
  // les nombres à reconnaître (carrés de 1 à 25, cubes de 1 à 20) et leurs voisins immédiats comme pièges
  const RC_TARGETS = [...new Set([...SQ_ITEMS.map(n => n * n), ...CU_ITEMS.map(n => n ** 3)])].sort((a, b) => a - b);
  const RC_TRAPS = [...new Set(RC_TARGETS.filter(x => x > 4).flatMap(x => [x - 1, x + 1]))].filter(x => !RC_TARGETS.includes(x));
  const RC_ALL = RC_TARGETS.map(String), RC_ITEMS = [...RC_ALL, ...RC_TRAPS.map(String)];
  function rcName(x) {
    const s = isSq(x) ? `${Math.round(Math.sqrt(x))}²` : '', c = isCu(x) ? `${Math.round(Math.cbrt(x))}³` : '';
    return [s, c].filter(Boolean).join(' = ');
  }
  function rcTip(x) {
    const k = rcKind(x);
    if (k !== 'Aucun') {
      const extra = k === 'Les deux' ? ' Un nombre à la fois carré et cube est une puissance 6 : 1, 64, 729, 4 096…' : '';
      return `<p>${k === 'Cube' ? 'C\'est un cube' : k === 'Carré' ? 'C\'est un carré' : 'C\'est à la fois un carré et un cube'}.${extra}</p><span class="calc">${sp(x)} = ${rcName(x)}</span>`;
    }
    const r = Math.floor(Math.sqrt(x)), c = Math.floor(Math.cbrt(x)), d = x % 10;
    const ends = [2, 3, 7, 8].includes(d) ? `<p>Un carré ne finit jamais par 2, 3, 7 ou 8 : ${sp(x)} ne peut pas être un carré.</p>` : '';
    return `${ends}<p>Il tombe entre deux carrés et entre deux cubes qui se suivent.</p>
      <span class="calc">${r}² = ${sp(r * r)} &lt; ${sp(x)} &lt; ${sp((r + 1) ** 2)} = ${r + 1}²</span>
      <span class="calc">${c}³ = ${sp(c ** 3)} &lt; ${sp(x)} &lt; ${sp((c + 1) ** 3)} = ${c + 1}³</span>`;
  }
  const RC = {
    noun: 'nombres', fast: 3000, items: () => RC_ITEMS, all: RC_ALL, noGrid: true,
    bias: it => (RC_ALL.includes(it) ? 2 : 1), // autant de vrais carrés ou cubes que de pièges
    card: it => ({ n: rcName(+it), v: sp(+it) }),
    question(it) { const x = +it; return { html: `<span class="rev">${sp(x)}</span>`, text: sp(x), answer: rcKind(x), choice: true }; },
    explain(it) {
      const x = +it, k = rcKind(x), el = document.createElement('div');
      el.className = 'rcviz'; el.textContent = k === 'Aucun' ? '✕' : rcName(x);
      return { title: k === 'Aucun' ? `${sp(x)} : ni carré ni cube` : `${sp(x)} = ${rcName(x)}`, viz: el, tip: rcTip(x) };
    },
  };

  // ---------- Thème : rangs de l'alphabet (A = 1 … Z = 26), dans les deux sens ----------
  const AB_ITEMS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const rank = L => L.charCodeAt(0) - 64;
  function abViz(L) {
    const g = document.createElement('div');
    g.className = 'abviz';
    g.setAttribute('role', 'img');
    g.setAttribute('aria-label', `${L} est la lettre numéro ${rank(L)}`);
    g.innerHTML = AB_ITEMS.map(x => `<span class="${x === L ? 'on' : rank(x) % 5 === 0 ? 'mk' : ''}"><b>${x}</b><i>${rank(x)}</i></span>`).join('');
    return g;
  }
  function abTip(L) {
    const r = rank(L);
    if (r % 5 === 0) return `<p>C'est un repère : E, J, O, T, Y valent 5, 10, 15, 20, 25.</p><span class="calc">${L} = ${r}</span>`;
    const m = Math.min(25, Math.max(5, Math.round(r / 5) * 5)), d = r - m, s = d > 0 ? '+' : '−';
    return `<p>Pars du repère le plus proche (E J O T Y = 5 10 15 20 25).</p><span class="calc">${L} = ${AB_ITEMS[m - 1]} ${s} ${Math.abs(d)} = ${m} ${s} ${Math.abs(d)} = ${r}</span>`;
  }
  const AB = {
    noun: 'lettres', fast: 2500, items: () => AB_ITEMS, all: AB_ITEMS, card: it => ({ n: it, v: rank(it) }),
    question(it) {
      if (Math.random() < 0.5) return { html: `<span>${it}</span>`, text: it, answer: rank(it) };
      return { html: `<span>${rank(it)}</span>`, text: `Lettre n° ${rank(it)}`, answer: it, letter: true };
    },
    explain(it) { return { title: `${it} = ${rank(it)}`, viz: abViz(it), tip: abTip(it) }; },
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
  const TOPICS = { sq: SQ, cu: CU, tb: TB, ab: AB, rc: RC };
  const NAMES = { sq: 'carrés', cu: 'cubes', tb: 'tables', ab: 'lettres', rc: 'carrés ou cubes' };
  const TITLES = { sq: 'Carrés', cu: 'Cubes', tb: 'Tables', ab: 'Alphabet', rc: 'Carré ou cube ?' };
  const isList = () => state.topic !== 'tb'; // carrés, cubes, alphabet : une case par élément
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
    save();
    renderMastery();
    renderRev();
  }


  const WEIGHT = { '-1': 6, 0: 10, 1: 6, 2: 4, 3: 2.5, 4: 1.2, 5: 0.6 };
  let retry = null; // un calcul raté revient 3 questions plus tard
  function pick(prev) {
    const items = T().items();
    if (retry && --retry.in <= 0 && retry.item !== prev && items.includes(retry.item)) {
      const it = retry.item; retry = null; return it;
    }
    const pool = items.length > 1 ? items.filter(it => it !== prev) : items;
    const w = pool.map(it => WEIGHT[st(it).box] * (T().bias ? T().bias(it) : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { if ((r -= w[i]) <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  // ---------- Bandeau de maîtrise ----------
  let currentTrain = null;
  function renderMastery() {
    const m = $('mastery');
    if (T().noGrid) { m.className = ''; m.innerHTML = ''; return; }
    if (isList()) {
      m.className = 'mastery';
      m.innerHTML = T().all.map(it => { const c = T().card(it);
        return `<div class="tile lv ${lvl(it)} ${it === currentTrain ? 'now' : ''}" title="${c.n} = ${c.v}">${it}</div>`; }).join('');
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

  function makeLetterPad(el, quiz) {
    el.innerHTML = AB_ITEMS.map(L => `<button data-l="${L}">${L}</button>`).join('');
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) quiz.letter(b.dataset.l); });
  }

  function makeChoicePad(el, quiz) {
    el.innerHTML = RC_CHOICES.map((c, i) => `<button data-c="${c}"><small>${i + 1}</small>${c}</button>`).join('');
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) quiz.pickChoice(b.dataset.c); });
  }

  function Quiz({ q, ans, card, pad, lpad, cpad, onResult }) {
    this.item = null; this.shown = null; this.buf = ''; this.locked = false; this.t0 = 0;
    this.syncPad = () => { const s = this.shown || {}; pad.hidden = !!(s.letter || s.choice); lpad.hidden = !s.letter; cpad.hidden = !s.choice; };
    this.hidePads = () => { pad.hidden = true; lpad.hidden = true; cpad.hidden = true; };
    this.pickChoice = c => { if (this.locked || !this.shown.choice) return; this.buf = c; ans.textContent = c; this.submit(); };
    this.next = () => {
      this.item = pick(this.item);
      this.shown = T().question(this.item);
      this.buf = ''; this.locked = false;
      q.innerHTML = this.shown.html;
      ans.textContent = '';
      this.syncPad();
      card.classList.remove('good', 'bad', 'shake');
      this.t0 = performance.now();
      if (this.onShow) this.onShow(this.item);
    };
    this.digit = d => {
      if (this.shown.choice) { const c = RC_CHOICES[+d - 1]; if (c) this.pickChoice(c); return; }
      if (this.locked || this.shown.letter || this.buf.length >= 4) return;
      if (this.buf === '' && d === '0') return;
      this.buf += d; ans.textContent = this.buf;
      if (this.buf.length === String(this.shown.answer).length) this.submit();
    };
    this.letter = L => { if (this.locked || !this.shown.letter) return; this.buf = L; ans.textContent = L; this.submit(); };
    this.back = () => { if (this.locked) return; this.buf = this.buf.slice(0, -1); ans.textContent = this.buf; };
    this.submit = () => {
      if (this.locked || !this.buf) return;
      this.locked = true;
      const given = this.shown.letter || this.shown.choice ? this.buf : +this.buf;
      const ok = given === this.shown.answer;
      const ms = performance.now() - this.t0;
      record(this.item, ok, ms);
      onResult(ok, this.item, this.shown, given, ms);
    };
  }

  // ---------- Entraînement ----------
  let streak = 0;
  function defaultHint() {
    return `Validation automatique · objectif : moins de ${fmtS(T().fast)}`;
  }
  const train = new Quiz({
    q: $('t-q'), ans: $('t-ans'), card: $('t-card'), pad: $('t-pad'), lpad: $('t-lpad'), cpad: $('t-cpad'),
    onResult(ok, item, shown, given, ms) {
      if (ok) {
        streak++;
        $('t-card').classList.add('good');
        const fast = ms < T().fast;
        $('t-hint').innerHTML = fast
          ? `Juste en <b>${fmtS(ms)}</b>${streak >= 3 ? ` · ${streak} de suite` : ''}`
          : `Juste en <b class="slow">${fmtS(ms)}</b> : encore un peu lent, vise moins de ${fmtS(T().fast)}.`;
        setTimeout(train.next, fast ? 450 : 800);
      } else {
        streak = 0;
        retry = { item, in: 3 };
        $('t-card').classList.add('bad', 'shake');
        $('t-ans').innerHTML = `<s>${given}</s><span class="reveal">${shown.answer}</span>`;
        $('t-hint').textContent = 'Ce calcul reviendra dans quelques questions.';
        const ex = $('t-explain');
        const e = T().explain(item, shown);
        ex.innerHTML = '';
        ex.appendChild(e.viz);
        const t = document.createElement('div');
        t.className = 'tip';
        t.innerHTML = `<h3>${shown.choice || shown.rev ? e.title : `${shown.text} = ${shown.answer}`}</h3>${e.tip}`;
        ex.appendChild(t);
        ex.hidden = false;
        train.hidePads();
        $('t-next').hidden = false;
        $('t-next').focus({ preventScroll: true });
      }
    }
  });
  train.onShow = item => {
    currentTrain = item;
    $('t-explain').hidden = true; train.syncPad(); $('t-next').hidden = true;
    renderMastery();
  };
  $('t-next').addEventListener('click', () => { $('t-hint').textContent = defaultHint(); train.next(); });
  makePad($('t-pad'), train);
  makeLetterPad($('t-lpad'), train);
  makeChoicePad($('t-cpad'), train);

  // ---------- Chrono ----------
  const DURATION = 60000;
  let chronoOn = false, tEnd = 0, score = 0, tries = 0, okMs = 0, misses = [], raf = 0;
  const chrono = new Quiz({
    q: $('c-q'), ans: $('c-ans'), card: $('c-card'), pad: $('c-pad'), lpad: $('c-lpad'), cpad: $('c-cpad'),
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
  makeLetterPad($('c-lpad'), chrono);
  makeChoicePad($('c-cpad'), chrono);

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
  const selected = { sq: '17', cu: '12', tb: '7x8', ab: 'R', rc: '729' };
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
    const isSq = isList();
    $('rstats').innerHTML = `Sus par cœur, vite et sans erreur : <b>${T().all.filter(it => st(it).box >= 4).length}/${T().all.length}</b>`;
    $('sq-list').hidden = !isSq;
    for (const t of ['sq', 'cu', 'tb', 'ab', 'rc']) $('tricks-' + t).hidden = t !== state.topic;
    $('tb-rev').hidden = isSq; $('rnote').hidden = isSq;
    if (isSq) {
      $('sq-list').innerHTML = T().all.map(it => { const c = T().card(it);
        return `<button class="sq" data-it="${it}" aria-pressed="${it === selected[state.topic]}">
          <span class="dot ${lvl(it)}"></span><span class="n">${c.n}</span><span class="v">${c.v}</span>
        </button>`; }).join('');
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
    $('reset').innerHTML = `<button class="ghost-btn" id="reset-ask">Réinitialiser la progression des ${NAMES[state.topic]}</button>`;
    $('reset-ask').onclick = resetAsk;
  }
  function resetAsk() {
    $('reset').innerHTML = `<span>Effacer la progression et le record des ${NAMES[state.topic]} ?</span>
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
    $('m-title').textContent = TITLES[t];
    $('sq-list').classList.toggle('ab', t === 'ab');
    $('sq-list').classList.toggle('rc', t === 'rc');
    streak = 0; retry = null; train.item = null;
    $('t-hint').textContent = defaultHint();
    renderChips(); syncChips();
    renderRev(); renderDetail(); renderChronoStart(); resetBar();
    if (view === 'chrono') showChrono('c-start');
    train.next();
  }

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
    else if (/^[a-z]$/i.test(e.key) && quiz.shown && quiz.shown.letter) { e.preventDefault(); quiz.letter(e.key.toUpperCase()); }
    else if (e.key === 'Backspace') { e.preventDefault(); quiz.back(); }
    else if (e.key === 'Enter') {
      if (document.activeElement && document.activeElement.closest('.chips, .tabs')) return;
      e.preventDefault();
      if (quiz === train && !$('t-next').hidden) $('t-next').click();
      else quiz.submit();
    }
  });

  // pour l'app principale : arrêter le chrono en sortant, ouvrir un thème, résumer la maîtrise
  window.AMmental = {
    stop: stopChrono,
    open(t) { setView('train'); setTopic(t); },
    summary: () => Object.fromEntries(Object.entries(TOPICS).map(([k, T]) =>
      [k, { ok: T.all.filter(it => ((state[k].stats[it] || {}).box ?? -1) >= 4).length, total: T.all.length }])),
  };

  setTopic(state.topic);
})();
