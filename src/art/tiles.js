/* 16×16 tiles plus the overworld hunter and Felyne sprites (pixel strings). */
import { rng32 } from '../core/utils.js';

export function paint(fn) { const c = document.createElement('canvas'); c.width = c.height = 16; fn(c.getContext('2d')); return c; }
function speck(x, r, base, dots) {
  x.fillStyle = base; x.fillRect(0, 0, 16, 16);
  dots.forEach(([col, n]) => { x.fillStyle = col; for (let i = 0; i < n; i++) x.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1); });
}
const variants = (n, seed, fn) => Array.from({ length: n }, (_, i) => paint(x => fn(x, rng32(seed + i * 31))));

function drawPine(x) {
  const rows = [[1,7,8],[2,6,9],[3,5,10],[4,4,11],[5,5,10],[6,3,12],[7,2,13],[8,4,11],[9,2,13],[10,1,14],[11,1,14],[12,3,12]];
  x.fillStyle = '#00000033'; x.fillRect(3, 14, 11, 2);
  x.fillStyle = '#7a5030'; x.fillRect(7, 12, 3, 4);
  rows.forEach(([y, a, b]) => {
    x.fillStyle = '#1f5a30'; x.fillRect(a, y, b - a + 1, 1);
    if (b - a > 1) { x.fillStyle = '#4aa850'; x.fillRect(a + 1, y, b - a - 1, 1); x.fillStyle = '#86d870'; x.fillRect(a + 1, y, Math.max(1, (b - a) >> 2), 1); }
  });
  x.fillStyle = '#2f8a40'; x.fillRect(9, 9, 2, 1); x.fillRect(11, 11, 2, 1); x.fillRect(8, 6, 2, 1);
}
function drawRock(x) {
  const rows = [[3,5,10],[4,3,12],[5,2,13],[6,2,13],[7,1,14],[8,1,14],[9,1,14],[10,1,14],[11,2,13],[12,3,12],[13,4,11]];
  x.fillStyle = '#00000030'; x.fillRect(2, 13, 13, 2);
  rows.forEach(([y, a, b]) => { x.fillStyle = '#55555f'; x.fillRect(a, y, b - a + 1, 1); x.fillStyle = y < 8 ? '#b4b4bc' : '#94949e'; x.fillRect(a + 1, y, b - a - 1, 1); });
  x.fillStyle = '#dcdce4'; x.fillRect(5, 5, 3, 1); x.fillRect(4, 6, 2, 1);
}
function drawBamboo(x) {
  [2, 7, 12].forEach((bx, i) => {
    x.fillStyle = '#2f7a2c'; x.fillRect(bx, 0, 3, 16);
    x.fillStyle = '#78c850'; x.fillRect(bx + 1, 0, 1, 16);
    x.fillStyle = '#2a5a20'; x.fillRect(bx, (i * 5 + 3) % 16, 3, 1); x.fillRect(bx, (i * 5 + 11) % 16, 3, 1);
  });
  x.fillStyle = '#58b048'; x.fillRect(4, 4, 3, 1); x.fillRect(9, 9, 3, 1); x.fillRect(14, 6, 2, 1);
}

