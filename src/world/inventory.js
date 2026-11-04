/* Item management UI: POUCH (paged), ITEM BOX (weapon, store, take, combine, storage view), COMBINE.
   Combining from the pouch may fail (ingredients lost); from the box it never fails. */
import { CONFIG } from '../core/config.js';
import { G } from '../core/state.js';
import { BOX, saveBox } from '../core/save.js';
import { pouchCount, pouchAdd, pouchRemove, pouchRoom, pouchSlots, boxCount, boxAdd, boxRemove } from '../core/pouch.js';
import { WEAPONS } from '../data/weapons.js';
import { ITEMS, itemName, itemRar, isConsumable, stackOf } from '../data/items.js';
import { RECIPES, needOf } from '../data/recipes.js';
import { DATA, itemIcon } from '../art/index.js';
import { Audio8 } from '../audio/audio8.js';
import { say, choose } from '../ui/dialog.js';
import { addLog } from '../ui/fx.js';
import { showStorage } from '../quest/rewards.js';
import { curable, cureStatuses } from '../battle/status.js';

/** Save outside quests only (quest progress is saved on returning to town). */
const persist = () => { if (G.phase !== 'quest') saveBox(); };
const slotsLabel = () => `${BOX.pouch.length}/${pouchSlots()}`;
const descOf = id => ITEMS[id] ? ITEMS[id].desc : 'MATERIAL. COMBINE it, or store it in the ITEM BOX.';
const boxList = () => Object.keys(BOX.items).filter(id => BOX.items[id] > 0)
  .sort((a, b) => isConsumable(b) - isConsumable(a) || itemRar(b) - itemRar(a) || itemName(a).localeCompare(itemName(b)));

async function pickQty(title, max, verb) {
  if (max <= 1) return max;
  const i = await choose(title, [{ label: `${verb} 1` }, { label: `${verb} ALL`, right: 'x' + max }, { label: 'CANCEL' }]);
  return i === 0 ? 1 : i === 1 ? max : 0;
}

/** Paged pouch picker. Returns { id, page }, { extra: true, page }, or null when closed. */
async function pickFromPouch(title, page = 0, extra = null) {
  const size = CONFIG.POUCH_PAGE_SIZE, pages = CONFIG.POUCH_PAGES;
  while (true) {
    const slots = BOX.pouch.slice(page * size, page * size + size), opts = [];
    for (let i = 0; i < size; i++) {
      const s = slots[i];
      opts.push(s ? { icon: itemIcon(s.id), label: itemName(s.id), right: `x${s.n}`, desc: `${descOf(s.id)}<br>STACK ${s.n}/${stackOf(s.id)}` }
                  : { label: '- empty -', disabled: true, desc: '' });
    }
    opts.push({ label: `PAGE ${page + 1}/${pages} ▶`, desc: 'Show the next pouch page.' });
    if (extra) opts.push(extra);
    opts.push({ label: 'CLOSE', desc: '' });
    const i = await choose(`${title} · ${slotsLabel()}`, opts, { desc: true });
    if (i < 0 || i === opts.length - 1) return null;
    if (i === size) { page = (page + 1) % pages; continue; }
    if (extra && i === size + 1) return { extra: true, page };
    return { id: slots[i].id, page };
  }
}

/* ---------- Field POUCH ---------- */
export async function pouchMenu() {
  let page = 0;
  while (true) {
    const pick = await pickFromPouch('POUCH', page);
    if (!pick) return;
    page = pick.page;
    await useInField(pick.id);
  }
}

