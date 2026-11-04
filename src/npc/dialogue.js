/* NPC conversations.
   Village:   CHIEF (quest board) · MERCHANT (buy / sell) · VETERAN (tips) · KID (small talk)
   Quest map: CAMP FELYNE (advice + mark the monster) · FELYNE COMRADE (item trade) */
import { pick } from '../core/utils.js';
import { G } from '../core/state.js';
import { BOX, saveBox } from '../core/save.js';
import { ITEMS, FEASTS, itemName, itemRar } from '../data/items.js';
import { MONSTERS, LOOT } from '../data/monsters.js';
import { QUEST_BOARDS } from '../data/quests.js';
import { DATA, itemIcon } from '../art/index.js';
import { Audio8 } from '../audio/audio8.js';
import { say, ask, choose, askCount } from '../ui/dialog.js';
import { addLog } from '../ui/fx.js';
import { VILLAGE, HUB } from '../data/world.js';
import { pouchCount, pouchAdd, pouchRemove, boxCount, boxAdd, boxRemove } from '../core/pouch.js';

/* ================= VILLAGE ================= */

const CHIEF_LINES = [
  'CHIEF: The hot springs here heal body and soul.\nHohoho!',
  'CHIEF: Every monster has a weakness.\nA wise hunter learns them all.',
  'CHIEF: Do not let pride drive you, young one.\nThe mountain does not forgive carelessness.'
];
const HANDLER_LINES = [
  'HANDLER: Hunters from all over gather here.\nThe FELYNE CHEF feeds them all!',
  'HANDLER: Take a quest here, and you depart\nthrough the HUB gate to the north.',
  "HANDLER: Hungry? Sit at the kitchen counter.\nThe chef's feasts make you tougher!"
];

/* Shared quest desk (Village Chief and Hub Quest Handler). */
const DESK = {
  [VILLAGE]: { who: 'CHIEF',   title: 'VILLAGE CHIEF', gate: 'east' },
  [HUB]:     { who: 'HANDLER', title: 'QUEST COUNTER', gate: 'north' }
};

async function questMenu(board, lines) {
  const D = DESK[board], list = QUEST_BOARDS[board];
  while (true) {
    const q = G.quest;
    const i = await choose(D.title, [
      { label: 'QUEST BOARD', right: q ? 'TAKEN' : list.length },
      { label: 'CANCEL QUEST', disabled: !q || q.board !== board },
      { label: 'TALK' }, { label: 'BYE' }]);
    if (i === 0) { if (await questBoard(board)) return; }
    else if (i === 1) await cancelQuest(board);
    else if (i === 2) await say(pick(lines));
    else {
      await say(q ? `${D.who}: The ${MONSTERS[q.target].name} awaits.\nThe GATE is to the ${D.gate}. Return safely!`
                  : `${D.who}: Come back whenever you are ready.`);
      return;
    }
  }
}

/** Returns true when a quest was just accepted (ends the conversation). */
async function questBoard(board) {
  const D = DESK[board], list = QUEST_BOARDS[board];
  while (true) {
    const opts = list.map(q => ({
      icon: DATA['mf_' + q.target], label: q.title,
      right: G.quest && G.quest.id === q.id ? 'ACCEPTED' : '★' + q.stars,
      desc: `${'★'.repeat(q.stars)} · HUNT: ${MONSTERS[q.target].name}<br>MAP: ${q.map}<br>REWARD ${LOOT[q.target].zenny}z · FEE ${q.fee}z<br>${q.desc}`
    }));
    opts.push({ label: 'BACK', desc: `Return to the ${D.title}.` });
    const i = await choose(`${D.title} · QUESTS`, opts, { desc: true });
    if (i < 0 || i === list.length) return false;
    const q = list[i];
    if (G.quest && G.quest.id === q.id) { await say(`${D.who}: You have already taken this quest.`, 'dim'); continue; }
    if (G.quest) { await say(`${D.who}: One quest at a time.\nCancel your current quest first.`, 'dim'); continue; }
    if (BOX.zenny < q.fee) { await say(`${D.who}: The contract fee is ${q.fee}z...\nYou only have ${BOX.zenny}z.`, 'bad'); continue; }
    if (!(await ask(`Accept "${q.title}"?\nContract fee: ${q.fee}z`))) continue;
    BOX.zenny -= q.fee; saveBox();
    G.quest = q;
    Audio8.sfx('buy');
    await say(`QUEST ACCEPTED!\n"${q.title}"`, 'good');
    await say(`${D.who}: Depart through the GATE to the ${D.gate}.\nYou can't leave this area until you do!`);
    return true;
  }
}

