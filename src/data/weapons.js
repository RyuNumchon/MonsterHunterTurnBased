import { CONFIG } from '../core/config.js';

/** Sharpness zone for a given sharpness value. */
export function getSharp(s) {
  if (s >= CONFIG.SHARP_GREEN)  return { name: 'GREEN',  color: '#4cc76a', text: '#208838', dmg: 1.2, hit: 10,  bounce: false };
  if (s >= CONFIG.SHARP_YELLOW) return { name: 'YELLOW', color: '#e6c84a', text: '#9a7a00', dmg: 1.0, hit: 0,   bounce: false };
  return                               { name: 'RED',    color: '#e0503a', text: '#c03020', dmg: 0.5, hit: -10, bounce: true  };
}

export const ATTACK_TYPES = ['attack', 'release', 'counter', 'finisher'];
export const isAttack = mv => ATTACK_TYPES.includes(mv.type);

export const WEAPONS = {
  greatsword: { name: 'GREAT SWORD', short: 'GS', cls: 'greatsword', speed: .85, dmgType: 'cut', element: null, elemPower: 0, elemChance: 0, blurb: 'Slow but massive. Charge up for huge hits and GUARD.', moves: [
    { id: 'gs_slash',   name: 'OVERHEAD SLASH', type: 'attack',  tag: 'SLASH',  power: 24, acc: 0,  sharp: 2, desc: 'A reliable, heavy downward slash.' },
    { id: 'gs_charge',  name: 'CHARGE',         type: 'charge',  tag: 'CHARGE', sharp: 0, desc: 'Spend the turn charging. Holds up to Lv2.' },
    { id: 'gs_release', name: 'CHARGED SLASH',  type: 'release', tag: 'SLASH',  power: 24, acc: -5, sharp: 3, desc: 'Release the charge. The longer the charge, the bigger the hit.' },
    { id: 'gs_guard', name: 'GUARD', type: 'guard', tag: 'DEFEND', sharp: 1, priority: 1, desc: 'Block with the blade to reduce damage. Always acts first.' }
  ]},
  longsword:  { name: 'LONGSWORD', short: 'LS', cls: 'longsword', speed: 1.1, dmgType: 'cut', element: null, elemPower: 0, elemChance: 0, blurb: 'Fast and accurate. Builds SPIRIT for a big finisher.', moves: [
    { id: 'ls_thrust',    name: 'THRUST',       type: 'attack',   tag: 'PIERCE',  power: 13, acc: 15, sharp: 1, desc: 'Fast, very accurate poke.' },
    { id: 'ls_spirit',    name: 'SPIRIT SLASH', type: 'attack',   tag: 'SLASH',   power: 18, acc: 5,  sharp: 2, spirit: 1, desc: 'Builds the SPIRIT gauge.' },
    { id: 'ls_foresight', name: 'FORESIGHT', type: 'counter', tag: 'COUNTER', power: 14, acc: 0, sharp: 2, priority: 1, desc: 'Uses SPIRIT. Evades the monster attack this turn. Always acts first.' },
    { id: 'ls_round',     name: 'ROUNDSLASH',   type: 'finisher', tag: 'SPIRIT',  power: 18, acc: 0,  sharp: 3, desc: 'Spends the whole SPIRIT gauge. Stronger with more SPIRIT.' }
  ]}
}

/* Forged weapons: same moves as their class; own stats (atk is hidden), colours (pal.W) and forge cost. */
const forged = (cls, extra) => ({ ...WEAPONS[cls], cls, ...extra });

WEAPONS.rathalos_gs = forged('greatsword', {
  name: 'RATHALOS BLADE', short: 'GS', atk: 1.15,
  element: 'fire', elemPower: 6, elemChance: .25,
  pal: { W: '#b82820' },
  blurb: 'A great sword of red Rathalos scale and black shell.<br>Burns with FIRE.',
  cost: { z: 2400, mats: { 'RATHALOS SCALE': 4, 'RATHALOS SHELL': 2, 'FLAME SAC': 1 } }
});

WEAPONS.tigrex_ls = forged('longsword', {
  name: 'TIGREX SABER', short: 'LS', atk: 1.25, speed: 1.15,
  element: null, elemPower: 0, elemChance: 0,
  pal: { W: '#e88a30' },
  blurb: 'A long sword of orange Tigrex fang bound in blue hide.<br>Fierce and quick.',
  cost: { z: 2400, mats: { 'TIGREX SCALE': 4, 'TIGREX SHELL': 2, 'TIGREX CLAW': 1 } }
});