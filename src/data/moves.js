/* Move catalogue (10 per weapon type) + per-type movesets saved in BOX.movesets.
   Original moves are FOUND by role (id → type → name), so their real ids are kept.
   New moves copy an original (`like`) and change numbers:
   pow = × power · accAdd = + accuracy · sharp = edge cost · crit = +crit% · breakMult = part damage ×.
   requires = role or move id that must be in the set first. */
import { CONFIG } from "../core/config.js";
import { BOX } from "../core/save.js";
import { WEAPONS } from "./weapons.js";

export const MOVE_CLASSES = {
  greatsword: "GREAT SWORD",
  longsword: "LONG SWORD",
};

const ORIGINAL = {};
for (const c in MOVE_CLASSES) ORIGINAL[c] = [...(WEAPONS[c].moves || [])];
console.info(
  "[moves] original moves:",
  Object.fromEntries(
    Object.entries(ORIGINAL).map(([c, l]) => [
      c,
      l.map((m) => `${m.id} (${m.name}${m.type ? ", " + m.type : ""})`),
    ]),
  ),
);

/* Order matters: specific roles first so general patterns don't take their move. */
const ROLES = {
  gs_guard: {
    cls: "greatsword",
    ids: ["gs_guard"],
    type: "guard",
    name: /GUARD/,
  },
  gs_charge: {
    cls: "greatsword",
    ids: ["gs_charge"],
    type: "charge",
    name: /^CHARGE$/,
  },
  gs_chargeslash: {
    cls: "greatsword",
    ids: ["gs_chargeslash", "gs_charged", "gs_cs"],
    name: /CHARGE.*SLASH/,
  },
  gs_slash: {
    cls: "greatsword",
    ids: ["gs_slash", "gs_vslash", "gs_vertical"],
    name: /VERTICAL|^SLASH$/,
    plain: true,
  },
  ls_helm: {
    cls: "longsword",
    ids: ["ls_helm", "ls_helmbreaker"],
    name: /HELM/,
  },
  ls_foresight: {
    cls: "longsword",
    ids: ["ls_foresight"],
    type: "counter",
    name: /FORESIGHT/,
  },
  ls_spirit: {
    cls: "longsword",
    ids: ["ls_spirit", "ls_spiritslash"],
    name: /SPIRIT/,
  },
  ls_slash: {
    cls: "longsword",
    ids: ["ls_slash", "ls_vslash", "ls_vertical"],
    name: /VERTICAL|^SLASH$/,
    plain: true,
  },
};
const used = new Set(),
  ROLE = {};
for (const [role, R] of Object.entries(ROLES)) {
  const free = ORIGINAL[R.cls].filter((m) => !used.has(m)),
    up = (m) => (m.name || "").toUpperCase();
  const m =
    free.find((m) => R.ids.includes(m.id)) ||
    (R.type && free.find((m) => m.type === R.type)) ||
    free.find((m) => R.name.test(up(m))) ||
    (R.plain && free.find((m) => (m.power || 0) > 0 && !m.type));
  if (m) {
    used.add(m);
    ROLE[role] = m;
  } else console.warn(`[moves] couldn't find the ${role} move for ${R.cls}`);
}
const realId = (x) => ROLE[x]?.id ?? x;

