/* Equipped gear: hidden defense and equip helpers (equipping refreshes the hunter's colours). */
import { G } from './state.js';
import { BOX, saveBox } from './save.js';
import { ARMOR, ARMOR_SLOTS } from '../data/armor.js';
import { applyLook } from '../art/look.js';

export const armorDef = () => ARMOR_SLOTS.reduce((s, k) => s + (ARMOR[BOX.equip[k]]?.def || 0), 0);
/** Damage-taken multiplier from armor: 100 / (100 + DEF). */
export const armorMult = () => 100 / (100 + armorDef());

export function equipWeapon(k) {
  Object.assign(G.player, { weapon: k, charge: 0, spirit: 0 });
  BOX.weapon = k; saveBox(); applyLook();
}
export function equipArmor(slot, id) { BOX.equip[slot] = id; saveBox(); applyLook(); }