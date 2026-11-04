/* Bakes every sprite once at load.
   ART[name]  = canvas (for drawing on the field canvas)
   DATA[name] = data-URL (for <img> in menus, HUD, map) */
import { renderArt } from './raster.js';
import { ITEM_ART, WEAPON_ART, GATHER_ART, ICON_ART, hunterBackDef, RAR_COL, MAT_DEF, matType } from './defs.js';
import { SPR } from './tiles.js';
import { ITEMS, itemRar } from '../data/items.js';

export const ART = {}, DATA = {};

function bake(name, def, scale = 1) {
  const c = renderArt(def, scale);
  ART[name] = c; DATA[name] = c.toDataURL();
}
for (const k in ITEM_ART) bake('item_' + k, ITEM_ART[k]);
for (const k in WEAPON_ART) bake('wpn_' + k, WEAPON_ART[k]);
for (const k in GATHER_ART) { bake('g_' + k, GATHER_ART[k]); ART['gx_' + k] = renderArt(GATHER_ART[k], 1, true); }
for (const k in ICON_ART) bake('ic_' + k, ICON_ART[k]);
ART.icx_tail = renderArt(ICON_ART.tail, 1, true);
bake('hb_greatsword', hunterBackDef('greatsword'));
bake('hb_longsword', hunterBackDef('longsword'));
DATA.player = SPR.down.S.toDataURL();

/** <img> tag for a baked sprite. */
export const pimg = (src, cls = 'pi') => `<img class="${cls}" src="${src}" alt="">`;

/** Icon for any item id (consumable or material). */
export const itemIcon = id => ITEMS[id] ? DATA['item_' + id] : matIcon(id, itemRar(id));

/** Icon data-URL for any reward material (cached). */
const matCache = {};
export function matIcon(name, rar) {
  if (matCache[name]) return matCache[name];
  const t = matType(name);
  return matCache[name] = t.startsWith('g:') ? DATA['g_' + t.slice(2)] : renderArt(MAT_DEF[t](RAR_COL[rar] || '#c8c8c8')).toDataURL();
}

/** 3×5 pixel font for exit numbers and the sleeping "Z". */
const FONT35 = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111', C: '111100100100111', Z: '111001010100111' ,   Q: '111101101111001'};
export function pxText(ctx, s, x, y, col) {
  ctx.fillStyle = col;
  [...String(s)].forEach((ch, i) => {
    const g = FONT35[ch];
    if (g) for (let p = 0; p < 15; p++) if (g[p] === '1') ctx.fillRect(x + i * 4 + (p % 3), y + Math.floor(p / 3), 1, 1);
  });
}