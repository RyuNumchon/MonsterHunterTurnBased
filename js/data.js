/* =====================================================================
   DATA, CONFIG, MAPS, AND PIXEL-ART ENGINE (data.js)
   ===================================================================== */

export const CONFIG = {
  PLAYER_MAX_HP: 150,
  MAX_CARTS: 3,
  MAX_ITEMS_PER_TURN: 3,
  SHARP_MAX: 40,
  SHARP_GREEN: 26,
  SHARP_YELLOW: 13,
  BOUNCE_RECOIL_PCT: 0.05,
  OVERALL_HIT: 90,
  MONSTER_HIT: 60,
  MONSTER_HIT_FLASHED: 30,
  MIGHT_MULT: 1.25,
  WAKE_MULT: 2,
  GUARD_TAKEN: 0.4,
  HEAVY_INTERRUPT_CHANCE: 0.3,
  FLEE_MIN: 4,
  FLEE_MAX: 6,
  FLEE_CHANCE: 0.5,
  LOW_HP_FLEE: 0.25,
  LOW_HP_FLEE_CHANCE: 0.4,
  REST_HEAL_PCT: 0.03,
  SLEEP_CHANCE: 0.35,
  NEST_SLEEP_CHANCE: 0.8,
  WAKE_AFTER: 6,
  ROAM_CHANCE: 0.5,
  TAIL_ATK_MULT: 0.75,
  BODY_CRACK_MULT: 1.1,
  CAPTURE_PCT: 0.25,
  TRAP_TURNS_FIRST: 3,
  TRAP_TURNS_AFTER: 2,
  TRAP_HIT_BONUS: 25,
  TRANQ_NEEDED: 2,
  CARVES: 3,
  SMALL_CARVES: 1,
  MAIN_REWARDS: 4,
  CAPTURE_MAIN_REWARDS: 5,
  CAPTURE_BONUS: 3,
  CAPTURE_ZENNY_MULT: 1.2,
  MOVE_MS: 150,
  BOSS_CHASE_MS: 95,
  SMALL_CHASE_MS: 115,
  WANDER_MS: 320,
  ESCAPE_CHANCE: 0.75,
  GRACE_MS: 2500,
  BOSS_AGGRO: 5,
  GATHER_USES: 2,
  START_ZENNY: 1500,
  TEXT_SPEED: 14,
  AUTO_ADVANCE: 900,
  AUTO: true
};

export const CHARGE_MULT = [1, 2, 3];

export function getSharp(s) {
  if (s >= CONFIG.SHARP_GREEN)
    return { name: "GREEN", color: "#4cc76a", text: "#208838", dmg: 1.2, hit: 10, bounce: false };
  if (s >= CONFIG.SHARP_YELLOW)
    return { name: "YELLOW", color: "#e6c84a", text: "#9a7a00", dmg: 1.0, hit: 0, bounce: false };
  return { name: "RED", color: "#e0503a", text: "#c03020", dmg: 0.5, hit: -10, bounce: true };
}

export const ATTACK_TYPES = ["attack", "release", "counter", "finisher"];
export const isAttack = (mv) => ATTACK_TYPES.includes(mv.type);

export const WEAPONS = {
  greatsword: {
    name: "GREAT SWORD",
    short: "GS",
    blurb: "Slow but massive. Charge up to 3x damage and GUARD.",
    moves: [
      { id: "gs_slash", name: "OVERHEAD SLASH", type: "attack", tag: "SLASH", power: 24, acc: 0, sharp: 2, desc: "A reliable, heavy downward slash." },
      { id: "gs_charge", name: "CHARGE", type: "charge", tag: "CHARGE", sharp: 0, desc: "Spend the turn charging. Holds up to Lv2." },
      { id: "gs_release", name: "CHARGED SLASH", type: "release", tag: "SLASH", power: 24, acc: -5, sharp: 3, desc: "Release: Lv1 1x, Lv2 2x, Lv3 3x damage." },
      { id: "gs_guard", name: "GUARD", type: "guard", tag: "DEFEND", sharp: 1, desc: "Block with the blade. Take 40% damage." }
    ]
  },
  longsword: {
    name: "LONGSWORD",
    short: "LS",
    blurb: "Fast and accurate. Builds SPIRIT for a big finisher.",
    moves: [
      { id: "ls_thrust", name: "THRUST", type: "attack", tag: "PIERCE", power: 13, acc: 15, sharp: 1, desc: "Fast, very accurate poke." },
      { id: "ls_spirit", name: "SPIRIT SLASH", type: "attack", tag: "SLASH", power: 18, acc: 5, sharp: 2, spirit: 1, desc: "Builds +1 Spirit (max 3)." },
      { id: "ls_foresight", name: "FORESIGHT", type: "counter", tag: "COUNTER", power: 14, acc: 0, sharp: 2, desc: "Costs 1 Spirit. Evades the monster attack this turn." },
      { id: "ls_round", name: "ROUNDSLASH", type: "finisher", tag: "SPIRIT", power: 18, acc: 0, sharp: 3, desc: "+50% DMG per Spirit level. Uses the whole gauge." }
    ]
  }
};

