/* Armor skills. Equipped pieces add up points; pts = points needed for each level.
   3-level skills: val[level-1] is the effect. 1-level skills: immune = blocked STATUS id.
   Effect strength is hidden (logged only); names and levels are shown. */
export const SKILLS = {
  attack:    { name: 'ATTACK UP',    pts: [2, 4, 6], val: [1.05, 1.10, 1.15], desc: 'Raises attack.' },
  defense:   { name: 'DEFENSE UP',   pts: [2, 4, 6], val: [5, 10, 15],        desc: 'Raises defense.' },
  crit:      { name: 'CRITICAL EYE', pts: [2, 4, 6], val: [5, 10, 15],        desc: 'Raises critical hit rate.' },
  speed:     { name: 'SPEED UP',     pts: [2, 4, 6], val: [1.05, 1.10, 1.15], desc: 'Raises speed.' },
  accuracy:  { name: 'EAGLE EYE',    pts: [2, 4, 6], val: [4, 8, 12],         desc: 'Your attacks hit more often.' },
  evasion:   { name: 'EVASION',      pts: [2, 4, 6], val: [4, 8, 12],         desc: 'Dodge monster attacks more often.' },
  earplugs:  { name: 'EARPLUGS',     pts: [4], immune: 'roar',   desc: 'Roars have no effect.' },
  windproof: { name: 'WINDPROOF',    pts: [4], immune: 'wind',   desc: 'Wind pressure has no effect.' },
  fireproof: { name: 'FIREPROOF',    pts: [4], immune: 'fire',   desc: 'Prevents fireblight.' },
  tremble:   { name: 'TREMBLE RES',  pts: [4], immune: 'tremble', desc: 'Ground tremble have no effect.' }
};

/** "ATTACK UP +2 · FIREPROOF +2" */
export const skillList = sk => Object.entries(sk || {}).map(([k, n]) => `${SKILLS[k].name} +${n}`).join(' · ') || 'NONE';