/* How a battle ends: return to the map, faint/cart, carving (body + severed tail), capture. */
import { CONFIG } from '../core/config.js';
import { $, weighted, Abort } from '../core/utils.js';
import { G, waits } from '../core/state.js';
import { SMALLS, LOOT } from '../data/monsters.js';
import { CAMP_SPAWN } from '../data/world.js';
import { Audio8, fieldMusic } from '../audio/audio8.js';
import { say, pause } from '../ui/dialog.js';
import { showScreen, renderBattle, setMode } from '../ui/hud.js';
import { addLog, anim, pop, setPhase, toast, showLocation } from '../ui/fx.js';
import { buildEntities, refreshEntities, liveBosses } from '../world/spawn.js';
import { MAPS, findFree } from '../world/mapgen.js';
import { worldTick } from '../world/field.js';
import { obtain } from '../world/inventory.js';
import { finishQuest } from '../quest/rewards.js';
import { clearBattleOnly } from './status.js';

/** Puts a freshly severed tail on a free tile near where the fight happened. */
export function placeTail() {
  const t = G.tailDrop;
  if (!t || t.placed) return;
  const here = t.area === G.f.area;
  const p = findFree(MAPS[t.area], t.x, t.y,
    (x, y) => (here && Math.abs(x - G.f.x) + Math.abs(y - G.f.y) < 2) || G.ents.some(e => e.x === x && e.y === y), true);
  Object.assign(t, { x: p.x, y: p.y, placed: true });
}

/** Fade back to the overworld. graceMs = how long monsters ignore you afterwards. */
export async function returnToField(graceMs) {
  const tr = $('trans');
  tr.className = 'fadeIn'; await pause(260);
  const p = G.player;
  p.charge = 0; p.guarding = false; p.foresight = false;
  clearBattleOnly(p); if (G.foe) clearBattleOnly(G.foe);
  G.foe = null; G.itemsUsed = 0; G.screen = 'field';
  refreshEntities();
  placeTail();
  const now = performance.now();
  G.grace = now + graceMs;
  G.ents.forEach(e => { e.alerted = false; e.bang = 0; e.mv = null; e.goal = null; e.next = now + 500; });
  showScreen(); setPhase(0); Audio8.music(fieldMusic());
  tr.className = 'fadeOut'; await pause(260); tr.className = '';
  const t = G.tailDrop;
  if (t && t.placed && !t.carved && !t.told && t.area === G.f.area) {
    t.told = true;
    toast('The severed TAIL is lying nearby.\nFace it and press A to carve!');
  }
}

/** One shared HP bar; 3 faints = quest failed. Each cart cuts reward money by 1/3. */
export async function checkFaint() {
  const p = G.player;
  if (p.hp > 0 || G.over) return false;
  const ps = $('playerSprite');
  Audio8.sfx('faint'); ps.classList.add('a-faint'); await pause(650);
  p.down = true; renderBattle();
  await say('HUNTER fainted!', 'bad');
  p.carts++; renderBattle();
  if (p.carts >= CONFIG.MAX_CARTS) {
    await say(`HUNTER has fainted ${p.carts} times...\nQUEST FAILED.`, 'bad');
    await finishQuest('fail');
    return true;
  }
  addLog(`[carts ${p.carts}/${CONFIG.MAX_CARTS}]`, 'dim');
  await say(`The Felynes carted HUNTER back to camp!\n(CARTS ${p.carts}/${CONFIG.MAX_CARTS} · reward money -1/3)`, 'warn');

  const tr = $('trans');
  tr.className = 'fadeIn'; await pause(300);
  Object.assign(p, { hp: p.maxHp, charge: 0, spirit: 0, guarding: false, foresight: false, down: false, status: {}, stunBuild: 0, acted: false });
  p.buffs.might = 0;
  const foe = G.foe;
  foe.trapped = 0; foe.flash = 0; foe.skipNext = null;
  clearBattleOnly(foe);
  placeTail();   // the tail stays where the fight happened
  G.foe = null; G.itemsUsed = 0; G.screen = 'field';
  Object.assign(G.f, { area: 0, x: CAMP_SPAWN.x, y: CAMP_SPAWN.y, dir: CAMP_SPAWN.dir, mv: null });
  const msgs = worldTick(true);
  buildEntities(true);
  G.grace = performance.now() + CONFIG.GRACE_MS;
  ps.classList.remove('a-faint');
  showScreen(); setPhase(0); showLocation(0); Audio8.music('camp');
  tr.className = 'fadeOut'; await pause(300); tr.className = '';
  if (msgs.length) toast(msgs.join('\n'));
  return true;
}