export const MONSTERS = {
  rathalos: {
    name: "RATHALOS",
    rank: 6,
    hp: 650,
    parts: { head: 160, body: 260, legs: 150, tail: 140 },
    attacks: [
      { name: "FIREBALL", power: 20 },
      { name: "TAIL WHIP", power: 16 },
      { name: "RUSHING CHARGE", power: 22 },
      { name: "POISON TALON DIVE", power: 30, heavy: true }
    ]
  },
  tigrex: {
    name: "TIGREX",
    rank: 6,
    hp: 700,
    parts: { head: 180, body: 280, legs: 150, tail: 120 },
    attacks: [
      { name: "BITE", power: 18 },
      { name: "ROCK THROW", power: 16 },
      { name: "SPINNING TAIL", power: 22 },
      { name: "FULL-BODY CHARGE", power: 32, heavy: true }
    ]
  }
};

export const SMALLS = {
  jaggi: {
    name: "JAGGI",
    rank: 1,
    hp: 80,
    aggro: 3,
    parts: { head: 30, body: 40, legs: 30, tail: 25 },
    attacks: [
      { name: "BITE", power: 8 },
      { name: "TAIL SLAP", power: 6 },
      { name: "POUNCE", power: 11 }
    ],
    carve: [["JAGGI HIDE", 60, 1], ["JAGGI SCALE", 30, 2], ["SCREAMER", 10, 3]]
  },
  bullfango: {
    name: "BULLFANGO",
    rank: 1,
    hp: 100,
    aggro: 4,
    parts: { head: 35, body: 45, legs: 30, tail: 20 },
    attacks: [
      { name: "TUSK CHARGE", power: 12, heavy: true },
      { name: "HEADBUTT", power: 8 },
      { name: "STOMP", power: 7 }
    ],
    carve: [["RAW MEAT", 55, 1], ["BULLFANGO PELT", 35, 2], ["BULLFANGO HEAD", 10, 3]]
  }
};

export const SMALL_SPAWNS = {
  1: ["bullfango"],
  2: ["bullfango", "bullfango"],
  3: ["jaggi"],
  4: ["bullfango"],
  5: ["jaggi", "jaggi"],
  6: ["jaggi"],
  9: ["jaggi", "jaggi"]
};

export const PARTS = {
  head: { label: "HEAD", baseHit: 60, dmgMult: 1.5, drift: ["body"] },
  body: { label: "BODY", baseHit: 90, dmgMult: 1.0, drift: ["legs"] },
  legs: { label: "LEGS", baseHit: 80, dmgMult: 0.7, drift: ["body"] },
  tail: { label: "TAIL", baseHit: 70, dmgMult: 0.9, drift: ["body", "legs"] }
};

export const ITEMS = {
  potion: { name: "POTION", field: true, price: 60, desc: "Restores 30 HP." },
  whetstone: { name: "WHETSTONE", field: true, price: 40, desc: "Restores sharpness to MAX." },
  might: { name: "MIGHT SEED", field: true, price: 150, desc: "ATTACK +1 stage (+25% DMG) for 3 turns." },
  paintball: { name: "PAINTBALL", price: 80, desc: "Mark the big monster: the MAP tracks it for 8 turns." },
  flash: { name: "FLASH BOMB", price: 120, desc: "Monster hit chance 60% -> 30% for 2 turns." },
  shock: { name: "SHOCK TRAP", price: 400, desc: "Paralyzes the big monster 3 turns." },
  tranq: { name: "TRANQ BOMB", price: 150, desc: "2 hits on a TRAPPED monster under 25% HP = CAPTURE." }
};

export const GATHER = {
  mining: { label: "MINING", verb: "HUNTER mined the outcrop...", loot: [["IRON ORE", 50, 1], ["EARTH CRYSTAL", 30, 2], ["MACHALITE ORE", 15, 3], ["DRAGONITE ORE", 5, 4]] },
  bugs: { label: "BUGS", verb: "HUNTER swung the bug net...", loot: [["INSECT HUSK", 40, 1], ["BITTERBUG", 35, 1], ["@flash", 25]] },
  bones: { label: "BONES", verb: "HUNTER dug through the bones...", loot: [["MYSTERY BONE", 55, 1], ["MONSTER BONE S", 30, 2], ["MONSTER BONE M", 15, 3]] },
  plants: { label: "PLANTS", verb: "HUNTER picked some herbs...", loot: [["@potion", 55], ["@might", 15], ["IVY", 30, 1]] },
  mushrooms: { label: "MUSHROOMS", verb: "HUNTER foraged mushrooms...", loot: [["BLUE MUSHROOM", 45, 1], ["PARASHROOM", 30, 2], ["@tranq", 25]] },
  whetstone: { label: "WHETSTONE", verb: "HUNTER chipped the rock...", loot: [["@whetstone", 100]] },
  honey: { label: "HONEY", verb: "HUNTER scooped some honey...", loot: [["HONEY", 75, 1], ["@potion", 25]] },
  berries: { label: "BERRIES", verb: "HUNTER picked some berries...", loot: [["@paintball", 45], ["HUSKBERRY", 40, 1], ["NEEDLEBERRY", 15, 1]] },
  fish: { label: "FISH", verb: "HUNTER cast a line...", loot: [["SUSHIFISH", 55, 1], ["SLEEPYFISH", 30, 1], ["BURST ARROWANA", 15, 2]] },
  misc: { label: "MISC", verb: "HUNTER searched the area...", loot: [["THEPARAK WOOD", 45, 2], ["BAMBOO SHOOT", 30, 1], ["@potion", 25]] }
};