async function cancelQuest(board) {
  const q = G.quest;
  if (!(await ask(`Cancel "${q.title}"?\nThe ${q.fee}z fee will be refunded.`))) return;
  BOX.zenny += q.fee; saveBox();
  G.quest = null;
  Audio8.sfx('back');
  await say(`${DESK[board].who}: Very well. The quest has been cancelled.`);
}

async function talkChief() {
  if (!G.flags.chiefMet) {
    G.flags.chiefMet = true;
    await say("CHIEF: Ah, a new hunter! Welcome to THEPARAK.\nOur village relies on brave souls like you.");
  } else await say('CHIEF: Hohoho. What brings you to me today?');
  await questMenu(VILLAGE, CHIEF_LINES);
}

async function talkReceptionist() {
  await say('HANDLER: Welcome to the GATHERING HUB!\nLooking for work, hunter?');
  await questMenu(HUB, HANDLER_LINES);
}

/* ---------- Felyne Chef: one feast per quest, +max HP for the next quest ---------- */
async function talkChef() {
  if (G.feast) {
    await say(`FELYNE CHEF: You already ate the ${G.feast.name}, nya!\nCome back hungry after your next quest!`, 'dim');
    return;
  }
  await say('FELYNE CHEF: Welcome, welcome! A full belly\nmakes a fearless hunter, nya!');
  const opts = FEASTS.map(f => ({ label: f.name, right: f.price + 'z', desc: f.desc }));
  opts.push({ label: 'NOTHING', desc: 'Maybe later.' });
  const i = await choose(`KITCHEN · WALLET ${BOX.zenny}z`, opts, { desc: true });
  if (i < 0 || i === FEASTS.length) { await say("FELYNE CHEF: Come back when you're hungry, nya!"); return; }
  const f = FEASTS[i];
  if (BOX.zenny < f.price) { await say(`FELYNE CHEF: That's ${f.price}z, nya...\nYou only have ${BOX.zenny}z.`, 'bad'); return; }
  if (!(await ask(`Order the ${f.name} for ${f.price}z?`))) return;
  BOX.zenny -= f.price; saveBox();
  G.feast = f;
  addLog(`[feast ${f.id}: +${f.hp} max HP for the next quest]`, 'dim');
  Audio8.sfx('heal');
  await say(`*munch munch munch*...\nThe ${f.name} was delicious!`, 'good');
  await say('HUNTER feels tougher!\n(HEALTH up for the next quest)', 'good');
}

/* ---------- Merchant: purchases go to the ITEM BOX; selling is from the ITEM BOX ---------- */
const MAT_PRICE = { 1: 15, 2: 40, 3: 90, 4: 180, 5: 360, 6: 720 };
const sellPrice = id => ITEMS[id] ? Math.floor(ITEMS[id].price / 2) : MAT_PRICE[itemRar(id)];

async function talkMerchant() {
  await say('MERCHANT: Welcome, welcome!\nBuying or selling today?');
  while (true) {
    const i = await choose(`MERCHANT · WALLET ${BOX.zenny}z`, ['BUY', 'SELL', 'BYE']);
    if (i === 0) await buy();
    else if (i === 1) await sell();
    else { await say('MERCHANT: Come again, hunter!'); return; }
  }
}

