/* How a battle ends: return to the map, faint/cart, carving (slain), capture. */
import { CONFIG } from '../core/config.js';
import { $, weighted, Abort } from '../core/utils.js';
import { G, waits } from '../core/state.js';
import { SMALLS, LOOT } from '../data/monsters.js';
import { CAMP_SPAWN } from '../data/world.js';
import { Audio8, fieldMusic } from '../audio/audio8.js';
import { say, pause } from '../ui/dialog.js';
import { showScreen, renderBattle, setMode } from '../ui/hud.js';
import { anim, pop, setPhase, toast, showLocation } from '../ui/fx.js';
import { buildEntities, refreshEntities } from '../world/spawn.js';
import { worldTick } from '../world/field.js';
import { addGathered } from '../world/interact.js';
import { finishQuest } from '../quest/rewards.js';

/** Fade back to the overworld. graceMs = how long monsters ignore you afterwards. */
export async function returnToField(graceMs) {
  const tr = $('trans');
  tr.className = 'fadeIn'; await pause(260);
  const p = G.player;
  p.charge = 0; p.guarding = false; p.foresight = false;
  G.foe = null; G.itemsUsed = 0; G.screen = 'field';
  refreshEntities();
  const now = performance.now();
  G.grace = now + graceMs;
  G.ents.forEach(e => { e.alerted = false; e.bang = 0; e.mv = null; e.next = now + 500; });
  showScreen(); setPhase(0); Audio8.music(fieldMusic());
  tr.className = 'fadeOut'; await pause(260); tr.className = '';
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
  await say(`The Felynes carted HUNTER back to camp!\n(CARTS ${p.carts}/${CONFIG.MAX_CARTS} · reward money -1/3)`, 'warn');

  const tr = $('trans');
  tr.className = 'fadeIn'; await pause(300);
  Object.assign(p, { hp: p.maxHp, charge: 0, spirit: 0, guarding: false, foresight: false, down: false });
  p.buffs.might = 0;
  const foe = G.foe; foe.trapped = 0; foe.flash = 0; foe.skipNext = null;
  G.foe = null; G.itemsUsed = 0; G.screen = 'field';
  Object.assign(G.f, { area: 0, x: CAMP_SPAWN.x, y: CAMP_SPAWN.y, dir: CAMP_SPAWN.dir, mv: null });
  const msgs = worldTick();
  buildEntities(true);
  G.grace = performance.now() + CONFIG.GRACE_MS;
  ps.classList.remove('a-faint');
  showScreen(); setPhase(0); showLocation(0); Audio8.music('camp');
  tr.className = 'fadeOut'; await pause(300); tr.className = '';
  if (msgs.length) toast(msgs.join('\n'));
  return true;
}

/** Shows the CARVE button and waits for the player (button or Z). */
async function waitCarve(i, n) {
  const g = G;
  setPhase(0);
  setMode('carve', { i, n });
  await new Promise(res => { waits.carve = res; });
  if (G !== g) throw new Abort();
}

/** HP reached 0. Small monster: 1 carve then back to the map. Boss: 3 carves then rewards. */
export async function foeDefeated() {
  const m = G.foe, es = $('enemySprite');
  m.dead = true;
  Audio8.sfx('faint'); es.classList.add('corpse'); renderBattle();

  if (!m.isBoss) {
    await say(`The wild ${m.name} was defeated!`, 'good');
    for (let i = 0; i < CONFIG.SMALL_CARVES; i++) {
      await waitCarve(i, CONFIG.SMALL_CARVES);
      const r = weighted(SMALLS[m.key].carve);
      addGathered(r.name); Audio8.sfx('carve'); pop(es, `+${r.name}`, 'loot');
      await say(`HUNTER carved ${r.name}!`, 'good');
    }
    await returnToField(1500);
    return;
  }

  Audio8.music('win');
  await say(`The ${m.name} collapsed...\nThe ${m.name} was SLAIN!`, 'good');
  G.carves = [];
  for (let i = 0; i < CONFIG.CARVES; i++) {
    await waitCarve(i, CONFIG.CARVES);
    const r = weighted(LOOT[m.key].carve);
    G.carves.push(r);
    Audio8.sfx('carve'); anim(es, 'a-shake', 300); pop(es, `+${r.name}`, 'loot');
    await say(`CARVE ${i + 1}/${CONFIG.CARVES}\nHUNTER carved ${r.name}!`, 'good');
  }
  await say('QUEST COMPLETE!\nReturning to the village...', 'good');
  await finishQuest('slay');
}

/** Captured: no carving, but bigger rewards. */
export async function captureWin() {
  const m = G.foe;
  m.sleeping = true; m.trapped = 0; renderBattle();
  Audio8.music('win'); Audio8.sfx('capture');
  await say(`The ${m.name} fell into a deep sleep...`, 'good');
  await say(`The ${m.name} was CAPTURED!`, 'good');
  await say("Captured monsters can't be carved...\nbut the Guild pays a CAPTURE BONUS!", 'dim');
  await finishQuest('capture');
}