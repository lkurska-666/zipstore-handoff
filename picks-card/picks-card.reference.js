/* Picks card: how the card moves on Next and on choosing. Reference copy of the prototype code (prototype-c2/app.js).
 * Not a drop-in module. It needs: the card #pcard inside .deck-stage, renderCard() (draws the next product), deckIdx,
 * go(MAIL) (the email step), Sound, and the reduced-motion flag.
 * Next: the old card leaves to the left as a copy and the next one comes in from the right at once, so the stage is never empty.
 * Choose: the card comes forward, then fades out and the email step opens.
 * The bursts of coins, confetti and sparks (fxDeckAct) belong to the flying animations task, not to this one.
 */
function flyOut(dir){
  const card = $('#pcard');
  const stage = $('.deck-stage');
  const act = () => {
    if (dir === 'left'){ deckIdx++; renderCard(); fxNextIn(); }
    else go(MAIL);
  };
  if (reduced){ act(); return; }
  fxDeckAct(dir);

  if (dir === 'left'){
    /* Next: the card leaves to the left as a copy and the next one comes in from the right at once. The two overlap,
       so the stage is never empty (it used to be: the old card was gone, then a pause, then the new one arrived). */
    const g = card.cloneNode(true);
    g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    const r = card.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    g.style.cssText += ';position:absolute;left:' + (r.left - sr.left) + 'px;top:' + (r.top - sr.top) + 'px;width:' + r.width +
      'px;height:' + r.height + 'px;margin:0;z-index:2;pointer-events:none';
    const no = g.querySelector('.verdict.no'); if (no) no.style.opacity = '1';
    stage.appendChild(g);
    const from = card.style.transform || 'none';
    g.animate([{ transform: from, opacity: 1 }, { transform: 'translateX(-130%) rotate(-12deg)', opacity: 0 }],
              { duration: 300, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' }).onfinish = () => g.remove();
    Sound.whoosh();
    act();
    return;
  }

  const stamp = $('#v-yes');
  if (stamp) stamp.style.opacity = '1';
  card.classList.add('settle');

  /* taken: it comes forward, the pile behind it clears out, and only then
     does it hand over to the screen that carries the same product */
  stage.classList.add('taken');
  card.style.transform = 'scale(1.04)';
  Sound.pop(1.15);
  setTimeout(() => {
    card.style.transform = 'scale(.96)';
    card.style.opacity = '0';
  }, 200);
  /* the pile stays gone until the deck is rebuilt — putting it back here
     made it blink into view just as the screen was fading out */
  setTimeout(act, 400);
}

function nextCardIn(){
  const c = $('#pcard'); if (reduced || !c) return;
  c.animate([{ opacity: 0, transform: 'translateX(72%) rotate(6deg) scale(.94)' }, { opacity: 1, transform: 'none' }],
            { duration: 380, easing: 'cubic-bezier(.34,1.4,.64,1)' });
}
