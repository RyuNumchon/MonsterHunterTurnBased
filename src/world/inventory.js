/* Item management UI: POUCH (paged with ◀▶ / A D), ITEM BOX (weapon, store, take, combine, storage),
   COMBINE, and obtain() for gathering/carving with the full-pouch DISCARD / SWAP choice. */
import { CONFIG } from '../core/config.js';
import { G } from '../core/state.js';
import { BOX, saveBox } from '../core/save.js';
import { pouchCount, pouchAdd, pouchRemove, pouchRoom, pouchSlots, boxCount, boxAdd, boxRemove } from '../core/pouch.js';
import { weaponStats, WEAPONS } from '../data/weapons.js';
import { ITEMS, itemName, itemRar, isConsumable, stackOf } from '../data/items.js';
import { RECIPES, needOf } from '../data/recipes.js';
import { DATA, itemIcon } from '../art/index.js';
import { Audio8 } from '../audio/audio8.js';
import { say, ask, choose, askCount, MENU_PREV, MENU_NEXT } from '../ui/dialog.js';
import { addLog } from '../ui/fx.js';
import { showStorage } from '../quest/rewards.js';
import { curable, cureStatuses } from '../battle/status.js';
import { ARMOR, ARMOR_SLOTS, SLOT_NAME, armorStats } from '../data/armor.js';
import { equipWeapon, equipArmor, hunterDef, skillSummary } from '../core/gear.js';

/** Save outside quests only (quest progress is saved on returning to town). */
const persist = () => { if (G.phase !== 'quest') saveBox(); };
const slotsLabel = () => `${BOX.pouch.length}/${pouchSlots()}`;
const descOf = id => ITEMS[id] ? ITEMS[id].desc : 'MATERIAL. COMBINE it, or store it in the ITEM BOX.';
const boxList = () => Object.keys(BOX.items).filter(id => BOX.items[id] > 0)
  .sort((a, b) => isConsumable(b) - isConsumable(a) || itemRar(b) - itemRar(a) || itemName(a).localeCompare(itemName(b)));

/** Paged pouch picker (◀▶ / A D change page). Returns { id, page }, { extra: true, page }, or null when closed. */
export async function pickFromPouch(title, page = 0, extra = null) {
  const size = CONFIG.POUCH_PAGE_SIZE, pages = CONFIG.POUCH_PAGES;
  while (true) {
    const slots = BOX.pouch.slice(page * size, page * size + size), opts = [];
    for (let i = 0; i < size; i++) {
      const s = slots[i];
      opts.push(s ? { icon: itemIcon(s.id), label: itemName(s.id), right: `x${s.n}`, desc: `${descOf(s.id)}<br>STACK ${s.n}/${stackOf(s.id)}` }
                  : { label: '- empty -', disabled: true, desc: '' });
    }
    if (extra) opts.push(extra);
    opts.push({ label: 'CLOSE', desc: '' });
    const i = await choose(`${title} ${page + 1}/${pages} · ${slotsLabel()}`, opts, { desc: true, paged: true });
    if (i === MENU_PREV || i === MENU_NEXT) { page = (page + (i === MENU_NEXT ? 1 : -1) + pages) % pages; continue; }
    if (i < 0 || i === opts.length - 1) return null;
    if (extra && i === size) return { extra: true, page };
    return { id: slots[i].id, page };
  }
}

/* ---------- Gathering / carving into the pouch ---------- */
/** Puts one `id` in the pouch. `got` is the found message. Full pouch -> DISCARD or SWAP (discards a whole stack).
    Returns true if the item was kept. */
