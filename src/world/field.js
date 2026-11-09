/* Overworld simulation: grid movement, monster AI (wander / chase / leave), real-time
   big-monster roaming between areas, area changes and world turns.
   Encounters are collision-based: you walk into a monster, or it walks into you.
   Step times scale with speed: ms = base × 100 / speed (battle/speed.js). */
import { CONFIG } from '../core/config.js';
import { $, rand, pick } from '../core/utils.js';
import { G, UI, waits, input } from '../core/state.js';
import { SMALLS } from '../data/monsters.js';
import { isTown, GATE, SOLID, DIRV, dirOf, CAMP_SPAWN, neighbors } from '../data/world.js';
import { Audio8, fieldMusic } from '../audio/audio8.js';
import { flow, pause } from '../ui/dialog.js';
import { toast, showLocation, addLog } from '../ui/fx.js';
import { MAPS, findFree } from './mapgen.js';
import { buildEntities, liveBosses } from './spawn.js';
import { startEncounter } from '../battle/encounter.js';
import { tickStatuses } from '../battle/status.js';
import { stepMs } from '../battle/speed.js';
import { atGate, lockedOut } from '../game.js';
import { nestCheck, nestTick } from './nest.js';

const DIRS4 = Object.values(DIRV);

/** True when the hunter can move or interact (no dialog, menu or overlay open). */
export const canAct = () => !!G && G.screen === 'field' && !G.busy && !G.over && !UI.menu && !waits.map && !waits.store && !UI.count;

/** A severed tail lying on this tile of the current area (blocks movement; face it + A to carve). */
export const tailAt = (x, y) => {
  const t = G.tailDrop;
  return !!t && t.placed && t.area === G.f.area && t.x === x && t.y === y;
};

export const tileWalk = (M, x, y) => x >= 0 && y >= 0 && x < M.w && y < M.h
  && !SOLID.has(M.tiles[y][x]) && !M.blockers.has(x + ',' + y) && !tailAt(x, y);

/** Entity standing on (or stepping into) a tile. */
export function entAt(x, y, except) {
  return G.ents.find(e => e !== except && !e.dead && ((e.x === x && e.y === y) || (e.mv && e.mv.tx === x && e.mv.ty === y)));
}
export function playerOn(x, y) { const f = G.f; return (f.x === x && f.y === y) || (!!f.mv && f.mv.tx === x && f.mv.ty === y); }
function entFree(x, y, self) {
  const M = MAPS[G.f.area];
  return tileWalk(M, x, y) && M.tiles[y][x] !== 'E' && !entAt(x, y, self) && !playerOn(x, y);
}
function beginMove(e, tx, ty, dur) { e.mv = { tx, ty, t: 0, dur }; }

/* ---------- Pathfinding ---------- */
/** BFS over walkable tiles (other entities ignored). First [dx, dy] toward the goal, or null. */
function stepToward(M, sx, sy, tx, ty, exitOk) {
  if (sx === tx && sy === ty) return null;
  const W = M.w, prev = new Int32Array(W * M.h).fill(-1), start = sy * W + sx, goal = ty * W + tx, q = [start];
  prev[start] = start;
  for (let i = 0; i < q.length && prev[goal] === -1; i++) {
    const k = q[i], x = k % W, y = (k / W) | 0;
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx, ny = y + dy;
      if (!tileWalk(M, nx, ny)) continue;
      const nk = ny * W + nx;
      if (prev[nk] !== -1) continue;
      if (M.tiles[ny][nx] === 'E' && !(exitOk && nk === goal)) continue;
      prev[nk] = k; q.push(nk);
    }
  }
  if (prev[goal] === -1) return null;
  let k = goal;
  while (prev[k] !== start) k = prev[k];
  return [k % W - sx, ((k / W) | 0) - sy];
}

