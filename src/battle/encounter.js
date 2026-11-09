/* Battle start + Item Phase (items are used instantly, max 3 per turn, no turn cost). */
import { CONFIG } from "../core/config.js";
import { $ } from "../core/utils.js";
import { G, input } from "../core/state.js";
import { ITEMS, BOSS_ONLY } from "../data/items.js";
import { AREAS } from "../data/world.js";
import { DATA } from "../art/index.js";
import { battleBg } from "../art/backgrounds.js";
import { Audio8 } from "../audio/audio8.js";
import { flow, say, pause } from "../ui/dialog.js";
import { showScreen, renderBattle } from "../ui/hud.js";
import { anim, addLog } from "../ui/fx.js";
import { captureWin } from "./endings.js";
import {
  applyStatus,
  blockedBy,
  clearBattleOnly,
  curable,
  cureStatuses,
} from "./status.js";
import { pouchCount, pouchRemove } from "../core/pouch.js";
import { hunterBack } from "../art/look.js";
import { immuneTo } from "../core/gear.js";
import { paintHit, setTrap } from "./throwables.js";

export function startEncounter(e, how) {
  if (!G || G.busy || G.screen !== "field" || G.over) return;
  G.f.mv = null;
  input.dirs = [];
  e.mv = null;
  e.alerted = false;
  e.bang = 0;
  e.goal = null;
  e.leaving = null;
  flow(async () => {
    G.foe = e;
    G.itemsUsed = 0;
    e.skipNext = null;
    e.trapped = 0;
    e.flash = 0; // battle-only statuses reset per encounter
    clearBattleOnly(G.player);
    clearBattleOnly(e);
    Audio8.sfx("encounter");
    Audio8.music(e.isBoss ? "boss" : "battle");

    const tr = $("trans");
    tr.className = "";
    void tr.offsetWidth;
    tr.className = "battle";
    await pause(1000);

    G.screen = "battle";
    $("battle").style.backgroundImage =
      `url(${battleBg(AREAS[G.f.area].theme)})`;
    $("enemySprite").className = "sprite";
    $("playerSprite").className = "sprite";
    $("enemySprite").querySelector("img").src = DATA["mb_" + e.key];
    $("playerSprite").querySelector("img").src = hunterBack();
    showScreen();
    renderBattle();
    anim($("enemySprite"), "a-enter", 500);
    anim($("playerSprite"), "a-enterL", 500);
    tr.className = "fadeOut";
    await pause(260);
    tr.className = "";

    const n = e.name;
    if (how === "sneak")
      await say(
        `You crept up on the sleeping ${n}!\nYour first hit will be a WAKE-UP BLOW!`,
        "good",
      );
    else if (how === "ambush")
      await say(
        e.isBoss
          ? `The ${n} charged straight into you!`
          : `A wild ${n} attacked!`,
        "warn",
      );
    else
      await say(
        e.isBoss ? `You engaged the ${n}!` : `You attacked a wild ${n}!`,
      );

    // Opening roar: the hunter can't use items on turn 1
    if (e.isBoss && !e.roared && !e.sleeping) {
      e.roared = true;
      anim($("enemySprite"), "a-shake", 400);
      Audio8.sfx("roar");
      await say(`The ${n} let out a mighty ROAR!`, "warn");
      const msg = applyStatus(G.player, "roar", e);
      if (msg) {
        renderBattle();
        await say(msg, immuneTo("roar") ? "good" : "bad");
      }
    }
    return "main";
  });
}

