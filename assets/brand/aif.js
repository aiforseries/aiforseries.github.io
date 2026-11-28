/* "AI For ___" (style C, "AI drafts, you check"). Markup, written by books/ai-for-cas/site.py (home) and brand-kit/seo/watch_hub.py (/skits/):
   <p class="aif"><span class="aif-sr">sentence</span><span class="aif-v" aria-hidden="true"><span class="aif-ai">AI For</span>
   <span class="aif-slot" data-words="Students|...|You"><span class="aif-word">You</span><span class="aif-blank"></span><svg class="aif-chk">..</svg><svg class="aif-spark">..</svg></span></span></p>
   The markup is the end state. Here each word scrambles like an AI drafting it, then locks letter by letter into gold; the blank under it
   follows the word's width; on the last word the tick and the sparkle pop. Once per page load. Reduced motion: nothing moves.
   Also: <video data-autoplay> plays muted unless reduced motion, and pauses while off screen. */
(function () {
  var still = !window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches;

  [].forEach.call(document.querySelectorAll('video[data-autoplay]'), function (v) {
    if (still) return;
    v.muted = true;
    var go = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) go(); else v.pause(); }); }).observe(v);
    } else go();
  });

  var s = document.querySelector('.aif-slot');
  if (!s || still) return;
  var root = s.closest('.aif'), w = s.querySelector('.aif-word'), L = s.getAttribute('data-words').split('|');
  var G = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*@', m = document.createElement('span');
  m.className = 'aif-meas';
  s.appendChild(m);
  var NB = ' ';
  function width(t) {  // in em, so a font swap or a resize keeps the blank right
    m.textContent = t;
    var fs = parseFloat(getComputedStyle(s).fontSize) || 16;
    return (m.getBoundingClientRect().width / fs + 0.04).toFixed(3) + 'em';
  }
  function rnd() { return G.charAt(Math.random() * G.length | 0); }
  function draft(t, last, done) {
    s.style.width = width(t);
    w.textContent = '';
    var sp = t.split('').map(function (c) {
      var e = document.createElement('span');
      e.className = 'scr';
      e.textContent = c === ' ' ? NB : rnd();
      w.appendChild(e);
      return e;
    });
    var n = 0, at = sp.map(function (_, k) { return 5 + Math.round(k * 1.5); });
    var iv = setInterval(function () {
      n++;
      var all = true;
      sp.forEach(function (e, k) {
        if (e.className === 'lock') return;
        if (n >= at[k]) { e.className = 'lock'; e.textContent = t.charAt(k) === ' ' ? NB : t.charAt(k); }
        else { all = false; if (t.charAt(k) !== ' ') e.textContent = rnd(); }
      });
      if (all) { clearInterval(iv); if (last) { root.classList.add('aif-done'); } setTimeout(done, last ? 0 : 950); }
    }, 42);
  }
  var i = 0;
  function next() {
    if (i >= L.length) {  // rest on the last word as plain text, the slot back to its natural width
      w.textContent = L[L.length - 1];
      setTimeout(function () { s.style.width = ''; }, 600);
      return;
    }
    var t = L[i++];
    draft(t, i === L.length, next);
  }
  var start = function () { root.classList.add('aif-run'); s.style.width = width(w.textContent); setTimeout(next, 350); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
