/* External sprite images from ./resources.
   Each image is loaded once at boot, cropped to its visible pixels, turned to face LEFT
   (the direction all game art uses), then baked at a battle size and a map size.
   If a file is missing, the built-in pixel art for that sprite stays in place. */
import { ART, DATA } from './index.js';
import { CATSPR } from './tiles.js';
import { MONSTERS } from '../data/monsters.js';

/* flip: set to true if that monster faces RIGHT in the file.
   crop: optional [x, y, w, h] if a file holds several frames and you only want one. */
export const MONSTER_SPRITES = {
  rathalos:  { src: 'resources/0_106.png', flip: false },
  tigrex:    { src: 'resources/0_130.png', flip: false },
  jaggi:     { src: 'resources/0_4.png',   flip: false },
  bullfango: { src: 'resources/0_31.png',  flip: false }   // Bulldrome art on the boar slot
};
export const PALICO_SPRITE = { src: 'resources/0_170.png', flip: false };

/* Largest size in game pixels (the shape is kept). The map is drawn at 2x, so 44 shows as 88 px.
   Battle sprites are only ever shrunk, never enlarged, then the page scales them up crisply. */
const SIZE = {
  bossBattle:  [144, 112], smallBattle: [72, 72],
  bossField:   [44, 36],   smallField:  [24, 22],
  palico:      [16, 20]
};

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function loadImage(src) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => { console.warn(`[sprites] Couldn't load ${src}. Using built-in art.`); res(null); };
    img.src = src;
  });
}

/** Optional crop, then trims fully transparent borders. */
function trim(img, crop) {
  const [sx, sy, sw, sh] = crop || [0, 0, img.naturalWidth, img.naturalHeight];
  const c = canvas(sw, sh), x = c.getContext('2d');
  x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const d = x.getImageData(0, 0, sw, sh).data;
  let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
  for (let y = 0; y < sh; y++) for (let xx = 0; xx < sw; xx++) {
    if (d[(y * sw + xx) * 4 + 3] > 16) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return c;   // fully transparent: leave as is
  const w = x1 - x0 + 1, h = y1 - y0 + 1, out = canvas(w, h);
  out.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h);
  return out;
}

function flipH(src) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
  return c;
}

/** Makes every pixel fully solid or fully clear, so shrunk sprites keep hard pixel-art edges. */
function crispAlpha(c) {
  const x = c.getContext('2d'), img = x.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 128 ? 255 : 0;
  x.putImageData(img, 0, 0);
  return c;
}

/** Scales to fit inside maxW × maxH. Shrinks in halving steps so detail isn't skipped. */
function fit(src, maxW, maxH, grow = true) {
  let s = Math.min(maxW / src.width, maxH / src.height);
  if (!grow) s = Math.min(s, 1);
  const w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
  let c = src;
  while (c.width / 2 >= w && c.height / 2 >= h) {
    const half = canvas(Math.round(c.width / 2), Math.round(c.height / 2)), x = half.getContext('2d');
    x.imageSmoothingEnabled = true; x.drawImage(c, 0, 0, half.width, half.height);
    c = half;
  }
  const out = canvas(w, h), x = out.getContext('2d');
  x.imageSmoothingEnabled = s < 1;   // smooth when shrinking, sharp pixels when enlarging
  x.imageSmoothingQuality = 'high';
  x.drawImage(c, 0, 0, w, h);
  return s < 1 ? crispAlpha(out) : out;
}

/** Colour wash over the visible pixels (used for the second Felyne). */
function tint(src, color, amount) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = amount; x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

async function prepare(cfg) {
  const img = await loadImage(cfg.src);
  if (!img) return null;
  const c = trim(img, cfg.crop);
  return cfg.flip ? flipH(c) : c;
}
function put(name, c) { ART[name] = c; DATA[name] = c.toDataURL(); }

/** Swaps the resource images into ART/DATA. Call once before the first frame. */
export async function loadSprites() {
  const jobs = Object.entries(MONSTER_SPRITES).map(async ([key, cfg]) => {
    const base = await prepare(cfg);
    if (!base) return;
    const boss = key in MONSTERS;
    put('mb_' + key, fit(base, ...(boss ? SIZE.bossBattle : SIZE.smallBattle), false));   // battle
    put('mf_' + key, fit(base, ...(boss ? SIZE.bossField : SIZE.smallField)));            // map + minimap
  });
  jobs.push((async () => {
    const base = await prepare(PALICO_SPRITE);
    if (!base) return;
    const cat = fit(base, ...SIZE.palico);
    CATSPR.cat = cat;                         // Camp Felyne
    CATSPR.cat2 = tint(cat, '#6a7a9a', .4);   // Felyne Comrade: grey-blue coat
  })());
  await Promise.all(jobs);
}