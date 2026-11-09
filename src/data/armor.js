/* Armor: 5 independent slots. def + skill points are shown in menus.
   pal = buildHunter palette keys this piece recolours on the field and battle sprites. */
import { skillList } from "./skills.js";

export const ARMOR_SLOTS = ["head", "chest", "belt", "gloves", "legs"];
export const SLOT_NAME = {
  head: "HEAD",
  chest: "CHEST",
  belt: "BELT",
  gloves: "GLOVES",
  legs: "LEGS",
};

export const SETS = {
  rathalos: {
    label: "RATHALOS",
    short: "RATH",
    blurb: "Red scale over black shell, trimmed in silver.",
    pal: {
      head: { H: "#c8ccd8", e: "#1c1c20" },
      chest: { m: "#c8302a", M: "#6a1418" },
      belt: { g: "#c8ccd8" },
      gloves: { a: "#26262c" },
      legs: { A: "#1c1c20" },
    },
  },
  tigrex: {
    label: "TIGREX",
    short: "TIGR",
    blurb: "Orange hide with blue plates and silver claws.",
    pal: {
      head: { H: "#d0d4dc", e: "#3878d8" },
      chest: { m: "#e88a30", M: "#9a5418" },
      belt: { g: "#d0d4dc" },
      gloves: { a: "#3a68b8" },
      legs: { A: "#24467a" },
    },
  },
};

function piece(set, slot, name, def, skills, z, mats) {
  const S = SETS[set];
  return {
    id: `${set}_${slot}`,
    set,
    slot,
    name,
    short: S.short,
    def,
    skills,
    pal: S.pal[slot],
    cost: { z, mats },
    desc: `${S.label} ${SLOT_NAME[slot]} armor.<br>${S.blurb}`,
  };
}

const LIST = [
  piece(
    "rathalos",
    "head",
    "RATHALOS HELM",
    7,
    { attack: 2, fireproof: 2 },
    1000,
    { "RATHALOS SCALE": 2, "RATHALOS SHELL": 1 },
  ),
  piece("rathalos", "chest", "RATHALOS MAIL", 9, { attack: 2, crit: 2 }, 1400, {
    "RATHALOS SCALE": 2,
    "RATHALOS SHELL": 2,
    "RATHALOS WEBBING": 1,
  }),
  piece("rathalos", "belt", "RATHALOS COIL", 7, { crit: 2, defense: 2 }, 900, {
    "RATHALOS SHELL": 2,
  }),
  piece(
    "rathalos",
    "gloves",
    "RATHALOS VAMBRACES",
    8,
    { attack: 2, windproof: 2 },
    1100,
    { "RATHALOS SCALE": 2, "RATHALOS WEBBING": 1 },
  ),
  piece(
    "rathalos",
    "legs",
    "RATHALOS GREAVES",
    8,
    { fireproof: 2, windproof: 2 },
    1200,
    { "RATHALOS SCALE": 3, "RATHALOS SHELL": 1 },
  ),
  piece("tigrex", "head", "TIGREX HELM", 8, { earplugs: 2, speed: 2 }, 1000, {
    "TIGREX SCALE": 2,
    "TIGREX FANG": 1,
  }),
  piece("tigrex", "chest", "TIGREX MAIL", 9, { speed: 2, evasion: 2 }, 1400, {
    "TIGREX SCALE": 2,
    "TIGREX SHELL": 2,
    "TIGREX CLAW": 1,
  }),
  piece("tigrex", "belt", "TIGREX COIL", 7, { evasion: 2, tremble: 2 }, 900, {
    "TIGREX SHELL": 2,
  }),
  piece(
    "tigrex",
    "gloves",
    "TIGREX VAMBRACES",
    8,
    { accuracy: 2, earplugs: 2 },
    1100,
    { "TIGREX SCALE": 2, "TIGREX CLAW": 1 },
  ),
  piece(
    "tigrex",
    "legs",
    "TIGREX GREAVES",
    8,
    { evasion: 2, tremble: 2 },
    1200,
    { "TIGREX SCALE": 3, "TIGREX SHELL": 1 },
  ),
];
export const ARMOR = Object.fromEntries(LIST.map((a) => [a.id, a]));

/** Menu stat lines: DEFENSE, then SKILLS (shown before the description). */
export const armorStats = (a) =>
  `DEFENSE ${a.def}<br>SKILLS: ${skillList(a.skills)}`;