export const LOOT = {
  rathalos: {
    zenny: 3600,
    carve: [["RATHALOS SCALE", 40, 4], ["RATHALOS SHELL", 28, 4], ["RATHALOS WEBBING", 15, 4], ["FLAME SAC", 10, 4], ["RATHALOS MARROW", 5, 5], ["RATHALOS PLATE", 2, 6]],
    reward: [["RATHALOS SCALE", 30, 4], ["RATHALOS SHELL", 24, 4], ["WYVERN TEAR", 16, 3], ["RATHALOS WEBBING", 14, 4], ["FLAME SAC", 10, 4], ["RATHALOS MARROW", 4, 5], ["RATHALOS PLATE", 2, 6]],
    capture: [["RATHALOS SHELL", 26, 4], ["RATHALOS MARROW", 22, 5], ["LG WYVERN TEAR", 20, 5], ["RATHALOS WEBBING", 18, 4], ["RATHALOS RUBY", 8, 6], ["RATHALOS PLATE", 6, 6]],
    breaks: {
      head: [["RATHALOS SCALE", 60, 4], ["RATHALOS SHELL", 32, 4], ["RATHALOS PLATE", 8, 6]],
      body: [["RATHALOS SHELL", 70, 4], ["RATHALOS MARROW", 30, 5]],
      legs: [["RATHALOS SCALE", 60, 4], ["RATHALOS WEBBING", 40, 4]],
      tail: [["RATHALOS TAIL", 75, 4], ["RATHALOS PLATE", 20, 6], ["RATHALOS RUBY", 5, 6]]
    }
  },
  tigrex: {
    zenny: 4200,
    carve: [["TIGREX SCALE", 40, 4], ["TIGREX SHELL", 28, 4], ["TIGREX CLAW", 16, 4], ["TIGREX FANG", 10, 4], ["TIGREX MARROW", 5, 5], ["TIGREX GEM", 1, 6]],
    reward: [["TIGREX SCALE", 30, 4], ["TIGREX SHELL", 24, 4], ["WYVERN TEAR", 16, 3], ["TIGREX CLAW", 14, 4], ["TIGREX FANG", 10, 4], ["TIGREX MARROW", 4, 5], ["TIGREX GEM", 2, 6]],
    capture: [["TIGREX SHELL", 26, 4], ["TIGREX MARROW", 22, 5], ["LG WYVERN TEAR", 20, 5], ["TIGREX CLAW", 18, 4], ["TIGREX GEM", 8, 6], ["TIGREX FANG", 6, 4]],
    breaks: {
      head: [["TIGREX FANG", 60, 4], ["TIGREX SCALE", 32, 4], ["TIGREX GEM", 8, 6]],
      body: [["TIGREX SHELL", 70, 4], ["TIGREX MARROW", 30, 5]],
      legs: [["TIGREX CLAW", 65, 4], ["TIGREX SCALE", 35, 4]],
      tail: [["TIGREX TAIL", 80, 4], ["TIGREX MARROW", 15, 5], ["TIGREX GEM", 5, 6]]
    }
  }
};

export const ITEM_RAR = {};
for (const k in LOOT) {
  const L = LOOT[k];
  [L.carve, L.reward, L.capture, ...Object.values(L.breaks)].forEach(t => t.forEach(e => ITEM_RAR[e[0]] = e[2]));
}
for (const k in SMALLS) SMALLS[k].carve.forEach(e => ITEM_RAR[e[0]] = e[2]);
for (const k in GATHER) GATHER[k].loot.forEach(e => { if (!e[0].startsWith("@")) ITEM_RAR[e[0]] = e[2]; });

export const AREAS = {
  0: { name: "BASE CAMP", sub: "Supply Tent", theme: "camp", mx: 90, my: 88 },
  1: { name: "AREA 1", sub: "Spring Hollow", theme: "stream", mx: 84, my: 64, gather: ["bugs", "whetstone", "plants", "berries"] },
  2: { name: "AREA 2", sub: "Rocky Pass", theme: "rocky", mx: 62, my: 80, gather: ["mining", "mushrooms", "misc"] },
  3: { name: "AREA 3", sub: "Bamboo Grove", theme: "bamboo", mx: 43, my: 72, gather: ["mining", "misc", "plants"] },
  4: { name: "AREA 4", sub: "Theparak Meadow", theme: "meadow", mx: 76, my: 26, gather: ["misc", "mining", "plants", "berries"] },
  5: { name: "AREA 5", sub: "Old Forest", theme: "forest", mx: 48, my: 34, gather: ["misc", "mushrooms", "honey", "plants"] },
  6: { name: "AREA 6", sub: "Mountain River", theme: "river", mx: 36, my: 52, gather: ["plants", "berries", "mining", "fish"] },
  7: { name: "AREA 7", sub: "Waterfall Basin", theme: "falls", mx: 30, my: 13, gather: ["berries", "bugs", "mushrooms", "fish"] },
  8: { name: "AREA 8", sub: "Wyvern Nest", theme: "cave", mx: 18, my: 79, gather: ["bones", "bones", "whetstone", "mining"] },
  9: { name: "AREA 9", sub: "Deep Woods", theme: "woods", mx: 13, my: 57, gather: ["bugs", "honey", "misc", "mushrooms"] }
};

export const LINKS = [[0, 1], [0, 2], [1, 4], [2, 3], [2, 4], [2, 5], [3, 6], [3, 8], [4, 5], [4, 7], [5, 6], [5, 7], [6, 7], [6, 9], [8, 9]];
export const NEST = 8;
export const neighbors = (a) => LINKS.filter(l => l.includes(a)).map(l => l[0] === a ? l[1] : l[0]);
export function sideTo(a, b) {
  const dx = AREAS[b].mx - AREAS[a].mx, dy = AREAS[b].my - AREAS[a].my;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "E" : "W") : (dy > 0 ? "S" : "N");
}

