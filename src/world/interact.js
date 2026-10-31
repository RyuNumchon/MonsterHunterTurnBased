/* Field interactions: A-button on the faced tile, gathering, camp objects,
   the Item Box (weapon swap + storage), START menu and field BAG. */
import { CONFIG } from "../core/config.js";
import { $, weighted } from "../core/utils.js";
import { G } from "../core/state.js";
import { BOX, saveBox } from "../core/save.js";
import { WEAPONS, getSharp } from "../data/weapons.js";
import { ITEMS, GATHER } from "../data/items.js";
import { AREAS, DIRV, OPP } from "../data/world.js";
import { DATA } from "../art/index.js";
import { Audio8 } from "../audio/audio8.js";
import { say, ask, choose, flow, pause } from "../ui/dialog.js";
import { toast } from "../ui/fx.js";
import { openMap } from "../ui/map.js";
import { MAPS } from "./mapgen.js";
import { entAt, worldTick, tailAt } from './field.js';
import { NPC_TALK } from "../npc/dialogue.js";
import { startEncounter } from "../battle/encounter.js";
import { finishQuest, showStorage } from "../quest/rewards.js";
import { curable, cureStatuses } from "../battle/status.js";
import { LOOT } from '../data/monsters.js';

/** Items gathered or carved during the hunt (paid out only on success). */
export const addGathered = (name) => {
  G.gathered[name] = (G.gathered[name] || 0) + 1;
};

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
  const t = G.tailDrop;
  await say(`The severed ${t.name} TAIL is lying here.`);
  if (!(await ask('Carve the tail?'))) return;
  for (let i = 0; i < CONFIG.TAIL_CARVES; i++) {
    Audio8.sfx('carve');
    const r = weighted(LOOT[t.key].breaks.tail);
    G.carves.push(r);
    Audio8.sfx('gather');
    await say(`HUNTER carved ${r.name}!`, 'good');
  }
  t.carved = true;
}

async function gatherAt(gp) {
  const key = `${G.f.area},${gp.x},${gp.y}`,
    used = G.gatherUses[key] || 0,
    def = GATHER[gp.type];
  if (used >= CONFIG.GATHER_USES) {
    await say(`This ${def.label} spot is exhausted.`, "dim");
    return;
  }
  G.gatherUses[key] = used + 1;
  Audio8.sfx("carve");
  await say(def.verb);
  const r = weighted(def.loot);
  Audio8.sfx("gather");
  if (r.name.startsWith("@")) {
    const k = r.name.slice(1);
    G.inventory[k] = (G.inventory[k] || 0) + 1;
    await say(
      `HUNTER found a ${ITEMS[k].name}!\nIt was put in the BAG. (x${G.inventory[k]})`,
      "good",
    );
  } else {
    addGathered(r.name);
    await say(
      `HUNTER obtained ${r.name}!\n(${CONFIG.GATHER_USES - used - 1} more gathers here)`,
      "good",
    );
  }
}

function signText(a) {
  const ex = MAPS[a].exits
    .map((e) => `${e.side}: ${e.to === 0 ? "CAMP" : "AREA " + e.to}`)
    .join(" · ");
  return `MOUNTAIN STREAM · ${AREAS[a].name}\nEXITS  ${ex}`;
}

async function useObject(o) {
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
      for (const k in sup) G.inventory[k] += sup[k];
      Audio8.sfx("item");
      await say("HUNTER opened the blue SUPPLY BOX!");
      await say(
        "Got POTION x3, PAINTBALL x2, FLASH BOMB x1, SHOCK TRAP x1,\nTRANQ BOMB x2, NULL-BERRY x2 and ANTIDOTE x2!",
        "good",
      );
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
    case "sign":
      await say(signText(G.f.area));
      return;
  }
}

