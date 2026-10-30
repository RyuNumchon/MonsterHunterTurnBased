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
  greatsword: { name: 'GREAT SWORD', short: 'GS', element: null, elemPower: 0, elemChance: 0, blurb: 'Slow but massive. Charge up to 3x damage and GUARD.', moves: [
    { id: 'gs_slash',   name: 'OVERHEAD SLASH', type: 'attack',  tag: 'SLASH',  power: 24, acc: 0,  sharp: 2, desc: 'A reliable, heavy downward slash.' },
    { id: 'gs_charge',  name: 'CHARGE',         type: 'charge',  tag: 'CHARGE', sharp: 0, desc: 'Spend the turn charging. Holds up to Lv2.' },
    { id: 'gs_release', name: 'CHARGED SLASH',  type: 'release', tag: 'SLASH',  power: 24, acc: -5, sharp: 3, desc: 'Release: Lv1 1x, Lv2 2x, Lv3 3x damage.' },
    { id: 'gs_guard',   name: 'GUARD',          type: 'guard',   tag: 'DEFEND', sharp: 1, desc: 'Block with the blade. Take 40% damage.' }
  ]},
  longsword:  { name: 'LONGSWORD',   short: 'LS', element: 'fire', elemPower: 6, elemChance: .25, blurb: 'Fast and accurate. Builds SPIRIT for a big finisher.', moves: [
    { id: 'ls_thrust',    name: 'THRUST',       type: 'attack',   tag: 'PIERCE',  power: 13, acc: 15, sharp: 1, desc: 'Fast, very accurate poke.' },
    { id: 'ls_spirit',    name: 'SPIRIT SLASH', type: 'attack',   tag: 'SLASH',   power: 18, acc: 5,  sharp: 2, spirit: 1, desc: 'Builds +1 Spirit (max 3).' },
    { id: 'ls_foresight', name: 'FORESIGHT',    type: 'counter',  tag: 'COUNTER', power: 14, acc: 0,  sharp: 2, desc: 'Costs 1 Spirit. Evades the monster attack this turn.' },
    { id: 'ls_round',     name: 'ROUNDSLASH',   type: 'finisher', tag: 'SPIRIT',  power: 18, acc: 0,  sharp: 3, desc: '+50% DMG per Spirit level. Uses the whole gauge.' }
  ]}
};