/* Item Box persistence: loot, zenny, chosen weapon and mute setting. */
import { CONFIG } from './config.js';

const BOX_KEY = 'mh_gen3_itembox_v3';
export const defaultBox = () => ({ items: {}, zenny: CONFIG.START_ZENNY, hunts: 0, weapon: 'greatsword', muted: false,
  bag: { potion: 5, whetstone: 3, might: 1, nullberry: 1, antidote: 1, paintball: 1, flash: 1, shock: 0, tranq: 0 } });

function loadBox() {
  try { return { ...defaultBox(), ...(JSON.parse(localStorage.getItem(BOX_KEY)) || {}) }; }
  catch (e) { return defaultBox(); }
}

/** Live binding: always the current save object. */
export let BOX = loadBox();

export function saveBox() {
  try { localStorage.setItem(BOX_KEY, JSON.stringify(BOX)); } catch (e) { /* storage blocked: session only */ }
}

/** Clears loot and zenny but keeps the equipped weapon and audio preference. */
export function wipeBox() {
  BOX = { ...defaultBox(), weapon: BOX.weapon, muted: BOX.muted };
  saveBox();
}