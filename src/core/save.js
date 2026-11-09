/* Save data: Item Box storage, pouch, zenny, chosen weapon, mute setting. */
import { CONFIG } from "./config.js";
import { stackOf } from "../data/items.js";

const BOX_KEY = "mh_gen3_itembox_v3";
const START_POUCH = {
  potion: 5,
  whetstone: 3,
  might: 1,
  nullberry: 1,
  antidote: 1,
  paintball: 1,
  flash: 1,
};
const BASE_WEAPONS = ["greatsword", "longsword"];

export const defaultBox = () => ({
  items: {
    "RATHALOS SCALE": 100,
    "RATHALOS SHELL": 100,
    "FLAME SAC": 100,
    "RATHALOS WEBBING": 100,
    "TIGREX SCALE": 100,
    "TIGREX SHELL": 100,
    "TIGREX CLAW": 100,
    "TIGREX FANG": 100,
  },
  zenny: 999999,
  hunts: 0,
  weapons: [...BASE_WEAPONS],
  armor: [],
  movesets: {},
  equip: { head: null, chest: null, belt: null, gloves: null, legs: null },
  muted: false,
  pouch: Object.entries(START_POUCH).map(([id, n]) => ({ id, n })),
});

/** Converts an old `pouch` save, and moves anything over the pouch limits into the box. */
function migrate(box, raw) {
  if (!Array.isArray(raw.pouch) && raw.pouch)
    box.pouch = Object.entries(raw.pouch)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ id, n }));
  delete box.pouch;
  const slots = CONFIG.POUCH_PAGES * CONFIG.POUCH_PAGE_SIZE;
  const spill = (id, n) => {
    if (n > 0) box.items[id] = (box.items[id] || 0) + n;
  };
  box.pouch = box.pouch.filter((s, i) => {
    if (i >= slots) {
      spill(s.id, s.n);
      return false;
    }
    spill(s.id, s.n - stackOf(s.id));
    s.n = Math.min(s.n, stackOf(s.id));
    return s.n > 0;
  });
  box.equip = { ...defaultBox().equip, ...(raw.equip || {}) };
  if (!box.weapons.includes(box.weapon)) box.weapon = "greatsword";
  return box;
}

function loadBox() {
  try {
    const raw = JSON.parse(localStorage.getItem(BOX_KEY));
    if (raw) return migrate({ ...defaultBox(), ...raw }, raw);
  } catch (e) {
    /* corrupt save: start fresh */
  }
  return defaultBox();
}

/** Live binding: always the current save object. */
export let BOX = loadBox();

export function saveBox() {
  try {
    localStorage.setItem(BOX_KEY, JSON.stringify(BOX));
  } catch (e) {
    /* storage blocked: session only */
  }
}

/** Clears storage, pouch and zenny but keeps the equipped weapon and audio preference. */
export function wipeBox() {
  BOX = {
    ...defaultBox(),
    weapon: BASE_WEAPONS.includes(BOX.weapon) ? BOX.weapon : "greatsword",
    muted: BOX.muted,
  };
  saveBox();
}
