/* Speed stat (Pokémon-style).
   Hunter: HUNTER_SPEED × weapon.speed. Monsters: their own `spd`. Slowed (ice / mud) = × SLOW_SPEED_MULT.
   Used for turn order, hit/dodge, escape, and field walking speed. */
import { CONFIG } from '../core/config.js';
import { clamp } from '../core/utils.js';
import { G } from '../core/state.js';
import { WEAPONS } from '../data/weapons.js';
import { isSlow } from './status.js';
import { moodSpeed } from './mood.js'

export function speedOf(u) {
  const base = u === G.player ? CONFIG.HUNTER_SPEED * (WEAPONS[u.weapon].speed || 1) : (u.spd || 100);
  return Math.round(base * (isSlow(u) ? CONFIG.SLOW_SPEED_MULT : 1) * moodSpeed(u));
}

/** Hit-chance shift: a faster attacker hits more, a faster defender dodges more. */
export const speedHitMod = (att, def) =>
  clamp(Math.round((speedOf(att) - speedOf(def)) * CONFIG.SPEED_HIT_FACTOR), -CONFIG.SPEED_HIT_CAP, CONFIG.SPEED_HIT_CAP);

/** Chance (0–1) that `a` acts before `b`. */
export const firstChance = (a, b) => { const sa = speedOf(a), sb = speedOf(b); return sa / (sa + sb); };

/** Field step time in ms: base is the time at speed 100. */
export const stepMs = (u, baseMs) => baseMs * 100 / Math.max(1, speedOf(u));