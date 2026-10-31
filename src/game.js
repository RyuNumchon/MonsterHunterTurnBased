/* New game / restart. There is no title screen: you spawn straight into Base Camp
   with the weapon saved in the Item Box (Great Sword by default). */
import { CONFIG } from './core/config.js';
import { $, pick } from './core/utils.js';
import { G, setG, UI, input } from './core/state.js';
import { BOX } from './core/save.js';
import { WEAPONS } from './data/weapons.js';
import { MONSTERS } from './data/monsters.js';
import { CAMP_SPAWN } from './data/world.js';
import { Audio8 } from './audio/audio8.js';
import { flow, say, releaseWaits } from './ui/dialog.js';
import { showScreen, renderPanel } from './ui/hud.js';
import { setPhase, showLocation } from './ui/fx.js';
import { resetMini } from './ui/map.js';
import { makeFoe, makeNpcs, makeSmalls, buildEntities } from './world/spawn.js';

export function newGame(mk = 'rathalos') {
  releaseWaits();   // pending promises from the old hunt now throw Abort
  const wk = WEAPONS[BOX.weapon] ? BOX.weapon : 'greatsword';
  const g = {
    screen: 'field', turn: 1, loggedTurn: 0, busy: false, over: false, outcome: null,
    paint: 0, itemsUsed: 0, monsterKey: mk, foe: null, grace: 0, ents: [],
    inventory: { potion: 5, whetstone: 3, might: 1, nullberry: 1, antidote: 1, paintball: 1, flash: 1, shock: 0, tranq: 0 },
    gathered: {}, gatherUses: {}, carves: [], tailDrop: null, rewards: null, boxed: false,
    flags: { supply: false, vetHint: false, fishTraded: false, tip: 0 },
    f: { area: 0, x: CAMP_SPAWN.x, y: CAMP_SPAWN.y, dir: CAMP_SPAWN.dir, mv: null, step: 0 },
     player: { maxHp: CONFIG.PLAYER_MAX_HP, hp: CONFIG.PLAYER_MAX_HP, carts: 0, weapon: wk,
              sharp: CONFIG.SHARP_MAX, charge: 0, spirit: 0, buffs: { might: 0 },
              guarding: false, foresight: false, down: false,
              status: {}, stunBuild: 0, acted: false }
  };
  g.monster = makeFoe(mk, MONSTERS[mk], true);
  g.monster.area = pick([4, 5, 6, 7, 9]);   // never starts next to camp
  g.npcs = makeNpcs();
  g.smalls = makeSmalls(g.npcs);
  setG(g);

  UI.mode = 'main'; UI.data = {}; input.dirs = [];
  ['rewardOv', 'mapOv', 'fDialog'].forEach(id => $(id).classList.add('hidden'));
  $('trans').className = '';
  $('log').innerHTML = '';
  $('playerSprite').className = 'sprite';
  resetMini();
  buildEntities(true);
  showScreen(); setPhase(0); renderPanel();
  showLocation(0);
  Audio8.music('camp');

  flow(async () => {
    await say(`QUEST: Hunt the ${G.monster.name}\nin the MOUNTAIN STREAM!`);
    await say(`Your ${WEAPONS[wk].name} is equipped. Swap weapons\nat the red ITEM BOX here in camp.`);
    await say('Grab supplies from the blue SUPPLY BOX,\nthen leave through a numbered exit.', 'dim');
  });
}

/** Restart with a given target monster (falls back to Rathalos). */
export function restart(mk) { newGame(MONSTERS[mk] ? mk : 'rathalos'); }