export const THEMES = {
  camp: { ground: ".", path: ":", border: "#", obs: "#", clusters: 2, tall: 0.02, flower: 0.06, map: "#c8c8b0" },
  stream: { ground: ".", path: ":", border: "#", obs: "#", clusters: 4, tall: 0.08, flower: 0.03, feature: "streamV", map: "#88c8e8" },
  rocky: { ground: "g", path: ":", border: "R", obs: "R", clusters: 7, tall: 0, flower: 0, map: "#b8b8b0" },
  bamboo: { ground: ".", path: ":", border: "b", obs: "b", clusters: 8, tall: 0.05, flower: 0, map: "#a8d878" },
  meadow: { ground: ".", path: ":", border: "#", obs: "#", clusters: 3, tall: 0.25, flower: 0.08, map: "#c0e880" },
  forest: { ground: ".", path: ":", border: "#", obs: "#", clusters: 10, tall: 0.1, flower: 0.02, map: "#78a850" },
  river: { ground: ".", path: ":", border: "#", obs: "#", clusters: 4, tall: 0.08, flower: 0.02, feature: "riverH", map: "#68b8e0" },
  falls: { ground: "s", path: ":", border: "R", obs: "R", clusters: 4, tall: 0, flower: 0, feature: "pool", map: "#d8b060" },
  cave: { ground: "c", path: "c", border: "W", obs: "W", clusters: 6, tall: 0, flower: 0, bones: 0.04, map: "#9a8ec8" },
  woods: { ground: ".", path: ":", border: "#", obs: "#", clusters: 12, tall: 0.2, flower: 0, map: "#6a9a48" }
};

export const SOLID = new Set(["#", "R", "b", "W", "~", "w"]);
export const WATERS = new Set(["~", "-", "w"]);
export const MW = 24, MH = 18, CXT = 12, CYT = 9;
export const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPP = { up: "down", down: "up", left: "right", right: "left" };
export const dirOf = (sx, sy) => sx > 0 ? "right" : sx < 0 ? "left" : sy > 0 ? "down" : "up";
export const SIDE_IN = { N: [0, 1, "down"], S: [0, -1, "up"], W: [1, 0, "right"], E: [-1, 0, "left"] };
export const CAMP_SPAWN = { x: 12, y: 9, dir: "down" };

export function rng32(seed) {
  return function() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function weighted(table, rnd = Math.random) {
  const total = table.reduce((s, e) => s + e[1], 0);
  let r = rnd() * total;
  for (const e of table) {
    r -= e[1];
    if (r < 0) return { name: e[0], rar: e[2] || 1 };
  }
  const e = table[table.length - 1];
  return { name: e[0], rar: e[2] || 1 };
}

export const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rgbHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const mixRgb = (c, t, f) => c.map((v, i) => v + (t[i] - v) * f);
export const lighten = (h, f = 0.35) => rgbHex(mixRgb(hexRgb(h), [255, 255, 255], f));
export const darken = (h, f = 0.35) => rgbHex(mixRgb(hexRgb(h), [0, 0, 0], f));
const INK = [18, 12, 26];

function inPoly(p, x, y) {
  let c = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
    if ((yi > y) !== (yj > y) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) c = !c;
  }
  return c;
}
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)) : 0;
  return Math.hypot(x1 + t * dx - px, y1 + t * dy - py);
}
function inShape(t, o, x, y) {
  switch (t) {
    case "e": { const dx = (x - o[2]) / o[4], dy = (y - o[3]) / o[5]; return dx * dx + dy * dy <= 1; }
    case "r": return x >= o[2] && x < o[2] + o[4] && y >= o[3] && y < o[3] + o[5];
    case "p": return inPoly(o[2], x, y);
    case "l": return segDist(x, y, o[2], o[3], o[4], o[5]) <= o[6] / 2;
  }
  return false;
}

export function renderArt(def, scale = 1, grey = false) {
  const W = Math.max(1, Math.round(def.w * scale)), H = Math.max(1, Math.round(def.h * scale));
  const ops = def.ops || [], types = ops.map((o) => o[0].replace("!", "")), inner = ops.map((o) => o[0][0] === "!");
  const cols = ops.map((o) => hexRgb(o[1])), id = new Int16Array(W * H).fill(-1);
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / scale, y = (py + 0.5) / scale;
      for (let i = ops.length - 1; i >= 0; i--)
        if (inShape(types[i], ops[i], x, y)) { id[py * W + px] = i; break; }
    }
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d"), img = ctx.createImageData(W, H), d = img.data;
  const at = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? -1 : id[y * W + x];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = id[y * W + x]; let rgb;
      if (i >= 0) {
        rgb = cols[i];
        const up = at(x, y - 1), dn = at(x, y + 1), lf = at(x - 1, y), rt = at(x + 1, y);
        if (inner[i] && [up, dn, lf, rt].some((v) => v >= 0 && v < i)) rgb = mixRgb(rgb, INK, 0.55);
        else if (up < 0) rgb = mixRgb(rgb, [255, 255, 255], 0.3);
        else if (dn < 0) rgb = mixRgb(rgb, [0, 0, 0], 0.3);
        else if (up > i) rgb = mixRgb(rgb, [0, 0, 0], 0.2);
      } else {
        const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].find((v) => v >= 0);
        if (n === undefined) continue;
        rgb = mixRgb(cols[n], INK, 0.75);
      }
      if (grey) {
        const gv = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
        rgb = mixRgb(rgb, [gv, gv, gv], 0.85).map((v) => v * 0.85);
      }
      const k = (y * W + x) * 4;
      d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

