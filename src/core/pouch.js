/* Pouch + Item Box storage. Ids are consumable keys ('potion') or material names ('HONEY').
   Pouch: BOX.pouch = [{ id, n }], one slot per kind, n ≤ stackOf(id), at most pouchSlots() slots.
   Box:   BOX.items = { id: n }, unlimited. */
import { CONFIG } from './config.js';
import { BOX } from './save.js';
import { stackOf } from '../data/items.js';

export const pouchSlots = () => CONFIG.POUCH_PAGES * CONFIG.POUCH_PAGE_SIZE;
const slot = id => BOX.pouch.find(s => s.id === id);

export const pouchCount = id => slot(id)?.n || 0;

/** How many more of `id` the pouch can take. */
export function pouchRoom(id) {
  const s = slot(id);
  if (s) return stackOf(id) - s.n;
  return BOX.pouch.length < pouchSlots() ? stackOf(id) : 0;
}

/** Adds up to n; returns how many actually fit. */
export function pouchAdd(id, n = 1) {
  const add = Math.min(n, pouchRoom(id));
  if (add <= 0) return 0;
  const s = slot(id);
  if (s) s.n += add; else BOX.pouch.push({ id, n: add });
  return add;
}

/** Removes up to n; returns how many were removed. An emptied slot is freed. */
export function pouchRemove(id, n = 1) {
  const s = slot(id);
  if (!s) return 0;
  const r = Math.min(n, s.n);
  s.n -= r;
  if (s.n <= 0) BOX.pouch.splice(BOX.pouch.indexOf(s), 1);
  return r;
}

export const boxCount = id => BOX.items[id] || 0;
export function boxAdd(id, n = 1) { BOX.items[id] = boxCount(id) + n; }
export function boxRemove(id, n = 1) {
  const r = Math.min(n, boxCount(id));
  BOX.items[id] -= r;
  if (BOX.items[id] <= 0) delete BOX.items[id];
  return r;
}