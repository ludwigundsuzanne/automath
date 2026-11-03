// Générateurs de questions TAGE MAGE (calcul) : chapitres, QCM à 5 réponses, automatismes et fiches méthode.
// Chaque question est générée avec de nouveaux nombres ; les mauvaises réponses imitent les erreurs classiques.
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
  const eur = v => nf(v) + ' €';
  const kmh = v => nf(v) + ' km/h';
  const pad = n => String(n).padStart(2, '0');
  // durée en minutes → « 45 min », « 2 h », « 1 h 05 » ; heure de la journée en minutes → « 11 h 24 »
  const dur = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ' ' + pad(r) : ''}` : `${r} min`; };
  const hm = m => { m = Math.round(m); return `${Math.floor(m / 60)} h ${pad(m % 60)}`; };

  // Fraction affichée en hauteur ; réduite par défaut
  function fr(n, d, reduce = true) {
    if (reduce) { const g = gcd(n, d); n /= g; d /= g; }
    if (d === 1) return String(n);
    return `<span class="fr"><span>${n}</span><span>${d}</span></span>`;
  }
  const red = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };

  // QCM numérique : réponses triées dans l'ordre croissant (comme au TAGE MAGE, utile pour le backsolving)
  function numQ(meta, ans, ds, o = {}) {
    const step = o.step || 1, min = o.min ?? -Infinity, fmt = o.fmt || (v => nf(v)), dp = o.dp ?? 2;
    const key = v => nf(v, dp);
    const vals = [ans], seen = new Set([key(ans)]);
    const add = v => {
      if (vals.length >= 5 || !Number.isFinite(v)) return;
      v = Math.round(v * 10 ** dp) / 10 ** dp;
      if (v < min || seen.has(key(v))) return;
      seen.add(key(v)); vals.push(v);
    };
    ds.forEach(add);
    for (let k = 1; vals.length < 5 && k < 60; k++) { add(ans + k * step); add(ans - k * step); }
    vals.sort((a, b) => a - b);
    return { ...meta, choices: vals.map(v => ({ k: key(v), h: fmt(v) })), ans: vals.findIndex(v => key(v) === key(ans)) };
  }

  // QCM de fractions : dédoublonnées par valeur, triées
  function fracQ(meta, ans, ds, fill) {
    const k = f => red(f[0], f[1]).join('/');
    const vals = [red(...ans)], seen = new Set([k(ans)]);
    const add = f => {
      if (vals.length >= 5 || !f || f[1] <= 0 || f[0] <= 0) return;
      const r = red(f[0], f[1]); if (seen.has(k(r))) return;
      seen.add(k(r)); vals.push(r);
    };
    ds.forEach(add);
    for (let i = 1; vals.length < 5 && i < 40; i++) fill(i).forEach(add);
    vals.sort((a, b) => a[0] / a[1] - b[0] / b[1]);
    const ak = k(ans);
    return { ...meta, choices: vals.map(f => ({ k: k(f), h: fr(f[0], f[1]) })), ans: vals.findIndex(f => k(f) === ak) };
  }

  const pctDecomp = (N, p) => {
    const a = N * p / 100;
    const special = { 12.5: `12,5 % = ${fr(1, 8)}, donc ${N} ÷ 8 = ${nf(a)}`, 25: `25 % = ${fr(1, 4)}, donc ${N} ÷ 4 = ${nf(a)}`, 50: `50 % = la moitié : ${nf(a)}`,
      75: `75 % = ${fr(3, 4)} : ${N} ÷ 4 × 3 = ${nf(a)}`, 120: `120 % = 100 % + 20 % : ${N} + ${nf(N / 5)} = ${nf(a)}`, 150: `150 % = 100 % + 50 % : ${N} + ${nf(N / 2)} = ${nf(a)}` };
    if (special[p]) return special[p];
    const t = N / 10, tens = Math.floor(p / 10), five = p % 10 === 5;
    if (!tens) return `10 % de ${N} = ${nf(t)}, donc 5 % = la moitié : ${nf(a)}`;
    return `10 % de ${N} = ${nf(t)}. ${p} % = ${tens} × 10 %${five ? ' + 5 %' : ''} : ${tens} × ${nf(t)}${five ? ` + ${nf(t / 2)}` : ''} = ${nf(a)}`;
  };

  // ---------- Générateurs ----------
  const T = {};
  const def = (id, chap, lvl, label, f) => { T[id] = { id, chap, lvl, label, f }; };

  // ===== Pourcentages et base 100 =====
  def('pct.of', 'pct', 1, 'Pourcentage d\'un nombre', () => {
    const p = pick([5, 10, 12.5, 15, 20, 25, 30, 35, 40, 45, 60, 75, 120, 150]);
    let N; do N = int(2, 40) * 10; while (!Number.isInteger(N * p / 100));
    const a = N * p / 100;
    return numQ({ text: `Combien font ${nf(p)} % de ${N} ?`, exp: `<p>${pctDecomp(N, p)}.</p><p>Calcule à partir de 10 % (diviser par 10), c'est plus rapide que ${N} × ${nf(p / 100)}.</p>` },
      a, [N * p / 1000, N * (p + 5) / 100, N * (p - 5) / 100, N - a, 2 * a], { step: Math.max(1, N / 20), min: 0 });
  });

  def('pct.succ', 'pct', 2, 'Hausses et baisses successives', () => {
    const a = pick([10, 20, 25, 30, 40, 50]), b = pick([10, 20, 25, 30, 40, 50]);
    const kind = int(0, 2), s1 = kind === 1 ? -1 : 1, s2 = kind === 0 ? -1 : 1;
    const c1 = 1 + s1 * a / 100, c2 = 1 + s2 * b / 100, c = c1 * c2, v = Math.round((c - 1) * 10000) / 100;
    const naive = s1 * a + s2 * b;
    const verb = s => (s > 0 ? 'augmente' : 'baisse');
    return numQ({ text: `Un prix ${verb(s1)} de ${a} %, puis ${verb(s2)} de ${b} %. Quelle est la variation totale ?`,
      exp: `<p>On multiplie les coefficients : ${nf(c1)} × ${nf(c2)} = ${nf(c, 4)}, soit ${pf(v)}.</p><p>${kind === 2 ? `On n'additionne pas : ${a} + ${b} = ${a + b} % serait faux.` : 'Deux variations de sens contraire ne s\'annulent pas : on n\'additionne jamais les pourcentages.'}</p>` },
    v, [naive, 2 * naive - v, 0, naive / 2], { step: 2, fmt: pf });
  });

  def('pct.var', 'pct', 1, 'Variation en pourcentage', () => {
    const p = pick([-50, -40, -25, -20, -10, 10, 20, 25, 40, 50, 60, 75]);
    let X; do X = int(2, 30) * 10; while (!Number.isInteger(X * (1 + p / 100)));
    const Y = X * (1 + p / 100);
    return numQ({ text: `Un article passe de ${eur(X)} à ${eur(Y)}. Quelle est la variation en pourcentage ?`,
      exp: `<p>(arrivée − départ) ÷ départ = (${Y} − ${X}) ÷ ${X} = ${nf(Y - X)} ÷ ${X} = ${pf(p)}.</p><p>On divise toujours par la valeur de départ.</p>` },
    p, [Math.round((Y - X) / Y * 1000) / 10, -p, Y - X, p / 2], { step: 5, fmt: pf, dp: 1 });
  });

  def('pct.rev', 'pct', 2, 'Retrouver la valeur de départ', () => {
    const p = pick([10, 20, 25, 50]), up = Math.random() < 0.6, s = up ? p : -p;
    let X; do X = int(2, 30) * 20; while (!Number.isInteger(X * (1 + s / 100)));
    const c = 1 + s / 100, Y = X * c, naive = Y * (1 - s / 100);
    const text = up ? `Après une hausse de ${p} %, un vélo coûte ${eur(Y)}. Quel était son prix avant la hausse ?`
      : `Après une remise de ${p} %, un manteau coûte ${eur(Y)}. Quel était son prix avant la remise ?`;
    return numQ({ text, exp: `<p>Prix de départ = ${Y} ÷ ${nf(c)} = ${eur(X)}. Vérifie : ${X} × ${nf(c)} = ${Y}.</p><p>Piège : ${up ? 'retirer' : 'ajouter'} ${p} % à ${Y} donne ${eur(naive)}, car le pourcentage ne porte pas sur le même montant.</p>` },
    X, [naive, up ? Y - p : Y + p, X * 1.05], { step: X >= 200 ? 20 : 10, fmt: eur, min: 1 });
  });

  def('pct.ca', 'pct', 3, 'Base 100 : chiffre d\'affaires', () => {
    let pp, k, cv;
    do { pp = pick([-20, -10, 10, 20, 25]); k = pick([-20, -10, 10, 20, 30, 50]); cv = Math.round(((1 + pp / 100) * (1 + k / 100) - 1) * 1000) / 10; } while (cv === 0 || Math.abs(cv - ((1 + pp / 100) * (1 + k / 100) - 1) * 100) > 1e-6);
    const ca = 10000 * (1 + cv / 100);
    return numQ({ text: `Le prix d'un ticket ${pp < 0 ? 'baisse' : 'augmente'} de ${Math.abs(pp)} %. Le chiffre d'affaires ${cv < 0 ? 'baisse' : 'augmente'} de ${nf(Math.abs(cv))} %. Comment a varié le nombre de clients ?`,
      exp: `<p>Base 100 : 100 clients à 100 € = 10 000 €. Après : prix ${100 + pp} €, chiffre d'affaires ${eur(ca)}.</p><p>Clients = ${nf(ca)} ÷ ${100 + pp} = ${100 + k}, soit ${pf(k)}. Rappel : chiffre d'affaires = clients × prix.</p>` },
    k, [cv - pp, cv + pp, -k, k / 2], { step: 5, fmt: pf, dp: 1 });
  });

  def('pct.share', 'pct', 2, 'Partage en pourcentages', () => {
    let p, k, C; do { p = pick([10, 20, 25, 40, 50, 55, 70]); k = int(1, 4); C = (100 - p) / (k + 1); } while (!Number.isInteger(C));
    return numQ({ text: `Trois amis se partagent une somme. Alice en reçoit ${p} %. Bruno reçoit ${k === 1 ? 'autant que' : k + ' fois plus que'} Chloé. Quel pourcentage de la somme reçoit Chloé ?`,
      exp: `<p>Base 100 : il reste 100 − ${p} = ${100 - p} % pour Bruno et Chloé.</p><p>Bruno = ${k} × Chloé, soit ${k + 1} parts égales en tout : ${100 - p} ÷ ${k + 1} = ${C} %.</p>` },
    C, [(100 - p) / k, k * C, p / (k + 1), 100 - p - C * 2], { step: 5, min: 1, fmt: v => nf(v) + ' %' });
  });

  // ===== Fractions =====
  def('frac.add', 'frac', 1, 'Additionner des fractions', () => {
    let a, b, c, d, minus;
    do { b = int(2, 9); d = int(2, 9); a = int(1, b - 1); c = int(1, d - 1); minus = Math.random() < 0.4; } while (b === d || (minus && a / b <= c / d));
    const L = lcm(b, d), n = a * L / b + (minus ? -1 : 1) * c * L / d, sg = minus ? '−' : '+';
    const ans = red(n, L);
    return fracQ({ text: `Combien font ${fr(a, b)} ${sg} ${fr(c, d)} ?`,
      exp: `<p>Même dénominateur (${L}) : ${fr(a, b)} = ${fr(a * L / b, L, false)} et ${fr(c, d)} = ${fr(c * L / d, L, false)}.</p><p>Donc ${fr(a * L / b, L, false)} ${sg} ${fr(c * L / d, L, false)} = ${fr(n, L, false)}${gcd(n, L) > 1 ? ' = ' + fr(n, L) : ''}. On n'additionne jamais les dénominateurs.</p>` },
    ans, [[minus ? a - c : a + c, b + d], [a * c, b * d], [minus ? a - c : a + c, b * d]], i => [[n + i, L], [n - i, L]]);
  });

  def('frac.mul', 'frac', 1, 'Multiplier et diviser', () => {
    const a = int(1, 9), b = int(2, 9), c = int(1, 9), d = int(2, 9), div = Math.random() < 0.5;
    if (div) {
      return fracQ({ text: `Combien font ${fr(a, b)} ÷ ${fr(c, d)} ?`,
        exp: `<p>Diviser par ${fr(c, d)}, c'est multiplier par son inverse ${fr(d, c, false)} : ${fr(a, b)} × ${fr(d, c, false)} = ${fr(a * d, b * c, false)}${gcd(a * d, b * c) > 1 ? ' = ' + fr(a * d, b * c) : ''}.</p>` },
      [a * d, b * c], [[a * c, b * d], [b * c, a * d], [a + d, b + c]], i => [[a * d + i, b * c], [a * d, b * c + i]]);
    }
    return fracQ({ text: `Combien font ${fr(a, b)} × ${fr(c, d)} ?`,
      exp: `<p>On multiplie en haut et en bas : ${fr(a * c, b * d, false)}${gcd(a * c, b * d) > 1 ? ' = ' + fr(a * c, b * d) : ''}. Simplifie avant de multiplier quand c'est possible.</p>` },
    [a * c, b * d], [[a * d, b * c], [a + c, b + d], [a * c, b + d]], i => [[a * c + i, b * d], [a * c, b * d + i]]);
  });

  def('frac.of', 'frac', 1, 'Fraction d\'un nombre', () => {
    const b = pick([3, 4, 5, 6, 8, 10, 12]); let a; do a = int(1, b - 1); while (gcd(a, b) > 1);
    const N = b * int(3, 15), ans = N / b * a;
    return numQ({ text: `Combien font les ${fr(a, b)} de ${N} ?`, exp: `<p>Divise d'abord, multiplie ensuite : ${N} ÷ ${b} = ${N / b}, puis × ${a} = ${ans}.</p>` },
      ans, [N / b, N - ans, ans + N / b, N * a / (b + a)], { step: N / b, min: 1 });
  });

  def('frac.cmp', 'frac', 2, 'Comparer des fractions', () => {
    const fs = [], seen = new Set();
    while (fs.length < 5) {
      const b = int(3, 13), a = int(Math.ceil(b * 0.45), Math.floor(b * 0.92));
      if (a < 1 || a >= b) continue;
      const [n, d] = red(a, b), v = (n / d).toFixed(6);
      if (seen.has(v)) continue; seen.add(v); fs.push([n, d]);
    }
    shuffle(fs);
    const vals = fs.map(f => f[0] / f[1]), ans = vals.indexOf(Math.max(...vals));
    const sorted = fs.slice().sort((x, y) => y[0] / y[1] - x[0] / x[1]);
    return { text: 'Quelle est la plus grande de ces fractions ?', choices: fs.map(f => ({ k: f.join('/'), h: fr(f[0], f[1]) })), ans,
      exp: `<p>En décimal : ${sorted.map(f => `${fr(f[0], f[1])} ≈ ${nf(f[0] / f[1])}`).join(' ; ')}.</p><p>Astuce : compare ce qui manque pour arriver à 1. La plus grande fraction est celle à qui il manque le moins.</p>` };
  });

  def('frac.tank', 'frac', 2, 'Parts d\'un tout', () => {
    const b = pick([4, 5, 6, 8, 10]), a = int(1, b - 2), c = int(a + 1, b - 1), C = b * int(2, 12), k = (c - a) * C / b;
    return numQ({ text: `Une cuve est remplie aux ${fr(a, b)}. On ajoute ${k} L : elle est maintenant remplie aux ${fr(c, b)}. Quelle est sa capacité ?`,
      exp: `<p>Les ${k} L correspondent à ${fr(c, b, false)} − ${fr(a, b, false)} = ${fr(c - a, b, false)} de la cuve.</p><p>Capacité = ${k} × ${b} ÷ ${c - a} = ${C} L.</p>` },
    C, [k * b / c, k * b / a, k * (c - a), C / 2], { step: b, min: 1, fmt: v => nf(v) + ' L' });
  });

  def('frac.rest', 'frac', 3, 'Fractions du reste', () => {
    const p = pick([2, 3, 4, 5]), q = pick([2, 3, 4, 5, 6]), S = p * q * int(2, 10) * 10;
    const R = S * (p - 1) / p * (q - 1) / q, f = red((p - 1) * (q - 1), p * q);
    const [nm] = two();
    return numQ({ text: `${nm} dépense ${fr(1, p)} de son salaire pour le loyer, puis ${fr(1, q)} de ce qui reste pour les courses. Il reste ${eur(R)}. Quel est le salaire ?`,
      exp: `<p>Après le loyer, il reste ${fr(p - 1, p)} du salaire ; après les courses, ${fr(q - 1, q)} de ce reste.</p><p>Il reste donc ${fr(p - 1, p)} × ${fr(q - 1, q)} = ${fr(f[0], f[1])} du salaire. Salaire = ${nf(R)} × ${f[1]} ÷ ${f[0]} = ${eur(S)}.</p>` },
    S, [R / (1 - 1 / p - 1 / q), R * p / (p - 1), R * q / (q - 1), R + S / p], { step: S / 10, min: 1, fmt: eur });
  });

  // ===== Équations et systèmes =====
  def('eq.sumdiff', 'eq', 1, 'Somme et différence', () => {
    const s = int(5, 60), g = s + int(2, 40), S = g + s, D = g - s, big = Math.random() < 0.5;
    return numQ({ text: `La somme de deux nombres vaut ${S} et leur différence vaut ${D}. Quel est le plus ${big ? 'grand' : 'petit'} ?`,
      exp: `<p>Plus grand = (somme + différence) ÷ 2 = (${S} + ${D}) ÷ 2 = ${g}.</p><p>Plus petit = (somme − différence) ÷ 2 = (${S} − ${D}) ÷ 2 = ${s}.</p>` },
    big ? g : s, [S / 2, big ? s : g, D, big ? S + D : S - D], { min: 1 });
  });

  def('eq.prodiff', 'eq', 1, 'Produit et différence', () => {
    const a = int(3, 13), d = int(2, 9), b = a + d, P = a * b, small = Math.random() < 0.6;
    return numQ({ text: `Le produit de deux nombres entiers positifs vaut ${P} et leur différence vaut ${d}. Quel est le plus ${small ? 'petit' : 'grand'} ?`,
      exp: `<p>Pas besoin d'équation : teste les réponses. ${a} × ${b} = ${P} et ${b} − ${a} = ${d} ✓.</p><p>Le plus petit vaut ${a}, le plus grand ${b}.</p>` },
    small ? a : b, [small ? b : a, d, small ? a + 1 : b + 1, small ? a - 1 : b - 1], { min: 1 });
  });

  def('eq.ages', 'eq', 2, 'Âges dans le futur', () => {
    const k = int(4, 12), m = int(3, 6), M = k * m;
    const goals = [50, 60, 70, 80, 90, 100].filter(t => t > M + 3); const Tg = pick(goals);
    const ans = k + Tg - M, [nm] = two();
    return numQ({ text: `${nm} a ${k} ans. Sa mère a ${m} fois son âge. Quel âge aura ${nm} quand sa mère aura ${Tg} ans ?`,
      exp: `<p>Sa mère a ${k} × ${m} = ${M} ans. Elle aura ${Tg} ans dans ${Tg - M} ans ; ${nm} aura alors ${k} + ${Tg - M} = ${ans} ans.</p><p>Piège : ${Tg} ÷ ${m} ne marche pas. Le rapport des âges change avec le temps, l'écart reste fixe.</p>` },
    ans, [Math.round(Tg / m), Tg - M, ans + k, ans - 2], { min: 1, fmt: v => nf(v) + ' ans' });
  });

  def('eq.past', 'eq', 2, 'Âges dans le passé', () => {
    const n = int(2, 8), b = int(n + 6, 40), A = int(n + 6, 45), S = (A - n) + (b - n), [x, y] = two();
    return numQ({ text: `Il y a ${n} ans, la somme des âges de ${x} et de ${y} était de ${S} ans. ${y} a aujourd'hui ${b} ans. Quel âge a ${x} aujourd'hui ?`,
      exp: `<p>Il y a ${n} ans, chacun avait ${n} ans de moins : (${x} − ${n}) + (${b} − ${n}) = ${S}.</p><p>Donc ${x} = ${S} + ${2 * n} − ${b} = ${A} ans. Pense à enlever les ${n} ans aux deux personnes.</p>` },
    A, [S - b, S - b + n, S - b + 3 * n, S + n - b + 1], { min: 1, fmt: v => nf(v) + ' ans' });
  });

  def('eq.market', 'eq', 2, 'Système : deux prix', () => {
    let L, F; do { L = int(2, 8) / 2; F = int(2, 10) / 2; } while (L === F);
    const [[a1, b1], [a2, b2]] = pick([[[3, 2], [2, 1]], [[2, 3], [1, 2]], [[4, 1], [1, 1]], [[3, 1], [1, 2]], [[2, 5], [1, 2]], [[5, 2], [2, 1]]]);
    const T1 = a1 * L + b1 * F, T2 = a2 * L + b2 * F;
    return numQ({ text: `Au marché, ${a1} kg de légumes et ${b1} kg de fruits coûtent ${eur(T1)}. ${a2} kg de légumes et ${b2} kg de fruits coûtent ${eur(T2)}. Combien coûte 1 kg de légumes ?`,
      exp: `<p>Teste les réponses. Avec 1 kg de légumes à ${eur(L)} : la 2e phrase donne ${a2} × ${nf(L)} = ${eur(a2 * L)}, il reste ${eur(T2 - a2 * L)} pour ${b2} kg de fruits, soit ${eur(F)} le kilo.</p><p>Vérifie avec la 1re : ${a1} × ${nf(L)} + ${b1} × ${nf(F)} = ${eur(T1)} ✓.</p>` },
    L, [F, T1 / (a1 + b1), T2 / (a2 + b2), L + 0.5], { step: 0.5, min: 0.5, fmt: eur });
  });

  def('eq.money', 'eq', 3, 'Système : sommes d\'argent', () => {
    let J, s, k, d; do { J = int(3, 15) * 100; s = pick([100, 200, 300, 400]); k = int(2, 4); d = k * (J - s) - J; } while (J <= s || d <= 0 || d > 2000);
    const [x, y] = two();
    return numQ({ text: `${x} a ${eur(d)} de plus que ${y}. Si ${y} dépensait ${eur(s)}, ${x} aurait ${k} fois plus d'argent que ${y}. Combien d'argent a ${y} ?`,
      exp: `<p>Soit n l'argent de ${y} : n + ${d} = ${k} × (n − ${s}), donc ${k - 1 === 1 ? '' : (k - 1) + ' × '}n = ${d} + ${k * s}, soit n = ${eur(J)}.</p><p>Plus rapide, teste les réponses : avec ${J} €, ${x} a ${J + d} € et ${k} × (${J} − ${s}) = ${J + d} ✓.</p>` },
    J, [J + d, J - s, J + 100, J - 100], { step: 100, min: 100, fmt: eur });
  });

  def('eq.shop', 'eq', 2, 'Fausse hypothèse', () => {
    const x = int(5, 9), y = int(2, 4), N = int(4, 10), P = int(1, N - 1), V = N - P, Tt = x * V + y * P;
    return numQ({ text: `Dans une boutique, chaque client achète soit ${x} cahiers, soit ${y} classeurs. Aujourd'hui, ${N} clients ont acheté ${Tt} articles au total. Combien de classeurs ont été vendus ?`,
      exp: `<p>Si les ${N} clients avaient tous pris des classeurs : ${N} × ${y} = ${N * y} articles. Il y en a ${Tt - N * y} de plus, et chaque client « cahiers » en ajoute ${x - y}.</p><p>Donc ${V} clients ont pris des cahiers, ${P} des classeurs : ${P} × ${y} = ${y * P} classeurs.</p>` },
    y * P, [P, V, x * V, y * V], { step: y, min: 1 });
  });

  def('eq.part', 'eq', 1, 'Nombre et sa fraction', () => {
    const q = pick([2, 3, 4, 5]), x = q * int(2, 15), N = x + x / q;
    const word = { 2: 'sa moitié', 3: 'son tiers', 4: 'son quart', 5: 'son cinquième' }[q];
    return numQ({ text: `Un nombre augmenté de ${word} donne ${N}. Quel est ce nombre ?`,
      exp: `<p>Le nombre plus ${word}, c'est ${fr(q + 1, q)} du nombre. Nombre = ${N} × ${q} ÷ ${q + 1} = ${x}.</p><p>Vérifie : ${x} + ${x / q} = ${N}.</p>` },
    x, [N - N / q, N / (q + 1), x + q, N - q], { step: q, min: 1 });
  });

  // ===== Moyennes =====
  def('moy.merge', 'moy', 2, 'Fusionner deux groupes', () => {
    let n1, n2, m1, m2, t; do { n1 = int(4, 12); n2 = int(4, 12); m1 = int(20, 45); m2 = int(20, 45); t = (n1 * m1 + n2 * m2) / (n1 + n2); } while (n1 === n2 || m1 === m2 || !Number.isInteger(t));
    return numQ({ text: `Dans une salle, ${n1} personnes ont ${m1} ans de moyenne. Dans une autre, ${n2} personnes ont ${m2} ans de moyenne. Quelle est la moyenne d'âge de l'ensemble ?`,
      exp: `<p>On additionne les sommes, pas les moyennes : ${n1} × ${m1} = ${n1 * m1} et ${n2} × ${m2} = ${n2 * m2}.</p><p>${n1 * m1 + n2 * m2} ans pour ${n1 + n2} personnes : ${n1 * m1 + n2 * m2} ÷ ${n1 + n2} = ${t} ans.</p>` },
    t, [(m1 + m2) / 2, (n2 * m1 + n1 * m2) / (n1 + n2)], { min: 1, dp: 1, fmt: v => nf(v, 1) + ' ans' });
  });

  def('moy.add', 'moy', 1, 'Ajouter une valeur', () => {
    let n, m, v, t; do { n = int(3, 6); m = int(12, 40); v = int(5, 60); t = (n * m + v) / (n + 1); } while (v === m || !Number.isInteger(t));
    return numQ({ text: `${n} amis ont ${m} ans de moyenne. Un ami de ${v} ans les rejoint. Quelle est la nouvelle moyenne d'âge ?`,
      exp: `<p>Somme des âges : ${n} × ${m} = ${n * m}. On ajoute ${v} : ${n * m + v} ans pour ${n + 1} personnes, soit ${t} ans.</p>` },
    t, [(m + v) / 2, m, (n * m + v) / n], { min: 1, dp: 1, fmt: v => nf(v, 1) + ' ans' });
  });

  def('moy.need', 'moy', 1, 'Note nécessaire', () => {
    let n, Tm, g, need; do { n = int(3, 5); Tm = int(10, 15); g = Array.from({ length: n - 1 }, () => int(6, 18)); need = n * Tm - g.reduce((a, b) => a + b, 0); } while (need < 0 || need > 20);
    const sum = n * Tm - need, [nm] = two(), list = g.slice(0, -1).join(', ') + ' et ' + g[g.length - 1];
    return numQ({ text: `${nm} a obtenu ${list} à ses ${n - 1} premiers devoirs. Quelle note faut-il au ${n}e devoir pour avoir exactement ${Tm} de moyenne ?`,
      exp: `<p>Il faut un total de ${n} × ${Tm} = ${n * Tm} points. ${nm} en a déjà ${sum}.</p><p>Il manque ${n * Tm} − ${sum} = ${need}.</p>` },
    need, [Tm, 2 * Tm - Math.round(sum / (n - 1)), need + n - 1], { min: 0 });
  });

  def('moy.consec', 'moy', 2, 'Nombres consécutifs', () => {
    const k = pick([3, 5, 7]), mid = int(10, 60), h = (k - 1) / 2;
    if (Math.random() < 0.5) {
      return numQ({ text: `On considère ${k} nombres entiers consécutifs. La moyenne du plus petit et du plus grand vaut ${mid}. Quelle est leur somme ?`,
        exp: `<p>Pour des nombres consécutifs, la moyenne de tous = la moyenne du premier et du dernier = ${mid}.</p><p>Somme = ${k} × ${mid} = ${k * mid}.</p>` },
      k * mid, [2 * mid, (k - 1) * mid, (k + 1) * mid, k * mid + k], { step: k, min: 1 });
    }
    return numQ({ text: `La somme de ${k} nombres entiers consécutifs vaut ${k * mid}. Quel est le plus grand ?`,
      exp: `<p>Le nombre du milieu = somme ÷ ${k} = ${mid}. Les ${k} nombres vont de ${mid - h} à ${mid + h}.</p>` },
    mid + h, [mid, mid + k - 1, mid + h + 1, mid - h], { min: 1 });
  });

  def('moy.coef', 'moy', 2, 'Moyenne pondérée', () => {
    let a, b, x, y; do { a = int(6, 18); b = int(6, 18); x = int(1, 4); y = int(1, 4); } while (x === y || a === b || ((a * x + b * y) * 2) % (x + y) !== 0);
    const m = (a * x + b * y) / (x + y), [nm] = two();
    return numQ({ text: `${nm} a eu ${a} en maths (coefficient ${x}) et ${b} en français (coefficient ${y}). Quelle est sa moyenne ?`,
      exp: `<p>(${a} × ${x} + ${b} × ${y}) ÷ (${x} + ${y}) = ${a * x + b * y} ÷ ${x + y} = ${nf(m)}.</p><p>La moyenne se rapproche de la note qui a le plus gros coefficient.</p>` },
    m, [(a + b) / 2, (a * y + b * x) / (x + y)], { step: 0.5, min: 0 });
  });

  // ===== Vitesses, croisements et rattrapage =====
  def('vit.base', 'vit', 1, 'Vitesse, distance, temps', () => {
    const T = pick([15, 20, 30, 40, 45, 50, 75, 90, 100, 120, 150]);
    let v; do v = int(4, 24) * 5; while (!Number.isInteger(v * T / 60));
    const D = v * T / 60;
    if (Math.random() < 0.5) {
      return numQ({ text: `Un train parcourt ${D} km en ${dur(T)}. Quelle est sa vitesse moyenne ?`,
        exp: `<p>${dur(T)} = ${fr(T, 60)} h. Vitesse = distance ÷ temps = ${D} × 60 ÷ ${T} = ${kmh(v)}.</p><p>Piège : ${dur(T)} ne vaut pas ${nf(T / 100)} h. Une heure fait 60 minutes, pas 100.</p>` },
      v, [D / (T / 100), D * T / 60, v * 1.2, D], { step: 5, min: 1, dp: 0, fmt: kmh });
    }
    const hours = D / v, naive = Math.floor(hours) * 60 + Math.round((hours % 1) * 100);
    return numQ({ text: `À ${kmh(v)}, combien de temps faut-il pour parcourir ${D} km ?`,
      exp: `<p>Temps = distance ÷ vitesse = ${D} ÷ ${v} = ${nf(hours)} h.</p>${hours % 1 ? `<p>La partie décimale se multiplie par 60 : ${nf(hours % 1)} × 60 = ${T % 60} min. Donc ${dur(T)}, pas ${Math.floor(hours)} h ${Math.round((hours % 1) * 100)}.</p>` : ''}` },
    T, [naive, T + 15, T - 15], { step: 5, min: 5, dp: 0, fmt: dur });
  });

  def('vit.ar', 'vit', 2, 'Moyenne sur un aller-retour', () => {
    const [v1, v2] = shuffle(pick([[60, 40], [30, 60], [90, 60], [120, 80], [50, 75], [100, 150], [20, 30], [120, 60], [45, 90], [36, 60], [70, 105], [40, 120], [60, 180], [48, 80]]).slice());
    const m = 2 * v1 * v2 / (v1 + v2), d = lcm(v1, v2);
    return numQ({ text: `Un automobiliste fait l'aller à ${kmh(v1)} et le retour, sur la même route, à ${kmh(v2)}. Quelle est sa vitesse moyenne sur l'aller-retour ?`,
      exp: `<p>Ce n'est pas la moyenne des deux vitesses : on roule plus longtemps à la vitesse la plus lente.</p><p>Formule : 2 × ${v1} × ${v2} ÷ (${v1} + ${v2}) = ${kmh(m)}. Ou prends une distance pratique de ${d} km : aller ${nf(d / v1)} h, retour ${nf(d / v2)} h, soit ${2 * d} km en ${nf(d / v1 + d / v2)} h = ${kmh(m)}.</p>` },
    m, [(v1 + v2) / 2, Math.min(v1, v2), Math.max(v1, v2), (v1 + v2) / 2 + 2], { step: 2, min: 1, dp: 0, fmt: kmh });
  });

  def('vit.legs', 'vit', 2, 'Moyenne sur deux tronçons', () => {
    let v1, v2, t1, t2, m;
    do { v1 = int(3, 12) * 10; v2 = int(3, 12) * 10; t1 = pick([0.5, 1, 1.5, 2, 2.5, 3]); t2 = pick([0.5, 1, 1.5, 2, 2.5, 3]); m = (v1 * t1 + v2 * t2) / (t1 + t2); }
    while (v1 === v2 || t1 === t2 || !Number.isInteger(m));
    const D1 = v1 * t1, D2 = v2 * t2;
    return numQ({ text: `Un automobiliste roule ${D1} km à ${kmh(v1)}, puis ${D2} km à ${kmh(v2)}. Quelle est sa vitesse moyenne sur l'ensemble du trajet ?`,
      exp: `<p>Temps : ${D1} ÷ ${v1} = ${nf(t1)} h, puis ${D2} ÷ ${v2} = ${nf(t2)} h.</p><p>Vitesse moyenne = distance totale ÷ temps total = ${D1 + D2} ÷ ${nf(t1 + t2)} = ${kmh(m)}. Jamais la moyenne des deux vitesses (${nf((v1 + v2) / 2)}).</p>` },
    m, [(v1 + v2) / 2, (D1 + D2) / (t1 + t2 + 0.5), m + 5], { step: 2, min: 1, dp: 0, fmt: kmh });
  });

  def('vit.catch', 'vit', 3, 'Rattrapage', () => {
    let e, t, dt, vA, av;
    do { e = pick([10, 12, 15, 20, 25, 30]); t = pick([1, 1.5, 2, 2.5, 3, 4]); av = e * t; dt = pick([0.5, 1, 1.5, 2, 3]); vA = av / dt; } while (!Number.isInteger(vA) || vA < 20 || vA > 110);
    const vB = vA + e, start = int(7, 13) * 60, bStart = start + dt * 60, at = bStart + t * 60, [x, y] = two();
    return numQ({ text: `${x} part à ${hm(start)} et roule à ${kmh(vA)}. ${y} part du même endroit à ${hm(bStart)}, dans la même direction, à ${kmh(vB)}. À quelle heure a lieu le rattrapage ?`,
      exp: `<p>Quand ${y} part, ${x} a déjà ${nf(dt)} h × ${vA} = ${av} km d'avance.</p><p>${y} gagne ${vB} − ${vA} = ${e} km par heure : il faut ${av} ÷ ${e} = ${nf(t)} h, soit ${dur(t * 60)}. Rattrapage à ${hm(bStart)} + ${dur(t * 60)} = ${hm(at)}.</p>` },
    at, [bStart + av / vB * 60, bStart + av / (vA + vB) * 60, start + t * 60, at + 30], { step: 30, dp: 0, fmt: hm });
  });

  def('vit.cross', 'vit', 2, 'Croisement', () => {
    let v1, v2; do { v1 = int(4, 12) * 10; v2 = int(4, 12) * 10; } while (v1 === v2);
    const t = pick([0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]), D = (v1 + v2) * t;
    const intro = `Deux voitures partent en même temps de deux villes A et B distantes de ${D} km et roulent l'une vers l'autre, la première (partie de A) à ${kmh(v1)}, la seconde à ${kmh(v2)}.`;
    if (Math.random() < 0.5) {
      return numQ({ text: `${intro} Au bout de combien de temps se croisent-elles ?`,
        exp: `<p>Elles se rapprochent de ${v1} + ${v2} = ${v1 + v2} km chaque heure.</p><p>Temps = ${D} ÷ ${v1 + v2} = ${nf(t)} h = ${dur(t * 60)}.</p>` },
      t * 60, [D / Math.abs(v1 - v2) * 60, D / v1 * 60, D / v2 * 60, 2 * t * 60], { step: 15, min: 5, dp: 0, fmt: dur });
    }
    return numQ({ text: `${intro} À quelle distance de A se croisent-elles ?`,
      exp: `<p>Elles se croisent au bout de ${D} ÷ (${v1} + ${v2}) = ${nf(t)} h. La voiture partie de A a roulé ${v1} × ${nf(t)} = ${nf(v1 * t)} km.</p><p>Plus direct : elle fait ${fr(v1, v1 + v2)} du trajet, car elle roule ${fr(v1, v1 + v2)} de la vitesse totale.</p>` },
    v1 * t, [D / 2, v2 * t, D - v1 * t / 2, v1 * t + 10], { step: 10, min: 1, fmt: v => nf(v) + ' km' });
  });

  def('vit.delay', 'vit', 3, 'Croisement à départ différé', () => {
    let v1, v2, d, k, R, D;
    do { v1 = int(12, 25); v2 = int(12, 25); d = pick([0.5, 1, 1.5]); k = int(5, 30); R = (v1 + v2) * k / 10; D = v1 * d + R; } while (!Number.isInteger(R) || !Number.isInteger(D) || v1 === v2);
    const t = k / 10, start = int(8, 10) * 60, bStart = start + d * 60, meet = bStart + t * 60;
    return numQ({ text: `À ${hm(start)}, un cycliste part de A vers B à ${kmh(v1)}. À ${hm(bStart)}, un autre cycliste part de B vers A à ${kmh(v2)}. A et B sont distants de ${D} km. À quelle heure se croisent-ils ?`,
      exp: `<p>Avant le départ du second, le premier a déjà roulé ${nf(d)} h × ${v1} = ${nf(v1 * d)} km. Il reste ${nf(R)} km entre eux.</p><p>Ils se rapprochent de ${v1} + ${v2} = ${v1 + v2} km/h : ${nf(R)} ÷ ${v1 + v2} = ${nf(t)} h = ${dur(t * 60)}. Croisement à ${hm(bStart)} + ${dur(t * 60)} = ${hm(meet)}.</p>` },
    meet, [start + D / (v1 + v2) * 60, bStart + D / (v1 + v2) * 60, start + t * 60, meet + 12], { step: 12, dp: 0, fmt: hm });
  });

  // ===== Temps de travail et production =====
  const WORK = [['Un robinet remplit une baignoire', 'un second robinet', 'aux deux robinets ensemble'], ['Une imprimante imprime un dossier', 'une seconde imprimante', 'aux deux imprimantes ensemble'], ['Léo range le grenier', 'Margot', 'à Léo et Margot ensemble']];
  function workPair() { let a, b, t; do { a = int(2, 36) * 5; b = int(2, 36) * 5; t = a * b / (a + b); } while (a === b || !Number.isInteger(t) || t < 10); return [a, b, t]; }

  def('trav.two', 'trav', 2, 'Travailler à deux', () => {
    const [a, b, t] = workPair(), [s1, s2, s3] = pick(WORK);
    return numQ({ text: `${s1} en ${dur(a)}, ${s2} en ${dur(b)}. Combien de temps faut-il ${s3} ?`,
      exp: `<p>On additionne les vitesses de travail, pas les temps : 1/T = 1/${a} + 1/${b}.</p><p>T = ${a} × ${b} ÷ (${a} + ${b}) = ${a * b} ÷ ${a + b} = ${t} min, soit ${dur(t)}. Vérifie : c'est forcément moins que le plus rapide seul (${dur(Math.min(a, b))}).</p>` },
    t, [(a + b) / 2, a + b, Math.abs(a - b), Math.min(a, b) / 2 + 5], { step: 5, min: 1, dp: 0, fmt: dur });
  });

  def('trav.find', 'trav', 3, 'Retrouver le temps d\'un seul', () => {
    const [a, b, t] = workPair();
    return numQ({ text: `Ensemble, deux robinets remplissent une cuve en ${dur(t)}. Le premier, seul, la remplit en ${dur(a)}. Combien de temps faut-il au second, seul ?`,
      exp: `<p>1/T₂ = 1/${t} − 1/${a}, donc T₂ = ${a} × ${t} ÷ (${a} − ${t}) = ${a * t} ÷ ${a - t} = ${b} min, soit ${dur(b)}.</p><p>Ou teste les réponses avec la formule à deux : ${a} × ${b} ÷ (${a} + ${b}) = ${t} ✓.</p>` },
    b, [a - t, a + t, 2 * t, b + 10], { step: 5, min: 1, dp: 0, fmt: dur });
  });

  def('trav.inv', 'trav', 1, 'Plus de monde, moins de temps', () => {
    if (Math.random() < 0.5) {
      let n1, d1, n2; do { n1 = int(2, 12); d1 = int(4, 30); n2 = int(2, 15); } while (n1 === n2 || (n1 * d1) % n2 !== 0);
      const ans = n1 * d1 / n2;
      return numQ({ text: `${n1} ouvriers construisent un mur en ${d1} jours. Combien de jours faut-il à ${n2} ouvriers travaillant au même rythme ?`,
        exp: `<p>Le travail total ne change pas : ${n1} × ${d1} = ${n1 * d1} jours de travail d'un ouvrier.</p><p>Avec ${n2} ouvriers : ${n1 * d1} ÷ ${n2} = ${ans} jours. Plus de monde, moins de jours : c'est une proportion inverse.</p>` },
      ans, [d1 * n2 / n1, d1 + n1 - n2, d1 - n1 + n2, ans + 1], { min: 1, dp: 1, fmt: v => nf(v, 1) + ' jours' });
    }
    let h1, d1, h2; do { h1 = int(5, 10); d1 = int(10, 50); h2 = int(5, 12); } while (h1 === h2 || (h1 * d1) % h2 !== 0);
    const ans = h1 * d1 / h2;
    return numQ({ text: `En travaillant ${h1} heures par jour, Sam met ${d1} jours pour finir un chantier. Combien de jours lui faut-il en travaillant ${h2} heures par jour ?`,
      exp: `<p>Heures totales : ${h1} × ${d1} = ${h1 * d1} h.</p><p>À ${h2} h par jour : ${h1 * d1} ÷ ${h2} = ${ans} jours.</p>` },
    ans, [d1 * h2 / h1, d1 + h1 - h2, d1 - h1 + h2, ans + 1], { min: 1, dp: 1, fmt: v => nf(v, 1) + ' jours' });
  });

  def('trav.rate', 'trav', 1, 'Cadence de production', () => {
    let p, m, H, ans; do { p = int(2, 9); m = pick([3, 4, 5, 6, 8, 10, 12, 15]); H = int(1, 8); ans = p * H * 60 / m; } while (!Number.isInteger(ans) || p === m);
    return numQ({ text: `Une machine fabrique ${p} pièces toutes les ${m} minutes. Combien de pièces fabrique-t-elle en ${H} h ?`,
      exp: `<p>${H} h = ${H * 60} minutes, soit ${H * 60 / m} fois ${m} minutes.</p><p>Production = ${H * 60 / m} × ${p} = ${ans} pièces.</p>` },
    ans, [p * H * 100 / m, p * H * m, ans / 2, ans + p], { step: p, min: 1, dp: 0 });
  });

  def('trav.jar', 'trav', 3, 'Consommation partagée', () => {
    let kids, a, b, D, c, tot, ans;
    do { kids = int(2, 3); a = int(1, 3); b = int(1, 3); D = int(10, 40); c = int(2, 4); tot = ((kids + 1) * a + b) * D; ans = tot / ((kids + 2) * c); }
    while (a === b || !Number.isInteger(ans) || ans === D);
    const perDay = (kids + 1) * a + b;
    return numQ({ text: `Dans une famille, les ${kids} enfants et le père prennent chacun ${a} bonbon${a > 1 ? 's' : ''} par jour, la mère en prend ${b}. Le pot est vidé en ${D} jours. En combien de jours serait-il vidé si chacun en prenait ${c} par jour ?`,
      exp: `<p>Par jour : ${kids + 1} × ${a} + ${b} = ${perDay} bonbons, donc le pot en contient ${perDay} × ${D} = ${tot}.</p><p>Nouveau rythme : ${kids + 2} × ${c} = ${(kids + 2) * c} par jour, soit ${tot} ÷ ${(kids + 2) * c} = ${ans} jours.</p>` },
    ans, [tot / ((kids + 1) * c), D * a / c, D, ans + 2], { min: 1, dp: 1, fmt: v => nf(v, 1) + ' jours' });
  });

  // ===== Conversions =====
  def('conv.hdec', 'conv', 1, 'Heures décimales', () => {
    const h = int(0, 4), f = pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]);
    const x = h + f, ans = h * 60 + Math.round(f * 60), naive = h * 60 + Math.round(f * 100);
    return numQ({ text: `Combien font ${nf(x)} h en heures et minutes ?`,
      exp: `<p>La partie décimale se multiplie par 60 : ${nf(f)} × 60 = ${Math.round(f * 60)} min. Donc ${nf(x)} h = ${dur(ans)}.</p><p>Piège : ce n'est pas ${h} h ${Math.round(f * 100)}. Repères : 0,1 h = 6 min, 0,25 h = 15 min, 0,75 h = 45 min.</p>` },
    ans, [naive, ans + 6, ans - 6, ans + 10], { step: 3, min: 1, dp: 0, fmt: dur });
  });

  def('conv.speed', 'conv', 1, 'm/s et km/h', () => {
    if (Math.random() < 0.5) {
      const ms = int(1, 12) * 5, k = ms * 3.6;
      return numQ({ text: `Combien font ${ms} m/s en km/h ?`,
        exp: `<p>1 m/s = 3 600 m par heure = 3,6 km/h. Donc ${ms} × 3,6 = ${kmh(k)}.</p><p>Repère : m/s → km/h, on multiplie par 3,6 ; km/h → m/s, on divise par 3,6.</p>` },
      k, [ms / 3.6, ms * 60, k * 10, k / 2], { step: 9, min: 1, dp: 1, fmt: kmh });
    }
    const ms = int(1, 12) * 5, k = ms * 3.6;
    return numQ({ text: `Combien font ${nf(k)} km/h en m/s ?`,
      exp: `<p>km/h → m/s : on divise par 3,6. ${nf(k)} ÷ 3,6 = ${ms} m/s.</p><p>Astuce : diviser par 3,6, c'est diviser par 36 puis multiplier par 10.</p>` },
    ms, [k * 3.6, k / 60, k * 1000 / 60, ms * 2], { step: 5, min: 1, dp: 1, fmt: v => nf(v, 1) + ' m/s' });
  });

  def('conv.unit', 'conv', 2, 'Aires, volumes, capacités', () => {
    const [u1, u2, f] = pick([['m²', 'cm²', 1e4], ['ha', 'm²', 1e4], ['km²', 'ha', 100], ['m²', 'dm²', 100], ['km²', 'm²', 1e6], ['m³', 'L', 1000], ['L', 'cm³', 1000], ['dm³', 'mL', 1000], ['m³', 'dm³', 1000], ['cm³', 'L', 0.001], ['mL', 'L', 0.001], ['cm²', 'm²', 0.0001], ['a', 'm²', 100]]);
    const v = f >= 1 ? int(2, 95) / 10 : f === 0.001 ? int(1, 40) * 50 : int(1, 9) * 1000;
    const ans = Math.round(v * f * 1e4) / 1e4;
    const rule = f >= 1 ? `1 ${u1} = ${nf(f)} ${u2}, donc ${nf(v)} × ${nf(f)} = ${nf(ans, 4)} ${u2}` : `1 ${u2} = ${nf(1 / f)} ${u1}, donc ${nf(v)} ÷ ${nf(1 / f)} = ${nf(ans, 4)} ${u2}`;
    return numQ({ text: `Combien font ${nf(v)} ${u1} en ${u2} ?`,
      exp: `<p>${rule}.</p><p>Repères : longueurs × 10 d'une unité à l'autre, aires × 100, volumes × 1 000. 1 L = 1 dm³ ; 1 ha = 10 000 m².</p>` },
    ans, [ans * 10, ans / 10, ans * 100, ans / 100], { step: ans, min: 1e-4, dp: 4, fmt: x => nf(x, 4) + ' ' + u2 });
  });

  def('conv.sum', 'conv', 1, 'Additionner des durées', () => {
    let h1, m1, h2, m2; do { h1 = int(1, 4); m1 = int(1, 11) * 5; h2 = int(1, 4); m2 = int(1, 11) * 5; } while (m1 + m2 < 60);
    const a = h1 * 60 + m1, b = h2 * 60 + m2, ans = a + b;
    return numQ({ text: `Combien font ${dur(a)} + ${dur(b)} ?`,
      exp: `<p>Heures : ${h1} + ${h2} = ${h1 + h2} h. Minutes : ${m1} + ${m2} = ${m1 + m2} min = 1 h ${pad(m1 + m2 - 60)}.</p><p>Total : ${dur(ans)}. On retient 1 h dès qu'on dépasse 60 minutes, pas 100.</p>` },
    ans, [ans - 60, ans + 60, ans - 40, ans + 10], { step: 5, min: 1, dp: 0, fmt: dur });
  });

  // ===== Rencontres et salutations =====
  def('salut.hand', 'salut', 1, 'Poignées de main', () => {
    const N = int(5, 30), ans = N * (N - 1) / 2;
    const text = pick([`Lors d'une soirée, ${N} invités se serrent tous la main, une fois chacun avec chacun. Combien y a-t-il de poignées de main ?`,
      `${N} chefs d'État veulent tous une ligne téléphonique directe avec chacun des autres. Combien de lignes faut-il installer ?`,
      `Dans un championnat de ${N} équipes, chaque équipe rencontre une seule fois chacune des autres. Combien de matchs sont joués ?`,
      `${N} amis trinquent tous ensemble, chacun une fois avec chacun des autres. Combien entend-on de tintements de verres ?`]);
    return numQ({ text, exp: `<p>Chacun des ${N} est relié aux ${N - 1} autres : ${N} × ${N - 1} = ${N * (N - 1)}, mais chaque lien est compté deux fois.</p><p>Formule : N × (N − 1) ÷ 2 = ${ans}.</p>` },
      ans, [N * (N - 1), N * N, N * (N + 1) / 2, (N - 1) * (N - 2) / 2], { step: N, min: 1, dp: 0 });
  });

  def('salut.var', 'salut', 1, 'Aller-retour, bises, tournois', () => {
    const v = int(0, 2);
    if (v === 0) {
      const N = int(6, 20), ans = N * (N - 1);
      return numQ({ text: `Dans un championnat de ${N} équipes, chaque équipe rencontre deux fois chacune des autres (aller et retour). Combien de matchs sont joués ?`,
        exp: `<p>En aller simple : ${N} × ${N - 1} ÷ 2 = ${ans / 2} matchs. Avec le retour, deux fois plus : N × (N − 1) = ${ans}.</p>` },
      ans, [ans / 2, N * N, 2 * N, ans + N], { step: N, min: 1, dp: 0 });
    }
    if (v === 1) {
      const N = int(5, 20), ans = N * (N - 1);
      return numQ({ text: `À une fête, ${N} personnes se font toutes la bise, deux bises par personne rencontrée. Combien de bises sont échangées en tout ?`,
        exp: `<p>Il y a ${N} × ${N - 1} ÷ 2 = ${ans / 2} paires, et 2 bises par paire : N × (N − 1) = ${ans}.</p>` },
      ans, [ans / 2, 2 * ans, N * N, ans - N], { step: N, min: 1, dp: 0 });
    }
    const N = pick([8, 12, 16, 20, 24, 32, 48, 64, 100]);
    return numQ({ text: `Un tournoi à élimination directe réunit ${N} joueurs : chaque match élimine le perdant, jusqu'au vainqueur. Combien de matchs sont joués ?`,
      exp: `<p>Chaque match élimine exactement un joueur. Pour garder un seul vainqueur, il faut éliminer ${N} − 1 joueurs : ${N - 1} matchs.</p>` },
    N - 1, [N, N / 2, N * (N - 1) / 2, N - 2], { min: 1, dp: 0 });
  });

  def('salut.inv', 'salut', 2, 'Retrouver le nombre de personnes', () => {
    const N = int(6, 25), H = N * (N - 1) / 2;
    return numQ({ text: `Lors d'un dîner, chaque invité trinque exactement une fois avec chacun des autres. On compte ${H} tintements de verres. Combien y a-t-il d'invités ?`,
      exp: `<p>N × (N − 1) ÷ 2 = ${H}, donc N × (N − 1) = ${2 * H}.</p><p>Cherche deux nombres consécutifs dont le produit vaut ${2 * H} : ${N} × ${N - 1} ✓. Ou teste les réponses.</p>` },
    N, [N + 1, N - 1, Math.round(Math.sqrt(H)), N + 2], { min: 2, dp: 0 });
  });

  def('salut.teams', 'salut', 3, 'Deux équipes face à face', () => {
    const n = int(4, 15), H = n * n;
    return numQ({ text: `Avant un match, chaque joueur d'une équipe serre la main de chaque joueur de l'équipe adverse. Les deux équipes ont le même nombre de joueurs et on compte ${H} poignées de main. Combien de joueurs par équipe ?`,
      exp: `<p>Chacun des n joueurs serre n mains adverses : n × n = ${H}, donc n = ${n}.</p><p>Lis bien l'énoncé : si tout le monde se serrait la main, coéquipiers compris, ce serait N × (N − 1) ÷ 2 avec N = ${2 * n} joueurs.</p>` },
    n, [n + 1, n - 1, Math.round(H / 2), 2 * n], { min: 1, dp: 0 });
  });

  // ---------- Automatismes (pavé numérique) ----------
  const dec = (n, dp) => { const s = String(n).padStart(dp + 1, '0'); const i = s.slice(0, -dp), f = s.slice(-dp).replace(/0+$/, ''); return f ? i + ',' + f : i; };
  const AUTO = {
    sq: { label: 'Carrés de 11 à 25', fast: 4000, f() { const n = int(11, 25); return { text: `${n}²`, a: String(n * n) }; } },
    cube: { label: 'Cubes de 2 à 10', fast: 4000, f() { const n = int(2, 10); return { text: `${n}³`, a: String(n ** 3) }; } },
    tab: { label: 'Tables de 11 à 19', fast: 5000, f() { const a = int(11, 19), b = int(3, 9); return { text: `${a} × ${b}`, a: String(a * b) }; } },
    dec: { label: 'Décimaux', fast: 8000, f() {
      const v = int(0, 3);
      if (v === 0) { const x = int(11, 49), y = int(2, 9); return { text: `${dec(x, 1)} × ${y}`, a: dec(x * y, 1) }; }
      if (v === 1) { const x = int(11, 39), y = int(11, 39); return { text: `${dec(x, 1)} × ${dec(y, 1)}`, a: dec(x * y, 2) }; }
      if (v === 2) { const x = int(2, 9), y = int(2, 9); return { text: `0,${x} × 0,0${y}`, a: dec(x * y, 3) }; }
      const r = int(2, 12), b = int(2, 9); return { text: `${dec(r * b, 1)} ÷ 0,${b}`, a: String(r) };
    } },
    pct: { label: 'Fractions en %', fast: 5000, f() {
      const [n, d, a] = pick([[1, 2, '50'], [1, 4, '25'], [3, 4, '75'], [1, 5, '20'], [2, 5, '40'], [3, 5, '60'], [4, 5, '80'], [1, 8, '12,5'], [3, 8, '37,5'], [5, 8, '62,5'], [7, 8, '87,5'], [3, 20, '15'], [1, 20, '5'], [1, 25, '4'], [1, 50, '2'], [3, 10, '30'], [9, 20, '45'], [6, 25, '24']]);
      return { text: `${fr(n, d)} = ? %`, a };
    } },
    time: { label: 'Heures en minutes', fast: 5000, f() {
      const [t, a] = pick([['0,1 h', 6], ['0,2 h', 12], ['0,25 h', 15], ['0,4 h', 24], ['0,6 h', 36], ['0,75 h', 45], ['0,8 h', 48], ['1,2 h', 72], ['1,5 h', 90], ['2,5 h', 150], ['1,25 h', 75], ['1,1 h', 66], [fr(1, 6) + ' h', 10], [fr(1, 3) + ' h', 20], [fr(2, 3) + ' h', 40], [fr(5, 6) + ' h', 50], [fr(3, 4) + ' h', 45]]);
      return { text: `${t} = ? min`, a: String(a) };
    } },
    pctof: { label: 'Pourcentages rapides', fast: 6000, f() {
      const p = pick([5, 10, 15, 20, 25, 30, 40, 60, 75]); let N; do N = int(2, 20) * 20; while (!Number.isInteger(N * p / 100));
      return { text: `${p} % de ${N}`, a: String(N * p / 100) };
    } },
  };

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
    { id: 'ent', name: 'Inconnues entières', fiches: '69', freq: 5, w: 0.03, step: 3 },
    { id: 'divers', name: 'Suites, Thalès, combinatoire…', fiches: '51–53, 59, 63…', freq: 2, w: 0.08, step: 'mars' },
  ];
  CHAPTERS.forEach(c => { c.ready = Object.values(T).some(t => t.chap === c.id); });

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
      <li><b>Backsolving</b> : les réponses sont triées. Teste celle du milieu (C), puis monte ou descend. Souvent plus rapide qu'une équation.</li>
      <li>Fausse hypothèse : « si tout le monde avait pris l'option la moins chère… », puis répartis l'écart.</li></ul>`,
    moy: `<ul>
      <li>Moyenne = somme ÷ nombre. Réflexe inverse : <b>somme = moyenne × nombre</b>.</li>
      <li>Fusionner deux groupes : on additionne les <b>sommes</b>, jamais les moyennes.</li>
      <li>Note nécessaire = total visé − total déjà obtenu.</li>
      <li>Nombres consécutifs (ou régulièrement espacés) : moyenne = terme du milieu = (premier + dernier) ÷ 2.</li>
      <li>Moyenne pondérée : Σ (note × coef) ÷ Σ coef.</li></ul>`,
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
  function gen(type) {
    const t = T[type];
    const q = t.f();
    return { ...q, type, chap: t.chap, lvl: t.lvl };
  }
  const typesOf = chap => Object.values(T).filter(t => t.chap === chap).map(t => t.id);

  // Contrôle de cohérence (utilisé pendant le développement)
  function selfTest(n = 400) {
    const errs = [];
    for (const id of Object.keys(T)) {
      for (let i = 0; i < n; i++) {
        const q = gen(id), keys = q.choices.map(c => c.k);
        const blob = q.text + q.exp + q.choices.map(c => c.h).join('');
        if (q.choices.length !== 5) errs.push(`${id}: ${q.choices.length} choix`);
        if (new Set(keys).size !== keys.length) errs.push(`${id}: doublon ${keys}`);
        if (!(q.ans >= 0 && q.ans < 5)) errs.push(`${id}: réponse introuvable`);
        if (/NaN|undefined|Infinity/.test(blob)) errs.push(`${id}: ${blob.match(/NaN|undefined|Infinity/)[0]} dans ${q.text}`);
      }
    }
    for (const [id, a] of Object.entries(AUTO)) for (let i = 0; i < n; i++) { const q = a.f(); if (!/^\d+(,\d+)?$/.test(q.a)) errs.push(`auto ${id}: ${q.a}`); }
    return [...new Set(errs)];
  }

  const G = { CHAPTERS, FICHES, AUTO, TYPES: T, gen, typesOf, fr, nf, pick, int, selfTest };
  root.AMGen = G;
  if (typeof module !== 'undefined') module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