/** Ground tiles (by tile char) and overlay tiles drawn on top. */
export const TILES = {}, OVER = {};
TILES['.'] = variants(3, 11, (x, r) => speck(x, r, '#8ed8a4', [['#a8ecbc', 10], ['#72c48c', 6]]));
TILES[':'] = variants(3, 21, (x, r) => speck(x, r, '#d6f0c4', [['#bcdcac', 9], ['#ecfadc', 5]]));
TILES['g'] = variants(3, 31, (x, r) => speck(x, r, '#b4b6ac', [['#9a9c92', 12], ['#cfd1c8', 6]]));
TILES['s'] = variants(3, 41, (x, r) => speck(x, r, '#ecd590', [['#d4ba70', 10], ['#f8e8b0', 6]]));
TILES['c'] = variants(3, 51, (x, r) => speck(x, r, '#9a8ec8', [['#8074b0', 12], ['#b4aadc', 6]]));
TILES['W'] = variants(2, 61, (x, r) => { speck(x, r, '#4e4668', [['#3a3452', 14]]); x.fillStyle = '#6e6690'; for (let i = 0; i < 4; i++) x.fillRect(Math.floor(r() * 12), Math.floor(r() * 14), 4, 1); });
TILES['~'] = [0, 1].map(f => paint(x => {
  x.fillStyle = '#4a8ee0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#86bef6';
  [[2, 1], [8, 7], [13, 3]].forEach(([y, o]) => { for (let i = 0; i < 5; i++) x.fillRect((o + i + f * 3) % 16, y + ((i > 0 && i < 4) ? 0 : 1), 1, 1); });
  x.fillStyle = '#3a78c8'; x.fillRect((5 + f * 4) % 12, 11, 4, 1);
}));
TILES['w'] = [0, 1].map(f => paint(x => { x.fillStyle = '#9ad0f8'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#ffffff'; for (let i = 0; i < 16; i += 3) x.fillRect(i, (i * 5 + f * 6) % 12, 1, 5); }));
TILES['-'] = [paint(x => {
  x.fillStyle = '#7cb8ee'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#a8d4f8'; x.fillRect(1, 7, 4, 1); x.fillRect(10, 13, 4, 1);
  x.fillStyle = '#8a8a92'; x.fillRect(3, 3, 5, 4); x.fillRect(9, 9, 5, 4); x.fillStyle = '#c0c0c8'; x.fillRect(4, 3, 3, 1); x.fillRect(10, 9, 3, 1);
})];
OVER['#'] = [paint(drawPine)];
OVER['R'] = [paint(drawRock)];
OVER['b'] = [paint(drawBamboo)];
OVER[','] = variants(2, 71, (x, r) => { for (let i = 0; i < 5; i++) { const bx = Math.floor(r() * 12) + 1, by = Math.floor(r() * 9) + 6; x.fillStyle = '#3e9058'; x.fillRect(bx, by, 1, 2); x.fillRect(bx + 1, by - 1, 1, 3); x.fillRect(bx + 2, by, 1, 2); } });
OVER['f'] = variants(2, 81, (x, r) => { for (let i = 0; i < 2; i++) { const fx = Math.floor(r() * 11) + 2, fy = Math.floor(r() * 11) + 2; x.fillStyle = i ? '#f8f8f8' : '#f06070'; x.fillRect(fx - 1, fy, 3, 1); x.fillRect(fx, fy - 1, 1, 3); x.fillStyle = '#f8d030'; x.fillRect(fx, fy, 1, 1); } });
OVER['x'] = [paint(x => { x.fillStyle = '#f0ece0'; x.fillRect(3, 8, 10, 2); x.fillRect(2, 7, 2, 4); x.fillRect(12, 7, 2, 4); x.fillStyle = '#b8b0a0'; x.fillRect(3, 10, 10, 1); })];
// Town tiles: tilled soil, wood floor, wood wall, fence overlay
TILES['p'] = variants(3, 91, (x, r) => { speck(x, r, '#a87448', [['#8a5a34', 12], ['#c48c5a', 6]]); x.fillStyle = '#7a4e2c'; x.fillRect(0, 5, 16, 1); x.fillRect(0, 12, 16, 1); });
TILES['h'] = [paint(x => {
  x.fillStyle = '#c8945a'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#a87440'; [0, 4, 8, 12].forEach(y => x.fillRect(0, y, 16, 1));
  x.fillStyle = '#8a5c30'; x.fillRect(6, 1, 1, 3); x.fillRect(12, 5, 1, 3); x.fillRect(3, 9, 1, 3); x.fillRect(10, 13, 1, 3);
})];
TILES['H'] = [paint(x => {
  x.fillStyle = '#5a3820'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#704828'; for (let i = 0; i < 16; i += 4) x.fillRect(i, 0, 3, 16);
  x.fillStyle = '#3a2210'; x.fillRect(0, 14, 16, 2);
  x.fillStyle = '#8a6038'; x.fillRect(0, 0, 16, 1);
})];
OVER['n'] = [paint(x => {
  x.fillStyle = '#6a4424'; x.fillRect(2, 3, 3, 12); x.fillRect(11, 3, 3, 12);
  x.fillStyle = '#9a6a3a'; x.fillRect(0, 5, 16, 2); x.fillRect(0, 10, 16, 2);
  x.fillStyle = '#c89058'; x.fillRect(2, 3, 3, 1); x.fillRect(11, 3, 3, 1);
})];

/* Overworld hunter: steel helmet, bone horns, pauldrons, sword on back.
   k outline, W horn, m/M/H steel, s skin, e visor glow, a/A leather, g gold, l legs, b boots, w blade, h hilt */
const HPAL = { k: '#1a1622', W: '#f0e8d0', m: '#9aa4b8', M: '#5e6680', H: '#e4eaf4', s: '#f0b890', e: '#ff7a40', a: '#9a6434', A: '#5e3a1e', g: '#e8b840', l: '#3c3448', b: '#5a3a22', w: '#d8dee8', h: '#6a4020' };
const HUNTER_ROWS = {
  down: ['..kk.......kk...', '..kWk.kkkk.kWk..', '...kWkmmmmkWk.kh', '....kmHHmmmmk.kh', '...kmMkekkekMmkg',
         '...kMmmmmmmmmMkw', '....kMMsssMMk.kw', '..kaagkkkkgaak.w', '.kaaaamMMmaaaakw', '.kaAkmmHmmmkAakw',
         '.ksAkmmmmmmkAskw', '..kkkggggggkkk.w', '....kAAAAAAk...w'],
  up:   ['..kk...kh..kk...', '..kWk.kggk.kWk..', '...kWkmwwmkWk...', '....kmmwwmmk....', '...kmmmwwmmmk...',
         '...kMmmwwmmMk...', '....kMMwwMMk....', '..kaagkwwkgaak..', '.kaaaaawwaaaaak.', '.kaAaaawwaaaAak.',
         '.ksAaaawwaaaAsk.', '..kkkggwwggkkk..', '....kAAwwAAk....'],
  side: ['...kh...kk......', '...kgk.kWk......', '....wkkmWmk.....', '....wkmmmmmk....', '....wkmmmkeek...',
         '....wkMmmmmMk...', '....w.kMMssk....', '...kwagkkkgak...', '...kwaaamMmak...', '...kwaAmmHmmsk..',
         '...kwaAmmmmmk...', '...kwkggggggk...', '....wkAAAAAk....']
};
function buildHunter(pal) {
  const legsF = { S: ['....kllkkllk....', '....kllkkllk....', '....kbbkkbbk....'],
                  A: ['....kllkkllk....', '....kllk.kbbk...', '....kbbk........'],
                  B: ['....kllkkllk....', '...kbbk.kllk....', '........kbbk....'] };
  const legsS = { S: ['.....kllkllk....', '.....kllkllk....', '.....kbbkbbk....'],
                  A: ['....kllk..kllk..', '....kllk..kllk..', '....kbbk..kbbk..'],
                  B: ['.....kllkllk....', '.....kllkllk....', '.....kbbkbbk....'] };
  const make = (rows, mirror) => paint(x => rows.forEach((row, yy) => {
    [...row.padEnd(16, '.').slice(0, 16)].forEach((ch, xx) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(mirror ? 15 - xx : xx, yy, 1, 1); } });
  }));
  const set = { down: {}, up: {}, left: {}, right: {} };
  for (const fr of ['S', 'A', 'B']) {
    set.down[fr]  = make([...HUNTER_ROWS.down, ...legsF[fr]]);
    set.up[fr]    = make([...HUNTER_ROWS.up, ...legsF[fr]]);
    set.right[fr] = make([...HUNTER_ROWS.side, ...legsS[fr]]);
    set.left[fr]  = make([...HUNTER_ROWS.side, ...legsS[fr]], true);
  }
  return set;
}

const CAT_ROWS = ['................', '..kk........kk..', '..kok......kok..', '..kook....kook..', '..kfffkkkkfffk..', '.kffffffffffffk.',
  '.kffeeffffeeffk.', '.kffeeffffeeffk.', '.kfffffppfffffk.', '..kffffffffffk..', '...kkkkkkkkkk...', '...kvvvvvvvvk...',
  '..kfvvvyyvvvfk..', '...kvvvvvvvvk...', '...kffk..kffk...', '...kkk....kkk...'];
function buildCat(fur, vest) {
  const pal = { k: '#4a3428', f: fur, o: '#f0a0a0', e: '#202020', p: '#e07080', v: vest, y: '#f0c040' };
  return paint(x => CAT_ROWS.forEach((row, yy) => [...row].forEach((ch, xx) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(xx, yy, 1, 1); } })));
}

