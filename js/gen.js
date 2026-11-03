// Générateurs de questions TAGE MAGE (calcul) : chapitres, QCM à 5 réponses, automatismes, astuces et fiches méthode.
// Chaque question est générée avec de nouveaux nombres. Les mauvaises réponses imitent des erreurs précises et
// portent leur cause (why), ce qui permet de diagnostiquer l'erreur commise. Les corrections suivent toujours le
// même format : méthode rapide, piège, méthode classique (si elle diffère), astuce associée.
(function (root) {
  'use strict';

  // ---------- Outils ----------
  const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const lcm = (a, b) => a / gcd(a, b) * b;
  // prénoms sans voyelle initiale, pour éviter « de Andréa »
  const NAMES = ['Sam', 'Camille', 'Charlie', 'Noa', 'Lou', 'Maxime', 'Sacha', 'Robin', 'Jordan', 'Léo', 'Margot', 'Tom'];
  const two = () => { const a = pick(NAMES); let b; do b = pick(NAMES); while (b === a); return [a, b]; };

  // Nombre à la française : virgule, espace fine pour les milliers, signe moins typographique
  function nf(v, dp = 2) {
    const r = Math.round(v * 10 ** dp) / 10 ** dp;
    let [i, d] = Math.abs(r).toFixed(dp).split('.');
    d = (d || '').replace(/0+$/, '');
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (r < 0 ? '−' : '') + i + (d ? ',' + d : '');
  }
  const pf = v => (v > 0 ? '+' : '') + nf(v) + ' %';
  const pc = v => nf(v) + ' %';
  const eur = v => nf(v) + ' €';
  const kmh = v => nf(v) + ' km/h';
  const pad = n => String(n).padStart(2, '0');
  // durée en minutes → « 45 min », « 2 h », « 1 h 05 » ; heure de la journée en minutes → « 11 h 24 »
  const dur = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ' ' + pad(r) : ''}` : `${r} min`; };
  const hm = m => { m = Math.round(m); return `${Math.floor(m / 60)} h ${pad(m % 60)}`; };
  const jours = v => nf(v, 1) + ' jours';
  const ans_ = v => nf(v, 1) + ' ans';

  // Fraction affichée en hauteur ; réduite par défaut
  function fr(n, d, reduce = true) {
    if (reduce) { const g = gcd(n, d); n /= g; d /= g; }
    if (d === 1) return String(n);
    return `<span class="fr"><span>${n}</span><span>${d}</span></span>`;
  }
  const red = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };

  // Causes d'erreur
  const CAUSES = {
    calc: 'Erreur de calcul', formule: 'Mauvaise formule', enonce: 'Énoncé mal lu',
    methode: 'Mauvaise méthode', conv: 'Erreur de conversion', inatt: 'Inattention',
  };

  // Correction structurée : r = méthode rapide, p = piège, c = méthode classique (facultative)
  const E = ({ r, p, c }) => `<div class="exb fast"><span class="exl">Méthode rapide</span>${r}</div>`
    + (p ? `<div class="exb trap"><span class="exl">Piège</span>${p}</div>` : '')
    + (c ? `<div class="exb classic"><span class="exl">Méthode classique</span>${c}</div>` : '');

  // Les mauvaises réponses : un nombre, ou [valeur, cause, explication de l'erreur]
  const D = d => (Array.isArray(d) ? { v: d[0], why: [d[1], d[2]] } : { v: d, why: null });

  // QCM numérique : réponses triées dans l'ordre croissant (comme au TAGE MAGE, utile pour le backsolving)
  function numQ(meta, ans, ds, o = {}) {
    const step = o.step || 1, min = o.min ?? -Infinity, fmt = o.fmt || (v => nf(v)), dp = o.dp ?? 2;
    const key = v => nf(v, dp);
    const vals = [{ v: ans, why: null }], seen = new Set([key(ans)]);
    const add = x => {
      if (vals.length >= 5 || !Number.isFinite(x.v)) return;
      const v = Math.round(x.v * 10 ** dp) / 10 ** dp;
      if (v < min || seen.has(key(v))) return;
      seen.add(key(v)); vals.push({ v, why: x.why });
    };
    ds.map(D).forEach(add);
    for (let k = 1; vals.length < 5 && k < 60; k++) { add({ v: ans + k * step, why: null }); add({ v: ans - k * step, why: null }); }
    vals.sort((a, b) => a.v - b.v);
    const ak = key(ans);
    return { ...meta, choices: vals.map(x => ({ k: key(x.v), h: fmt(x.v), ...(x.why ? { why: x.why } : {}) })), ans: vals.findIndex(x => key(x.v) === ak) };
  }

  // QCM de fractions : dédoublonnées par valeur, triées
  function fracQ(meta, ans, ds, fill) {
    const k = f => red(f[0], f[1]).join('/');
    const vals = [{ f: red(...ans), why: null }], seen = new Set([k(ans)]);
    const add = x => {
      const f = x.v;
      if (vals.length >= 5 || !f || f[1] <= 0 || f[0] <= 0) return;
      const r = red(f[0], f[1]); if (seen.has(k(r))) return;
      seen.add(k(r)); vals.push({ f: r, why: x.why });
    };
    ds.map(d => (d.length === 3 && Array.isArray(d[0]) ? { v: d[0], why: [d[1], d[2]] } : { v: d, why: null })).forEach(add);
    for (let i = 1; vals.length < 5 && i < 40; i++) fill(i).forEach(f => add({ v: f, why: null }));
    vals.sort((a, b) => a.f[0] / a.f[1] - b.f[0] / b.f[1]);
    const ak = k(ans);
    return { ...meta, choices: vals.map(x => ({ k: k(x.f), h: fr(x.f[0], x.f[1]), ...(x.why ? { why: x.why } : {}) })), ans: vals.findIndex(x => k(x.f) === ak) };
  }

  const pctDecomp = (N, p) => {
    const a = N * p / 100;
    const special = { 12.5: `12,5 % = ${fr(1, 8)} : ${N} ÷ 8 = ${nf(a)}.`, 25: `25 % = ${fr(1, 4)} : ${N} ÷ 4 = ${nf(a)}.`, 50: `50 % = la moitié : ${nf(a)}.`,
      75: `75 % = ${fr(3, 4)} : ${N} ÷ 4 × 3 = ${nf(a)}.`, 120: `120 % = 100 % + 20 % : ${N} + ${nf(N / 5)} = ${nf(a)}.`, 150: `150 % = 100 % + 50 % : ${N} + ${nf(N / 2)} = ${nf(a)}.`,
      2.5: `10 % = ${nf(N / 10)}, 2,5 % = un quart de 10 % : ${nf(a)}.` };
    if (special[p]) return special[p];
    const t = N / 10, tens = Math.floor(p / 10), five = p % 10 === 5;
    if (!tens) return `10 % de ${N} = ${nf(t)}, donc 5 % = la moitié : ${nf(a)}.`;
    return `10 % de ${N} = ${nf(t)}. ${p} % = ${tens} × 10 %${five ? ' + 5 %' : ''} : ${tens} × ${nf(t)}${five ? ` + ${nf(t / 2)}` : ''} = ${nf(a)}.`;
  };

  // ---------- Générateurs ----------
  // def(id, chapitre, niveau intrinsèque 1-3, libellé, astuce principale, f(d)) ; d = difficulté demandée 1-3
  const T = {};
  const def = (id, chap, lvl, label, tip, f) => { T[id] = { id, chap, lvl, label, tip, f }; };

  // ===== Pourcentages et base 100 =====
  def('pct.of', 'pct', 1, 'Pourcentage d\'un nombre', 'pct10', d => {
    const p = pick(d === 1 ? [5, 10, 20, 25, 50] : d === 2 ? [12.5, 15, 30, 35, 40, 45, 60, 75] : [2.5, 12.5, 35, 45, 120, 150]);
    let N; do N = int(2, 40) * 10; while (!Number.isInteger(N * p / 100));
    const a = N * p / 100;
    return numQ({ text: `Combien font ${nf(p)} % de ${N} ?`, tip: [12.5, 25, 75].includes(p) ? 'fracpct' : 'pct10',
      exp: E({ r: `<p>${pctDecomp(N, p)}</p>`, p: `<p>Vérifie l'ordre de grandeur : ${nf(p)} % de ${N}, c'est ${p < 50 ? 'moins' : 'plus'} que la moitié (${N / 2}). Une erreur de virgule donne un résultat 10 fois trop petit ou trop grand.</p>`,
        c: `<p>${N} × ${nf(p)} ÷ 100 = ${nf(a)}.</p>` }) },
    a, [[N * p / 1000, 'calc', 'Erreur de virgule : tu as divisé par 1 000 au lieu de 100.'], [N - a, 'enonce', `C'est ce qui reste (${nf(100 - p)} %), pas ${nf(p)} %.`],
      [2 * a, 'calc', 'Tu as doublé le résultat.'], [N * (p - 5) / 100, 'calc', 'Décomposition incomplète : il manque 5 %.']], { step: Math.max(1, N / 20), min: 0 });
  });

  def('pct.succ', 'pct', 2, 'Hausses et baisses successives', 'coef', d => {
    const P = [10, 20, 25, 30, 40, 50];
    let steps;
    if (d === 1) { const a = pick(P); steps = shuffle([a, -a]); }
    else if (d === 2) { steps = [pick(P) * (Math.random() < 0.5 ? 1 : -1), pick(P) * (Math.random() < 0.5 ? 1 : -1)]; }
    else { steps = [pick(P), -pick(P), pick([10, 20, 50])]; shuffle(steps); }
    const cs = steps.map(s => 1 + s / 100), c = cs.reduce((x, y) => x * y, 1), v = Math.round((c - 1) * 10000) / 100;
    const naive = steps.reduce((x, y) => x + y, 0);
    const words = steps.map((s, i) => `${i === 0 ? '' : i === steps.length - 1 ? ', puis ' : ', puis '}${s > 0 ? 'augmente' : 'baisse'} de ${Math.abs(s)} %`).join('');
    const same = steps.length === 2 && steps[0] === -steps[1];
    return numQ({ text: `Un prix ${words}. Quelle est la variation totale ?`, tip: 'coef',
      exp: E({ r: same ? `<p>Hausse et baisse du même pourcentage t : on perd toujours t²/100. Ici ${Math.abs(steps[0])}² ÷ 100 = ${nf(Math.abs(v))}, soit ${pf(v)}.</p>`
        : `<p>On multiplie les coefficients : ${cs.map(x => nf(x)).join(' × ')} = ${nf(c, 4)}, soit ${pf(v)}.</p>`,
      p: '<p>On n\'additionne jamais des pourcentages successifs : chaque variation s\'applique au nouveau prix. +20 % puis −20 % ne fait pas 0 %, mais −4 %.</p>',
      c: same ? `<p>${cs.map(x => nf(x)).join(' × ')} = ${nf(c, 4)}, soit ${pf(v)}.</p>` : '' }) },
    v, [[naive, 'formule', 'Tu as additionné les pourcentages. Les variations successives se multiplient.'],
      ...(v !== 0 ? [[-v, 'calc', 'Bon calcul, mauvais sens : un coefficient au-dessus de 1 est une hausse, en dessous une baisse.']] : []),
      [2 * naive - v, 'calc', 'Erreur de signe sur le terme croisé.']], { step: 2, fmt: pf });
  });

  def('pct.var', 'pct', 1, 'Variation en pourcentage', 'pct10', () => {
    const p = pick([-50, -40, -25, -20, -10, 10, 20, 25, 40, 50, 60, 75]);
    let X; do X = int(2, 30) * 10; while (!Number.isInteger(X * (1 + p / 100)));
    const Y = X * (1 + p / 100);
    return numQ({ text: `Un article passe de ${eur(X)} à ${eur(Y)}. Quelle est la variation en pourcentage ?`,
      exp: E({ r: `<p>Écart ÷ départ : ${nf(Y - X)} ÷ ${X} = ${pf(p)}.</p>`, p: `<p>On divise toujours par la valeur de départ (${X}), pas par celle d'arrivée.</p>` }) },
    p, [[Math.round((Y - X) / Y * 1000) / 10, 'formule', 'Tu as divisé par la valeur d\'arrivée. On divise par la valeur de départ.'],
      [-p, 'calc', `Sens inversé : de ${X} à ${Y}, c'est une ${p > 0 ? 'hausse' : 'baisse'}.`], [Y - X, 'methode', 'Tu as donné l\'écart en euros, pas en pourcentage.']], { step: 5, fmt: pf, dp: 1 });
  });

  def('pct.rev', 'pct', 2, 'Retrouver la valeur de départ', 'pctrev', () => {
    const p = pick([10, 20, 25, 50]), up = Math.random() < 0.6, s = up ? p : -p;
    let X; do X = int(2, 30) * 20; while (!Number.isInteger(X * (1 + s / 100)));
    const c = 1 + s / 100, Y = X * c, naive = Y * (1 - s / 100);
    const text = up ? `Après une hausse de ${p} %, un vélo coûte ${eur(Y)}. Quel était son prix avant la hausse ?`
      : `Après une remise de ${p} %, un manteau coûte ${eur(Y)}. Quel était son prix avant la remise ?`;
    return numQ({ text,
      exp: E({ r: `<p>Prix de départ = ${Y} ÷ ${nf(c)} = ${eur(X)}. Ou teste les réponses : ${X} × ${nf(c)} = ${Y} ✓.</p>`,
        p: `<p>${up ? 'Retirer' : 'Ajouter'} ${p} % à ${Y} donne ${eur(naive)} : faux, car le pourcentage porte sur le prix de départ, pas sur ${Y}.</p>` }) },
    X, [[naive, 'formule', `Tu as ${up ? 'retiré' : 'ajouté'} ${p} % au prix final. Il faut diviser par ${nf(c)}.`],
      [up ? Y - p : Y + p, 'methode', `Tu as ${up ? 'retiré' : 'ajouté'} ${p} euros au lieu de ${p} %.`]], { step: X >= 200 ? 20 : 10, fmt: eur, min: 1 });
  });

  def('pct.ca', 'pct', 3, 'Base 100 : chiffre d\'affaires', 'base100', () => {
    let pp, k, cv;
    do { pp = pick([-20, -10, 10, 20, 25]); k = pick([-20, -10, 10, 20, 30, 50]); cv = Math.round(((1 + pp / 100) * (1 + k / 100) - 1) * 1000) / 10; } while (cv === 0 || Math.abs(cv - ((1 + pp / 100) * (1 + k / 100) - 1) * 100) > 1e-6);
    const ca = 10000 * (1 + cv / 100);
    return numQ({ text: `Le prix d'un ticket ${pp < 0 ? 'baisse' : 'augmente'} de ${Math.abs(pp)} %. Le chiffre d'affaires ${cv < 0 ? 'baisse' : 'augmente'} de ${nf(Math.abs(cv))} %. Comment a varié le nombre de clients ?`,
      exp: E({ r: `<p>Chiffre d'affaires = clients × prix, donc coefficient des clients = ${nf(1 + cv / 100, 3)} ÷ ${nf(1 + pp / 100)} = ${nf(1 + k / 100)}, soit ${pf(k)}.</p>`,
        p: '<p>On ne soustrait pas les pourcentages : les coefficients se divisent.</p>',
        c: `<p>Base 100 : 100 clients à 100 € = 10 000 €. Après : prix ${100 + pp} €, chiffre d'affaires ${eur(ca)}. Clients = ${nf(ca)} ÷ ${100 + pp} = ${100 + k}.</p>` }) },
    k, [[cv - pp, 'formule', 'Tu as soustrait les pourcentages. Avec CA = clients × prix, les coefficients se divisent.'],
      [cv + pp, 'formule', 'Tu as additionné les pourcentages. Les coefficients se divisent.'], [-k, 'calc', 'Bon calcul, mauvais sens.']], { step: 5, fmt: pf, dp: 1 });
  });

  def('pct.share', 'pct', 2, 'Partage en pourcentages', 'base100', () => {
    let p, k, C; do { p = pick([10, 20, 25, 40, 50, 55, 70]); k = int(1, 4); C = (100 - p) / (k + 1); } while (!Number.isInteger(C));
    return numQ({ text: `Trois amis se partagent une somme. Alice en reçoit ${p} %. Bruno reçoit ${k === 1 ? 'autant que' : k + ' fois plus que'} Chloé. Quel pourcentage de la somme reçoit Chloé ?`,
      exp: E({ r: `<p>Il reste 100 − ${p} = ${100 - p} % pour Bruno et Chloé, soit ${k + 1} parts égales : ${100 - p} ÷ ${k + 1} = ${C} %.</p>`,
        p: `<p>« ${k} fois plus que Chloé » : Bruno a ${k} parts, Chloé 1, donc ${k + 1} parts en tout.</p>` }) },
    C, [[(100 - p) / k, 'enonce', `Tu as divisé par ${k} : il y a ${k + 1} parts en comptant celle de Chloé.`], [k * C, 'enonce', 'C\'est la part de Bruno.'],
      [p / (k + 1), 'methode', 'Tu as partagé la part d\'Alice au lieu du reste.'], [100 - p, 'enonce', 'C\'est la part de Bruno et Chloé ensemble.']], { step: 5, min: 1, fmt: pc });
  });

  // ===== Fractions =====
  def('frac.add', 'frac', 1, 'Additionner des fractions', 'fracadd', d => {
    let a, b, c, dd, minus;
    do {
      b = int(2, 9); dd = d === 1 ? b * pick([2, 3]) : int(2, 9);
      a = int(1, b - 1); c = int(1, dd - 1); minus = d === 3 || (d === 2 && Math.random() < 0.4);
    } while (b === dd || dd > 18 || (minus && a / b <= c / dd));
    const L = lcm(b, dd), n = a * L / b + (minus ? -1 : 1) * c * L / dd, sg = minus ? '−' : '+';
    const top = minus ? a - c : a + c;
    return fracQ({ text: `Combien font ${fr(a, b)} ${sg} ${fr(c, dd)} ?`, tip: 'fracadd',
      exp: E({ r: `<p>Plus petit dénominateur commun : ${L}. ${fr(a, b)} = ${fr(a * L / b, L, false)} et ${fr(c, dd)} = ${fr(c * L / dd, L, false)}, donc ${fr(n, L, false)}${gcd(n, L) > 1 ? ' = ' + fr(n, L) : ''}.</p>`,
        p: '<p>On n\'additionne jamais les dénominateurs, et on pense à simplifier le résultat.</p>' }) },
    [n, L], [[[top, b + dd], 'formule', 'Tu as additionné les dénominateurs : on ne le fait jamais.'], [[a * c, b * dd], 'methode', 'Tu as multiplié les fractions au lieu de les additionner.'],
      [[top, b * dd], 'calc', 'Bon dénominateur commun, mais les numérateurs n\'ont pas été convertis.']], i => [[n + i, L], [n - i, L]]);
  });

  def('frac.mul', 'frac', 1, 'Multiplier et diviser', 'divinv', () => {
    const a = int(1, 9), b = int(2, 9), c = int(1, 9), d = int(2, 9);
    if (Math.random() < 0.5) {
      return fracQ({ text: `Combien font ${fr(a, b)} ÷ ${fr(c, d)} ?`, tip: 'divinv',
        exp: E({ r: `<p>Diviser par ${fr(c, d)}, c'est multiplier par son inverse ${fr(d, c, false)} : ${fr(a, b)} × ${fr(d, c, false)} = ${fr(a * d, b * c, false)}${gcd(a * d, b * c) > 1 ? ' = ' + fr(a * d, b * c) : ''}.</p>`,
          p: '<p>C\'est le diviseur (la 2e fraction) qu\'on inverse, pas la première.</p>' }) },
      [a * d, b * c], [[[a * c, b * d], 'methode', 'Tu as multiplié au lieu de diviser.'], [[b * c, a * d], 'formule', 'Tu as inversé la mauvaise fraction : c\'est le diviseur qu\'on inverse.']], i => [[a * d + i, b * c], [a * d, b * c + i]]);
    }
    return fracQ({ text: `Combien font ${fr(a, b)} × ${fr(c, d)} ?`, tip: 'simplify',
      exp: E({ r: `<p>Haut × haut, bas × bas, en simplifiant d'abord en croix si possible : ${fr(a * c, b * d, false)}${gcd(a * c, b * d) > 1 ? ' = ' + fr(a * c, b * d) : ''}.</p>`,
        p: '<p>Pas de dénominateur commun pour multiplier : c\'est seulement pour additionner.</p>' }) },
    [a * c, b * d], [[[a * d, b * c], 'methode', 'Tu as divisé au lieu de multiplier.'], [[a + c, b + d], 'formule', 'Tu as additionné en haut et en bas : on multiplie.']], i => [[a * c + i, b * d], [a * c, b * d + i]]);
  });

  def('frac.of', 'frac', 1, 'Fraction d\'un nombre', 'fracof', () => {
    const b = pick([3, 4, 5, 6, 8, 10, 12]); let a; do a = int(1, b - 1); while (gcd(a, b) > 1);
    const N = b * int(3, 15), ans = N / b * a;
    return numQ({ text: `Combien font les ${fr(a, b)} de ${N} ?`,
      exp: E({ r: `<p>Divise d'abord, multiplie ensuite : ${N} ÷ ${b} = ${N / b}, puis × ${a} = ${ans}.</p>`, p: '<p>Commencer par multiplier donne de grands nombres et des erreurs.</p>' }) },
    ans, [[N / b, 'enonce', `Tu t'es arrêté à 1/${b} : il faut encore multiplier par ${a}.`], [N - ans, 'enonce', 'C\'est ce qui reste, pas la fraction demandée.'],
      [ans + N / b, 'calc', 'Une part de trop.']], { step: N / b, min: 1 });
  });

  def('frac.cmp', 'frac', 2, 'Comparer des fractions', 'fraccmp', () => {
    const fs = [], seen = new Set();
    while (fs.length < 5) {
      const b = int(3, 13), a = int(Math.ceil(b * 0.45), Math.floor(b * 0.92));
      if (a < 1 || a >= b) continue;
      const [n, d] = red(a, b), v = (n / d).toFixed(6);
      if (seen.has(v)) continue; seen.add(v); fs.push([n, d]);
    }
    shuffle(fs);
    const vals = fs.map(f => f[0] / f[1]), ans = vals.indexOf(Math.max(...vals));
    const maxNum = Math.max(...fs.map(f => f[0])), maxDen = Math.max(...fs.map(f => f[1]));
    const sorted = fs.slice().sort((x, y) => y[0] / y[1] - x[0] / x[1]);
    return { text: 'Quelle est la plus grande de ces fractions ?', tip: 'fraccmp', ans,
      choices: fs.map((f, i) => ({ k: f.join('/'), h: fr(f[0], f[1]),
        ...(i !== ans && f[0] === maxNum ? { why: ['methode', 'Le plus grand numérateur ne suffit pas : il faut comparer les valeurs.'] }
          : i !== ans && f[1] === maxDen ? { why: ['methode', 'Le plus grand dénominateur donne souvent une fraction plus petite, pas plus grande.'] } : {}) })),
      exp: E({ r: `<p>Regarde ce qui manque pour arriver à 1, ou passe en décimal : ${sorted.map(f => `${fr(f[0], f[1])} ≈ ${nf(f[0] / f[1])}`).join(' ; ')}.</p>`,
        p: '<p>Ne compare ni les numérateurs seuls ni les dénominateurs seuls.</p>', c: '<p>Produit en croix deux à deux : a/b > c/d si a × d > c × b.</p>' }) };
  });

  def('frac.tank', 'frac', 2, 'Parts d\'un tout', 'fracof', () => {
    const b = pick([4, 5, 6, 8, 10]), a = int(1, b - 2), c = int(a + 1, b - 1), C = b * int(2, 12), k = (c - a) * C / b;
    return numQ({ text: `Une cuve est remplie aux ${fr(a, b)}. On ajoute ${k} L : elle est maintenant remplie aux ${fr(c, b)}. Quelle est sa capacité ?`,
      exp: E({ r: `<p>Les ${k} L correspondent à ${fr(c - a, b, false)} de la cuve. Une part de ${fr(1, b)} vaut ${k} ÷ ${c - a} = ${nf(k / (c - a))} L, donc la cuve fait ${b} × ${nf(k / (c - a))} = ${C} L.</p>`,
        p: `<p>Les ${k} L ne représentent ni ${fr(c, b)} ni ${fr(a, b)} : seulement la différence.</p>` }) },
    C, [[k * b / c, 'enonce', `Tu as pris les ${k} L pour ${fr(c, b)} de la cuve : c'est la différence ${fr(c - a, b, false)}.`], [k * b / a, 'enonce', 'Tu as associé les litres ajoutés à la mauvaise fraction.'],
      [k * (c - a), 'formule', 'Tu as multiplié au lieu de diviser par la fraction.']], { step: b, min: 1, fmt: v => nf(v) + ' L' });
  });

  def('frac.rest', 'frac', 3, 'Fractions du reste', 'remain', () => {
    const p = pick([2, 3, 4, 5]), q = pick([2, 3, 4, 5, 6]), S = p * q * int(2, 10) * 10;
    const R = S * (p - 1) / p * (q - 1) / q, f = red((p - 1) * (q - 1), p * q);
    const [nm] = two();
    return numQ({ text: `${nm} dépense ${fr(1, p)} de son salaire pour le loyer, puis ${fr(1, q)} de ce qui reste pour les courses. Il reste ${eur(R)}. Quel est le salaire ?`,
      exp: E({ r: `<p>Il reste ${fr(p - 1, p)} × ${fr(q - 1, q)} = ${fr(f[0], f[1])} du salaire. Salaire = ${nf(R)} × ${f[1]} ÷ ${f[0]} = ${eur(S)}.</p>`,
        p: `<p>« ${fr(1, q)} de ce qui reste » porte sur le reste, pas sur le salaire : on multiplie les parts restantes, on ne soustrait pas ${fr(1, p)} + ${fr(1, q)}.</p>` }) },
    S, [[R / (1 - 1 / p - 1 / q), 'enonce', `Tu as pris ${fr(1, q)} du salaire au lieu de ${fr(1, q)} du reste.`], [R * p / (p - 1), 'methode', 'Tu as oublié la dépense des courses.'],
      [R * q / (q - 1), 'methode', 'Tu as oublié le loyer.']], { step: S / 10, min: 1, fmt: eur });
  });

  // ===== Équations et systèmes =====
  def('eq.sumdiff', 'eq', 1, 'Somme et différence', 'sumdiff', d => {
    const s = d === 1 ? int(5, 30) : int(15, 200), g = s + (d === 1 ? int(2, 20) : int(5, 120)), S = g + s, Dd = g - s, big = Math.random() < 0.5;
    return numQ({ text: `La somme de deux nombres vaut ${S} et leur différence vaut ${Dd}. Quel est le plus ${big ? 'grand' : 'petit'} ?`,
      exp: E({ r: `<p>Plus grand = (S + D) ÷ 2 = (${S} + ${Dd}) ÷ 2 = ${g}. Plus petit = (S − D) ÷ 2 = ${s}.</p>`, p: '<p>Relis la question : on demande le plus grand ou le plus petit ? Et n\'oublie pas de diviser par 2.</p>',
        c: `<p>x + y = ${S} et x − y = ${Dd} : en additionnant, 2x = ${S + Dd}.</p>` }) },
    big ? g : s, [[S / 2, 'methode', 'La moitié de la somme est la moyenne des deux nombres, pas l\'un d\'eux.'], [big ? s : g, 'enonce', `C'est le plus ${big ? 'petit' : 'grand'} : relis la question.`],
      [Dd, 'enonce', 'C\'est la différence.'], [big ? S + Dd : S - Dd, 'calc', 'Tu as oublié de diviser par 2.']], { min: 1 });
  });

  def('eq.prodiff', 'eq', 1, 'Produit et différence', 'backsolve', () => {
    const a = int(3, 13), d = int(2, 9), b = a + d, P = a * b, small = Math.random() < 0.6;
    return numQ({ text: `Le produit de deux nombres entiers positifs vaut ${P} et leur différence vaut ${d}. Quel est le plus ${small ? 'petit' : 'grand'} ?`,
      exp: E({ r: `<p>Teste les réponses : ${a} × ${b} = ${P} et ${b} − ${a} = ${d} ✓. Le plus petit vaut ${a}, le plus grand ${b}.</p>`, p: '<p>Ne te lance pas dans une équation du second degré : le test des réponses prend 10 secondes.</p>' }) },
    small ? a : b, [[small ? b : a, 'enonce', 'C\'est l\'autre nombre : relis la question.'], [d, 'enonce', 'C\'est la différence.']], { min: 1 });
  });

  def('eq.ages', 'eq', 2, 'Âges dans le futur', 'agegap', () => {
    const k = int(4, 12), m = int(3, 6), M = k * m;
    const goals = [50, 60, 70, 80, 90, 100].filter(t => t > M + 3); const Tg = pick(goals);
    const ans = k + Tg - M, [nm] = two();
    return numQ({ text: `${nm} a ${k} ans. Sa mère a ${m} fois son âge. Quel âge aura ${nm} quand sa mère aura ${Tg} ans ?`,
      exp: E({ r: `<p>Sa mère a ${M} ans. Elle aura ${Tg} ans dans ${Tg - M} ans, et ${nm} aura alors ${k} + ${Tg - M} = ${ans} ans.</p>`, p: `<p>${Tg} ÷ ${m} ne marche pas : le rapport des âges change avec le temps, seul l'écart (${M - k} ans) reste fixe.</p>` }) },
    ans, [[Math.round(Tg / m), 'methode', 'Le rapport des âges change avec le temps : seul l\'écart est constant.'], [Tg - M, 'enonce', 'C\'est le nombre d\'années à attendre, pas l\'âge.']], { min: 1, fmt: v => nf(v) + ' ans' });
  });

  def('eq.past', 'eq', 2, 'Âges dans le passé', 'agegap', () => {
    const n = int(2, 8), b = int(n + 6, 40), A = int(n + 6, 45), S = (A - n) + (b - n), [x, y] = two();
    return numQ({ text: `Il y a ${n} ans, la somme des âges de ${x} et de ${y} était de ${S} ans. ${y} a aujourd'hui ${b} ans. Quel âge a ${x} aujourd'hui ?`,
      exp: E({ r: `<p>Aujourd'hui, la somme a pris ${n} ans par personne : ${S} + ${2 * n} = ${S + 2 * n}. Donc ${x} a ${S + 2 * n} − ${b} = ${A} ans.</p>`, p: `<p>Chacun a vieilli de ${n} ans : il faut ajouter ${n} ans deux fois.</p>` }) },
    A, [[S - b, 'methode', 'Tu as oublié que chacun était plus jeune de ' + n + ' ans.'], [S - b + n, 'methode', `Tu as ajouté les ${n} ans à une seule personne.`]], { min: 1, fmt: v => nf(v) + ' ans' });
  });

  def('eq.market', 'eq', 2, 'Système : deux prix', 'backsolve', () => {
    let L, F; do { L = int(2, 8) / 2; F = int(2, 10) / 2; } while (L === F);
    const [[a1, b1], [a2, b2]] = pick([[[3, 2], [2, 1]], [[2, 3], [1, 2]], [[4, 1], [1, 1]], [[3, 1], [1, 2]], [[2, 5], [1, 2]], [[5, 2], [2, 1]]]);
    const T1 = a1 * L + b1 * F, T2 = a2 * L + b2 * F;
    return numQ({ text: `Au marché, ${a1} kg de légumes et ${b1} kg de fruits coûtent ${eur(T1)}. ${a2} kg de légumes et ${b2} kg de fruits coûtent ${eur(T2)}. Combien coûte 1 kg de légumes ?`,
      exp: E({ r: `<p>Teste la réponse ${eur(L)} dans la 2e phrase : il reste ${eur(T2 - a2 * L)} pour ${b2} kg de fruits, soit ${eur(F)} le kilo. Vérifie la 1re : ${a1} × ${nf(L)} + ${b1} × ${nf(F)} = ${eur(T1)} ✓.</p>`,
        p: '<p>La moyenne des prix ne donne rien : il faut que les deux phrases soient vraies en même temps.</p>',
        c: `<p>Multiplie une équation pour avoir le même nombre de kilos de fruits dans les deux, puis soustrais-les pour éliminer les fruits.</p>` }) },
    L, [[F, 'enonce', 'C\'est le prix des fruits.'], [T1 / (a1 + b1), 'methode', 'Tu as fait une moyenne des prix : il faut résoudre le système.'],
      [T2 / (a2 + b2), 'methode', 'Tu as fait une moyenne des prix : il faut résoudre le système.']], { step: 0.5, min: 0.5, fmt: eur });
  });

  def('eq.money', 'eq', 3, 'Système : sommes d\'argent', 'backsolve', () => {
    let J, s, k, d; do { J = int(3, 15) * 100; s = pick([100, 200, 300, 400]); k = int(2, 4); d = k * (J - s) - J; } while (J <= s || d <= 0 || d > 2000);
    const [x, y] = two();
    return numQ({ text: `${x} a ${eur(d)} de plus que ${y}. Si ${y} dépensait ${eur(s)}, ${x} aurait ${k} fois plus d'argent que ${y}. Combien d'argent a ${y} ?`,
      exp: E({ r: `<p>Teste les réponses en commençant par celle du milieu. Avec ${J} € : ${x} a ${J + d} €, et ${k} × (${J} − ${s}) = ${J + d} ✓.</p>`,
        p: `<p>Seul ${y} dépense les ${s} € : ${x} garde ${J + d} €.</p>`,
        c: `<p>n + ${d} = ${k} × (n − ${s}), donc ${k - 1 === 1 ? '' : (k - 1) + ' × '}n = ${d} + ${k * s} = ${d + k * s}, soit n = ${eur(J)}.</p>` }) },
    J, [[J + d, 'enonce', `C'est l'argent de ${x}.`], [J - s, 'enonce', 'C\'est ce qui reste après la dépense.']], { step: 100, min: 100, fmt: eur });
  });

  def('eq.shop', 'eq', 2, 'Fausse hypothèse', 'falsehyp', () => {
    const x = int(5, 9), y = int(2, 4), N = int(4, 10), P = int(1, N - 1), V = N - P, Tt = x * V + y * P;
    return numQ({ text: `Dans une boutique, chaque client achète soit ${x} cahiers, soit ${y} classeurs. Aujourd'hui, ${N} clients ont acheté ${Tt} articles au total. Combien de classeurs ont été vendus ?`,
      exp: E({ r: `<p>Si les ${N} clients avaient tous pris des classeurs : ${N * y} articles. Il y en a ${Tt - N * y} de plus, et chaque client « cahiers » en ajoute ${x - y} : ${V} clients cahiers, donc ${P} clients classeurs, soit ${y * P} classeurs.</p>`,
        p: '<p>On demande le nombre de classeurs, pas le nombre de clients.</p>', c: `<p>c + k = ${N} et ${x}c + ${y}k = ${Tt}.</p>` }) },
    y * P, [[P, 'enonce', 'C\'est le nombre de clients, pas de classeurs.'], [V, 'enonce', 'C\'est le nombre de clients qui ont pris des cahiers.'], [x * V, 'enonce', 'Ce sont les cahiers.']], { step: y, min: 1 });
  });

  def('eq.part', 'eq', 1, 'Nombre et sa fraction', 'backsolve', () => {
    const q = pick([2, 3, 4, 5]), x = q * int(2, 15), N = x + x / q;
    const word = { 2: 'sa moitié', 3: 'son tiers', 4: 'son quart', 5: 'son cinquième' }[q];
    return numQ({ text: `Un nombre augmenté de ${word} donne ${N}. Quel est ce nombre ?`,
      exp: E({ r: `<p>Le nombre plus ${word}, c'est ${fr(q + 1, q)} du nombre : ${N} ÷ ${q + 1} × ${q} = ${x}. Vérifie : ${x} + ${x / q} = ${N}.</p>`,
        p: `<p>${{ 2: 'La moitié', 3: 'Le tiers', 4: 'Le quart', 5: 'Le cinquième' }[q]} se calcule sur le nombre cherché, pas sur ${N} : retirer ${fr(1, q)} de ${N} est faux.</p>` }) },
    x, [[N - N / q, 'formule', `Tu as retiré ${fr(1, q)} de ${N}, mais la fraction porte sur le nombre cherché.`], [N / (q + 1), 'calc', `Tu as divisé par ${q + 1} sans multiplier par ${q}.`]], { step: q, min: 1 });
  });

  // ===== Moyennes =====
  def('moy.merge', 'moy', 2, 'Fusionner deux groupes', 'meansum', () => {
    let n1, n2, m1, m2, t; do { n1 = int(4, 12); n2 = int(4, 12); m1 = int(20, 45); m2 = int(20, 45); t = (n1 * m1 + n2 * m2) / (n1 + n2); } while (n1 === n2 || m1 === m2 || !Number.isInteger(t));
    return numQ({ text: `Dans une salle, ${n1} personnes ont ${m1} ans de moyenne. Dans une autre, ${n2} personnes ont ${m2} ans de moyenne. Quelle est la moyenne d'âge de l'ensemble ?`,
      exp: E({ r: `<p>Par les écarts : ${n2} personnes ont ${Math.abs(m2 - m1)} ans de ${m2 > m1 ? 'plus' : 'moins'} que ${m1}. Moyenne = ${m1} ${m2 > m1 ? '+' : '−'} ${n2} × ${Math.abs(m2 - m1)} ÷ ${n1 + n2} = ${t} ans.</p>`,
        p: `<p>La moyenne des moyennes (${nf((m1 + m2) / 2)}) est fausse : les groupes n'ont pas la même taille.</p>`,
        c: `<p>Sommes : ${n1} × ${m1} + ${n2} × ${m2} = ${n1 * m1 + n2 * m2} ans pour ${n1 + n2} personnes : ${t} ans.</p>` }), tip: 'meangap' },
    t, [[(m1 + m2) / 2, 'formule', 'Tu as fait la moyenne des moyennes : les groupes n\'ont pas la même taille.'], [(n2 * m1 + n1 * m2) / (n1 + n2), 'inatt', 'Tu as associé chaque moyenne au mauvais effectif.']], { min: 1, dp: 1, fmt: ans_ });
  });

  def('moy.add', 'moy', 1, 'Ajouter une valeur', 'meansum', () => {
    let n, m, v, t; do { n = int(3, 6); m = int(12, 40); v = int(5, 60); t = (n * m + v) / (n + 1); } while (v === m || !Number.isInteger(t));
    return numQ({ text: `${n} amis ont ${m} ans de moyenne. Un ami de ${v} ans les rejoint. Quelle est la nouvelle moyenne d'âge ?`,
      exp: E({ r: `<p>Le nouveau venu a ${Math.abs(v - m)} ans de ${v > m ? 'plus' : 'moins'} que la moyenne ; cet écart se répartit sur ${n + 1} personnes : ${m} ${v > m ? '+' : '−'} ${Math.abs(v - m)} ÷ ${n + 1} = ${t} ans.</p>`,
        p: '<p>On ne fait pas la moyenne entre l\'ancienne moyenne et le nouvel âge.</p>', c: `<p>(${n} × ${m} + ${v}) ÷ ${n + 1} = ${n * m + v} ÷ ${n + 1} = ${t}.</p>` }) },
    t, [[(m + v) / 2, 'formule', 'Tu as fait la moyenne entre l\'ancienne moyenne et le nouvel âge.'], [m, 'inatt', 'La moyenne change forcément quand on ajoute un âge différent.'],
      [(n * m + v) / n, 'calc', `Tu as divisé par ${n} au lieu de ${n + 1}.`]], { min: 1, dp: 1, fmt: ans_ });
  });

  def('moy.need', 'moy', 1, 'Note nécessaire', 'meansum', () => {
    let n, Tm, g, need; do { n = int(3, 5); Tm = int(10, 15); g = Array.from({ length: n - 1 }, () => int(6, 18)); need = n * Tm - g.reduce((a, b) => a + b, 0); } while (need < 0 || need > 20 || need === Tm);
    const sum = n * Tm - need, [nm] = two(), list = g.slice(0, -1).join(', ') + ' et ' + g[g.length - 1];
    return numQ({ text: `${nm} a obtenu ${list} à ses ${n - 1} premiers devoirs. Quelle note faut-il au ${n}e devoir pour avoir exactement ${Tm} de moyenne ?`,
      exp: E({ r: `<p>Total visé : ${n} × ${Tm} = ${n * Tm}. Déjà obtenu : ${sum}. Il manque ${need}.</p>`, p: `<p>Viser ${Tm} au dernier devoir ne suffit pas : il faut compenser les notes déjà obtenues.</p>` }) },
    need, [[Tm, 'methode', 'Viser la moyenne au dernier devoir ne suffit pas : il faut compenser les notes déjà obtenues.'], [need + n - 1, 'calc', 'Erreur dans la somme des notes.']], { min: 0 });
  });

  def('moy.consec', 'moy', 2, 'Nombres consécutifs', 'consec', () => {
    const k = pick([3, 5, 7]), mid = int(10, 60), h = (k - 1) / 2;
    if (Math.random() < 0.5) {
      return numQ({ text: `On considère ${k} nombres entiers consécutifs. La moyenne du plus petit et du plus grand vaut ${mid}. Quelle est leur somme ?`,
        exp: E({ r: `<p>Pour des nombres consécutifs, moyenne de tous = moyenne du premier et du dernier = ${mid}. Somme = ${k} × ${mid} = ${k * mid}.</p>`, p: '<p>On demande la somme des ' + k + ' nombres, pas des deux extrêmes.</p>' }) },
      k * mid, [[2 * mid, 'enonce', 'C\'est la somme du plus petit et du plus grand seulement.'], [(k - 1) * mid, 'calc', 'Un nombre de moins.'], [(k + 1) * mid, 'calc', 'Un nombre de trop.']], { step: k, min: 1 });
    }
    return numQ({ text: `La somme de ${k} nombres entiers consécutifs vaut ${k * mid}. Quel est le plus grand ?`,
      exp: E({ r: `<p>Le nombre du milieu = ${k * mid} ÷ ${k} = ${mid}. Les ${k} nombres vont de ${mid - h} à ${mid + h}.</p>`, p: `<p>Le plus grand est à ${h} du milieu, pas à ${k - 1}.</p>` }) },
    mid + h, [[mid, 'enonce', 'C\'est le nombre du milieu.'], [mid + k - 1, 'calc', `Tu as compté ${k - 1} d'écart au lieu de ${h}.`], [mid - h, 'enonce', 'C\'est le plus petit.']], { min: 1 });
  });

  def('moy.coef', 'moy', 2, 'Moyenne pondérée', 'meangap', () => {
    let a, b, x, y; do { a = int(6, 18); b = int(6, 18); x = int(1, 4); y = int(1, 4); } while (x === y || a === b || ((a * x + b * y) * 2) % (x + y) !== 0);
    const m = (a * x + b * y) / (x + y), [nm] = two();
    return numQ({ text: `${nm} a eu ${a} en maths (coefficient ${x}) et ${b} en français (coefficient ${y}). Quelle est sa moyenne ?`,
      exp: E({ r: `<p>Par les écarts : partir de ${a} et ajouter ${y} × (${b} − ${a}) ÷ ${x + y} = ${nf(m - a)}, soit ${nf(m)}.</p>`,
        p: `<p>La moyenne se rapproche de la note au plus gros coefficient : ici ${x > y ? a : b}.</p>`, c: `<p>(${a} × ${x} + ${b} × ${y}) ÷ ${x + y} = ${a * x + b * y} ÷ ${x + y} = ${nf(m)}.</p>` }) },
    m, [[(a + b) / 2, 'formule', 'Tu as oublié les coefficients.'], [(a * y + b * x) / (x + y), 'inatt', 'Coefficients inversés.']], { step: 0.5, min: 0 });
  });

  // ===== Vitesses, croisements et rattrapage =====
  def('vit.base', 'vit', 1, 'Vitesse, distance, temps', 'minfrac', d => {
    const T = pick(d === 1 ? [30, 60, 90, 120] : d === 2 ? [15, 20, 40, 45, 75] : [50, 100, 150, 40, 25]);
    let v; do v = int(4, 24) * 5; while (!Number.isInteger(v * T / 60));
    const Dk = v * T / 60;
    if (Math.random() < 0.5) {
      return numQ({ text: `Un train parcourt ${Dk} km en ${dur(T)}. Quelle est sa vitesse moyenne ?`, tip: 'minfrac',
        exp: E({ r: `<p>${dur(T)} = ${fr(T, 60)} h. Vitesse = ${Dk} ÷ ${fr(T, 60)} = ${Dk} × 60 ÷ ${T} = ${kmh(v)}.</p>`, p: `<p>${dur(T)} ne vaut pas ${nf(T / 100)} h : une heure fait 60 minutes.</p>` }) },
      v, [[Dk / (T / 100), 'conv', `Tu as pris ${dur(T)} pour ${nf(T / 100)} h.`], [Dk * T / 60, 'formule', 'Tu as multiplié la distance par le temps au lieu de diviser.'], [Dk, 'enonce', 'C\'est la distance.']], { step: 5, min: 1, dp: 0, fmt: kmh });
    }
    const hours = Dk / v, naive = Math.floor(hours) * 60 + Math.round((hours % 1) * 100);
    return numQ({ text: `À ${kmh(v)}, combien de temps faut-il pour parcourir ${Dk} km ?`, tip: 'hdec',
      exp: E({ r: `<p>Temps = ${Dk} ÷ ${v} = ${nf(hours)} h${hours % 1 ? `, et ${nf(hours % 1)} h × 60 = ${T % 60} min` : ''}. Donc ${dur(T)}.</p>`,
        p: hours % 1 ? `<p>${nf(hours)} h, ce n'est pas ${Math.floor(hours)} h ${Math.round((hours % 1) * 100)} : la partie décimale se multiplie par 60.</p>` : '' }) },
    T, [[naive, 'conv', 'Tu as lu la partie décimale des heures comme des minutes.']], { step: 5, min: 5, dp: 0, fmt: dur });
  });

  def('vit.ar', 'vit', 2, 'Moyenne sur un aller-retour', 'harmonic', () => {
    const [v1, v2] = shuffle(pick([[60, 40], [30, 60], [90, 60], [120, 80], [50, 75], [100, 150], [20, 30], [120, 60], [45, 90], [36, 60], [70, 105], [40, 120], [60, 180], [48, 80]]).slice());
    const m = 2 * v1 * v2 / (v1 + v2), d = lcm(v1, v2);
    return numQ({ text: `Un automobiliste fait l'aller à ${kmh(v1)} et le retour, sur la même route, à ${kmh(v2)}. Quelle est sa vitesse moyenne sur l'aller-retour ?`,
      exp: E({ r: `<p>2 × ${v1} × ${v2} ÷ (${v1} + ${v2}) = ${kmh(m)}.</p>`, p: `<p>La moyenne des vitesses (${nf((v1 + v2) / 2)}) est fausse : on roule plus longtemps à la vitesse la plus lente.</p>`,
        c: `<p>Prends une distance pratique de ${d} km : aller ${nf(d / v1)} h, retour ${nf(d / v2)} h, soit ${2 * d} km en ${nf(d / v1 + d / v2)} h = ${kmh(m)}.</p>` }) },
    m, [[(v1 + v2) / 2, 'formule', 'Moyenne des vitesses : faux, on passe plus de temps à la vitesse la plus lente.'], [Math.min(v1, v2), 'methode', 'La vitesse moyenne est entre les deux vitesses.'], [Math.max(v1, v2), 'methode', 'La vitesse moyenne est entre les deux vitesses.']], { step: 2, min: 1, dp: 0, fmt: kmh });
  });

  def('vit.legs', 'vit', 2, 'Moyenne sur deux tronçons', 'harmonic', () => {
    let v1, v2, t1, t2, m;
    do { v1 = int(3, 12) * 10; v2 = int(3, 12) * 10; t1 = pick([0.5, 1, 1.5, 2, 2.5, 3]); t2 = pick([0.5, 1, 1.5, 2, 2.5, 3]); m = (v1 * t1 + v2 * t2) / (t1 + t2); }
    while (v1 === v2 || t1 === t2 || !Number.isInteger(m));
    const D1 = v1 * t1, D2 = v2 * t2;
    return numQ({ text: `Un automobiliste roule ${D1} km à ${kmh(v1)}, puis ${D2} km à ${kmh(v2)}. Quelle est sa vitesse moyenne sur l'ensemble du trajet ?`,
      exp: E({ r: `<p>Temps : ${nf(t1)} h + ${nf(t2)} h = ${nf(t1 + t2)} h. Vitesse moyenne = ${D1 + D2} ÷ ${nf(t1 + t2)} = ${kmh(m)}.</p>`, p: `<p>Jamais la moyenne des deux vitesses (${nf((v1 + v2) / 2)}) : distance totale ÷ temps total.</p>` }) },
    m, [[(v1 + v2) / 2, 'formule', 'Moyenne des vitesses : il faut diviser la distance totale par le temps total.']], { step: 2, min: 1, dp: 0, fmt: kmh });
  });

  def('vit.catch', 'vit', 3, 'Rattrapage', 'closing', () => {
    let e, t, dt, vA, av;
    do { e = pick([10, 12, 15, 20, 25, 30]); t = pick([1, 1.5, 2, 2.5, 3, 4]); av = e * t; dt = pick([0.5, 1, 1.5, 2, 3]); vA = av / dt; } while (!Number.isInteger(vA) || vA < 20 || vA > 110);
    const vB = vA + e, start = int(7, 13) * 60, bStart = start + dt * 60, at = bStart + t * 60, [x, y] = two();
    return numQ({ text: `${x} part à ${hm(start)} et roule à ${kmh(vA)}. ${y} part du même endroit à ${hm(bStart)}, dans la même direction, à ${kmh(vB)}. À quelle heure a lieu le rattrapage ?`,
      exp: E({ r: `<p>Avance au départ de ${y} : ${nf(dt)} h × ${vA} = ${av} km. Écart de vitesse : ${e} km/h. Temps = ${av} ÷ ${e} = ${nf(t)} h, donc ${hm(bStart)} + ${dur(t * 60)} = ${hm(at)}.</p>`,
        p: '<p>Même sens : on soustrait les vitesses (on les additionne seulement quand on roule l\'un vers l\'autre). Et on part de l\'heure de départ du second.</p>' }) },
    at, [[bStart + av / vB * 60, 'formule', 'Tu as divisé l\'avance par la vitesse du poursuivant au lieu de l\'écart de vitesses.'],
      [bStart + av / (vA + vB) * 60, 'methode', 'Tu as additionné les vitesses : en rattrapage (même sens), on les soustrait.'], [start + t * 60, 'enonce', 'Tu es parti de l\'heure de départ du premier.']], { step: 30, dp: 0, fmt: hm });
  });

  def('vit.cross', 'vit', 2, 'Croisement', 'closing', () => {
    let v1, v2; do { v1 = int(4, 12) * 10; v2 = int(4, 12) * 10; } while (v1 === v2);
    const t = pick([0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]), Dk = (v1 + v2) * t;
    const intro = `Deux voitures partent en même temps de deux villes A et B distantes de ${Dk} km et roulent l'une vers l'autre, la première (partie de A) à ${kmh(v1)}, la seconde à ${kmh(v2)}.`;
    if (Math.random() < 0.5) {
      return numQ({ text: `${intro} Au bout de combien de temps se croisent-elles ?`,
        exp: E({ r: `<p>Elles se rapprochent de ${v1} + ${v2} = ${v1 + v2} km/h. Temps = ${Dk} ÷ ${v1 + v2} = ${nf(t)} h = ${dur(t * 60)}.</p>`, p: '<p>Sens opposés : on additionne les vitesses.</p>' }) },
      t * 60, [[Dk / Math.abs(v1 - v2) * 60, 'methode', 'Tu as soustrait les vitesses : en sens opposés, on les additionne.'], [Dk / v1 * 60, 'methode', 'Une seule voiture ne fait pas tout le trajet.'],
        [2 * t * 60, 'formule', 'Tu as pris la moyenne des vitesses au lieu de leur somme.']], { step: 15, min: 5, dp: 0, fmt: dur });
    }
    return numQ({ text: `${intro} À quelle distance de A se croisent-elles ?`,
      exp: E({ r: `<p>La voiture partie de A fait ${fr(v1, v1 + v2)} du trajet (sa part de la vitesse totale) : ${fr(v1, v1 + v2)} × ${Dk} = ${nf(v1 * t)} km.</p>`, p: '<p>Elles ne se croisent au milieu que si elles roulent à la même vitesse.</p>',
        c: `<p>Temps de croisement : ${Dk} ÷ ${v1 + v2} = ${nf(t)} h, puis ${v1} × ${nf(t)} = ${nf(v1 * t)} km.</p>` }) },
    v1 * t, [[Dk / 2, 'methode', 'Elles ne se croisent au milieu que si elles roulent à la même vitesse.'], [v2 * t, 'enonce', 'C\'est la distance depuis B.']], { step: 10, min: 1, fmt: v => nf(v) + ' km' });
  });

  def('vit.delay', 'vit', 3, 'Croisement à départ différé', 'closing', () => {
    let v1, v2, d, k, R, Dk;
    do { v1 = int(12, 25); v2 = int(12, 25); d = pick([0.5, 1, 1.5]); k = int(5, 30); R = (v1 + v2) * k / 10; Dk = v1 * d + R; } while (!Number.isInteger(R) || !Number.isInteger(Dk) || v1 === v2);
    const t = k / 10, start = int(8, 10) * 60, bStart = start + d * 60, meet = bStart + t * 60;
    return numQ({ text: `À ${hm(start)}, un cycliste part de A vers B à ${kmh(v1)}. À ${hm(bStart)}, un autre cycliste part de B vers A à ${kmh(v2)}. A et B sont distants de ${Dk} km. À quelle heure se croisent-ils ?`,
      exp: E({ r: `<p>Le premier roule seul ${nf(d)} h : ${nf(v1 * d)} km. Il reste ${nf(R)} km, avalés à ${v1 + v2} km/h en ${nf(t)} h = ${dur(t * 60)}. Croisement à ${hm(bStart)} + ${dur(t * 60)} = ${hm(meet)}.</p>`,
        p: '<p>La formule du croisement ne s\'applique qu\'une fois les deux partis : retire d\'abord la distance déjà faite par le premier.</p>' }) },
    meet, [[start + Dk / (v1 + v2) * 60, 'methode', 'Tu as fait comme s\'ils partaient en même temps.'], [bStart + Dk / (v1 + v2) * 60, 'methode', 'Tu as oublié la distance déjà parcourue par le premier.'],
      [start + t * 60, 'enonce', 'Tu es parti de l\'heure de départ du premier.']], { step: 12, dp: 0, fmt: hm });
  });

  // ===== Temps de travail et production =====
  const WORK = [['Un robinet remplit une baignoire', 'un second robinet', 'aux deux robinets ensemble'], ['Une imprimante imprime un dossier', 'une seconde imprimante', 'aux deux imprimantes ensemble'], ['Léo range le grenier', 'Margot', 'à Léo et Margot ensemble']];
  function workPair() { let a, b, t; do { a = int(2, 36) * 5; b = int(2, 36) * 5; t = a * b / (a + b); } while (a === b || !Number.isInteger(t) || t < 10); return [a, b, t]; }

  def('trav.two', 'trav', 2, 'Travailler à deux', 'workrate', () => {
    const [a, b, t] = workPair(), [s1, s2, s3] = pick(WORK);
    return numQ({ text: `${s1} en ${dur(a)}, ${s2} en ${dur(b)}. Combien de temps faut-il ${s3} ?`,
      exp: E({ r: `<p>T = ${a} × ${b} ÷ (${a} + ${b}) = ${a * b} ÷ ${a + b} = ${t} min, soit ${dur(t)}.</p>`, p: `<p>À deux, c'est toujours plus rapide que le plus rapide seul (${dur(Math.min(a, b))}) : élimine d'emblée les réponses plus longues.</p>`,
        c: `<p>On additionne les vitesses de travail : 1/T = 1/${a} + 1/${b}.</p>` }) },
    t, [[(a + b) / 2, 'formule', 'Moyenne des temps : à deux, on va plus vite que le plus rapide seul.'], [a + b, 'formule', 'On n\'additionne pas les temps, mais les vitesses de travail.'],
      [Math.abs(a - b), 'methode', 'La différence des temps n\'a pas de sens ici.']], { step: 5, min: 1, dp: 0, fmt: dur });
  });

  def('trav.find', 'trav', 3, 'Retrouver le temps d\'un seul', 'workrate', () => {
    const [a, b, t] = workPair();
    return numQ({ text: `Ensemble, deux robinets remplissent une cuve en ${dur(t)}. Le premier, seul, la remplit en ${dur(a)}. Combien de temps faut-il au second, seul ?`,
      exp: E({ r: `<p>T₂ = ${a} × ${t} ÷ (${a} − ${t}) = ${a * t} ÷ ${a - t} = ${b} min, soit ${dur(b)}. Ou teste les réponses avec la formule à deux.</p>`,
        p: '<p>On ne soustrait pas les temps : ce sont les vitesses (1/T) qui se soustraient.</p>', c: `<p>1/T₂ = 1/${t} − 1/${a}.</p>` }) },
    b, [[a - t, 'formule', 'On ne soustrait pas les temps : ce sont les vitesses (1/T) qui se soustraient.'], [a + t, 'formule', 'On n\'additionne pas les temps.']], { step: 5, min: 1, dp: 0, fmt: dur });
  });

  def('trav.inv', 'trav', 1, 'Plus de monde, moins de temps', 'invprop', () => {
    if (Math.random() < 0.5) {
      let n1, d1, n2; do { n1 = int(2, 12); d1 = int(4, 30); n2 = int(2, 15); } while (n1 === n2 || (n1 * d1) % n2 !== 0);
      const ans = n1 * d1 / n2;
      return numQ({ text: `${n1} ouvriers construisent un mur en ${d1} jours. Combien de jours faut-il à ${n2} ouvriers travaillant au même rythme ?`,
        exp: E({ r: `<p>Ouvriers × jours reste constant : ${n1} × ${d1} = ${n1 * d1}, donc ${n1 * d1} ÷ ${n2} = ${ans} jours.</p>`, p: `<p>Plus ${n2 > n1 ? 'd\'ouvriers, moins' : 'peu d\'ouvriers, plus'} de jours : proportion inverse, pas directe.</p>` }) },
      ans, [[d1 * n2 / n1, 'methode', 'Proportion directe au lieu d\'inverse : plus d\'ouvriers, moins de jours.'], [d1 + n1 - n2, 'methode', 'Raisonnement additif : c\'est le produit ouvriers × jours qui reste constant.']], { min: 1, dp: 1, fmt: jours });
    }
    let h1, d1, h2; do { h1 = int(5, 10); d1 = int(10, 50); h2 = int(5, 12); } while (h1 === h2 || (h1 * d1) % h2 !== 0);
    const ans = h1 * d1 / h2;
    return numQ({ text: `En travaillant ${h1} heures par jour, Sam met ${d1} jours pour finir un chantier. Combien de jours lui faut-il en travaillant ${h2} heures par jour ?`,
      exp: E({ r: `<p>Heures totales : ${h1} × ${d1} = ${h1 * d1} h, donc ${h1 * d1} ÷ ${h2} = ${ans} jours.</p>`, p: '<p>Proportion inverse : plus d\'heures par jour, moins de jours.</p>' }) },
    ans, [[d1 * h2 / h1, 'methode', 'Proportion directe au lieu d\'inverse.'], [d1 + h1 - h2, 'methode', 'Raisonnement additif : c\'est le produit heures × jours qui reste constant.']], { min: 1, dp: 1, fmt: jours });
  });

  def('trav.rate', 'trav', 1, 'Cadence de production', 'invprop', () => {
    let p, m, H, ans; do { p = int(2, 9); m = pick([3, 4, 5, 6, 8, 10, 12, 15]); H = int(1, 8); ans = p * H * 60 / m; } while (!Number.isInteger(ans) || p === m);
    return numQ({ text: `Une machine fabrique ${p} pièces toutes les ${m} minutes. Combien de pièces fabrique-t-elle en ${H} h ?`,
      exp: E({ r: `<p>${H} h = ${H * 60} min = ${H * 60 / m} cycles de ${m} min. Production = ${H * 60 / m} × ${p} = ${ans} pièces.</p>`, p: '<p>Une heure fait 60 minutes, et on divise par la durée d\'un cycle.</p>' }) },
    ans, [[p * H * 100 / m, 'conv', 'Tu as compté 100 minutes par heure.'], [p * H * m, 'formule', 'Tu as multiplié par la durée du cycle au lieu de diviser.']], { step: p, min: 1, dp: 0 });
  });

  def('trav.jar', 'trav', 3, 'Consommation partagée', 'invprop', () => {
    let kids, a, b, Dd, c, tot, ans;
    do { kids = int(2, 3); a = int(1, 3); b = int(1, 3); Dd = int(10, 40); c = int(2, 4); tot = ((kids + 1) * a + b) * Dd; ans = tot / ((kids + 2) * c); }
    while (a === b || !Number.isInteger(ans) || ans === Dd);
    const perDay = (kids + 1) * a + b;
    return numQ({ text: `Dans une famille, les ${kids} enfants et le père prennent chacun ${a} bonbon${a > 1 ? 's' : ''} par jour, la mère en prend ${b}. Le pot est vidé en ${Dd} jours. En combien de jours serait-il vidé si chacun en prenait ${c} par jour ?`,
      exp: E({ r: `<p>Contenu du pot : ${perDay} par jour × ${Dd} jours = ${tot}. Nouveau rythme : ${kids + 2} × ${c} = ${(kids + 2) * c} par jour, soit ${tot} ÷ ${(kids + 2) * c} = ${ans} jours.</p>`,
        p: `<p>Compte bien tout le monde : ${kids} enfants + le père + la mère = ${kids + 2} personnes.</p>` }) },
    ans, [[tot / ((kids + 1) * c), 'enonce', 'Tu as oublié une personne.'], [Dd * a / c, 'methode', 'La mère ne consomme pas comme les autres : passe par le contenu total du pot.']], { min: 1, dp: 1, fmt: jours });
  });

  // ===== Conversions =====
  def('conv.hdec', 'conv', 1, 'Heures décimales', 'hdec', () => {
    const h = int(0, 4), f = pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]);
    const x = h + f, ans = h * 60 + Math.round(f * 60), naive = h * 60 + Math.round(f * 100);
    return numQ({ text: `Combien font ${nf(x)} h en heures et minutes ?`,
      exp: E({ r: `<p>${nf(f)} × 60 = ${Math.round(f * 60)} min. Donc ${nf(x)} h = ${dur(ans)}.</p>`, p: `<p>Ce n'est pas ${h} h ${Math.round(f * 100)} : une heure fait 60 minutes, pas 100.</p>` }) },
    ans, [[naive, 'conv', 'Tu as lu les centièmes d\'heure comme des minutes.']], { step: 3, min: 1, dp: 0, fmt: dur });
  });

  def('conv.speed', 'conv', 1, 'm/s et km/h', 'mskmh', () => {
    const ms = int(1, 12) * 5, k = ms * 3.6;
    if (Math.random() < 0.5) {
      return numQ({ text: `Combien font ${ms} m/s en km/h ?`,
        exp: E({ r: `<p>m/s → km/h : × 3,6. ${ms} × 3,6 = ${kmh(k)}.</p>`, p: '<p>Vérifie le sens : une vitesse en km/h est un nombre plus grand qu\'en m/s.</p>' }) },
      k, [[ms / 3.6, 'formule', 'Tu as divisé au lieu de multiplier par 3,6.'], [ms * 60, 'conv', '× 60 ne suffit pas : 1 m/s = 3 600 m/h = 3,6 km/h.']], { step: 9, min: 1, dp: 1, fmt: kmh });
    }
    return numQ({ text: `Combien font ${nf(k)} km/h en m/s ?`,
      exp: E({ r: `<p>km/h → m/s : ÷ 3,6. ${nf(k)} ÷ 3,6 = ${ms} m/s (divise par 36, puis multiplie par 10).</p>`, p: '<p>En m/s, le nombre est plus petit qu\'en km/h.</p>' }) },
    ms, [[k * 3.6, 'formule', 'Tu as multiplié au lieu de diviser par 3,6.'], [k / 60, 'conv', '÷ 60 ne suffit pas : il faut aussi passer des km aux m.']], { step: 5, min: 1, dp: 1, fmt: v => nf(v, 1) + ' m/s' });
  });

  def('conv.unit', 'conv', 2, 'Aires, volumes, capacités', 'units', () => {
    const [u1, u2, f] = pick([['m²', 'cm²', 1e4], ['ha', 'm²', 1e4], ['km²', 'ha', 100], ['m²', 'dm²', 100], ['km²', 'm²', 1e6], ['m³', 'L', 1000], ['L', 'cm³', 1000], ['dm³', 'mL', 1000], ['m³', 'dm³', 1000], ['cm³', 'L', 0.001], ['mL', 'L', 0.001], ['cm²', 'm²', 0.0001], ['a', 'm²', 100]]);
    const v = f >= 1 ? int(2, 95) / 10 : f === 0.001 ? int(1, 40) * 50 : int(1, 9) * 1000;
    const ans = Math.round(v * f * 1e4) / 1e4;
    const rule = f >= 1 ? `1 ${u1} = ${nf(f)} ${u2}, donc ${nf(v)} × ${nf(f)} = ${nf(ans, 4)} ${u2}.` : `1 ${u2} = ${nf(1 / f)} ${u1}, donc ${nf(v)} ÷ ${nf(1 / f)} = ${nf(ans, 4)} ${u2}.`;
    const w = 'Facteur de 10 en trop ou en moins : aires × 100 par unité, volumes × 1 000.';
    return numQ({ text: `Combien font ${nf(v)} ${u1} en ${u2} ?`,
      exp: E({ r: `<p>${rule}</p>`, p: '<p>Longueurs × 10 d\'une unité à l\'autre, aires × 100, volumes × 1 000. 1 L = 1 dm³ ; 1 ha = 10 000 m².</p>' }) },
    ans, [[ans * 10, 'conv', w], [ans / 10, 'conv', w], [ans * 100, 'conv', w], [ans / 100, 'conv', w]], { step: ans, min: 1e-4, dp: 4, fmt: x => nf(x, 4) + ' ' + u2 });
  });

  def('conv.sum', 'conv', 1, 'Additionner des durées', 'hdec', () => {
    let h1, m1, h2, m2; do { h1 = int(1, 4); m1 = int(1, 11) * 5; h2 = int(1, 4); m2 = int(1, 11) * 5; } while (m1 + m2 < 60);
    const a = h1 * 60 + m1, b = h2 * 60 + m2, ans = a + b;
    return numQ({ text: `Combien font ${dur(a)} + ${dur(b)} ?`,
      exp: E({ r: `<p>${h1 + h2} h + ${m1 + m2} min, et ${m1 + m2} min = 1 h ${pad(m1 + m2 - 60)}. Total : ${dur(ans)}.</p>`, p: '<p>On retient 1 h dès qu\'on dépasse 60 minutes, pas 100.</p>' }) },
    ans, [[ans - 60, 'calc', 'Tu as oublié la retenue d\'une heure.'], [ans - 40, 'conv', 'Tu as compté 100 minutes par heure.']], { step: 5, min: 1, dp: 0, fmt: dur });
  });

  // ===== Rencontres et salutations =====
  def('salut.hand', 'salut', 1, 'Poignées de main', 'handshake', () => {
    const N = int(5, 30), ans = N * (N - 1) / 2;
    const text = pick([`Lors d'une soirée, ${N} invités se serrent tous la main, une fois chacun avec chacun. Combien y a-t-il de poignées de main ?`,
      `${N} chefs d'État veulent tous une ligne téléphonique directe avec chacun des autres. Combien de lignes faut-il installer ?`,
      `Dans un championnat de ${N} équipes, chaque équipe rencontre une seule fois chacune des autres. Combien de matchs sont joués ?`,
      `${N} amis trinquent tous ensemble, chacun une fois avec chacun des autres. Combien entend-on de tintements de verres ?`]);
    return numQ({ text, exp: E({ r: `<p>N × (N − 1) ÷ 2 = ${N} × ${N - 1} ÷ 2 = ${ans}.</p>`, p: `<p>${N} × ${N - 1} compte chaque lien deux fois (A avec B, puis B avec A) : il faut diviser par 2.</p>` }) },
      ans, [[N * (N - 1), 'formule', 'Chaque lien est compté deux fois : il faut diviser par 2.'], [N * N, 'formule', 'On ne se salue pas soi-même : N − 1, pas N.'],
        [N * (N + 1) / 2, 'calc', 'N + 1 au lieu de N − 1.']], { step: N, min: 1, dp: 0 });
  });

  def('salut.var', 'salut', 1, 'Aller-retour, bises, tournois', 'handshake', () => {
    const v = int(0, 2);
    if (v === 0) {
      const N = int(6, 20), ans = N * (N - 1);
      return numQ({ text: `Dans un championnat de ${N} équipes, chaque équipe rencontre deux fois chacune des autres (aller et retour). Combien de matchs sont joués ?`,
        exp: E({ r: `<p>Aller-retour : N × (N − 1) = ${ans}.</p>`, p: `<p>${ans / 2} n'est que l'aller simple.</p>` }) },
      ans, [[ans / 2, 'enonce', 'C\'est l\'aller simple : il y a aussi le retour.'], [N * N, 'formule', 'Une équipe ne se rencontre pas elle-même.']], { step: N, min: 1, dp: 0 });
    }
    if (v === 1) {
      const N = int(5, 20), ans = N * (N - 1);
      return numQ({ text: `À une fête, ${N} personnes se font toutes la bise, deux bises par personne rencontrée. Combien de bises sont échangées en tout ?`,
        exp: E({ r: `<p>${N} × ${N - 1} ÷ 2 = ${ans / 2} paires, × 2 bises = ${ans}.</p>`, p: '<p>Il y a 2 bises par paire de personnes.</p>' }) },
      ans, [[ans / 2, 'enonce', 'Il y a 2 bises par paire.'], [2 * ans, 'calc', 'Tu as compté chaque paire deux fois, puis encore × 2.']], { step: N, min: 1, dp: 0 });
    }
    const N = pick([8, 12, 16, 20, 24, 32, 48, 64, 100]);
    return numQ({ text: `Un tournoi à élimination directe réunit ${N} joueurs : chaque match élimine le perdant, jusqu'au vainqueur. Combien de matchs sont joués ?`, tip: 'elim',
      exp: E({ r: `<p>Chaque match élimine un joueur ; il faut en éliminer ${N} − 1 = ${N - 1}.</p>`, p: '<p>Ce n\'est pas un championnat : pas de N × (N − 1) ÷ 2.</p>' }) },
    N - 1, [[N, 'inatt', 'Le vainqueur ne perd jamais : N − 1.'], [N / 2, 'methode', 'Ce n\'est que le premier tour.'], [N * (N - 1) / 2, 'methode', 'Ce n\'est pas un championnat : chaque match élimine un joueur.']], { min: 1, dp: 0 });
  });

  def('salut.inv', 'salut', 2, 'Retrouver le nombre de personnes', 'handshake', () => {
    const N = int(6, 25), H = N * (N - 1) / 2;
    return numQ({ text: `Lors d'un dîner, chaque invité trinque exactement une fois avec chacun des autres. On compte ${H} tintements de verres. Combien y a-t-il d'invités ?`,
      exp: E({ r: `<p>N × (N − 1) = 2 × ${H} = ${2 * H} : deux nombres consécutifs, ${N} × ${N - 1} ✓.</p>`, p: '<p>Pense au × 2 avant de chercher les deux nombres consécutifs.</p>', c: '<p>Teste les réponses avec N × (N − 1) ÷ 2.</p>' }) },
    N, [[N - 1, 'calc', 'Le plus petit des deux nombres consécutifs : c\'est le plus grand qui compte les invités.'], [Math.round(Math.sqrt(H)), 'formule', 'Tu as oublié le × 2 : N × (N − 1) = 2 × total.']], { min: 2, dp: 0 });
  });

  def('salut.teams', 'salut', 3, 'Deux équipes face à face', 'handshake', () => {
    const n = int(4, 15), H = n * n;
    return numQ({ text: `Avant un match, chaque joueur d'une équipe serre la main de chaque joueur de l'équipe adverse. Les deux équipes ont le même nombre de joueurs et on compte ${H} poignées de main. Combien de joueurs par équipe ?`,
      exp: E({ r: `<p>n × n = ${H}, donc n = ${n}.</p>`, p: `<p>Pas de division par 2 : chaque poignée relie un joueur de chaque équipe. Si tout le monde se saluait, coéquipiers compris, ce serait N × (N − 1) ÷ 2 avec N = ${2 * n}.</p>` }) },
    n, [[Math.round(H / 2), 'formule', 'Pas de division par 2 : chaque poignée relie deux équipes différentes.'], [2 * n, 'enonce', 'C\'est le nombre total de joueurs.']], { min: 1, dp: 0 });
  });

  // ---------- Automatismes (pavé numérique) ----------
  const dec = (n, dp) => { const s = String(n).padStart(dp + 1, '0'); const i = s.slice(0, -dp), f = s.slice(-dp).replace(/0+$/, ''); return f ? i + ',' + f : i; };
  const AUTO = {
    sq: { label: 'Carrés de 11 à 25', fast: 4000, tip: 'sqnear', f() { const n = int(11, 25); return { text: `${n}²`, a: String(n * n) }; } },
    cube: { label: 'Cubes de 2 à 10', fast: 4000, tip: null, f() { const n = int(2, 10); return { text: `${n}³`, a: String(n ** 3) }; } },
    tab: { label: 'Tables de 11 à 19', fast: 5000, tip: null, f() { const a = int(11, 19), b = int(3, 9); return { text: `${a} × ${b}`, a: String(a * b) }; } },
    dec: { label: 'Décimaux', fast: 8000, tip: 'dec', f() {
      const v = int(0, 3);
      if (v === 0) { const x = int(11, 49), y = int(2, 9); return { text: `${dec(x, 1)} × ${y}`, a: dec(x * y, 1) }; }
      if (v === 1) { const x = int(11, 39), y = int(11, 39); return { text: `${dec(x, 1)} × ${dec(y, 1)}`, a: dec(x * y, 2) }; }
      if (v === 2) { const x = int(2, 9), y = int(2, 9); return { text: `0,${x} × 0,0${y}`, a: dec(x * y, 3) }; }
      const r = int(2, 12), b = int(2, 9); return { text: `${dec(r * b, 1)} ÷ 0,${b}`, a: String(r), tip: 'divdec' };
    } },
    pct: { label: 'Fractions en %', fast: 5000, tip: 'fracpct', f() {
      const [n, d, a] = pick([[1, 2, '50'], [1, 4, '25'], [3, 4, '75'], [1, 5, '20'], [2, 5, '40'], [3, 5, '60'], [4, 5, '80'], [1, 8, '12,5'], [3, 8, '37,5'], [5, 8, '62,5'], [7, 8, '87,5'], [3, 20, '15'], [1, 20, '5'], [1, 25, '4'], [1, 50, '2'], [3, 10, '30'], [9, 20, '45'], [6, 25, '24']]);
      return { text: `${fr(n, d)} = ? %`, a };
    } },
    time: { label: 'Heures en minutes', fast: 5000, tip: 'hdec', f() {
      const [t, a] = pick([['0,1 h', 6], ['0,2 h', 12], ['0,25 h', 15], ['0,4 h', 24], ['0,6 h', 36], ['0,75 h', 45], ['0,8 h', 48], ['1,2 h', 72], ['1,5 h', 90], ['2,5 h', 150], ['1,25 h', 75], ['1,1 h', 66], [fr(1, 6) + ' h', 10], [fr(1, 3) + ' h', 20], [fr(2, 3) + ' h', 40], [fr(5, 6) + ' h', 50], [fr(3, 4) + ' h', 45]]);
      return { text: `${t} = ? min`, a: String(a) };
    } },
    pctof: { label: 'Pourcentages rapides', fast: 6000, tip: 'pct10', f() {
      const p = pick([5, 10, 15, 20, 25, 30, 40, 60, 75]); let N; do N = int(2, 20) * 20; while (!Number.isInteger(N * p / 100));
      return { text: `${p} % de ${N}`, a: String(N * p / 100) };
    } },
    x25: { label: 'Multiplier par 25', fast: 5000, tip: 'x25', f() { const n = int(3, 48) * 2; return { text: `${n} × 25`, a: String(n * 25) }; } },
    x11: { label: 'Multiplier par 11', fast: 5000, tip: 'x11', f() { let n; do n = int(12, 98); while (n % 10 === 0); return { text: `${n} × 11`, a: String(n * 11) }; } },
    idrem: { label: 'Produits autour d\'un nombre rond', fast: 6000, tip: 'idrem', f() { const a = pick([20, 30, 40, 50, 60, 70]), b = int(1, 3); return { text: `${a - b} × ${a + b}`, a: String(a * a - b * b) }; } },
  };

  // ---------- Astuces (bibliothèque) ----------
  // chap : chapitre de rattachement ('mental' = calcul mental général)
  const TIPS = [
    { id: 'x25', chap: 'mental', title: 'Multiplier par 25', rule: '× 25 = × 100, puis ÷ 4.', ex: '36 × 25 = 3 600 ÷ 4 = 900' },
    { id: 'x11', chap: 'mental', title: 'Multiplier par 11', rule: 'Nombre à deux chiffres : écarte les chiffres et mets leur somme au milieu (retenue si elle dépasse 9).', ex: '43 × 11 = 473 ; 58 × 11 = 638' },
    { id: 'idrem', chap: 'mental', title: 'Produits autour d\'un nombre rond', rule: '(a − b)(a + b) = a² − b².', ex: '49 × 51 = 2 500 − 1 = 2 499 ; 38 × 42 = 1 600 − 4 = 1 596' },
    { id: 'sqnear', chap: 'mental', title: 'Carrés rapides', rule: '(a ± b)² = a² ± 2ab + b². Finissant par 5 : dizaine × (dizaine + 1), puis 25.', ex: '19² = 400 − 40 + 1 = 361 ; 35² : 3 × 4 = 12 → 1 225' },
    { id: 'dec', chap: 'mental', title: 'Multiplier des décimaux', rule: 'Calcule sans virgule, puis remets autant de décimales qu\'il y en a en tout dans les facteurs.', ex: '0,3 × 0,05 : 3 × 5 = 15, 3 décimales → 0,015' },
    { id: 'divdec', chap: 'mental', title: 'Diviser par un décimal', rule: 'Multiplie les deux nombres par 10 (ou 100) jusqu\'à avoir un diviseur entier.', ex: '6,3 ÷ 0,7 = 63 ÷ 7 = 9' },
    { id: 'fracpct', chap: 'mental', title: 'Fractions, décimaux, pourcentages', rule: 'À savoir par cœur : 1/8 = 12,5 % ; 3/8 = 37,5 % ; 1/3 ≈ 33,3 % ; 1/6 ≈ 16,7 % ; 1/20 = 5 % ; 1/25 = 4 %.', ex: '37,5 % de 64 = 3/8 × 64 = 24' },
    { id: 'pct10', chap: 'pct', title: 'Pourcentage par 10 %', rule: '10 % = ÷ 10 ; 5 % = moitié de 10 % ; 1 % = ÷ 100. Combine.', ex: '35 % de 240 = 3 × 24 + 12 = 84' },
    { id: 'pctswap', chap: 'pct', title: 'Inverser le pourcentage', rule: 'x % de y = y % de x. Choisis le sens le plus simple.', ex: '8 % de 25 = 25 % de 8 = 2' },
    { id: 'coef', chap: 'pct', title: 'Coefficients multiplicateurs', rule: '+t % → × (1 + t/100). Les variations successives se multiplient. Hausse puis baisse de t % : −t²/100 %.', ex: '+20 % puis −20 % : 1,2 × 0,8 = 0,96 → −4 %' },
    { id: 'pctrev', chap: 'pct', title: 'Retrouver la valeur de départ', rule: 'On divise par le coefficient ; on ne retire pas le pourcentage au prix final.', ex: 'Après +25 %, 150 € → 150 ÷ 1,25 = 120 €' },
    { id: 'base100', chap: 'pct', title: 'Base 100', rule: 'Quand l\'énoncé ne donne que des %, pars de 100 (ou 100 clients × 100 €).', ex: 'Prix −10 %, CA +17 % : clients = 117 ÷ 0,9 = 130 → +30 %' },
    { id: 'fracadd', chap: 'frac', title: 'Additionner des fractions', rule: 'Plus petit dénominateur commun ; on n\'additionne jamais les dénominateurs.', ex: '1/4 + 1/6 = 3/12 + 2/12 = 5/12' },
    { id: 'simplify', chap: 'frac', title: 'Simplifier avant de multiplier', rule: 'Simplifie en croix un numérateur avec un dénominateur avant de calculer.', ex: '14/15 × 25/28 = 1/3 × 5/2 = 5/6' },
    { id: 'divinv', chap: 'frac', title: 'Diviser par une fraction', rule: 'Multiplier par l\'inverse du diviseur.', ex: '3/4 ÷ 9/8 = 3/4 × 8/9 = 2/3' },
    { id: 'fracof', chap: 'frac', title: 'Fraction d\'un nombre', rule: 'Divise d\'abord par le dénominateur, multiplie ensuite.', ex: 'Les 3/7 de 84 : 84 ÷ 7 = 12, × 3 = 36' },
    { id: 'fraccmp', chap: 'frac', title: 'Comparer des fractions', rule: 'Produit en croix, ou ce qui manque pour arriver à 1.', ex: '7/8 > 6/7 car il manque 1/8 < 1/7' },
    { id: 'remain', chap: 'frac', title: 'Fractions du reste', rule: 'Multiplie les parts restantes.', ex: '1/3 puis 1/4 du reste : il reste 2/3 × 3/4 = 1/2' },
    { id: 'sumdiff', chap: 'eq', title: 'Somme et différence', rule: 'Grand = (S + D) ÷ 2 ; petit = (S − D) ÷ 2.', ex: 'S = 50, D = 12 → 31 et 19' },
    { id: 'backsolve', chap: 'eq', title: 'Tester les réponses', rule: 'Réponses triées : teste C. Trop grand → A ou B ; trop petit → D ou E. Souvent plus rapide qu\'une équation.', ex: 'Produit 70, écart 3 : teste 7 → 7 × 10 = 70 ✓' },
    { id: 'agegap', chap: 'eq', title: 'Problèmes d\'âges', rule: 'L\'écart d\'âge ne change jamais ; dans n ans, chacun prend n ans.', ex: 'Il y a 5 ans, somme 18 → aujourd\'hui somme 28' },
    { id: 'falsehyp', chap: 'eq', title: 'Fausse hypothèse', rule: 'Suppose que tout le monde a pris l\'option la moins grosse, puis répartis l\'écart.', ex: '8 clients à 5 ou 3 articles, 30 articles : 8 × 3 = 24, écart 6 ÷ 2 = 3 clients à 5' },
    { id: 'meansum', chap: 'moy', title: 'Somme = moyenne × effectif', rule: 'Pour fusionner, ajouter ou retirer, travaille sur les sommes, jamais sur les moyennes.', ex: '4 notes de moyenne 12 → total 48' },
    { id: 'meangap', chap: 'moy', title: 'Moyenne par les écarts', rule: 'Prends une valeur de référence et fais la moyenne des écarts.', ex: '87, 92, 95 : écarts à 90 = −3, +2, +5 → 90 + 4/3 ≈ 91,3' },
    { id: 'consec', chap: 'moy', title: 'Nombres régulièrement espacés', rule: 'Moyenne = terme du milieu = (premier + dernier) ÷ 2.', ex: 'Somme de 5 consécutifs = 5 × le nombre du milieu' },
    { id: 'minfrac', chap: 'vit', title: 'Minutes en fraction d\'heure', rule: 'Écris les minutes en fraction de 60 : 45 min = 3/4 h, 20 min = 1/3 h, jamais 0,45 h.', ex: '50 km en 40 min : 50 ÷ 2/3 = 75 km/h' },
    { id: 'harmonic', chap: 'vit', title: 'Vitesse moyenne', rule: 'Distance totale ÷ temps total. Aller-retour : 2 × V₁ × V₂ ÷ (V₁ + V₂).', ex: '60 et 40 km/h → 4 800 ÷ 100 = 48 km/h' },
    { id: 'closing', chap: 'vit', title: 'Croisement et rattrapage', rule: 'Sens opposés : on additionne les vitesses. Même sens : on les soustrait.', ex: 'Avance 30 km, 90 contre 75 km/h → 30 ÷ 15 = 2 h' },
    { id: 'workrate', chap: 'trav', title: 'Travailler à deux', rule: '1/T = 1/T₁ + 1/T₂, soit T = T₁ × T₂ ÷ (T₁ + T₂). Toujours plus court que le plus rapide seul.', ex: '3 h et 6 h → 18 ÷ 9 = 2 h' },
    { id: 'invprop', chap: 'trav', title: 'Proportion inverse', rule: 'Ouvriers × jours (ou heures × jours) reste constant.', ex: '6 ouvriers en 10 jours → 4 ouvriers : 60 ÷ 4 = 15 jours' },
    { id: 'hdec', chap: 'conv', title: 'Heures décimales', rule: 'Partie décimale × 60 : 0,1 h = 6 min ; 0,25 h = 15 min ; 0,75 h = 45 min.', ex: '2,35 h = 2 h 21 min' },
    { id: 'mskmh', chap: 'conv', title: 'm/s et km/h', rule: 'm/s → km/h : × 3,6. km/h → m/s : ÷ 3,6.', ex: '25 m/s = 90 km/h' },
    { id: 'units', chap: 'conv', title: 'Unités d\'aire et de volume', rule: 'Longueurs × 10 par unité ; aires × 100 ; volumes × 1 000. 1 L = 1 dm³ ; 1 ha = 10 000 m².', ex: '3,5 m² = 35 000 cm²' },
    { id: 'handshake', chap: 'salut', title: 'Poignées de main', rule: 'N × (N − 1) ÷ 2. Aller-retour ou 2 bises : N × (N − 1).', ex: '12 personnes → 66 poignées de main' },
    { id: 'elim', chap: 'salut', title: 'Tournoi à élimination directe', rule: 'Un match = un éliminé : N − 1 matchs.', ex: '64 joueurs → 63 matchs' },
  ];
  const TIP = Object.fromEntries(TIPS.map(t => [t.id, t]));
  // notions (types de QCM et automatismes) qui entraînent chaque astuce
  TIPS.forEach(t => { t.types = Object.values(T).filter(x => x.tip === t.id).map(x => x.id); t.autos = Object.entries(AUTO).filter(([, a]) => a.tip === t.id).map(([k]) => k); });

  // ---------- Chapitres ----------
  // w : poids estimé dans l'épreuve (part des 15 questions) ; step : étape de livraison dans l'app
  const CHAPTERS = [
    { id: 'eq', name: 'Équations et systèmes', fiches: '42–43, 66', freq: 5, w: 0.16, step: 1 },
    { id: 'pct', name: 'Pourcentages et base 100', fiches: '34, 70', freq: 5, w: 0.10, step: 1 },
    { id: 'moy', name: 'Moyennes', fiches: '38', freq: 4, w: 0.07, step: 1 },
    { id: 'frac', name: 'Fractions', fiches: '44', freq: 5, w: 0.06, step: 1 },
    { id: 'vit', name: 'Vitesses, croisements et rattrapage', fiches: '45, 47–49', freq: 5, w: 0.12, step: 2 },
    { id: 'trav', name: 'Temps de travail et production', fiches: '36, 46', freq: 4, w: 0.05, step: 2 },
    { id: 'conv', name: 'Conversions d\'unités', fiches: '50', freq: 4, w: 0.03, step: 2 },
    { id: 'salut', name: 'Rencontres et salutations', fiches: '64', freq: 2, w: 0.03, step: 2 },
    { id: 'geo', name: 'Géométrie', fiches: '54–58', freq: 5, w: 0.12, step: 3 },
    { id: 'proba', name: 'Probabilités', fiches: '60–62', freq: 4, w: 0.07, step: 3 },
    { id: 'int', name: 'Intérêts', fiches: '35', freq: 4, w: 0.04, step: 3 },
    { id: 'pui', name: 'Puissances et racines', fiches: '33', freq: 3, w: 0.04, step: 3 },
    { id: 'ent', name: 'Inconnues entières', fiches: '69', freq: 5, w: 0.03, step: 4 },
    { id: 'divers', name: 'Suites, Thalès, combinatoire…', fiches: '51–53, 59, 63…', freq: 2, w: 0.08, step: 'mars' },
  ];
  CHAPTERS.forEach(c => { c.ready = Object.values(T).some(t => t.chap === c.id); });
  const TIP_GROUPS = [{ id: 'mental', name: 'Calcul mental' }, ...CHAPTERS.map(c => ({ id: c.id, name: c.name }))];

  const FICHES = {
    pct: `<ul>
      <li>Hausse de t % : × (1 + t/100). Baisse de t % : × (1 − t/100). <span class="k">+20 %</span> = × 1,2 ; <span class="k">−15 %</span> = × 0,85.</li>
      <li>Variations successives : on <b>multiplie</b> les coefficients. +20 % puis −20 % = 1,2 × 0,8 = 0,96, soit <b>−4 %</b>.</li>
      <li>Variation en % = (arrivée − départ) ÷ <b>départ</b> × 100.</li>
      <li>Retrouver la valeur de départ : on <b>divise</b> par le coefficient. Jamais « retirer 20 % » à l'envers.</li>
      <li>Énoncé avec seulement des % : pars d'une <b>base 100</b> (100 clients à 100 €). Chiffre d'affaires = clients × prix.</li>
      <li>À connaître : 12,5 % = 1/8 · 25 % = 1/4 · 37,5 % = 3/8 · 62,5 % = 5/8 · 75 % = 3/4.</li></ul>`,
    frac: `<ul>
      <li>Additionner : d'abord le même dénominateur. On n'additionne <b>jamais</b> les dénominateurs.</li>
      <li>Multiplier : haut × haut, bas × bas. Diviser = multiplier par l'<b>inverse</b>.</li>
      <li>« Les a/b de N » : <b>divise d'abord</b> par b, puis multiplie par a.</li>
      <li>Comparer : passe en décimal, ou regarde ce qui manque pour arriver à 1.</li>
      <li>« 1/4 du reste » : multiplie les parts restantes. Après 1/3 puis 1/4 du reste, il reste 2/3 × 3/4 = <b>1/2</b>.</li>
      <li>Simplifie le plus tôt possible : les calculs restent petits.</li></ul>`,
    eq: `<ul>
      <li>Somme S et différence D : grand = (S + D) ÷ 2, petit = (S − D) ÷ 2.</li>
      <li>Traduis mot à mot : « k fois plus que » → A = k × B ; « d de plus que » → A = B + d.</li>
      <li>Âges : l'<b>écart</b> ne change jamais ; dans n ans, <b>chacun</b> prend n ans.</li>
      <li>Système : isole l'inconnue la plus simple et remplace-la dans l'autre équation.</li>
      <li><b>Tester les réponses</b> : elles sont triées. Teste celle du milieu (C), puis monte ou descends. Souvent plus rapide qu'une équation.</li>
      <li>Fausse hypothèse : « si tout le monde avait pris la petite option… », puis répartis l'écart.</li></ul>`,
    moy: `<ul>
      <li>Moyenne = somme ÷ nombre. Réflexe inverse : <b>somme = moyenne × nombre</b>.</li>
      <li>Fusionner deux groupes : on additionne les <b>sommes</b>, jamais les moyennes.</li>
      <li>Plus rapide : la <b>méthode des écarts</b> à une valeur de référence.</li>
      <li>Note nécessaire = total visé − total déjà obtenu.</li>
      <li>Nombres consécutifs (ou régulièrement espacés) : moyenne = terme du milieu = (premier + dernier) ÷ 2.</li>
      <li>Moyenne pondérée : Σ (note × coef) ÷ Σ coef ; elle penche vers la note au plus gros coefficient.</li></ul>`,
    vit: `<ul>
      <li>V = D ÷ T, D = V × T, T = D ÷ V. Mets tout dans les mêmes unités : <span class="k">45 min = 3/4 h</span>, jamais 0,45 h.</li>
      <li>Moyenne sur un aller-retour (même distance) : <b>2 × V₁ × V₂ ÷ (V₁ + V₂)</b>. Jamais la moyenne des vitesses.</li>
      <li>Distances différentes : distance totale ÷ temps total.</li>
      <li><b>Croisement</b> (sens opposés) : on additionne les vitesses. Temps = distance ÷ (V₁ + V₂).</li>
      <li><b>Rattrapage</b> (même sens) : temps = avance ÷ (V₂ − V₁). L'avance = distance déjà parcourue par le premier.</li>
      <li>Départ différé : fais d'abord rouler le premier seul, retire cette distance, puis applique la formule du croisement.</li></ul>`,
    trav: `<ul>
      <li>À deux, on additionne les vitesses de travail : <b>1/T = 1/T₁ + 1/T₂</b>, soit T = T₁ × T₂ ÷ (T₁ + T₂).</li>
      <li>Le temps à deux est toujours plus court que celui du plus rapide seul : ça élimine des réponses.</li>
      <li>Retrouver le temps d'un seul : 1/T₂ = 1/T − 1/T₁.</li>
      <li>Production = cadence × temps. Même unité de temps partout.</li>
      <li>Plus de monde ou plus d'heures par jour : le travail total ne change pas (ouvriers × jours = constante). Proportion <b>inverse</b>.</li></ul>`,
    conv: `<ul>
      <li>Heures décimales : la partie après la virgule × 60. <span class="k">2,5 h = 2 h 30</span>, <span class="k">0,1 h = 6 min</span>, <span class="k">0,75 h = 45 min</span>.</li>
      <li>Fractions d'heure : 1/6 h = 10 min · 1/4 h = 15 min · 1/3 h = 20 min · 2/3 h = 40 min.</li>
      <li>m/s → km/h : × 3,6. km/h → m/s : ÷ 3,6.</li>
      <li>Longueurs : × 10 d'une unité à l'autre ; aires : × 100 ; volumes : × 1 000.</li>
      <li>1 L = 1 dm³ = 1 000 cm³ ; 1 m³ = 1 000 L ; 1 ha = 10 000 m² ; 1 a = 100 m².</li>
      <li>1 jour = 1 440 min = 86 400 s. Additionner des durées : on retient 1 h à 60 minutes.</li></ul>`,
    salut: `<ul>
      <li>N personnes qui se saluent toutes une fois : <b>N × (N − 1) ÷ 2</b>. Même formule pour les lignes téléphoniques, les verres qui trinquent, un championnat en aller simple.</li>
      <li>Aller-retour, ou 2 bises par personne : <b>N × (N − 1)</b>.</li>
      <li>Tournoi à élimination directe : <b>N − 1</b> matchs (un éliminé par match).</li>
      <li>Retrouver N : N × (N − 1) = 2 × total. Cherche deux nombres consécutifs, ou teste les réponses.</li>
      <li>Deux groupes de n qui se saluent entre groupes seulement : n × n.</li></ul>`,
  };

  // ---------- API ----------
  function gen(type, d) {
    const t = T[type];
    const q = t.f(d || t.lvl);
    return { ...q, type, chap: t.chap, lvl: t.lvl, tip: q.tip || t.tip };
  }
  const typesOf = chap => Object.values(T).filter(t => t.chap === chap).map(t => t.id);

  // Contrôle de cohérence : 5 réponses distinctes, une seule bonne, causes valides, aucun calcul invalide
  function selfTest(n = 400) {
    const errs = [];
    for (const id of Object.keys(T)) {
      for (const d of [1, 2, 3]) for (let i = 0; i < n; i++) {
        const q = gen(id, d), keys = q.choices.map(c => c.k);
        const blob = q.text + q.exp + q.choices.map(c => c.h + (c.why ? c.why[1] : '')).join('');
        if (q.choices.length !== 5) errs.push(`${id}: ${q.choices.length} choix`);
        if (new Set(keys).size !== keys.length) errs.push(`${id}: doublon ${keys}`);
        if (!(q.ans >= 0 && q.ans < 5)) errs.push(`${id}: réponse introuvable`);
        if (q.choices[q.ans] && q.choices[q.ans].why) errs.push(`${id}: la bonne réponse porte une cause d'erreur`);
        q.choices.forEach(c => { if (c.why && !CAUSES[c.why[0]]) errs.push(`${id}: cause inconnue ${c.why[0]}`); });
        if (!TIP[q.tip]) errs.push(`${id}: astuce inconnue ${q.tip}`);
        if (/NaN|undefined|Infinity|null/.test(blob)) errs.push(`${id}: ${blob.match(/NaN|undefined|Infinity|null/)[0]} dans ${q.text}`);
      }
    }
    for (const [id, a] of Object.entries(AUTO)) {
      if (a.tip && !TIP[a.tip]) errs.push(`auto ${id}: astuce inconnue`);
      for (let i = 0; i < n; i++) { const q = a.f(); if (!/^\d+(,\d+)?$/.test(q.a)) errs.push(`auto ${id}: ${q.a}`); }
    }
    return [...new Set(errs)];
  }

  const G = { CHAPTERS, FICHES, AUTO, TYPES: T, TIPS, TIP, TIP_GROUPS, CAUSES, gen, typesOf, fr, nf, pick, int, selfTest };
  root.AMGen = G;
  if (typeof module !== 'undefined') module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
