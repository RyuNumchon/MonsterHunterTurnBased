/* Overworld simulation: grid movement, monster AI, encounters, area changes, world turns.
   Encounters are collision-based: you walk into a monster, or it walks into you. */
import { CONFIG } from '../core/config.js';
import { rand, pick, randInt } from '../core/utils.js';
import { G, UI, waits, input } from '../core/state.js';
import { SMALLS } from '../data/monsters.js';
import { SOLID, DIRV, dirOf, CAMP_SPAWN, NEST, neighbors } from '../data/world.js';
import { Audio8, fieldMusic } from '../audio/audio8.js';
import { $ } from '../core/utils.js';
import { flow, pause } from '../ui/dialog.js';
import { toast, showLocation } from '../ui/fx.js';
import { MAPS } from './mapgen.js';
import { buildEntities } from './spawn.js';
import { startEncounter } from '../battle/encounter.js';
import { isSlow, tickStatuses } from '../battle/status.js';

/** True when the hunter can move or interact (no dialog, menu or overlay open). */
export const canAct = () => !!G && G.screen === 'field' && !G.busy && !G.over && !UI.menu && !waits.map && !waits.store;

export const tileWalk = (M, x, y) => x >= 0 && y >= 0 && x < M.w && y < M.h && !SOLID.has(M.tiles[y][x]) && !M.blockers.has(x + ',' + y);

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

/** Called every frame while on the field. */
export function updateField(dt, now) {
  if (!canAct()) return;
  const f = G.f;
  // --- Hunter tween / input ---
  if (f.mv) {
    f.mv.t += dt / (CONFIG.MOVE_MS * (isSlow(G.player) ? CONFIG.SLOW_MOVE_MULT : 1));
    if (f.mv.t >= 1) { f.x = f.mv.tx; f.y = f.mv.ty; f.mv = null; if (onPlayerStep()) return; }
  }
  if (!f.mv) {
    const d = input.dirs[input.dirs.length - 1];
    if (d) {
      f.dir = d;
      const [dx, dy] = DIRV[d], tx = f.x + dx, ty = f.y + dy, e = entAt(tx, ty);
      if (e) { if (e.kind !== 'npc') { startEncounter(e, e.kind === 'boss' && e.sleeping ? 'sneak' : 'engage'); return; } }
      else if (tileWalk(MAPS[f.area], tx, ty)) { f.mv = { tx, ty, t: 0 }; f.step++; }
    }
  }
  // --- Entities ---
  for (const e of G.ents) {
    if (G.busy) return;   // an encounter just started
    if (e.mv) { e.mv.t += dt / e.mv.dur; if (e.mv.t >= 1) { e.x = e.mv.tx; e.y = e.mv.ty; e.mv = null; } }
    else if (now >= e.next) aiStep(e, now);
  }
}

/** Returns true if the step triggered an area change. */
function onPlayerStep() {
  const f = G.f, M = MAPS[f.area];
  if (M.tiles[f.y][f.x] === 'E') {
    const ex = M.exits.find(e => e.x === f.x && e.y === f.y);
    if (ex) { changeArea(ex.to); return true; }
  }
  return false;
}

/* Monster AI (one decision per "next" tick):
   - Sleeping boss: stays put.
   - Within aggro range: shows "!", then CHASES at 95 ms/tile (boss) or 115 ms/tile (small),
     faster than the hunter's 150 ms/tile. Stepping onto the hunter = AMBUSH battle.
   - Otherwise: wanders within a few tiles of home.
   - NPCs: Felynes shuffle around; the Veteran just looks around. */