async function buy() {
  const keys = Object.keys(ITEMS);
  while (true) {
    const opts = keys.map(k => ({ icon: DATA['item_' + k], label: ITEMS[k].name, right: ITEMS[k].price + 'z',
      desc: `${ITEMS[k].desc}<br>POUCH ${pouchCount(k)} · BOX ${boxCount(k)}` }));
    opts.push({ label: 'DONE', desc: 'Stop buying.' });
    const i = await choose(`BUY · WALLET ${BOX.zenny}z`, opts, { desc: true });
    if (i < 0 || i === keys.length) return;
    const k = keys[i], it = ITEMS[k];
        const max = Math.floor(BOX.zenny / it.price);
    if (max < 1) { await say(`MERCHANT: That's ${it.price}z, friend.\nYou only have ${BOX.zenny}z.`, 'bad'); continue; }
    const n = await askCount(max, it.price);                                          // buy()
    if (!n) continue;
    BOX.zenny -= n * it.price; boxAdd(k, n); saveBox();
    Audio8.sfx('buy');
    await say(`MERCHANT: Thank you! ${it.name} x${n},\nsent to your ITEM BOX.`, 'good');
  }
}

async function howMany(name, have, unit) {
  if (have <= 1) return (await ask(`Sell 1 ${name} for ${unit}z?`)) ? 1 : 0;
  const i = await choose(`SELL ${name}`, [
    { label: 'SELL 1', right: unit + 'z' }, { label: `SELL ALL (${have})`, right: unit * have + 'z' }, { label: 'CANCEL' }]);
  return i === 0 ? 1 : i === 1 ? have : 0;
}

async function sell() {
  while (true) {
    const ids = Object.keys(BOX.items).filter(id => BOX.items[id] > 0)
      .sort((a, b) => (ITEMS[b] ? 1 : 0) - (ITEMS[a] ? 1 : 0) || itemRar(b) - itemRar(a) || itemName(a).localeCompare(itemName(b)));
    if (!ids.length) { await say('MERCHANT: Your ITEM BOX is empty, friend.\nStore pouch items there to sell them.', 'dim'); return; }
    const opts = ids.map(id => ({ icon: itemIcon(id), label: itemName(id), right: `x${boxCount(id)} · ${sellPrice(id)}z`,
      desc: ITEMS[id] ? ITEMS[id].desc : 'MATERIAL from your ITEM BOX.' }));
    opts.push({ label: 'DONE', desc: 'Stop selling.' });
    const i = await choose(`SELL FROM BOX · WALLET ${BOX.zenny}z`, opts, { desc: true });
    if (i < 0 || i === ids.length) return;
    const id = ids[i], unit = sellPrice(id), n = await askCount(boxCount(id), unit);   // sell()
    if (!n) continue;
    boxRemove(id, n); BOX.zenny += n * unit; saveBox();
    Audio8.sfx('buy');
    await say(`Sold ${itemName(id)} x${n} for ${n * unit}z!`, 'good');
  }
}

/* ---------- Veteran: tips (quest-specific when a quest is accepted) ---------- */
const VET_QUEST = {
  rathalos: ['It breathes FIRE. Carry NULL-BERRIES.\nIts talons are POISONOUS: bring ANTIDOTES!',
             'Its WING GUST pins you in place.\nYou can still GUARD while you recover.'],
  tigrex:   ["Its ROAR stops you from using items.\nHeal BEFORE it gets angry.",
             'When it slams the ground, you lose your footing.\nIt is FAST: expect it to strike first.']
};
const VET_GENERAL = [
  'Break the TAIL to weaken its attacks.\nBreak the LEGS and it trips over.',
  'Aim for the HEAD: big damage...\nbut it is hard to hit. Misses DRIFT.',
  'A FLASH BOMB ruins its aim.\nGreat for setting up a full charge.',
  'The CAMP FELYNE has scouts.\nAsk it to mark the monster on your map.',
  'Taking hit after hit leaves you dizzy.\nGUARD or back off before you get STUNNED.'
];

async function talkVeteran() {
  const q = G.quest;
  if (q) {
    await say(`VETERAN: So you're after the ${MONSTERS[q.target].name}, rookie.`);
    await say(VET_QUEST[q.target][G.flags.vetTip++ % VET_QUEST[q.target].length]);
  } else {
    await say('VETERAN: No quest yet? The CHIEF has work.');
    await say(VET_GENERAL[G.flags.vetTip++ % VET_GENERAL.length]);
  }
}

