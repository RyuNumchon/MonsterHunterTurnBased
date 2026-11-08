/* Every status effect. Durations count the AFFECTED unit's turns.
   kind: element | ailment | physical (physical = only big monsters can cause it)
   Optional effect keys:
     dot        share of max HP lost at the end of each turn
     def        damage-taken multiplier (higher = weaker defense)
     acc        added to the unit's hit chance
     atk        damage-dealt multiplier
     slow       attackers get +hit, escape chance halves, field walking is slower
     noElement  the unit's weapon element is ignored
     stunRamp   minimum stun chance (%) when hit, by turn of the effect (turn 1, 2, 3)
     blocks     'act' (no FIGHT/RUN), 'attack' (no attack moves), 'item' (no POUCH)
     cure       item key that removes it
     battleOnly removed when the battle ends
     instant    no lasting status; resolved once when applied
   {u} in messages = "HUNTER" or "The RATHALOS". */
export const STATUS = {
  // ---- Elements (3 turns, cured by a Null-Berry) ----
  fire: {
    name: "FIRE",
    short: "FIRE",
    kind: "element",
    color: "#e05828",
    turns: 3,
    dot: 0.06,
    def: 1.15,
    cure: "nullberry",
    sfx: "hurt",
    onMsg: "{u} caught FIRE!\nIt's burning, and defense fell!",
    dotMsg: "{u} is burning!",
  },
  water: {
    name: "WATERBLIGHT",
    short: "WATER",
    kind: "element",
    color: "#3a88d8",
    turns: 3,
    acc: -20,
    cure: "nullberry",
    onMsg: "{u} is soaked!\nAccuracy fell!",
  },
  ice: {
    name: "ICEBLIGHT",
    short: "ICE",
    kind: "element",
    color: "#68b8d8",
    turns: 3,
    slow: true,
    cure: "nullberry",
    onMsg: "{u} is frozen stiff!\nSpeed fell!",
  },
  thunder: {
    name: "THUNDERBLIGHT",
    short: "THDR",
    kind: "element",
    color: "#c8a818",
    turns: 3,
    stunRamp: [30, 50, 100],
    cure: "nullberry",
    sfx: "trap",
    onMsg: "{u} is crackling with THUNDER!\nHits may cause a STUN!",
  },
  dragon: {
    name: "DRAGONBLIGHT",
    short: "DRGN",
    kind: "element",
    color: "#8a2848",
    turns: 3,
    atk: 0.8,
    noElement: true,
    cure: "nullberry",
    onMsg: "{u} is DRAGONBLIGHTED!\nAttack fell and elements are sealed!",
  },
  // ---- Ailments ----
  poison: {
    name: "POISON",
    short: "PSN",
    kind: "ailment",
    color: "#8848b0",
    turns: 5,
    dot: 0.04,
    cure: "antidote",
    onMsg: "{u} was POISONED!",
    dotMsg: "{u} is hurt by poison!",
  },
  paralysis: {
    name: "PARALYSIS",
    short: "PAR",
    kind: "ailment",
    color: "#c8a020",
    turns: 1,
    blocks: ["act"],
    battleOnly: true,
    sfx: "trap",
    onMsg: "{u} is PARALYZED!\nIt can't move!",
  },
  bleed: {
    name: "BLEEDING",
    short: "BLD",
    kind: "ailment",
    color: "#b02020",
    turns: 3,
    def: 1.3,
    sfx: "hurt",
    onMsg: "{u} is BLEEDING!\nDefense fell sharply!",
  },
  stun: {
    name: "STUN",
    short: "STUN",
    kind: "ailment",
    color: "#a89028",
    turns: 3,
    blocks: ["act", "item"],
    battleOnly: true,
    sfx: "flash",
    onMsg: "{u} is STUNNED!\nIt can't do anything!",
  },
  // ---- Physical (big monsters only) ----
  wind: {
    name: "WIND PRESSURE",
    short: "WIND",
    kind: "physical",
    color: "#7890a0",
    turns: 1,
    blocks: ["attack"],
    battleOnly: true,
    sfx: "swoosh",
    onMsg: "{u} is pinned by WIND PRESSURE!\nIt can't attack next turn!",
  },
  roar: {
    name: "ROAR",
    short: "ROAR",
    kind: "physical",
    color: "#c86040",
    turns: 1,
    blocks: ["item"],
    battleOnly: true,
    onMsg: "{u} covers its ears!\nIt can't use items next turn!",
  },
  tremble: {
    name: "TREMOR",
    short: "TREM",
    kind: "physical",
    color: "#8a6a40",
    turns: 1,
    blocks: ["act"],
    battleOnly: true,
    sfx: "hurt",
    onMsg: "The ground shakes!\n{u} lost its footing and can't move!",
  },
  blast: {
    name: 'BLASTBLIGHT',
    short: 'BLAST',
    color: '#e8a020',
    turns: 3,
    blast: .4,
    sfx: 'flash',
    onMsg: 'HUNTER is covered in BLASTBLIGHT!\nCure it with a DEODORANT, fast!' },

  mud: {
    name: "MUD",
    short: "MUD",
    kind: "physical",
    color: "#6a4a28",
    turns: 3,
    slow: true,
    onMsg: "{u} is covered in MUD!\nSpeed fell!",
  },
  stench: {
    name: "STENCH",
    short: "STNK",
    kind: "physical",
    color: "#6a8a30",
    turns: 3,
    blocks: ["item"],
    onMsg: "{u} reeks of STENCH!\nToo sick to use items!",
  },
  steal: {
    name: "STEAL",
    short: "STEAL",
    kind: "physical",
    instant: true,
    color: "#505050",
  },
};