async function waitCarve(i, n, what = 'BODY') {
  const g = G;
  setPhase(0);
  setMode('carve', { i, n, what });
  await new Promise(res => { waits.carve = res; });
  if (G !== g) throw new Abort();
}

/** If a severed tail hasn't been carved yet, offer it before the quest ends. */
async function carveTail(es) {
  const t = G.tailDrop;
  if (!t || t.carved) return;
  await say(`Don't forget the severed ${t.name} TAIL!`, 'good');
  for (let i = 0; i < CONFIG.TAIL_CARVES; i++) {
    await waitCarve(i, CONFIG.TAIL_CARVES, 'TAIL');
    await stow(weighted(LOOT[t.key].breaks.tail).name, es, 'TAIL CARVE\n');
  }
  t.carved = true;
}

/** Carved item -> pouch (with the full-pouch DISCARD / SWAP choice). */
async function stow(name, es, prefix = '') {
  Audio8.sfx('carve');
  if (await obtain(name, `HUNTER carved ${name}!`, prefix)) pop(es, `+${name}`, 'loot');
}

export async function foeDefeated() {
  const m = G.foe, es = $('enemySprite');
  m.dead = true;
  Audio8.sfx('faint'); es.classList.add('corpse'); renderBattle();

  if (!m.isBoss) {
    await say(`The wild ${m.name} was defeated!`, 'good');
    for (let i = 0; i < CONFIG.SMALL_CARVES; i++) {
      await waitCarve(i, CONFIG.SMALL_CARVES);
      await stow(weighted(SMALLS[m.key].carve).name, es);
    }
    await returnToField(1500);
    return;
  }

  Audio8.music('win');
  await say(`The ${m.name} collapsed...\nThe ${m.name} was SLAIN!`, 'good');
  for (let i = 0; i < CONFIG.CARVES; i++) {
    await waitCarve(i, CONFIG.CARVES);
    anim(es, 'a-shake', 300);
    await stow(weighted(LOOT[m.key].carve).name, es, `CARVE ${i + 1}/${CONFIG.CARVES}\n`);
  }
  await carveTail(es);
  await targetDone('slay');
}

/** Captured: no carving, but bigger rewards. */
export async function captureWin() {
  const m = G.foe;
  m.sleeping = true; m.trapped = 0; renderBattle();
  Audio8.music('win'); Audio8.sfx('capture');
  await say(`The ${m.name} fell into a deep sleep...`, 'good');
  await say(`The ${m.name} was CAPTURED!`, 'good');
  await say("Captured monsters can't be carved...\nbut the Guild pays a CAPTURE BONUS!", 'dim');
  await carveTail($('enemySprite'));   // a severed tail can still be carved
  await targetDone('capture')
}

/** A target is down. Others still alive: back to the field. None left: quest complete. */
async function targetDone(outcome) {
  G.hunted.push({ m: G.foe, outcome });
  const left = liveBosses();
  if (!left.length) {
    await say('QUEST COMPLETE!\nReturning to the village...', 'good');
    await finishQuest(outcome);
    return;
  }
  await say(`TARGET DOWN! (${G.hunted.length}/${G.quest.targets.length})`, 'good');
  await say(`${left.length === 1 ? `The ${left[0].name} is` : `${left.length} targets are`} still out there!`, 'warn');
  await returnToField(CONFIG.GRACE_MS);
}