export async function obtain(id, got, prefix = '') {
  const name = itemName(id);
  if (pouchAdd(id)) { persist(); await say(`${prefix}${got}\n(POUCH x${pouchCount(id)})`, 'good'); return true; }
  if (pouchCount(id)) { await say(`${prefix}${got}\n...but the ${name} stack is full! It was left behind.`, 'bad'); return false; }
  await say(`${prefix}${got}\n...but the POUCH is full!`, 'warn');
  while (true) {
    const i = await choose(`POUCH FULL · ${name}`, [
      { label: `DISCARD ${name}`, desc: 'Leave the new item behind.' },
      { label: 'SWAP', desc: 'Throw away a whole stack from the POUCH to make room.' }], { desc: true, cancel: false });
    if (i === 0) { await say(`HUNTER left the ${name} behind.`, 'dim'); return false; }
    const pick = await pickFromPouch(`DISCARD FOR ${name}`);
    if (!pick) continue;
    const old = pick.id, n = pouchCount(old);
    if (!(await ask(`Discard ALL ${itemName(old)} x${n}\nto make room for the ${name}?`))) continue;
    pouchRemove(old, n); pouchAdd(id); persist();
    Audio8.sfx('item');
    await say(`Discarded ${itemName(old)} x${n}.\nHUNTER kept the ${name}!`, 'good');
    return true;
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
  if (['nullberry', 'antidote', 'deodorant'].includes(id) && !curable(p, id)) { await say("It won't have any effect.", 'dim'); return; }
  pouchRemove(id); persist();
  if (it.heal) {
    const b = p.hp; p.hp = Math.min(p.maxHp, p.hp + it.heal);
    addLog(`[${id} +${p.hp - b} → HP ${p.hp}/${p.maxHp}]`, 'dim');
    Audio8.sfx('heal'); await say(`HUNTER used a ${it.name}.\nHP was restored!`, 'good');
    } else if (id === 'whetstone') {
    const b = p.sharp; p.sharp = Math.min(CONFIG.SHARP_MAX, p.sharp + CONFIG.WHETSTONE_SHARP);
    addLog(`[whetstone +${p.sharp - b} → EDGE ${p.sharp}/${CONFIG.SHARP_MAX}]`, 'dim');
    Audio8.sfx('sharpen'); await say('HUNTER sharpened the blade.', 'good');
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
    const p = G.player, worn = ARMOR_SLOTS.filter(s => BOX.equip[s]).length;
    const i = await choose('ITEM BOX', [
      { icon: DATA['wpn_' + p.weapon], label: 'CHANGE WEAPON', right: WEAPONS[p.weapon].short },
      { label: 'ARMOR', right: `${worn}/5` },
      { label: 'STORE (POUCH → BOX)', right: slotsLabel() },
      { label: 'TAKE (BOX → POUCH)', right: Object.keys(BOX.items).length },
      { label: 'COMBINE', right: 'SURE' },
      { label: 'VIEW STORAGE' },
      { label: 'CLOSE' }]);
    if (i === 0) await weaponMenu();
    else if (i === 1) await armorMenu();
    else if (i === 2) await storeMenu();
    else if (i === 3) await takeMenu();
    else if (i === 4) await craftMenu('box');
    else if (i === 5) await showStorage();
    else return;
  }
}

async function weaponMenu() {
  const p = G.player, keys = BOX.weapons.filter(k => WEAPONS[k]);
  const j = await choose('EQUIP WEAPON', keys.map(k => ({
    icon: DATA['wpn_' + k], label: WEAPONS[k].name, right: k === p.weapon ? 'E' : '',
    desc: `${weaponStats(WEAPONS[k])}<br>${WEAPONS[k].blurb}`
  })), { desc: true });
  if (j < 0) return;
  const k = keys[j];
  if (k === p.weapon) { await say('That weapon is already equipped.', 'dim'); return; }
  equipWeapon(k);
  Audio8.sfx('sharpen');
  await say(`HUNTER equipped the ${WEAPONS[k].name}!`, 'good');
}

async function armorMenu() {
  while (true) {
    const sk = skillSummary();
    const opts = [{ label: 'HUNTER STATUS', right: `DEF ${hunterDef()}`,
                    desc: `DEFENSE ${hunterDef()}<br>SKILLS: ${sk.length ? sk.join('<br>') : 'NONE'}` }];
    for (const s of ARMOR_SLOTS) {
      const a = ARMOR[BOX.equip[s]];
      opts.push({ label: SLOT_NAME[s], right: a ? a.short : '-', desc: a ? `${a.name}<br>${armorStats(a)}<br>${a.desc}` : 'Nothing equipped.' });
    }
    opts.push({ label: 'DONE', desc: '' });
    const i = await choose('ARMOR', opts, { desc: true });
    if (i < 0 || i === opts.length - 1) return;
    if (i === 0) continue;                         // info row
    await armorSlotMenu(ARMOR_SLOTS[i - 1]);
  }
}

async function armorSlotMenu(slot) {
  const ids = BOX.armor.filter(id => ARMOR[id] && ARMOR[id].slot === slot);
  if (!ids.length) {
    await say(`You don't own any ${SLOT_NAME[slot]} armor.\nThe BLACKSMITH can forge some!`, 'dim');
    return;
  }
  const opts = ids.map(id => ({ label: ARMOR[id].name, right: BOX.equip[slot] === id ? 'E' : '',
    desc: `${armorStats(ARMOR[id])}<br>${ARMOR[id].desc}` }));
  opts.push({ label: 'REMOVE', desc: `Take off your ${SLOT_NAME[slot]} armor.` });
  const j = await choose(`${SLOT_NAME[slot]} ARMOR`, opts, { desc: true });
  if (j < 0) return;
  if (j === ids.length) {
    if (!BOX.equip[slot]) { await say('Nothing is equipped there.', 'dim'); return; }
    equipArmor(slot, null); Audio8.sfx('back');
    await say(`HUNTER took off the ${SLOT_NAME[slot]} armor.`);
    return;
  }
  const id = ids[j];
  if (BOX.equip[slot] === id) { await say('That piece is already equipped.', 'dim'); return; }
  equipArmor(slot, id); Audio8.sfx('sharpen');
  await say(`HUNTER put on the ${ARMOR[id].name}!`, 'good');
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
    const id = pick.id, n = await askCount(pouchCount(id));                 // storeMenu
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
    const n = await askCount(Math.min(room, boxCount(id)));                 // takeMenu
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
        desc: `${Object.entries(need).map(([id, n]) => `${itemName(id)}${n > 1 ? ' x' + n : ''} (${has(id)})`).join(' + ')}<br>`
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