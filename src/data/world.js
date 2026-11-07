/* Sacred Forest (MHP3rd). mx/my = minimap position (0–100), also used
   to decide which edge of an area each exit sits on. */
export const AREAS = {
  0: { name: 'BASE CAMP', sub: 'Supply Tent',     theme: 'camp',   mx: 90, my: 88 },
  1: { name: 'AREA 1',    sub: 'Spring Hollow',   theme: 'stream', mx: 84, my: 64, gather: ['bugs', 'whetstone', 'plants', 'berries'] },
  2: { name: 'AREA 2',    sub: 'Rocky Pass',      theme: 'rocky',  mx: 62, my: 80, gather: ['mining', 'mushrooms', 'misc'] },
  3: { name: 'AREA 3',    sub: 'Bamboo Grove',    theme: 'bamboo', mx: 43, my: 72, gather: ['mining', 'misc', 'plants'] },
  4: { name: 'AREA 4',    sub: 'Theparak Meadow',   theme: 'meadow', mx: 76, my: 26, gather: ['misc', 'mining', 'plants', 'berries'] },
  5: { name: 'AREA 5',    sub: 'Old Forest',      theme: 'forest', mx: 48, my: 34, gather: ['misc', 'mushrooms', 'honey', 'plants'] },
  6: { name: 'AREA 6',    sub: 'Mountain River',  theme: 'river',  mx: 36, my: 52, gather: ['plants', 'berries', 'mining', 'fish'] },
  7: { name: 'AREA 7',    sub: 'Waterfall Basin', theme: 'falls',  mx: 30, my: 13, gather: ['berries', 'bugs', 'mushrooms', 'fish'] },
  8: { name: 'AREA 8',    sub: 'Wyvern Nest',     theme: 'cave',   mx: 18, my: 79, gather: ['bones', 'bones', 'whetstone', 'mining'] },
  9: { name: 'AREA 9',    sub: 'Deep Woods',      theme: 'woods',  mx: 13, my: 57, gather: ['bugs', 'honey', 'misc', 'mushrooms'] }
};
export const LINKS = [[0,1],[0,2],[1,4],[2,3],[2,4],[2,5],[3,6],[3,8],[4,5],[4,7],[5,6],[5,7],[6,7],[6,9],[8,9]];
export const NEST = 8;   // weakened monsters limp here to sleep

export const neighbors = a => LINKS.filter(l => l.includes(a)).map(l => l[0] === a ? l[1] : l[0]);
export function sideTo(a, b) {
  const dx = AREAS[b].mx - AREAS[a].mx, dy = AREAS[b].my - AREAS[a].my;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
}

/* Tile legend: . grass  , tall grass  f flowers  : path  g gravel  s sand  c cave floor
   # tree  R rock  b bamboo  W cave wall  ~ water  w waterfall  - ford  x bones  E exit */
export const THEMES = {
  camp:   { ground: '.', path: ':', border: '#', obs: '#', clusters: 2,  tall: .02, flower: .06, map: '#c8c8b0' },
  stream: { ground: '.', path: ':', border: '#', obs: '#', clusters: 4,  tall: .08, flower: .03, feature: 'streamV', map: '#88c8e8' },
  rocky:  { ground: 'g', path: ':', border: 'R', obs: 'R', clusters: 7,  tall: 0,   flower: 0,   map: '#b8b8b0' },
  bamboo: { ground: '.', path: ':', border: 'b', obs: 'b', clusters: 8,  tall: .05, flower: 0,   map: '#a8d878' },
  meadow: { ground: '.', path: ':', border: '#', obs: '#', clusters: 3,  tall: .25, flower: .08, map: '#c0e880' },
  forest: { ground: '.', path: ':', border: '#', obs: '#', clusters: 10, tall: .10, flower: .02, map: '#78a850' },
  river:  { ground: '.', path: ':', border: '#', obs: '#', clusters: 4,  tall: .08, flower: .02, feature: 'riverH', map: '#68b8e0' },
  falls:  { ground: 's', path: ':', border: 'R', obs: 'R', clusters: 4,  tall: 0,   flower: 0,   feature: 'pool', map: '#d8b060' },
  cave:   { ground: 'c', path: 'c', border: 'W', obs: 'W', clusters: 6,  tall: 0,   flower: 0,   bones: .04, map: '#9a8ec8' },
  woods:  { ground: '.', path: ':', border: '#', obs: '#', clusters: 12, tall: .20, flower: 0,   map: '#6a9a48' },
  village: { ground: '.', path: ':', border: '#', obs: '#', clusters: 0, tall: .04, flower: .06, map: '#d8c890' },
  farm:    { ground: '.', path: ':', border: '#', obs: '#', clusters: 0, tall: 0, flower: 0, map: '#c8b070' },
  hub:     { ground: 'h', path: 'h', border: 'H', obs: 'H', clusters: 0, tall: 0, flower: 0, map: '#b89060' }
};

