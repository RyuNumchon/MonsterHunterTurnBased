/* Large-monster resistances.
   ELEMENT DEFENSE: m.elemDef[el] (−100…100). Multiplier ×(1 − DEF/100), 0…2: scales element damage AND status chance.
   GROWING RESISTANCE: each time a status/trap/flash lands, the next chance ×RESIST_CHANCE_STEP
   (floor RESIST_FLOOR) and its duration ×RESIST_TURN_STEP (min 1 turn). Small monsters: none. */
import { CONFIG } from '../core/config.js';
import { MONSTERS } from '../data/monsters.js';
import { addLog } from '../ui/fx.js';

export function elemMult(m, el) {
  if (!m.isBoss || !el) return 1;
  const def = (m.elemDef || MONSTERS[m.key]?.elemDef || {})[el] || 0;
  return Math.max(0, Math.min(2, 1 - def / 100));
}

const times = (m, id) => (m.isBoss && m.resist?.[id]) || 0;
export const resistChance = (m, id) => Math.max(CONFIG.RESIST_FLOOR, Math.pow(CONFIG.RESIST_CHANCE_STEP, times(m, id)));
export const resistTurns = (m, id, t) => Math.max(1, Math.round(t * Math.pow(CONFIG.RESIST_TURN_STEP, times(m, id))));

/** Call after a status/trap/flash lands on a big monster. */
export function noteResist(m, id) {
  if (!m.isBoss) return;
  m.resist ??= {};
  m.resist[id] = (m.resist[id] || 0) + 1;
  addLog(`[${m.name} ${id} resist x${m.resist[id]} → next chance x${resistChance(m, id).toFixed(2)} · turns x${Math.pow(CONFIG.RESIST_TURN_STEP, m.resist[id]).toFixed(2)}]`, 'dim');
}

/** Rolls `base` chance reduced by resistance. */
export function resistRoll(m, id, base = 1) {
  const c = base * resistChance(m, id), r = Math.random();
  addLog(`[${id} roll ${(r * 100).toFixed(1)} vs ${(c * 100).toFixed(1)}% (base ${(base * 100).toFixed(0)} x resist ${resistChance(m, id).toFixed(2)})]`, 'dim');
  return r < c;
}