/** SPR[dir][frame] for the player; NPCSPR = green-armoured veteran; CATSPR = Felynes. */
export const SPR    = buildHunter(HPAL);
export const HUMANS = {
  veteran:  buildHunter({ ...HPAL, m: '#7a9a5a', M: '#4a6a3a', H: '#b8d8a0', a: '#6a5a3a', W: '#c8b890', e: '#40f080' }),
  chief:    buildHunter({ ...HPAL, m: '#e8e0d0', M: '#a89880', H: '#ffffff', a: '#8a3a70', A: '#5a2048', W: '#c8a850', g: '#f0d060', e: '#202020', w: '#8a5a30', h: '#5a3a20' }),
  merchant: buildHunter({ ...HPAL, m: '#d89838', M: '#9a6420', H: '#f8d080', a: '#3a7a5a', A: '#24503a', W: '#d89838', e: '#202020', w: '#c89060', h: '#7a5030' }),
  kid:      buildHunter({ ...HPAL, m: '#f07848', M: '#b04828', H: '#f8b090', a: '#e8c040', A: '#b08820', W: '#f07848', e: '#202020', w: '#a07040', h: '#6a4020' }),
  receptionist: buildHunter({ ...HPAL, m: '#f0f0f8', M: '#b8b8d0', H: '#ffffff', a: '#d84870', A: '#902848', W: '#f0c040', e: '#202020', w: '#c89060', h: '#7a5030' })

};
export const CATSPR = {
  cat: buildCat('#f8e8c8', '#4878c8'),
  cat2: buildCat('#a8a8b8', '#c85040'),
  chef: buildCat('#f8e8c8', '#f8f8f8')
};