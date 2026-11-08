/* Status-effect engine: apply, tick, cure, stat modifiers, HUD chips.
   Works on any unit (G.player or a monster): each has .status, .stunBuild and .acted.
   "fresh": an effect that lands after the target already acted this turn skips that
   turn's end tick, so a 1-turn effect always costs the target one real turn. */
import { pick } from "../core/utils.js";
import { G } from "../core/state.js";
import { STATUS } from "../data/status.js";
import { itemName } from '../data/items.js';
import { BOX } from '../core/save.js';
import { pouchRemove } from '../core/pouch.js';
import { addLog } from '../ui/fx.js';
import { immuneSkill } from '../core/gear.js';

export const uname = (u) =>
  !u ? "Something" : u === G.player ? "HUNTER" : `The ${u.name}`;
const fmt = (s, u) => s.replaceAll("{u}", uname(u));
const each = (u) => Object.keys(u.status || {}).map((id) => STATUS[id]);

export const hasStatus = (u, id) => !!(u.status && u.status[id]);

/* ---------- Stat modifiers ---------- */
export const defMult = (u) => each(u).reduce((v, d) => v * (d.def || 1), 1);
export const atkMult = (u) => each(u).reduce((v, d) => v * (d.atk || 1), 1);
export const accMod = (u) => each(u).reduce((v, d) => v + (d.acc || 0), 0);
export const isSlow = (u) => each(u).some((d) => d.slow);
export const elementSealed = (u) => each(u).some((d) => d.noElement);

/** The effect preventing `what` ('act' | 'attack' | 'item'), or null. 'act' also blocks attacking. */
export function blockedBy(u, what) {
  for (const d of each(u)) {
    const b = d.blocks || [];
    if (b.includes(what) || (what === "attack" && b.includes("act"))) return d;
  }
  return null;
}

/* ---------- Apply / cure ---------- */
function steal(target, src) {
  if (target !== G.player) return null;
  if (!BOX.pouch.length)
    return `${uname(src)} rummaged through the POUCH...\nbut it was empty!`;
  const id = pick(BOX.pouch).id;
  pouchRemove(id);
  return `${uname(src)} stole ${itemName(id)}\nfrom the POUCH!`;
}

/** Applies an effect. Returns the message to show, or null if nothing happened.
    Re-applying refreshes the duration (Thunder keeps its escalation). */
export function applyStatus(u, id, source = null) {
  if (u === G.player) {
    const s = immuneSkill(id);
    if (s) { addLog(`[${s.name} blocked ${id}]`, 'dim'); return `HUNTER was unaffected!\n(${s.name})`; }
  }
  const d = STATUS[id];
  if (d.kind === "physical" && source && !source.isBoss) return null; // big monsters only
  if (d.instant) return id === "steal" ? steal(u, source) : null;
  u.status ||= {};
  const cur = u.status[id];
  if (cur) cur.turns = Math.max(cur.turns, d.turns);
  else u.status[id] = { turns: d.turns, age: 0, fresh: !!u.acted };
  addLog(`[${uname(u)} +${id} ${u.status[id].turns} turns]`, 'dim');
  return fmt(d.onMsg, u);
}

const DEO = ['blast', 'stench']
/** True if this cure item would remove something. */
export function curable(u, item) {
  if (item === 'deodorant') return DEO.some(id => hasStatus(u, id));
  return each(u).some((d) => d.cure === item);
}

/** Removes every effect cured by `item`; returns their names. */
export function cureStatuses(u, item) {
  if (item === 'deodorant') {
  const c = DEO.filter(id => hasStatus(u, id)).map(id => STATUS[id].name);
  DEO.forEach(id => delete u.status[id]);
  return c;
  }
  const names = [];
  for (const id of Object.keys(u.status || {})) {
    if (STATUS[id].cure === item) {
      names.push(STATUS[id].name);
      delete u.status[id];
    }
  }
  return names;
}

/* ---------- Stun ---------- */
/** Current stun chance (%): buildup from consecutive hits, or Thunder's minimum. */
export function stunChance(u) {
  const t = u.status && u.status.thunder;
  const floor = t ? STATUS.thunder.stunRamp[Math.min(t.age, 2)] : 0;
  return Math.max(u.stunBuild || 0, floor);
}

/** Call when `target` takes a hit. build = % added to the buildup (capped at `cap`). Returns a message if stunned. */
export function stunOnHit(target, build, cap = 100) {
  if (target === G.player && immuneSkill('stun')) return null;
  if (hasStatus(target, 'stun')) return null;
  target.stunBuild = Math.min(cap, (target.stunBuild || 0) + build);
  const chance = stunChance(target), roll = Math.random() * 100;
  addLog(`[${uname(target)} stun roll ${roll.toFixed(1)} vs ${chance}% (buildup ${target.stunBuild}%)]`, 'dim');
  if (roll < chance) {
    target.stunBuild = 0;
    return applyStatus(target, 'stun');
  }
  return null;
}

/* ---------- Turn ticks ---------- */
/** End-of-turn tick. Returns [{msg, dmg?}]. lethal=false keeps HP at 1 or more (field ticks). */
export function tickStatuses(u, lethal = true) {
  const out = [];
  for (const [id, s] of Object.entries(u.status || {})) {
    const d = STATUS[id];
    if (s.fresh) { s.fresh = false; continue; }
    if (d.dot) {
      const before = u.hp;
      u.hp = Math.max(lethal ? 0 : 1, u.hp - Math.max(1, Math.round(u.maxHp * d.dot)));
      const dmg = before - u.hp;
      if (dmg > 0) { addLog(`[${uname(u)} ${id} -${dmg} → HP ${u.hp}/${u.maxHp}]`, 'dim'); out.push({ msg: fmt(d.dotMsg, u), dmg }); }
    }
    s.age++;
    if (--s.turns > 0) continue;
    delete u.status[id];
    if (d.blast) {   // Blastblight: explodes when the timer runs out
      const before = u.hp;
      u.hp = Math.max(lethal ? 0 : 1, u.hp - Math.round(u.maxHp * d.blast));
      const dmg = before - u.hp;
      addLog(`[${uname(u)} blast -${dmg} → HP ${u.hp}/${u.maxHp}]`, 'dim');
      out.push({ msg: `The BLASTBLIGHT exploded!\n${uname(u)} was caught in the blast!`, dmg });
    } else out.push({ msg: `${uname(u)}'s ${d.name} wore off.` });
  }
  return out;
}

/** Called when a battle starts or ends: drops battle-only effects and resets stun buildup. */
export function clearBattleOnly(u) {
  for (const [id, s] of Object.entries(u.status || {})) {
    if (STATUS[id].battleOnly) delete u.status[id];
    else s.fresh = false;
  }
  u.stunBuild = 0;
  u.acted = false;
}

/** HUD chips: one per active effect with turns left. */
export const statusChips = (u) =>
  Object.keys(u.status || {})
    .map(id =>
      `<span class="chip st" style="background:${STATUS[id].color}">${STATUS[id].short}</span>`
    )
    .join('');