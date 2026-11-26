/* Flying animations: reference copy of the prototype code (prototype-c2/app.js). NOT a drop-in module.
 *
 * What it needs from the host page (all of these exist in the prototype):
 *   $            document.querySelector shortcut
 *   reduced      matchMedia('(prefers-reduced-motion: reduce)').matches
 *   STEPS, SIDE_TRIP, current   the funnel order and the current screen id (used to stop the counter at the email
 *                and to lift it after a jump)
 *   go()/onEnter()  fxArrive(id) is called from onEnter, fxAward() when the payment award shows
 *   markup       <span id="fx-streak"> in the header, the classes .btn .btn2 .opt .linkish .wallet, ids used by the
 *                FX_MONEY and FX_CONFIRM selectors, #rv-shop for the store mock on the Reveal
 * Styles: flying-animations.reference.css. All numbers (counts, gravity, timings) are prototype values.
 * The "Jump to" menu toggle and the URL switch (?fx=off) are review tools; in the product use a feature flag if you want one.
 */
/* ---- flying reactions: approved (26 Nov), ON by default -------------------------------------------------------
   Small things fly in answer to what the person does, all over the flow: a tap throws coins, emoji and sparks from the
   right edge of the screen at the height of the tap, the big moments (the dream income answer, choosing a product,
   paying) throw a lot, confetti falls on two moments, and in the header a "🔥 xN" chip counts the answers next to a
   shorter progress bar. The mechanics are the competitor's (sellproducts.ai): one full-screen canvas, particles with
   gravity. The numbers below are prototype values, not product values.
   Off for a viewer: the "Jump to" menu, or ?fx=off in the link (kept in this browser; ?fx=on turns it back on).
   Nothing here runs with prefers-reduced-motion. A reference copy of this block is in handoff/flying-animations/. */
const FX_KEY = 'zs-fx';
let FX = true;
(function(){
  const q = new URLSearchParams(location.search).get('fx');
  try { if (q === 'on' || q === 'off') localStorage.setItem(FX_KEY, q); FX = localStorage.getItem(FX_KEY) !== 'off'; }
  catch (e) { FX = q !== 'off'; }
  document.documentElement.toggleAttribute('data-fx', FX);
})();
function fxSet(on){
  FX = on; document.documentElement.toggleAttribute('data-fx', on);
  try { localStorage.setItem(FX_KEY, on ? 'on' : 'off'); } catch (e) {}
}
const fxOn = () => FX && !reduced;

/* ---- how the competitor does it (sellproducts.ai, read from its page) --------------------------------------------
   One full-screen canvas. A tap throws pieces from the spot it was made: they go up, gravity pulls them down, they fade.
   Coins are gold discs with a "$" that squash as they turn; sparks are short lines; emoji are the answer's own.
   Each question has its own effect (goal: sparks, experience: its emoji, time: a flash and sparks, supplier: an emoji, dream
   income: the coin cannon). In the header a "🔥 xN" chip appears after the first answer and counts the answers, next to a
   short progress bar. Nothing here is mine: the numbers (26 coins, 22 sparks, gravity .42/.12/.32) are theirs. */
const FX_DPR = Math.min(window.devicePixelRatio || 1, 2);
let fxCv = null, fxCtx = null, fxParts = [], fxRun = false;
const fxCache = {};
function fxCanvas(){
  if (fxCv) return;
  fxCv = document.createElement('canvas'); fxCv.id = 'fx-canvas'; fxCv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(fxCv); fxCtx = fxCv.getContext('2d');
  const fit = () => { fxCv.width = innerWidth * FX_DPR; fxCv.height = innerHeight * FX_DPR; fxCtx.setTransform(FX_DPR, 0, 0, FX_DPR, 0, 0); };
  fit(); addEventListener('resize', fit);
}
function fxSprite(key, size, draw){
  if (fxCache[key]) return fxCache[key];
  const c = document.createElement('canvas'), px = Math.max(2, Math.ceil(size * FX_DPR)); c.width = c.height = px;
  const g = c.getContext('2d'); g.setTransform(FX_DPR, 0, 0, FX_DPR, 0, 0); draw(g, size);
  return (fxCache[key] = c);
}
function fxCoin(r){
  const R = Math.max(4, Math.round(r));
  return fxSprite('coin' + R, R * 2 + 4, (g, sz) => {
    const c = sz / 2, gr = g.createRadialGradient(c - R * .3, c - R * .3, 1, c, c, R);
    gr.addColorStop(0, '#FFE9A3'); gr.addColorStop(.55, '#FFD35C'); gr.addColorStop(1, '#C77E06');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8A5A04'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = '#8A5A04'; g.font = 'bold ' + (R * 1.1) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', c, c + 1);
  });
}
function fxEmoji(ch, size){
  const S = Math.max(8, Math.round(size));
  return fxSprite('em' + ch + S, Math.ceil(S * 1.5), (g, sz) => { g.font = S + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, sz / 2, sz / 2 + 1); });
}
/* The pieces leave from the right edge of the screen (of the column, on a desktop, where there is room beside it) and the tap
   only decides how high they start, so they never cover the text and the buttons. The big moments throw from the middle. */
