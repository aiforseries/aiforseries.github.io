/* "Make my card": a 1080x1350 share image of a result (clay style, Gyaani, the score, the site name; never anything the visitor typed).
   Drawn on a canvas in the browser. Download or share it from the device; nothing is uploaded. Used by /lab/ tools and the homepage game.
   GyaaniCard.open(opts, opener)   opts: {kicker, head, score, sub, line, pose:'01'..'06' or src, fx, habit, file}
   GyaaniCard.make(opts) -> Promise<canvas>   GyaaniCard.blob(opts) -> Promise<Blob> */
(function () {
  'use strict';
  if (window.GyaaniCard) return;
  var A = '/assets/gyaani/', W = 1080, H = 1350;
  var SANS = 'system-ui,-apple-system,"Segoe UI","Noto Sans",Roboto,sans-serif';
  var imgs = {};
  function load(src) {
    if (!imgs[src]) imgs[src] = new Promise(function (ok) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { ok(im); }; im.onerror = function () { ok(null); };
      im.src = src;
    });
    return imgs[src];
  }
  function poseSrc(o) { return o.src || A + 'pose-' + (o.pose || '03') + '.webp'; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function wrap(c, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function fit(c, text, weight, size, min, maxW, maxLines) {
    for (var s = size; s >= min; s -= 2) { c.font = weight + ' ' + s + 'px ' + SANS; var l = wrap(c, text, maxW); if (l.length <= maxLines) return { size: s, lines: l }; }
    c.font = weight + ' ' + min + 'px ' + SANS; return { size: min, lines: wrap(c, text, maxW).slice(0, maxLines) };
  }
  function grain(c, alpha) {
    var g = document.createElement('canvas'); g.width = g.height = 180; var gx = g.getContext('2d'), d = gx.createImageData(180, 180);
    for (var i = 0; i < d.data.length; i += 4) { var v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.random() * 255 * alpha; }
    gx.putImageData(d, 0, 0); return c.createPattern(g, 'repeat');
  }
  function mark(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s / 40, s / 40);
    rr(c, 0, 0, 40, 40, 9); c.fillStyle = '#7A1A2B'; c.fill(); c.strokeStyle = '#ffffff55'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#fff'; c.font = '800 17px ' + SANS; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText('AI', 20, 24);
    c.fillStyle = '#e9b949'; rr(c, 9, 28.5, 22, 2.2, 1); c.fill(); rr(c, 9, 32.2, 22, 2.2, 1); c.fill(); c.restore();
  }

  function make(o) {
    var extra = (o.props || []).map(function (p) { return load(p.src); });
    return Promise.all([load(A + 'stage-office.webp'), load(poseSrc(o)), o.fx ? load(A + 'fx-' + o.fx + '.webp') : null].concat(extra)).then(function (r) {
      var set = r[0], pose = r[1], fx = r[2], props = r.slice(3);
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
      // maroon clay background
      var bg = c.createRadialGradient(W * .85, H * .08, 40, W * .6, H * .4, H * 1.05);
      bg.addColorStop(0, '#93283c'); bg.addColorStop(.42, '#7A1A2B'); bg.addColorStop(1, '#3f0c16');
      c.fillStyle = bg; c.fillRect(0, 0, W, H);
      c.globalAlpha = .55; c.fillStyle = grain(c, .22); c.fillRect(0, 0, W, H); c.globalAlpha = 1;
      // brand row
      mark(c, 70, 64, 64);
      c.fillStyle = '#fff'; c.font = '800 38px ' + SANS; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('The AI For Series', 152, 98);
      // kicker
      c.fillStyle = '#e9b949'; c.font = '800 30px ' + SANS; c.textBaseline = 'alphabetic';
      if (c.letterSpacing !== undefined) c.letterSpacing = '3px';
      c.fillText(String(o.kicker || 'Gyaani’s Desk').toUpperCase(), 72, 216);
      if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
      // headline
      var hd = fit(c, o.head || 'I briefed Gyaani well', '800', 96, 64, W - 144, 2);
      c.fillStyle = '#fff'; c.font = '800 ' + hd.size + 'px ' + SANS;
      hd.lines.forEach(function (l, k) { c.fillText(l, 70, 216 + 22 + hd.size * (k + 1) * 1.02); });
      var top = 216 + 22 + hd.size * hd.lines.length * 1.02 + 40;
      // the clay stage
      var sx = 70, sy = Math.max(top, 420), sw = W - 140, sh = 1090 - sy;
      c.save(); c.shadowColor = '#0009'; c.shadowBlur = 60; c.shadowOffsetY = 30; rr(c, sx, sy, sw, sh, 44); c.fillStyle = '#f4e6d4'; c.fill(); c.restore();
      var b = 16; c.save(); rr(c, sx + b, sy + b, sw - 2 * b, sh - 2 * b, 32); c.clip();
      if (set) { var sc = Math.max((sw - 2 * b) / set.width, (sh - 2 * b) / set.height), iw = set.width * sc, ih = set.height * sc;
        c.drawImage(set, sx + b + (sw - 2 * b - iw) / 2, sy + b + (sh - 2 * b - ih) * .35, iw, ih); }
      else { c.fillStyle = '#8bab3f'; c.fillRect(sx, sy, sw, sh); }
      var glow = c.createRadialGradient(sx + sw * .6, sy + sh * .5, 10, sx + sw * .6, sy + sh * .5, sw * .6);
      glow.addColorStop(0, '#ffffff38'); glow.addColorStop(1, '#ffffff00'); c.fillStyle = glow; c.fillRect(sx, sy, sw, sh);
      // desk
      var dy = sy + sh - 150, dk = c.createLinearGradient(0, dy, 0, sy + sh);
      dk.addColorStop(0, '#cf8a4d'); dk.addColorStop(.14, '#cf8a4d'); dk.addColorStop(.15, '#b06a33'); dk.addColorStop(1, '#8f5228');
      c.fillStyle = dk; c.fillRect(sx, dy, sw, 160); c.fillStyle = '#e3a56a'; c.fillRect(sx, dy, sw, 5);
      c.globalAlpha = .5; c.fillStyle = grain(c, .3); c.fillRect(sx, dy, sw, 160); c.globalAlpha = 1;
      // props on the desk
      props.forEach(function (im, k) { if (!im) return; var p = o.props[k], ph = p.h || 150, pw = im.width * ph / im.height;
        c.save(); c.shadowColor = '#0005'; c.shadowBlur = 14; c.shadowOffsetY = 8; c.drawImage(im, sx + sw * p.x - pw / 2, dy + 24 - ph, pw, ph); c.restore(); });
      // Gyaani
      if (pose) { var ph2 = Math.min(sh * .74, 520), pw2 = pose.width * ph2 / pose.height, px = sx + sw * .70 - pw2 / 2, py = dy + 40 - ph2;
        c.save(); c.shadowColor = '#0006'; c.shadowBlur = 18; c.shadowOffsetY = 10; c.drawImage(pose, px, py, pw2, ph2); c.restore();
        if (fx) { var fw = 120, fh = fx.height * fw / fx.width; c.drawImage(fx, px + pw2 * .82, py - 10, fw, fh); } }
      c.restore();
      // speech bubble
      if (o.line) {
        c.font = '700 36px ' + SANS; var bl = wrap(c, o.line, 400).slice(0, 4), bw = 0;
        bl.forEach(function (l) { bw = Math.max(bw, c.measureText(l).width); });
        var bx = sx + 44, by = sy + 46, bwid = bw + 56, bh = bl.length * 46 + 40;
        c.save(); c.shadowColor = '#0006'; c.shadowBlur = 24; c.shadowOffsetY = 10; rr(c, bx, by, bwid, bh, 30); c.fillStyle = '#fff8ec'; c.fill(); c.restore();
        c.fillStyle = '#ecdcc4'; c.fillRect(bx + 24, by + bh - 6, bwid - 48, 6);
        c.fillStyle = '#fff8ec'; c.beginPath(); c.moveTo(bx + bwid - 8, by + bh - 50); c.lineTo(bx + bwid + 26, by + bh - 14); c.lineTo(bx + bwid - 40, by + bh - 6); c.closePath(); c.fill();
        c.fillStyle = '#2a1d1f'; c.textBaseline = 'alphabetic'; bl.forEach(function (l, k) { c.fillText(l, bx + 28, by + 58 + k * 46); });
      }
      // the score medal
      if (o.score) {
        var mx = sx + 170, my = sy + sh - 190, mr = 128;
        c.save(); c.shadowColor = '#0007'; c.shadowBlur = 30; c.shadowOffsetY = 14; c.beginPath(); c.arc(mx, my + 10, mr, 0, 7); c.fillStyle = '#b8892a'; c.fill(); c.restore();
        c.beginPath(); c.arc(mx, my, mr, 0, 7); var mg = c.createRadialGradient(mx - 40, my - 50, 10, mx, my, mr); mg.addColorStop(0, '#ffe08a'); mg.addColorStop(1, '#e9b949'); c.fillStyle = mg; c.fill();
        c.beginPath(); c.arc(mx, my, mr - 16, 0, 7); c.strokeStyle = '#fff6'; c.lineWidth = 4; c.stroke();
        c.fillStyle = '#2a1408'; c.textAlign = 'center'; var sf = fit(c, o.score, '800', 104, 56, mr * 1.6, 1);
        c.font = '800 ' + sf.size + 'px ' + SANS; c.textBaseline = 'middle'; c.fillText(o.score, mx, my - 6);
        c.font = '800 22px ' + SANS; if (c.letterSpacing !== undefined) c.letterSpacing = '2px';
        c.fillText(String(o.scoreLabel || 'Score').toUpperCase(), mx, my + 64); if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
        c.textAlign = 'left';
      }
      // sub and habit
      c.textBaseline = 'alphabetic'; c.fillStyle = '#f6e7ea';
      var hb = fit(c, o.habit || '', '600', 36, 28, W - 140, 2);
      c.font = '600 ' + hb.size + 'px ' + SANS; hb.lines.forEach(function (l, k) { c.fillText(l, 70, 1090 + 64 + k * hb.size * 1.22); });
      c.fillStyle = '#ffffff26'; c.fillRect(70, H - 104, W - 140, 2);
      // footer
      c.fillStyle = '#e9b949'; c.font = '800 34px ' + SANS; c.fillText('aiforseries.github.io/lab', 70, H - 46);
      c.fillStyle = '#ecd6da'; c.font = '600 28px ' + SANS; c.textAlign = 'right'; c.fillText(o.sub || 'Try it yourself', W - 70, H - 46); c.textAlign = 'left';
      return cv;
    });
  }
  function blob(o) { return make(o).then(function (cv) { return new Promise(function (ok) { cv.toBlob(ok, 'image/png'); }); }); }

  var CSS = '.gcard{border:0;padding:0;border-radius:24px;width:min(440px,calc(100vw - 24px));max-width:none;background:#fffaf4;color:#1d1a1a;box-shadow:0 30px 80px #0007;font-family:' + SANS + '}' +
    '.gcard::backdrop{background:#2a1d1fd0}' +
    '.gcard .gc-in{position:relative;padding:16px 16px 18px;max-height:calc(100vh - 24px);overflow:auto}' +
    '.gcard h2{font:800 19px/1.3 ' + SANS + ';margin:4px 48px 12px 4px;letter-spacing:-.2px;color:#1d1a1a}' +
    '.gcard .gc-pv{display:block;width:100%;height:auto;aspect-ratio:1080/1350;border-radius:14px;box-shadow:0 0 0 1px #0001,0 10px 24px #0002;background:#7A1A2B}' +
    '.gcard .gc-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px}' +
    '.gcard .gc-b{display:inline-flex;align-items:center;gap:8px;font:700 15px/1.2 ' + SANS + ';padding:11px 18px;border-radius:12px;border:2px solid transparent;cursor:pointer;text-decoration:none;' +
    'background:#7A1A2B;color:#fff;box-shadow:0 4px 0 #4d0f1b}.gcard .gc-b:hover{background:#5e1220;color:#fff}' +
    '.gcard .gc-b.alt{background:#fff;color:#7A1A2B;border-color:#e6cfc4;box-shadow:0 4px 0 #ead9cd}.gcard .gc-b.alt:hover{background:#f7f1ec}' +
    '.gcard .gc-b:active{transform:translateY(3px);box-shadow:none}.gcard .gc-b[hidden]{display:none}' +
    '.gcard .gc-x{position:absolute;top:12px;right:12px;width:40px;height:40px;border:0;border-radius:50%;background:#f1e4d6;font:700 22px/1 ' + SANS + ';color:#5f5757;cursor:pointer}' +
    '.gcard .gc-x:hover{background:#ead6bd}.gcard :focus-visible{outline:3px solid #b8892a;outline-offset:3px}' +
    '.gcard .gc-note{font:13.5px/1.45 ' + SANS + ';color:#5f5757;text-align:center;margin:12px 4px 0}.gcard .gc-st{font:700 14px ' + SANS + ';color:#1d6b35;text-align:center;margin:8px 0 0;min-height:1em}';
  var dlg, url, opener, cur;
  function build() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    dlg = document.createElement('dialog'); dlg.className = 'gcard'; dlg.setAttribute('aria-labelledby', 'gc-h');
    dlg.innerHTML = '<div class="gc-in"><h2 id="gc-h">Your card is ready</h2><button type="button" class="gc-x" aria-label="Close">×</button>' +
      '<img class="gc-pv" alt="" width="1080" height="1350">' +
      '<div class="gc-row"><a class="gc-b gc-dl" download="gyaani-card.png" href="#">Download</a><button type="button" class="gc-b alt gc-sh" hidden>Share</button></div>' +
      '<p class="gc-st" role="status"></p><p class="gc-note">Made in your browser. It has your score and nothing you typed. Nothing is uploaded.</p></div>';
    document.body.appendChild(dlg);
    dlg.querySelector('.gc-x').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dlg.addEventListener('close', function () { if (opener && opener.focus) opener.focus(); });
    dlg.querySelector('.gc-dl').addEventListener('click', function () { dlg.querySelector('.gc-st').textContent = 'Saved as gyaani-card.png'; });
    dlg.querySelector('.gc-sh').addEventListener('click', function () {
      if (!cur) return;
      var f = new File([cur.blob], 'gyaani-card.png', { type: 'image/png' });
      navigator.share({ files: [f], title: cur.o.head, text: (cur.o.shareText || cur.o.head) + ' https://aiforseries.github.io/lab/' }).catch(function () {});
    });
  }
  function close() { if (dlg && dlg.open) dlg.close(); }
  function open(o, from) {
    if (!dlg) build();
    opener = from || document.activeElement;
    var pv = dlg.querySelector('.gc-pv'), st = dlg.querySelector('.gc-st');
    st.textContent = 'Drawing your card…'; pv.removeAttribute('src');
    pv.alt = 'Share card: ' + (o.head || '') + (o.score ? ', ' + o.score : '') + '. Gyaani the clay robot. aiforseries.github.io/lab';
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    return blob(o).then(function (b) {
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(b); cur = { blob: b, o: o };
      pv.src = url; dlg.querySelector('.gc-dl').href = url; dlg.querySelector('.gc-dl').download = (o.file || 'gyaani-card') + '.png';
      var sh = dlg.querySelector('.gc-sh'), can = false;
      try { can = !!(navigator.canShare && navigator.canShare({ files: [new File([b], 'gyaani-card.png', { type: 'image/png' })] })); } catch (e) {}
      sh.hidden = !can; st.textContent = '';
      return b;
    });
  }
  // fetch the pieces with the page, so making a card later needs nothing from the network
  ['stage-office', 'pose-01', 'pose-03', 'pose-05', 'pose-06', 'fx-star', 'fx-heart', 'fx-halo', 'fx-bulb'].forEach(function (n) { load(A + n + '.webp'); });
  window.GyaaniCard = { open: open, make: make, blob: blob, close: close, load: load };
})();
