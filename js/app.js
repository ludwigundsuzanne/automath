// AutoMath : accueil, séance du jour, chapitres, fiches et progrès.
(() => {
  'use strict';
  const G = window.AMGen;
  const $ = id => document.getElementById(id);
  const KEY = 'automath.v2';
  const EXAM = new Date(2026, 11, 4);
  const DEFI_SEC = 80;
  const LET = 'ABCDE';

  const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    x: SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
    check: SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    back: SVG('<path d="M15 5l-7 7 7 7"/>'),
    flame: '<svg viewBox="0 0 24 24" class="flame" aria-hidden="true"><path d="M12.6 1.8c.6 3.4 4.9 5.6 4.9 11.2a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4.2 2.4-5.4.1 1.9.9 3.2 2.2 3.4-.3-3.4.1-6.4 1.5-9.2z"/></svg>',
  };

  // ---------- Dates ----------
  const fmtKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayKey = (o = 0) => { const d = new Date(); d.setDate(d.getDate() + o); return fmtKey(d); };
  const daysUntil = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((EXAM - t) / 864e5); };
  const fmtS = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
  const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;

  // ---------- État (stocké sur l'appareil) ----------
  const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const S = Object.assign({ stats: {}, chaps: {}, auto: {}, cards: [], streak: null, session: null, prac: null, history: {}, lastNotion: null, total: 0, errs: [] }, load(KEY) || {});
  if (!Array.isArray(S.errs)) S.errs = [];
  if (!S.streak) {
    // reprend la série de jours de l'ancienne version (objectif de 30 réponses rapides)
    const old = (load('carres.v1') || {}).streak;
    S.streak = old && old.count ? { count: old.count, last: old.last, best: old.best || old.count } : { count: 0, last: '', best: 0 };
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  // ---------- Maîtrise et note estimée ----------
  // une réponse vaut 1 si juste en moins de 90 s, 0,6 si juste mais lente, 0 si fausse
  const pts = r => (r[0] ? (r[1] <= 90 ? 1 : 0.6) : 0);
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  const typeMastery = t => { const h = S.stats[t]; return h && h.length ? avg(h.slice(-6).map(pts)) : null; };
  const chapMastery = c => { const h = S.chaps[c]; return h && h.length >= 5 ? avg(h.slice(-15).map(pts)) : null; };
  const chapCount = c => (S.chaps[c] || []).length;
  // au TAGE MAGE on répond toujours : ce qu'on ne sait pas faire rapporte encore 1 chance sur 5
  function estimate() {
    let s = 0;
    for (const c of G.CHAPTERS) { const m = chapMastery(c.id); s += c.w * (m === null ? 0.2 : m + (1 - m) * 0.2); }
    return Math.round(60 * s);
  }
  const evaluated = () => G.CHAPTERS.filter(c => chapMastery(c.id) !== null).length;

  function recordQ(q, ok, ms, cause) {
    const r = [ok ? 1 : 0, Math.round(ms / 1000)];
    for (const [o, k] of [[S.stats, q.type], [S.chaps, q.chap]]) { (o[k] ||= []).push(r); if (o[k].length > 40) o[k].shift(); }
    S.total++;
    if (!ok) { S.errs.push([dayKey(), q.type, cause || '?']); if (S.errs.length > 200) S.errs.shift(); }
    return srUpdate(q.type, ok, r[1]);
  }

  // ---------- Répétition espacée par notion ----------
  // Chaque notion (type de question) a un niveau 0-5 et une date de prochaine révision.
  //  ratée → niveau baisse (d'un cran si elle était acquise, sinon à 0), revue demain et 3 questions plus tard ;
  //  juste mais lente → revue demain ; juste et rapide → l'écart s'allonge : 1, 3, 7, 14 puis 30 jours.
  //  Le niveau ne monte qu'une fois par jour : c'est la régularité sur plusieurs jours qui fait la maîtrise.
  const SR_DAYS = [1, 1, 3, 7, 14, 30];
  const TARGET = { 1: 45, 2: 70, 3: 90 }; // temps visé (s) selon la difficulté propre de la notion
  const target = type => TARGET[(G.TYPES[type] || {}).lvl || 2];
  function srUpdate(type, ok, sec) {
    const s = (S.sr[type] ||= { box: 0, due: dayKey(), n: 0 });
    const before = s.box;
    s.n++; s.last = dayKey();
    if (!ok) { s.box = s.box >= 3 ? s.box - 1 : 0; s.due = dayKey(1); }
    else if (sec > target(type)) { s.box = Math.max(1, s.box); s.due = dayKey(1); }
    else {
      if (s.up !== dayKey()) { s.box = Math.min(5, s.box + 1); s.up = dayKey(); }
      s.due = dayKey(SR_DAYS[s.box]);
    }
    const mastered = s.box >= 4 && before < 4 && !s.mAt;
    if (mastered) s.mAt = dayKey();
    return mastered;
  }
  const NOTION_STATUS = b => (b === undefined ? ['new', 'Nouvelle'] : b <= 1 ? ['weak', 'À revoir'] : b <= 3 ? ['mid', 'En cours'] : b === 4 ? ['good', 'Maîtrisée'] : ['top', 'Acquise']);
  const dueNotions = (o = 0) => Object.entries(S.sr).filter(([t, s]) => G.TYPES[t] && s.due <= dayKey(o))
    .sort(([, a], [, b]) => a.box - b.box || (a.due < b.due ? -1 : 1)).map(([t]) => t);
  // difficulté proposée : on commence facile, on monte avec la maîtrise
  const diffFor = type => { const b = (S.sr[type] || { box: 0 }).box; return b <= 1 ? 1 : b <= 3 ? 2 : 3; };

  // Reprise des données des versions précédentes (statistiques et révisions), sans rien effacer
  function migrate() {
    if (S.sr) return;
    S.sr = {};
    for (const [type, h] of Object.entries(S.stats || {})) {
      if (!G.TYPES[type]) continue;
      let box = 0;
      for (const [ok, sec] of h.slice(-8)) box = !ok ? (box >= 3 ? box - 1 : 0) : sec > target(type) ? Math.max(1, box) : Math.min(3, box + 1);
      const card = (S.cards || []).find(c => c.type === type);
      S.sr[type] = { box, n: h.length, last: dayKey(), due: card ? card.due : box <= 1 ? dayKey() : dayKey(SR_DAYS[box]) };
    }
  }
  function recordAuto(cat, ok, ms) {
    const a = (S.auto[cat] ||= { box: -1, n: 0, ok: 0 });
    a.n++;
    if (ok) { a.ok++; a.box = ms < G.AUTO[cat].fast ? Math.min(5, Math.max(1, a.box + 1)) : Math.max(1, a.box >= 3 ? a.box - 1 : a.box); }
    else a.box = 0;
  }

  // ---------- Choix des questions ----------
  const ready = () => G.CHAPTERS.filter(c => c.ready);
  const chapOf = id => G.CHAPTERS.find(c => c.id === id);
  function wpick(items, w) { let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < items.length; i++) if ((r -= w[i]) <= 0) return items[i]; return items[items.length - 1]; }
  const recentErrors = (type, n = 3) => (S.stats[type] || []).slice(-n).filter(r => !r[0]).length;
  // Poids d'une notion : faible maîtrise, erreurs récentes et révision en retard la font remonter.
  // En apprentissage, les notions difficiles n'arrivent qu'une fois le chapitre un peu maîtrisé ; le défi chrono, lui, mélange tout.
  function pickType(chap, prev, exam = false) {
    const all = G.typesOf(chap), pool = all.length > 1 ? all.filter(t => t !== prev) : all, cm = chapMastery(chap);
    return wpick(pool, pool.map(t => {
      const s = S.sr[t], m = typeMastery(t), lvl = G.TYPES[t].lvl;
      let w = m === null ? 1.2 : Math.max(0.25, 1.1 - m) + 0.3 * recentErrors(t) + (s && s.due <= dayKey() ? 0.4 : 0);
      if (!exam && lvl === 2 && cm === null && chapCount(chap) < 3) w *= 0.5;
      if (!exam && lvl === 3 && (cm === null || cm < 0.4)) w *= 0.2;
      return w;
    }));
  }
  const genFor = t => G.gen(t, diffFor(t));
  function series(chap, n) { const out = []; let prev = null; for (let i = 0; i < n; i++) { const t = pickType(chap, prev); prev = t; out.push(genFor(t)); } return out; }
  function mixed(n) {
    const out = []; let prev = null;
    for (let i = 0; i < n; i++) {
      const pool = ready().filter(c => c.id !== prev);
      const c = wpick(pool, pool.map(c => c.w * (1.15 - (chapMastery(c.id) ?? 0.3))));
      prev = c.id; const t = pickType(c.id, null, true); out.push(G.gen(t, Math.max(2, diffFor(t))));
    }
    return out;
  }

  // ---------- Tes 3 priorités du moment ----------
  function priorities() {
    const cands = [];
    for (const c of ready()) for (const t of G.typesOf(c.id)) {
      const s = S.sr[t], h = S.stats[t] || [];
      if (!s || !h.length) { cands.push({ t, c, score: c.w * 0.45 + (G.TYPES[t].lvl === 1 ? 0.01 : 0), why: 'Jamais travaillée' }); continue; }
      const m = typeMastery(t) ?? 0, err = recentErrors(t), due = s.due <= dayKey();
      if (s.box >= 4 && !due && !err) continue;
      const late = due ? Math.round((new Date() - new Date(s.due)) / 864e5) : 0;
      const why = err ? (h.length === 1 ? 'Ratée la dernière fois' : `${plural(err, 'erreur')} sur tes ${Math.min(3, h.length)} dernières réponses`) : due ? (late > 0 ? `À réviser depuis ${plural(late, 'jour')}` : 'À réviser aujourd\'hui')
        : avg(h.slice(-3).map(r => r[1])) > target(t) ? `Trop lente : ${Math.round(avg(h.slice(-3).map(r => r[1])))} s en moyenne, objectif ${target(t)} s` : `Maîtrise ${Math.round(m * 100)} %`;
      cands.push({ t, c, score: c.w * ((1 - m) + 0.35 * err + (due ? 0.3 : 0)), why });
    }
    cands.sort((a, b) => b.score - a.score);
    const out = [], used = new Set();
    for (const x of cands) { if (out.length < 3 && !used.has(x.c.id)) { out.push(x); used.add(x.c.id); } }
    for (const x of cands) { if (out.length < 3 && !out.includes(x)) out.push(x); }
    return out;
  }
  // un chapitre jamais vu passe en priorité, dans cet ordre
  const NOTION_ORDER = ['pct', 'eq', 'moy', 'frac', 'vit', 'trav', 'conv', 'salut', 'geo', 'proba', 'int', 'pui'];
  function chooseNotion() {
    const ids = ready().map(c => c.id);
    const unseen = NOTION_ORDER.filter(id => ids.includes(id) && chapCount(id) === 0);
    if (unseen.length) return unseen[0];
    let best = null, bs = -1;
    for (const c of ready()) {
      if (c.id === S.lastNotion && ids.length > 1) continue;
      const s = c.w * (1.1 - (chapMastery(c.id) ?? 0.3)); if (s > bs) { bs = s; best = c.id; }
    }
    return best;
  }
  function warmItems(n) {
    const cats = Object.keys(G.AUTO), out = []; let prev = '';
    while (out.length < n) {
      const cat = wpick(cats, cats.map(c => { const b = (S.auto[c] || { box: -1 }).box; return b < 0 ? 4 : 6 - b; }));
      const q = G.AUTO[cat].f(); if (q.text === prev) continue;
      prev = q.text; out.push({ cat, text: q.text, a: q.a, tip: q.tip || G.AUTO[cat].tip });
    }
    return out;
  }

  // ---------- Séances ----------
  function planBlocks() {
    const due = dueNotions().length, ch = chooseNotion();
    return [{ id: 'warm', title: 'Échauffement' }, ...(due ? [{ id: 'rev', title: 'Révisions', n: Math.min(due, 8) }] : []),
      { id: 'notion', title: chapOf(ch).name, chap: ch }, { id: 'defi', title: 'Défi chrono' }];
  }
  function newDaily(kind) {
    const blocks = planBlocks().map(p => {
      if (p.id === 'warm') return { ...p, items: warmItems(12) };
      if (p.id === 'rev') return { ...p, items: dueNotions().slice(0, 8).map(genFor) };
      if (p.id === 'notion') return { ...p, intro: true, items: series(p.chap, 8) };
      return { ...p, timed: DEFI_SEC, items: mixed(4) };
    });
    blocks.forEach(b => { b.i = 0; b.res = []; });
    return { date: dayKey(), kind, blocks, b: 0, startEst: estimate(), done: false, mastered: [] };
  }
  const newPractice = ch => ({ date: dayKey(), kind: 'prac', b: 0, startEst: estimate(), done: false, mastered: [],
    blocks: [{ id: 'prac', title: chapOf(ch).name, chap: ch, items: series(ch, 10), i: 0, res: [] }] });
  // entraînement ciblé sur une notion (depuis les priorités) : 6 questions de difficulté croissante
  const newFocus = t => ({ date: dayKey(), kind: 'prac', b: 0, startEst: estimate(), done: false, mastered: [],
    blocks: [{ id: 'prac', title: G.TYPES[t].label, chap: G.TYPES[t].chap, items: [1, 1, 2, 2, 3, 3].map(d => G.gen(t, Math.max(d, diffFor(t) - 1))), i: 0, res: [] }] });

  const blockName = b => (b.id === 'notion' ? 'Notion du jour' : b.title);
  const blockDesc = b => ({ warm: '12 calculs au pavé numérique', rev: `${plural(b.items ? b.items.length : b.n, 'notion')} à revoir aujourd'hui`,
    notion: `${b.title} : fiche, puis 8 questions`, defi: '4 questions mélangées, 80 s chacune', prac: `${b.items ? b.items.length : 10} questions` })[b.id];
  const blockTime = b => ({ warm: '3 min', rev: '5 min', notion: '10 min', defi: '5 min' })[b.id];

  // ---------- Navigation ----------
  window.AM = { view: 'home' };
  const SCREENS = ['home', 'chap', 'mental', 'prog', 'fiche', 'run'];
  let runRef = null;
  const cur = () => S[runRef];
  function go(v, navAs) {
    if (AM.view === 'mental' && v !== 'mental' && window.AMmental) window.AMmental.stop();
    stopClock();
    AM.view = v;
    SCREENS.forEach(s => { $('scr-' + s).hidden = s !== v; });
    $('hdr').hidden = v === 'run';
    const tab = navAs || v;
    document.querySelectorAll('.nav [data-go]').forEach(b => { if (b.dataset.go === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (v === 'home') renderHome(); else if (v === 'chap') renderChap(); else if (v === 'prog') renderProg(); else if (v === 'run') renderRun();
    window.scrollTo(0, 0);
  }
  document.querySelector('.nav').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });

  // ---------- Accueil ----------
  const streakNow = () => (S.streak.last === dayKey() || S.streak.last === dayKey(-1) ? S.streak.count : 0);
  function gauge(est) {
    return `<div class="gauge" aria-hidden="true"><div class="zone" style="left:${36 / 60 * 100}%;width:${5 / 60 * 100}%"></div><div class="fill" style="width:${est / 60 * 100}%"></div></div>
      <div class="gauge-l"><span>0</span><span>Objectif 36–41</span><span>60</span></div>`;
  }
  function renderHome() {
    if (S.session && S.session.date !== dayKey()) { S.session = null; save(); }
    const d = daysUntil(), est = estimate(), ev = evaluated(), k = streakNow(), doneToday = S.streak.last === dayKey(), s = S.session;
    const count = d > 1 ? `TAGE MAGE dans <b>${d} jours</b>` : d === 1 ? 'TAGE MAGE <b>demain</b>' : d === 0 ? 'TAGE MAGE <b>aujourd\'hui</b>' : 'Prochain passage : <b>mars</b>';
    const running = s && !s.done;
    const plan = running ? s.blocks : planBlocks();
    let action;
    if (running) action = `<button class="go" id="h-go">Reprendre la séance<small>Bloc ${s.b + 1} sur ${s.blocks.length} · ${blockName(s.blocks[s.b])}</small></button>`;
    else if (doneToday) action = `<div class="box done-card">${ICON.check}<div><b>Séance du jour terminée</b><p class="sub">Reviens demain pour garder ta série.</p></div></div><button class="ghost-btn wide-btn" id="h-go">Séance bonus</button>`;
    else action = `<button class="go" id="h-go">Commencer la séance du jour<small>Environ 20 minutes · tu peux t'arrêter à tout moment</small></button>`;
    const rows = plan.map((b, i) => {
      const st = running ? (i < s.b ? 'done' : i === s.b ? 'cur' : '') : doneToday ? 'done' : '';
      return `<li class="${st}"><span class="ic">${st === 'done' ? ICON.check : ''}</span><span>${blockName(b)}${b.id === 'notion' ? `<small>${b.title}</small>` : ''}</span><span class="d">${blockTime(b)}</span></li>`;
    }).join('');
    const prio = priorities();
    const prioHtml = prio.length ? `<div class="box prio"><p class="eyebrow">Tes 3 priorités</p>${prio.map(x => `<div class="prio-row"><div class="prio-t"><b>${G.TYPES[x.t].label}</b><span>${x.c.name} · ${x.why}</span></div><button class="btn2 prio-go" data-focus="${x.t}">Travailler</button></div>`).join('')}</div>` : '';
    const dueN = dueNotions().length;
    $('scr-home').innerHTML = `
      <div class="box">
        <div class="count"><span>${count}</span><span class="chip-streak${k ? ' on' : ''}" title="Jours d'affilée">${ICON.flame}${k}</span></div>
        <div class="est"><span class="v">${est}</span><span class="u">/60</span><span class="l">note estimée en calcul</span></div>
        ${gauge(est)}
        <p class="sub small">${ev === 0 ? 'Pas encore évaluée. Les chapitres pas encore travaillés comptent comme des réponses au hasard.' : `Évaluée sur ${ev} chapitre${ev > 1 ? 's' : ''} sur ${G.CHAPTERS.length}. Les autres comptent comme des réponses au hasard.`}</p>
      </div>
      ${action}
      ${doneToday && !running ? '' : `<ul class="steps" aria-label="Déroulé de la séance">${rows}</ul>`}
      ${prioHtml}
      ${dueN ? `<p class="sub small center">${plural(dueN, 'notion')} à réviser aujourd'hui</p>` : ''}`;
    $('h-go').onclick = startDaily;
    $('scr-home').querySelectorAll('[data-focus]').forEach(b => { b.onclick = () => startFocus(b.dataset.focus); });
  }
  function startFocus(t) { S.prac = newFocus(t); save(); runRef = 'prac'; go('run'); }
  function startDaily() {
    const s = S.session;
    if (!(s && s.date === dayKey() && !s.done)) { S.session = newDaily(S.streak.last === dayKey() ? 'bonus' : 'daily'); save(); }
    runRef = 'session'; go('run');
  }

  // ---------- Séance en cours ----------
  let clock = null, t0 = 0, numBuf = '', advanceTimer = null;
  function stopClock() { if (clock) { clearInterval(clock); clock = null; } if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; } }
  function quit() { stopClock(); go(runRef === 'prac' ? 'chap' : 'home'); }

  function topBar(s, sub) {
    const blk = s.blocks[s.b];
    const segs = s.blocks.length > 1 ? `<div class="segs" aria-hidden="true">${s.blocks.map((b, i) => `<i class="${i < s.b ? 'done' : i === s.b ? 'cur' : ''}"></i>`).join('')}</div>` : '';
    return `<div class="run-top"><button class="icon-btn" id="r-quit" aria-label="Quitter la séance">${ICON.x}</button>
      <div class="run-title">${blockName(blk)}<small>${sub}</small></div><span class="clock" id="r-clock"></span></div>${segs}`;
  }
  const pbar = blk => `<div class="pbar"><div style="width:${blk.i / blk.items.length * 100}%"></div></div>`;
  const subOf = blk => `${blk.id === 'notion' ? blk.title + ' · ' : ''}${Math.min(blk.i + 1, blk.items.length)} sur ${blk.items.length}`;

  function renderRun() {
    stopClock();
    const s = cur(), el = $('scr-run');
    if (!s) { go('home'); return; }
    if (s.done) { renderBilan(s, el); return; }
    const blk = s.blocks[s.b];
    if (blk.intro && !blk.introDone) renderIntro(s, blk, el);
    else if (blk.i >= blk.items.length) renderBlockEnd(s, blk, el);
    else if (blk.id === 'warm') renderNum(s, blk, blk.items[blk.i], el);
    else renderQcm(s, blk, blk.items[blk.i], el);
    const q = $('r-quit'); if (q) q.onclick = quit;
  }

  function renderIntro(s, blk, el) {
    const c = chapOf(blk.chap);
    el.innerHTML = topBar(s, 'Fiche méthode') + `<div class="box fiche"><p class="eyebrow">Fiches ${c.fiches} de ton manuel</p><h2 class="t">${c.name}</h2>${G.FICHES[c.id]}</div>
      <button class="big-btn" id="r-go">C'est parti : ${blk.items.length} questions</button>`;
    $('r-go').onclick = () => { blk.introDone = true; save(); renderRun(); };
  }

  function renderBlockEnd(s, blk, el) {
    const ok = blk.res.filter(r => r.ok).length, nb = s.blocks[s.b + 1];
    el.innerHTML = topBar(s, 'Bloc terminé') + `
      <div class="box center"><span class="big-check">${ICON.check}</span><h2 class="t">${blockName(blk)} terminé</h2><p class="sub">${ok} sur ${blk.res.length} justes</p></div>
      <div class="box"><p class="eyebrow">Ensuite · ${blockTime(nb)}</p><p class="next-name">${blockName(nb)}</p><p class="sub">${blockDesc(nb)}</p></div>
      <button class="big-btn" id="r-go">Continuer</button>
      <button class="ghost-btn wide-btn" id="r-pause">Faire une pause</button>`;
    const advance = () => { s.b++; save(); };
    $('r-go').onclick = () => { advance(); renderRun(); window.scrollTo(0, 0); };
    $('r-pause').onclick = () => { advance(); go('home'); };
  }

  // --- QCM ---
  function renderQcm(s, blk, q, el) {
    const a = blk.answered;
    const opts = q.choices.map((c, i) => {
      const cls = a ? (i === q.ans ? ' ok' : i === a.c ? ' ko' : '') : '';
      return `<button class="opt${cls}" data-i="${i}"${a ? ' tabindex="-1"' : ''}><span class="l">${LET[i]}</span><span class="v">${c.h}</span></button>`;
    }).join('');
    el.innerHTML = topBar(s, subOf(blk)) + (blk.timed && !a ? '<div class="pbar timer" id="r-timer"><div style="width:100%"></div></div>' : pbar(blk)) + `
      <div class="box">${q.retry ? '<span class="retry-chip">Question de vérification</span>' : ''}<p class="qtext">${q.text}</p></div>
      <div class="opts${a ? ' answered' : ''}" id="r-opts">${opts}</div>
      ${a ? feedback(q, a) + '<button class="big-btn cont" id="r-next">Continuer</button>'
        : blk.timed ? '<p class="nudge" id="r-nudge" hidden>Temps écoulé : réponds quand même, au hasard s\'il le faut. Une réponse ne coûte rien.</p>' : ''}`;
    if (a) {
      $('r-next').onclick = next;
      requestAnimationFrame(() => { const x = $('r-expl'); if (x && x.getBoundingClientRect().top > innerHeight * 0.6) x.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      return;
    }
    $('r-opts').onclick = e => { const b = e.target.closest('.opt'); if (b) choose(+b.dataset.i); };
    startClock(blk);
  }
  function startClock(blk) {
    t0 = performance.now();
    const tick = () => {
      const el = $('r-clock'); if (!el) return;
      const sec = (performance.now() - t0) / 1000;
      if (blk.timed) {
        const left = Math.max(0, blk.timed - sec);
        const l = Math.ceil(left);
        el.textContent = `${Math.floor(l / 60)}:${String(l % 60).padStart(2, '0')}`;
        el.classList.toggle('late', left <= 10);
        const bar = $('r-timer'); if (bar) { bar.firstChild.style.width = `${left / blk.timed * 100}%`; bar.classList.toggle('low', left <= 10); }
        if (left <= 0) { const n = $('r-nudge'); if (n) n.hidden = false; }
      } else {
        const t = Math.floor(sec); el.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
        el.classList.toggle('late', sec > DEFI_SEC);
      }
    };
    tick(); clock = setInterval(tick, 250);
  }
  function tipBox(id) {
    const t = id && G.TIP[id]; if (!t) return '';
    return `<div class="exb tip"><span class="exl">Astuce · ${t.title}</span><p>${t.rule}</p><p class="ex">${t.ex}</p></div>`;
  }
  function feedback(q, a) {
    const sec = Math.round(a.ms / 1000), tg = target(q.type);
    let head, diag = '';
    if (a.ok) head = sec <= tg ? `Juste · ${sec} s` : `Juste, mais en ${sec} s (objectif ${tg} s)`;
    else {
      head = `Raté · la bonne réponse est ${LET[q.ans]}`;
      const why = (q.choices[a.c] || {}).why;
      diag = why ? `<div class="diag"><b>${G.CAUSES[why[0]]}</b><span>${why[1]}</span></div>`
        : '<div class="diag"><b>Erreur de calcul probable</b><span>Ta réponse ne correspond à aucune erreur type : refais le calcul étape par étape avec la méthode ci-dessous.</span></div>';
    }
    // juste : on montre seulement la méthode rapide et l'astuce ; raté : tout, piège compris
    return `<div class="expl ${a.ok ? 'good' : 'bad'}" id="r-expl" aria-live="polite"><h3>${head}${a.m ? ' · notion maîtrisée' : ''}</h3>${diag}
      <div class="exs${a.ok ? ' short' : ''}">${q.exp}${tipBox(q.tip)}</div>
      ${a.ok ? '' : `<p class="again">${a.retry ? 'Une question similaire arrive dans 3 questions pour vérifier.' : 'Cette notion reviendra demain dans tes révisions.'}</p>`}</div>`;
  }
  function choose(i) {
    const s = cur(), blk = s.blocks[s.b], q = blk.items[blk.i];
    if (blk.answered) return;
    const ms = performance.now() - t0, ok = i === q.ans, why = (q.choices[i] || {}).why;
    stopClock();
    const m = recordQ(q, ok, ms, ok ? null : why ? why[0] : '?');
    if (m) (s.mastered ||= []).push(q.type);
    blk.res.push({ ok, ms, type: q.type });
    // ratée : une question similaire (même notion, nouveaux nombres) revient 3 questions plus tard, une fois par bloc
    let retry = false;
    if (!ok && !blk.timed && !(blk.retried ||= []).includes(q.type)) {
      blk.retried.push(q.type);
      blk.items.splice(Math.min(blk.i + 4, blk.items.length), 0, { ...G.gen(q.type, Math.max(1, diffFor(q.type))), retry: true });
      retry = true;
    }
    blk.answered = { c: i, ok, ms, m, retry };
    save(); renderRun();
  }
  function next() {
    const s = cur(), blk = s.blocks[s.b];
    delete blk.answered; blk.i++;
    if (blk.i >= blk.items.length && s.b === s.blocks.length - 1) { finish(s); return; }
    save(); renderRun(); window.scrollTo(0, 0);
  }

  // --- Automatismes au pavé numérique ---
  function renderNum(s, blk, it, el) {
    const a = blk.answered;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map(k => k === 'del'
      ? '<button class="k-del" data-k="del" aria-label="Effacer">⌫</button>' : `<button data-k="${k}">${k}</button>`).join('') + '<button class="k-ok wide" data-k="ok">OK</button>';
    el.innerHTML = topBar(s, subOf(blk)) + pbar(blk) + `
      <div class="card${a ? (a.ok ? ' good' : ' bad') : ''}"><div class="wq">${it.text}</div>
        <div class="ans" id="r-ans">${a ? (a.ok ? a.v : `<s>${a.v}</s><span class="reveal">${it.a}</span>`) : ''}</div></div>
      <p class="hint">${a ? (a.ok ? `Juste en <b>${fmtS(a.ms)}</b>` : G.AUTO[it.cat].label) : 'Validation automatique dès que le nombre de chiffres est atteint'}</p>
      ${a && !a.ok ? (it.tip ? `<div class="expl">${tipBox(it.tip)}</div>` : '') + '<button class="big-btn" id="r-next">Continuer</button>' : `<div class="pad pad-num" id="r-pad">${keys}</div>`}`;
    if (a) {
      if (a.ok) advanceTimer = setTimeout(next, 450); else $('r-next').onclick = next;
      return;
    }
    numBuf = '';
    $('r-pad').onclick = e => { const b = e.target.closest('[data-k]'); if (b) numKey(b.dataset.k); };
    startClock(blk);
  }
  function numKey(k) {
    const s = cur(); if (!s) return;
    const blk = s.blocks[s.b], it = blk.items[blk.i];
    if (!it || blk.answered || blk.id !== 'warm') return;
    if (k === 'del') numBuf = numBuf.slice(0, -1);
    else if (k === 'ok') { if (numBuf) submitNum(blk, it); return; }
    else if (k === ',') { if (!numBuf || numBuf.includes(',')) return; numBuf += ','; }
    else if (numBuf.length < 7) numBuf += k;
    $('r-ans').textContent = numBuf;
    if (numBuf.length === it.a.length && k !== ',') submitNum(blk, it);
  }
  function submitNum(blk, it) {
    const ms = performance.now() - t0, v = numBuf.replace(/,$/, ''), ok = v === it.a;
    stopClock();
    recordAuto(it.cat, ok, ms);
    blk.res.push({ ok, ms });
    blk.answered = { v, ok, ms };
    numBuf = '';
    save(); renderRun();
  }

  // --- Fin de séance ---
  function completeDay() {
    const st = S.streak; if (st.last === dayKey()) return;
    st.count = st.last === dayKey(-1) ? st.count + 1 : 1;
    st.last = dayKey(); st.best = Math.max(st.best || 0, st.count);
  }
  function finish(s) {
    s.done = true; s.endEst = estimate();
    if (s.kind === 'daily') { completeDay(); const n = s.blocks.find(b => b.id === 'notion'); if (n) S.lastNotion = n.chap; }
    S.history[dayKey()] = s.endEst;
    save(); renderRun(); window.scrollTo(0, 0);
  }
  function renderBilan(s, el) {
    const all = s.blocks.flatMap(b => b.res), ok = all.filter(r => r.ok).length;
    const qcm = s.blocks.filter(b => b.id !== 'warm').flatMap(b => b.res);
    const avgT = qcm.length ? Math.round(avg(qcm.map(r => r.ms)) / 1000) : null;
    const delta = s.endEst - s.startEst, k = streakNow(), due = dueNotions(1).length, prac = s.kind === 'prac';
    const mast = [...new Set(s.mastered || [])];
    const rows = s.blocks.map(b => `<tr><td>${blockName(b)}${b.id === 'notion' ? ` · ${b.title}` : ''}</td><td class="num">${b.res.filter(r => r.ok).length}/${b.res.length}</td></tr>`).join('');
    el.innerHTML = `
      <div class="box center"><span class="big-check">${ICON.check}</span><h2 class="t">${prac ? 'Entraînement terminé' : 'Séance terminée'}</h2>
        ${s.kind === 'daily' ? `<p class="sub">${ICON.flame} ${plural(k, 'jour')} d'affilée${k >= (S.streak.best || 0) && k > 1 ? ' · record' : ''}</p>` : ''}</div>
      <div class="stat-row">
        <div class="stat"><small>Justes</small><b>${ok}/${all.length}</b></div>
        <div class="stat"><small>Note estimée</small><b>${s.endEst}${delta ? `<span class="delta ${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '+' : '−'}${Math.abs(delta)}</span>` : ''}</b></div>
        ${avgT !== null ? `<div class="stat"><small>Temps moyen</small><b>${avgT} s</b></div>` : ''}
      </div>
      ${mast.length ? `<div class="box mastered"><p class="eyebrow">Notions maîtrisées aujourd'hui</p>${mast.map(t => `<p>${ICON.check}${G.TYPES[t].label}</p>`).join('')}</div>` : ''}
      <div class="box"><table class="tbl">${rows}</table></div>
      <p class="sub center">${due ? `Demain : ${plural(due, 'notion')} à revoir.` : 'Rien à revoir demain.'}</p>
      <button class="big-btn" id="r-home">${prac ? 'Retour aux chapitres' : 'Retour à l\'accueil'}</button>`;
    $('r-home').onclick = () => { if (prac) { S.prac = null; save(); } go(prac ? 'chap' : 'home'); };
  }

  // ---------- Chapitres et fiches ----------
  // statut d'une astuce : maîtrisée quand les notions qui l'utilisent sont maîtrisées
  function tipStatus(t) {
    const boxes = [...t.types.filter(x => S.sr[x]).map(x => S.sr[x].box), ...t.autos.filter(x => S.auto[x] && S.auto[x].box >= 0).map(x => S.auto[x].box)];
    const total = t.types.length + t.autos.length;
    if (!total) return ['ref', 'À connaître'];
    if (!boxes.length) return ['new', 'À découvrir'];
    return boxes.length === total && Math.min(...boxes) >= 4 ? ['good', 'Maîtrisée'] : ['mid', 'En cours'];
  }
  let chapTab = 'chap';
  function renderTips(el) {
    const counts = { good: 0 }; G.TIPS.forEach(t => { const [k] = tipStatus(t); counts[k] = (counts[k] || 0) + 1; });
    el.innerHTML += `<p class="sub small">${counts.good} astuce${counts.good > 1 ? 's' : ''} maîtrisée${counts.good > 1 ? 's' : ''} sur ${G.TIPS.length}. Une astuce est maîtrisée quand tu réussis vite et régulièrement les questions qui l'utilisent.</p>`
      + G.TIP_GROUPS.map(g => {
        const ts = G.TIPS.filter(t => t.chap === g.id); if (!ts.length) return '';
        return `<p class="eyebrow tip-group">${g.name}</p>` + ts.map(t => {
          const [k, l] = tipStatus(t);
          return `<div class="box tipcard"><div class="ch-h"><span class="ch-n">${t.title}</span><span class="pill ${k}">${l}</span></div><p>${t.rule}</p><p class="ex">${t.ex}</p></div>`;
        }).join('');
      }).join('');
  }
  function renderChap() {
    const el = $('scr-chap');
    el.innerHTML = `<div><h2 class="t">Chapitres</h2></div>
      <div class="seg" role="tablist"><button role="tab" data-tab="chap" aria-selected="${chapTab === 'chap'}">Chapitres</button><button role="tab" data-tab="tips" aria-selected="${chapTab === 'tips'}">Astuces</button></div>`;
    if (chapTab === 'tips') renderTips(el);
    else el.innerHTML += `<p class="sub small">Dans l'ordre d'arrivée dans l'app, puis par poids au TAGE MAGE.</p>` + G.CHAPTERS.map(c => {
      const m = chapMastery(c.id), n = chapCount(c.id), dots = '●'.repeat(c.freq) + '○'.repeat(5 - c.freq);
      const ts = G.typesOf(c.id), mastered = ts.filter(t => (S.sr[t] || {}).box >= 4).length;
      const status = !c.ready ? (c.step === 'mars' ? 'Pour le passage de mars' : `Arrive à l'étape ${c.step}`)
        : n === 0 ? 'Pas encore travaillé' : m === null ? `${plural(n, 'question')} · encore ${5 - n} pour évaluer` : `Maîtrise ${Math.round(m * 100)} % · ${mastered}/${ts.length} notions maîtrisées`;
      return `<div class="box ch${c.ready ? '' : ' off'}">
        <div class="ch-h"><span class="ch-n">${c.name}</span><span class="dots" title="Fréquence au TAGE MAGE : ${c.freq} sur 5">${dots}</span></div>
        <p class="sub small">Fiches ${c.fiches} · ${status}</p>
        ${c.ready ? `<div class="mbar"><div style="width:${Math.round((m ?? 0) * 100)}%"></div></div>
          <div class="acts"><button class="btn2" data-fiche="${c.id}">Fiche</button><button class="btn1" data-prac="${c.id}">S'entraîner</button></div>` : ''}
      </div>`;
    }).join('');
    el.onclick = e => {
      const f = e.target.closest('[data-fiche]'), p = e.target.closest('[data-prac]'), tb = e.target.closest('[data-tab]');
      if (tb) { chapTab = tb.dataset.tab; renderChap(); } else if (f) openFiche(f.dataset.fiche); else if (p) startPractice(p.dataset.prac);
    };
  }
  function openFiche(id) {
    const c = chapOf(id);
    $('scr-fiche').innerHTML = `<button class="ghost-btn back-btn" id="f-back">${ICON.back}Chapitres</button>
      <div class="box fiche"><p class="eyebrow">Fiches ${c.fiches} de ton manuel</p><h2 class="t">${c.name}</h2>${G.FICHES[id]}</div>
      <button class="big-btn" id="f-prac">S'entraîner : 10 questions</button>`;
    go('fiche', 'chap');
    $('f-back').onclick = () => go('chap');
    $('f-prac').onclick = () => startPractice(id);
  }
  function startPractice(id) { S.prac = newPractice(id); save(); runRef = 'prac'; go('run'); }

  // ---------- Progrès ----------
  function chart() {
    const pts = Object.entries(S.history).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-30);
    if (pts.length < 2) return '<p class="sub small">La courbe apparaîtra après ta deuxième séance.</p>';
    const W = 320, H = 130, P = 6, x = i => P + i * (W - 2 * P) / (pts.length - 1), y = v => H - P - v / 60 * (H - 2 * P);
    const line = pts.map(([, v], i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const [, last] = pts[pts.length - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution de la note estimée sur ${pts.length} jours, dernière valeur ${last} sur 60">
      <rect x="0" y="${y(41)}" width="${W}" height="${y(36) - y(41)}" class="band"/>
      ${[0, 20, 40, 60].map(v => `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${W - 2}" y="${y(v) - 3}" class="ax">${v}</text>`).join('')}
      <polyline points="${line}" class="ln"/><circle cx="${x(pts.length - 1)}" cy="${y(last)}" r="4" class="dot"/></svg>
      <div class="gauge-l"><span>${pts[0][0].slice(8)}/${pts[0][0].slice(5, 7)}</span><span>Zone verte : objectif 36–41</span><span>aujourd'hui</span></div>`;
  }
  // erreurs des 30 derniers jours, par cause
  function errBox() {
    const since = dayKey(-30);
    const recent = S.errs.filter(e => e[0] >= since);
    if (!recent.length) return '';
    const by = {}; recent.forEach(e => { by[e[2]] = (by[e[2]] || 0) + 1; });
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<tr><td>${G.CAUSES[c] || 'Erreur de calcul probable'}</td><td class="num">${n}</td></tr>`).join('');
    return `<div class="box"><p class="eyebrow">Tes erreurs sur 30 jours</p><table class="tbl"><tbody>${rows}</tbody></table></div>`;
  }
  function renderProg() {
    const est = estimate(), k = streakNow();
    const chapRows = ready().map(c => {
      const h = S.chaps[c.id] || [], m = chapMastery(c.id), ts = G.typesOf(c.id), ok = ts.filter(t => (S.sr[t] || {}).box >= 4).length;
      return `<tr><td>${c.name}<span class="sub small block">${ok}/${ts.length} notions maîtrisées</span></td><td class="num">${m === null ? '–' : Math.round(m * 100) + ' %'}</td><td class="num">${h.length}</td><td class="num">${h.length ? Math.round(avg(h.slice(-15).map(r => r[1]))) + ' s' : '–'}</td></tr>`;
    }).join('');
    const autoRows = Object.entries(G.AUTO).map(([id, a]) => {
      const st = S.auto[id], b = st ? st.box : -1;
      const lvl = b < 0 ? '<span class="sub">À découvrir</span>' : `<span class="lvl" aria-label="Niveau ${b} sur 5">${'●'.repeat(b)}${'○'.repeat(5 - b)}</span>`;
      return `<tr><td>${a.label}</td><td class="num">${lvl}</td><td class="num">${st ? `${st.ok}/${st.n}` : '–'}</td></tr>`;
    }).join('');
    $('scr-prog').innerHTML = `
      <div><h2 class="t">Progrès</h2></div>
      <div class="box"><div class="est"><span class="v">${est}</span><span class="u">/60</span><span class="l">note estimée en calcul</span></div>${gauge(est)}</div>
      <div class="box"><p class="eyebrow">Évolution</p>${chart()}</div>
      <div class="stat-row">
        <div class="stat"><small>Série</small><b>${k} j</b></div>
        <div class="stat"><small>Record</small><b>${S.streak.best || 0} j</b></div>
        <div class="stat"><small>Questions</small><b>${S.total}</b></div>
      </div>
      <div class="box"><p class="eyebrow">Par chapitre</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Chapitre</th><th class="num">Maîtrise</th><th class="num">Faites</th><th class="num">Temps</th></tr></thead><tbody>${chapRows}</tbody></table></div>
        <p class="sub small">Maîtrise sur les 15 dernières questions : juste en moins de 90 s = 1 point, juste mais lent = 0,6.</p></div>
      <div class="box"><p class="eyebrow">Automatismes</p><table class="tbl"><tbody>${autoRows}</tbody></table></div>
      ${errBox()}
      <p class="sub small center">${plural(Object.keys(S.sr).length, 'notion')} suivie${Object.keys(S.sr).length > 1 ? 's' : ''}, ${dueNotions().length} à réviser aujourd'hui.</p>
      <div class="reset" id="p-reset"><button class="ghost-btn" id="p-reset-ask">Réinitialiser ma progression TAGE MAGE</button></div>`;
    $('p-reset-ask').onclick = () => {
      $('p-reset').innerHTML = '<span>Effacer la note, les statistiques, les révisions et la série ? Le calcul mental n\'est pas touché.</span><button class="ghost-btn danger" id="p-yes">Effacer</button><button class="ghost-btn" id="p-no">Annuler</button>';
      $('p-yes').onclick = () => { try { localStorage.removeItem(KEY); } catch {} location.reload(); };
      $('p-no').onclick = renderProg;
    };
  }

  // ---------- Clavier (ordinateur) ----------
  document.addEventListener('keydown', e => {
    if (AM.view !== 'run' || e.ctrlKey || e.metaKey || e.altKey) return;
    const s = cur(); if (!s) return;
    if (e.key === 'Escape') { quit(); return; }
    const btn = $('r-next') || $('r-go') || $('r-home');
    if (e.key === 'Enter' && btn) { e.preventDefault(); btn.click(); return; }
    if (s.done) return;
    const blk = s.blocks[s.b];
    if (blk.i >= blk.items.length || (blk.intro && !blk.introDone) || blk.answered) return;
    if (blk.id === 'warm') {
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); numKey(e.key); }
      else if (e.key === ',' || e.key === '.') { e.preventDefault(); numKey(','); }
      else if (e.key === 'Backspace') { e.preventDefault(); numKey('del'); }
      else if (e.key === 'Enter') { e.preventDefault(); numKey('ok'); }
      return;
    }
    const k = 'abcde'.indexOf(e.key.toLowerCase()), n = '12345'.indexOf(e.key), i = k >= 0 ? k : n;
    if (i >= 0) { e.preventDefault(); choose(i); }
  });

  document.addEventListener('visibilitychange', () => { if (!document.hidden && AM.view === 'home') renderHome(); });
  migrate(); save();
  go('home');
})();
