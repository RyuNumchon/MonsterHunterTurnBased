import { LOOT, SMALLS } from './monsters.js';
import { CONFIG } from '../core/config.js';

// field:true = usable outside battle. price = Camp Felyne shop price.
export const ITEMS = {
  herb:      { name: 'HERB',        field: true, price: 10,  heal: 15, desc: 'Restores a little HP.' },
  potion:    { name: 'POTION',      field: true, price: 60,  heal: 30, desc: 'Restores some HP.' },
  mega:      { name: 'MEGA POTION', field: true, price: 150, heal: 50, desc: 'Restores a good amount of HP.' },
  whetstone: { name: 'WHETSTONE',  field: true, price: 40,  desc: 'Sharpens your weapon.' },
  might:     { name: 'MIGHT SEED', field: true, price: 150, desc: 'Boosts ATTACK for a few turns.' },
  paintball: { name: 'PAINTBALL',  price: 80,  desc: 'Mark the big monster so the MAP can track it for a while.' },
  flash:     { name: 'FLASH BOMB', price: 120, desc: 'Blinds the monster. Its attacks become easier to dodge.Blinds the monster. Its attacks become easier to dodge.' },
  shock:     { name: 'SHOCK TRAP', price: 400, desc: 'Paralyzes the big monster for a few turns. It grows wary of traps.' },
  tranq:     { name: 'TRANQ BOMB', price: 150, desc: 'Throw at a TRAPPED or SLEEPING monster that is weak enough to CAPTURE it.' },
  nullberry: { name: 'NULL-BERRY', field: true, price: 30, desc: 'Cures elemental blights: FIRE, WATER, ICE, THUNDER, DRAGON.' },
  antidote:  { name: 'ANTIDOTE',   field: true, price: 40, desc: 'Cures POISON.' },
  deodorant: { name: 'DEODORANT', field: true, price: 40, desc: 'Cures BLASTBLIGHT and STENCH.' },

};
export const BOSS_ONLY = ['paintball', 'shock', 'tranq'];

// Gathering points (Sacred Forest legend). "@key" = consumable that goes into the POUCH.
export const GATHER = {
  mining:    { label: 'MINING',    verb: 'HUNTER mined the outcrop...',    loot: [['IRON ORE', 50, 1], ['EARTH CRYSTAL', 30, 2], ['MACHALITE ORE', 15, 3], ['DRAGONITE ORE', 5, 4]] },
  bugs:      { label: 'BUGS',      verb: 'HUNTER swung the bug net...',     loot: [['INSECT HUSK', 35, 1], ['BITTERBUG', 30, 1], ['FLASHBUG', 35, 1]] },
  bones:     { label: 'BONES',     verb: 'HUNTER dug through the bones...', loot: [['MYSTERY BONE', 55, 1], ['MONSTER BONE S', 30, 2], ['MONSTER BONE M', 15, 3]] },
  plants:    { label: 'PLANTS',    verb: 'HUNTER picked some herbs...',     loot: [['@herb', 55], ['@antidote', 15], ['@might', 10], ['IVY', 20, 1]] },
  mushrooms: { label: 'MUSHROOMS', verb: 'HUNTER foraged mushrooms...',     loot: [['BLUE MUSHROOM', 45, 1], ['PARASHROOM', 30, 2], ['@tranq', 25]] },
  whetstone: { label: 'WHETSTONE', verb: 'HUNTER chipped the rock...',      loot: [['@whetstone', 100]] },
  honey:     { label: 'HONEY',     verb: 'HUNTER scooped some honey...',    loot:[['HONEY', 100, 1]] },
  berries:   { label: 'BERRIES',   verb: 'HUNTER picked some berries...',   loot: [['@paintball', 35], ['@nullberry', 20], ['HUSKBERRY', 32, 1], ['NEEDLEBERRY', 13, 1]] },
  fish:      { label: 'FISH',      verb: 'HUNTER cast a line...',           loot: [['SUSHIFISH', 55, 1], ['SLEEPYFISH', 30, 1], ['BURST ARROWANA', 15, 2]] },
  misc:      { label: 'MISC',      verb: 'HUNTER searched the area...',     loot: [['THEPARAK WOOD', 45, 2], ['BAMBOO SHOOT', 30, 1]] }
};

/** Material name -> rarity (1–6), built from every loot table. */
export const ITEM_RAR = {};
for (const k in LOOT) {
  const L = LOOT[k];
  [L.carve, L.reward, L.capture, ...Object.values(L.breaks)].forEach(t => t.forEach(e => ITEM_RAR[e[0]] = e[2]));
}
for (const k in SMALLS) SMALLS[k].carve.forEach(e => ITEM_RAR[e[0]] = e[2]);
for (const k in GATHER) GATHER[k].loot.forEach(e => { if (!e[0].startsWith('@')) ITEM_RAR[e[0]] = e[2]; });

/* Felyne Chef feasts (Gathering Hub). One per quest; +max HP for the next quest only. hp is hidden. */
export const FEASTS = [
  { id: 'stew',  name: 'MOUNTAIN STEW',     price: 120, hp: 25, desc: 'A warm, hearty stew.<br>HEALTH up for your next quest.' },
  { id: 'fish',  name: 'SUSHIFISH PLATTER', price: 180, hp: 35, desc: 'Fresh from the river.<br>HEALTH up for your next quest.' },
  { id: 'steak', name: 'WYVERN STEAK',      price: 240, hp: 50, desc: 'Sizzling and enormous.<br>HEALTH up (large) for your next quest.' }
];

/* Unified item ids: consumable keys (ITEMS) or material names. */
export const isConsumable = id => !!ITEMS[id];
export const itemName = id => ITEMS[id]?.name || id;
export const itemRar = id => ITEMS[id] ? 1 : (ITEM_RAR[id] || 1);
export const stackOf = id => CONFIG.STACK[id] ?? CONFIG.STACK_DEFAULT;