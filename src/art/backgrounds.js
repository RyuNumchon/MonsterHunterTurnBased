/* Battle backdrops: dithered sky, themed scenery, square textured platforms.
   Baked once per theme and cached as a data-URL. */
import { THEMES } from "../data/world.js";
import { TILES, OVER } from "./tiles.js";
import { hexRgb, rgbHex } from "./raster.js";

const SKY = {
  camp: ["#78c0f0", "#a8dcf8", "#d8f0f8"],
  stream: ["#70b8f0", "#a0d8f8", "#d8f4f8"],
  rocky: ["#90b0d0", "#b8cce0", "#e0e8f0"],
  bamboo: ["#88c8e8", "#b8e0f0", "#e0f4f0"],
  meadow: ["#68b8f8", "#98d0f8", "#d0ecf8"],
  forest: ["#60a0c8", "#90c0d8", "#c8e0d8"],
  river: ["#70b8f0", "#a0d8f8", "#d8f4f8"],
  falls: ["#88c8f0", "#b8e0f8", "#f0f8f8"],
  cave: ["#140f22", "#221a36", "#30264a"],
  woods: ["#4a7a88", "#6a9aa0", "#9ac0b0"],
};
const cache = {};

function cloud(x, cx, cy) {
  x.fillStyle = "#ffffff";
  [
    [-6, 6],
    [-10, 10],
    [-12, 12],
    [-9, 9],
  ].forEach(([a, b], i) => x.fillRect(cx + a, cy + i, b - a, 1));
}

/** Square raised platform textured with the area's ground tile. */
function platform(x, th, x0, y0, w, h, depth) {
  const set = TILES[th.ground];
  x.fillStyle = "rgba(0,0,0,.3)";
  x.fillRect(x0 + 5, y0 + 5, w, h + depth);
  x.save();
  x.beginPath();
  x.rect(x0, y0, w, h + depth);
  x.clip();
  for (let ty = y0; ty < y0 + h + depth; ty += 16)
    for (let tx = x0; tx < x0 + w; tx += 16)
      x.drawImage(set[((tx + 64) >> 4) % set.length], tx, ty);
  if (th.ground === ".")
    for (let tx = x0 + 6; tx < x0 + w; tx += 29)
      x.drawImage(OVER.f[0], tx, y0 + 2);
  x.restore();
  x.fillStyle = "rgba(255,255,255,.12)";
  x.fillRect(x0, y0, w, h);
  if (depth) {
    x.fillStyle = "rgba(0,0,0,.45)";
    x.fillRect(x0, y0 + h, w, depth);
    x.fillStyle = "rgba(0,0,0,.25)";
    for (let bx = x0 + 8; bx < x0 + w; bx += 12)
      x.fillRect(bx, y0 + h + 1, 1, depth - 1);
  }
  x.fillStyle = "rgba(255,255,255,.45)";
  x.fillRect(x0, y0, w, 1);
  x.fillStyle = "#1a1420";
  x.fillRect(x0 - 1, y0 - 1, w + 2, 1);
  x.fillRect(x0 - 1, y0, 1, h + depth);
  x.fillRect(x0 + w, y0, 1, h + depth);
  x.fillRect(x0 - 1, y0 + h + depth, w + 2, 1);
  if (depth) x.fillRect(x0, y0 + h, w, 1);
}

export function battleBg(theme) {
  if (cache[theme]) return cache[theme];
  const th = THEMES[theme],
    c = document.createElement("canvas");
  c.width = 240;
  c.height = 160;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  const HZ = 48,
    sky = SKY[theme].map(hexRgb);
  const tile = (set, tx, ty) =>
    set[(((tx + 64) >> 4) * 7 + (ty >> 4) * 13) % set.length];

  if (theme === "cave") {
    for (let ty = 0; ty < HZ; ty += 16)
      for (let tx = 0; tx < 240; tx += 16)
        x.drawImage(tile(TILES.W, tx, ty), tx, ty);
  } else {
    // Ordered-dither sky gradient
    for (let y = 0; y < HZ; y++) {
      const f = (y / HZ) * (sky.length - 1),
        i = Math.min(sky.length - 2, Math.floor(f)),
        fr = f - i;
      const a = rgbHex(sky[i]),
        b = rgbHex(sky[i + 1]);
      for (let xx = 0; xx < 240; xx++) {
        x.fillStyle = fr > ((xx + y) & 1 ? 0.66 : 0.33) ? b : a;
        x.fillRect(xx, y, 1, 1);
      }
    }
    if (theme !== "woods" && theme !== "forest")
      [
        [40, 6],
        [150, 3],
        [205, 12],
      ].forEach(([cx, cy]) => cloud(x, cx, cy));
    const obs =
      theme === "falls" || theme === "rocky"
        ? OVER.R[0]
        : theme === "bamboo"
          ? OVER.b[0]
          : OVER["#"][0];
    for (let row = 0; row < 2; row++)
      for (let tx = -8 * row; tx < 240; tx += 16) {
        const ty = HZ - 32 + row * 16;
        x.drawImage(tile(TILES[th.ground], tx, ty), tx, ty);
        x.drawImage(obs, tx, ty);
      }
    if (theme === "falls")
      for (let ty = 0; ty < HZ; ty += 16)
        for (let tx = 96; tx < 144; tx += 16)
          x.drawImage(TILES.w[(ty >> 4) & 1], tx, ty);
  }
  for (let ty = HZ; ty < 160; ty += 16)
    for (let tx = 0; tx < 240; tx += 16) {
      x.drawImage(tile(TILES[th.ground], tx, ty), tx, ty);
      if (th.ground === "." && (tx * 3 + ty * 5) % 7 === 0)
        x.drawImage(OVER[","][0], tx, ty);
      if (theme === "cave" && (tx * 5 + ty * 3) % 11 === 0)
        x.drawImage(OVER.x[0], tx, ty);
    }
  if (theme === "river" || theme === "stream")
    for (let tx = 0; tx < 240; tx += 16) x.drawImage(TILES["~"][0], tx, HZ);
  x.fillStyle = "rgba(0,0,0,.2)";
  x.fillRect(0, HZ, 240, 160 - HZ);
  platform(x, th, 130, 58, 100, 22, 6); // monster's platform
  platform(x, th, -4, 124, 134, 40, 0); // hunter's platform (runs off-screen)
  return (cache[theme] = c.toDataURL());
}
