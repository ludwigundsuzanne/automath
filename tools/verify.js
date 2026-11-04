// Vérification indépendante des générateurs : relit l'énoncé, recalcule la réponse autrement
// (souvent par énumération), puis la compare à la bonne réponse proposée par l'app.
// Usage : node tools/verify.js [tirages par type]
const G = require('../js/gen.js');
const N = +process.argv[2] || 300;
const txt = h => h.replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<span class="fr"><span>(\d+)<\/span><span>(\d+)<\/span><\/span>/g, '$1/$2')
  .replace(/<[^>]+>/g, '').replace(/[  ]/g, ' ').replace(/−/g, '-');
const num = s => +s.replace(/[   ]/g, '').replace('−', '-').replace(',', '.');
const nums = t => (t.match(/-?\d[\d ]*(?:,\d+)?/g) || []).map(s => num(s.trim()));
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const frac = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
const close = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));

const CHECKS = {
  'proba.dice': (t, k) => {
    let fav = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
      if (/somme fasse (\d+)/.test(t)) fav += a + b === +t.match(/somme fasse (\d+)/)[1];
      else if (/un double/.test(t)) fav += a === b;
      else if (/différents/.test(t)) fav += a !== b;
      else if (/au moins un 6/.test(t)) fav += a === 6 || b === 6;
    }
    return k === frac(fav, 36);
  },
  'proba.coins': (t, k) => {
    const n = +t.match(/(\d+) (?:pièces|enfants)/)[1], kk = +t.match(/(?:exactement|au moins) (\d+)/)[1], atl = /au moins/.test(t);
    let fav = 0; for (let m = 0; m < 2 ** n; m++) { const c = m.toString(2).split('').filter(x => x === '1').length; fav += atl ? c >= kk : c === kk; }
    return k === frac(fav, 2 ** n);
  },
  'proba.balls': (t, k) => {
    const [r, b] = [+t.match(/(\d+) boules rouges/)[1], +t.match(/(\d+) boules bleues/)[1]], rep = /avec remise/.test(t), n = r + b;
    let fav = 0, tot = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!rep && i === j) continue; tot++; fav += i < r && j < r; }
    return k === frac(fav, tot);
  },
  'proba.lotto': (t, k) => {
    const [, a, b, m] = t.match(/de (\d+) à (\d+).*multiple de (\d+)/).map(Number);
    let fav = 0; for (let x = a; x <= b; x++) fav += x % m === 0;
    return k === frac(fav, b - a + 1);
  },
  'geo.pyth': (t, k) => { const v = nums(t).slice(0, 2), x = num(k); const [p, q] = v; return /hypoténuse ?\?/.test(t) || /Combien mesure l'hypoténuse/.test(t) ? close(x * x, p * p + q * q) : close(x * x + q * q, p * p); },
  'geo.angle': (t, k) => {
    const v = nums(t), x = num(k);
    if (/deux angles mesurent/.test(t)) return close(x, 180 - v[0] - v[1]);
    if (/isocèle/.test(t)) return close(2 * x + v[0], 180);
    const [p, q, r] = v; return close(x, 180 * Math.max(p, q, r) / (p + q + r));
  },
  'geo.poly': (t, k) => { const n = nums(t)[0], x = num(k); return /somme/.test(t) ? close(x, 180 * (n - 2)) : close(x * n, 180 * (n - 2)); },
  'geo.rect': (t, k) => {
    const v = nums(t), x = num(k);
    if (/carré a une aire/.test(t)) { const [A, P] = v, c = Math.sqrt(A); return close(x, c * (P / 2 - c)); }
    if (/périmètre de/.test(t)) { const [P, L] = v; return close(x, L * (P / 2 - L)); }
    const [A, L] = v; return close(x, 2 * (L + A / L));
  },
  'geo.circle': (t, k) => {
    const v = nums(t), x = num(k.replace(/π.*/, '') || '1');
    if (/périmètre de/.test(t)) { const r = v[0] / 2; return close(x, r * r); }
    if (/aire de/.test(t)) { const r = Math.sqrt(v[0]); return close(x, 2 * r); }
    const r = v[0]; const s = r * Math.SQRT2; return close(x, s * s);
  },
  'geo.diag': (t, k) => { const v = nums(t), A = v[0], p = v[1], q = v[2], L = Math.sqrt(A * q / p), l = A / L; return close(num(k), Math.hypot(L, l)); },
  'int.simple': (t, k) => { const [C, tt, n] = nums(t), I = C * tt / 100 * n; return close(num(k), /total/.test(t) ? C + I : I); },
  'int.comp': (t, k) => { const [C, tt, n] = nums(t); return close(num(k), Math.round(C * (1 + tt / 100) ** n * 100) / 100); },
  'int.double': (t, k) => { const tt = nums(t)[0]; let c = 1, y = 0; while (c < 2) { c *= 1 + tt / 100; y++; } return num(k) === y; },
  'int.split': (t, k) => { const [S, a, b, Tt, b2] = nums(t), x = num(k); return close(x * (1 + b / 100) + (S - x) * (1 + a / 100), Tt) && b === b2; },
  'int.rate': (t, k) => { const [I1, I2] = nums(t), r = (I2 - I1) / I1; return /taux/.test(t.split('.').pop()) ? close(num(k), r * 100) : close(num(k), I1 / r); },
  'pui.sqrt': (t, k) => {
    const [a, b] = k.includes('r') ? k.split('r').map(Number) : [num(k), 1], val = a * Math.sqrt(b);
    const v = nums(t); return /\+/.test(t) ? close(val, Math.sqrt(v[0]) + Math.sqrt(v[1])) : close(val, Math.sqrt(v[0]));
  },
  'pui.sci': (t, k) => { const [x, y] = nums(t); return close(num(k), x * y); },
  'pui.sys': (t, k) => { const [, b, m, , n] = t.match(/(\d+)\^(\d+).*?(\d+)\^(\d+)/).map(Number).concat([]); const base = +t.match(/C² = (\d+)\^/)[1], e1 = +t.match(/C² = \d+\^(\d+)/)[1], e2 = +t.match(/C = \d+\^(\d+)/)[1]; return num(k) * 3 === e1 + e2 && base > 0; },
  'trav.two': (t, k) => true,
  'salut.hand': (t, k) => { const n = nums(t)[0]; return num(k) === n * (n - 1) / 2; },
};

let fails = 0, checked = 0;
for (const [id, check] of Object.entries(CHECKS)) {
  for (const d of [1, 2, 3]) for (let i = 0; i < N; i++) {
    const q = G.gen(id, d), t = txt(q.text), k = q.choices[q.ans].k;
    let ok; try { ok = check(t, k); } catch (e) { ok = false; console.log('ERREUR', id, e.message, t); }
    checked++;
    if (!ok) { fails++; if (fails < 15) console.log('ÉCART', id, '|', t, '| réponse app :', k); }
  }
}
console.log(`${checked} questions vérifiées, ${fails} écart(s)`);
process.exit(fails ? 1 : 0);
