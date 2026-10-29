/* Vector -> pixel-art rasteriser.
   Shapes: ['e',col,cx,cy,rx,ry] ellipse · ['r',col,x,y,w,h] rect
           ['p',col,[x,y,...]] polygon · ['l',col,x1,y1,x2,y2,thick] thick line
   Prefix '!' on the type draws an inner outline where it overlaps earlier shapes.
   Post-process: top highlight, bottom shade, cast shadow, dark coloured outline. */
import { clamp } from '../core/utils.js';

export const hexRgb  = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const rgbHex  = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export const mixRgb  = (c, t, f) => c.map((v, i) => v + (t[i] - v) * f);
export const lighten = (h, f = .35) => rgbHex(mixRgb(hexRgb(h), [255, 255, 255], f));
export const darken  = (h, f = .35) => rgbHex(mixRgb(hexRgb(h), [0, 0, 0], f));
const INK = [18, 12, 26];

function inPoly(p, x, y) {
  let c = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  const t = l ? clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1) : 0;
  return Math.hypot(x1 + t * dx - px, y1 + t * dy - py);
}
function inShape(t, o, x, y) {
  switch (t) {
    case 'e': { const dx = (x - o[2]) / o[4], dy = (y - o[3]) / o[5]; return dx * dx + dy * dy <= 1; }
    case 'r': return x >= o[2] && x < o[2] + o[4] && y >= o[3] && y < o[3] + o[5];
    case 'p': return inPoly(o[2], x, y);
    case 'l': return segDist(x, y, o[2], o[3], o[4], o[5]) <= o[6] / 2;
  }
  return false;
}

/** Rasterise an art definition {w, h, ops} into a canvas at the given scale. */
export function renderArt(def, scale = 1, grey = false) {
  const W = Math.max(1, Math.round(def.w * scale)), H = Math.max(1, Math.round(def.h * scale));
  const ops = def.ops, types = ops.map(o => o[0].replace('!', '')), inner = ops.map(o => o[0][0] === '!');
  const cols = ops.map(o => hexRgb(o[1])), id = new Int16Array(W * H).fill(-1);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const x = (px + .5) / scale, y = (py + .5) / scale;
    for (let i = ops.length - 1; i >= 0; i--) if (inShape(types[i], ops[i], x, y)) { id[py * W + px] = i; break; }
  }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : id[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = id[y * W + x];
    let rgb;
    if (i >= 0) {
      rgb = cols[i];
      const up = at(x, y - 1), dn = at(x, y + 1), lf = at(x - 1, y), rt = at(x + 1, y);
      if (inner[i] && [up, dn, lf, rt].some(v => v >= 0 && v < i)) rgb = mixRgb(rgb, INK, .55);
      else if (up < 0) rgb = mixRgb(rgb, [255, 255, 255], .3);
      else if (dn < 0) rgb = mixRgb(rgb, [0, 0, 0], .3);
      else if (up > i) rgb = mixRgb(rgb, [0, 0, 0], .2);
    } else {
      const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].find(v => v >= 0);
      if (n === undefined) continue;
      rgb = mixRgb(cols[n], INK, .75);
    }
    if (grey) { const gv = rgb[0] * .3 + rgb[1] * .59 + rgb[2] * .11; rgb = mixRgb(rgb, [gv, gv, gv], .85).map(v => v * .85); }
    const k = (y * W + x) * 4;
    d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}