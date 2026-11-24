/* Gyaani for the lab pages: the layered clay head (blinks, talks, follows the pointer) and the pose stage.
   Shared by every /lab/ tool. No tracking, no storage, no requests beyond the images listed here, which load with the page. */
(function () {
  'use strict';
  var A = '/assets/gyaani/';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && matchMedia('(hover: none)').matches;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function replay(el, cls) { if (reduce || !el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  var cache = {};
  function preload(list) {
    list.forEach(function (src) { if (cache[src]) return; var im = new Image(); im.decoding = 'async'; im.src = src; cache[src] = im; });
  }
  var HEAD = '<span class="gy-tilt"><span class="gy-hop"><span class="gy-breathe">' +
    '<img class="gy-head" src="' + A + 'g-head.webp" width="386" height="516" alt="">' +
    '<img class="gy-ant" src="' + A + 'g-antenna.webp" width="90" height="105" alt="">' +
    '<span class="gy-eye gy-el"><img src="' + A + 'g-pupil.webp" width="39" height="39" alt=""></span>' +
    '<span class="gy-eye gy-er"><img src="' + A + 'g-pupil.webp" width="39" height="39" alt=""></span>' +
    [1, 2, 3, 4].map(function (m) { return '<img class="gy-m" data-m="' + m + '" src="' + A + 'g-m' + m + '.webp" width="154" height="110" alt="">'; }).join('') +
    '<img class="gy-blink" src="' + A + 'g-blink.webp" width="272" height="142" alt="">' +
    '</span></span></span><img class="gy-fx" alt="" width="160" height="160" hidden>';
  // eye clip boxes and resting pupil centres, in px of the 386x516 head
  var EYES = [{ x: 85, y: 172, w: 98, h: 80, cx: 134, cy: 212 }, { x: 214, y: 171, w: 95, h: 84, cx: 261.5, cy: 213 }];

  /* mount the talking head into a <button class="gy">. opts: {bubble: element, live: element, lines: [[text, fx]], hello: true} */
  function mount(gy, opts) {
    opts = opts || {};
    if (!gy.querySelector('.gy-head')) gy.insertAdjacentHTML('afterbegin', HEAD);
    preload(['bang', 'bulb', 'halo', 'heart', 'puff', 'spiral', 'star', 'sweat'].map(function (f) { return A + 'fx-' + f + '.webp'; }));
    var fx = gy.querySelector('.gy-fx'), say = opts.bubble, live = opts.live, lines = opts.lines || [];
    var pupils = [gy.querySelector('.gy-el img'), gy.querySelector('.gy-er img')], tilt = gy.querySelector('.gy-tilt');
    var i = 0, typing = 0, flap = 0, clicks = [];
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
      if (live) live.textContent = text;
      if (fxName) { fx.src = A + 'fx-' + fxName + '.webp'; fx.hidden = false; replay(fx, 'pop'); } else fx.hidden = true;
      if (!say) { talk(text.length * 26 + 250); return; }
      clearInterval(typing);
      if (reduce) { say.textContent = text; return; }
      replay(say, 'bub-pop');
      var n = 0; say.textContent = '';
      typing = setInterval(function () { n += 1; say.textContent = text.slice(0, n); if (n >= text.length) clearInterval(typing); }, 24);
      talk(text.length * 24 + 250);
    }
    function hop() { replay(gy, 'hop'); }
    gy.addEventListener('animationend', function (e) { if (e.animationName === 'gy-hop') gy.classList.remove('hop'); });
    gy.addEventListener('click', function () {
      if (opts.onPoke) opts.onPoke();
      var now = Date.now();
      clicks = clicks.filter(function (t) { return now - t < 2500; }); clicks.push(now);
      hop();
      if (clicks.length >= 5) { clicks = []; speak('Arre! Gudgudi hoti hai!', 'spiral'); return; }
      if (lines.length) { var l = lines[i++ % lines.length]; speak(l[0], l[1]); }
    });
    var api = { speak: speak, hop: hop, talk: talk, el: gy };
    if (reduce) return api;
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
    if (opts.hello !== false) setTimeout(function () { talk(1600); }, 600);
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
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
    api.lookAt = lookAt;
    cy = ty = .4; raf = requestAnimationFrame(place);
    window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') lookAt(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('pointerdown', function (e) { lookAt(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('focusin', function (e) {
      if (!e.target.getBoundingClientRect) return; var r = e.target.getBoundingClientRect(); lookAt(r.left + r.width / 2, r.top + r.height / 2);
    });
    if (coarse) setInterval(function () {
      if (document.hidden) return;
      tx = rnd(-.8, .8); ty = rnd(-.6, .7); if (!raf) raf = requestAnimationFrame(place);
    }, 2600);
    return api;
  }

  /* the pose stage: <div class="stage"> with img.pose, img.fx and p.bubble. react({pose:'03', fx:'star'|null, line:'...', src: full url}) */
  function stage(el) {
    var pose = el.querySelector('.pose'), fx = el.querySelector('.fx'), bub = el.querySelector('.bubble'), last = '';
    pose.addEventListener('animationend', function () { pose.classList.remove('bump'); });
    return function react(o) {
      var key = (o.src || o.pose) + '|' + o.fx + '|' + o.line;
      if (key === last) return; last = key;
      var src = o.src || A + 'pose-' + o.pose + '.webp';
      if (pose.getAttribute('src') !== src) { pose.src = src; replay(pose, 'bump'); }
      if (fx) { if (o.fx) { fx.src = A + 'fx-' + o.fx + '.webp'; fx.hidden = false; replay(fx, 'pop'); } else fx.hidden = true; }
      if (bub && o.line != null) { bub.textContent = o.line; replay(bub, 'pop'); }
    };
  }

  window.Gyaani = { mount: mount, stage: stage, preload: preload, reduce: reduce, A: A,
    poses: ['01', '02', '03', '04', '05', '06'].map(function (p) { return A + 'pose-' + p + '.webp'; }) };
})();
