/* Safe to paste? Finds PANs, GSTINs, Aadhaar-like and account numbers, IFSCs, emails, phones, names, amounts and dates.
   Everything runs in this browser tab. No requests, no storage, no analytics. The Content-Security-Policy blocks network calls. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- what we look for ---------- */
  var T = {
    party: ['name', 'names', 'PARTY'], pan: ['PAN', 'PANs', 'PAN'], gstin: ['GSTIN', 'GSTINs', 'GSTIN'],
    aadhaar: ['Aadhaar-like number', 'Aadhaar-like numbers', 'AADHAAR'], acct: ['account number', 'account numbers', 'ACCT'],
    ifsc: ['IFSC', 'IFSCs', 'IFSC'], email: ['email', 'emails', 'EMAIL'], phone: ['phone number', 'phone numbers', 'PHONE'],
    amount: ['amount', 'amounts', 'AMT'], date: ['date', 'dates', 'DATE']
  };
  var ORDER = ['party', 'pan', 'gstin', 'aadhaar', 'acct', 'ifsc', 'email', 'phone', 'amount', 'date'];
  var SENS = { party: 1, pan: 1, gstin: 1, aadhaar: 1, acct: 1, ifsc: 1, email: 1, phone: 1 };
  var MON = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*';
  var DATE = '(?:\\d{1,2}[\\/.-]\\d{1,2}[\\/.-](?:\\d{4}|\\d{2})|\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}[ -]' + MON + '[ ,-]*(?:\\d{4}|\\d{2})|' + MON + ' \\d{1,2},? \\d{4})';
  var RX = {
    email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g,
    gstin: /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g,
    ifsc: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    date: new RegExp('(?<![\\w/.-])' + DATE + '(?![\\w/]|[.-]\\d)', 'gi'),
    aadhaarG: /(?<![\w.,-])[2-9]\d{3}([ -])\d{4}\1\d{4}(?!\w|[.,-]\d)/g,
    d12: /(?<![\w.,-])[2-9]\d{11}(?!\w|[.,-]\d)/g,
    mobile: /(?<![\w+])(?:\+91[\s-]?|91[\s-]|0)?[6-9]\d{4}[\s-]?\d{5}(?!\w|[.,-]\d)/g,
    land: /(?<![\w])0\d{2,4}[\s-]\d{3,4}[\s-]?\d{4}(?!\w|[.,-]\d)/g,
    acct: /(?<![\w.,-])\d{9,18}(?!\w|[.,-]\d)/g,
    acctCol: /(?<![\w.,])\d[\d -]{4,22}\d(?![\w,]|\.\d)/g,
    amount: /(?:₹|\bRs\.?|\bINR)\s?-?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:Dr|Cr)\b)?|(?<![\w.,\/-])-?\d{1,3}(?:,\d{2,3})*,\d{3}(?:\.\d{1,2})?(?:\s?(?:Dr|Cr)\b)?(?![\d,]|\.\d)|(?<![\w.,\/-])-?\d+\.\d{2}(?:\s?(?:Dr|Cr)\b)?(?![\d]|\.\d)/gi
  };
  var DATE_FULL = new RegExp('^' + DATE + '$', 'i');
  // Verhoeff check digit (Aadhaar uses it)
  var VD = '0123456789123406789523401789563401289567401239567859876043216598710432765982104387659321049876543210'.split('').map(Number);
  var VP = '01234567891576283094580379614289160435279453126870428657390127938064157046913258'.split('').map(Number);
  function verhoeff(s) { var c = 0, n = s.length; for (var i = 0; i < n; i++) c = VD[c * 10 + VP[(i % 8) * 10 + +s[n - 1 - i]]]; return c === 0; }

  var STOP = ('NEFT RTGS IMPS UPI CHQ CHEQUE CLG CLEARING TRF TRANSFER TRANSFERRED TO BY FROM FOR PAYMENT PAYMENTS PAID PAY RECEIVED RECEIPT RECEIPTS SALARY SAL CHARGES CHARGE ' +
    'INTEREST INT CASH DEPOSIT DEPOSITS WITHDRAWAL ATM POS REF INV INVOICE BILL BILLS GST IGST CGST SGST TDS TCS AND THE OF ON IN AT AGAINST BEING FUND FUNDS RENT FEE FEES REFUND ' +
    'REVERSAL REV BANK BRANCH SBI HDFC ICICI AXIS KOTAK PNB BOB CANARA IDFC INDUSIND YES UNION ADVANCE PURCHASE PURCHASES SALES SALE EXPENSES EXPENSE EXP ELECTRICITY OPENING CLOSING ' +
    'BALANCE BAL TOTAL SUBTOTAL GRAND SUSPENSE JOURNAL CONTRA ENTRY NO NUMBER ACCOUNT AC A/C DEBIT CREDIT DR CR NET GROSS AMOUNT AMT DATE VOUCHER PARTY NAME NARRATION ' +
    'JANUARY FEBRUARY MARCH APRIL MAY JUNE JULY AUGUST SEPTEMBER OCTOBER NOVEMBER DECEMBER JAN FEB MAR APR JUN JUL AUG SEP SEPT OCT NOV DEC ' +
    'MONDAY TUESDAY WEDNESDAY THURSDAY FRIDAY SATURDAY SUNDAY DEAR HI HELLO REGARDS THANKS THANK YOU PLEASE KINDLY SIR MADAM TEAM SUBJECT RE FW FWD ' +
    'NOTE ATTACHED FIND WE I OUR YOUR THIS THAT IT IS ARE WAS PER AS ALSO WITH ANY ALL NOT OR IF MONTH YEAR QUARTER FY AY Q1 Q2 Q3 Q4 TAX RETURN ' +
    'FILE FILES SHEET LEDGER REPORT STATEMENT AUDIT OFFICE MAINTENANCE TRAVEL CONVEYANCE FREIGHT CARRIAGE PROFESSIONAL CONSULTANCY CONTRACT WAGES BONUS ' +
    'IMPREST PETTY STATIONERY PRINTING POSTAGE TELEPHONE INTERNET REPAIRS INSURANCE PREMIUM LOAN EMI PRINCIPAL DIVIDEND TRANSPORT GOODS SERVICES SERVICE ' +
    'AADHAAR AADHAR PAN GSTIN IFSC UTR MOBILE PHONE CALL CONTACT EMAIL MAIL AMC ' +
    'DUE DUES PENDING SETTLEMENT SETTLED ADJUSTMENT ADJ PART FULL FINAL FIRST SECOND NEW OLD ONLINE OFFLINE NA NIL STATUS MATCHED UNMATCHED OK').split(' ');
  var STOPS = {}; STOP.forEach(function (w) { STOPS[w] = 1; });
  var SUFFIX = /^(LTD|LIMITED|PVT|PRIVATE|LLP|TRADERS|TRADING|ENTERPRISES|ENTERPRISE|INDUSTRIES|CORPORATION|CORP|AGENCIES|AGENCY|SONS|BROS|BROTHERS|ASSOCIATES|SOLUTIONS|STORES|INC|CO|COMPANY|CATERERS|LOGISTICS|PACKAGING|STEEL|TEXTILES|MOTORS|PHARMA|FOODS|SWEETS|INFRA|BUILDERS|EXPORTS|IMPORTS|HUF)$/;
  var HON = /^(MR|MRS|MS|SHRI|SMT|DR|M\/S|KUM|SRI)\.?$/i;

  /* ---------- column kinds from the heading ---------- */
  function colKind(h) {
    h = (h || '').toLowerCase();
    if (/date|\bdt\b|dated/.test(h)) return 'date';
    if (/ifsc/.test(h)) return 'text';
    if (/pan\b|gstin|aadhaar|aadhar|uid/.test(h)) return 'text';
    if (/e-?mail/.test(h)) return 'text';
    if (/phone|mobile|contact no|\btel\b|whatsapp/.test(h)) return 'phone';
    if (/a\/c|\bac\b|account|acct|bank no/.test(h) && !/head|name|group/.test(h)) return 'acct';
    if (/\bref|utr|chq|cheque|voucher|\bvch|invoice|\binv\b|bill no|txn|transaction id|\bid\b|doc|serial|sr\.? ?no|s\.? ?no|code|hsn/.test(h)) return 'ref';
    if (/name|party|vendor|supplier|customer|client|payee|beneficiary|employee|debtor|creditor|director|proprietor|person|drawer|payer/.test(h)) return 'name';
    if (/amount|amt|debit|credit|\bdr\b|\bcr\b|withdrawal|deposit|balance|value|total|igst|cgst|sgst|tds|\bnet\b|gross|price|rate|salary|fee|\btax\b|qty|quantity|paid|received/.test(h)) return 'amount';
    return 'text';
  }
  function parseAmt(s) {
    s = String(s).trim(); if (!s) return null;
    s = s.replace(/^(₹|rs\.?|inr)\s*/i, '').replace(/\s*(dr|cr)\.?$/i, '').replace(/^\((.*)\)$/, '$1').replace(/,/g, '').replace(/^-/, '');
    return /^\d+(\.\d+)?$/.test(s) ? +s : null;
  }

  /* ---------- scanning ---------- */
  function scan(str, kind) {
    var out = [];
    if (!str) return out;
    function add(s, e, t) {
      for (var i = 0; i < out.length; i++) if (s < out[i].e && e > out[i].s) return false;
      out.push({ s: s, e: e, t: t, v: str.slice(s, e) }); return true;
    }
    function each(re, fn) { re.lastIndex = 0; var m; while ((m = re.exec(str))) { fn(m); if (!m[0].length) re.lastIndex++; } }
    var tr = str.trim(), lead = str.indexOf(tr);
    if (kind === 'amount' && parseAmt(tr) !== null) { add(lead, lead + tr.length, 'amount'); return out; }
    if (kind === 'date' && DATE_FULL.test(tr)) { add(lead, lead + tr.length, 'date'); return out; }
    each(RX.email, function (m) { add(m.index, m.index + m[0].length, 'email'); });
    each(RX.gstin, function (m) { add(m.index, m.index + m[0].length, 'gstin'); });
    each(RX.ifsc, function (m) { add(m.index, m.index + m[0].length, 'ifsc'); });
    each(RX.pan, function (m) { add(m.index, m.index + m[0].length, 'pan'); });
    each(RX.date, function (m) { add(m.index, m.index + m[0].length, 'date'); });
    if (kind === 'acct') each(RX.acctCol, function (m) { if (m[0].replace(/\D/g, '').length >= 6) add(m.index, m.index + m[0].length, 'acct'); });
    if (kind !== 'ref') {
      each(RX.aadhaarG, function (m) { add(m.index, m.index + m[0].length, 'aadhaar'); });
      each(RX.d12, function (m) { if (verhoeff(m[0])) add(m.index, m.index + m[0].length, 'aadhaar'); });
      each(RX.mobile, function (m) { add(m.index, m.index + m[0].length, 'phone'); });
      each(RX.land, function (m) { add(m.index, m.index + m[0].length, 'phone'); });
      if (kind !== 'phone') each(RX.acct, function (m) { add(m.index, m.index + m[0].length, 'acct'); });
    }
    if (kind !== 'ref') each(RX.amount, function (m) { add(m.index, m.index + m[0].length, 'amount'); });
    if (kind === 'name') {
      var words = tr.toUpperCase().match(/[A-Z][A-Z.'&]*/g) || [];
      var real = words.filter(function (w) { return !STOPS[w.replace(/[.']/g, '')] && w.length > 1; });
      if (real.length && !out.some(function (o) { return o.t !== 'amount' && o.t !== 'date'; })) add(lead, lead + tr.length, 'party');
    } else if (kind !== 'date' && kind !== 'amount') names(str, add);
    out.sort(function (a, b) { return a.s - b.s; });
    return out;
  }
  // runs of capitalised words that are not banking words: "SHARMA STEEL PVT LTD", "Rohan Verma", "Mr. Mehra"
  function names(str, add) {
    var re = /M\/[Ss]\.?|[A-Za-z][A-Za-z'&]*\.?|&/g, m, toks = [];
    while ((m = re.exec(str))) toks.push({ s: m.index, e: m.index + m[0].length, w: m[0] });
    var run = [];
    function flush() {
      if (!run.length) return;
      var hasSuf = run.some(function (t) { return SUFFIX.test(t.w.toUpperCase().replace(/\./g, '')); });
      var hon = run.length > 1 && HON.test(run[0].w);
      var core = run.filter(function (t) { return !SUFFIX.test(t.w.toUpperCase().replace(/\./g, '')) && t.w !== '&'; });
      if ((run.length >= 2 && core.length >= 1) || (hasSuf && core.length) || hon) {
        while (run.length && run[run.length - 1].w === '&') run.pop();
        if (run.length) add(run[0].s, run[run.length - 1].e - (/\.$/.test(run[run.length - 1].w) && !hon && !hasSuf ? 1 : 0), 'party');
      }
      run = [];
    }
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], up = t.w.toUpperCase().replace(/[.']/g, '');
      var gap = run.length ? str.slice(run[run.length - 1].e, t.s) : '';
      if (run.length && !/^ {1,2}$/.test(gap)) flush();
      var cap = /^[A-Z]/.test(t.w) || t.w === '&';
      var isHon = HON.test(t.w);
      if (isHon && !run.length) { run.push(t); continue; }
      if (cap && (!STOPS[up] || (SUFFIX.test(up) && run.length)) && up.length > 1 || (t.w === '&' && run.length)) run.push(t);
      else flush();
    }
    flush();
  }

  /* ---------- CSV / TSV ---------- */
  function sniff(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); }).slice(0, 25), best = null, bestScore = 0;
    ['\t', ',', ';', '|'].forEach(function (d) {
      var counts = lines.map(function (l) { var n = 0, q = false; for (var i = 0; i < l.length; i++) { if (l[i] === '"') q = !q; else if (!q && l[i] === d) n++; } return n; });
      if (!counts[0]) return;
      var same = counts.filter(function (c) { return c === counts[0]; }).length / counts.length;
      var score = same * (d === '\t' ? 1.2 : 1) * Math.min(counts[0], 6);
      if (same >= .6 && score > bestScore) { bestScore = score; best = d; }
    });
    return best;
  }
  function parse(text, d) {
    var rows = [], row = [], f = '', q = false, i = 0, n = text.length, c;
    for (; i < n; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"' && f === '') q = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function quote(v, d) { return /["\r\n]/.test(v) || v.indexOf(d) >= 0 ? '"' + v.replace(/"/g, '""') + '"' : v; }

  /* ---------- analysis ---------- */
  var A = null;
  function analyse(raw) {
    var text = raw.replace(/^﻿/, '');
    if (!text.trim()) return null;
    var d = sniff(text), res = { tokens: {}, counts: {}, uniq: {}, rowsHit: 0 };
    ORDER.forEach(function (t) { res.tokens[t] = new Map(); res.counts[t] = 0; });
    if (d) {
      var rows = parse(text, d).filter(function (r) { return r.some(function (c) { return c.trim(); }); });
      if (rows.length >= 2) {
        res.mode = 'table'; res.d = d;
        var h = rows[0], hasHead = h.every(function (c) { return !scan(c, 'text').some(function (m) { return m.t !== 'party'; }); }) && h.filter(function (c) { return /[A-Za-z]/.test(c); }).length >= Math.max(1, h.length / 2);
        res.head = hasHead ? h : null;
        var body = hasHead ? rows.slice(1) : rows, ncol = Math.max.apply(null, rows.map(function (r) { return r.length; }));
        res.kinds = []; for (var k = 0; k < ncol; k++) res.kinds.push(hasHead ? colKind(h[k]) : 'text');
        res.rows = body; res.m = body.map(function (r) {
          var hit = false, ms = r.map(function (c, j) { var x = scan(c, res.kinds[j] || 'text'); if (x.some(function (o) { return SENS[o.t]; })) hit = true; return x; });
          if (hit) res.rowsHit++; return ms;
        });
        res.m.forEach(function (r) { r.forEach(function (ms) { ms.forEach(tok); }); });
      }
    }
    if (!res.mode) { res.mode = 'text'; res.text = text; res.tm = scan(text, 'text'); res.tm.forEach(tok); }
    function tok(o) {
      res.counts[o.t]++;
      var key = norm(o.v, o.t), mp = res.tokens[o.t];
      if (!mp.has(key)) mp.set(key, { n: mp.size + 1, v: o.v.trim(), c: 0 });
      var e = mp.get(key); e.c++; o.k = T[o.t][2] + '_' + pad(e.n);
    }
    ORDER.forEach(function (t) { res.uniq[t] = res.tokens[t].size; });
    res.sens = ORDER.reduce(function (a, t) { return a + (SENS[t] ? res.counts[t] : 0); }, 0);
    return res;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function norm(v, t) {
    v = v.toUpperCase();
    if (t === 'party') return v.replace(/\bM\/S\.?|\bMR\.?|\bMRS\.?|\bMS\.?|\bSHRI\b|\bSMT\.?/g, ' ').replace(/[^A-Z0-9&]+/g, ' ').replace(/\b(PRIVATE|PVT|LIMITED|LTD|LLP|CO|INC)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (t === 'amount') return String(parseAmt(v));
    return v.replace(/[\s-]/g, '');
  }

  /* ---------- rendering ---------- */
  var MAXR = 300;
  function marked(str, ms) {
    var h = '', p = 0;
    ms.forEach(function (m) {
      h += esc(str.slice(p, m.s)) + '<mark class="t-' + m.t + '" title="' + esc(T[m.t][0]) + '">' + esc(str.slice(m.s, m.e)) + '</mark>'; p = m.e;
    });
    return h + esc(str.slice(p));
  }
  function masked(str, ms, all) {
    var h = '', p = 0;
    ms.forEach(function (m) {
      if (!all && (m.t === 'amount' || m.t === 'date')) return;
      var lead = str.slice(m.s, m.e).match(/^\s*/)[0], tail = str.slice(m.s, m.e).match(/\s*$/)[0];
      h += str.slice(p, m.s) + lead + m.k + tail; p = m.e;
    });
    return h + str.slice(p);
  }
  function tableHTML(head, rows, cell) {
    var n = Math.min(rows.length, MAXR), h = '<table><thead><tr><th scope="col"><span class="vh">Row</span></th>';
    var ncol = Math.max(head ? head.length : 0, rows.reduce(function (a, r) { return Math.max(a, r.length); }, 0));
    for (var j = 0; j < ncol; j++) h += '<th scope="col">' + esc(head ? head[j] || '' : 'Column ' + (j + 1)) + '</th>';
    h += '</tr></thead><tbody>';
    for (var i = 0; i < n; i++) {
      h += '<tr><td class="n">' + (i + 1) + '</td>';
      for (j = 0; j < ncol; j++) h += '<td>' + cell(i, j) + '</td>';
      h += '</tr>';
    }
    return '<div class="view" tabindex="0" role="region" aria-label="Table preview">' + h + '</tbody></table></div>' +
      (rows.length > n ? '<p class="more">Showing the first ' + n + ' of ' + fmt(rows.length) + ' rows. The counts, the masked copy and the headings cover all of them.</p>' : '');
  }
  function fmt(n) { return Number(n).toLocaleString('en-IN'); }
  function maskedText(all) {
    if (!A) return '';
    if (A.mode === 'text') return masked(A.text, A.tm, all);
    var d = A.d, out = [];
    if (A.head) out.push(A.head.map(function (c) { return quote(c, d); }).join(d));
    A.rows.forEach(function (r, i) { out.push(r.map(function (c, j) { return quote(masked(c, A.m[i][j], all), d); }).join(d)); });
    return out.join('\n');
  }

  var src = $('#src'), stage = $('#stage'), bub = $('#bub'), gy = $('#gy'), live = $('#live');
  var vt = $('#vt'), vs = $('#vs'), chips = $('#chips'), maskAll = $('#mask-all');
  var mood = { s: 'idle', fx: '', line: bub.textContent }, tab = 'hl';

  function summary(res) {
    var parts = [];
    ORDER.forEach(function (t) { var c = res.counts[t]; if (c) parts.push(fmt(c) + ' ' + (c === 1 ? T[t][0] : T[t][1])); });
    return parts;
  }
  function render() {
    var res = A;
    $('#pill-hl').hidden = !res || !res.sens; $('#ok-band').hidden = !res;
    if (!res) {
      vt.className = 'vt'; vt.textContent = 'Nothing pasted yet';
      vs.textContent = 'Paste some rows or try the sample. Gyaani will tell you what an AI chat would see.';
      chips.innerHTML = ''; live.textContent = '';
      $('#hl-view').innerHTML = '<p class="empty">Paste something above, or press <strong>Try a sample</strong>.</p>';
      $('#mk-view').innerHTML = '<p class="empty">The masked copy appears here.</p>'; $('#key-view').innerHTML = '';
      $('#hd-view').innerHTML = '<p class="empty">The headings appear here.</p>';
      setMood('idle', '', 'Paste kuch bhi. Main sirf dekhunga, bhejunga kuch nahi.');
      return;
    }
    var parts = summary(res), ids = res.counts.pan + res.counts.gstin + res.counts.aadhaar + res.counts.acct;
    var rowsTxt = res.mode === 'table' ? ' in ' + fmt(res.rowsHit) + ' of ' + fmt(res.rows.length) + ' rows' : '';
    if (res.sens) {
      vt.className = 'vt bad'; vt.textContent = 'Not safe to paste';
      vs.innerHTML = '<strong>' + fmt(res.sens) + ' sensitive ' + (res.sens === 1 ? 'value' : 'values') + '</strong>' + esc(rowsTxt) + '. Give the AI the headings instead.';
    } else if (res.counts.amount || res.counts.date) {
      vt.className = 'vt warn'; vt.textContent = 'Careful: these are real figures';
      vs.textContent = 'No IDs or names found, but amounts and dates still belong to the company or client.';
    } else {
      vt.className = 'vt ok'; vt.textContent = 'Nothing sensitive found';
      vs.textContent = 'The pattern checks found no IDs, names, amounts or dates. Read it once yourself anyway.';
    }
    chips.innerHTML = ORDER.filter(function (t) { return res.counts[t]; }).map(function (t) {
      var c = res.counts[t], u = res.uniq[t];
      return '<li class="t-' + t + '"><b>' + fmt(c) + '</b> ' + esc(c === 1 ? T[t][0] : T[t][1]) + (u < c && u > 0 ? ' <small>(' + fmt(u) + ' different)</small>' : '') + '</li>';
    }).join('');
    live.textContent = vt.textContent + '. ' + (parts.length ? 'Found ' + parts.join(', ') + '.' : '');
    // Gyaani
    if (res.sens >= 10 || res.counts.aadhaar) setMood('lots', 'sweat', pick(['Arre! Aankhein band! ' + fmt(res.sens) + ' sensitive cheezein!', 'Main yeh nahi dekh sakta! Chat mein toh bilkul nahi.']));
    else if (res.sens) setMood('some', 'bang', ids ? fmt(ids) + ' ID' + (ids > 1 ? 's' : '') + ' dikhe! Yeh chat mein nahi jaayega.' : 'Naam aur number dikhe. Yeh nahi bhejna.');
    else if (res.counts.amount || res.counts.date) setMood('some', 'bang', 'ID nahi, par yeh company ke figures hain.');
    else setMood('idle', 'bulb', 'Saaf lag raha hai. Phir bhi, sirf headings do.');
    // views
    if (res.mode === 'table') {
      $('#hl-view').innerHTML = tableHTML(res.head, res.rows, function (i, j) { var c = res.rows[i][j]; return c == null ? '' : marked(c, res.m[i][j]); });
    } else $('#hl-view').innerHTML = '<div class="view" tabindex="0" role="region" aria-label="Text preview"><pre>' + marked(res.text.slice(0, 60000), res.tm.filter(function (m) { return m.e <= 60000; })) + '</pre></div>';
    renderMasked(); renderKey(); renderHeads();
  }
  function renderMasked() {
    if (!A) return;
    var all = maskAll.checked;
    if (A.mode === 'table') $('#mk-view').innerHTML = tableHTML(A.head, A.rows, function (i, j) { var c = A.rows[i][j]; return c == null ? '' : esc(masked(c, A.m[i][j], all)); });
    else $('#mk-view').innerHTML = '<div class="view" tabindex="0" role="region" aria-label="Masked text"><pre>' + esc(maskedText(all).slice(0, 60000)) + '</pre></div>';
  }
  function renderKey() {
    var rows = [];
    ORDER.forEach(function (t) { if (t === 'amount' || t === 'date') return; A.tokens[t].forEach(function (e) { rows.push('<tr><td>' + T[t][2] + '_' + pad(e.n) + '</td><td>' + esc(e.v) + '</td><td>' + e.c + '</td></tr>'); }); });
    $('#key-view').innerHTML = rows.length ? '<div class="view" style="max-height:300px;margin-top:8px"><table><thead><tr><th scope="col">Token</th><th scope="col">Original</th><th scope="col">Times</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' : '<p>No tokens yet.</p>';
  }

  /* ---------- headings only ---------- */
  var taskEdited = false;
  function hint(j) {
    var c = {}, n = 0, sample = [];
    A.rows.forEach(function (r, i) {
      var v = (r[j] || '').trim(); if (!v) return; n++;
      var ms = A.m[i][j], t = ms.length === 1 && ms[0].v.trim() === v ? ms[0].t : (ms.length ? 'mixed' : (/^-?\d+$/.test(v) ? 'number' : 'text'));
      c[t] = (c[t] || 0) + 1; if (sample.length < 40) sample.push(v);
    });
    if (!n) return 'blank in every row';
    var top = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0];
    if (c[top] / n < .5) top = 'mixed';
    var kind = A.kinds[j];
    if (top === 'date') {
      var f = sample.filter(function (v) { return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v); }).length > sample.length / 2 ? 'DD/MM/YYYY' :
        sample.filter(function (v) { return /^\d{1,2}-\d{1,2}-\d{4}$/.test(v); }).length > sample.length / 2 ? 'DD-MM-YYYY' :
        sample.filter(function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v); }).length > sample.length / 2 ? 'YYYY-MM-DD' :
        sample.filter(function (v) { return /[a-z]{3}/i.test(v); }).length > sample.length / 2 ? 'like 05-Apr-2026' : '';
      return 'dates' + (f ? ', ' + f : '');
    }
    if (top === 'amount' || top === 'number' && kind === 'amount') {
      var ind = sample.some(function (v) { return /\d,\d{2},\d{3}/.test(v); }), drcr = sample.some(function (v) { return /(dr|cr)\.?$/i.test(v); });
      var blanks = n < A.rows.length;
      return 'amounts' + (ind ? ' with Indian commas, like 1,23,456.00' : '') + (drcr ? ', ending in Dr or Cr' : '') + (blanks ? '; blank in some rows' : '');
    }
    var H = { pan: '10-character PAN', gstin: '15-character GSTIN', aadhaar: '12-digit Aadhaar number', acct: 'bank account numbers', ifsc: 'IFSC codes',
      email: 'email addresses', phone: 'phone numbers', party: kind === 'name' ? 'names of parties' : 'free text with names in it', number: kind === 'ref' ? 'reference numbers' : 'whole numbers',
      text: kind === 'ref' ? 'reference codes' : 'text', mixed: kind === 'ref' ? 'reference codes' : 'free text' };
    return H[top] || 'text';
  }
  function renderHeads() {
    var el = $('#hd-view');
    if (A.mode !== 'table') {
      var found = ORDER.filter(function (t) { return A.counts[t]; }).map(function (t) { return T[t][1]; });
      el.innerHTML = '<div class="safe"><div><h3>This is text, not a table</h3><p class="fine" style="margin-top:0">There are no column headings to give. Describe what the document holds instead, without any of its values. The prompt on the right does that for you.</p>' +
        (found.length ? '<ul class="hcols"><li><b>Holds</b><span>' + esc(list(found)) + '</span></li></ul>' : '') + '</div>' + promptBox() + '</div>';
    } else {
      var head = A.head || A.kinds.map(function (_, j) { return 'Column ' + (j + 1); });
      el.innerHTML = '<div class="safe"><div><h3>The safe thing to give an AI</h3>' + (A.head ? '' : '<p class="warn-box" style="margin-top:0">Your rows had no heading row, so the columns are numbered. Type your real headings into the prompt.</p>') +
        '<ul class="hcols">' + head.map(function (h, j) { return '<li><b>' + esc(h || 'Column ' + (j + 1)) + '</b><span>' + esc(hint(j)) + '</span></li>'; }).join('') + '</ul>' +
        '<p class="fine">No values, only the shape of the file. That is all the AI needs to write a script for it.</p></div>' + promptBox() + '</div>';
    }
    var ti = $('#task');
    if (!taskEdited || !ti.value) ti.value = defTask();
    ti.addEventListener('input', function () { taskEdited = true; $('#prompt').textContent = prompt(); });
    $('#prompt').textContent = prompt();
    $('#copy-p').addEventListener('click', function () { copy(prompt(), $('#copy-p'), 'Copied. Paste it in your AI chat'); });
  }
  function promptBox() {
    return '<div><label class="task" for="task">What should the script do?</label><textarea class="task-in" id="task" rows="2"></textarea>' +
      '<div class="pbox"><button type="button" class="cbtn" id="copy-p"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg><span>Copy the safe prompt</span></button>' +
      '<pre id="prompt"></pre></div></div>';
  }
  function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function cols(kind) { if (!A.head) return []; return A.head.filter(function (h, j) { return A.kinds[j] === kind || (kind === 'amount' && hint(j).indexOf('amounts') === 0); }); }
  function defTask() {
    if (A.mode !== 'table') return 'finds every PAN, account number and amount in it and lists them in a new Excel file on my computer';
    var amt = cols('amount').filter(function (h) { return !/balance/i.test(h); }), nm = cols('name'), pan = A.head && A.head.filter(function (h) { return /\bpan\b/i.test(h); })[0];
    if (amt.length && nm.length) return 'totals ' + list(amt) + ' by ' + nm[0] + (pan ? ', and lists the rows where ' + pan + ' is blank or not in the PAN format' : '') + ', in a new Excel file';
    if (amt.length) return 'totals ' + list(amt) + ' by month, and lists blank and duplicate rows in a new Excel file';
    return 'lists blank and duplicate rows in a new Excel file';
  }
  function prompt() {
    var task = ($('#task') && $('#task').value.trim()) || defTask(), L = [];
    if (A.mode === 'table') {
      var head = A.head || A.kinds.map(function (_, j) { return 'Column ' + (j + 1); });
      L.push('Here are only the column headings of my file (no data rows):', head.join(', '), '', 'What each column holds (no real values):');
      head.forEach(function (h, j) { L.push('- ' + h + ': ' + hint(j)); });
      L.push('', 'Write a script I can run on my own computer that ' + task.replace(/\.$/, '') + '.', '', 'Rules:',
        '- Do not ask me for data rows. The script reads the file on my computer; I will give you its path.',
        '- Work on a copy. Never change the original file.');
      var amt = cols('amount').filter(function (h) { return !/balance/i.test(h); });
      L.push('- Print only counts and totals: rows read, rows written' + (amt.length ? ', and the total of ' + list(amt) + ' in and out' : '') + ', so I can check they agree. No data rows on screen.');
    } else {
      var found = ORDER.filter(function (t) { return A.counts[t]; }).map(function (t) { return T[t][1]; });
      L.push('I have a text document on my computer. ' + (found.length ? 'It contains ' + list(found) + '. I am not sharing any of them.' : 'I am not sharing its contents.'), '',
        'Write a script I can run on my own computer that ' + task.replace(/\.$/, '') + '.', '', 'Rules:',
        '- Do not ask me for the text. The script reads the file on my computer; I will give you its path.', '- Work on a copy. Never change the original.',
        '- Print only counts: how many of each item it found. No values on screen.');
    }
    return L.join('\n');
  }

  /* ---------- Gyaani ---------- */
  var flap = 0, typing = 0;
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function mouth(m) { if (m) gy.setAttribute('data-m', m); else gy.removeAttribute('data-m'); }
  function talk(ms) {
    clearTimeout(flap); if (reduce) return;
    var end = Date.now() + ms, last = 0;
    (function step() { if (Date.now() > end) { mouth(0); return; } var m; do { m = 1 + Math.floor(Math.random() * 4); } while (m === last); last = m; mouth(Math.random() < .18 ? 0 : m); flap = setTimeout(step, 70 + Math.random() * 50); })();
  }
  function show(s, fx, line) {
    var changed = stage.getAttribute('data-s') !== s || bub.textContent !== line;
    stage.setAttribute('data-s', s); stage.setAttribute('data-fx', fx || '');
    if (!changed) return;
    clearInterval(typing);
    if (reduce) { bub.textContent = line; return; }
    bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
    var n = 0; bub.textContent = '';
    typing = setInterval(function () { n++; bub.textContent = line.slice(0, n); if (n >= line.length) clearInterval(typing); }, 22);
    if (s !== 'lots' && s !== 'cheer') talk(line.length * 22 + 200);
    if (s !== 'lots') { gy.classList.remove('hop'); void gy.offsetWidth; gy.classList.add('hop'); }
  }
  function setMood(s, fx, line) { mood = { s: s, fx: fx, line: line }; if (tab !== 'hd' || !A) show(s, fx, line); }
  gy.addEventListener('animationend', function (e) { if (e.animationName === 'gy-hop') gy.classList.remove('hop'); });
  if (!reduce) (function blink() {
    setTimeout(function () { if (stage.getAttribute('data-s') !== 'lots') { gy.classList.add('blink'); setTimeout(function () { gy.classList.remove('blink'); }, 120); } blink(); }, 2200 + Math.random() * 3000);
  })();

  /* ---------- tabs ---------- */
  var tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
  function select(t, focus) {
    tabs.forEach(function (b) {
      var on = b === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
      $('#' + b.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
    tab = t.id.slice(4);
    if (tab === 'hd' && A) show('cheer', 'star', A.sens ? 'Sirf headings? Shabaash! Yeh safe hai.' : 'Headings hi kaafi hain. Bilkul safe!');
    else show(mood.s, mood.fx, mood.line);
  }
  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () { select(b); });
    b.addEventListener('keydown', function (e) {
      var k = e.key, j = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : -1;
      if (j < 0 && k !== 'ArrowLeft') return; e.preventDefault(); select(tabs[(j + tabs.length) % tabs.length], true);
    });
  });

  /* ---------- copy and save (no network: clipboard and a local blob) ---------- */
  function copy(text, btn, msg) {
    var lab = btn.querySelector('span') || btn, t0 = lab.textContent;
    function done(ok) { lab.textContent = ok ? (msg || 'Copied') : 'Select and copy it by hand'; btn.classList.toggle('ok', ok); live.textContent = lab.textContent; setTimeout(function () { lab.textContent = t0; btn.classList.remove('ok'); }, 2400); }
    function legacy() { var a = document.createElement('textarea'), ok = false; a.value = text; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'; document.body.appendChild(a); a.select(); try { ok = document.execCommand('copy'); } catch (e) {} a.remove(); done(ok); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, legacy); else legacy();
  }
  $('#copy-mk').addEventListener('click', function () { if (A) copy(maskedText(maskAll.checked), $('#copy-mk'), 'Copied masked copy'); });
  $('#dl-mk').addEventListener('click', function () {
    if (!A) return;
    var u = URL.createObjectURL(new Blob(['﻿' + maskedText(maskAll.checked)], { type: 'text/csv' })), a = document.createElement('a');
    a.href = u; a.download = A.mode === 'table' ? 'masked-copy.csv' : 'masked-copy.txt'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
  });
  maskAll.addEventListener('change', renderMasked);

  /* ---------- input ---------- */
  var timer = 0;
  function run(jump) {
    A = analyse(src.value); render();
    if (jump && A && innerWidth < 980) $('.desk').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  src.addEventListener('input', function () { $('#samp-note').hidden = true; clearTimeout(timer); timer = setTimeout(run, 220); });
  $('#clear').addEventListener('click', function () { src.value = ''; $('#samp-note').hidden = true; taskEdited = false; run(); src.focus(); });
  $('#sample').addEventListener('click', function () { src.value = SAMPLE; $('#samp-note').hidden = false; taskEdited = false; run(true); });
  function readFile(f) {
    if (!f) return;
    if (f.size > 25e6) { live.textContent = 'That file is over 25 MB. Paste a part of it instead.'; vs.textContent = live.textContent; return; }
    var r = new FileReader();
    r.onload = function () { src.value = String(r.result); $('#samp-note').hidden = true; taskEdited = false; run(true); };
    r.readAsText(f);
  }
  $('#pick').addEventListener('click', function () { $('#file').click(); });
  $('#file').addEventListener('change', function () { readFile(this.files[0]); this.value = ''; });
  var drop = $('#drop'), depth = 0;
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'dragenter') depth++; drop.classList.add('drag'); }); });
  drop.addEventListener('dragleave', function () { if (--depth <= 0) { depth = 0; drop.classList.remove('drag'); } });
  drop.addEventListener('drop', function (e) { e.preventDefault(); depth = 0; drop.classList.remove('drag'); readFile(e.dataTransfer.files[0]); });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  /* A made-up creditors ledger. Kapoor Industries is the fictional company in Bhasad & Associates. Every identifier is invented. */
  var SAMPLE = [
    'Date,Voucher No,Party Name,PAN,GSTIN,Narration,Bank A/c No,IFSC,Debit,Credit',
    '01/04/2026,PV-0412,Chaiwala Traders,AAKFC4821M,27AAKFC4821M1Z7,"NEFT to CHAIWALA TRADERS against Inv 118, call 98765 43210",50100234567891,KAPR0000420,"1,18,000.00",',
    '03/04/2026,PV-0413,Sharma Steel Pvt Ltd,AAPCS7310Q,27AAPCS7310Q1ZK,RTGS-SHARMA STEEL PVT LTD-Advance for April,912010045678123,BHSD0000786,"4,72,500.00",',
    '04/04/2026,JV-0098,Gupta Packaging LLP,AAJFG2290K,24AAJFG2290K1ZQ,Being purchase of cartons from Gupta Packaging LLP,,,,"86,730.00"',
    '07/04/2026,PV-0414,Nimbu Paani Caterers,ABHPN6634R,27ABHPN6634R1Z2,"Canteen bill March, accounts@nimbupaani.example",3141592653589,KAPR0000420,"42,350.00",',
    '09/04/2026,PV-0415,Rohan Verma,BXVPV7781L,,"Salary advance to Mr. Rohan Verma, Aadhaar 2345 6789 0124",77001234560,BHSD0000111,"25,000.00",',
    '12/04/2026,JV-0101,Mehra Logistics,AAMFM5512D,07AAMFM5512D1ZB,Freight for Pune dispatch - Mehra Logistics,,,,"1,04,860.00"',
    '15/04/2026,PV-0416,Jugaad Tech Solutions Pvt Ltd,AADCJ9087H,29AADCJ9087H1Z3,UPI/JUGAAD TECH SOLUTIONS/AMC Q1,602201998877,KAPR0000777,"59,000.00",',
    '18/04/2026,PV-0417,Bhasad & Associates,AAGFB4200X,27AAGFB4200X1Z9,Audit fee FY 2025-26 to Bhasad & Associates,50100987654321,BHSD0000786,"2,36,000.00",',
    '21/04/2026,PV-0418,Laddoo Sweets & Co,AAIFL1144E,27AAIFL1144E1ZM,"Diwali boxes, contact Mrs. Pinky Laddoowala +91 91234 56789",30211122233,KAPR0000420,"18,880.00",',
    '24/04/2026,JV-0105,Chaiwala Traders,AAKFC4821M,27AAKFC4821M1Z7,Purchase return to Chaiwala Traders - Debit note 7,,,,"11,800.00"',
    '28/04/2026,PV-0419,Sharma Steel Pvt Ltd,AAPCS7310Q,27AAPCS7310Q1ZK,RTGS-SHARMA STEEL PVT LTD-Balance against Inv 2231,912010045678123,BHSD0000786,"3,15,640.00",',
    '30/04/2026,PV-0420,Mehra Logistics,AAMFM5512D,07AAMFM5512D1ZB,NEFT-MEHRA LOGISTICS-Freight April,40112233445566,KAPR0000555,"1,04,860.00",'
  ].join('\n');

  if (src.value.trim()) run();
})();
