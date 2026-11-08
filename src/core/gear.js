/* Equipped gear: defense, armor skills, and equip helpers (equipping refreshes the hunter's colours). */
import { CONFIG } from './config.js';
import { G } from './state.js';
import { BOX, saveBox } from './save.js';
import { ARMOR, ARMOR_SLOTS } from '../data/armor.js';
import { SKILLS } from '../data/skills.js';
import { STATUS } from '../data/status.js';
import { applyLook } from '../art/look.js';

for (const s of Object.values(SKILLS))
  if (s.immune && !STATUS[s.immune]) console.warn(`[skills] ${s.name} blocks '${s.immune}', which isn't a STATUS id`);

export const armorDef = () => ARMOR_SLOTS.reduce((s, k) => s + (ARMOR[BOX.equip[k]]?.def || 0), 0);

/** { skillId: points } from all equipped pieces. */
export function skillPoints() {
  const pts = {};
  for (const slot of ARMOR_SLOTS)
    for (const [k, n] of Object.entries(ARMOR[BOX.equip[slot]]?.skills || {})) pts[k] = (pts[k] || 0) + n;
  return pts;
}
export const skillLv = k => SKILLS[k].pts.filter(t => (skillPoints()[k] || 0) >= t).length;
/** Effect of a levelled skill, or `none` when it isn't active. */
export const skillVal = (k, none) => { const lv = skillLv(k); return lv ? SKILLS[k].val[lv - 1] : none; };
/** The active skill that blocks this status, or null. */
export const immuneSkill = id => {
  const k = Object.keys(SKILLS).find(k => SKILLS[k].immune === id);
  return k && skillLv(k) > 0 ? SKILLS[k] : null;
};
export const immuneTo = id => !!immuneSkill(id);

/** Total DEF = base + armor + DEFENSE UP. Shown to the player. */
export const hunterDef = () => CONFIG.BASE_DEF + armorDef() + skillVal('defense', 0);
/** Damage-taken multiplier. Unarmored = 1 (same damage as before). */
export const armorMult = () => (100 + CONFIG.BASE_DEF) / (100 + hunterDef());

/** Menu lines: active skills with level and points to the next level; inactive ones show points needed. */
export function skillSummary() {
  const pts = skillPoints();
  return Object.keys(pts).filter(k => SKILLS[k]).map(k => {
    const S = SKILLS[k], lv = skillLv(k), next = S.pts[lv];
    if (!lv) return `<span class="off">${S.name} (${pts[k]}/${S.pts[0]})</span>`;
    return `${S.name}${S.pts.length > 1 ? ' Lv' + lv : ''}${next ? ` (${pts[k]}/${next})` : ''}`;
  });
}

export function equipWeapon(k) {
  Object.assign(G.player, { weapon: k, charge: 0, spirit: 0 });
  BOX.weapon = k; saveBox(); applyLook();
}
export function equipArmor(slot, id) { BOX.equip[slot] = id; saveBox(); applyLook(); }