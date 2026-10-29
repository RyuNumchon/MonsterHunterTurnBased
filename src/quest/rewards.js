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
import { ITEM_RAR } from '../data/items.js';
import { matIcon, pimg } from '../art/index.js';
import { Audio8 } from '../audio/audio8.js';
import { pause } from '../ui/dialog.js';
import { setPhase } from '../ui/fx.js';
import { resetMini } from '../ui/map.js';

/** Ends the hunt. State is set synchronously, so callers may fire-and-forget this. */
export async function finishQuest(outcome) {
  const m = G.monster, L = LOOT[G.monsterKey], p = G.player;
  const win = outcome === 'slay' || outcome === 'capture', cap = outcome === 'capture';
  const sections = [];
  let zenny = 0, base = 0;
  if (win) {
    const roll = (t, n) => Array.from({ length: n }, () => weighted(t));
    sections.push({ title: 'MAIN REWARDS', items: roll(L.reward, cap ? CONFIG.CAPTURE_MAIN_REWARDS : CONFIG.MAIN_REWARDS) });
    if (cap) sections.push({ title: 'CAPTURE BONUS', bonus: true, items: roll(L.capture, CONFIG.CAPTURE_BONUS) });
    const broken = Object.keys(m.parts).filter(k => m.parts[k].broken);
    if (broken.length) sections.push({ title: 'BREAK REWARDS', items: broken.map(k => weighted(L.breaks[k])) });
    if (G.carves.length) sections.push({ title: 'CARVES', items: G.carves });
    const gath = Object.entries(G.gathered).flatMap(([n, c]) => Array.from({ length: c }, () => ({ name: n, rar: ITEM_RAR[n] || 1 })));
    if (gath.length) sections.push({ title: 'GATHERED & SMALL MONSTER CARVES', items: gath });
    base = Math.round(L.zenny * (cap ? CONFIG.CAPTURE_ZENNY_MULT : 1));
    zenny = Math.round(base * (1 - p.carts / CONFIG.MAX_CARTS));
  } else Audio8.music('fail');

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

export function slotHtml(name, rar, n, delay) {
  return `<div class="slot r${rar}" style="animation-delay:${delay.toFixed(2)}s">${pimg(matIcon(name, rar), 'pi big')}
    <span class="iname">${name}</span><small>x${n}</small></div>`;
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
        Object.entries(agg).map(([n, v]) => slotHtml(n, v.rar, v.n, delay += .07)).join('')}</div></div>`;
    });
    const notes = [];
    if (o === 'capture') notes.push('capture x1.2');
    if (p.carts) notes.push(`-${p.carts}/${CONFIG.MAX_CARTS} for carts`);
    body += `<div class="zen">REWARD MONEY: ${R.zenny}z <small>(base ${R.base}z${notes.length ? ' · ' + notes.join(' · ') : ''})</small></div>`;
  } else {
    body = `<p class="ftxt">${o === 'fail'
      ? 'HUNTER fainted 3 times.<br>The Guild pays nothing, and everything gathered was lost.'
      : 'HUNTER returned to the village empty-handed.'}</p>`;
  }
  const otherKey = G.monsterKey === 'rathalos' ? 'tigrex' : 'rathalos';
  const btns = win && !G.boxed
    ? `<button class="rbtn big" data-act="putall">PUT ALL IN BOX</button>`
    : `${G.boxed ? `<div class="boxed">✓ Everything was stored in your ITEM BOX!<br>Wallet: ${BOX.zenny}z</div>` : ''}
       <button class="rbtn" data-act="rematch">REMATCH: ${m.name}</button>
       <button class="rbtn alt" data-act="hunt" data-val="${otherKey}">NEW QUEST: ${MONSTERS[otherKey].name}</button>`;
  $('rewardOv').innerHTML = `
    <div class="rhead ${win ? '' : 'fail'}"><h3>${heads[o]}</h3>
      <span>${m.name} · ${G.turn} turns · CARTS ${p.carts}/${CONFIG.MAX_CARTS}</span></div>
    <div class="rbody">${body}</div>
    <div class="rbtns">${btns}</div>`;
}

export function putAllInBox() {
  if (!G || !G.rewards || G.boxed) return;
  G.rewards.sections.forEach(s => s.items.forEach(it => { BOX.items[it.name] = (BOX.items[it.name] || 0) + 1; }));
  BOX.zenny += G.rewards.zenny; BOX.hunts++;
  saveBox();
  G.boxed = true;
  Audio8.sfx('buy');
  renderRewards();
}

/* ---------- Item Box storage (opened from the red box at camp) ---------- */
export function renderStorage() {
  const items = Object.entries(BOX.items)
    .sort((a, b) => (ITEM_RAR[b[0]] || 1) - (ITEM_RAR[a[0]] || 1) || a[0].localeCompare(b[0]));
  $('rewardOv').innerHTML = `
    <div class="rhead"><h3>ITEM BOX</h3><span>WALLET ${BOX.zenny}z · HUNTS CLEARED ${BOX.hunts}</span></div>
    <div class="rbody">${items.length
      ? `<div class="rgrid">${items.map(([n, c], i) => slotHtml(n, ITEM_RAR[n] || 1, c, i * .03)).join('')}</div>`
      : '<p class="ftxt">The box is empty. Go hunt something!</p>'}</div>
    <div class="rbtns"><button class="rbtn" data-act="closebox">CLOSE</button><button class="rbtn alt" data-act="wipebox">RESET SAVE</button></div>`;
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