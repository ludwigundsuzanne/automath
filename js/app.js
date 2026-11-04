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
  S.prefs = Object.assign({ len: 20 }, S.prefs);
  if (!Array.isArray(S.exams)) S.exams = [];
  S.sprints = Object.assign({ best: 0, hist: [] }, S.sprints);
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
  // nombre de questions par bloc selon la durée choisie (10, 20 ou 30 minutes)
  const LENS = { 10: { warm: 8, rev: 4, notion: 5, defi: 2 }, 20: { warm: 12, rev: 8, notion: 8, defi: 4 }, 30: { warm: 16, rev: 10, notion: 12, defi: 6 } };
  const lens = () => LENS[S.prefs.len] || LENS[20];
  function planBlocks() {
    const l = lens(), due = dueNotions().length, ch = chooseNotion();
    return [{ id: 'warm', title: 'Échauffement', n: l.warm }, ...(due ? [{ id: 'rev', title: 'Révisions', n: Math.min(due, l.rev) }] : []),
      { id: 'notion', title: chapOf(ch).name, chap: ch, n: l.notion }, { id: 'defi', title: 'Défi chrono', n: l.defi }];
  }
  function newDaily(kind) {
    const blocks = planBlocks().map(p => {
      if (p.id === 'warm') return { ...p, items: warmItems(p.n) };
      if (p.id === 'rev') return { ...p, items: dueNotions().slice(0, p.n).map(genFor) };
      if (p.id === 'notion') return { ...p, intro: true, items: series(p.chap, p.n) };
      return { ...p, timed: DEFI_SEC, items: mixed(p.n) };
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
  const nOf = b => (b.items ? b.items.length : b.n);
  const blockDesc = b => ({ warm: `${nOf(b)} calculs au pavé numérique`, rev: `${plural(nOf(b), 'notion')} à revoir aujourd'hui`,
    notion: `${b.title} : fiche, puis ${nOf(b)} questions`, defi: `${nOf(b)} questions mélangées, 80 s chacune`, prac: `${nOf(b)} questions` })[b.id];
  const blockTime = b => `${Math.max(1, Math.round(({ warm: 15, rev: 70, notion: 75, defi: 80 }[b.id] || 60) * nOf(b) / 60 + (b.id === 'notion' ? 1 : 0)))} min`;

  // ---------- Navigation ----------
  window.AM = { view: 'home' };
  const SCREENS = ['home', 'chap', 'mental', 'prog', 'fiche', 'run'];
  let runRef = null;
  const cur = () => S[runRef];
  function go(v, navAs) {
    if (AM.view === 'mental' && v !== 'mental' && window.AMmental) window.AMmental.stop();
    if (AM.view === 'run' && runRef === 'exam' && S.exam && !S.exam.done) { examLeave(S.exam); save(); }
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
    else action = `<button class="go" id="h-go">Commencer la séance du jour<small>Environ ${S.prefs.len} minutes · tu peux t'arrêter à tout moment</small></button>`;
    const lenSel = running ? '' : `<div class="len" role="group" aria-label="Durée de la séance"><span>Durée</span>${[10, 20, 30].map(m => `<button data-len="${m}" aria-pressed="${S.prefs.len === m}">${m} min</button>`).join('')}</div>`;
    const ex = S.exam && !S.exam.done ? S.exam : null, exLeft = ex ? examLeft(ex) : 0, bestExam = S.exams.length ? Math.max(...S.exams.map(x => x.score)) : null;
    const modes = `<div class="box modes"><p class="eyebrow">Mode examen</p>
      <button class="mode" id="h-exam"><b>${ex ? (exLeft > 0 ? 'Reprendre l\'épreuve blanche' : 'Épreuve terminée : voir le résultat') : 'Épreuve blanche'}</b><span>${ex && exLeft > 0 ? `${mmss(exLeft)} restantes` : `15 questions · 20 min · barème officiel${bestExam !== null ? ` · record ${bestExam}/60` : ''}`}</span></button>
      <button class="mode" id="h-sprint"><b>Sprint automatismes</b><span>3 min chrono${S.sprints.best ? ` · record ${S.sprints.best}` : ''}</span></button></div>`;
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
      ${lenSel}
      ${doneToday && !running ? '' : `<ul class="steps" aria-label="Déroulé de la séance">${rows}</ul>`}
      ${prioHtml}
      ${modes}
      ${dueN ? `<p class="sub small center">${plural(dueN, 'notion')} à réviser aujourd'hui</p>` : ''}`;
    $('h-go').onclick = startDaily;
    $('h-exam').onclick = startExam;
    $('h-sprint').onclick = startSprint;
    $('scr-home').querySelectorAll('[data-focus]').forEach(b => { b.onclick = () => startFocus(b.dataset.focus); });
    $('scr-home').querySelectorAll('[data-len]').forEach(b => { b.onclick = () => { S.prefs.len = +b.dataset.len; save(); renderHome(); }; });
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
  function quit() {
    stopClock();
    if (runRef === 'sprint') S.sprint = null; // un sprint interrompu ne compte pas
    go(runRef === 'prac' ? 'chap' : 'home');
  }

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
    if (runRef === 'exam') { renderExam(el); const q = $('r-quit'); if (q) q.onclick = quit; return; }
    if (runRef === 'sprint') { renderSprint(el); const q = $('r-quit'); if (q) q.onclick = quit; return; }
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

  // ---------- Épreuve blanche : 15 questions, 20 minutes, +4 par bonne réponse, 0 sinon ----------
  const EXAM_MS = 20 * 60 * 1000;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mmss = ms => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  const examLeft = e => Math.max(0, e.start + EXAM_MS - Date.now());
  // comme au TAGE MAGE : 5 faciles, 5 moyennes, 5 difficiles, mélangées ; chapitres tirés selon leur poids
  function newExam() {
    const cs = ready(), items = [], used = new Set();
    for (const lv of shuffle([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3])) {
      let t, tries = 0;
      do {
        const c = wpick(cs, cs.map(x => x.w)), ts = G.typesOf(c.id), same = ts.filter(x => G.TYPES[x].lvl === lv);
        t = G.pick(same.length ? same : ts);
      } while (used.has(t) && ++tries < 40);
      used.add(t); items.push(G.gen(t, lv));
    }
    return { start: Date.now(), items, ans: items.map(() => null), times: items.map(() => 0), cur: 0, done: false };
  }
  let examEnter = 0;
  function examLeave(e) { if (examEnter) { e.times[e.cur] += Date.now() - examEnter; examEnter = 0; } }
  function examGo(e, i) { examLeave(e); e.cur = Math.max(0, Math.min(14, i)); save(); renderRun(); window.scrollTo(0, 0); }
  function startExam() { if (!S.exam) { S.exam = newExam(); save(); } runRef = 'exam'; go('run'); }
  function renderExam(el) {
    const e = S.exam;
    if (e.done) { renderExamResult(e, el); return; }
    if (examLeft(e) <= 0) { finishExam(e); return; }
    const q = e.items[e.cur], a = e.ans[e.cur], blank = e.ans.filter(x => x === null).length;
    el.innerHTML = `<div class="run-top"><button class="icon-btn" id="r-quit" aria-label="Quitter l'épreuve (le chrono continue)">${ICON.x}</button>
      <div class="run-title">Épreuve blanche<small>Question ${e.cur + 1} sur 15 · ${blank} sans réponse</small></div><span class="clock" id="r-clock"></span></div>
      <div class="xgrid" id="x-grid">${e.items.map((_, i) => `<button class="${i === e.cur ? 'cur' : ''}${e.ans[i] !== null ? ' done' : ''}" data-q="${i}" aria-label="Question ${i + 1}${e.ans[i] !== null ? ', répondue' : ''}">${i + 1}</button>`).join('')}</div>
      <div class="box"><p class="qtext">${q.text}</p></div>
      <div class="opts" id="r-opts">${q.choices.map((c, i) => `<button class="opt${a === i ? ' sel' : ''}" data-i="${i}" aria-pressed="${a === i}"><span class="l">${LET[i]}</span><span class="v">${c.h}</span></button>`).join('')}</div>
      <div class="xnav">${e.cur ? '<button class="btn2" id="x-prev">Précédente</button>' : '<span></span>'}${e.cur < 14 ? '<button class="btn2" id="x-next">Suivante</button>' : '<span></span>'}</div>
      <div id="x-end"><button class="big-btn" id="x-finish">Terminer l'épreuve</button></div>`;
    examEnter = Date.now();
    $('r-opts').onclick = ev => {
      const b = ev.target.closest('.opt'); if (!b) return;
      e.ans[e.cur] = +b.dataset.i; save();
      el.querySelectorAll('.opt').forEach(o => { o.classList.toggle('sel', o === b); o.setAttribute('aria-pressed', o === b); });
      // on passe à la question suivante sans réponse, comme on le ferait sur papier
      const nextBlank = [...e.ans.keys()].find(i => i > e.cur && e.ans[i] === null);
      advanceTimer = setTimeout(() => examGo(e, nextBlank ?? (e.cur < 14 ? e.cur + 1 : e.cur)), 280);
    };
    $('x-grid').onclick = ev => { const b = ev.target.closest('[data-q]'); if (b) examGo(e, +b.dataset.q); };
    if ($('x-prev')) $('x-prev').onclick = () => examGo(e, e.cur - 1);
    if ($('x-next')) $('x-next').onclick = () => examGo(e, e.cur + 1);
    $('x-finish').onclick = () => {
      const left = e.ans.filter(x => x === null).length;
      if (!left) { finishExam(e); return; }
      $('x-end').innerHTML = `<div class="box confirm"><p>${plural(left, 'question')} sans réponse. Une réponse au hasard ne coûte rien et rapporte en moyenne 0,8 point : réponds avant de terminer.</p>
        <div class="acts"><button class="btn2" id="x-back">Continuer l'épreuve</button><button class="btn1" id="x-ok">Terminer quand même</button></div></div>`;
      $('x-back').onclick = () => examGo(e, e.ans.findIndex(x => x === null));
      $('x-ok').onclick = () => finishExam(e);
    };
    const tick = () => {
      const c = $('r-clock'); if (!c) return;
      const left = examLeft(e); c.textContent = mmss(left); c.classList.toggle('late', left <= 120000);
      if (left <= 0) finishExam(e);
    };
    tick(); clock = setInterval(tick, 500);
  }
  function finishExam(e) {
    if (e.done) return;
    stopClock(); examLeave(e);
    e.done = true; e.used = Math.min(EXAM_MS, Date.now() - e.start);
    let ok = 0;
    e.items.forEach((q, i) => {
      const a = e.ans[i]; if (a === null) return;
      const good = a === q.ans, why = (q.choices[a] || {}).why;
      if (good) ok++;
      recordQ(q, good, e.times[i], good ? null : why ? why[0] : '?');
    });
    e.ok = ok;
    S.exams.push({ d: dayKey(), score: 4 * ok, ok, blank: e.ans.filter(x => x === null).length, used: e.used });
    if (S.exams.length > 60) S.exams.shift();
    S.history[dayKey()] = estimate();
    save(); renderRun(); window.scrollTo(0, 0);
  }
  function renderExamResult(e, el) {
    const score = 4 * e.ok, blank = e.ans.filter(x => x === null).length, best = Math.max(...S.exams.map(x => x.score));
    const slow = e.times.filter(t => t > 120000).length;
    const advice = [
      score >= 36 ? 'Tu es dans ton objectif (36–41).' : `Il te manque ${36 - score} points, soit ${Math.ceil((36 - score) / 4)} bonne${Math.ceil((36 - score) / 4) > 1 ? 's' : ''} réponse${Math.ceil((36 - score) / 4) > 1 ? 's' : ''}, pour atteindre 36.`,
      blank ? `${plural(blank, 'question')} sans réponse : au hasard, tu aurais gagné en moyenne ${nfmt(blank * 0.8)} point${blank * 0.8 >= 2 ? 's' : ''}. Réponds toujours.` : '',
      slow ? `Tu as passé plus de 2 minutes sur ${plural(slow, 'question')}. Au-delà de 80 s, réponds au mieux et passe à la suite.` : '',
    ].filter(Boolean).map(t => `<p>${t}</p>`).join('');
    const rows = e.items.map((q, i) => {
      const a = e.ans[i], st = a === null ? ['blank', '–'] : a === q.ans ? ['ok', '✓'] : ['ko', '✗'], why = a !== null && a !== q.ans ? (q.choices[a] || {}).why : null;
      return `<details class="xrow ${st[0]}"><summary><span class="xn">${i + 1}</span><span class="xc">${G.TYPES[q.type].label}<small>${chapOf(q.chap).name}</small></span><span class="xt">${Math.round(e.times[i] / 1000)} s</span><span class="xs">${st[1]}</span></summary>
        <div class="xbody"><p class="qtext">${q.text}</p>
        <p class="sub">${a === null ? 'Sans réponse' : `Ta réponse : ${LET[a]} (${q.choices[a].h})`} · bonne réponse : ${LET[q.ans]} (${q.choices[q.ans].h})</p>
        ${why ? `<div class="diag"><b>${G.CAUSES[why[0]]}</b><span>${why[1]}</span></div>` : ''}<div class="exs">${q.exp}${tipBox(q.tip)}</div></div></details>`;
    }).join('');
    el.innerHTML = `
      <div class="box center"><p class="eyebrow">Épreuve blanche terminée</p><div class="est big"><span class="v">${score}</span><span class="u">/60</span></div>${gauge(score)}
        ${score >= best && S.exams.length > 1 ? '<span class="badge">Nouveau record</span>' : ''}</div>
      <div class="stat-row">
        <div class="stat"><small>Justes</small><b>${e.ok}/15</b></div>
        <div class="stat"><small>Sans réponse</small><b>${blank}</b></div>
        <div class="stat"><small>Temps</small><b>${mmss(e.used)}</b></div>
      </div>
      <div class="box advice">${advice}</div>
      <p class="eyebrow">Correction · touche une question pour la revoir</p>
      <div class="xlist">${rows}</div>
      <button class="big-btn" id="r-home">Retour à l'accueil</button>`;
    $('r-home').onclick = () => { S.exam = null; save(); go('home'); };
  }
  const nfmt = v => String(Math.round(v * 10) / 10).replace('.', ',');

  // ---------- Sprint automatismes : 3 minutes, un maximum de calculs justes ----------
  const SPRINT_MS = 3 * 60 * 1000;
  let sprintBuf = '', sprintLock = false;
  function startSprint() { S.sprint = { start: Date.now(), items: warmItems(25), i: 0, ok: 0, n: 0, miss: [], done: false }; save(); runRef = 'sprint'; go('run'); }
  function renderSprint(el) {
    const s = S.sprint;
    if (s.done) { renderSprintResult(s, el); return; }
    if (s.start + SPRINT_MS <= Date.now()) { finishSprint(s); return; }
    if (s.i >= s.items.length - 3) s.items.push(...warmItems(20));
    const it = s.items[s.i];
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map(k => k === 'del'
      ? '<button class="k-del" data-k="del" aria-label="Effacer">⌫</button>' : `<button data-k="${k}">${k}</button>`).join('') + '<button class="k-ok wide" data-k="ok">OK</button>';
    el.innerHTML = `<div class="run-top"><button class="icon-btn" id="r-quit" aria-label="Arrêter le sprint">${ICON.x}</button>
      <div class="run-title">Sprint automatismes<small>${plural(s.ok, 'juste')}${S.sprints.best ? ` · record ${S.sprints.best}` : ''}</small></div><span class="clock" id="r-clock"></span></div>
      <div class="pbar timer" id="r-timer"><div></div></div>
      <div class="card" id="sp-card"><div class="wq">${it.text}</div><div class="ans" id="r-ans"></div></div>
      <div class="pad pad-num" id="r-pad">${keys}</div>`;
    sprintBuf = ''; sprintLock = false; t0 = performance.now();
    $('r-pad').onclick = ev => { const b = ev.target.closest('[data-k]'); if (b) sprintKey(b.dataset.k); };
    const tick = () => {
      const c = $('r-clock'); if (!c) return;
      const left = Math.max(0, s.start + SPRINT_MS - Date.now());
      c.textContent = mmss(left); c.classList.toggle('late', left <= 20000);
      const bar = $('r-timer'); if (bar) { bar.firstChild.style.width = `${left / SPRINT_MS * 100}%`; bar.classList.toggle('low', left <= 20000); }
      if (left <= 0) finishSprint(s);
    };
    tick(); clock = setInterval(tick, 250);
  }
  function sprintKey(k) {
    const s = S.sprint; if (!s || s.done || sprintLock) return;
    const it = s.items[s.i];
    if (k === 'del') sprintBuf = sprintBuf.slice(0, -1);
    else if (k === 'ok') { if (sprintBuf) sprintSubmit(s, it); return; }
    else if (k === ',') { if (!sprintBuf || sprintBuf.includes(',')) return; sprintBuf += ','; }
    else if (sprintBuf.length < 7) sprintBuf += k;
    $('r-ans').textContent = sprintBuf;
    if (sprintBuf.length === it.a.length && k !== ',') sprintSubmit(s, it);
  }
  function sprintSubmit(s, it) {
    sprintLock = true;
    const ms = performance.now() - t0, v = sprintBuf.replace(/,$/, ''), ok = v === it.a;
    recordAuto(it.cat, ok, ms);
    s.n++; if (ok) s.ok++; else s.miss.push([it.text, it.a, v]);
    save();
    $('sp-card').classList.add(ok ? 'good' : 'bad');
    if (!ok) $('r-ans').innerHTML = `<s>${v}</s><span class="reveal">${it.a}</span>`;
    advanceTimer = setTimeout(() => { if (AM.view === 'run' && runRef === 'sprint' && !s.done) { s.i++; save(); stopClock(); renderSprint($('scr-run')); } }, ok ? 180 : 1000);
  }
  function finishSprint(s) {
    if (s.done) return;
    stopClock(); s.done = true;
    s.record = s.ok > S.sprints.best;
    if (s.record) S.sprints.best = s.ok;
    S.sprints.hist.push({ d: dayKey(), ok: s.ok, n: s.n }); if (S.sprints.hist.length > 60) S.sprints.hist.shift();
    save(); renderRun();
  }
  function renderSprintResult(s, el) {
    const miss = s.miss.slice(-12).map(([t, a, v]) => `<tr><td>${t}</td><td class="num"><b>${a}</b></td><td class="num sub">${v}</td></tr>`).join('');
    el.innerHTML = `
      <div class="box center"><p class="eyebrow">Sprint terminé</p><div class="est big"><span class="v">${s.ok}</span><span class="u">justes en 3 min</span></div>
        ${s.record && s.ok ? '<span class="badge">Nouveau record</span>' : `<p class="sub">Record : ${S.sprints.best}</p>`}</div>
      <div class="stat-row"><div class="stat"><small>Précision</small><b>${s.n ? Math.round(100 * s.ok / s.n) : 0} %</b></div><div class="stat"><small>Rythme</small><b>${s.n ? nfmt(180 / s.n) : '–'} s</b></div></div>
      ${miss ? `<div class="box"><p class="eyebrow">À retenir</p><table class="tbl"><thead><tr><th>Calcul</th><th class="num">Réponse</th><th class="num">Toi</th></tr></thead><tbody>${miss}</tbody></table></div>` : ''}
      <button class="big-btn" id="sp-again">Rejouer</button>
      <button class="ghost-btn wide-btn" id="r-home">Retour à l'accueil</button>`;
    $('sp-again').onclick = startSprint;
    $('r-home').onclick = () => { S.sprint = null; save(); go('home'); };
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
  function recordsBox() {
    const ex = S.exams, best = ex.length ? Math.max(...ex.map(x => x.score)) : null;
    const hist = ex.slice(-5).reverse().map(x => `<tr><td>${x.d.slice(8)}/${x.d.slice(5, 7)}</td><td class="num"><b>${x.score}</b>/60</td><td class="num sub">${x.ok}/15 justes</td></tr>`).join('');
    return `<div class="box"><p class="eyebrow">Records</p><div class="stat-row">
        <div class="stat"><small>Épreuve blanche</small><b>${best === null ? '–' : best + '/60'}</b></div>
        <div class="stat"><small>Sprint</small><b>${S.sprints.best || '–'}</b></div>
        <div class="stat"><small>Série</small><b>${S.streak.best || 0} j</b></div></div>
      ${hist ? `<p class="sub small" style="margin-top:10px">Dernières épreuves blanches</p><table class="tbl"><tbody>${hist}</tbody></table>` : '<p class="sub small" style="margin-top:8px">Fais une épreuve blanche depuis l\'accueil pour mesurer ta note en conditions réelles.</p>'}</div>`;
  }
  // notions à retravailler : vues mais fragiles, triées par erreurs récentes
  function weakBox() {
    const list = Object.entries(S.sr).filter(([t, s]) => G.TYPES[t] && s.box <= 1)
      .map(([t, s]) => ({ t, err: recentErrors(t, 5), m: typeMastery(t) ?? 0 })).sort((a, b) => b.err - a.err || a.m - b.m).slice(0, 8);
    if (!list.length) return '';
    return `<div class="box"><p class="eyebrow">À retravailler</p>${list.map(x => `<div class="prio-row"><div class="prio-t"><b>${G.TYPES[x.t].label}</b><span>${chapOf(G.TYPES[x.t].chap).name} · ${x.err ? `${plural(x.err, 'erreur')} sur les 5 dernières` : `maîtrise ${Math.round(x.m * 100)} %`}</span></div><button class="btn2 prio-go" data-focus="${x.t}">Travailler</button></div>`).join('')}</div>`;
  }
  // détail par notion, replié par chapitre
  function notionsBox() {
    const groups = ready().map(c => {
      const rows = G.typesOf(c.id).map(t => {
        const h = S.stats[t] || [], s = S.sr[t], [k, l] = NOTION_STATUS(s ? s.box : undefined), last = h.slice(-10);
        return `<tr><td>${G.TYPES[t].label}</td><td class="num"><span class="pill ${k}">${l}</span></td><td class="num">${last.length ? Math.round(100 * last.filter(r => r[0]).length / last.length) + ' %' : '–'}</td><td class="num">${last.length ? Math.round(avg(last.map(r => r[1]))) + ' s' : '–'}</td></tr>`;
      }).join('');
      const ts = G.typesOf(c.id), ok = ts.filter(t => (S.sr[t] || {}).box >= 4).length;
      return `<details class="ngroup"><summary><span>${c.name}</span><span class="sub small">${ok}/${ts.length} maîtrisées</span></summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Notion</th><th class="num">Statut</th><th class="num">Réussite</th><th class="num">Temps</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
    }).join('');
    return `<div class="box"><p class="eyebrow">Notions par chapitre</p>${groups}<p class="sub small">Réussite et temps sur les 10 dernières questions de chaque notion.</p></div>`;
  }
  function tipsBox() {
    const ok = G.TIPS.filter(t => tipStatus(t)[0] === 'good').length;
    return `<div class="box"><p class="eyebrow">Astuces</p><p>${ok} maîtrisée${ok > 1 ? 's' : ''} sur ${G.TIPS.length}</p><button class="btn2 wide-btn" id="p-tips" style="margin-top:8px">Voir la bibliothèque d'astuces</button></div>`;
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
      ${recordsBox()}
      ${weakBox()}
      ${notionsBox()}
      <div class="box"><p class="eyebrow">Automatismes</p><table class="tbl"><tbody>${autoRows}</tbody></table></div>
      ${errBox()}
      ${tipsBox()}
      <p class="sub small center">${plural(Object.keys(S.sr).length, 'notion')} suivie${Object.keys(S.sr).length > 1 ? 's' : ''}, ${dueNotions().length} à réviser aujourd'hui.</p>
      <div class="reset" id="p-reset"><button class="ghost-btn" id="p-reset-ask">Réinitialiser ma progression TAGE MAGE</button></div>`;
    $('scr-prog').querySelectorAll('[data-focus]').forEach(b => { b.onclick = () => startFocus(b.dataset.focus); });
    const tl = $('p-tips'); if (tl) tl.onclick = () => { chapTab = 'tips'; go('chap'); };
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
    if (runRef === 'sprint' && !s.done) {
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); sprintKey(e.key); }
      else if (e.key === ',' || e.key === '.') { e.preventDefault(); sprintKey(','); }
      else if (e.key === 'Backspace') { e.preventDefault(); sprintKey('del'); }
      else if (e.key === 'Enter') { e.preventDefault(); sprintKey('ok'); }
      return;
    }
    if (runRef === 'exam' && !s.done) {
      const k = 'abcde'.indexOf(e.key.toLowerCase()); if (k >= 0) { e.preventDefault(); const o = document.querySelectorAll('#r-opts .opt')[k]; if (o) o.click(); }
      else if (e.key === 'ArrowRight') examGo(s, s.cur + 1); else if (e.key === 'ArrowLeft') examGo(s, s.cur - 1);
      return;
    }
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
