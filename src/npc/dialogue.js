/* NPC conversations. Each one demonstrates a different interaction type:
   Camp Felyne  -> branching menu (advice + shop paid from saved zenny)
   Veteran      -> YES/NO choice that reveals the monster on the map
   Comrade      -> item trade (SUSHIFISH for a SHOCK TRAP)            */
import { pick } from '../core/utils.js';
import { G } from '../core/state.js';
import { BOX, saveBox } from '../core/save.js';
import { ITEMS } from '../data/items.js';
import { DATA } from '../art/index.js';
import { Audio8 } from '../audio/audio8.js';
import { say, ask, choose } from '../ui/dialog.js';

const TIPS = [
  'Walk into a monster to start a battle.\nThey run faster than you, so plan ahead!',
  'Hit the big monster with a PAINTBALL.\nThen the MAP shows where it goes, nya!',
  'Weak monsters limp to the WYVERN NEST\n(AREA 8) to sleep. Sneak attacks deal x2!',
  'To CAPTURE: get it under 25% HP,\nset a SHOCK TRAP, then throw 2 TRANQ BOMBs!',
  "Captures can't be carved, meow...\nbut the Guild pays bigger rewards!",
  'RED sharpness makes your blade BOUNCE.\nUse a WHETSTONE before that happens!'
];

async function talkCampCat() {
  await say('CAMP FELYNE: Meow! Welcome to the\nMOUNTAIN STREAM, hunter-nyan!');
  while (true) {
    const c = await choose('CAMP FELYNE', [{ label: 'ADVICE' }, { label: 'SHOP', right: BOX.zenny + 'z' }, { label: 'BYE' }]);
    if (c === 0) await say(TIPS[G.flags.tip++ % TIPS.length]);
    else if (c === 1) await shop();
    else { await say('Good hunting, meow!'); return; }
  }
}

async function shop() {
  const keys = Object.keys(ITEMS);
  while (true) {
    const opts = keys.map(k => ({ icon: DATA['item_' + k], label: ITEMS[k].name, right: ITEMS[k].price + 'z',
      desc: `${ITEMS[k].desc} (You have ${G.inventory[k]})` }));
    opts.push({ label: 'DONE', desc: 'Leave the shop.' });
    const i = await choose(`SHOP · WALLET ${BOX.zenny}z`, opts, { desc: true });
    if (i < 0 || i === keys.length) return;
    const k = keys[i], it = ITEMS[k];
    if (BOX.zenny < it.price) { await say(`Meow... that costs ${it.price}z.\nYou only have ${BOX.zenny}z.`, 'bad'); continue; }
    if (await ask(`Buy a ${it.name} for ${it.price}z?`)) {
      BOX.zenny -= it.price; saveBox(); G.inventory[k]++;
      Audio8.sfx('buy');
      await say(`Thank you, nya! You got a ${it.name}.`, 'good');
    }
  }
}

async function talkVeteran() {
  const m = G.monster;
  if (m.dead || m.captured) { await say('VETERAN: Ha! You actually did it.\nNot bad, rookie.'); return; }
  if (!G.flags.vetHint) {
    await say(`VETERAN: Hunting the ${m.name}, eh?\nI've been tracking it all morning.`);
    if (await ask('Want to know where I last saw it?')) {
      G.flags.vetHint = true;
      G.paint = Math.max(G.paint, 4);   // acts like a short paintball
      Audio8.sfx('item');
      await say(`It was heading for AREA ${m.area}.\nI marked it on your MAP. (4 turns)`, 'good');
    } else await say('Suit yourself. The MOUNTAIN STREAM\nis a big place, rookie.');
  } else {
    await say(pick([
      'Break the TAIL to weaken its attacks.\nBreak the LEGS and it trips over.',
      'Aim for the HEAD: big damage...\nbut it is hard to hit. Misses DRIFT.',
      'A FLASH BOMB halves its accuracy.\nGreat for setting up a full charge.'
    ]));
  }
}

async function talkComrade() {
  if (G.flags.fishTraded) { await say('FELYNE: Purr... that SUSHIFISH was\ndelicious. Good luck, nya!'); return; }
  await say("FELYNE: Mrrrow... I'm sooo hungry...\nI'd trade ANYTHING for a SUSHIFISH.");
  if ((G.gathered.SUSHIFISH || 0) > 0) {
    if (await ask('Give the FELYNE a SUSHIFISH?')) {
      if (--G.gathered.SUSHIFISH <= 0) delete G.gathered.SUSHIFISH;
      G.inventory.shock++; G.flags.fishTraded = true;
      Audio8.sfx('capture');
      await say('FELYNE: Nyaaa! Thank you!\nTake my SHOCK TRAP, nya!', 'good');
      await say('HUNTER received a SHOCK TRAP!', 'good');
    } else await say('FELYNE: ...*stomach growls loudly*');
  } else await say('Fish at the river in AREA 6\nor the waterfall in AREA 7, nya!', 'dim');
}

/** NPC id -> conversation. Each returns a promise (run inside flow()). */
export const NPC_TALK = { campcat: talkCampCat, veteran: talkVeteran, comrade: talkComrade };