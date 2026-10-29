/* Large (quest target) monsters, small monsters, body parts and loot tables. */

export const MONSTERS = {
  rathalos: { name: 'RATHALOS', rank: 6, hp: 650, parts: { head: 160, body: 260, legs: 150, tail: 140 },
    attacks: [ { name: 'FIREBALL', power: 20 }, { name: 'TAIL WHIP', power: 16 },
               { name: 'RUSHING CHARGE', power: 22 }, { name: 'POISON TALON DIVE', power: 30, heavy: true } ] },
  tigrex: { name: 'TIGREX', rank: 6, hp: 700, parts: { head: 180, body: 280, legs: 150, tail: 120 },
    attacks: [ { name: 'BITE', power: 18 }, { name: 'ROCK THROW', power: 16 },
               { name: 'SPINNING TAIL', power: 22 }, { name: 'FULL-BODY CHARGE', power: 32, heavy: true } ] }
};

// aggro = tile distance at which they start chasing
export const SMALLS = {
  jaggi: { name: 'JAGGI', rank: 1, hp: 80, aggro: 3, parts: { head: 30, body: 40, legs: 30, tail: 25 },
    attacks: [ { name: 'BITE', power: 8 }, { name: 'TAIL SLAP', power: 6 }, { name: 'POUNCE', power: 11 } ],
    carve: [['JAGGI HIDE', 60, 1], ['JAGGI SCALE', 30, 2], ['SCREAMER', 10, 3]] },
  bullfango: { name: 'BULLFANGO', rank: 1, hp: 100, aggro: 4, parts: { head: 35, body: 45, legs: 30, tail: 20 },
    attacks: [ { name: 'TUSK CHARGE', power: 12, heavy: true }, { name: 'HEADBUTT', power: 8 }, { name: 'STOMP', power: 7 } ],
    carve: [['RAW MEAT', 55, 1], ['BULLFANGO PELT', 35, 2], ['BULLFANGO HEAD', 10, 3]] }
};

export const SMALL_SPAWNS = { 1: ['bullfango'], 2: ['bullfango', 'bullfango'], 3: ['jaggi'], 4: ['bullfango'], 5: ['jaggi', 'jaggi'], 6: ['jaggi'], 9: ['jaggi', 'jaggi'] };

// Base hit chance, damage multiplier, and where a near-miss drifts to
export const PARTS = {
  head: { label: 'HEAD', baseHit: 60, dmgMult: 1.5, drift: ['body'] },
  body: { label: 'BODY', baseHit: 90, dmgMult: 1.0, drift: ['legs'] },
  legs: { label: 'LEGS', baseHit: 80, dmgMult: 0.7, drift: ['body'] },
  tail: { label: 'TAIL', baseHit: 70, dmgMult: 0.9, drift: ['body', 'legs'] }
};

/* SLAIN: 3 carves + 4 rewards + breaks.
   CAPTURED: no carves, 5 rewards + 3 capture-bonus rolls (rarer table) + breaks, money ×1.2. */
export const LOOT = {
  rathalos: { zenny: 3600,
    carve:   [['RATHALOS SCALE', 40, 4], ['RATHALOS SHELL', 28, 4], ['RATHALOS WEBBING', 15, 4], ['FLAME SAC', 10, 4], ['RATHALOS MARROW', 5, 5], ['RATHALOS PLATE', 2, 6]],
    reward:  [['RATHALOS SCALE', 30, 4], ['RATHALOS SHELL', 24, 4], ['WYVERN TEAR', 16, 3], ['RATHALOS WEBBING', 14, 4], ['FLAME SAC', 10, 4], ['RATHALOS MARROW', 4, 5], ['RATHALOS PLATE', 2, 6]],
    capture: [['RATHALOS SHELL', 26, 4], ['RATHALOS MARROW', 22, 5], ['LG WYVERN TEAR', 20, 5], ['RATHALOS WEBBING', 18, 4], ['RATHALOS RUBY', 8, 6], ['RATHALOS PLATE', 6, 6]],
    breaks: { head: [['RATHALOS SCALE', 60, 4], ['RATHALOS SHELL', 32, 4], ['RATHALOS PLATE', 8, 6]],
              body: [['RATHALOS SHELL', 70, 4], ['RATHALOS MARROW', 30, 5]],
              legs: [['RATHALOS SCALE', 60, 4], ['RATHALOS WEBBING', 40, 4]],
              tail: [['RATHALOS TAIL', 75, 4], ['RATHALOS PLATE', 20, 6], ['RATHALOS RUBY', 5, 6]] } },
  tigrex: { zenny: 4200,
    carve:   [['TIGREX SCALE', 40, 4], ['TIGREX SHELL', 28, 4], ['TIGREX CLAW', 16, 4], ['TIGREX FANG', 10, 4], ['TIGREX MARROW', 5, 5], ['TIGREX GEM', 1, 6]],
    reward:  [['TIGREX SCALE', 30, 4], ['TIGREX SHELL', 24, 4], ['WYVERN TEAR', 16, 3], ['TIGREX CLAW', 14, 4], ['TIGREX FANG', 10, 4], ['TIGREX MARROW', 4, 5], ['TIGREX GEM', 2, 6]],
    capture: [['TIGREX SHELL', 26, 4], ['TIGREX MARROW', 22, 5], ['LG WYVERN TEAR', 20, 5], ['TIGREX CLAW', 18, 4], ['TIGREX GEM', 8, 6], ['TIGREX FANG', 6, 4]],
    breaks: { head: [['TIGREX FANG', 60, 4], ['TIGREX SCALE', 32, 4], ['TIGREX GEM', 8, 6]],
              body: [['TIGREX SHELL', 70, 4], ['TIGREX MARROW', 30, 5]],
              legs: [['TIGREX CLAW', 65, 4], ['TIGREX SCALE', 35, 4]],
              tail: [['TIGREX TAIL', 80, 4], ['TIGREX MARROW', 15, 5], ['TIGREX GEM', 5, 6]] } }
};