/** Walkable, non-exit tiles of an area (cached). */
function openTiles(M) {
  return M.open ||= [...M.reach].map(k => k.split(',').map(Number))
    .filter(([x, y]) => M.tiles[y][x] !== 'E' && M.tiles[y][x] !== '-' && !M.blockers.has(x + ',' + y));
}

/** Random wander target: anywhere in the area (boss) or within SMALL_ROAM_RADIUS of home (small). */
function pickGoal(e, M) {
  const rad = e.kind === 'boss' ? Infinity : CONFIG.SMALL_ROAM_RADIUS;
  const c = openTiles(M).filter(([x, y]) =>
    Math.abs(x - e.hx) + Math.abs(y - e.hy) <= rad && Math.abs(x - e.x) + Math.abs(y - e.y) >= 4);
  if (!c.length) return null;
  const [x, y] = pick(c);
  e.stuck = 0;
  return { x, y };
}

/** One step toward e.goal. Returns false when the goal should be dropped. */
function walkStep(e, M, now, ms, exitOk) {
  const g = e.goal, st = stepToward(M, e.x, e.y, g.x, g.y, exitOk);
  if (!st) return false;
  const tx = e.x + st[0], ty = e.y + st[1];
  if (st[0]) e.dir = dirOf(st[0], 0);
  const free = exitOk && tx === g.x && ty === g.y ? !entAt(tx, ty, e) && !playerOn(tx, ty) : entFree(tx, ty, e);
  if (!free) { e.next = now + 250; return ++e.stuck < 6; }   // blocked: wait a moment, give up after 6 tries
  e.stuck = 0;
  beginMove(e, tx, ty, ms);
  e.next = now + ms;
  return true;
}

/* ---------- Per-frame update ---------- */
export function updateField(dt, now) {
  if (!canAct()) return;
  const f = G.f;
  for (const m of liveBosses()) roamClock(m, dt);
  if (f.mv) {
    f.mv.t += dt / stepMs(G.player, CONFIG.MOVE_MS);
    if (f.mv.t >= 1) { f.x = f.mv.tx; f.y = f.mv.ty; f.mv = null;
      const tile = MAPS[f.area].tiles[f.y][f.x];
      if (SOLID.has(tile))
        console.warn(`[collision] HUNTER stepped onto solid '${tile}' in area ${f.area} at (${f.x},${f.y})`);
      if (onPlayerStep()) return;
    }
  }
  if (!f.mv) {
    const d = input.dirs[input.dirs.length - 1];
    if (d) {
      f.dir = d;
      const [dx, dy] = DIRV[d], tx = f.x + dx, ty = f.y + dy, e = entAt(tx, ty);
      if (e) {
        if (e.kind !== 'npc') {
          startEncounter(e.kind === 'boss' ? e.ref : e, e.kind === 'boss' && e.sleeping ? 'sneak' : 'engage');
          return;
        }
      }
      else if (tileWalk(MAPS[f.area], tx, ty)) { f.mv = { tx, ty, t: 0 }; f.step++; }
    }
  }
  // --- Entities ---
  for (const e of [...G.ents]) {
    if (G.busy) return;   // an encounter just started
    if (e.mv) { e.mv.t += dt / e.mv.dur; if (e.mv.t >= 1) { e.x = e.mv.tx; e.y = e.mv.ty; e.mv = null; } }
    else if (now >= e.next) aiStep(e, now);
  }
}

/** Returns true if the step triggered an area change. */
function onPlayerStep() {
  const f = G.f, M = MAPS[f.area];
  if (M.tiles[f.y][f.x] !== 'E') return false;
  const ex = M.exits.find(e => e.x === f.x && e.y === f.y);
  if (!ex) return false;
  if (ex.to === GATE) atGate();
  else if (G.phase === 'village' && G.quest && isTown(ex.to)) lockedOut();   // quest accepted: stay put
  else changeArea(ex.to);
  return true;
}

