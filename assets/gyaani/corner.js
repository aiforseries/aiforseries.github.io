/* Gyaani peeps from the corner of every page. Click him for a tip from the method. No tracking; "hide" is remembered only in this browser. */
(function () {
  'use strict';
  var KEY = 'gyaani-corner-hidden';
  try { if (localStorage.getItem(KEY) === '1') return; } catch (e) {}
  if (document.getElementById('gyc')) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TIPS = [
    ['Data nahi, sirf headings.', 'Give the AI the column headings. It writes a script that runs on your own computer.', 11],
    ['Rows in = rows out.', 'Count the entries and match the totals before you trust a “difference zero”.', 10],
    ['Source kahan hai?', 'Ask for every section with its source, then read the official text yourself.', 1],
    ['Formula from me, total from Excel.', 'Never take a total from a chat. Get the formula and let the spreadsheet add.', 2],
    ['Originals ko haath nahi.', 'Take a backup, work on copies, and approve the plan before anything is deleted.', 7],
    ['Brief me like a new article.', 'Say which file, what to match, what the output looks like, and what to leave for a person.', 4],
    ['Script finds, you decide.', 'Exceptions are not findings. The judgement stays with you.', 9],
    ['Quiz me, don’t copy me.', 'Studying? Ask the AI to test you and catch your mistakes, not to write your answers.', 8]
  ];
  var css = '#gyc{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:0;z-index:40;font:15px/1.45 system-ui,-apple-system,"Segoe UI","Noto Sans",sans-serif;pointer-events:none}' +
    '#gyc .gyc-b{pointer-events:auto;display:block;width:78px;height:77px;padding:0;margin:0;border:0;background:none;cursor:pointer;overflow:hidden;border-radius:40px 40px 0 0;-webkit-tap-highlight-color:transparent;transform:translateY(100%);transition:transform .45s cubic-bezier(.3,1.5,.5,1)}' +
    '#gyc.in .gyc-b{transform:translateY(24px)}#gyc.in .gyc-b:hover,#gyc.open .gyc-b{transform:none}' +
    '#gyc .gyc-b img{display:block;width:78px;height:77px;filter:drop-shadow(0 -2px 6px #0003)}' +
    '#gyc .gyc-b:focus-visible{outline:3px solid #e9b949;outline-offset:2px}' +
    '#gyc .gyc-t{pointer-events:auto;position:absolute;right:0;bottom:84px;width:min(300px,calc(100vw - 28px));background:#fff8ec;color:#1d1a1a;border-radius:18px;padding:14px 16px 12px;box-shadow:inset 0 -3px 0 #ecdcc4,0 12px 34px #0004,0 0 0 1px #0000000f}' +
    '#gyc .gyc-t::after{content:"";position:absolute;right:30px;bottom:-12px;width:20px;height:14px;background:#fff8ec;clip-path:polygon(0 0,100% 0,70% 100%)}' +
    '#gyc .gyc-t[hidden]{display:none}#gyc b{display:block;font-weight:800;font-size:16px;margin:0 22px 3px 0;color:#7A1A2B}' +
    '#gyc p{margin:0 0 8px;color:#3a3333;font-size:15px;line-height:1.45}#gyc .gyc-r{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;font-size:13.5px}' +
    '#gyc a,#gyc .gyc-r button{color:#7A1A2B;font:700 13.5px system-ui,-apple-system,"Segoe UI",sans-serif;background:none;border:0;padding:4px 0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}' +
    '#gyc .gyc-x{position:absolute;top:6px;right:6px;width:32px;height:32px;border:0;border-radius:50%;background:none;font:700 20px/1 system-ui,sans-serif;color:#5f5757;cursor:pointer}' +
    '#gyc .gyc-x:hover{background:#0000000d}#gyc .gyc-x:focus-visible,#gyc .gyc-r button:focus-visible,#gyc a:focus-visible{outline:2px solid #7A1A2B;outline-offset:2px}' +
    (reduce ? '#gyc .gyc-b{transition:none}' : '#gyc.in .gyc-b.wig img{animation:gyc-w .6s ease-in-out}@keyframes gyc-w{0%,100%{transform:none}30%{transform:rotate(-6deg)}60%{transform:rotate(5deg)}}') +
    '#gyc.edge{position:relative;right:auto;bottom:auto;height:0;max-width:1000px;margin:0 auto;font-size:15px}' +
    '#gyc.edge .gyc-b,#gyc.edge.in .gyc-b{position:absolute;right:22px;bottom:-2px;transform:none}' +
    '#gyc.edge .gyc-t{right:12px}' +
    '@media print{#gyc{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var box = document.createElement('div'); box.id = 'gyc';
  box.innerHTML = '<div class="gyc-t" id="gyc-tip" role="dialog" aria-label="A tip from Gyaani" hidden><button type="button" class="gyc-x" aria-label="Close tip">×</button><b></b><p></p>' +
    '<div class="gyc-r"><button type="button" class="gyc-n">Another tip</button><a class="gyc-l" href="/clay/">The prompt</a><button type="button" class="gyc-h">Hide Gyaani</button></div></div>' +
    '<button type="button" class="gyc-b" aria-expanded="false" aria-controls="gyc-tip" aria-label="Gyaani is peeping. Open a tip from him."><img src="/assets/gyaani/pose-08.webp" width="257" height="255" alt="" loading="lazy" decoding="async"></button>';
  // Wide screens: fixed in the corner, peeping up from the bottom edge. Phones and laptops: peeping over the footer, so he never covers the page.
  var foot = document.querySelector('body > footer');
  var wide = innerWidth >= 1200 && !(window.matchMedia && matchMedia('(hover: none)').matches);
  if (!wide && foot) {
    box.className = 'edge'; foot.insertBefore(box, foot.firstChild);
    if (parseFloat(getComputedStyle(foot).marginTop) < 100) foot.style.marginTop = '100px';
  } else document.body.appendChild(box);
  var btn = box.querySelector('.gyc-b'), tip = box.querySelector('.gyc-t'), k = Math.floor(Math.random() * TIPS.length);
  function fill() {
    var t = TIPS[k % TIPS.length]; k++;
    tip.querySelector('b').textContent = t[0]; tip.querySelector('p').textContent = t[1];
    var l = tip.querySelector('.gyc-l'); l.href = '/clay/ep' + t[2] + '/'; l.textContent = 'The prompt for this';
  }
  function open(o) {
    tip.hidden = !o; box.classList.toggle('open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false');
    if (o) { fill(); tip.querySelector('.gyc-x').focus(); }
  }
  btn.addEventListener('click', function () { open(tip.hidden); });
  tip.querySelector('.gyc-x').addEventListener('click', function () { open(false); btn.focus(); });
  tip.querySelector('.gyc-n').addEventListener('click', fill);
  tip.querySelector('.gyc-h').addEventListener('click', function () {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    box.remove();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !tip.hidden) { open(false); btn.focus(); } });
  document.addEventListener('click', function (e) { if (!tip.hidden && !box.contains(e.target)) open(false); });
  function show(v) { box.classList.toggle('in', v); btn.tabIndex = v ? 0 : -1; if (!v && !tip.hidden) open(false); }
  btn.tabIndex = -1;
  // On the homepage he waits until the big Gyaani has scrolled away; elsewhere he peeps after a moment.
  var hero = document.getElementById('gh-stage');
  if (box.className === 'edge') show(true);
  else if (hero && window.IntersectionObserver) {
    new IntersectionObserver(function (x) { show(!x[x.length - 1].isIntersecting); }).observe(hero);
  } else setTimeout(function () { show(true); }, reduce ? 0 : 1200);
  if (!reduce) setInterval(function () {
    if (document.hidden || !box.classList.contains('in') || !tip.hidden) return;
    btn.classList.remove('wig'); void btn.offsetWidth; btn.classList.add('wig');
  }, 9000);
})();
