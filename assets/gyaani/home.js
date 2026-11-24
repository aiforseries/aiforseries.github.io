/* Gyaani on the homepage: the living hero and the "Spot Gyaani's mistake" game. No tracking, no storage, no requests beyond the images. */
(function () {
  'use strict';
  var A = '/assets/gyaani/';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && matchMedia('(hover: none)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  /* ---------- the hero ---------- */
  var gy = $('#gy');
  if (gy) (function () {
    var say = $('#gh-say'), live = $('#gh-live'), hint = $('#gh-hint'), fx = $('.gy-fx', gy);
    var pupils = [$('.gy-el img', gy), $('.gy-er img', gy)];
    // sprite geometry (px in the 386x516 head): eye clip boxes and resting pupil centres
    var EYES = [{ x: 85, y: 172, w: 98, h: 80, cx: 134, cy: 212, rx: 144.9, ry: 226.9 },
                { x: 214, y: 171, w: 95, h: 84, cx: 261.5, cy: 213, rx: 245.5, ry: 227.1 }];
    var LINES = [
      ['Poora ledger bhejo! Bank statement bhi!', 'bang'],
      ['Section 420-Z. Pakka. Source? …Maine socha tha.', 'sweat'],
      ['Bank reco done! Difference zero!', 'star'],
      ['Total? Lagbhag ek crore. Lagbhag.', 'spiral'],
      ['Jo extra tha, uda diya. Originals bhi!', 'puff'],
      ['Achha… sirf headings do. Script main likhta hoon.', 'bulb'],
      ['Pehle backup, phir copy pe kaam. Samajh gaya!', 'halo'],
      ['Brief achha doge, toh kaam achha milega.', 'heart']
    ];
    var i = 0, clicks = [], typing = 0, flap = 0, touched = false;

    function mouth(m) { if (m) gy.setAttribute('data-m', m); else gy.removeAttribute('data-m'); }
    function talk(ms) {
      clearTimeout(flap);
      if (reduce) return;
      var end = Date.now() + ms, last = 0;
      (function step() {
        if (Date.now() > end) { mouth(0); return; }
        var m; do { m = 1 + Math.floor(Math.random() * 4); } while (m === last);
        last = m; mouth(Math.random() < .18 ? 0 : m);
        flap = setTimeout(step, rnd(70, 120));
      })();
    }
    function speak(text, fxName) {
      live.textContent = text;
      clearInterval(typing);
      if (fxName) {
        fx.src = A + 'fx-' + fxName + '.webp'; fx.hidden = false;
        if (!reduce) replay(fx, 'pop');
      } else fx.hidden = true;
      if (reduce) { say.textContent = text; return; }
      replay(say, 'pop');
      var n = 0; say.textContent = '';
      typing = setInterval(function () {
        n += 1; say.textContent = text.slice(0, n);
        if (n >= text.length) clearInterval(typing);
      }, 26);
      talk(text.length * 26 + 250);
    }
    function poke() {
      touched = true; hint.classList.remove('on');
      var now = Date.now();
      clicks = clicks.filter(function (t) { return now - t < 2500; }); clicks.push(now);
      if (!reduce) replay(gy, 'hop');
      if (clicks.length >= 5) { clicks = []; speak('Arre! Gudgudi hoti hai!', 'spiral'); return; }
      var l = LINES[i++ % LINES.length]; speak(l[0], l[1]);
    }
    gy.addEventListener('click', poke);
    gy.addEventListener('animationend', function (e) { if (e.animationName === 'gy-hop') gy.classList.remove('hop'); });
    hint.textContent = coarse ? 'Psst. Tap him.' : 'Psst. Click him.';
    setTimeout(function () { if (!touched) hint.classList.add('on'); }, 3800);
    if (reduce) return;

    // blinking
    (function blink() {
      setTimeout(function () {
        gy.classList.add('blink');
        setTimeout(function () {
          gy.classList.remove('blink');
          if (Math.random() < .22) setTimeout(function () { gy.classList.add('blink'); setTimeout(function () { gy.classList.remove('blink'); }, 110); }, 150);
          blink();
        }, 120);
      }, rnd(2200, 5200));
    })();
    // say hello with the line already in the bubble
    setTimeout(function () { talk(1700); }, 650);

    // eyes and a small head tilt follow the pointer (or wander on touch screens)
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, tilt = $('.gy-tilt', gy);
    function place() {
      cx += (tx - cx) * .2; cy += (ty - cy) * .2;
      EYES.forEach(function (e, k) {
        var px = e.cx + cx * 22, py = e.cy + 8 + cy * 15;
        pupils[k].style.left = ((px - 19.5 - e.x) / e.w * 100) + '%';
        pupils[k].style.top = ((py - 19.5 - e.y) / e.h * 100) + '%';
      });
      tilt.style.transform = 'rotate(' + (cx * 4).toFixed(2) + 'deg) translateX(' + (cx * 1.5).toFixed(2) + '%)';
      raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .004) ? requestAnimationFrame(place) : 0;
    }
    function lookAt(x, y) {
      var r = gy.getBoundingClientRect(), hx = r.left + r.width / 2, hy = r.top + r.height * .42;
      tx = Math.max(-1, Math.min(1, (x - hx) / Math.max(260, innerWidth * .45)));
      ty = Math.max(-1, Math.min(1, (y - hy) / Math.max(220, innerHeight * .45)));
      if (!raf) raf = requestAnimationFrame(place);
    }
    // look straight at the visitor to start with
    cy = ty = .4; raf = requestAnimationFrame(place);
    window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') lookAt(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('pointerdown', function (e) { lookAt(e.clientX, e.clientY); }, { passive: true });
    if (coarse) setInterval(function () {
      if (document.hidden) return;
      tx = rnd(-.8, .8); ty = rnd(-.6, .7); if (!raf) raf = requestAnimationFrame(place);
    }, 2600);
  })();

  /* ---------- the game ---------- */
  var game = $('#game');
  if (!game) return;
  var R = [
    { scene: 'ledger', pose: '02', ep: 2, title: 'Poora ledger',
      alt: 'Clay scene: Varun from Kapoor Industries carries a huge stack of ledgers towards Gyaani in the meeting room.',
      bubble: 'Poora ledger daal do! Bank statement bhi. Main sab sambhal lunga.',
      setup: '<b>Varun</b>, in accounts at Kapoor Industries, is in a hurry. He feeds Gyaani the company’s whole ledger and bank statement.',
      q: 'What’s the mistake?',
      opts: ['Company data went straight into a chat. Gyaani needed only the column headings.', 'He forgot to send last year’s ledger as well.', 'Nothing. The more data the AI gets, the better the answer.'], ok: 0,
      mistake: 'Pasting the company’s ledger and bank statement into an AI chat. That data has now left the building.',
      habit: 'Only the column headings go to the AI. It writes a script, and the script runs on your own laptop.',
      caught: 'Achha… sirf headings. Script aapke laptop pe chalega.', missed: 'Dekha? Sab sambhal liya!' },
    { scene: 'zero', pose: '03', ep: 4, title: 'Difference zero',
      alt: 'Clay scene: Kapoor, the managing director, gives two thumbs up in the office corridor.',
      bubble: 'Bank reco done! Difference zero!', chips: ['Bank statement: <b>3,000</b> entries', 'In the reco: <b>300</b>'],
      setup: '<b>Kapoor</b>, the MD, is thrilled. The bank reconciliation took two seconds.',
      q: 'What should worry you?',
      opts: ['Nothing. A zero difference means the reco is perfect.', 'Two seconds is too fast. Real recos take a full day.', '3,000 entries went in and 300 came out. The zero proves nothing.'], ok: 2,
      mistake: 'Trusting “difference zero” without counting. Most of the entries never made it into the reco.',
      habit: 'Match the count and the totals first: as many entries in as out, then trust the difference.',
      caught: 'Teen hazaar andar… teen sau bahar. Oops.', missed: 'Party kab hai?' },
    { scene: '420z', pose: '05', ep: 1, title: 'Section 420-Z',
      alt: 'Clay scene: Boss sir beams with his arms wide open in the Bhasad & Associates office.',
      bubble: 'Reply ready! Under Section 420-Z, the notice is invalid.',
      setup: 'A tax notice came in. Gyaani drafted the reply in seconds, and <b>Boss sir</b> calls him partner material.',
      q: 'Before it goes out, what do you check?',
      opts: ['That the reply sounds confident enough.', 'Where Section 420-Z comes from. No source, no reply.', 'Nothing. An AI wouldn’t make up a section.'], ok: 1,
      mistake: 'Trusting a reply that cites a section nobody can find. Confident is not the same as correct.',
      habit: 'Ask for every section with its source, then read the official text yourself.',
      caught: 'Source… maine socha tha.', missed: 'Partner material!' },
    { scene: 'tb', pose: '04', ep: 9, title: 'Chat se hisaab',
      alt: 'Clay scene: Madam, the CFO, peers at a long sheet of paper in her cabin. A few coins lie under her desk.',
      bubble: 'Debit ek crore! Credit… lagbhag ek crore!',
      setup: '<b>Madam</b>, the CFO, asked for the trial balance total. Gyaani worked it out in his head, inside the chat.',
      q: 'What’s wrong with his answer?',
      opts: ['Totals don’t come from a chat’s head. Ask for the formula, total it in Excel.', 'He should have rounded it to the nearest lakh.', 'Nothing. “Lagbhag” is close enough for a trial balance.'], ok: 0,
      mistake: 'Asking a chat to add up a trial balance. It can sound exact and still be wrong.',
      habit: 'Get the formula from the AI and the total from Excel. Debits equal credits, exactly.',
      caught: 'Theek hai, formula deta hoon. Total Excel karega.', missed: 'Lagbhag sahi hai na?' },
    { scene: 'udado', pose: '01', ep: 7, title: 'Saaf kar do',
      alt: 'Clay scene: Kapoor holds out a small box in the server room, next to a waste-paper bin.',
      bubble: 'Ho gaya! Jo extra tha, sab uda diya. Originals bhi!',
      setup: '<b>Kapoor</b> let an AI agent loose on the shared drive: “Jo extra hai, uda do!” (Delete whatever is extra.)',
      q: 'What went wrong?',
      opts: ['It should have emptied the recycle bin as well.', 'Nothing. A clean drive is a happy drive.', 'The agent got the originals, with no backup and no plan to approve first.'], ok: 2,
      mistake: 'Giving an AI agent the originals and a vague order. “Extra” meant something different to him.',
      habit: 'Never the originals: take a backup, give the agent copies, and approve its plan before it touches anything.',
      caught: 'Agli baar: backup, copies, aur pehle plan.', missed: 'Ekdum saaf!' }
  ];
  var scene = $('.g-scene', game), bg = $('.g-bg', game), gp = $('.g-gy', game), gfx = $('.g-fx', game),
      bub = $('.g-bubble', game), chips = $('.g-chips', game), panel = $('.g-panel', game);
  var n = 0, score = 0, res = [];
  function pre(src) { var im = new Image(); im.src = src; }
  function fxShow(name) { gfx.src = A + 'fx-' + name + '.webp'; gfx.hidden = false; if (!reduce) replay(gfx, 'pop'); }
  function line(t) { bub.textContent = t; if (!reduce) replay(bub, 'pop'); }
  function dots() {
    return '<ol class="g-dots" aria-hidden="true">' + R.map(function (_, k) {
      return '<li class="' + (k < res.length ? (res[k] ? 'ok' : 'no') : k === n ? 'now' : '') + '"></li>';
    }).join('') + '</ol>';
  }
  function show(k) {
    n = k; var r = R[k];
    scene.classList.remove('end');
    bg.src = A + 'scene-' + r.scene + '.webp'; bg.alt = r.alt; bg.loading = 'eager';
    gp.src = A + 'pose-' + r.pose + '.webp'; gp.hidden = false; gfx.hidden = true; line(r.bubble);
    chips.innerHTML = (r.chips || []).map(function (c) { return '<li>' + c + '</li>'; }).join('');
    panel.innerHTML = '<div class="g-top"><p class="g-round" tabindex="-1">Round ' + (k + 1) + ' of ' + R.length + '</p>' + dots() + '</div>' +
      '<p class="vh2">Gyaani says: ' + esc(r.bubble) + (r.chips ? ' On screen: ' + r.chips.join(', ').replace(/<[^>]+>/g, '') + '.' : '') + '</p>' +
      '<p class="g-setup">' + r.setup + '</p><p class="g-q" id="g-q">' + r.q + '</p>' +
      '<ul class="g-opts" role="list" aria-labelledby="g-q">' + r.opts.map(function (o, j) {
        return '<li><button type="button" data-j="' + j + '"><span class="k" aria-hidden="true">' + 'ABC'[j] + '</span><span>' + o + '</span></button></li>';
      }).join('') + '</ul><div class="g-fbwrap" aria-live="polite"></div>';
    if (R[k + 1]) { pre(A + 'scene-' + R[k + 1].scene + '.webp'); pre(A + 'pose-' + R[k + 1].pose + '.webp'); }
    pre(A + 'pose-03.webp'); pre(A + 'pose-04.webp');
  }
  function answer(j) {
    var r = R[n], right = j === r.ok;
    if (res.length > n) return;
    res.push(right); if (right) score++;
    panel.querySelectorAll('.g-opts button').forEach(function (b, k) {
      b.disabled = true;
      if (k === r.ok) { b.classList.add('right'); b.insertAdjacentHTML('beforeend', '<span class="vh2"> (the right answer)</span>'); }
      else if (k === j) { b.classList.add('wrong'); b.insertAdjacentHTML('beforeend', '<span class="vh2"> (your answer)</span>'); }
      else b.classList.add('dim');
    });
    $('.g-dots', panel).outerHTML = dots();
    if (right) { gp.src = A + 'pose-04.webp'; fxShow('sweat'); line(r.caught); }
    else { gp.src = A + 'pose-03.webp'; fxShow('star'); line(r.missed); }
    if (!reduce) replay(gp, 'bump');
    var last = n === R.length - 1;
    $('.g-fbwrap', panel).innerHTML = '<div class="g-fb ' + (right ? 'ok' : 'no') + '"><h3 tabindex="-1">' +
      (right ? 'Caught him.' : 'Gyaani got that one past you.') + '</h3>' +
      '<p>' + r.mistake + '</p><p class="g-habit"><span>The habit</span>' + r.habit + '</p>' +
      '<div class="g-act"><button type="button" class="cta g-next">' + (last ? 'See your score' : 'Next round') + ' <span aria-hidden="true">→</span></button>' +
      '<a href="/clay/ep' + r.ep + '/">Get the prompt for this (Episode ' + r.ep + ', ' + r.title + ')</a></div></div>';
    $('.g-fb h3', panel).focus({ preventScroll: true });
  }
  function end() {
    n = R.length; scene.classList.add('end');
    bg.src = A + 'stage-office.webp'; bg.alt = 'Clay scene: the Bhasad & Associates office.';
    chips.innerHTML = ''; gfx.hidden = true;
    var pose = score === R.length ? '01' : score >= 3 ? '06' : '03';
    gp.src = A + 'pose-' + pose + '.webp';
    line(score === R.length ? 'Aap mere reviewer ban jao!' : score >= 3 ? 'Achha review! Main seekh raha hoon.' : 'Main toh sahi tha! …Na?');
    if (score >= 3) fxShow(score === R.length ? 'star' : 'heart');
    if (!reduce) replay(gp, 'bump');
    var head = score === R.length ? 'All five caught. Senior reviewer material.' : score >= 3 ? 'Sharp eyes. ' + (R.length - score) + ' slipped past.' : 'Gyaani is very convincing.';
    panel.innerHTML = '<div class="g-end"><span class="g-score">You caught ' + score + ' of ' + R.length + '</span>' + dots() .replace('g-dots', 'g-dots vh2') +
      '<h3 tabindex="-1">' + head + '</h3><p>Every round is one habit: headings, not data. Count before you trust. A source for every section. Totals from Excel. Copies, never originals. Each one comes with a free prompt you can use at work tomorrow.</p>' +
      '<div class="g-act"><a class="cta" href="/clay/">Get the prompts</a><a class="cta alt" href="#books">Meet the books</a><button type="button" class="cta alt g-again">Play again</button></div>' +
      '<p style="font:14px var(--sans);color:var(--muted);margin-top:14px">Want more? <a href="https://github.com/aiforseries/ai-prompts-for-audit-and-finance">100 free prompts for audit and finance</a>, each with a check to run before you rely on the result.</p></div>';
    $('.g-end h3', panel).focus({ preventScroll: true });
  }
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-j')) answer(+b.getAttribute('data-j'));
    else if (b.classList.contains('g-next')) {
      if (n === R.length - 1) end(); else { show(n + 1); $('.g-round', panel).focus({ preventScroll: true }); scene.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }
    } else if (b.classList.contains('g-again')) { score = 0; res = []; show(0); $('.g-round', panel).focus({ preventScroll: true }); }
  });
  game.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || n >= R.length || res.length > n) return;
    var j = 'abc'.indexOf((e.key || '').toLowerCase()); if (j < 0) j = '123'.indexOf(e.key);
    if (j >= 0 && /^(BUTTON|DIV|P|SPAN|LI|UL|IMG|H3)$/.test(e.target.tagName)) { e.preventDefault(); answer(j); }
  });
  gp.addEventListener('animationend', function () { gp.classList.remove('bump'); });
  game.setAttribute('data-state', 'on');
  show(0);
})();
