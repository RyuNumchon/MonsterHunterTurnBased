/* Session flow: village (hub) -> accept quest -> gate -> quest map -> rewards -> back to the village.
   G persists for the whole session; only a full RESTART creates a new G. */
import { CONFIG } from './core/config.js';
import { $, pick } from './core/utils.js';
import { G, setG, UI, input } from './core/state.js';
import { BOX, saveBox } from './core/save.js';
import { WEAPONS } from './data/weapons.js';
import { MONSTERS } from './data/monsters.js';
import { ITEMS } from './data/items.js';
import { CAMP_SPAWN, VILLAGE, VILLAGE_SPAWN, DIRV, OPP } from './data/world.js';
import { Audio8 } from './audio/audio8.js';
import { flow, say, ask, pause, releaseWaits } from './ui/dialog.js';
import { showScreen, renderPanel } from './ui/hud.js';
import { setPhase, showLocation, addLog } from './ui/fx.js';
import { resetMini } from './ui/map.js';
import { makeFoe, makeNpcs, makeSmalls, buildEntities } from './world/spawn.js';
import { putAllInBox } from './quest/rewards.js';

function restorePlayer(p) {
  Object.assign(p, { hp: p.maxHp, sharp: CONFIG.SHARP_MAX, carts: 0, charge: 0, spirit: 0,
    guarding: false, foresight: false, down: false, status: {}, stunBuild: 0, acted: false });
  p.buffs.might = 0;
}

/** Per-quest fields, cleared on departure. */
function questReset() {
  Object.assign(G, { turn: 1, loggedTurn: 0, over: false, outcome: null, paint: 0, itemsUsed: 0, foe: null, grace: 0,
    gathered: {}, gatherUses: {}, carves: [], tailDrop: null, rewards: null, boxed: false, supplyGiven: {} });
  Object.assign(G.flags, { supply: false, campMark: false, fishTraded: false });
}

function hideOverlays() {
  ['rewardOv', 'mapOv', 'fDialog'].forEach(id => $(id).classList.add('hidden'));
  $('trans').className = '';
  $('playerSprite').className = 'sprite';
}

/** Boot / RESTART: spawn in the village with no quest. */
export function newSession() {
  releaseWaits();
  for (const k in ITEMS) BOX.bag[k] ??= 0;     // older saves: make sure every item key exists
  const wk = WEAPONS[BOX.weapon] ? BOX.weapon : 'greatsword';
  setG({
    phase: 'village', quest: null, monsterKey: null, monster: null, smalls: {}, ents: [],
    screen: 'field', busy: false,
    inventory: BOX.bag,                          // the bag is saved with the Item Box
    flags: { tip: 0, vetTip: 0, chiefMet: false },
    f: { area: VILLAGE, ...VILLAGE_SPAWN, mv: null, step: 0 },
    player: { maxHp: CONFIG.PLAYER_MAX_HP, hp: CONFIG.PLAYER_MAX_HP, carts: 0, weapon: wk,
              sharp: CONFIG.SHARP_MAX, charge: 0, spirit: 0, buffs: { might: 0 },
              guarding: false, foresight: false, down: false,
              status: {}, stunBuild: 0, acted: false }
  });
  questReset();
  G.npcs = makeNpcs();
  UI.mode = 'main'; UI.data = {}; input.dirs = [];
  hideOverlays();
  $('log').innerHTML = '';
  resetMini(); buildEntities(true);
  showScreen(); setPhase(0); renderPanel();
  showLocation(VILLAGE);
  Audio8.music('village');
  flow(async () => {
    await say('Welcome to YUKUMO VILLAGE, hunter!');
    await say('Talk to the VILLAGE CHIEF to take on a quest,\nthen head north through the GATE.', 'dim');
  });
}
export const restart = newSession;

/** Called when the hunter steps onto the village gate. */
export function atGate() {
  input.dirs = [];
  flow(async () => {
    const f = G.f, [dx, dy] = DIRV[f.dir];
    f.x -= dx; f.y -= dy; f.dir = OPP[f.dir];   // step back off the gate first
    if (!G.quest) {
      await say("You haven't accepted a quest yet.\nSee the VILLAGE CHIEF first!", 'dim');
      return;
    }
    if (!(await ask(`Depart for the ${G.quest.map}?\nQUEST: ${G.quest.title}`))) return;
    await departQuest();
  });
}

async function departQuest() {
  const tr = $('trans'), q = G.quest;
  Audio8.sfx('area');
  tr.className = 'fadeIn'; await pause(400);
  questReset();
  restorePlayer(G.player);
  G.phase = 'quest'; G.monsterKey = q.target;
  G.monster = makeFoe(q.target, MONSTERS[q.target], true);
  G.monster.area = pick([4, 5, 6, 7, 9]);       // never starts next to camp
  G.smalls = makeSmalls(G.npcs);
  Object.assign(G.f, { area: 0, x: CAMP_SPAWN.x, y: CAMP_SPAWN.y, dir: CAMP_SPAWN.dir, mv: null });
  $('log').innerHTML = '';
  addLog(`[quest ${q.id} · fee ${q.fee}z · ${G.monster.name} starts in area ${G.monster.area}]`, 'dim');
  resetMini(); buildEntities(true); renderPanel();
  Audio8.music('camp');
  tr.className = 'fadeOut'; showLocation(0);
  await pause(300); tr.className = '';
  await say(`QUEST: ${q.title}\nHunt the ${G.monster.name} in the ${q.map}!`);
  await say('Grab supplies from the blue SUPPLY BOX.\nThe CAMP FELYNE can mark the monster for you.', 'dim');
}

/** Reward screen -> village. Boxes unclaimed rewards, returns supply items, refunds the fee on success. */
export function returnToVillage() {
  if (!G || G.phase !== 'quest' || !G.over || $('rewardOv').classList.contains('hidden')) return;
  const won = G.outcome === 'slay' || G.outcome === 'capture';
  if (won && !G.boxed) putAllInBox();
  flow(async () => {
    const tr = $('trans'), q = G.quest;
    tr.className = 'fadeIn'; await pause(400);
    let returned = false;
    for (const [k, n] of Object.entries(G.supplyGiven)) {
      const r = Math.min(n, G.inventory[k] || 0);
      if (r > 0) { G.inventory[k] -= r; returned = true; }
    }
    if (won) BOX.zenny += q.fee;
    saveBox();
    Object.assign(G, { phase: 'village', quest: null, monster: null, monsterKey: null, smalls: {},
                       over: false, outcome: null, screen: 'field', foe: null });
    restorePlayer(G.player);
    Object.assign(G.f, { area: VILLAGE, ...VILLAGE_SPAWN, mv: null });
    UI.mode = 'main'; UI.data = {};
    hideOverlays(); resetMini(); buildEntities(true);
    showScreen(); setPhase(0); renderPanel();
    Audio8.music('village');
    tr.className = 'fadeOut'; showLocation(VILLAGE);
    await pause(300); tr.className = '';
    await say(won ? 'Welcome back! Word of your hunt\nhas already reached the village!' : 'Welcome back... Rest up.\nThere will be other hunts.');
    if (won) await say(`The contract fee of ${q.fee}z was refunded.`, 'good');
    if (returned) await say('The Guild collected the leftover SUPPLY items.', 'dim');
  });
}