async function useInField(id) {
  const it = ITEMS[id], p = G.player;
  if (!it) { await say(`${itemName(id)} is a material.\nCOMBINE it, or store it in the ITEM BOX.`, 'dim'); return; }
  if (!it.field) { await say(`There's no target here.\nUse the ${it.name} in battle!`, 'dim'); return; }
  if (it.heal && p.hp >= p.maxHp) { await say("It won't have any effect.", 'dim'); return; }
  if (id === 'whetstone' && p.sharp >= CONFIG.SHARP_MAX) { await say('Your blade is already sharp.', 'dim'); return; }
  if ((id === 'nullberry' || id === 'antidote') && !curable(p, id)) { await say("It won't have any effect.", 'dim'); return; }
  pouchRemove(id); persist();
  if (it.heal) {
    const b = p.hp; p.hp = Math.min(p.maxHp, p.hp + it.heal);
    addLog(`[${id} +${p.hp - b} → HP ${p.hp}/${p.maxHp}]`, 'dim');
    Audio8.sfx('heal'); await say(`HUNTER used a ${it.name}.\nHP was restored!`, 'good');
  } else if (id === 'whetstone') {
    p.sharp = CONFIG.SHARP_MAX; Audio8.sfx('sharpen'); await say('HUNTER sharpened the blade.\nEDGE is back to GREEN!', 'good');
  } else if (id === 'might') {
    p.buffs.might = 3; Audio8.sfx('item'); await say('HUNTER ate a MIGHT SEED!\nATTACK rose!', 'good');
  } else {
    const c = cureStatuses(p, id); Audio8.sfx('heal'); await say(`HUNTER was cured of ${c.join(' & ')}!`, 'good');
  }
}

/* ---------- Red ITEM BOX (village + hub, shared storage) ---------- */
export async function itemBoxMenu() {
  Audio8.sfx('item');
  await say('HUNTER opened the ITEM BOX.');
  while (true) {
    const p = G.player;
    const i = await choose('ITEM BOX', [
      { icon: DATA['wpn_' + p.weapon], label: 'CHANGE WEAPON', right: WEAPONS[p.weapon].short },
      { label: 'STORE (POUCH → BOX)', right: slotsLabel() },
      { label: 'TAKE (BOX → POUCH)', right: Object.keys(BOX.items).length },
      { label: 'COMBINE', right: 'SURE' },
      { label: 'VIEW STORAGE' },
      { label: 'CLOSE' }]);
    if (i === 0) await weaponMenu();
    else if (i === 1) await storeMenu();
    else if (i === 2) await takeMenu();
    else if (i === 3) await craftMenu('box');
    else if (i === 4) await showStorage();
    else return;
  }
}

async function weaponMenu() {
  const p = G.player, keys = Object.keys(WEAPONS);
  const j = await choose('EQUIP WEAPON', keys.map(k => ({
    icon: DATA['wpn_' + k], label: WEAPONS[k].name, right: k === p.weapon ? 'E' : '', desc: WEAPONS[k].blurb })), { desc: true });
  if (j < 0) return;
  const k = keys[j];
  if (k === p.weapon) { await say('That weapon is already equipped.', 'dim'); return; }
  Object.assign(p, { weapon: k, charge: 0, spirit: 0 });
  BOX.weapon = k; saveBox();
  Audio8.sfx('sharpen');
  await say(`HUNTER equipped the ${WEAPONS[k].name}!`, 'good');
}

async function storeMenu() {
  let page = 0;
  const all = { label: 'STORE ALL MATERIALS', desc: 'Send every material in the POUCH to the ITEM BOX.' };
  while (true) {
    const pick = await pickFromPouch('STORE', page, all);
    if (!pick) return;
    page = pick.page;
    if (pick.extra) {
      const mats = BOX.pouch.filter(s => !isConsumable(s.id));
      if (!mats.length) { await say('There are no materials in the POUCH.', 'dim'); continue; }
      mats.forEach(s => { boxAdd(s.id, s.n); pouchRemove(s.id, s.n); });
      saveBox(); Audio8.sfx('item');
      await say('All materials were stored in the ITEM BOX.', 'good');
      continue;
    }
    const id = pick.id, n = await pickQty(`STORE ${itemName(id)}`, pouchCount(id), 'STORE');
    if (!n) continue;
    pouchRemove(id, n); boxAdd(id, n); saveBox(); Audio8.sfx('item');
    await say(`Stored ${itemName(id)} x${n} in the ITEM BOX.`, 'good');
  }
}

