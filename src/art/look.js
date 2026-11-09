/* Hunter colours from the equipped armor + weapon.
   Field: rebuilds the walking sprites. Battle: recolours the class back sprite (cached). */
import { G } from "../core/state.js";
import { BOX } from "../core/save.js";
import { WEAPONS } from "../data/weapons.js";
import { ARMOR, ARMOR_SLOTS } from "../data/armor.js";
import { HPAL, setHunterSprites } from "./tiles.js";
import { ART, DATA } from "./index.js";

export function hunterLook() {
  const pal = { ...HPAL };
  for (const s of ARMOR_SLOTS) {
    const a = ARMOR[BOX.equip[s]];
    if (a) Object.assign(pal, a.pal);
  }
  const w = WEAPONS[BOX.weapon];
  if (w && w.pal) Object.assign(pal, w.pal);
  return pal;
}

export const applyLook = () => setHunterSprites(hunterLook());

const cache = new Map();
const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Image URL for the battle back sprite in the current gear. */
export function hunterBack() {
  const key = "hb_" + WEAPONS[G.player.weapon].cls,
    look = hunterLook();
  const swaps = Object.keys(look)
    .filter((k) => HPAL[k] && look[k] !== HPAL[k])
    .map((k) => [rgb(HPAL[k]), rgb(look[k])]);
  const src = ART[key];
  if (!swaps.length || !src || !src.getContext) return DATA[key];
  const id = key + JSON.stringify(swaps);
  if (cache.has(id)) return cache.get(id);
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const x = c.getContext("2d");
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height),
    d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    for (const [a, b] of swaps)
      if (d[i] === a[0] && d[i + 1] === a[1] && d[i + 2] === a[2]) {
        d[i] = b[0];
        d[i + 1] = b[1];
        d[i + 2] = b[2];
        break;
      }
  }
  x.putImageData(img, 0, 0);
  const url = c.toDataURL();
  cache.set(id, url);
  return url;
}