function fxLane(){
  const sc = document.querySelector('.screen[data-on]') || document.body, r = sc.getBoundingClientRect();
  const right = Math.min(r.right, innerWidth);
  return innerWidth - right >= 90 ? { x: right + 40, out: true } : { x: right - 10, out: false };
}
function fxSpawn(n, make){ if (!fxOn()) return; fxCanvas(); for (let i = 0; i < n; i++) fxParts.push(make(i)); fxLoop(); }
function fxLoop(){
  if (fxRun) return; fxRun = true;
  (function frame(){
    fxCtx.clearRect(0, 0, innerWidth, innerHeight);
    fxParts = fxParts.filter(p => p.life > 0 && p.y < innerHeight + 60);
    for (const p of fxParts){
      p.x += p.vx; p.y += p.vy; p.vy += p.g; if (p.drag) p.vx *= p.drag; p.rot += (p.vr || 0); p.life -= p.decay;
      fxCtx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
      if (p.type === 'coin'){
        fxCtx.save(); fxCtx.translate(p.x, p.y); fxCtx.rotate(p.rot);
        fxCtx.scale(Math.abs(Math.cos(p.rot * 2)) * .65 + .35, 1);
        const sp = fxCoin(p.r), w = sp.width / FX_DPR; fxCtx.drawImage(sp, -w / 2, -w / 2, w, w); fxCtx.restore();
      } else if (p.type === 'rect'){
        fxCtx.save(); fxCtx.translate(p.x, p.y); fxCtx.rotate(p.rot); fxCtx.fillStyle = p.color; fxCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); fxCtx.restore();
      } else if (p.type === 'spark'){
        fxCtx.strokeStyle = p.color; fxCtx.lineWidth = 2.2; fxCtx.lineCap = 'round';
        fxCtx.beginPath(); fxCtx.moveTo(p.x, p.y);
        const m = Math.hypot(p.vx, p.vy) || 1; fxCtx.lineTo(p.x - p.vx / m * p.len, p.y - p.vy / m * p.len); fxCtx.stroke();
      } else {
        fxCtx.save(); fxCtx.translate(p.x, p.y); fxCtx.rotate(p.rot);
        const sp = fxEmoji(p.ch, p.size), w = sp.width / FX_DPR; fxCtx.drawImage(sp, -w / 2, -w / 2, w, w); fxCtx.restore();
      }
    }
    fxCtx.globalAlpha = 1;
    if (fxParts.length) requestAnimationFrame(frame); else { fxRun = false; fxCtx.clearRect(0, 0, innerWidth, innerHeight); }
  })();
}
/* sideways speed: from the middle it goes both ways like theirs; from the right edge it goes inwards a little and is slowed by drag */
function fxSide(center, wide){ return center ? (Math.random() - .5) * wide : (fxLane().out ? (Math.random() - .5) * wide * .6 : -(.6 + Math.random() * 2.4)); }
function fxFrom(x, center){ return center ? x : fxLane().x; }
/* the cannon throws a mix, not only coins: coins, money, gems, stars, rockets, fire */
const FX_MIX = ['💸', '🤑', '💎', '🚀', '⭐', '✨', '🔥', '💰', '🏆', '🎉'];
function fxCoinCannon(x, y, center = false, n = 44){
  const ox = fxFrom(x, center);
  fxSpawn(n, i => {
    const base = { x: ox, y, vx: fxSide(center, 11), vy: -Math.random() * 14 - 5, drag: center ? 0 : .97, rot: Math.random() * Math.PI, life: 1 };
    if (i % 3 === 0) return { ...base, type: 'coin', g: .42, r: 7 + Math.random() * 7, vr: (Math.random() - .5) * .5, decay: .007 };
    return { ...base, type: 'emoji', ch: FX_MIX[Math.floor(Math.random() * FX_MIX.length)], g: .36, size: 16 + Math.random() * 14,
      rot: (Math.random() - .5) * .8, vr: (Math.random() - .5) * .25, decay: .008 };
  });
}
function fxSparks(x, y, color, center = false, n = 34){
  const ox = fxFrom(x, center);
  fxSpawn(n, () => { const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
    const vx = center ? Math.cos(a) * sp : (fxLane().out ? Math.cos(a) * sp : -Math.abs(Math.cos(a)) * sp * .5);
    return { type: 'spark', x: ox, y, vx, vy: Math.sin(a) * sp, g: .12, len: 6 + Math.random() * 10, color, life: 1, decay: .03 + Math.random() * .02 }; });
}
function fxEmojiBurst(ch, x, y, n = 10, center = false){
  const ox = fxFrom(x, center);
  fxSpawn(n, () => ({ type: 'emoji', ch, x: ox, y, vx: fxSide(center, 10), vy: -Math.random() * 11 - 3, g: .32, drag: center ? 0 : .97,
    size: 18 + Math.random() * 16, rot: (Math.random() - .5) * .8, vr: (Math.random() - .5) * .2, life: 1, decay: .012 }));
}
/* confetti: two volleys, from the left and the right edge, up and inwards, then gravity */
const FX_CONF = ['#00D5BD', '#34FFD6', '#FFD35C', '#FF9B91', '#8EC5FF', '#FFFFFF'];
function fxConfetti(n = 90){
  fxSpawn(n, i => {
    const left = i % 2 === 0;
    return { type: 'rect', x: left ? -6 : innerWidth + 6, y: innerHeight * (.5 + Math.random() * .2),
      vx: (left ? 1 : -1) * (3 + Math.random() * 8), vy: -(10 + Math.random() * 11), g: .34, drag: .985,
      w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, rot: Math.random() * Math.PI, vr: (Math.random() - .5) * .4,
      color: FX_CONF[Math.floor(Math.random() * FX_CONF.length)], life: 1, decay: .006 + Math.random() * .006 };
  });
}
function fxFlash(){
  if (!fxOn()) return;
  let f = $('#fx-flash'); if (!f){ f = document.createElement('div'); f.id = 'fx-flash'; f.setAttribute('aria-hidden', 'true'); document.body.appendChild(f); }
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
/* the streak chip in the header: "🔥 xN", hidden until the first answer, then it pops with every answer */
let fxStreak = 0;
/* The competitor's chip counts the answers and then stands still; ours counts through the quiz, the picks and the choice, and stops at the email. */
const fxCounting = () => STEPS.indexOf(SIDE_TRIP[current] || current) < STEPS.indexOf('s-email');
function fxBumpStreak(){
  if (!fxOn() || !fxCounting()) return;
  const s = $('#fx-streak'); if (!s) return;
  fxStreak++; s.querySelector('b').textContent = 'x' + fxStreak;
  s.classList.add('on'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
}
const FX_MINT = '#00D5BD', FX_GREEN = '#34FFD6';
/* where money is named or the person confirms something, the reaction is the loudest; the first questions stay light */
const FX_MONEY = '#rv-cta, #pay-go, .wallet, #trial-go, #ed-go, #ads-go, #cc-go, #shop-go, #claimerr-go, #trialerr-go';
const FX_CONFIRM = '#shop-done, #trial-done, #ads-done, #fb-go';
/* The picks: Next is a small reaction, choosing is the big one (as on the competitor's page: they throw confetti and a coin
   cannon on the choice, and a single gold spark when the card is swapped). Called from flyOut, so a swipe does the same. */
function fxDeckAct(dir){
  if (!fxOn()) return;
  const r = $('#deck-' + (dir === 'left' ? 'next' : 'pick')).getBoundingClientRect(), x = r.left + r.width / 2, y = r.top;
  if (dir === 'left'){ fxSparks(x, y, '#FFD35C', false, 12); return; }
  fxCoinCannon(x, y, false, 80); fxConfetti(90); fxSparks(x, y, FX_MINT, false, 40); fxFlash(); fxBumpStreak();
}
function fxNextIn(){
  const c = $('#pcard'); if (!fxOn() || !c) return;
  c.animate([{ opacity: 0, transform: 'translateX(72%) rotate(6deg) scale(.94)' }, { opacity: 1, transform: 'none' }],
            { duration: 420, easing: 'cubic-bezier(.34,1.4,.64,1)' });
}
/* the taps that matter: answers, main buttons, the second buttons, links that move on */
document.addEventListener('click', e => {
  if (!fxOn()) return;
  if (e.target.closest('.jump, #jump-btn, [data-back], #mute, .sheet-x, [data-close], .lk-pause')) return;
  const el = e.target.closest('.opt, .btn, .btn2, .linkish, .wallet, #deck-next');
  if (!el || el.disabled) return;
  if (el.matches('#deck-next, #deck-pick')) return;   /* the picks have their own reactions (fxDeckAct) */
  const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const key = (el.closest('[data-key]') || {}).dataset ? el.closest('[data-key]').dataset.key : '';
  if (el.matches('.opt') && key){
    const emoji = el.dataset.emoji || '✨';
    /* the first questions stay light: a short puff of sparks or a few emoji. The coins are kept for the last one. */
    ({ goal: () => fxSparks(x, y, FX_MINT, false, 14), exp: () => fxEmojiBurst(emoji, x, y, 7),
       time: () => { fxFlash(); fxSparks(x, y, FX_GREEN, false, 14); }, ds: () => fxEmojiBurst('🧠', x, y, 7),
       rev: () => { fxCoinCannon(x, y, false, 80); fxSparks(x, y, FX_GREEN, false, 40); fxFlash(); } }[key] || (() => fxSparks(x, y, FX_MINT, false, 14)))();
    fxBumpStreak();
  } else if (el.matches('.opt')){ fxSparks(x, y, FX_MINT, false, 14); fxBumpStreak(); }
  else if (el.matches(FX_MONEY)){ fxCoinCannon(x, y, false, 72); fxSparks(x, y, FX_MINT, false, 44); fxFlash(); fxBumpStreak(); }
  else if (el.matches(FX_CONFIRM)){ fxCoinCannon(x, y, false, 36); fxSparks(x, y, FX_GREEN, false, 30); fxBumpStreak(); }
  else if (el.closest('#s-landing')){ fxCoinCannon(x, y); fxFlash(); }   /* the first screen: only the burst on the button, no background icons */
  else if (el.matches('.btn')){ fxSparks(x, y, FX_MINT); fxCoinCannon(x, y, false, 16); fxBumpStreak(); }
  else { fxSparks(x, y, FX_MINT, false, 22); fxCoinCannon(x, y, false, 6); }
}, true);
/* the big moments */
function fxAward(){ fxCoinCannon(innerWidth / 2, innerHeight * .55, true, 70); fxConfetti(110); fxFlash(); }
/* The streak counts the taps made on this page, so a jump straight to a later screen (the Jump to menu, a link with ?screen=)
   would start it from zero. Each screen therefore lifts it to the number of counted steps before it; in a normal run the
   two numbers are the same, so nothing changes there. */
const FX_COUNTED = ['s-q1', 's-q2', 's-q3', 's-q4', 's-q5', 's-reality', 's-blueprint', 's-deck'];
function fxFloor(id){
  const at = STEPS.indexOf(SIDE_TRIP[id] || id); if (at < 0) return;
  const n = FX_COUNTED.filter(c => STEPS.indexOf(c) < at).length;
  if (n <= fxStreak) return;
  fxStreak = n;
  const c = $('#fx-streak'); if (!c) return;
  c.querySelector('b').textContent = 'x' + n; c.classList.add('on');
}
function fxArrive(id){
  if (!fxOn()) return;
  fxFloor(id);
  if (id === 's-deck'){ setTimeout(() => fxConfetti(60), 250); }
  else if (id === 's-reveal'){
    const shop = $('#rv-shop'); if (shop){ shop.classList.remove('fx-in'); void shop.offsetWidth; shop.classList.add('fx-in'); }
    setTimeout(() => { fxCoinCannon(innerWidth / 2, innerHeight * .62, true); fxFlash(); }, 350);
  }
}