async function takeMenu() {
  while (true) {
    const ids = boxList();
    if (!ids.length) { await say('The ITEM BOX is empty.', 'dim'); return; }
    const opts = ids.map(id => ({ icon: itemIcon(id), label: itemName(id), right: `x${boxCount(id)}`,
      desc: `${descOf(id)}<br>IN POUCH ${pouchCount(id)}/${stackOf(id)}` }));
    opts.push({ label: 'DONE', desc: '' });
    const i = await choose(`TAKE · POUCH ${slotsLabel()}`, opts, { desc: true });
    if (i < 0 || i === ids.length) return;
    const id = ids[i], room = pouchRoom(id);
    if (room <= 0) { await say(pouchCount(id) ? `The POUCH can't hold more ${itemName(id)}!` : 'The POUCH is full!', 'bad'); continue; }
    const n = await pickQty(`TAKE ${itemName(id)}`, Math.min(room, boxCount(id)), 'TAKE');
    if (!n) continue;
    boxRemove(id, n); pouchAdd(id, n); saveBox(); Audio8.sfx('item');
    await say(`Took ${itemName(id)} x${n} into the POUCH.`, 'good');
  }
}

/* ---------- COMBINE ---------- */
/** Room for the result once the ingredients are used (an emptied ingredient slot frees up). */
function roomAfter(r) {
  const need = needOf(r);
  if (pouchCount(r.out)) return pouchRoom(r.out) + (need[r.out] || 0);
  const freed = Object.entries(need).filter(([id, n]) => pouchCount(id) === n).length;
  return BOX.pouch.length - freed < pouchSlots() ? stackOf(r.out) : 0;
}

/** source: 'pouch' (may fail, result to the pouch) or 'box' (never fails, result to the box). */
export async function craftMenu(source) {
  const fromBox = source === 'box', has = id => fromBox ? boxCount(id) : pouchCount(id);
  while (true) {
    const opts = RECIPES.map(r => {
      const need = needOf(r), ok = Object.entries(need).every(([id, n]) => has(id) >= n);
      return { icon: itemIcon(r.out), label: itemName(r.out), right: ok ? '' : 'NEED',
        desc: `${Object.entries(need).map(([id, n]) => `${itemName(id)}${n > 1 ? ' x' + n : ''} (have ${has(id)})`).join(' + ')}<br>`
            + (fromBox ? 'Combining at the ITEM BOX never fails.' : 'Field combining may FAIL. The ingredients are lost if it does!') };
    });
    opts.push({ label: 'DONE', desc: '' });
    const i = await choose(`COMBINE · ${fromBox ? 'ITEM BOX' : 'POUCH'}`, opts, { desc: true });
    if (i < 0 || i === RECIPES.length) return;
    await craft(RECIPES[i], fromBox);
  }
}

async function craft(r, fromBox) {
  const need = needOf(r), has = id => fromBox ? boxCount(id) : pouchCount(id);
  const missing = Object.keys(need).filter(id => has(id) < need[id]);
  if (missing.length) { await say(`Missing: ${missing.map(itemName).join(', ')}.`, 'dim'); return; }
  if (!fromBox && roomAfter(r) < r.n) { await say(`The POUCH can't hold more ${itemName(r.out)}!`, 'bad'); return; }
  for (const [id, n] of Object.entries(need)) fromBox ? boxRemove(id, n) : pouchRemove(id, n);
  const roll = Math.random(), ok = fromBox || roll < CONFIG.CRAFT_POUCH_SUCCESS;
  addLog(`[combine ${r.out} (${fromBox ? 'box: sure' : `pouch: roll ${(roll * 100).toFixed(1)} vs ${CONFIG.CRAFT_POUCH_SUCCESS * 100}%`}) → ${ok ? 'OK' : 'FAIL'}]`, 'dim');
  Audio8.sfx('carve');
  if (!ok) { persist(); Audio8.sfx('miss'); await say('The combination FAILED!\nThe ingredients were wasted...', 'bad'); return; }
  if (fromBox) boxAdd(r.out, r.n); else pouchAdd(r.out, r.n);
  persist(); Audio8.sfx('gather');
  await say(`Combined a ${itemName(r.out)}!${fromBox ? '\nIt was put in the ITEM BOX.' : ''}`, 'good');
}