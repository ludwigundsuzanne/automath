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
