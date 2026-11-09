/* Session flow: town (village / farm / hub) -> accept quest -> that area's gate -> quest map
   -> rewards -> back to the area you departed from. G persists for the whole session. */
import { CONFIG } from './core/config.js';
import { $ } from './core/utils.js';
import { G, setG, UI, input } from './core/state.js';
import { BOX, saveBox } from './core/save.js';
import { WEAPONS } from './data/weapons.js';
import { CAMP_SPAWN, VILLAGE, HUB, TOWN_SPAWN, DIRV, OPP } from './data/world.js';
import { Audio8 } from './audio/audio8.js';
import { flow, say, ask, pause, releaseWaits } from './ui/dialog.js';
import { showScreen, renderPanel } from './ui/hud.js';
import { showLocation, addLog } from './ui/fx.js';
import { resetMini } from './ui/map.js';
import { makeNpcs, makeSmalls, buildEntities, spawnTargets, installMonsterAlias } from './world/spawn.js';
import { putAllInBox } from './quest/rewards.js';
import { pouchRemove } from './core/pouch.js';
import { applyLook } from './art/look.js';
import { questTargets } from './data/quests.js';

function restorePlayer(p) {
  Object.assign(p, { hp: p.maxHp, sharp: CONFIG.SHARP_MAX, carts: 0, charge: 0, spirit: 0,
    guarding: false, foresight: false, down: false, status: {}, stunBuild: 0, acted: false });
  p.buffs.might = 0;
}

function questReset() {
  Object.assign(G, { turn: 1, loggedTurn: 0, over: false, outcome: null, itemsUsed: 0, foe: null, grace: 0,
    gathered: {}, gatherUses: {}, carves: [], tailDrop: null, rewards: null, boxed: false, supplyGiven: {}, hunted: [] });
  Object.assign(G.flags, { supply: false, campMark: false, fishTraded: false });
}

function hideOverlays() {
  ['rewardOv', 'mapOv', 'fDialog'].forEach(id => $(id).classList.add('hidden'));
  $('trans').className = '';
  $('playerSprite').className = 'sprite';
}

/** The hunter just stepped onto an exit tile: put them back and turn them around. */
function stepBack() {
  const f = G.f, [dx, dy] = DIRV[f.dir];
  f.x -= dx; f.y -= dy; f.dir = OPP[f.dir];
}
const deskName = () => G.f.area === HUB ? 'QUEST COUNTER' : 'VILLAGE CHIEF';

/** Boot / RESTART: spawn in the village with no quest. */
export function newSession() {
  releaseWaits();
  const wk = WEAPONS[BOX.weapon] && BOX.weapons.includes(BOX.weapon) ? BOX.weapon : 'greatsword';
  BOX.weapon = wk;
  setG({
    phase: 'village', quest: null, monsterKey: null, monsters: [], hunted: [], smalls: {}, ents: [],
    screen: 'field', busy: false,
    townUses: {},           // farm gathering; cleared when you return from a quest
    feast: null,            // Hub feast: +max HP for the next quest
    flags: { tip: 0, vetTip: 0, chiefMet: false },
    f: { area: VILLAGE, ...TOWN_SPAWN[VILLAGE], mv: null, step: 0 },
    player: { maxHp: CONFIG.PLAYER_MAX_HP, hp: CONFIG.PLAYER_MAX_HP, carts: 0, weapon: wk,
              sharp: CONFIG.SHARP_MAX, charge: 0, spirit: 0, buffs: { might: 0 },
              guarding: false, foresight: false, down: false, status: {}, stunBuild: 0, acted: false }
  });
  installMonsterAlias(G);
  applyLook();
  questReset();
  G.npcs = makeNpcs();
  UI.mode = 'main'; UI.data = {}; input.dirs = [];
  hideOverlays();
  resetMini(); buildEntities(true);
  showScreen(); renderPanel();
  showLocation(VILLAGE);
  Audio8.music('village');
  flow(async () => {
    await say('Welcome to THEPARAK VILLAGE, hunter!');
    await say('Take a quest from the VILLAGE CHIEF,\nthen depart through the GATE to the east.', 'dim');
  });
}
export const restart = newSession;