/** Red ITEM BOX: change weapon (saved) or view stored loot. */
async function itemBoxMenu() {
  Audio8.sfx("item");
  await say("HUNTER opened the ITEM BOX.");
  while (true) {
    const p = G.player;
    const i = await choose("ITEM BOX", [
      {
        icon: DATA["wpn_" + p.weapon],
        label: "CHANGE WEAPON",
        right: WEAPONS[p.weapon].short,
      },
      {
        icon: DATA.item_potion,
        label: "VIEW STORAGE",
        right: Object.keys(BOX.items).length,
      },
      { label: "CLOSE" },
    ]);
    if (i === 0) {
      const keys = Object.keys(WEAPONS);
      const j = await choose(
        "EQUIP WEAPON",
        keys.map((k) => ({
          icon: DATA["wpn_" + k],
          label: WEAPONS[k].name,
          right: k === p.weapon ? "E" : "",
          desc: WEAPONS[k].blurb,
        })),
        { desc: true },
      );
      if (j < 0) continue;
      const k = keys[j];
      if (k === p.weapon) {
        await say("That weapon is already equipped.", "dim");
        continue;
      }
      Object.assign(p, { weapon: k, charge: 0, spirit: 0 });
      BOX.weapon = k;
      saveBox();
      Audio8.sfx("sharpen");
      await say(`HUNTER equipped the ${WEAPONS[k].name}!`, "good");
    } else if (i === 1) await showStorage();
    else return;
  }
}

/** START menu (Enter / Esc / START button). */
export function openStartMenu() {
  Audio8.sfx("select");
  flow(async () => {
    while (true) {
      $("fDialog").classList.add("hidden");
      const i = await choose("MENU", [
        "BAG",
        "MAP",
        "HUNTER",
        "QUEST",
        "ABANDON QUEST",
        "EXIT",
      ]);
      const p = G.player,
        m = G.monster,
        s = getSharp(p.sharp);
      if (i === 0) await fieldBag();
      else if (i === 1) await openMap();
      else if (i === 2)
        await say(
          `HUNTER · ${WEAPONS[p.weapon].name}\nHP ${p.hp}/${p.maxHp} · EDGE ${s.name} · CARTS ${p.carts}/${CONFIG.MAX_CARTS}`,
        );
      else if (i === 3)
        await say(
          `QUEST: Slay or capture the ${m.name}.\nTURN ${G.turn} · PAINTBALL ${G.paint > 0 ? G.paint + " turns" : "none"}`,
        );
      else if (i === 4) {
        if (
          await ask("Abandon the quest?\nAll monster rewards will be lost.")
        ) {
          finishQuest("abandon");
          return;
        }
      } else return;
    }
  });
}

/** Field BAG: only potion / whetstone / might seed have a use outside battle. */
export async function fieldBag() {
  const keys = Object.keys(ITEMS);
  while (true) {
    const opts = keys.map((k) => ({
      icon: DATA["item_" + k],
      label: ITEMS[k].name,
      right: "x" + G.inventory[k],
      disabled: G.inventory[k] <= 0,
      desc: ITEMS[k].desc,
    }));
    opts.push({ label: "CLOSE", desc: "" });
    const i = await choose("BAG", opts, { desc: true });
    if (i < 0 || i === keys.length) return;
    const k = keys[i],
      p = G.player;
    if (!ITEMS[k].field) {
      await say(
        `There's no target here.\nUse the ${ITEMS[k].name} in battle!`,
        "dim",
      );
      continue;
    }
    if (k === "potion" && p.hp >= p.maxHp) {
      await say("It won't have any effect.", "dim");
      continue;
    }
    if (k === "whetstone" && p.sharp >= CONFIG.SHARP_MAX) {
      await say("Your blade is already sharp.", "dim");
      continue;
    }
    if ((k === "nullberry" || k === "antidote") && !curable(p, k)) {
      await say("It won't have any effect.", "dim");
      continue;
    }
    G.inventory[k]--;
    if (k === "potion") {
      const b = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + 30);
      Audio8.sfx("heal");
      await say(
        `HUNTER used a POTION.\nHP was restored by ${p.hp - b}.`,
        "good",
      );
    }
    if (k === "whetstone") {
      p.sharp = CONFIG.SHARP_MAX;
      Audio8.sfx("sharpen");
      await say("HUNTER sharpened the blade.\nEDGE is back to GREEN!", "good");
    }
    if (k === "might") {
      p.buffs.might = 3;
      Audio8.sfx("item");
      await say("HUNTER ate a MIGHT SEED!\nATTACK +25% for 3 turns.", "good");
    }
    if (k === "nullberry" || k === "antidote") {
      const c = cureStatuses(p, k);
      Audio8.sfx("heal");
      await say(`HUNTER was cured of ${c.join(" & ")}!`, "good");
    }
  }
}