/* Solid tiles: water, waterfall, fence, wood wall, plus every theme's border and obstacle
   (trees, rocks, bamboo, cave walls). Built from THEMES so a new theme can't forget one. */
export const SOLID = new Set(['~', 'w', 'n', 'H', ...Object.values(THEMES).flatMap(t => [t.border, t.obs])]);
export const WATERS = new Set(['~', '-', 'w']);
export const MW = 24, MH = 18;     // area size in tiles (viewport 15×10, camera scrolls)
export const CXT = 12, CYT = 9;    // area centre: every path converges here
export const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPP  = { up: 'down', down: 'up', left: 'right', right: 'left' };
export const dirOf = (sx, sy) => sx > 0 ? 'right' : sx < 0 ? 'left' : sy > 0 ? 'down' : 'up';
export const SIDE_IN = { N: [0, 1, 'down'], S: [0, -1, 'up'], W: [1, 0, 'right'], E: [-1, 0, 'left'] };
export const CAMP_SPAWN = { x: 16, y: 6, dir: 'down' };
/* Village hub (not part of the Sacred Forest graph). Its GATE exit leads to the quest. */
/* Town areas (not part of the Sacred Forest graph). GATE exits depart for the quest. */
export const VILLAGE = 'village', FARM = 'farm', HUB = 'hub', GATE = 'gate';
export const TOWNS = [VILLAGE, FARM, HUB];
export const isTown = a => TOWNS.includes(a);
export const TOWN_INFO = {
  [VILLAGE]: { name: 'THEPARAK VILLAGE', sub: 'Village Square',   theme: 'village' },
  [FARM]:    { name: 'THEPARAK FARM',    sub: 'Fields & Groves',  theme: 'farm' },
  [HUB]:     { name: 'GATHERING HUB',  sub: "Hunters' Guild",   theme: 'hub' }
};
/** Where you appear when returning from a quest. */
export const TOWN_SPAWN = { [VILLAGE]: { x: 12, y: 11, dir: 'down' }, [HUB]: { x: 11, y: 15, dir: 'up' } };
export const VILLAGE_SPAWN = TOWN_SPAWN[VILLAGE];
export const areaInfo = a => TOWN_INFO[a] || AREAS[a];

export const NPC_DEFS = [
  { id: 'chief',        area: VILLAGE, at: [7, 6],   name: 'VILLAGE CHIEF',  look: 'chief',        wander: false },
  { id: 'merchant',     area: VILLAGE, at: [16, 6],  name: 'MERCHANT',       look: 'merchant',     wander: false },
  { id: 'smith',        area: VILLAGE, at: [15, 15], name: 'BLACKSMITH',     look: 'smith',        wander: false },
  { id: 'veteran',      area: VILLAGE, at: [14, 11], name: 'VETERAN HUNTER', look: 'veteran',      wander: false },
  { id: 'kid',          area: VILLAGE, at: [8, 10],  name: 'VILLAGE KID',    look: 'kid',          wander: true },
  { id: 'chef',         area: HUB,     at: [5, 3],   name: 'FELYNE CHEF',    look: 'chef',         wander: false },
  { id: 'receptionist', area: HUB,     at: [18, 3],  name: 'QUEST HANDLER',  look: 'receptionist', wander: false },
  { id: 'campcat',      area: 0,       at: [9, 6],   name: 'CAMP FELYNE',    look: 'cat',          wander: true },
  { id: 'comrade',      area: 3,       at: [16, 13], name: 'FELYNE COMRADE', look: 'cat2',         wander: true },
];