/** Stepped onto a quest gate. */
export function atGate() {
  input.dirs = [];
  flow(async () => {
    stepBack();
    if (!G.quest) { await say(`You haven't accepted a quest yet.\nSee the ${deskName()} first!`, 'dim'); return; }
    if (!(await ask(`Depart for the ${G.quest.map}?\nQUEST: ${G.quest.title}`))) return;
    await departQuest();
  });
}

/** Tried to walk to another town area while holding a quest. */
export function lockedOut() {
  input.dirs = [];
  flow(async () => {
    stepBack();
    await say(`You've accepted a quest! Depart through\nthe GATE, or cancel it at the ${deskName()}.`, 'dim');
  });
}

async function departQuest() {
  const tr = $('trans'), q = G.quest, p = G.player;
  Audio8.sfx('area');
  tr.className = 'fadeIn'; await pause(400);
  questReset();
  p.maxHp = CONFIG.PLAYER_MAX_HP + (G.feast ? G.feast.hp : 0);
  restorePlayer(p);
  G.phase = 'quest';
  G.monsters = spawnTargets(q.targets); G.hunted = [];
  G.monsterKey = q.targets[0];
  G.smalls = makeSmalls(G.npcs);
  Object.assign(G.f, { area: 0, x: CAMP_SPAWN.x, y: CAMP_SPAWN.y, dir: CAMP_SPAWN.dir, mv: null });
  addLog(`[quest ${q.id} · fee ${q.fee}z ·${G.monsters.map(m => `m.name@{m.area}`).join(', ')} · max HP ${p.maxHp}${G.feast ? ` (feast +${G.feast.hp})` : ''}]`, 'dim');
  resetMini(); buildEntities(true); renderPanel();
  Audio8.music('camp');
  tr.className = 'fadeOut'; showLocation(0);
  await pause(300); tr.className = '';
  await say(`QUEST: ${q.title}\nHunt the ${questTargets(q)} in the ${q.map}!`);
  if (q.targets.length > 1) await say(`${q.targets.length} targets are roaming the forest at once.\nStay sharp!`, 'dim');
  if (G.feast) await say(`The ${G.feast.name} keeps HUNTER going strong!`, 'good');
  await say('Grab supplies from the blue SUPPLY BOX.\nThe CAMP FELYNE can mark the monster for you.', 'dim');
}

/** Reward screen -> back to the area the quest was taken from. */
export function returnToVillage() {
  if (!G || G.phase !== 'quest' || !G.over || $('rewardOv').classList.contains('hidden')) return;
  const won = G.outcome === 'slay' || G.outcome === 'capture';
  if (won && !G.boxed) putAllInBox();
  flow(async () => {
    const tr = $('trans'), q = G.quest, home = q.board === HUB ? HUB : VILLAGE, p = G.player;
    tr.className = 'fadeIn'; await pause(400);
    let returned = false;
    for (const [k, n] of Object.entries(G.supplyGiven)) {
      if (pouchRemove(k, n) > 0) returned = true;
    }
    if (won) BOX.zenny += q.fee;
    saveBox();
    Object.assign(G, { phase: 'village', quest: null, smalls: {}, monsters: [], monsterKey: null,
                       over: false, outcome: null, screen: 'field', foe: null, townUses: {}, feast: null, hunted: [] });
    p.maxHp = CONFIG.PLAYER_MAX_HP;
    restorePlayer(p);
    Object.assign(G.f, { area: home, ...TOWN_SPAWN[home], mv: null });
    UI.mode = 'main'; UI.data = {};
    hideOverlays(); resetMini(); buildEntities(true);
    showScreen(); renderPanel();
    Audio8.music('village');
    tr.className = 'fadeOut'; showLocation(home);
    await pause(300); tr.className = '';
    await say(won ? 'Welcome back! Word of your hunt\nhas already reached the village!' : 'Welcome back... Rest up.\nThere will be other hunts.');
    if (won) await say(`The contract fee of ${q.fee}z was refunded.`, 'good');
    if (returned) await say('The Guild collected the leftover SUPPLY items.', 'dim');
    await say('The crops at the FARM have regrown.', 'dim');
  });
}