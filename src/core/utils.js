export const $ = (id) => document.getElementById(id);
export const rand = (a, b) => Math.random() * (b - a) + a;
export const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Thrown to cancel an in-progress async sequence after a restart. */
export class Abort extends Error {}

/** Seeded RNG (mulberry32): the same seed always builds the same area layout. */
export function rng32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weighted loot roll. Table rows: [name, weight, rarity]. */
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
