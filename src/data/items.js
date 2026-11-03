import { LOOT, SMALLS } from './monsters.js';

// field:true = usable outside battle. price = Camp Felyne shop price.
export const ITEMS = {
  potion:    { name: 'POTION',     field: true, price: 60,  desc: 'Restores some HP.' },
  whetstone: { name: 'WHETSTONE',  field: true, price: 40,  desc: 'Sharpens your weapon back to its best edge.' },
  might:     { name: 'MIGHT SEED', field: true, price: 150, desc: 'Boosts ATTACK for a few turns.' },
  paintball: { name: 'PAINTBALL',  price: 80,  desc: 'Mark the big monster so the MAP can track it for a while.' },
  flash:     { name: 'FLASH BOMB', price: 120, desc: 'Blinds the monster. Its attacks will often miss for a short time.' },
  shock:     { name: 'SHOCK TRAP', price: 400, desc: 'Paralyzes the big monster for a few turns. It grows wary of traps.' },
  tranq:     { name: 'TRANQ BOMB', price: 150, desc: 'Throw at a TRAPPED or SLEEPING monster that is weak enough to CAPTURE it.' },
  nullberry: { name: 'NULL-BERRY', field: true, price: 30, desc: 'Cures elemental blights: FIRE, WATER, ICE, THUNDER, DRAGON.' },
  antidote:  { name: 'ANTIDOTE',   field: true, price: 40, desc: 'Cures POISON.' },
};
export const BOSS_ONLY = ['paintball', 'shock', 'tranq'];

// Gathering points (Sacred Forest legend). "@key" = consumable that goes into the BAG.
export const GATHER = {
  mining:    { label: 'MINING',    verb: 'HUNTER mined the outcrop...',    loot: [['IRON ORE', 50, 1], ['EARTH CRYSTAL', 30, 2], ['MACHALITE ORE', 15, 3], ['DRAGONITE ORE', 5, 4]] },
  bugs:      { label: 'BUGS',      verb: 'HUNTER swung the bug net...',     loot: [['INSECT HUSK', 40, 1], ['BITTERBUG', 35, 1], ['@flash', 25]] },
  bones:     { label: 'BONES',     verb: 'HUNTER dug through the bones...', loot: [['MYSTERY BONE', 55, 1], ['MONSTER BONE S', 30, 2], ['MONSTER BONE M', 15, 3]] },
  plants:    { label: 'PLANTS',    verb: 'HUNTER picked some herbs...',     loot: [['@potion', 45], ['@antidote', 15], ['@might', 12], ['IVY', 28, 1]] },
  mushrooms: { label: 'MUSHROOMS', verb: 'HUNTER foraged mushrooms...',     loot: [['BLUE MUSHROOM', 45, 1], ['PARASHROOM', 30, 2], ['@tranq', 25]] },
  whetstone: { label: 'WHETSTONE', verb: 'HUNTER chipped the rock...',      loot: [['@whetstone', 100]] },
  honey:     { label: 'HONEY',     verb: 'HUNTER scooped some honey...',    loot: [['HONEY', 75, 1], ['@potion', 25]] },
  berries:   { label: 'BERRIES',   verb: 'HUNTER picked some berries...',   loot: [['@paintball', 35], ['@nullberry', 20], ['HUSKBERRY', 32, 1], ['NEEDLEBERRY', 13, 1]] },
  fish:      { label: 'FISH',      verb: 'HUNTER cast a line...',           loot: [['SUSHIFISH', 55, 1], ['SLEEPYFISH', 30, 1], ['BURST ARROWANA', 15, 2]] },
  misc:      { label: 'MISC',      verb: 'HUNTER searched the area...',     loot: [['THEPARAK WOOD', 45, 2], ['BAMBOO SHOOT', 30, 1], ['@potion', 25]] }
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