/* PHASE 1: ITEMS. Ineffective uses are consumed; item locks still refuse use. */
export function useItemBattle(key) {
  if (!G || G.itemsUsed >= CONFIG.MAX_ITEMS_PER_TURN || pouchCount(key) <= 0)
    return;
  flow(async () => {
    const p = G.player,
      m = G.foe,
      it = ITEMS[key];
    const lock =
      key === "deodorant" && curable(p, key) ? null : blockedBy(p, "item");
    if (lock) {
      await say(`HUNTER can't use items right now!\n(${lock.name})`, "dim");
      return "main";
    }

    pouchRemove(key);
    G.itemsUsed++;
    const CURES = ["nullberry", "antidote", "deodorant"],
      TRAPS = ["shock"];
    const none =
      (it.heal && p.hp >= p.maxHp) ||
      (key === "whetstone" && p.sharp >= CONFIG.SHARP_MAX) ||
      (CURES.includes(key) && !curable(p, key)) ||
      (TRAPS.includes(key) && !m.isBoss) ||
      (BOSS_ONLY.includes(key) &&
        key !== "paintball" &&
        !TRAPS.includes(key) &&
        !m.isBoss);
    if (none) {
      addLog(`[${key} used: no effect]`, "dim");
      Audio8.sfx("item");
      await say(`HUNTER used the ${it.name}...\nBut it had no effect.`, "dim");
    } else {
      Audio8.sfx("item");
      await say(`HUNTER used a ${it.name}!`);
      switch (key) {
        case "herb":
        case "potion":
        case "mega": {
          const before = p.hp;
          p.hp = Math.min(p.maxHp, p.hp + it.heal);
          addLog(`[${key} +${p.hp - before} → HP ${p.hp}/${p.maxHp}]`, "dim");
          Audio8.sfx("heal");
          renderBattle();
          await say("HUNTER's HP was restored!", "good");
          break;
        }
        case "whetstone": {
          const b = p.sharp;
          p.sharp = Math.min(
            CONFIG.SHARP_MAX,
            p.sharp + CONFIG.WHETSTONE_SHARP,
          );
          addLog(
            `[whetstone +${p.sharp - b} → EDGE ${p.sharp}/${CONFIG.SHARP_MAX}]`,
            "dim",
          );
          Audio8.sfx("sharpen");
          renderBattle();
          await say("HUNTER sharpened the blade!", "good");
          break;
        }
        case "nullberry":
        case "antidote":
        case "deodorant": {
          const cured = cureStatuses(p, key);
          Audio8.sfx("heal");
          renderBattle();
          await say(`HUNTER was cured of ${cured.join(" & ")}!`, "good");
          break;
        }
        case "paintball":
          await paintHit(m);
          break;
        case "flash":
          m.flash = 2;
          Audio8.sfx("flash");
          anim($("flashFx"), "flashing", 700);
          renderBattle();
          await say(
            `The ${m.name} is blinded!\nIts attacks will often miss!`,
            "good",
          );
          break;
        case "might":
          p.buffs.might = 3;
          renderBattle();
          await say("HUNTER's ATTACK rose!", "good");
          break; // 3 turns the first time, 2 once the monster is trap-wary
        case "shock":
          await setTrap(m, it);
          break;
        case "tranq": {
          // Capture rule: (trapped OR asleep) AND HP <= 15%; TRANQ_NEEDED hits
          Audio8.sfx("tranq");
          const held = m.trapped > 0 || m.sleeping,
            weak = m.hp / m.maxHp <= CONFIG.CAPTURE_PCT;
          if (!held)
            await say(
              "The TRANQ BOMB had no effect!\nThe monster must be TRAPPED or ASLEEP.",
              "bad",
            );
          else if (!weak)
            await say(
              `The ${m.name} shrugged off the gas!\nIt's still too strong to capture.`,
              "bad",
            );
          else {
            m.tranq++;
            renderBattle();
            addLog(`[tranq ${m.tranq}/${CONFIG.TRANQ_NEEDED}]`, "dim");
            if (m.tranq >= CONFIG.TRANQ_NEEDED) m.captured = true;
            else await say(`The ${m.name} is getting drowsy...`, "good");
          }
          break;
        }
      }
    }
    if (m.captured) {
      await captureWin();
      return;
    }
    return G.itemsUsed < CONFIG.MAX_ITEMS_PER_TURN ? "pouch" : "main";
  });
}
