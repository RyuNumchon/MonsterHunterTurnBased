/* COMBINE recipes. Ids: consumable keys (lowercase) or material names (UPPERCASE).
   in: ingredients (repeat an id to need two). out: result id. n: how many are made. */
export const RECIPES = [
  { in: ["herb", "BLUE MUSHROOM"], out: "potion", n: 1 },
  { in: ["potion", "HONEY"], out: "mega", n: 1 },
  { in: ["FLASHBUG"], out: "flash", n: 1 },
  { in: ["PARASHROOM", "IVY"], out: "shock", n: 1 },
];

/** { id: amount needed } */
export const needOf = (r) =>
  r.in.reduce((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});
