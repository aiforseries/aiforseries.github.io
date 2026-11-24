/* Gyaani's Desk hub: Gyaani greets you at his desk. */
(function () {
  'use strict';
  var gy = document.getElementById('gy');
  if (!gy || !window.Gyaani) return;
  Gyaani.mount(gy, {
    bubble: document.getElementById('hub-say'), live: document.getElementById('hub-live'),
    lines: [
      ['Brief do: kya, kahan, kaunsa rule, kya wapas chahiye, aur check kaise karoge.', 'bulb'],
      ['Data nahi, sirf headings. Script aapke laptop pe chalega.', 'halo'],
      ['Jitna andar, utna bahar. Pehle count, phir trust.', 'star'],
      ['Saaf kar doon? …Pehle backup, phir copies. Yaad hai!', 'sweat'],
      ['Main exceptions dhoondhta hoon. Faisla aapka.', 'heart'],
      ['Yahan sab aapke browser mein hai. Main bhi!', 'bang']
    ]
  });
})();
