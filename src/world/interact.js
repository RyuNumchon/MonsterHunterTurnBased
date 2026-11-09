/* Field interactions: A-button on the faced tile, gathering, camp objects,
   the Item Box (weapon swap + storage), START menu and field POUCH. */
import { CONFIG } from "../core/config.js";
import { $, weighted } from "../core/utils.js";
import { G } from "../core/state.js";
import { BOX } from "../core/save.js";
import { WEAPONS, getSharp } from "../data/weapons.js";
import { GATHER, itemName } from '../data/items.js';
import { AREAS, DIRV, OPP, isTown } from "../data/world.js";
import { Audio8 } from "../audio/audio8.js";
import { say, ask, choose, flow, pause } from "../ui/dialog.js";
import { toast, addLog } from '../ui/fx.js';
import { openMap } from "../ui/map.js";
import { MAPS } from "./mapgen.js";
import { entAt, worldTick, tailAt } from './field.js';
import { NPC_TALK } from "../npc/dialogue.js";
import { startEncounter } from "../battle/encounter.js";
import { finishQuest } from "../quest/rewards.js";
import { LOOT } from '../data/monsters.js';
import { pouchAdd } from '../core/pouch.js';
import { equipmentMenu, itemBoxMenu, pouchMenu, craftMenu, obtain } from './inventory.js';
import { hunterDef } from '../core/gear.js';
import { liveBosses } from './spawn.js';

/** A button: act on whatever the hunter is facing. */
export function interact() {
  const f = G.f,
    [dx, dy] = DIRV[f.dir],
    tx = f.x + dx,
    ty = f.y + dy,
    M = MAPS[f.area];
  const e = entAt(tx, ty);
  if (e) {
    if (e.kind === "npc") {
      e.dir = OPP[f.dir];
      Audio8.sfx("blip");
      flow(() => NPC_TALK[e.id](e));
    } else
      startEncounter(e, e.kind === "boss" && e.sleeping ? "sneak" : "engage");
    return;
  }
  if (tailAt(tx, ty)) { flow(carveTailField); return; }
  const obj = M.objects.find(
    (o) => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h,
  );
  if (obj) {
    Audio8.sfx("blip");
    flow(() => useObject(obj));
    return;
  }
  const gp = M.gathers.find((g) => g.x === tx && g.y === ty);
  if (gp) {
    flow(() => gatherAt(gp));
    return;
  }
  const c = M.tiles[ty] && M.tiles[ty][tx];
  if (c === "~" || c === "w")
    flow(async () => {
      await say("The mountain water is clear and cold.");
    });
}

/** Severed tail on the map: carve once (CONFIG.TAIL_CARVES). Paid out with the quest rewards. */
async function carveTailField() {
  if (G.tailDrop.carved) { await say('Only bare bone is left. Nothing more to carve.', 'dim'); return; }
  const t = G.tailDrop;
  await say(`The severed ${t.name} TAIL is lying here.`);
  if (!(await ask('Carve the tail?'))) return;
  for (let i = 0; i < CONFIG.TAIL_CARVES; i++) {
    Audio8.sfx('carve');
    const name = weighted(LOOT[t.key].breaks.tail).name;
    await obtain(name, `HUNTER carved ${name}!`);
  }
  t.carved = true;
}

/** True when a gathering spot is used up (farm: FARM_USES, regrows after a quest; quest map: GATHER_USES). */
export function gatherSpent(area, gp) {
  const town = isTown(area);
  return ((town ? G.townUses : G.gatherUses)[`${area},${gp.x},${gp.y}`] || 0) >= (town ? CONFIG.FARM_USES : CONFIG.GATHER_USES);
}

async function gatherAt(gp) {
  const area = G.f.area, town = isTown(area), uses = town ? G.townUses : G.gatherUses;
  const max = town ? CONFIG.FARM_USES : CONFIG.GATHER_USES;
  const key = `${area},${gp.x},${gp.y}`, used = uses[key] || 0, def = GATHER[gp.type];
  if (used >= max) {
    await say(town ? `This ${def.label} spot is bare.\nIt will regrow after your next quest.` : `This ${def.label} spot is exhausted.`, 'dim');
    return;
  }
  uses[key] = used + 1;
  addLog(`[${gp.type} spot ${used + 1}/${max} used]`, 'dim');
  Audio8.sfx('carve');
  await say(def.verb);
  const r = weighted(def.loot), id = r.name.startsWith('@') ? r.name.slice(1) : r.name;
  Audio8.sfx('gather');
  await obtain(id, `HUNTER obtained ${itemName(id)}!`);
}

function signText(a) {
  const ex = MAPS[a].exits
    .map((e) => `${e.side}: ${e.to === 0 ? "CAMP" : "AREA " + e.to}`)
    .join(" · ");
  return `SACRED FOREST · ${AREAS[a].name}\nEXITS  ${ex}`;
}