function aiStep(e, now) {
  const f = G.f;
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
  const aggro = e.kind === 'boss' ? CONFIG.BOSS_AGGRO : SMALLS[e.key].aggro;
  const d = Math.abs(e.x - f.x) + Math.abs(e.y - f.y);
  if (now >= G.grace && d <= aggro) {
    if (!e.alerted) {
      e.alerted = true; e.bang = now + 600; e.next = now + 450;
      Audio8.sfx(e.kind === 'boss' ? 'roar' : 'bang');
      return;
    }
    // Step along the longer axis first, fall back to the other
    const ddx = f.x - e.x, ddy = f.y - e.y, opts = [];
    if (Math.abs(ddx) >= Math.abs(ddy)) { if (ddx) opts.push([Math.sign(ddx), 0]); if (ddy) opts.push([0, Math.sign(ddy)]); }
    else { if (ddy) opts.push([0, Math.sign(ddy)]); if (ddx) opts.push([Math.sign(ddx), 0]); }
    const dur = e.kind === 'boss' ? CONFIG.BOSS_CHASE_MS : CONFIG.SMALL_CHASE_MS;
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
  if (Math.random() < 0.55) {
    const [dn, [sx, sy]] = pick(Object.entries(DIRV)), tx = e.x + sx, ty = e.y + sy, rad = e.kind === 'boss' ? 4 : 3;
    if (sx) e.dir = dn;
    if (Math.abs(tx - e.hx) <= rad && Math.abs(ty - e.hy) <= rad && entFree(tx, ty, e)) beginMove(e, tx, ty, CONFIG.WANDER_MS);
  }
  e.next = now + rand(800, 1800);
}

/** Where the hunter appears when arriving in `to` from `from`. */
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
    const msgs = worldTick();                  // moving between areas = 1 turn
    buildEntities(true);
    G.grace = performance.now() + 1200;        // a short beat before anything charges
    Audio8.music(fieldMusic());
    tr.className = 'fadeOut'; showLocation(to);
    await pause(260); tr.className = '';
    if (msgs.length) toast(msgs.join('\n'));
  });
}

/* World turn (area change, resting, carting). While the hunter is in ANOTHER area, the boss:
   heals 3% max HP per turn; below 60% HP after 2+ rest turns it may fall asleep
   (80% in the NEST, 35% elsewhere); wakes after WAKE_AFTER turns or at 70% HP;
   otherwise, once its 4–6 turn timer is up, has a 50%/turn chance to roam to a linked area.
   Returns toast messages (only revealing details while a paintball is active). */
export function worldTick() {
  const msgs = [], p = G.player, m = G.monster;
  G.turn++;
  for (const r of tickStatuses(p, false)) msgs.push(r.msg);
  if (G.paint > 0 && --G.paint === 0) msgs.push('The paintball scent faded...');
  if (p.buffs.might > 0 && --p.buffs.might === 0) msgs.push('The MIGHT SEED wore off.');
  if (m.dead || m.captured || m.area === G.f.area) return msgs;
  m.restTurns++;
  m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * CONFIG.REST_HEAL_PCT));
  if (m.sleeping) {
    m.sleepTurns++;
    if (m.sleepTurns >= CONFIG.WAKE_AFTER || m.hp / m.maxHp >= 0.7) {
      m.sleeping = false;
      if (G.paint > 0) msgs.push(`The ${m.name} woke up.`);
    }
  } else if (m.restTurns >= 2 && m.hp / m.maxHp < 0.6
             && Math.random() < (m.area === NEST ? CONFIG.NEST_SLEEP_CHANCE : CONFIG.SLEEP_CHANCE)) {
    m.sleeping = true; m.sleepTurns = 0;
    if (G.paint > 0) msgs.push(`PAINTBALL: the ${m.name} fell ASLEEP in AREA ${m.area}!`);
  }
  if (!m.sleeping && ++m.roamTimer >= m.fleeAt && Math.random() < CONFIG.ROAM_CHANCE) {
    m.area = pick(neighbors(m.area).filter(a => a !== 0));
    m.roamTimer = 0; m.restTurns = 0; m.posArea = null; m.fleeAt = randInt(CONFIG.FLEE_MIN, CONFIG.FLEE_MAX);
    msgs.push(G.paint > 0 ? `PAINTBALL: the ${m.name} moved to AREA ${m.area}.` : 'You hear a distant roar...');
  }
  return msgs;
}