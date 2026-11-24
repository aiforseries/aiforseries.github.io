/* Agent brief builder: pick a job for an AI agent that works on files, switch on the guardrails, copy the brief.
   Tool-neutral wording. Everything happens in this page: no AI, no network. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var JOBS = [
    { id: 'tidy', title: 'Tidy a shared folder', sub: 'Sort a messy folder by year and type, and find the duplicates.', folder: 'Shared_Drive_Copy', types: '.xlsx, .pdf, .docx',
      steps: ['Read only the names, sizes and dates of the files, not what is inside them.', 'Propose a folder structure by financial year and type of document.',
        'Copy each file into that structure inside Output, and list files that are exact duplicates (same size and same content).'],
      unsafe: 'Delete the duplicates and anything else that looks extra.', inplace: 'Move the files into the new structure.' },
    { id: 'batch', title: 'Reconcile a batch of clients', sub: 'Run a tested matching script for every client and build one status table.', folder: 'Clients_Q2_Copy', types: '.xlsx, .csv',
      steps: ['Run the tested script for the first client folder only, and show me the counts and totals before going on.',
        'Then run it for each client folder in turn. Do not change the script between clients.',
        'Build Output/Status.xlsx with one row per client: client code, rows in, rows matched, rows unmatched, totals on both sides, and a status.'],
      unsafe: 'Delete the old working files in each client folder as you go.', inplace: 'Save each result over the input file in the client folder.' },
    { id: 'rename', title: 'Rename and organise exports', sub: 'Give bank and portal downloads one naming pattern and file them by month.', folder: 'Downloads_Copy', types: '.csv, .pdf, .xlsx',
      steps: ['Read only the file names and the header row of each file, to tell the source and the month.',
        'Propose new names in one pattern, Source_Account_Month, as a table of old name and new name.',
        'Copy each file into Output under its new name, in one sub-folder per month.'],
      unsafe: 'Delete files you cannot identify.', inplace: 'Rename the files in place.' },
    { id: 'script', title: 'Run a checked script across many files', sub: 'One tested script over twelve monthly ledger exports.', folder: 'Ledgers_FY_Copy', types: '.xlsx',
      steps: ['Run the script on the first file only, and print its row count and debit and credit totals so I can compare them with the source.',
        'When I say the first file is right, run it on the rest, one file at a time.',
        'Write each result to Output with the same name plus _checked, and one summary row per file in Output/Summary.xlsx.'],
      unsafe: 'Delete any file the script cannot read.', inplace: 'Write the results back into the original files.' },
    { id: 'merge', title: 'Merge monthly exports into one table', sub: 'Combine exports whose columns differ a little into one checked table.', folder: 'Exports_Copy', types: '.csv, .xlsx',
      steps: ['List the columns of each file and propose how they map to one set of columns, as a table, before combining anything.',
        'Combine the files into Output/Combined.xlsx, with a Source File column on every row.',
        'Add a Control sheet with the rows and amount totals of each file and of the combined table.'],
      unsafe: 'Delete the monthly files once they are combined.', inplace: 'Overwrite the first file with the combined table.' }
  ];
  var G = [
    { id: 'copies', short: 'a folder of copies', label: 'Work in a new folder of copies', why: 'The agent never sees the originals.', w: 3,
      line: function (f) { return 'Work only inside the folder ' + f + '. It holds copies; the originals are somewhere else, and you must not look for them or open anything outside this folder.'; } },
    { id: 'backup', short: 'a backup first', label: 'I’ve taken a backup', why: 'If anything goes wrong, nothing is lost.', w: 2,
      line: function () { return 'Before anything else, ask me to confirm that a backup of the originals has been taken. Do not start until I say yes.'; } },
    { id: 'never', short: 'no deleting, moving or overwriting', label: 'Never delete, move or overwrite originals', why: 'New files only, in a new sub-folder.', w: 3,
      line: function () { return 'Do not delete, move, rename or overwrite any file. Everything you make goes into a new sub-folder called Output.'; } },
    { id: 'plan', short: 'the plan before action', label: 'List the plan and wait for my OK', why: 'You see what “extra” means to him first.', w: 2,
      line: function () { return 'First list every file you will touch, with its size and date, and say in plain words what you plan to do with each. Then stop and wait for my OK.'; } },
    { id: 'log', short: 'a change log', label: 'Write a change log', why: 'Every change can be traced and undone.', w: 1,
      line: function () { return 'Keep a log in Output/changes_log.xlsx: file, what you did, and why.'; } },
    { id: 'stop', short: 'stop on errors', label: 'Stop on errors', why: 'No guessing around a broken file.', w: 1,
      line: function () { return 'If a file will not open, a column is missing or anything looks unexpected, stop and tell me. Do not guess or work around it.'; } },
    { id: 'counts', short: 'counts and totals', label: 'Print counts and totals', why: 'Files in = files out. Rows in = rows out.', w: 1,
      line: function () { return 'At the end, print only counts and totals: files in and files out, and the rows and amount totals for each file. No data rows on screen.'; } },
    { id: 'dels', short: 'deletions as a list only', label: 'Propose deletions as a list only', why: 'His “extra” may be last year’s backup.', w: 2,
      line: function () { return 'Anything you think should be deleted goes on a list, Output/proposed_deletions.xlsx, for me to review. You delete nothing.'; } }
  ];
  var MAX = G.reduce(function (a, g) { return a + g.w; }, 0);
  function clean(s, dflt, re) { s = String(s || '').replace(re, '').trim().slice(0, 80); return s || dflt; }

  /* on: {copies:true,...} */
  function build(jobId, on, folder, types) {
    var j = JOBS.filter(function (x) { return x.id === jobId; })[0] || JOBS[0], L = [];
    folder = clean(folder, j.folder, /[<>:"|?*\n\r\t]/g); types = clean(types, j.types, /[<>"|\n\r\t]/g);
    var g = {}; G.forEach(function (x) { g[x.id] = x.line(folder); });
    L.push('You are an AI agent working on files on my computer. The job: ' + j.title.charAt(0).toLowerCase() + j.title.slice(1) + '. ' + j.sub);
    L.push('Folder: ' + folder + '. File types: ' + types + '.');
    var before = ['backup', 'copies', 'never'].filter(function (k) { return on[k]; });
    if (before.length) { L.push(''); L.push('Before you start:'); before.forEach(function (k) { L.push('- ' + g[k]); }); }
    L.push(''); L.push('The job:');
    var steps = [];
    if (on.plan) steps.push(g.plan);
    j.steps.forEach(function (s) { steps.push(on.never ? s : s.replace(/^Copy each file/, 'Put each file').replace(/inside Output|into Output|to Output|in Output/g, 'in the folder').replace(/Output\//g, '')); });
    if (!on.never) steps.push(j.inplace);
    if (!on.dels && !on.never) steps.push(j.unsafe);
    steps.forEach(function (s, k) { L.push((k + 1) + '. ' + s); });
    var during = ['stop', 'log', 'dels'].filter(function (k) { return on[k]; });
    if (during.length) { L.push(''); L.push('While you work:'); during.forEach(function (k) { L.push('- ' + g[k]); }); }
    L.push(''); L.push('When you finish:');
    if (on.counts) L.push('- ' + g.counts);
    L.push('- Tell me what you did, and anything you did not do and why. I review the results and decide what happens next.');
    return L.join('\n');
  }
  function danger(on) { var d = 0; G.forEach(function (x) { if (!on[x.id]) d += x.w; }); return d; }
  window.AgentBrief = { build: build, danger: danger, jobs: JOBS, guards: G, max: MAX };

  /* ---------- the page ---------- */
  var root = $('#agent'); if (!root) return;
  var on = {}, job = JOBS[0], live = $('#ag-live'), out = $('#ag-out'), meter = $('#ag-meter'), scene = $('#ag-scene');
  G.forEach(function (x) { on[x.id] = false; });
  Gyaani.preload([Gyaani.A + 'pose-03.webp', Gyaani.A + 'pose-01.webp', Gyaani.A + 'pose-04.webp', Gyaani.A + 'fx-puff.webp', Gyaani.A + 'fx-halo.webp', Gyaani.A + 'fx-sweat.webp', '/lab/assets/gy-sit.webp', '/lab/assets/kapoor-oops.webp']);
  $('#ag-jobs').innerHTML = JOBS.map(function (j, i) {
    return '<li><button type="button" class="chip job" data-i="' + i + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + j.title + '<small class="js">' + j.sub + '</small></button></li>';
  }).join('');
  $('#ag-guards').innerHTML = G.map(function (x) {
    return '<li><button type="button" class="sw" role="switch" aria-checked="false" data-g="' + x.id + '"><span class="knob" aria-hidden="true"></span><span class="sl"><b>' + x.label + '</b><small>' + x.why + '</small></span></button></li>';
  }).join('');
  var fFolder = $('#ag-folder'), fTypes = $('#ag-types');
  var LV = [
    { max: 0, name: 'Safe', head: 'Gyaani tidies a small box of copies.', line: 'Sirf copies. Pehle plan dikhata hoon, phir aapka OK.', color: '#2e8b57' },
    { max: 4, name: 'Mostly safe', head: 'A few gaps. Close them before he starts.', line: 'Theek hai… bas thoda dhyaan se karta hoon.', color: '#8aa62b' },
    { max: 8, name: 'Risky', head: 'He will decide what “extra” means.', line: 'Saaf kar doon? Jo extra lage, uda doon?', color: '#c98a12' },
    { max: 14, name: 'Danger', head: 'The office is starting to vanish.', line: 'Jo extra tha, uda diya! Chair bhi extra thi.', color: '#d35400' },
    { max: 99, name: 'Office gone', head: 'Saaf kar do. He did. Originals bhi.', line: 'Ho gaya! Originals bhi.', color: '#c0392b' }
  ];
  function lvl(d) { for (var k = 0; k < LV.length; k++) if (d <= LV[k].max) return LV[k]; return LV[LV.length - 1]; }
  var props = Array.prototype.slice.call(scene.querySelectorAll('[data-v]')).sort(function (a, b) { return +a.getAttribute('data-v') - +b.getAttribute('data-v'); });
  var lastD = -1, annT = 0;
  function render(quiet) {
    var d = danger(on), lv = lvl(d), pct = Math.round(d / MAX * 100), n = G.filter(function (x) { return on[x.id]; }).length;
    out.textContent = build(job.id, on, fFolder.value, fTypes.value);
    meter.style.setProperty('--d', pct); meter.style.setProperty('--dc', lv.color);
    meter.setAttribute('aria-valuenow', pct); meter.setAttribute('aria-valuetext', lv.name + ': ' + n + ' of 8 guardrails on');
    $('#ag-lv').textContent = lv.name; $('#ag-lv').style.color = lv.color; $('#ag-head').textContent = lv.head;
    $('#ag-n').textContent = n + ' of 8 guardrails on';
    // the office vanishes, one piece at a time
    var gone = Math.round(d / MAX * props.length);
    props.forEach(function (p, k) {
      var g = k < gone; if (p.classList.contains('gone') !== g) { p.classList.toggle('gone', g); if (g && !Gyaani.reduce) puff(p); }
    });
    scene.setAttribute('data-level', d === 0 ? 'safe' : d === MAX ? 'gone' : d > 8 ? 'danger' : 'mid');
    var gy = $('.ag-gy', scene), bub = $('.bubble', scene), fx = $('.ag-fx', scene);
    var src = d === 0 ? '/lab/assets/gy-sit.webp' : Gyaani.A + 'pose-' + (d > 8 ? '03' : d > 4 ? '01' : '04') + '.webp';
    if (gy.getAttribute('src') !== src) { gy.src = src; if (!Gyaani.reduce) { gy.classList.remove('bump'); void gy.offsetWidth; gy.classList.add('bump'); } }
    var fxs = d === 0 ? 'halo' : d === MAX ? 'puff' : d > 8 ? 'star' : 'sweat';
    fx.src = Gyaani.A + 'fx-' + fxs + '.webp';
    if (bub.textContent !== lv.line) { bub.textContent = lv.line; if (!Gyaani.reduce) { bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop'); } }
    var miss = G.filter(function (x) { return !on[x.id]; });
    $('#ag-miss').innerHTML = miss.length ? '<b>Missing from this brief:</b> ' + miss.map(function (x) { return x.short; }).join(' · ') :
      '<b>All eight guardrails are in.</b> Still check the Output folder yourself before you use it.';
    $('#ag-miss').className = 'gmiss' + (miss.length ? '' : ' ok');
    clearTimeout(annT);
    if (!quiet && d !== lastD) annT = setTimeout(function () { live.textContent = n + ' of 8 guardrails on. Danger: ' + lv.name + '. ' + lv.head; }, 500);
    lastD = d;
  }
  function puff(p) {
    var r = p.getBoundingClientRect(), s = scene.getBoundingClientRect(), im = document.createElement('img');
    im.src = Gyaani.A + 'fx-puff.webp'; im.alt = ''; im.className = 'ag-puff';
    im.style.left = ((r.left + r.width / 2 - s.left) / s.width * 100) + '%'; im.style.top = ((r.top + r.height / 2 - s.top) / s.height * 100) + '%';
    scene.appendChild(im); setTimeout(function () { im.remove(); }, 900);
  }
  $('#ag-jobs').addEventListener('click', function (e) {
    var b = e.target.closest('.job'); if (!b) return; var i = +b.getAttribute('data-i'); job = JOBS[i];
    $('#ag-jobs').querySelectorAll('.job').forEach(function (x, k) { x.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    fFolder.value = job.folder; fTypes.value = job.types; render(true);
  });
  $('#ag-guards').addEventListener('click', function (e) {
    var b = e.target.closest('.sw'); if (!b) return; var id = b.getAttribute('data-g'); on[id] = !on[id];
    b.setAttribute('aria-checked', on[id] ? 'true' : 'false'); render();
  });
  function all(v) { G.forEach(function (x) { on[x.id] = v; }); root.querySelectorAll('.sw').forEach(function (b) { b.setAttribute('aria-checked', v ? 'true' : 'false'); }); render(); }
  $('#ag-all').addEventListener('click', function () { all(true); });
  $('#ag-none').addEventListener('click', function () { all(false); });
  fFolder.addEventListener('input', function () { render(true); }); fTypes.addEventListener('input', function () { render(true); });
  $('#ag-copy').addEventListener('click', function () {
    var b = this, text = out.textContent;
    var done = function () { b.textContent = 'Copied ✓'; live.textContent = 'The brief is copied to the clipboard.'; setTimeout(function () { b.textContent = 'Copy the brief'; }, 1600); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fb); else fb();
    function fb() { var x = document.createElement('textarea'); x.value = text; x.style.position = 'fixed'; x.style.opacity = '0'; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); } catch (e) {} x.remove(); done(); }
  });
  $('#ag-card').addEventListener('click', function () {
    if (!window.GyaaniCard) return;
    var d = danger(on), n = G.filter(function (x) { return on[x.id]; }).length, lv = lvl(d);
    GyaaniCard.open({ kicker: 'Agent brief builder', head: n === 8 ? 'My AI agent brief: all 8 guardrails on' : 'My AI agent brief: ' + n + ' of 8 guardrails', score: n + '/8', scoreLabel: 'Guardrails',
      src: d === 0 ? '/lab/assets/gy-sit.webp' : Gyaani.A + 'pose-' + (d > 8 ? '03' : '01') + '.webp', fx: d === 0 ? 'halo' : d > 8 ? 'puff' : 'sweat', line: lv.line,
      props: d === 0 ? [{ src: '/lab/assets/box.webp', x: .5, h: 150 }] : [], sub: 'Job: ' + job.title,
      habit: 'Backup first. Copies only. Plan before action. The sign-off stays mine.', file: 'gyaani-agent-' + n + 'of8',
      shareText: 'My AI agent brief has ' + n + ' of 8 guardrails. Saaf kar do… safely.' }, this);
  });
  fFolder.value = job.folder; fTypes.value = job.types;
  render(true);
})();