/* ---------- Monster & NPC AI ----------
   Priority: asleep -> chase the hunter (aggro range) -> walk to an exit (boss leaving) -> wander. */
function aiStep(e, now) {
  const f = G.f, M = MAPS[f.area];
  if (e.kind === 'npc') {
    if (e.wander && Math.random() < 0.5) {
      const [dn, [sx, sy]] = pick(Object.entries(DIRV)), tx = e.x + sx, ty = e.y + sy;
      e.dir = dn;
      if (Math.abs(tx - e.hx) <= 1 && Math.abs(ty - e.hy) <= 1 && entFree(tx, ty, e)) beginMove(e, tx, ty, 380);
    } else e.dir = pick(['down', 'left', 'right', 'up']);
    e.next = now + rand(1200, 2600);
    return;
  }
  if (e.kind === 'boss' && e.sleeping) { e.next = now + 800; return; }

  // Chase
  const aggro = e.kind === 'boss' ? CONFIG.BOSS_AGGRO : SMALLS[e.key].aggro;
  const d = Math.abs(e.x - f.x) + Math.abs(e.y - f.y);
  if (now >= G.grace && d <= aggro) {
    e.leaving = null; e.goal = null;   // forget about leaving: there's a hunter here
    if (!e.alerted) {
      e.alerted = true; e.bang = now + 600; e.next = now + 450;
      Audio8.sfx(e.kind === 'boss' ? 'roar' : 'bang');
      return;
    }
    // Step along the longer axis first, fall back to the other 
    const ddx = f.x - e.x, ddy = f.y - e.y, opts = [];
    if (Math.abs(ddx) >= Math.abs(ddy)) { if (ddx) opts.push([Math.sign(ddx), 0]); if (ddy) opts.push([0, Math.sign(ddy)]); }
    else { if (ddy) opts.push([0, Math.sign(ddy)]); if (ddx) opts.push([Math.sign(ddx), 0]); }
    const dur = stepMs(e, e.kind === 'boss' ? CONFIG.BOSS_CHASE_MS : CONFIG.SMALL_CHASE_MS);
    let moved = false;
    for (const [sx, sy] of opts) {
      const tx = e.x + sx, ty = e.y + sy;
      if (sx) e.dir = dirOf(sx, sy);
      if (playerOn(tx, ty)) { startEncounter(e, 'ambush'); return; }
      if (entFree(tx, ty, e)) { beginMove(e, tx, ty, dur); moved = true; break; }
    }
    e.next = now + (moved ? dur : 200);
    return;
  }
  e.alerted = false;
  const ms = stepMs(e, CONFIG.WANDER_MS);

  // Boss walking to an exit to roam into the next area
  if (e.leaving) {
    const ex = e.leaving;
    if (e.x === ex.x && e.y === ex.y) { bossLeaves(e); return; }
    e.goal = { x: ex.x, y: ex.y };
    if (!walkStep(e, M, now, ms, true)) bossLeaves(e);   // path blocked: slip away anyway
    return;
  }

  // Wander: walk to a spot, linger, pick another
  if (e.goal && e.x === e.goal.x && e.y === e.goal.y) { e.goal = null; e.next = now + rand(700, 2200); return; }
  if (!e.goal) { e.goal = pickGoal(e, M); if (!e.goal) { e.next = now + 1500; return; } }
  if (!walkStep(e, M, now, ms, false)) { e.goal = null; e.next = now + 400; }
}

/* ---------- Big monster roaming (real time) ----------
   Every ROAM_MIN–MAX ms on the field the boss heads to a neighbouring area (never camp).
   Same area as the hunter: it walks to the exit visibly (unless it has spotted the hunter).
   Elsewhere: it simply moves; if it moves INTO the hunter's area, it walks in through that exit.
   Sleeping or limping monsters stay put. */