async function talkKid() {
  await say(pick([
    "KID: Whoa, a real HUNTER! Is that sword heavy?\nCan I hold it? Pleeease?",
    "KID: When I grow up I'm gonna hunt a TIGREX!\nWith my bare hands!",
    "KID: The MERCHANT pays good money for scales.\nShiny ones are worth the most!",
    "KID: Mom says never go past the GATE alone.\nYou're not alone, you have a sword!"
  ]));
}

/* ================= QUEST MAP ================= */

const CAT_TIPS = [
  'Walk into a monster to start a battle.\nThey run faster than you, so plan ahead!',
  'Hit the big monster with a PAINTBALL.\nThen the MAP shows where it goes, nya!',
  'Weak monsters limp to the WYVERN NEST\n(AREA 8) to sleep. Sneak attacks hit hard!',
  'To CAPTURE: weaken it until it limps,\nset a SHOCK TRAP, then throw TRANQ BOMBs!',
  "Captures can't be carved, meow...\nbut the Guild pays bigger rewards!",
  'A dull blade BOUNCES off.\nUse a WHETSTONE before that happens!'
];

async function talkCampCat() {
  await say('CAMP FELYNE: Meow! Good hunting weather,\nhunter-nyan!');
  while (true) {
    const c = await choose('CAMP FELYNE', [
      { label: 'ADVICE' }, { label: 'MARK MONSTER', right: G.flags.campMark ? 'USED' : '' }, { label: 'BYE' }]);
    if (c === 0) await say(CAT_TIPS[G.flags.tip++ % CAT_TIPS.length]);
    else if (c === 1) await markMonster();
    else { await say('Good luck out there, meow!'); return; }
  }
}

/** Once per quest: the Felyne's scouts mark the big monster (like a short paintball). */
async function markMonster() {
  const m = G.monster;
  if (!m || m.dead || m.captured) { await say('Nya? The hunt is already over!', 'dim'); return; }
  if (G.flags.campMark) { await say("My scouts are worn out, nya...\nUse a PAINTBALL from here on!", 'dim'); return; }
  G.flags.campMark = true;
  G.paint = Math.max(G.paint, 4);
  addLog(`[camp mark: paint ${G.paint} turns]`, 'dim');
  Audio8.sfx('item');
  await say(`My scouts spotted the ${m.name}\nin AREA ${m.area}, nya!`, 'good');
  await say('I marked it on your MAP for a while.', 'good');
}

async function talkComrade() {
  if (G.flags.fishTraded) { await say('FELYNE: Purr... that SUSHIFISH was\ndelicious. Good luck, nya!'); return; }
  await say("FELYNE: Mrrrow... I'm sooo hungry...\nI'd trade ANYTHING for a SUSHIFISH.");
  if (pouchCount('SUSHIFISH') > 0) {
    if (await ask('Give the FELYNE a SUSHIFISH?')) {
      pouchRemove('SUSHIFISH');
      if (!pouchAdd('shock')) {
        pouchAdd('SUSHIFISH');
        await say("FELYNE: Nya? Your POUCH can't hold my\nSHOCK TRAP! Make some room first.", 'dim');
        return;
      }
      G.flags.fishTraded = true;
      Audio8.sfx('capture');
      await say('FELYNE: Nyaaa! Thank you!\nTake my SHOCK TRAP, nya!', 'good');
      await say('HUNTER received a SHOCK TRAP!', 'good');
    } else await say('FELYNE: ...*stomach growls loudly*');
  } else await say('Fish at the river in AREA 6\nor the waterfall in AREA 7, nya!', 'dim');
}

/** NPC id -> conversation. Each returns a promise (run inside flow()). */
export const NPC_TALK = {
  chief: talkChief, merchant: talkMerchant, veteran: talkVeteran, kid: talkKid,
  chef: talkChef, receptionist: talkReceptionist,
  campcat: talkCampCat, comrade: talkComrade
};