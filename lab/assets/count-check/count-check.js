/* Jitna andar, utna bahar: rows in vs rows out, totals in vs out, duplicates, missing rows and rows that should not be counted.
   Everything runs in this browser tab. No requests, no storage, no analytics. The Content-Security-Policy blocks network calls. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- numbers: Indian formats, Dr/Cr, brackets, kept in paise so totals are exact ---------- */
  function paise(s) {
    s = String(s == null ? '' : s).trim();
    if (!s) return null;
    var neg = false, m;
    s = s.replace(/^(₹|rs\.?|inr)\s*/i, '').replace(/\s*(₹|rs\.?|inr)$/i, '');
    if ((m = s.match(/^(.*?)\s*(dr|cr)\.?$/i))) { s = m[1]; if (m[2].toLowerCase() === 'dr') neg = !neg; }
    if (/^\(.*\)$/.test(s)) { neg = !neg; s = s.slice(1, -1).trim(); }
    if (/^-/.test(s)) { neg = !neg; s = s.slice(1).trim(); } else if (/-$/.test(s)) { neg = !neg; s = s.slice(0, -1).trim(); }
    s = s.replace(/^(₹|rs\.?|inr)\s*/i, '').replace(/[,\s]/g, '');
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(s)) return NaN;
    var p = s.split('.'), r = +(p[0] || 0) * 100, f = (p[1] || '') + '000';
    r += +f.slice(0, 2) + (+f[2] >= 5 ? 1 : 0);
    return neg ? -r : r;
  }
  function inr(p, sign) {
    if (p == null || isNaN(p)) return '–';
    var neg = p < 0, a = Math.abs(Math.round(p)), r = String(Math.floor(a / 100)), f = String(a % 100);
    if (f.length < 2) f = '0' + f;
    var last = r.slice(-3), rest = r.slice(0, -3);
    if (rest) last = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last;
    return (neg ? '−' : sign && p > 0 ? '+' : '') + '₹' + last + '.' + f;
  }
  function n(x) { return Number(x).toLocaleString('en-IN'); }
  function rows(k, one, many) { return n(k) + ' ' + (k === 1 ? one : many || one + 's'); }

  /* ---------- CSV / TSV ---------- */
  function sniff(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); }).slice(0, 40), best = ',', bestScore = 0;
    ['\t', ',', ';', '|'].forEach(function (d) {
      var c = lines.map(function (l) { var k = 0, q = false; for (var i = 0; i < l.length; i++) { if (l[i] === '"') q = !q; else if (!q && l[i] === d) k++; } return k; });
      var freq = {}; c.forEach(function (x) { if (x) freq[x] = (freq[x] || 0) + 1; });
      var mode = 0, mc = 0; for (var x in freq) if (freq[x] > mc) { mc = freq[x]; mode = +x; }
      var score = mc / lines.length * Math.min(mode, 8) * (d === '\t' ? 1.1 : 1);
      if (score > bestScore) { bestScore = score; best = d; }
    });
    return best;
  }
  function parse(text) {
    text = text.replace(/^﻿/, '');
    var d = sniff(text), out = [], row = [], f = '', q = false, c, line = 1, start = 1;
    for (var i = 0, L = text.length; i < L; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else { if (c === '\n') line++; f += c; } }
      else if (c === '"' && !f.trim()) { q = true; f = ''; }
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); row.line = start; out.push(row); row = []; f = ''; line++; start = line; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); row.line = start; out.push(row); }
    return { rows: out, d: d };
  }
  function csvLine(r) { return r.map(function (v) { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }

  /* ---------- reading one file ---------- */
  var TOTAL = /^\s*(sub[\s-]?total|total|grand\s*total|page\s*total|net\s*total|closing\s*bal(ance)?|opening\s*bal(ance)?|balance\s*(b\/?f|c\/?f|brought|carried)|b\/f|c\/f|brought\s*forward|carried\s*forward|difference\b|totals?\s*:)/i;
  var DEBIT = /withdraw|debit|\bdr\b|paid\s*out|payments?\b|outflow/i, CREDIT = /deposit|credit|\bcr\b|paid\s*in|receipts?\b|inflow/i;
  function blank(r) { return r.every(function (c) { return !String(c).trim(); }); }
  function isHead(r) {
    var ne = r.filter(function (c) { return c.trim(); });
    return ne.length >= 2 && ne.filter(function (c) { return /[A-Za-z]/.test(c) && isNaN(paise(c)) && !/^\d/.test(c.trim()); }).length >= ne.length * .7;
  }
  function makeFile(text, name) {
    var p = parse(text), R = p.rows, maxc = 0;
    R.forEach(function (r) { if (r.length > maxc) maxc = r.length; });
    var hi = -1;
    for (var i = 0; i < Math.min(R.length, 40); i++) if (isHead(R[i]) && R[i].filter(function (c) { return c.trim(); }).length >= Math.max(2, maxc * .5)) { hi = i; break; }
    var head = hi >= 0 ? R[hi].map(function (h, j) { return h.trim() || 'Column ' + (j + 1); }) : [];
    for (var j = head.length; j < maxc; j++) head.push('Column ' + (j + 1));
    var F = { name: name, raw: R, hi: hi, head: head, body: R.slice(hi + 1), pre: hi < 0 ? 0 : hi, delim: p.d, flip: false };
    F.date = find(head, /date|\bdt\b/i, /value/i);
    F.narr = find(head, /narration|description|particulars|remarks|details|memo|transaction/i);
    F.ind = find(head, /^(dr\s*\/\s*cr|cr\s*\/\s*dr|dr\s*or\s*cr|debit\s*\/\s*credit|type|txn\s*type)$/i);
    F.amtOpts = amountOptions(F);
    F.amt = F.amtOpts.length ? F.amtOpts[0].v : '';
    F.key = -1;
    return F;
  }
  function find(head, re, not) { for (var j = 0; j < head.length; j++) if (re.test(head[j]) && !(not && not.test(head[j]))) return j; for (j = 0; j < head.length; j++) if (re.test(head[j])) return j; return -1; }
  function numericShare(F, j) {
    var k = 0, ok = 0;
    for (var i = 0; i < F.body.length && k < 400; i++) { var v = (F.body[i][j] || '').trim(); if (!v) continue; k++; if (!isNaN(paise(v))) ok++; }
    return k ? ok / k : 0;
  }
  function amountOptions(F) {
    var o = [], h = F.head, dr = -1, cr = -1, singles = [];
    h.forEach(function (x, j) {
      if (/balance|\bbal\b/i.test(x) || j === F.date) return;
      var share = numericShare(F, j);
      if (share < .8) return;
      if (DEBIT.test(x) && dr < 0) dr = j; else if (CREDIT.test(x) && cr < 0) cr = j;
      if (/ref|no\.?$|number|chq|cheque|id\b|code|utr|voucher/i.test(x) && !/amount|amt/i.test(x)) return;
      singles.push({ v: 's' + j, t: x, score: /amount|amt|value|net/i.test(x) ? 2 : DEBIT.test(x) || CREDIT.test(x) ? 1 : 0 });
    });
    if (dr >= 0 && cr >= 0) {
      o.push({ v: 'n' + cr + ':' + dr, t: h[cr] + ' minus ' + h[dr] + ' (net)' });
      o.push({ v: 'g' + cr + ':' + dr, t: h[cr] + ' plus ' + h[dr] + ' (gross)' });
    }
    singles.sort(function (a, b) { return b.score - a.score; });
    singles.forEach(function (s) { o.push({ v: s.v, t: s.t + (F.ind >= 0 ? ' (signed by ' + h[F.ind] + ')' : '') }); });
    return o;
  }
  function amountOf(F, r) {
    var v = F.amt;
    if (!v) return null;
    if (v[0] === 's') {
      var a = paise(r[+v.slice(1)]);
      if (a != null && !isNaN(a) && F.ind >= 0 && /^d/i.test((r[F.ind] || '').trim())) a = -Math.abs(a);
      return a == null || isNaN(a) ? a : F.flip ? -a : a;
    }
    var pr = v.slice(1).split(':'), c = paise(r[+pr[0]]), d = paise(r[+pr[1]]);
    if (c == null && d == null) return null;
    if (isNaN(c) || isNaN(d)) return NaN;
    c = c || 0; d = d || 0;
    var t = v[0] === 'n' ? c - d : Math.abs(c) + Math.abs(d);
    return F.flip ? -t : t;
  }
  function normDate(s) {
    s = String(s || '').trim(); var m, M = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return m[1] + '-' + +m[2] + '-' + +m[3];
    if ((m = s.match(/^(\d{1,2})[-\/. ](\d{1,2})[-\/. ](\d{2,4})/))) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + +m[2] + '-' + +m[1];
    if ((m = s.match(/^(\d{1,2})[-\/ ]([a-z]{3})[a-z]*[-\/ ,]*(\d{2,4})/i)) && M[m[2].toLowerCase()]) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + M[m[2].toLowerCase()] + '-' + +m[1];
    return s.toLowerCase();
  }
  function classify(F) {
    var data = [], flag = [], warn = [], H = F.head.map(function (h) { return h.toLowerCase(); });
    F.body.forEach(function (r) {
      var why = '';
      if (blank(r)) why = 'Blank row';
      else if (r.length === H.length && r.every(function (c, j) { return c.trim().toLowerCase() === H[j]; })) why = 'Heading row repeated';
      else if (r.some(function (c) { return TOTAL.test(c); })) why = 'Total, subtotal or balance row';
      else {
        var a = amountOf(F, r), dt = F.date >= 0 ? (r[F.date] || '').trim() : 'x';
        if (a == null && !dt) why = 'No date and no amount';
        else if (F.date >= 0 && !dt && a != null && (F.key < 0 || !(r[F.key] || '').trim())) why = 'Amount with no date (a subtotal?)';
        else { if (isNaN(a)) warn.push({ r: r, why: 'Amount is not a number' }); data.push(r); }
      }
      if (why) flag.push({ r: r, why: why });
    });
    F.data = data; F.flag = flag; F.warn = warn;
    F.total = data.reduce(function (s, r) { var a = amountOf(F, r); return s + (a == null || isNaN(a) ? 0 : a); }, 0);
    F.lines = F.raw.length;
  }
  function keyOf(F, r) {
    if (F.key >= 0) return (r[F.key] || '').trim().toUpperCase();
    return normDate(F.date >= 0 ? r[F.date] : '') + '|' + amountOf(F, r) + '|' + (F.narr >= 0 ? (r[F.narr] || '').trim().toUpperCase().replace(/\s+/g, ' ') : '');
  }
  function dups(F) {
    var seen = new Map(), extra = [];
    F.data.forEach(function (r) { var k = keyOf(F, r); if (F.key >= 0 && !k) return; if (seen.has(k)) { extra.push(r); seen.get(k).c++; } else seen.set(k, { r: r, c: 1 }); });
    return extra;
  }
  function guessKeys() {
    var S = F.src, T = F.res, KEYH = /ref|utr|chq|cheque|txn|transaction\s*id|voucher|\bvch|\bid\b|invoice|\binv\b|doc|\bno\.?$/i;
    if (!S || S.keyUser && (!T || T.keyUser)) return;
    var cand = [];
    S.head.forEach(function (h, j) {
      if (j === S.date || ('s' + j) === S.amt || S.amt.slice(1).split(':').indexOf(String(j)) >= 0) return;
      var vals = S.data.map(function (r) { return (r[j] || '').trim(); }).filter(Boolean);
      if (!vals.length || vals.length < S.data.length * .9) return;
      var u = new Set(vals).size / vals.length;
      if (u > .97) cand.push({ j: j, sc: u + (KEYH.test(h) ? .5 : 0), set: new Set(vals.map(function (v) { return v.toUpperCase(); })) });
    });
    cand.sort(function (a, b) { return b.sc - a.sc; });
    if (!T) { if (!S.keyUser) S.key = cand.length ? cand[0].j : -1; return; }
    var best = null;
    cand.forEach(function (c) {
      if (S.keyUser && c.j !== S.key) return;
      T.head.forEach(function (h, j) {
        if (T.keyUser && j !== T.key) return;
        var hit = 0; T.data.forEach(function (r) { if (c.set.has((r[j] || '').trim().toUpperCase())) hit++; });
        var sc = hit + (KEYH.test(h) ? .5 : 0);
        if (hit && (!best || sc > best.sc)) best = { s: c.j, t: j, sc: sc, hit: hit };
      });
    });
    if (best && best.hit >= T.data.length * .3) { S.key = best.s; T.key = best.t; }
    else { if (!S.keyUser) S.key = -1; if (!T.keyUser) T.key = -1; }
  }

  /* ---------- compare ---------- */
  function compare() {
    var S = F.src, T = F.res, out = {};
    var useKey = S.key >= 0 && T.key >= 0;
    out.byKey = useKey;
    if (!useKey) { S.key = -1; T.key = -1; }
    function k2(X, r) { return useKey ? (r[X.key] || '').trim().toUpperCase() : normDate(X.date >= 0 ? r[X.date] : '') + '|' + amountOf(X, r); }
    if (!useKey && (S.date < 0 || T.date < 0)) k2 = function (X, r) { return String(amountOf(X, r)); };
    // auto-detect an opposite sign convention in the result
    if (!T.flipUser) {
      var tryFlip = function (fl) { T.flip = fl; var m = new Map(), hit = 0; T.data.forEach(function (r) { var k = k2(T, r); m.set(k, (m.get(k) || 0) + 1); }); S.data.forEach(function (r) { var k = k2(S, r), c = m.get(k); if (c) { hit++; m.set(k, c - 1); } }); return hit; };
      if (useKey) {
        var idx = new Map(); S.data.forEach(function (r) { idx.set(k2(S, r), amountOf(S, r)); });
        var same = 0, opp = 0; T.flip = false;
        T.data.forEach(function (r) { var a = idx.get(k2(T, r)), b = amountOf(T, r); if (a == null || !b) return; if (a === b) same++; else if (a === -b) opp++; });
        T.flip = opp > same;
      } else T.flip = tryFlip(true) > tryFlip(false);
      if (T.flip) classify(T);
    }
    out.dS = dups(S); out.dT = dups(T);
    var pool = new Map();
    T.data.forEach(function (r) { var k = k2(T, r); if (!pool.has(k)) pool.set(k, []); pool.get(k).push(r); });
    var missing = [], diffAmt = [];
    S.data.forEach(function (r) {
      var k = k2(S, r), arr = pool.get(k);
      if (arr && arr.length) { var t = arr.shift(); if (useKey && amountOf(S, r) !== amountOf(T, t)) diffAmt.push([r, t]); }
      else missing.push(r);
    });
    var extra = [];
    pool.forEach(function (arr) { arr.forEach(function (r) { extra.push(r); }); });
    if (useKey) { var sk = new Set(S.data.map(function (r) { return k2(S, r); })); extra = extra.filter(function (r) { return !sk.has(k2(T, r)); }); }
    out.missing = missing; out.extra = extra; out.diffAmt = diffAmt;
    return out;
  }

  /* ---------- rendering ---------- */
  var F = { src: null, res: null }, live = $('#live');
  function fileCard(w) {
    var X = F[w], box = $('#f-' + w);
    var lab = $('#b-' + w).childNodes[1];
    if (!lab.t0) lab.t0 = lab.textContent;
    lab.textContent = X ? 'Replace the ' + (w === 'src' ? 'source' : 'result') + ' file' : lab.t0;
    if (!X) { box.innerHTML = ''; $('#z-' + w).classList.remove('has'); return; }
    $('#z-' + w).classList.add('has');
    var opt = function (v, t, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    var amt = X.amtOpts.length ? X.amtOpts.map(function (o) { return opt(o.v, o.t, o.v === X.amt); }).join('') : opt('', 'No number column found', true);
    var key = opt(-1, 'None: match on date + amount' + (X.narr >= 0 ? ' + ' + X.head[X.narr] : ''), X.key < 0) + X.head.map(function (h, j) { return opt(j, h, j === X.key); }).join('');
    box.innerHTML = '<p class="fn"><b>' + esc(X.name) + '</b><span>' + rows(X.data.length, 'row') + ' counted' + (X.flag.length ? ' · <em>' + rows(X.flag.length, 'row') + ' left out</em>' : '') + ' · ' + rows(X.head.length, 'column') + '</span></p>' +
      '<div class="sel"><label>Amount column<select data-w="' + w + '" data-k="amt">' + amt + '</select></label>' +
      '<label>Key column <small>(optional)</small><select data-w="' + w + '" data-k="key">' + key + '</select></label></div>' +
      (w === 'res' && X.flip ? '<p class="fl">Signs look reversed in this file (withdrawals as plus), so they are flipped to compare.</p>' : '');
  }
  function stage(state, line, fx) {
    var s = $('#stage');
    s.setAttribute('data-s', state); s.setAttribute('data-fx', fx || '');
    var b = $('#bub'); b.textContent = line; if (!reduce) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  }
  function render() {
    fileCard('src'); fileCard('res');
    var S = F.src, T = F.res, v = $('#verdict'), m = $('#metrics'), det = $('#details');
    $('#copyp').textContent = promptText();
    if (!S && !T) {
      v.className = 'card verdict'; $('#vt').textContent = 'Drop both files to check them'; $('#vs').textContent = 'Or press Try the sample: a made-up bank statement of 3,000 entries and an AI’s reconciliation of it.';
      m.innerHTML = ''; det.innerHTML = ''; stage('wait', 'Pehle dono files do. Phir ginti karte hain.', 'bulb'); live.textContent = ''; return;
    }
    if (!S || !T) {
      var X = S || T;
      v.className = 'card verdict'; $('#vt').textContent = S ? 'Now drop the result' : 'Now drop the source export';
      $('#vs').innerHTML = esc(X.name) + ': <b>' + rows(X.data.length, 'row') + '</b>, total <b>' + inr(X.total) + '</b>' + (X.flag.length ? '. ' + rows(X.flag.length, 'row') + ' left out (blank, heading or total rows).' : '.');
      m.innerHTML = ''; det.innerHTML = flaggedHTML(); stage('wait', S ? 'Source mil gaya. Ab result do.' : 'Result mil gaya. Source kahan hai?', 'bulb');
      live.textContent = $('#vt').textContent + '. ' + $('#vs').textContent; return;
    }
    var c = compare(), inN = S.data.length, outN = T.data.length, diff = S.total - T.total, gap = inN - outN;
    var cls, title, sub, mood;
    var flagTxt = S.flag.length || T.flag.length ? ' Left out of the count: ' + [S.flag.length ? rows(S.flag.length, 'row') + ' in the source' : '', T.flag.length ? rows(T.flag.length, 'row') + ' in the result' : ''].filter(Boolean).join(' and ') + ' (blank, heading or total rows).' : '';
    if (gap > 0) {
      cls = 'bad'; title = 'Difference zero proves nothing: ' + rows(gap, 'row') + ' never made it in';
      sub = n(inN) + ' rows went in and ' + n(outN) + ' came out. A reconciliation of ' + Math.max(1, Math.round(outN / inN * 100)) + '% of the entries can show any difference it likes.' +
        (c.dT.length ? ' And ' + rows(c.dT.length, 'row') + ' in the result ' + (c.dT.length === 1 ? 'is a duplicate' : 'are duplicates') + ', so ' + rows(c.missing.length, 'source row') + ' are really missing.' : '');
      mood = ['buried', n(inN) + ' andar… ' + n(outN) + ' bahar. Oops.', 'sweat'];
    } else if (gap < 0) {
      cls = 'bad'; title = rows(-gap, 'more row') + ' came out than went in';
      sub = n(inN) + ' rows in, ' + n(outN) + ' out. ' + (c.dT.length ? rows(c.dT.length, 'row') + ' in the result ' + (c.dT.length === 1 ? 'is a duplicate' : 'are duplicates') + '. ' : '') + (c.extra.length ? rows(c.extra.length, 'row') + ' in the result ' + (c.extra.length === 1 ? 'is' : 'are') + ' not in the source at all.' : '');
      mood = ['buried', 'Yeh extra rows kahan se aaye?', 'bang'];
    } else if (diff !== 0) {
      cls = 'warn'; title = 'Same count, but the totals are ' + inr(Math.abs(diff)) + ' apart';
      sub = 'Both files have ' + n(inN) + ' rows. Something changed on the way: ' + (c.diffAmt.length ? rows(c.diffAmt.length, 'row') + ' matched by key ' + (c.diffAmt.length === 1 ? 'has' : 'have') + ' a different amount.' : 'check the rows below.');
      mood = ['think', 'Ginti theek, total gadbad. Hmm.', 'bang'];
    } else if (c.missing.length || c.extra.length || c.diffAmt.length || c.dT.length) {
      cls = 'warn'; title = 'Counts and totals agree, but rows were swapped';
      sub = (c.missing.length ? rows(c.missing.length, 'source row') + ' missing and ' + rows(c.extra.length, 'other row') + ' in their place. ' : '') + (c.dT.length ? rows(c.dT.length, 'duplicate') + ' in the result. ' : '') + 'Matching totals can hide this.';
      mood = ['think', 'Total same, rows alag. Dhyan se!', 'bang'];
    } else {
      cls = 'ok'; title = 'Difference zero is real';
      sub = 'Jitna andar, utna bahar: ' + n(inN) + ' rows in, ' + n(outN) + ' out, and the totals agree to the paisa. Now review the exceptions yourself.';
      mood = ['cheer', 'Jitna andar, utna bahar. Shabaash!', 'star'];
    }
    v.className = 'card verdict ' + cls; $('#vt').textContent = title; $('#vs').textContent = sub + flagTxt;
    stage(mood[0], mood[1], mood[2]);
    var card = function (k, lab, a, b, note, bad) { return '<li class="m ' + (bad ? 'bad' : 'ok') + '"><span class="ml">' + lab + '</span><span class="mv">' + a + (b != null ? '<i aria-hidden="true">→</i>' + b : '') + '</span><span class="mn">' + note + '</span></li>'; };
    m.innerHTML =
      card('rows', 'Rows in → out', n(inN), n(outN), gap ? (gap > 0 ? n(gap) + ' short' : n(-gap) + ' extra') : 'Same count', gap !== 0) +
      card('tot', 'Total in → out', inr(S.total), inr(T.total), diff ? 'Difference ' + inr(diff, true) : 'Difference zero', diff !== 0) +
      card('miss', c.byKey ? 'Missing from result (by key)' : 'Missing from result (date + amount)', n(c.missing.length), null, c.extra.length ? n(c.extra.length) + ' in the result not in the source' : 'Nothing extra in the result', c.missing.length > 0 || c.extra.length > 0) +
      card('dup', 'Duplicates', n(c.dS.length) + ' <small>source</small>', n(c.dT.length) + ' <small>result</small>', c.byKey ? 'By ' + esc(S.head[S.key]) + ' and ' + esc(T.head[T.key]) : 'By date + amount + narration', c.dT.length > 0) +
      card('flag', 'Left out of the count', n(S.flag.length) + ' <small>source</small>', n(T.flag.length) + ' <small>result</small>', S.flag.length + T.flag.length ? 'Counting every line would say ' + n(inN + S.flag.length) + ' → ' + n(outN + T.flag.length) : 'No blank or total rows', false);
    det.innerHTML = listHTML('Missing from the result', c.missing, S, 'missing') + listHTML('In the result but not in the source', c.extra, T, 'extra') +
      (c.diffAmt.length ? listHTML('Same key, different amount', c.diffAmt.map(function (p) { return p[0]; }), S, 'diffamt') : '') +
      listHTML('Duplicates in the result', c.dT, T, 'dupres') + listHTML('Duplicates in the source', c.dS, S, 'dupsrc') + flaggedHTML();
    det.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-copy'), L = LISTS[k]; copy([csvLine(L.X.head)].concat(L.rows.map(csvLine)).join('\n'), b, 'Copied ' + rows(L.rows.length, 'row') + ' as CSV'); });
    });
    live.textContent = title + '. ' + n(inN) + ' rows in, ' + n(outN) + ' out. Total in ' + inr(S.total) + ', total out ' + inr(T.total) + '.';
  }
  var LISTS = {};
  function table(X, list, extraCol) {
    var cols = X.head.map(function (_, j) { return j; }).filter(function (j) { return list.some(function (x) { return String((x.r || x)[j] || '').trim(); }); });
    var show = list.slice(0, 12);
    return '<div class="tw" tabindex="0" role="region" aria-label="Rows"><table><thead><tr><th scope="col">Line</th>' + (extraCol ? '<th scope="col">Why</th>' : '') + cols.map(function (j) { return '<th scope="col">' + esc(X.head[j]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      show.map(function (x) { var r = x.r || x; return '<tr><td class="ln">' + (r.line || '') + '</td>' + (extraCol ? '<td><b>' + esc(x.why) + '</b></td>' : '') + cols.map(function (j) { return '<td>' + esc(r[j] || '') + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>' + (list.length > show.length ? '<p class="more">Showing ' + show.length + ' of ' + n(list.length) + '. Copy them all as CSV.</p>' : '');
  }
  function listHTML(title, list, X, k) {
    if (!list.length) return '';
    LISTS[k] = { rows: list, X: X };
    return '<details class="dl"' + (k === 'missing' ? ' open' : '') + '><summary><span>' + esc(title) + '</span><b>' + n(list.length) + '</b></summary>' +
      '<div class="dl-b"><button type="button" class="b sm" data-copy="' + k + '"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg><span>Copy all ' + n(list.length) + ' as CSV</span></button>' + table(X, list) + '</div></details>';
  }
  function flaggedHTML() {
    var h = '';
    [['src', 'Left out of the source count'], ['res', 'Left out of the result count']].forEach(function (p) {
      var X = F[p[0]]; if (!X || !X.flag.length && !X.warn.length) return;
      var all = X.flag.concat(X.warn);
      h += '<details class="dl"><summary><span>' + p[1] + '</span><b>' + n(X.flag.length) + '</b></summary><div class="dl-b"><p class="more" style="margin-top:0">Blank lines, repeated headings and total or balance rows would inflate the count, so they are not counted.' +
        (X.warn.length ? ' Rows marked “Amount is not a number” are counted but add nothing to the total.' : '') + (X.pre ? ' ' + rows(X.pre, 'line') + ' above the headings ' + (X.pre === 1 ? 'was' : 'were') + ' skipped too.' : '') + '</p>' + table(X, all, true) + '</div></details>';
    });
    return h;
  }

  /* ---------- the prompt ---------- */
  function promptText() {
    var S = F.src, T = F.res;
    var sh = S ? S.head.join(', ') : 'Date, Narration, Ref No, Withdrawal, Deposit, Balance', th = T ? T.head.join(', ') : 'Ref No, Date, Amount, Status';
    var amt = S && S.amtOpts.length ? (S.amtOpts.filter(function (o) { return o.v === S.amt; })[0] || {}).t : 'Deposit minus Withdrawal';
    return ['I have two files on my computer: the source export (the bank statement) and the result (the reconciliation). Here are only their column headings, no data rows:',
      '- Source: ' + sh, '- Result: ' + th, '',
      'Write a script I can run on my own computer that reads both files and prints only these control totals, with no data rows on screen:',
      '1. Rows in each file. Leave out blank rows, repeated heading rows and total, subtotal or balance rows, and say how many of each it left out.',
      '2. The total amount in each file (source: ' + amt + '), and the difference between them.',
      '3. Duplicate rows in each file, by reference number, or by date + amount + narration where there is no reference.',
      '4. How many source rows are missing from the result and how many result rows are not in the source. Save those rows to exceptions.xlsx.',
      '', 'Amounts may use Indian commas (1,23,456.00), Dr/Cr and brackets for minus. Work on copies; do not change the original files.'].join('\n');
  }

  /* ---------- copy (no network: clipboard only) ---------- */
  function copy(text, btn, msg) {
    var lab = btn.querySelector('span') || btn, t0 = lab.textContent;
    function done(ok) { lab.textContent = ok ? msg || 'Copied' : 'Select and copy it by hand'; btn.classList.toggle('ok', ok); live.textContent = lab.textContent; setTimeout(function () { lab.textContent = t0; btn.classList.remove('ok'); }, 2400); }
    function legacy() { var a = document.createElement('textarea'), ok = false; a.value = text; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'; document.body.appendChild(a); a.select(); try { ok = document.execCommand('copy'); } catch (e) {} a.remove(); done(ok); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, legacy); else legacy();
  }
  $('#copy-prompt').addEventListener('click', function () { copy($('#copyp').textContent, $('#copy-prompt'), 'Copied. Paste it in your AI chat'); });

  /* ---------- loading ---------- */
  function load(w, text, name) {
    var X = makeFile(text, name);
    if (!X.body.length) { live.textContent = name + ': no rows found.'; return; }
    F[w] = X;
    refresh(true);
  }
  function refresh(guess) {
    ['src', 'res'].forEach(function (w) { if (F[w]) classify(F[w]); });
    if (guess) { guessKeys(); ['src', 'res'].forEach(function (w) { if (F[w]) classify(F[w]); }); }
    render();
  }
  document.addEventListener('change', function (e) {
    var s = e.target, w = s.getAttribute && s.getAttribute('data-w');
    if (!w || !F[w]) return;
    if (s.getAttribute('data-k') === 'amt') { F[w].amt = s.value; F[w].flipUser = false; }
    else { F[w].key = +s.value; F[w].keyUser = true; var o = F[w === 'src' ? 'res' : 'src']; if (o && +s.value < 0) { o.key = -1; } }
    refresh(false);
  });
  function readFile(w, f) {
    if (!f) return;
    if (f.size > 60e6) { live.textContent = 'That file is over 60 MB. Try a smaller export.'; return; }
    var r = new FileReader(); r.onload = function () { $('#samp-note').hidden = true; load(w, String(r.result), f.name); }; r.readAsText(f);
  }
  ['src', 'res'].forEach(function (w) {
    var z = $('#z-' + w), inp = $('#i-' + w), depth = 0;
    $('#b-' + w).addEventListener('click', function () { inp.click(); });
    inp.addEventListener('change', function () { readFile(w, inp.files[0]); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'dragenter') depth++; z.classList.add('drag'); }); });
    z.addEventListener('dragleave', function () { if (--depth <= 0) { depth = 0; z.classList.remove('drag'); } });
    z.addEventListener('drop', function (e) { e.preventDefault(); depth = 0; z.classList.remove('drag'); readFile(w, e.dataTransfer.files[0]); });
    $('#u-' + w).addEventListener('click', function () { var t = $('#t-' + w).value; if (t.trim()) { $('#samp-note').hidden = true; load(w, t, w === 'src' ? 'Pasted source' : 'Pasted result'); } });
  });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });
  $('#clear').addEventListener('click', function () { F.src = F.res = null; $('#samp-note').hidden = true; render(); });

  /* ---------- the sample: a made-up statement of Kapoor Industries and an AI "reco" of a tenth of it ---------- */
  function sample() {
    var seed = 20260401;
    function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    function money(p) { return inr(p).replace('₹', '').replace('−', '-'); }
    function d2(x) { return (x < 10 ? '0' : '') + x; }
    var PARTY = ['CHAIWALA TRADERS', 'SHARMA STEEL PVT LTD', 'GUPTA PACKAGING LLP', 'MEHRA LOGISTICS', 'NIMBU PAANI CATERERS', 'JUGAAD TECH SOLUTIONS', 'LADDOO SWEETS AND CO', 'PATANG EXPORTS', 'BHASAD AND ASSOCIATES', 'TIFFIN BOX FOODS'];
    var head = ['Txn Date', 'Value Date', 'Narration', 'Chq/Ref No', 'Withdrawal (Dr)', 'Deposit (Cr)', 'Balance'];
    var L = ['Kapoor Industries Pvt Ltd - Current Account XXXXXXXX4471 (fictional)', 'Statement from 01-04-2026 to 30-06-2026', '', csvLine(head)];
    var bal = 2500000 * 100, txns = [], day = 0;
    L.push(csvLine(['', '', 'Opening Balance', '', '', '', money(bal)]));
    for (var i = 0; i < 3000; i++) {
      if (rnd() < .035) day = Math.min(day + 1, 90);
      var dt = new Date(Date.UTC(2026, 3, 1 + day)), ds = d2(dt.getUTCDate()) + '-' + d2(dt.getUTCMonth() + 1) + '-' + dt.getUTCFullYear();
      var dep = rnd() < .42, amt, nar, p = pick(PARTY), ref = 'KI' + (260000 + i * 7 + Math.floor(rnd() * 7));
      if (dep) { amt = Math.round((20000 + rnd() * rnd() * 900000) * 100); nar = pick(['NEFT-' + p + '-INV ' + (1000 + i), 'RTGS-' + p + '-PAYMENT', 'UPI/' + p + '/COLLECTION', 'CHQ DEP ' + (300000 + i) + ' ' + p]); }
      else { amt = Math.round((500 + rnd() * rnd() * 700000) * 100); nar = pick(['NEFT-' + p + '-INV ' + (5000 + i), 'RTGS-' + p + '-ADVANCE', 'UPI/' + p + '/PAYMENT', 'BANK CHARGES ' + ds, 'GST PAYMENT ' + ds, 'TDS PAYMENT ' + ds, 'CHQ ' + (100000 + i) + ' ' + p]); }
      bal += dep ? amt : -amt;
      var row = [ds, ds, nar, ref, dep ? '' : money(amt), dep ? money(amt) : '', money(bal)];
      txns.push({ row: row, amt: dep ? amt : -amt, ref: ref, ds: ds, nar: nar });
      L.push(csvLine(row));
      if (i === 999 || i === 1999) { L.push(csvLine(['', '', 'Page total', '', '', '', ''])); L.push(''); L.push(csvLine(head)); }
    }
    L.push(csvLine(['', '', 'Closing Balance', '', '', '', money(bal)]));
    var src = L.join('\r\n');
    // the "AI reco": 298 entries it actually looked at, two of them twice, and a confident total line
    var pickIdx = [], step = 3000 / 298;
    for (i = 0; i < 298; i++) pickIdx.push(Math.floor(i * step + rnd() * step * .8));
    var R = [csvLine(['Ref No', 'Date', 'Narration', 'Amount', 'Matched With', 'Status'])], tot = 0;
    pickIdx.forEach(function (k, j) {
      var t = txns[k], iso = t.ds.split('-').reverse().join('-');
      var r = csvLine([t.ref, iso, t.nar, money(t.amt), 'GL 1010 / JV ' + (8000 + j), 'Matched']);
      R.push(r); tot += t.amt;
      if (j === 57 || j === 203) { R.push(r); tot += t.amt; }
    });
    R.push(csvLine(['', '', 'Total', money(tot), 'Difference: 0.00', 'Reconciled']));
    return { src: src, res: R.join('\n') };
  }
  var SAMP = null;
  $('#sample').addEventListener('click', function () {
    SAMP = SAMP || sample();
    F.src = null; F.res = null;
    load('src', SAMP.src, 'kapoor-bank-statement.csv'); load('res', SAMP.res, 'ai-bank-reco.csv');
    $('#samp-note').hidden = false;
    $('#verdict').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
  $('#dl-sample').addEventListener('click', function () {
    SAMP = SAMP || sample();
    [['kapoor-bank-statement.csv', SAMP.src], ['ai-bank-reco.csv', SAMP.res]].forEach(function (f) {
      var u = URL.createObjectURL(new Blob([f[1]], { type: 'text/csv' })), a = document.createElement('a');
      a.href = u; a.download = f[0]; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 3000);
    });
  });
  // the falling paper for the "buried" verdict
  var pile = $('#pile');
  for (var i = 0; i < 22; i++) {
    var sh = document.createElement('span'); sh.className = 'sheet';
    sh.style.cssText = '--x:' + (8 + (i * 37) % 84) + '%;--y:' + (i < 16 ? 2 + (i * 13) % 26 : 28 + (i * 7) % 16) + '%;--r:' + ((i * 47) % 70 - 35) + 'deg;--d:' + (i * 55) + 'ms';
    pile.appendChild(sh);
  }
  render();
  window.__countCheck = { paise: paise, inr: inr, parse: parse, F: F };
})();