function roamClock(m, dt) {
  if (!m || m.dead || m.captured || m.sleeping || m.limping || m.leaving) return;
  if (m.area === G.f.area && m.alerted) return;
  if ((m.roamMs -= dt) > 0) return;
  m.roamMs = rand(CONFIG.ROAM_MIN_MS, CONFIG.ROAM_MAX_MS);
  const to = pick(neighbors(m.area).filter(a => a !== 0));
  if (m.area === G.f.area) { m.leaving = MAPS[m.area].exits.find(e => e.to === to); m.goal = null; return; }
  const from = m.area;
  m.area = to; m.posArea = null;
  if (to === G.f.area) bossEnters(m, from);
  else if (m.paint > 0) toast(`PAINTBALL: the ${m.name} moved to AREA ${to}.`);
}

function bossLeaves(e) {
  const to = e.leaving.to;
  Object.assign(e, { area: to, posArea: null, leaving: null, goal: null, mv: null });
  G.ents = G.ents.filter(x => x !== e);
  Audio8.sfx('swoosh');
  toast(`The ${e.name} left for AREA ${to}!`);
}

/** Where the hunter appears when arriving in `to` from `from`. */
function bossEnters(m, from) {
  const M = MAPS[G.f.area], ex = M.exits.find(e => e.to === from), f = G.f;
  const p = findFree(M, ex ? ex.x : 12, ex ? ex.y : 9,
    (x, y) => Math.abs(x - f.x) + Math.abs(y - f.y) < 3 || !!entAt(x, y), true);
  Object.assign(m, { x: p.x, y: p.y, hx: p.x, hy: p.y, mv: null, goal: null, leaving: null,
                     posArea: G.f.area, alerted: false, next: performance.now() + 900 });
  G.ents.push(m);
  Audio8.sfx('roar');
  toast(`The ${m.name} entered the area!`);
}

/* ---------- Area changes & world turns ---------- */
function spawnFor(to, from) {
  const ex = MAPS[to].exits.find(e => e.to === from);
  return ex ? { x: ex.x + ex.ix, y: ex.y + ex.iy, dir: ex.idir } : { ...CAMP_SPAWN };
}

export function changeArea(to) {
  flow(async () => {
    const tr = $('trans');
    Audio8.sfx('area');
    tr.className = 'fadeIn'; await pause(260);
    const from = G.f.area, sp = spawnFor(to, from);
    Object.assign(G.f, { area: to, x: sp.x, y: sp.y, dir: sp.dir, mv: null });
    const msgs = worldTick;                  // moving between areas = 1 turn
    buildEntities(true);
    G.grace = performance.now() + 1200;        // a short beat before anything charges
    Audio8.music(fieldMusic());
    tr.className = 'fadeOut'; showLocation(to);
    await pause(260); tr.className = '';
    if (msgs.length) toast(msgs.join('\n'));
  });
}

/** World turn: area change, resting or carting. Statuses can't knock anyone out on the map. */
export function worldTick() {
  const msgs = [], p = G.player;
  G.turn++;
  for (const r of tickStatuses(p, false)) msgs.push(r.msg);
  for (const m of liveBosses()) if (m.paint > 0 && --m.paint === 0)
    msgs.push(`The paintball scent faded from the ${m.name}.`);
  if (p.buffs.might > 0 && --p.buffs.might === 0) msgs.push('The MIGHT SEED wore off.');
  for (const m of liveBosses()) tickStatuses(m, false);
  return msgs.concat(liveBosses().filter(m => m !== G.foe).flatMap(m => bossOffscreenTurn(m)));
}

/* Field or battle turn for an offscreen boss; nesting handles sleep and recovery. */
export function bossOffscreenTurn(m) {
  if (!m || m.dead || m.captured) return [];
  if (nestCheck(m)) return [];                       // just fell asleep
  const woke = nestTick(m);
  if (woke) return G.f.area === m.area ? [woke] : [];
  if (m.sleeping) return [];                         // asleep: no roaming
  return [];
}