const DEFS = {
  greatsword: [
    { role: "gs_slash" },
    {
      id: "gs_wide",
      like: "gs_slash",
      name: "WIDE SLASH",
      pow: 0.8,
      accAdd: 15,
      desc: "A broad sweep. Weaker, but hard to miss.",
    },
    {
      id: "gs_upswing",
      like: "gs_slash",
      name: "UPSWING",
      pow: 1.1,
      accAdd: -5,
      breakMult: 1.6,
      desc: "A rising slash that cracks parts. Breaks parts faster.",
    },
    {
      id: "gs_kick",
      like: "gs_slash",
      name: "KICK",
      pow: 0.35,
      accAdd: 20,
      sharp: 0,
      desc: "A quick kick. Weak, but never dulls the blade.",
    },
    { role: "gs_guard" },
    { role: "gs_charge" },
    {
      id: "gs_tackle",
      like: "gs_slash",
      requires: "gs_charge",
      name: "TACKLE",
      pow: 0.6,
      accAdd: 10,
      crit: 15,
      desc: "A shoulder tackle between charges. Steady, and crits more often.",
    },
    { role: "gs_chargeslash", requires: "gs_charge" },
    {
      id: "gs_strong",
      like: "gs_chargeslash",
      requires: "gs_chargeslash",
      name: "STRONG CHARGED SLASH",
      pow: 1.25,
      accAdd: -8,
      desc: "A heavier charged slash. Uses your CHARGE.",
    },
    {
      id: "gs_true",
      like: "gs_chargeslash",
      requires: "gs_strong",
      name: "TRUE CHARGED SLASH",
      pow: 1.5,
      accAdd: -15,
      desc: "The ultimate charged slash. Uses your CHARGE. Hard to land.",
    },
  ],
  longsword: [
    { role: "ls_slash" },
    {
      id: "ls_thrust",
      like: "ls_slash",
      name: "THRUST",
      pow: 0.75,
      accAdd: 15,
      desc: "A quick, precise thrust. Weaker, but hard to miss.",
    },
    {
      id: "ls_rising",
      like: "ls_slash",
      name: "RISING SLASH",
      pow: 0.9,
      breakMult: 1.5,
      desc: "An upward cut. Breaks parts faster.",
    },
    {
      id: "ls_fade",
      like: "ls_slash",
      name: "FADE SLASH",
      pow: 0.85,
      accAdd: -5,
      crit: 20,
      desc: "A slash while stepping back. Crits more often.",
    },
    {
      id: "ls_crescent",
      like: "ls_slash",
      name: "CRESCENT SLASH",
      pow: 1.15,
      accAdd: -10,
      desc: "A wide arcing slash. Strong, but less accurate.",
    },
    { role: "ls_spirit" },
    {
      id: "ls_round",
      like: "ls_spirit",
      requires: "ls_spirit",
      name: "SPIRIT ROUNDSLASH",
      pow: 1.2,
      accAdd: -5,
      desc: "A spinning spirit finisher. Stronger than a SPIRIT SLASH.",
    },
    { role: "ls_helm", requires: "ls_spirit" },
    { role: "ls_foresight" },
    {
      id: "ls_iai",
      like: "ls_foresight",
      requires: "ls_foresight",
      name: "IAI SPIRIT SLASH",
      counterMult: 2.0,
      desc: "Uses SPIRIT. Time the monster attack to dodge and strike back even harder. Always acts first.",
    },
  ],
};

export const MOVES = {};
for (const [cls, list] of Object.entries(DEFS))
  for (const d of list) {
    const base = ROLE[d.role || d.like];
    if (!base) continue; // already warned
    const { role, like, pow, accAdd, requires, ...rest } = d;
    const id = role ? base.id : d.id;
    const m = { ...base, ...rest, id, cls };
    if (requires) m.requires = realId(requires);
    if (pow) m.power = Math.round((base.power || 0) * pow);
    if (accAdd) m.acc = (base.acc || 0) + accAdd;
    MOVES[id] = m;
  }
// Keep any original move that matched no role
for (const [cls, list] of Object.entries(ORIGINAL))
  for (const m of list) if (!MOVES[m.id]) MOVES[m.id] = { ...m, cls };
// Drop moves whose prerequisite is missing (repeat for chains)
for (let again = true; again; ) {
  again = false;
  for (const id in MOVES)
    if (MOVES[id].requires && !MOVES[MOVES[id].requires]) {
      console.warn(
        `[moves] ${id} removed: needs missing '${MOVES[id].requires}'`,
      );
      delete MOVES[id];
      again = true;
    }
}

export const moveById = (id) => MOVES[id] || null;
export const isAttackMove = (m) => (m.power || 0) > 0;

function defaultSet(cls) {
  const ids = ORIGINAL[cls]
    .map((m) => m.id)
    .filter((id) => MOVES[id])
    .slice(0, CONFIG.MOVE_SLOTS);
  while (ids.length < CONFIG.MOVE_SLOTS) ids.push(null);
  return ids;
}
/** Saved moveset for a weapon type (slots may be null). Invalid saves fall back to the default. */
export function movesetOf(cls) {
  BOX.movesets ??= {};
  const s = BOX.movesets[cls];
  if (
    !Array.isArray(s) ||
    s.length !== CONFIG.MOVE_SLOTS ||
    s.some((id) => id && MOVES[id]?.cls !== cls)
  )
    BOX.movesets[cls] = defaultSet(cls);
  return BOX.movesets[cls];
}
export const equippedMoves = (cls) =>
  movesetOf(cls)
    .filter(Boolean)
    .map((id) => MOVES[id]);

export const lockedBy = (id, set) => {
  const r = MOVES[id].requires;
  return r && !set.includes(r) ? MOVES[r] : null;
};
export const dependents = (id, set) =>
  set.filter((x) => x && MOVES[x].requires === id);

/** Overcharge = 0.8 × a level-1 Charged Slash. */
export function overchargeMove() {
  const cs = ROLE.gs_chargeslash;
  return {
    ...cs,
    id: "overcharge",
    name: "OVERCHARGE SLASH",
    overcharge: true,
    power: Math.round(
      (cs?.power || 0) * CONFIG.CHARGE_LV1_MULT * CONFIG.OVERCHARGE_MULT,
    ),
  };
}

// Battle code reads `weapon.moves`: point it at the saved moveset (forged weapons share their type's set).
for (const w of Object.values(WEAPONS))
  if (MOVE_CLASSES[w.cls])
    Object.defineProperty(w, "moves", {
      configurable: true,
      enumerable: true,
      get: () => equippedMoves(w.cls),
    });
