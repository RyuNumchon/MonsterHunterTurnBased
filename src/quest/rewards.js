/* Quest rewards (Monster Hunter style) and the Item Box storage screen.
   SLAY     : 4 main rewards + break rewards + 3 carves + gathered
   CAPTURE  : 5 main rewards + 3 capture-bonus rolls (rarer) + breaks + gathered, money ×1.2
   MONEY    : base × (1 − carts / 3)
   FAIL / ABANDON : nothing (gathered items are lost too) */
import { CONFIG } from '../core/config.js';
import { $, weighted, Abort } from '../core/utils.js';
import { G, waits } from '../core/state.js';
import { BOX, saveBox } from '../core/save.js';
import { LOOT, MONSTERS } from '../data/monsters.js';
import { itemName, itemRar, isConsumable } from '../data/items.js';
import { itemIcon, pimg } from '../art/index.js';
import { Audio8 } from '../audio/audio8.js';
import { pause } from '../ui/dialog.js';
import { addLog, setPhase } from '../ui/fx.js';
import { resetMini } from '../ui/map.js';
import { boxAdd } from '../core/pouch.js';

/** Ends the hunt. State is set synchronously, so callers may fire-and-forget this. */
export async function finishQuest(outcome) {
  const p = G.player;
  const win = outcome === 'slay' || outcome === 'capture';
  const sections = [];
  let zenny = 0, base = 0;
  if (win) {
    const multi = G.hunted.length > 1;
    for (const h of (outcome === 'slay' || outcome === 'capture') ? G.hunted : []) {
      const m = h.m, key = m.key, o = h.outcome;
      const L = LOOT[key], cap = o === 'capture';
      const roll = (t, n) => Array.from({ length: n }, () => weighted(t));
      const pfx = multi ? `${m.name} · ` : '';

      sections.push({ title: pfx + 'MAIN REWARDS', items: roll(L.reward, cap ? CONFIG.CAPTURE_MAIN_REWARDS : CONFIG.MAIN_REWARDS) });
      if (cap) sections.push({ title: pfx + 'CAPTURE BONUS', bonus: true, items: roll(L.capture, CONFIG.CAPTURE_BONUS) });
      const broken = Object.keys(m.parts).filter(k => m.parts[k].broken);
      if (broken.length) sections.push({ title: pfx + 'BREAK REWARDS', items: broken.map(k => weighted(L.breaks[k])) });
      
      base += Math.round(L.zenny * (cap ? CONFIG.CAPTURE_ZENNY_MULT : 1));
    }
    zenny = Math.round(base * (1 - p.carts / CONFIG.MAX_CARTS));
  } else {
    Audio8.music('fail');
  }

  G.over = true; G.outcome = outcome; G.boxed = false;
  G.rewards = { sections, zenny, base };
  setPhase(0); resetMini();

  const tr = $('trans');
  try {
    tr.className = 'fadeIn'; await pause(350);
    renderRewards(); $('rewardOv').classList.remove('hidden');
    tr.className = 'fadeOut'; await pause(300);
  } catch (e) { if (!(e instanceof Abort)) throw e; }
  tr.className = '';
}

export function slotHtml(id, n, delay) {
  return `<div class="slot r${itemRar(id)}" style="animation-delay:${delay.toFixed(2)}s">${pimg(itemIcon(id), 'pi big')}
    <span class="iname">${itemName(id)}</span><small>x${n}</small></div>`;
}

export function renderRewards() {
  const R = G.rewards, o = G.outcome, m = G.monster, p = G.player, win = o === 'slay' || o === 'capture';
  const heads = { slay: 'QUEST COMPLETE!', capture: 'CAPTURE COMPLETE!', fail: 'QUEST FAILED', abandon: 'QUEST ABANDONED' };
  let body = '', delay = 0;
  if (win) {
    R.sections.forEach(s => {
      const agg = {};
      s.items.forEach(it => { (agg[it.name] = agg[it.name] || { rar: it.rar, n: 0 }).n++; });
      body += `<div class="rsec ${s.bonus ? 'bonus' : ''}"><h4>${s.bonus ? '★ ' : ''}${s.title}</h4><div class="rgrid">${
        Object.entries(agg).map(([n, v]) => slotHtml(n, v.n, delay += .07)).join('')}</div></div>`;
    });
    const notes = [];
    if (o === 'capture') notes.push('capture x1.2');
    if (p.carts) notes.push(`-${p.carts}/${CONFIG.MAX_CARTS} for carts`);
    addLog(`[reward money: base ${R.base}z${o === 'capture' ? ' (capture x1.2)' : ''} · carts -${p.carts}/${CONFIG.MAX_CARTS} → ${R.zenny}z]`, 'dim');
    body += `<div class="zen">REWARD MONEY: ${R.zenny}z <small>(base ${R.base}z${notes.length ? ' · ' + notes.join(' · ') : ''})</small></div>`;
  } else {
    body = `<p class="ftxt">${o === 'fail'
      ? 'HUNTER fainted 3 times.<br>Reward reduced to 0z.'
      : 'HUNTER returned to the village empty-handed.'}</p>`;
  }
  const btns = win && !G.boxed
    ? `<button class="rbtn big" data-act="putall">PUT ALL IN BOX</button>`
    : `${G.boxed ? `<div class="boxed">✓ Everything was stored in your ITEM BOX!<br>Wallet: ${BOX.zenny}z</div>` : ''}
       <button class="rbtn big" data-act="village">RETURN TO VILLAGE</button>`;
  $('rewardOv').innerHTML = `
    <div class="rhead ${win ? '' : 'fail'}"><h3>${heads[o]}</h3>
      <span>${(G.hunted.length ? G.hunted.map(h => h.m.name) : [m.name]).join(' + ')} · ${G.turn} turns · CARTS ${p.carts}/${CONFIG.MAX_CARTS}</span></div>
    <div class="rbody">${body}</div>
    <div class="rbtns">${btns}</div>`;
}

export function putAllInBox() {
  if (!G || !G.rewards || G.boxed) return;
  G.rewards.sections.forEach(s => s.items.forEach(it => boxAdd(it.name, 1)));
  BOX.zenny += G.rewards.zenny; BOX.hunts++;
  saveBox();
  G.boxed = true;
  Audio8.sfx('buy');
  renderRewards();
}

/* ---------- Item Box storage (opened from the red box at camp) ---------- */
export function renderStorage() {
  const items = Object.entries(BOX.items)
    .sort((a, b) => isConsumable(b[0]) - isConsumable(a[0]) || itemRar(b[0]) - itemRar(a[0]) || itemName(a[0]).localeCompare(itemName(b[0])));
  $('rewardOv').innerHTML = `
    <div class="rhead"><h3>ITEM BOX</h3><span>WALLET ${BOX.zenny}z · HUNTS CLEARED ${BOX.hunts}</span></div>
    <div class="rbody">${items.length
      ? `<div class="rgrid">${items.map(([id, c], i) => slotHtml(id, c, i * .03))}</div>`
      : '<p class="ftxt">The box is empty. Go hunt something!</p>'}</div>
    <div class="rbtns"><button class="rbtn" data-act="closebox">CLOSE</button></div>`;
}

/** Opens storage and resolves when closed (see closeStorage in ui/dialog.js). */
export function showStorage() {
  const g = G;
  renderStorage(); $('rewardOv').classList.remove('hidden');
  return new Promise(res => { waits.store = res; }).then(() => {
    $('rewardOv').classList.add('hidden');
    if (G !== g) throw new Abort();
  });
}