/* Brief Gyaani: a transparent, rule-based scorer for a brief to an AI. No AI, no network: every rule is in this file.
   It looks for six things a junior would need, and warns when a brief looks like it contains real data. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------- the tasks ---------- */
  var T = [
    { id: 'bank', who: 'Company', title: 'Bank reconciliation', scene: 'Month-end. The bank statement and the cash book do not agree, and the CFO wants the reco today.',
      kw: /\bbank|cash ?book|statement/, weak: 'do bank reco for june and tell me the difference',
      strong: 'Task: reconcile the bank statement with the cash book for the month and list everything that does not match.\nFiles: in the folder Reco_Work (copies, not the originals): Bank_Statement.csv and Cash_Book.xlsx. Read only the column headings and the first 5 rows, not the data.\nRules: match in rounds: same amount and same date; then same amount with dates within 3 days; then one bank credit equal to several receipts on the same day. Record the round in a column called Match Basis.\nOutput: write a script that runs on this computer and saves Bank_Reco.xlsx with sheets: Matched, In bank not in books, In books not in bank, and Reco (balance per bank, items in transit, balance per books, difference).\nChecks: print the row count of each file and of each sheet, so rows in equal rows out, and the totals of both sides. The difference cell must be zero, or show what is left as unexplained.\nJudgement: do not correct or post anything. List the unmatched items for me; I will decide what each one is.' },
    { id: 'gl', who: 'Audit firm', title: 'Ledger scrutiny', scene: 'Statutory audit. You need every odd entry in the general ledger, not a sample of fifty.',
      kw: /ledger|\bgl\b|entries|journal|voucher/, weak: 'check the ledger and tell me if anything is wrong',
      strong: 'Task: scrutinise every entry in the general ledger and build an exception workbook for the audit file.\nFiles: GL_Export.xlsx in the folder Audit_Work, a copy of the client’s export. It is client data: read only the column headings, never the rows.\nRules: flag round amounts at or above the limit in my Parameters.xlsx; postings on Sundays or on dates in Holidays.xlsx; entries in the last week of the year and the first week after it; blank narrations, or narrations with words like adjustment, suspense or cash; and ledgers with fewer than 5 entries in the year.\nOutput: write a script that runs on this computer and saves GL_Exceptions.xlsx: a Summary sheet (test, rule, count, total value), one sheet per test with Date, Voucher No, Ledger, Debit, Credit, Narration, and a Combined sheet listing each voucher once with the number of tests it hit.\nChecks: on a Parameters sheet, record the row count and the debit and credit totals of the export, and tie them to the trial balance.\nJudgement: an exception is not a finding. Show me only the Summary counts; I will review the vouchers and decide.' },
    { id: 'gst', who: 'Firm · GST', title: 'GSTR-2B match', scene: 'Return due soon. Three months of 2B downloads against one purchase register.',
      kw: /\b2b\b|gstr|\bitc\b|purchase register|purchase/, weak: 'match 2B with purchase register and tell me the ITC',
      strong: 'Task: match the GSTR-2B downloads with the purchase register for the quarter, and list the differences before the return is filed.\nFiles: in the folder ITC_Work (copies): the three monthly 2B downloads and Purchase_Register.xlsx. Look only at the sheet names, the headers and the first 5 rows of each.\nRules: match on GSTIN plus the invoice number cleaned (no year, symbols or leading zeros), then on GSTIN plus taxable value within 30 days. Treat a tax difference of up to ₹5 as matched. Record the round in a Match Basis column.\nOutput: write a script that runs on this computer and saves ITC_Recon.xlsx with sheets: Matched, In 2B not in books, In books not in 2B, Amount differences, and a Summary by month and tax head.\nChecks: show me the row count of each sheet. Matched plus unmatched must add back to the rows in each file, and the 2B total must agree with the portal summary for each month.\nJudgement: do not decide which credit to claim. Leave every difference for me; I will review it with the supplier.' },
    { id: 'tds', who: 'Firm · Tax audit', title: 'TDS check', scene: 'Tax audit season. Which expense payments may have missed TDS?',
      kw: /\btds\b|deduct/, weak: 'Check TDS on these payments:\nSharma Traders  ABCPS1234K  1,25,000\nGupta & Co  AAGFG5678L  2,40,000\nNew Age Logistics  AADCN4321M  98,500\nRaj Consultants  ABQPR8765N  3,10,000',
      strong: 'Task: find expense payments where TDS may have been missed or deducted short, across the year’s ledger.\nFiles: Ledger_Export.xlsx and my own TDS_Master.xlsx (Nature, Keywords, Thresholds, Rate) in the folder TDS_Work, both copies. Read only the headers and 5 sample rows.\nRules: use only my master for thresholds and rates, never your own figures. Tag each entry to a nature from the ledger name and narration, and leave it Unclassified if unsure. Flag parties above a threshold with no TDS entry against them, and entries booked at a rate different from my master.\nOutput: write a script that runs on this computer and saves TDS_Exceptions.xlsx with columns: Party, Nature, Annual Total, TDS Booked, Expected TDS, Issue, Vouchers.\nChecks: print the count by Issue, and check that the total of the tagged expense entries agrees with the ledger total, with Unclassified shown separately.\nJudgement: a flag is not a default. Before calling anything a miss, I will check for lower deduction certificates and declarations.' },
    { id: 'vouch', who: 'Audit firm', title: 'Expense vouching sample', scene: 'Your team needs a vouching sample that someone can re-run and defend.',
      kw: /vouch|sample|invoices?|expenses?|sales/, weak: 'pick some invoices for vouching',
      strong: 'Task: select a sample of expense invoices for vouching and build a tracker for the team.\nFiles: Expense_Register.xlsx in the folder Vouching_Work (a copy). Read only the column headings.\nRules: pick every invoice above the materiality figure in my Parameters.xlsx, plus a random sample of 40 from the rest, with a fixed seed so the selection can be re-run.\nOutput: write a script that runs on this computer and saves Vouching_Tracker.xlsx with columns: Invoice No, Date, Vendor code, Amount, Why selected, Documents seen, Agrees (Y/N), Remarks, and a Parameters sheet with the seed and the rules.\nChecks: print the population count and total and the sample count and total, and confirm the population total agrees with the expense ledger.\nJudgement: leave Documents seen, Agrees and Remarks blank. We vouch, and I decide on any exception.' },
    { id: 'ar', who: 'Company', title: 'AR ageing', scene: 'Close week. The debtors ageing and the GL control account are a few lakh apart.',
      kw: /ageing|aging|receivable|debtor|\bar\b/, weak: 'make ageing of debtors from tally',
      strong: 'Task: prove the receivables ageing agrees with the debtors control account in the GL, and bridge any gap.\nFiles: AR_Ageing.xlsx and GL_Detail.csv in the folder Close_Work (copies). Do not read customer names into the chat: headers and the first 3 rows only.\nRules: age by invoice date as at the period end in the file name, in buckets of 0-30, 31-60, 61-90 and over 90 days. List postings to the control account that are not invoices, receipts or credit notes, and customers with credit balances.\nOutput: write a script that runs on this computer and saves AR_to_GL.xlsx with a Bridge sheet: ageing total, plus or minus each listed item, equals the GL balance, using formulas.\nChecks: show the unexplained remainder separately even if it is zero, and check that the bucket totals add back to the ageing total.\nJudgement: do not write anything off or propose provisions. I will review the old items and the credit balances.' },
    { id: 'notice', who: 'Tax practice', title: 'Notice reply citations', scene: 'A draft reply to a notice cites five sections. Are they real, and do they say that?',
      kw: /notice|reply|citation|section|cited/, dataAlt: /masked|only (the )?(pdfs?|files|documents)|official text/,
      weak: 'is my notice reply correct? check the sections',
      strong: 'Task: check every citation in my draft reply to the notice before it goes out.\nFiles: in the folder Notice_Work: Notice.pdf, Draft_Reply.docx, and the official text of the provisions as PDFs I downloaded. Client names are masked in these copies.\nRules: for every section, rule, notification and circular cited in the draft, use only the PDFs in this folder, never memory. Cover only the period the notice is for.\nOutput: give me a table with columns: Citation, Where in the draft, Found in which PDF, Page and paragraph, Does it say what the draft claims (Yes / No / Unclear).\nChecks: quote the page and paragraph for every one you verify, and mark anything you could not find in the PDFs as UNVERIFIED.\nJudgement: do not rewrite the reply or add new grounds. I will read every UNVERIFIED item in the official source and decide what stays.' },
    { id: 'study', who: 'CA student', title: 'Exam study', scene: 'Your answer to a practice question does not match the solution. You want to learn, not copy.',
      kw: /attempt|answer|question|quiz|mistake|chapter|working/, dataAlt: /my (attempt|working|notes|answer)/, ruleAlt: /chapter|marks|exam format|level/,
      weak: 'solve this question for me',
      strong: 'Task: check my attempt at a consolidation question and help me find my own mistake. Do not solve it.\nFiles: in the folder Study: Question.pdf (from the study material) and My_Attempt.jpg (my handwritten working).\nRules: stay within this chapter and the exam answer format. Do not tell me the correct final figure.\nOutput: give me a short list: the first line where I went wrong, what kind of mistake it is (concept, arithmetic, copying, sign, format), and one question that would help me see it.\nChecks: check each line of my working against the figures in the question and tell me which lines you verified. If my total does not agree with the question data, say where it breaks.\nJudgement: stop there. I will redo it myself and show you again.' },
    { id: 'dup', who: 'Internal audit', title: 'Duplicate payments', scene: 'The audit committee asked: did we pay anyone twice this year?',
      kw: /duplicate|payments?|paid twice|vendor/, weak: 'find duplicate payments in the payments file',
      strong: 'Task: sweep the year’s vendor payments for possible duplicate payments.\nFiles: Payments_Export.xlsx in the folder Dup_Work (a copy). Read only the column headings; never print vendor names or bank details.\nRules: flag pairs with the same vendor and the same amount within 30 days; the same invoice number after cleaning symbols and leading zeros; and the same amount and date paid to different vendor codes with the same bank account (compare inside the script only).\nOutput: write a script that runs on this computer and saves Duplicate_Sweep.xlsx with one sheet per test and columns: Pair ID, Vendor code, Invoice No, Date, Amount, Test hit.\nChecks: print the row count and payment total of the export, confirm they agree with the ledger, and give the count of pairs per test.\nJudgement: a pair is a lead, not a finding. List them for me; I will check credit notes and refunds before calling anything a duplicate.' },
    { id: 'tag', who: 'Tax practice · Books', title: 'Bank narrations to ledger heads', scene: 'Bookkeeping for a client: a year of bank narrations to put under the right heads.',
      kw: /narration|categori|tag|classif|ledger head|bank statement/, weak: 'categorise this bank statement into expenses',
      strong: 'Task: categorise the narrations in a client’s bank statement into my ledger heads for bookkeeping.\nFiles: Bank_Statement.xlsx and my Rules_Master.xlsx (Keyword, Ledger Head) in the folder Books_Work, copies only. Read only the headers and 3 sample rows.\nRules: use only my keywords. Where more than one head fits, or none does, put the row under Suspense and say why. Ignore transfers between the client’s own accounts.\nOutput: write a script that runs on this computer and saves Bank_Tagged.xlsx with the original columns plus Ledger Head and Reason, and a Summary sheet by head.\nChecks: rows in must equal rows out, and the debit and credit totals of the tagged file must agree with the statement.\nJudgement: do not post anything to the books. I will review Suspense and any large items before entry.' }
  ];

  /* ---------- the rules ---------- */
  var R = {
    verb: /\b(reconcil\w*|reco|match\w*|compare|list|flag\w*|find|identify|check|tag|categori[sz]\w*|classif\w*|summari[sz]\w*|build|prepare|draft|age|ageing|aging|vouch\w*|scrutini[sz]\w*|select|sample|quiz|review|extract|split|tie|bridge|audit|scan|sweep|prove|sort|group|verify)\b/,
    file: /\.(xlsx|xls|csv|pdf|txt|docx|jpg|jpeg|png)\b|\b(files?|folder|exports?|workbooks?|spreadsheets?|downloads?|attachments?)\b/,
    heads: /\b(headings?|headers?|column names|sheet names|structure|sample rows|first \d+ rows|\d+ sample rows|layout of the file)\b/,
    rule: [/\b(above|below|over|under|more than|less than|fewer than|at least|at most|up to|within|older than|between|exceed\w*)\b/, /\b(thresholds?|tolerance|limit|criteria|rules?|conditions?|random|seed|materiality)\b/,
      /\bonly (the|those|my|entries|payments|invoices|items|rows)\b/, /\b(match(ed)? on|key|in rounds|same|on gstin|on (the )?(invoice number|amount|date|pan|vendor))\b/,
      /\b(ignore|exclude|excluding|except|unless|leave out)\b/, /\bmy (keywords|master|rules|mapping|list|parameters)\b|\bper my\b/,
      /(₹|rs\.?|inr) ?\d|\b\d+ ?(%|days?|lakhs?|crores?|rupees?|entries|invoices|items)\b/],
    period: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b(for the (month|quarter|year|period)|period|quarter|financial year|fy ?\d|as (at|on)|month-end|year-end|this (month|year))\b/,
    deliver: /\b(write|save|saves|create|build|produce|make|put|give me|return|output|prepare|export)\b[^\n]{0,100}?\b(xlsx|excel|workbook|sheets?|csv|table|tracker|docx|word|list|report)\b/,
    fmt: /\b(xlsx|excel|workbook|sheets?|csv|table|columns|tracker|docx|report|list|summary)\b/,
    detail: /\b(columns?|sheets?|tabs?|layout|called|named|one row per)\b|\b(list|table|tracker) ?:/,
    check: [/\b(row counts?|count of|counts? (by|of|per)|counts?\b|rows in|rows out|number of rows|same number)/, /\b(control totals?|totals?)\b/, /\b(tie|ties|tied|tie-out|agree|agrees|agreed)\b/,
      /\b(add(s)? back|adds up|difference (cell )?(must|should|is)|unexplained|remainder)\b/, /\b(verify|verified|cross-check|check (it |them |each |every |\w+ )?against|reconcile to|compare (it |them )?(to|with) the)\b/,
      /\b(before and after|quote|page and paragraph|unverified|first line where|which lines)\b/],
    local: /(\brun(s)? (it |them )?(locally|here|on (this|my|our) (computer|laptop|machine|pc))|on this computer|on my (computer|laptop)|locally|\bscript\b|do not (open|print|paste|read|show)|don't (open|print|paste|read|show)|never (print|paste|read|show)|headings only|only the (column )?(headings|headers)|headers only|\bcop(y|ies)\b|back-?up|masked|coded copy|dummy|read-only|only the (pdfs?|documents|files)|do not solve|don't solve|do not (tell|give) me the (correct |final )?(answer|figure))/,
    judge: /(\bi (will|'ll|shall) (decide|review|check|judge|read|redo|verify|sign|look)|\bi decide|for my review|for me to (review|decide|check)|for (me|a person|the reviewer)\b|my (review|judgement|judgment|call|sign-off)|don't (conclude|decide|treat|post|correct|claim|write)|do not (conclude|decide|treat|call|post|correct|rewrite|write|claim)|not (a |the )?(finding|default)|is a lead|ask (me )?before|wait for my|stop there|stop and|unverified|\bi (sign|approve)|we vouch)/
  };
  var CHECKS = [
    { id: 'what', name: 'The task', q: 'What should he do?', tip: 'Start with one clear job: “Reconcile X with Y and list what does not match.”' },
    { id: 'data', name: 'The data, and where it is', q: 'Which files, where, and only the headings?', tip: 'Name the files and the folder, and say “read only the column headings”. Never paste the rows.' },
    { id: 'rule', name: 'The condition or rule', q: 'Which rule decides a match or a flag?', tip: 'Give the rule: the period, the threshold from your master, “within 3 days”, “match on GSTIN plus invoice number”.' },
    { id: 'out', name: 'The output', q: 'What comes back, and in what shape?', tip: 'Say what comes back: “Save Result.xlsx with sheets: Matched, Unmatched” or “a table with columns: …”.' },
    { id: 'chk', name: 'The checks', q: 'How will you know it is complete?', tip: 'Ask for counts and totals: rows in equal rows out, totals agree to the ledger or source.' },
    { id: 'safe', name: 'Safety and judgement', q: 'Runs locally, on copies? Who decides?', tip: 'Add “a script that runs on this computer, on copies” and “list the exceptions; I will decide”.' }
  ];
  function norm(s) { return s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').toLowerCase(); }

  /* real-looking data: identifiers, contact details and pasted tables */
  function sniff(raw) {
    var f = [];
    if (/\b[A-Z]{5}[0-9]{4}[A-Z]\b/.test(raw)) f.push('a PAN');
    if (/\b\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]\b/i.test(raw)) f.push('a GSTIN');
    if (/\b[A-Z]{4}0[A-Z0-9]{6}\b/.test(raw)) f.push('an IFSC code');
    if (/\b\d{4}[ -]\d{4}[ -]\d{4}\b/.test(raw)) f.push('an Aadhaar-style number');
    else if (/(^|[^\d,.])\d{9,18}(?![\d,.])/.test(raw)) f.push('an account or phone number');
    if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(raw)) f.push('an email address');
    var rows = raw.split('\n').filter(function (l) {
      var cells = l.split(/\t|\||;|,(?!\d{2,3}\b)| {2,}/).filter(function (c) { return c.trim(); });
      var nums = cells.filter(function (c) { return /\d/.test(c) && /^[\s₹rs.\-/\d,]+$/i.test(c.trim()); });
      return cells.length >= 3 && nums.length >= 1;
    });
    var amounts = (raw.match(/\b\d{1,3}(,\d{2,3})+(\.\d+)?\b/g) || []).length;
    if (rows.length >= 3) f.push('rows of a table'); else if (amounts >= 6) f.push('a list of amounts');
    return f;
  }

  function score(text, task) {
    var t = norm(text), words = (t.match(/[a-z0-9]+/g) || []).length, res = {}, data = sniff(text);
    var hits = function (arr) { return arr.filter(function (r) { return r.test(t); }).length; };
    // 1 the task
    var v = R.verb.test(t), k = task.kw.test(t);
    res.what = v && k && words >= 6 ? 'pass' : (v || k) ? 'part' : 'miss';
    // 2 the data
    var fl = R.file.test(t), hd = R.heads.test(t) || (task.dataAlt && task.dataAlt.test(t));
    res.data = data.length ? 'miss' : fl && hd ? 'pass' : (fl || hd) ? 'part' : 'miss';
    // 3 the rule
    var rh = hits(R.rule) + (task.ruleAlt && task.ruleAlt.test(t) ? 1 : 0);
    res.rule = rh >= 1 ? 'pass' : R.period.test(t) ? 'part' : 'miss';
    // 4 the output
    var dm = R.deliver.exec(t);
    res.out = dm && R.detail.test(t.slice(dm.index, dm.index + 320)) ? 'pass' : (dm || R.fmt.test(t)) ? 'part' : 'miss';
    // 5 the checks
    var ch = hits(R.check);
    res.chk = ch >= 2 ? 'pass' : ch === 1 ? 'part' : 'miss';
    // 6 safety and judgement
    var lo = R.local.test(t) && !data.length, ju = R.judge.test(t);
    res.safe = lo && ju ? 'pass' : (lo || ju) ? 'part' : 'miss';
    var n = 0; CHECKS.forEach(function (c) { if (res[c.id] === 'pass') n++; });
    return { checks: res, n: n, data: data, words: words };
  }

  var WHY = {
    what: { pass: 'Clear job and clear object.', part: 'Say the job and what it is done on, in one sentence.' },
    data: { pass: 'Files named, headings only.', part: 'Name the files and folder, and say “only the column headings”.' },
    rule: { pass: 'He knows the rule.', part: 'A period alone is not a rule. Add the threshold source, the match key or what to ignore.' },
    out: { pass: 'He knows what to hand back.', part: 'Name the file and its sheets or columns.' },
    chk: { pass: 'Counts and totals, so you can trust it.', part: 'Add a second check: counts and totals that tie.' },
    safe: { pass: 'Runs locally, and you keep the judgement.', part: 'You have one half. Add the other: runs on this computer on copies, and you decide.' }
  };
  var LV = [
    { min: 0, name: 'Confused', head: 'Gyaani is lost.', pose: '04', fx: 'spiral', line: 'Kya karna hai? Kaunsi file? …Main kuch bhi kar dunga!', color: '#c0392b' },
    { min: 2, name: 'Guessing', head: 'Gyaani is guessing.', pose: '01', fx: 'sweat', line: 'Samajh gaya! …Lagbhag. Thoda aur batao?', color: '#d35400' },
    { min: 4, name: 'Eager', head: 'Gyaani is eager, and nearly there.', pose: '05', fx: 'bulb', line: 'Bas thoda aur! Phir main brilliant.', color: '#c98a12' },
    { min: 6, name: 'Brilliant', head: 'Gyaani is brilliant.', pose: '03', fx: 'star', line: 'Ab main brilliant hoon! Kaam aapke laptop pe, faisla aapka.', color: '#2e8b57' }
  ];
  function level(n) { var l = LV[0]; LV.forEach(function (x) { if (n >= x.min) l = x; }); return l; }

  window.BriefScorer = { score: score, sniff: sniff, tasks: T, checks: CHECKS, level: level };

  /* ---------- the page ---------- */
  var root = $('#brief'); if (!root) return;
  var ta = $('#bf-text'), chips = $('#bf-tasks'), sceneEl = $('#bf-scene'), list = $('#bf-checks'), dial = $('#bf-dial'), live = $('#bf-live'),
      warn = $('#bf-warn'), strongBox = $('#bf-strong'), strongPre = $('#bf-strong-text'), mini = $('#bf-mini'), cardBtn = $('#bf-card');
  var react = Gyaani.stage($('#bf-stage'));
  Gyaani.preload(Gyaani.poses.concat(['bang', 'spiral', 'sweat', 'bulb', 'star'].map(function (f) { return Gyaani.A + 'fx-' + f + '.webp'; })));
  var cur = T[0], last = null, timer = 0, announce = 0;
  chips.innerHTML = T.map(function (t, i) {
    return '<li><button type="button" class="chip" data-i="' + i + '" aria-pressed="' + (i ? 'false' : 'true') + '"><small>' + t.who + '</small>' + t.title + '</button></li>';
  }).join('');
  list.innerHTML = CHECKS.map(function (c) {
    return '<li id="ck-' + c.id + '" class="miss"><span class="ic" aria-hidden="true">·</span><b>' + c.name + '</b><span class="t"></span></li>';
  }).join('');
  function pick(i, keep) {
    cur = T[i];
    chips.querySelectorAll('.chip').forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    sceneEl.textContent = cur.scene;
    strongPre.textContent = cur.strong; strongBox.hidden = true; $('#bf-show').setAttribute('aria-expanded', 'false');
    $('#bf-show').textContent = 'Show me a strong brief';
    if (!keep) ta.value = '';
    ta.placeholder = 'Type how you would ask the AI to do the ' + cur.title.toLowerCase() + '…';
    run(true);
  }
  function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(Math.max(ta.scrollHeight + 4, innerWidth < 640 ? 190 : 230), 560) + 'px'; }
  function run(quiet) {
    var text = ta.value, r = score(text, cur), empty = !text.trim(), lv = level(r.n);
    CHECKS.forEach(function (c) {
      var li = $('#ck-' + c.id), st = empty ? 'miss' : r.checks[c.id], t = li.querySelector('.t');
      if (li.className.split(' ')[0] !== st && !empty) { li.classList.remove('flip'); void li.offsetWidth; }
      li.className = empty ? 'idle' : st + ' flip';
      li.querySelector('.ic').textContent = empty ? CHECKS.indexOf(c) + 1 : st === 'pass' ? '✓' : st === 'part' ? '½' : '✗';
      var msg = empty ? c.q : st === 'pass' ? WHY[c.id].pass : st === 'part' ? WHY[c.id].part : c.tip;
      if (c.id === 'data' && r.data.length) msg = 'Looks like real data. Remove it and give the column headings instead.';
      if (c.id === 'safe' && r.data.length && st !== 'pass') msg = 'Data in a chat has already left your computer. ' + c.tip;
      t.textContent = msg;
      li.setAttribute('aria-label', c.name + ': ' + (empty ? 'not scored yet' : st === 'pass' ? 'done' : st === 'part' ? 'half there' : 'missing') + '. ' + msg);
    });
    dial.style.setProperty('--p', empty ? 0 : Math.round(r.n / 6 * 100));
    dial.style.setProperty('--dc', lv.color);
    $('b', dial).innerHTML = (empty ? 0 : r.n) + '<small>/6</small>';
    $('#bf-lv').textContent = empty ? 'Waiting for your brief' : r.data.length ? 'Real data found' : lv.name;
    $('#bf-lv').style.color = empty ? '' : lv.color;
    $('#bf-head').textContent = empty ? 'Brief him like a junior.' : r.data.length ? 'Stop. That looks like real data.' : lv.head;
    $('#bf-sub').textContent = empty ? 'Six things a junior needs: what, where, the rule, the output, the checks, and who decides.' :
      r.n === 6 ? 'All six. This is a brief you can hand over.' : (6 - r.n) + ' of 6 still to fix. The tips below say how.';
    warn.hidden = !r.data.length;
    if (r.data.length) $('#bf-warn-t').textContent = 'Your brief seems to contain ' + r.data.join(' and ').replace(/ and (?=.* and )/g, ', ') + '. In a real chat that data has now left your computer. Give the AI the column headings instead, and let its script read the file on your own machine.';
    mini.textContent = empty ? 'Score: 0 of 6' : 'Score: ' + r.n + ' of 6 · ' + (r.data.length ? 'real data found!' : lv.name) + '  ·  See Gyaani ↓';
    mini.className = 'mini' + (empty ? '' : r.data.length ? ' bad' : r.n === 6 ? ' ok' : '');
    grow();
    if (empty) react({ pose: '02', fx: null, line: 'Brief do! Kya, kahan, kaunsa rule, kya wapas chahiye?' });
    else if (r.data.length) react({ pose: '02', fx: 'bang', line: 'Arre! Yeh toh asli data hai. Sirf headings do!' });
    else react({ pose: lv.pose, fx: lv.fx, line: lv.line });
    cardBtn.disabled = empty;
    last = { r: r, lv: lv, empty: empty };
    clearTimeout(announce);
    if (!quiet) announce = setTimeout(function () {
      live.textContent = empty ? '' : 'Your brief scores ' + r.n + ' of 6. ' + (r.data.length ? 'It looks like it contains real data. ' : '') +
        (r.n < 6 ? 'Missing or half there: ' + CHECKS.filter(function (c) { return r.checks[c.id] !== 'pass'; }).map(function (c) { return c.name; }).join(', ') + '.' : 'All six checks pass.');
    }, 900);
  }
  chips.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) pick(+b.getAttribute('data-i')); });
  ta.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { run(false); }, 160); });
  $('#bf-weak').addEventListener('click', function () { ta.value = cur.weak; run(false); ta.focus(); });
  $('#bf-show').addEventListener('click', function () {
    var open = strongBox.hidden; strongBox.hidden = !open; this.setAttribute('aria-expanded', open ? 'true' : 'false');
    this.textContent = open ? 'Hide the strong brief' : 'Show me a strong brief';
  });
  $('#bf-use').addEventListener('click', function () { ta.value = cur.strong; run(false); ta.focus(); ta.scrollTop = 0; });
  $('#bf-clear').addEventListener('click', function () { ta.value = ''; run(false); ta.focus(); });
  function copy(text, btn) {
    var done = function () { var o = btn.getAttribute('data-l') || btn.textContent; btn.setAttribute('data-l', o); btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = o; }, 1600); live.textContent = 'Copied to the clipboard.'; };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() { var x = document.createElement('textarea'); x.value = text; x.setAttribute('readonly', ''); x.style.position = 'fixed'; x.style.opacity = '0'; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); } catch (e) {} x.remove(); done(); }
  }
  $('#bf-copy').addEventListener('click', function () { if (ta.value.trim()) copy(ta.value, this); });
  $('#bf-copy-strong').addEventListener('click', function () { copy(cur.strong, this); });
  cardBtn.addEventListener('click', function () {
    if (!last || last.empty || !window.GyaaniCard) return;
    var n = last.r.n, lv = last.lv;
    GyaaniCard.open({ kicker: 'Brief Gyaani', head: n === 6 ? 'My brief scored 6/6' : 'My brief scored ' + n + '/6', score: n + '/6', scoreLabel: 'My brief',
      pose: lv.pose === '04' ? '04' : lv.pose, fx: lv.fx, line: lv.line, sub: 'Task: ' + cur.title,
      habit: 'What, where, the rule, the output, the checks, and who decides.', file: 'gyaani-brief-' + n + 'of6', shareText: 'My brief to Gyaani scored ' + n + '/6. Can you brief him better?' }, cardBtn);
  });
  pick(0);
})();
