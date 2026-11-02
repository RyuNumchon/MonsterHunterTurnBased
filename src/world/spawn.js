/* Creates monsters/NPCs and builds the list of entities walking around the current area. */
import { CONFIG } from '../core/config.js';
import { pick, randInt, rand } from '../core/utils.js';
import { G } from '../core/state.js';
import { SMALLS, SMALL_SPAWNS } from '../data/monsters.js';
import { NPC_DEFS, CXT, CYT } from '../data/world.js';
import { MAPS, findFree } from './mapgen.js';

/** Shared shape for every combatant (boss or small). It is also its own overworld entity. */
export function makeFoe(key, d, isBoss) {
  const parts = {};
  for (const k in d.parts) parts[k] = { hp: d.parts[k], max: d.parts[k], broken: false };
  return {
    kind: isBoss ? 'boss' : 'small', key, isBoss, name: d.name, rank: d.rank, spd: d.spd || 100, attacks: d.attacks,
    hp: d.hp, maxHp: d.hp, parts, sleeping: false, sleepTurns: 0, flash: 0, skipNext: null, atkMult: 1, armorCracked: false,
    status: {}, stunBuild: 0, acted: false,
    trapped: 0, trapCount: 0, tranq: 0, turnsInArea: 0,
    fleeAt: randInt(CONFIG.FLEE_MIN, CONFIG.FLEE_MAX), lowHpFled: false, limping: false, searched: 0,
    warnedCap: false, roared: false, dead: false, captured: false, area: null, posArea: null,
    roamMs: rand(CONFIG.ROAM_MIN_MS, CONFIG.ROAM_MAX_MS),
    x: 0, y: 0, hx: 0, hy: 0, mv: null, next: 0, dir: 'left', alerted: false, bang: 0, goal: null, leaving: null, stuck: 0
  };
}

export function makeNpcs() {
  return NPC_DEFS.map(d => {
    const p = findFree(MAPS[d.area], d.at[0], d.at[1]);
    return { ...d, kind: 'npc', x: p.x, y: p.y, hx: p.x, hy: p.y, mv: null, next: 0, dir: 'down' };
  });
}

/** Small monsters per area, spaced from exits, the arena, each other and NPCs. */
export function makeSmalls(npcs) {
  const out = {};
  for (const a in SMALL_SPAWNS) {
    const M = MAPS[a], list = [];
    SMALL_SPAWNS[a].forEach(key => {
      const cands = [];
      M.reach.forEach(k => {
        const [x, y] = k.split(',').map(Number), c = M.tiles[y][x];
        if (M.blockers.has(k) || c === 'E' || c === '-') return;
        if (M.exits.some(e => Math.abs(e.x - x) + Math.abs(e.y - y) < 6)) return;
        if (Math.abs(x - 11.5) + Math.abs(y - 8.5) < 4) return;
        if (list.some(s => Math.abs(s.hx - x) + Math.abs(s.hy - y) < 4)) return;
        if (npcs.some(n => n.area === +a && Math.abs(n.hx - x) + Math.abs(n.hy - y) < 4)) return;
        cands.push({ x, y });
      });
      const p = cands.length ? pick(cands) : findFree(M, CXT + 5, CYT);
      const s = makeFoe(key, SMALLS[key], false);
      Object.assign(s, { area: +a, x: p.x, y: p.y, hx: p.x, hy: p.y });
      list.push(s);
    });
    out[a] = list;
  }
  return out;
}

/** Rebuilds G.ents for the hunter's current area. reset = put everyone back home. */
export function buildEntities(reset) {
  const a = G.f.area, M = MAPS[a], list = [], now = performance.now();
  G.npcs.filter(n => n.area === a).forEach(n => {
    if (reset) { n.x = n.hx; n.y = n.hy; n.mv = null; }
    n.next = now + 1000; list.push(n);
  });
  (G.smalls[a] || []).filter(s => !s.dead).forEach(s => {
    if (reset) { s.x = s.hx; s.y = s.hy; s.mv = null; s.alerted = false; s.goal = null;}
    s.next = now + 800 + Math.random() * 800; list.push(s);
  });
  const m = G.monster;
  if (m && !m.dead && !m.captured && m.area === a) {
    if (reset || m.posArea !== a) {
      const p = findFree(M, 11, 8, (x, y) => list.some(e => Math.abs(e.x - x) + Math.abs(e.y - y) < 2), true);
      Object.assign(m, { x: p.x, y: p.y, hx: p.x, hy: p.y, mv: null, posArea: a, alerted: false, turnsInArea: 0, goal: null, leaving: null});
      m.next = now + 1500;
    }
    list.push(m);
  }
  G.ents = list;
}

/** Drops dead monsters and a boss that has left the area (after a battle). */
export function refreshEntities() {
  G.ents = G.ents.filter(e => !e.dead && !(e.kind === 'boss' && (e.area !== G.f.area || e.captured)));
}