export const ITEM_ART = {
  potion: { w: 16, h: 16, ops: [["r", "#8a5a30", 6, 1, 4, 3], ["r", "#d8e8f0", 6, 4, 4, 3], ["!e", "#d8e8f0", 8, 10, 5.5, 5], ["e", "#40c060", 8, 11, 4.5, 3.6], ["e", "#b0f8c0", 6, 9, 1.2, 1.2]] },
  whetstone: { w: 16, h: 16, ops: [["!p", "#7a8494", [2, 10, 10, 3, 14, 6, 6, 13]], ["p", "#b8c0cc", [3, 9.5, 10, 3.8, 12.5, 5.5, 5.5, 11]], ["l", "#e0b040", 6, 12.5, 9, 9.5, 1.6]] },
  might: { w: 16, h: 16, ops: [["l", "#4a7a20", 8, 2.5, 8, 5, 1.2], ["!p", "#48a040", [8, 4.5, 12, 1, 14, 2.5, 9.5, 5.5]], ["!e", "#d83838", 8, 10, 5, 5.5], ["e", "#ff8a78", 6.3, 8, 1.4, 2]] },
  paintball: { w: 16, h: 16, ops: [["e", "#e04898", 13, 3.5, 1.4, 1.4], ["e", "#e04898", 2.5, 4, 1, 1], ["!e", "#e04898", 8, 9.5, 5.8, 5.8], ["e", "#ffa8d8", 6, 7.5, 2, 1.8]] },
  flash: { w: 16, h: 16, ops: [["l", "#a07040", 10, 6, 12, 3, 1.2], ["!e", "#6a7488", 7.5, 10, 5.5, 5.5], ["e", "#b0bccc", 5.5, 8, 1.6, 1.6], ["p", "#f8e040", [12.5, 0, 13.4, 1.8, 15.5, 2, 13.8, 3.2, 14.4, 5.4, 12.5, 4.2, 10.6, 5.4, 11.2, 3.2, 9.5, 2, 11.6, 1.8]]] },
  shock: { w: 16, h: 16, ops: [["e", "#4a4a54", 8, 11.5, 7, 3.5], ["e", "#e8c030", 8, 10.5, 6, 2.8], ["e", "#4a4a54", 8, 10.5, 3.5, 1.4], ["!p", "#f8f070", [9.5, 0, 5, 7, 8, 7, 6, 13, 12, 5, 9, 5, 11.5, 0]]] },
  tranq: { w: 16, h: 16, ops: [["e", "#c8a8f0", 12, 3.5, 2.6, 2], ["e", "#c8a8f0", 9, 2.5, 2, 1.5], ["!e", "#ececf4", 7.5, 10, 5.5, 5.5], ["r", "#8058c0", 2, 9, 11, 2], ["e", "#ffffff", 5.5, 7.5, 1.3, 1.3]] }
};

export const WEAPON_ART = {
  greatsword: { w: 16, h: 16, ops: [["l", "#6a4020", 1, 15, 4, 12, 1.8], ["!l", "#d8a838", 1.5, 10, 6, 14.5, 1.8], ["!p", "#b8c2d0", [3, 11, 11, 2.5, 14.5, 1.5, 13.5, 5, 5, 13]], ["l", "#f0f4f8", 4.5, 11.5, 13, 2.5, 0.9]] },
  longsword: { w: 16, h: 16, ops: [["l", "#3a2a5a", 1, 15, 4.5, 11.5, 1.8], ["!e", "#d8a838", 5, 11, 1.8, 1.8], ["!l", "#d8e0ea", 5.5, 10.5, 15, 1, 1.6]] }
};

