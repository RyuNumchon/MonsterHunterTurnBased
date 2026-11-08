/* Move catalogue (10 per weapon type) + per-type movesets saved in BOX.movesets.
   New moves copy an existing move (`like`) so they keep its mechanics, then change numbers:
   pow = × base power · accAdd = + base accuracy · sharp = edge cost · crit = +crit% · breakMult = part damage ×.
   requires = the move that must be in the set first. */
import { CONFIG } from '../core/config.js';
import { BOX } from '../core/save.js';
import { WEAPONS } from './weapons.js';

export const MOVE_CLASSES = { greatsword: 'GREAT SWORD', longsword: 'LONG SWORD' };
export const OVERCHARGE_BASE = 'gs_chargeslash';

const ORIGINAL = {};
for (const c in MOVE_CLASSES) ORIGINAL[c] = [...(WEAPONS[c].moves || [])];
const BASE = Object.fromEntries(Object.values(ORIGINAL).flat().map(m => [m.id, m]));

const DEFS = {
  greatsword: [
    { id: 'gs_slash' },
    { id: 'gs_wide', like: 'gs_slash', name: 'WIDE SLASH', pow: .8, accAdd: 15, desc: 'A broad sweep. Weaker, but hard to miss.' },
    { id: 'gs_upswing', like: 'gs_slash', name: 'UPSWING', pow: 1.1, accAdd: -5, breakMult: 1.6, desc: 'A rising slash that cracks parts. Breaks parts faster.' },
    { id: 'gs_kick', like: 'gs_slash', name: 'KICK', pow: .35, accAdd: 20, sharp: 0, desc: 'A quick kick. Weak, but never dulls the blade.' },
    { id: 'gs_guard' },
    { id: 'gs_charge' },
    { id: 'gs_tackle', like: 'gs_slash', requires: 'gs_charge', name: 'TACKLE', pow: .6, accAdd: 10, crit: 15, desc: 'A shoulder tackle between charges. Steady, and crits more often.' },
    { id: 'gs_chargeslash', requires: 'gs_charge' },
    { id: 'gs_strong', like: 'gs_chargeslash', requires: 'gs_chargeslash', name: 'STRONG CHARGED SLASH', pow: 1.25, accAdd: -8, desc: 'A heavier charged slash. Uses your CHARGE.' },
    { id: 'gs_true', like: 'gs_chargeslash', requires: 'gs_strong', name: 'TRUE CHARGED SLASH', pow: 1.5, accAdd: -15, desc: 'The ultimate charged slash. Uses your CHARGE. Hard to land.' }
  ],
  longsword: [
    { id: 'ls_slash' },
    { id: 'ls_thrust', like: 'ls_slash', name: 'THRUST', pow: .75, accAdd: 15, desc: 'A quick, precise thrust. Weaker, but hard to miss.' },
    { id: 'ls_rising', like: 'ls_slash', name: 'RISING SLASH', pow: .9, breakMult: 1.5, desc: 'An upward cut. Breaks parts faster.' },
    { id: 'ls_fade', like: 'ls_slash', name: 'FADE SLASH', pow: .85, accAdd: -5, crit: 20, desc: 'A slash while stepping back. Crits more often.' },
    { id: 'ls_crescent', like: 'ls_slash', name: 'CRESCENT SLASH', pow: 1.15, accAdd: -10, desc: 'A wide arcing slash. Strong, but less accurate.' },
    { id: 'ls_spirit' },
    { id: 'ls_round', like: 'ls_spirit', requires: 'ls_spirit', name: 'SPIRIT ROUNDSLASH', pow: 1.2, accAdd: -5, desc: 'A spinning spirit finisher. Stronger than a SPIRIT SLASH.' },
    { id: 'ls_helm', requires: 'ls_spirit' },
    { id: 'ls_foresight' },
    { id: 'ls_iai', like: 'ls_foresight', requires: 'ls_foresight', name: 'IAI SPIRIT SLASH', counterMult: 2.0,
      desc: 'Uses SPIRIT. Time the monster attack to dodge and strike back even harder. Always acts first.' }
  ]
};

export const MOVES = {};
for (const [cls, list] of Object.entries(DEFS)) for (const d of list) {
  const base = BASE[d.like || d.id];
  if (!base) { console.warn(`[moves] ${d.id}: no existing move '${d.like || d.id}' to copy`); continue; }
  const { like, pow, accAdd, ...rest } = d;
  const m = { ...base, ...rest, cls };
  if (pow) m.power = Math.round((base.power || 0) * pow);
  if (accAdd) m.acc = (base.acc || 0) + accAdd;
  MOVES[d.id] = m;
}

export const moveById = id => MOVES[id] || BASE[id] || null;
export const isAttackMove = m => (m.power || 0) > 0;

function defaultSet(cls) {
  const ids = ORIGINAL[cls].map(m => m.id).filter(id => MOVES[id]).slice(0, CONFIG.MOVE_SLOTS);
  while (ids.length < CONFIG.MOVE_SLOTS) ids.push(null);
  return ids;
}
/** Saved moveset for a weapon type (slots may be null). Invalid saves fall back to the default. */
export function movesetOf(cls) {
  BOX.movesets ??= {};
  const s = BOX.movesets[cls];
  if (!Array.isArray(s) || s.length !== CONFIG.MOVE_SLOTS || s.some(id => id && MOVES[id]?.cls !== cls))
    BOX.movesets[cls] = defaultSet(cls);
  return BOX.movesets[cls];
}
export const equippedMoves = cls => movesetOf(cls).filter(Boolean).map(id => MOVES[id]);

/** The prerequisite missing from `set`, or null. */
export const lockedBy = (id, set) => { const r = MOVES[id].requires; return r && !set.includes(r) ? MOVES[r] : null; };
/** Moves in `set` that need `id`. */
export const dependents = (id, set) => set.filter(x => x && MOVES[x].requires === id);

/** Overcharge = 0.8 × a level-1 Charged Slash. */
export function overchargeMove() {
  const cs = moveById(OVERCHARGE_BASE);
  return { ...cs, id: 'overcharge', name: 'OVERCHARGE SLASH', overcharge: true,
           power: Math.round(cs.power * CONFIG.CHARGE_LV1_MULT * CONFIG.OVERCHARGE_MULT) };
}

// Battle code reads `weapon.moves`: point it at the saved moveset (forged weapons share their type's set).
for (const w of Object.values(WEAPONS)) if (MOVE_CLASSES[w.cls])
  Object.defineProperty(w, 'moves', { configurable: true, enumerable: true, get: () => equippedMoves(w.cls) });