async function useObject(o) {
  const M = MAPS[G.f.area];
  const p = G.player;
  switch (o.type) {
    case "box": {
      if (G.flags.supply) {
        await say("The blue SUPPLY BOX is empty.", "dim");
        return;
      }
      G.flags.supply = true;
      const sup = {
        potion: 3,
        paintball: 2,
        shock: 1,
        tranq: 2,
        flash: 1,
        nullberry: 2,
        antidote: 2,
      };
      let left = false;
      for (const k in sup) {
        const got = pouchAdd(k, sup[k]);
        if (got) G.supplyGiven[k] = (G.supplyGiven[k] || 0) + got;
        if (got < sup[k]) left = true;
      }
      Audio8.sfx("item");
      await say("HUNTER opened the blue SUPPLY BOX!");
      await say(
        "Got POTION x3, PAINTBALL x2, FLASH BOMB x1, SHOCK TRAP x1,\nTRANQ BOMB x2, NULL-BERRY x2 and ANTIDOTE x2!",
        "good",
      );
      if (left) await say("Some supplies didn't fit in the POUCH\nand were left behind.", 'dim');
      return;
    }
    case "itembox":
      await itemBoxMenu();
      return;
    case "bed": {
      if (!(await ask("Rest in the bed?\n(Restores all HP. 1 turn passes.)")))
        return;
      const tr = $("trans");
      tr.className = "fadeIn";
      await pause(400);
      p.hp = p.maxHp;
      const msgs = worldTick();
      tr.className = "fadeOut";
      await pause(300);
      tr.className = "";
      Audio8.sfx("heal");
      await say("HUNTER took a short nap...\nHP was fully restored!", "good");
      if (msgs.length) toast(msgs.join("\n"));
      return;
    }
    case "tent":
      await say("The Guild's tent. Your BED is right beside it.");
      return;
    case 'sign': await say(o.text || signText(G.f.area)); return;
    case 'counter': {
      const f = G.f;
      if (o.needSeat && !M.objects.some(c => c.type === 'chair' && c.x === f.x && c.y === f.y)) { await say(o.seatMsg); return; }
      const npc = G.ents.find(e => e.id === o.npc);
      if (npc) npc.dir = 'down';
      await NPC_TALK[o.npc](npc);
      return;
    }
    case 'chair': await say('A wooden stool. Sit on it and face\nthe counter to order a meal.'); return;
    case 'table': await say('A long dining table. It smells of\ngrilled meat and spices.'); return;
    case 'house': await say(o.label); return;
    case 'anvil': await say("The anvil is still hot.\nTalk to the BLACKSMITH to forge gear."); return;
    case 'gate': await say(
      G.quest
      ? 'The GATE to the hunting grounds.\nWalk through it to depart!'
      : 'The GATE to the hunting grounds.\nAccept a quest from the CHIEF first.'
    );
    return;
  }
}

export async function fieldMap() {
  if (G.phase !== 'quest') {
    await say('You know THEPARAK VILLAGE by heart.\nThe MAP is for the hunting grounds.', 'dim');
    return;
  }
  await openMap();
}

/** START menu (Enter / Esc / START button). */
export function openStartMenu() {
  Audio8.sfx('select');
  flow(async () => {
    while (true) {
      $('fDialog').classList.add('hidden');
      const inQuest = G.phase === 'quest';
      const opts = ['POUCH', 'COMBINE', 'MAP', 'HUNTER',  'EQUIPMENT', 'QUEST', ...(inQuest ? ['ABANDON QUEST'] : []), 'EXIT'];
      const i = await choose('MENU', opts), p = G.player, s = getSharp(p.sharp), q = G.quest;
      switch (opts[i]) {
        case 'POUCH': await pouchMenu(); break;
        case 'COMBINE': await craftMenu('pouch'); break;
        case 'MAP': await fieldMap(); break;
        case 'HUNTER': await say(`HUNTER · ${WEAPONS[p.weapon].name}\nEDGE ${s.name} · DEF ${hunterDef()} · CARTS ${p.carts}/${CONFIG.MAX_CARTS}`); break;
        case 'EQUIPMENT': await equipmentMenu(); break;
        case 'QUEST':
          if (inQuest) await say(`QUEST: ${q.title}\nTARGETS LEFT ${liveBosses().length}/${q.targets.length} · TURN ${G.turn}`);
          else if (q) await say(`ACCEPTED: ${q.title}\nDepart through the GATE to the north.`);
          else await say('No quest accepted.\nVisit the VILLAGE CHIEF.', 'dim');
          break;
        case 'ABANDON QUEST':
          if (await ask('Abandon the quest?\nAll monster rewards will be lost.')) { finishQuest('abandon'); return; }
          break;
        default: return;
      }
    }
  });
}