export const GATHER_ART = {
  mining: { w: 16, h: 16, ops: [["!p", "#7e8088", [1, 15, 3, 7, 7, 3, 12, 4, 15, 9, 15, 15]], ["p", "#a8aab2", [3.5, 8, 7, 4, 11, 5, 9, 9, 4, 10]], ["r", "#60c8f0", 6, 8, 2, 2], ["r", "#f0d060", 10, 10, 2, 2], ["r", "#60c8f0", 4, 11, 1.5, 1.5]] },
  bugs: { w: 16, h: 16, ops: [["l", "#2a3a2a", 3, 8, 1, 6, 0.9], ["l", "#2a3a2a", 13, 8, 15, 6, 0.9], ["l", "#2a3a2a", 3, 12, 1, 14, 0.9], ["l", "#2a3a2a", 13, 12, 15, 14, 0.9], ["l", "#2a3a2a", 7, 3, 5, 1, 0.8], ["l", "#2a3a2a", 9, 3, 11, 1, 0.8], ["e", "#2a3a2a", 8, 4.5, 2.5, 2], ["!e", "#3a8a48", 8, 10, 4.5, 5], ["l", "#1e5028", 8, 5.5, 8, 15, 0.8], ["e", "#90e0a0", 6.3, 8, 1, 1.6]] },
  bones: { w: 16, h: 16, ops: [["l", "#f0e8d8", 3, 13, 13, 6, 2.2], ["e", "#f0e8d8", 2, 12, 1.6, 1.6], ["e", "#f0e8d8", 3.5, 14.2, 1.6, 1.6], ["e", "#f0e8d8", 13, 5, 1.6, 1.6], ["e", "#f0e8d8", 14.3, 7.3, 1.6, 1.6], ["!e", "#e4d8c0", 6, 6, 3.5, 3], ["r", "#3a3030", 4.5, 5.5, 1, 1], ["r", "#3a3030", 6.8, 5.5, 1, 1]] },
  plants: { w: 16, h: 16, ops: [["!p", "#3a9a40", [8, 15, 3, 9, 1.5, 3, 7, 7]], ["!p", "#58c050", [8, 15, 13, 8, 14.5, 2, 9, 7]], ["!p", "#48b048", [8, 15, 6.5, 6, 8, 1, 10, 6]], ["l", "#2a7030", 8, 15, 8, 4, 0.6]] },
  mushrooms: { w: 16, h: 16, ops: [["r", "#f0e8d0", 6.5, 8, 3, 6.5], ["!e", "#4870d0", 8, 7.5, 6, 4], ["e", "#c0d8ff", 6, 6, 1.2, 1], ["e", "#c0d8ff", 10.3, 7, 1, 0.8], ["r", "#f0e8d0", 12, 11, 1.5, 3.5], ["!e", "#4870d0", 12.8, 11, 2.5, 2]] },
  whetstone: { w: 16, h: 16, ops: [["!p", "#787a86", [1, 15, 4, 9, 10, 8, 15, 12, 15, 15]], ["p", "#a0a2ae", [4, 9.5, 10, 8.5, 12, 10.5, 6, 11.5]], ["p", "#f8e050", [8, 1, 9, 4, 12, 5, 9, 6, 8, 9, 7, 6, 4, 5, 7, 4]]] },
  honey: { w: 16, h: 16, ops: [["!p", "#d89818", [8, 1.5, 14, 5, 14, 11, 8, 14.5, 2, 11, 2, 5]], ["p", "#f8d050", [8, 4, 11, 6, 11, 9.5, 8, 11.5, 5, 9.5, 5, 6]], ["e", "#f0b830", 8, 14.3, 1.3, 1.6]] },
  berries: { w: 16, h: 16, ops: [["!p", "#48a040", [8, 2, 13, 1, 11, 5]], ["!e", "#4860d0", 6, 9, 3, 3], ["!e", "#4860d0", 10.5, 8, 3, 3], ["!e", "#4860d0", 8.5, 12.3, 3, 3], ["r", "#a8c0ff", 5, 8, 1, 1], ["r", "#a8c0ff", 9.5, 7, 1, 1], ["r", "#a8c0ff", 7.5, 11.3, 1, 1]] },
  fish: { w: 16, h: 16, ops: [["!p", "#4078b0", [11, 8, 15, 4, 15, 12]], ["!p", "#4078b0", [6, 5, 9, 3, 9, 5.5]], ["!e", "#5898d0", 7, 8, 5.5, 3.5], ["e", "#c8e0f0", 7, 9.5, 4, 1.5], ["r", "#202020", 3, 7, 1, 1]] },
  misc: { w: 16, h: 16, ops: [["!r", "#8a5a2c", 2, 4, 12, 10], ["r", "#c88a48", 3, 5, 10, 3.5], ["r", "#c88a48", 3, 9.5, 10, 3.5], ["r", "#5a3a1e", 3, 8.5, 10, 1], ["r", "#f8e8b0", 7, 1, 2, 2]] }
};

export const ICON_ART = {
  bubble: { w: 16, h: 16, ops: [["!p", "#f8f8f8", [4, 9, 3, 15, 8, 11]], ["!e", "#f8f8f8", 8, 7, 7, 5], ["r", "#383838", 4, 6.5, 1.5, 1.5], ["r", "#383838", 7.3, 6.5, 1.5, 1.5], ["r", "#383838", 10.5, 6.5, 1.5, 1.5]] },
  tent: { w: 16, h: 16, ops: [["!p", "#d84838", [1, 14, 8, 2, 15, 14]], ["p", "#f0d8b0", [5, 14, 8, 7, 11, 14]], ["p", "#402018", [6.5, 14, 8, 10, 9.5, 14]]] }
};

export const MON_ART = {
  rathalos: {
    w: 72, h: 56,
    ops: [
      ["!p", "#7a1e1c", [42, 22, 50, 2, 62, 4, 70, 14, 66, 24, 56, 28]], ["!p", "#c8342a", [50, 30, 60, 34, 70, 42, 71, 46, 64, 44, 52, 40]],
      ["p", "#2a1a1a", [62, 36, 66, 33, 65, 39]], ["p", "#2a1a1a", [68, 41, 71, 38, 71, 44]], ["!p", "#8a2020", [48, 36, 54, 36, 54, 48, 50, 50]],
      ["e", "#c8342a", 40, 32, 14, 10], ["e", "#d89a6a", 36, 37, 10, 5], ["p", "#2a1a1a", [40, 23, 43, 17, 45, 23]],
      ["p", "#2a1a1a", [46, 24, 50, 19, 51, 26]], ["!e", "#b02a24", 44, 40, 6, 6], ["!p", "#b02a24", [42, 42, 48, 42, 47, 50, 43, 50]],
      ["!p", "#3a2424", [40, 50, 50, 50, 51, 53, 39, 53]], ["p", "#e8e0d0", [38, 53.5, 40, 50, 41.5, 53.5]], ["!l", "#b02a24", 30, 38, 28, 48, 4],
      ["!p", "#3a2424", [24, 48, 32, 48, 32, 51, 24, 51]], ["p", "#e8e0d0", [22.5, 51, 24, 48, 25.5, 51]],
      ["!p", "#a82e28", [34, 26, 24, 6, 30, 1, 44, 4, 56, 12, 50, 20, 42, 28]], ["l", "#5a1818", 36, 24, 30, 2, 1.5],
      ["l", "#5a1818", 36, 24, 44, 4, 1.3], ["l", "#5a1818", 36, 24, 54, 12, 1.3], ["p", "#e8e0d0", [29, 0, 32, 2.5, 28, 4]],
      ["!p", "#c8342a", [34, 28, 30, 22, 22, 14, 16, 18, 24, 28]], ["!p", "#c8342a", [4, 22, 10, 15, 18, 12, 24, 15, 24, 22, 16, 25, 8, 25]],
      ["p", "#8a2020", [6, 23, 16, 23, 20, 26, 10, 27]], ["p", "#f0f0f0", [8, 23, 9, 25, 10, 23]], ["p", "#f0f0f0", [12, 23, 13, 25, 14, 23]],
      ["!p", "#2a1a1a", [19, 13, 28, 7, 24, 15]], ["!p", "#2a1a1a", [16, 12.5, 22, 6, 20, 13]], ["p", "#e8dcc0", [3, 22, 6, 20, 6, 24]],
      ["e", "#f8e040", 14, 17.5, 1.8, 1.3], ["r", "#202020", 13.3, 17, 1, 1]
    ]
  },
  tigrex: {
    w: 72, h: 56,
    ops: [
      ["!p", "#b08030", [50, 34, 58, 36, 58, 50, 52, 52]], ["!p", "#e2b44c", [54, 26, 64, 20, 71, 13, 71, 20, 62, 30, 56, 36]],
      ["p", "#3a58b0", [62, 22, 64, 20, 66, 26, 64, 27]], ["p", "#3a58b0", [67, 16, 69, 15, 70, 21, 68, 22]],
      ["!p", "#b08030", [34, 26, 40, 28, 38, 46, 30, 48]], ["e", "#e2b44c", 42, 30, 15, 11], ["e", "#f0dca0", 40, 36, 11, 4],
      ["p", "#3a58b0", [38, 19, 42, 19, 40, 28, 37, 27]], ["p", "#3a58b0", [45, 19, 49, 20, 46, 28, 43, 27]], ["p", "#3a58b0", [52, 22, 55, 24, 51, 30, 49, 28]],
      ["p", "#5a4020", [34, 21, 37, 16, 39, 21]], ["!e", "#e2b44c", 50, 38, 6, 7], ["!p", "#e2b44c", [46, 40, 55, 40, 56, 50, 48, 50]],
      ["p", "#e8e0d0", [46, 50, 49, 50, 47, 54]], ["p", "#e8e0d0", [51, 50, 54, 50, 52, 54]], ["p", "#e8e0d0", [54.5, 50, 57, 50, 56.5, 54]],
      ["!p", "#8a6a40", [30, 28, 42, 30, 38, 40, 32, 38]], ["!p", "#e2b44c", [24, 24, 34, 22, 34, 34, 30, 46, 22, 50, 18, 48]],
      ["p", "#3a58b0", [26, 30, 30, 29, 28, 36, 25, 36]], ["p", "#e8e0d0", [17, 48, 20, 47, 16, 53]], ["p", "#e8e0d0", [21, 49, 24, 48, 21, 54]],
      ["p", "#e8e0d0", [25, 48, 28, 47, 26, 53]], ["!p", "#e2b44c", [2, 24, 6, 14, 14, 9, 26, 9, 32, 16, 32, 26, 26, 32, 12, 34, 4, 32]],
      ["p", "#5a1818", [3, 24, 22, 22, 28, 28, 20, 31, 6, 30]], ["p", "#f8f8f0", [5, 24, 7, 27, 9, 24]], ["p", "#f8f8f0", [11, 23, 13, 26, 15, 23]],
      ["p", "#f8f8f0", [17, 22.5, 19, 25.5, 21, 22.5]], ["p", "#f8f8f0", [8, 30, 10, 27, 12, 30]], ["p", "#f8f8f0", [15, 30, 17, 27, 19, 30]],
      ["p", "#3a58b0", [16, 10, 20, 10, 18, 16, 15, 16]], ["p", "#3a58b0", [23, 10, 26, 11, 24, 17, 21, 16]], ["l", "#7a5020", 9, 14, 16, 13, 1.2],
      ["e", "#f04020", 12, 16.5, 1.8, 1.3], ["r", "#1a1010", 11.3, 16, 1, 1]
    ]
  },
  jaggi: {
    w: 32, h: 32,
    ops: [
      ["!p", "#9a78c8", [20, 16, 30, 10, 31, 13, 22, 22]], ["l", "#6a4c98", 20, 20, 22, 28, 2.2], ["e", "#9a78c8", 17, 18, 7, 5],
      ["e", "#f0d0a8", 15, 20, 5, 2.5], ["l", "#e8782c", 16, 13.5, 18, 17, 1.2], ["l", "#e8782c", 20, 14, 21, 17.5, 1.2],
      ["!l", "#9a78c8", 15, 21, 13, 28, 2.6], ["l", "#6a4c98", 11, 28.5, 15, 28.5, 1.4], ["l", "#9a78c8", 11, 17, 8, 21, 1.4],
      ["!p", "#9a78c8", [13, 15, 8, 8, 5, 10, 10, 19]], ["e", "#9a78c8", 5.5, 9, 4.5, 3], ["p", "#9a78c8", [1, 10.5, 4, 7, 5, 12]],
      ["!p", "#e8782c", [7, 7, 11, 2.5, 11, 9]], ["l", "#6a4c98", 1.5, 11, 6, 11.5, 1], ["r", "#f8e040", 4, 8, 1.2, 1]
    ]
  },
  bullfango: {
    w: 32, h: 32,
    ops: [
      ["r", "#4a2c18", 22, 22, 3, 7], ["r", "#4a2c18", 10, 22, 3, 7], ["l", "#4a2c18", 27, 15, 30, 13, 1.2],
      ["e", "#7a4c2c", 17, 17, 10, 7], ["e", "#9a6a44", 16, 21, 8, 2.5], ["p", "#2e1c10", [9, 11, 12, 7, 15, 10, 18, 6, 21, 10, 24, 8, 26, 13, 16, 13]],
      ["!r", "#5e3a20", 19, 22, 3.5, 7], ["!r", "#5e3a20", 8, 22, 3.5, 7], ["r", "#2a1a10", 19, 28, 3.5, 1.5],
      ["r", "#2a1a10", 8, 28, 3.5, 1.5], ["!e", "#7a4c2c", 7, 18, 6, 5.5], ["p", "#4a2c18", [8, 12, 11, 10, 11, 14]],
      ["!e", "#d8a088", 2.8, 20, 2.5, 2.2], ["r", "#6a3a30", 1.6, 19.5, 1, 1], ["!p", "#f4ecd8", [4, 21, 2, 15.5, 6, 20]], ["r", "#f04030", 6, 16, 1.2, 1.2]
    ]
  }
};

export const SKY = {
  camp: ["#382c20", "#241c14", "#12100e"],
  stream: ["#243024", "#182018", "#0e140e"],
  rocky: ["#3a342c", "#26201a", "#14100c"],
  bamboo: ["#2c3824", "#1c2618", "#10160e"],
  meadow: ["#383824", "#262618", "#14140e"],
  forest: ["#243024", "#182018", "#0e140e"],
  river: ["#242c38", "#181c26", "#0e1016"],
  falls: ["#283438", "#1a2226", "#0e1316"],
  cave: ["#1e1624", "#140e1a", "#0a060d"],
  woods: ["#243424", "#182418", "#0e160e"]
};

export const BGC = {};
export const ART = {};
export const DATA = {};

export function hunterBackDef(weapon) {
  const sword = weapon === "greatsword"
    ? [["!p", "#b8c2d0", [30, 6, 37, 8, 14, 48, 7, 46]], ["l", "#eef2f8", 33.5, 7.5, 10.5, 46.5, 1.2], ["!l", "#d8a838", 27, 3, 41, 10, 3], ["l", "#5a3418", 35.5, 5, 41, -1, 2.6]]
    : [["!l", "#d8e0ea", 38, 1, 9, 47, 2.4], ["l", "#ffffff", 38, 1, 9, 47, 0.7], ["!e", "#d8a838", 35.5, 5.5, 2.6, 2.6], ["l", "#3a2a5a", 37, 3, 42, -2, 2.4]];
  return { w: 48, h: 52, ops: [...sword, ["r", "#3a3044", 15, 36, 7, 12], ["r", "#3a3044", 26, 36, 7, 12]] };
}

export const FONT35 = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111",
  4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001001001001",
  8: "111101111101111", 9: "111101111001111", C: "111100100100111", Z: "111001010100111"
};

export function pxText(ctx, s, x, y, col) {
  ctx.fillStyle = col;
  [...String(s)].forEach((ch, i) => {
    const g = FONT35[ch];
    if (g)
      for (let p = 0; p < 15; p++)
        if (g[p] === "1") ctx.fillRect(x + i * 4 + (p % 3), y + Math.floor(p / 3), 1, 1);
  });
}

export function genArea(id) {
  const A = AREAS[id], th = THEMES[A.theme], r = rng32(9000 + id * 101);
  const g = [];
  const blockers = new Set();
  const carved = new Set();
  const reach = new Set();

  for (let y = 0; y < MH; y++) {
    const row = [];
    for (let x = 0; x < MW; x++) {
      if (x === 0 || x === MW - 1 || y === 0 || y === MH - 1) {
        row.push(th.border);
        blockers.add(`${x},${y}`);
      } else {
        const v = r();
        const tile = v < th.tall ? "," : v < th.tall + th.flower ? "f" : th.ground;
        row.push(tile);
        reach.add(`${x},${y}`);
      }
    }
    g.push(row);
  }
  return { id, theme: A.theme, w: MW, h: MH, tiles: g, exits: [], objects: [], gathers: [], blockers, carved, reach };
}

export const MAPS = {};
for (const a in AREAS) MAPS[a] = genArea(+a);

export function findFree(M, x0, y0, avoid, allowPath) {
  let best = null, bd = Infinity;
  M.reach.forEach((k) => {
    const [x, y] = k.split(",").map(Number), c = M.tiles[y][x];
    if (M.blockers.has(k) || c === "E" || c === "-") return;
    if (!allowPath && M.carved.has(k)) return;
    const d = (x - x0) ** 2 + (y - y0) ** 2;
    if (d < bd) { bd = d; best = { x, y }; }
  });
  return best || { x: CXT, y: CYT };
}