/* Thrown items (1 damage + their normal effect), paintball marking, and traps. */
import { CONFIG } from "../core/config.js";
import { $ } from "../core/utils.js";
import { Audio8 } from "../audio/audio8.js";
import { addLog, anim } from "../ui/fx.js"; // use the same anim import as turn.js
import { say } from "../ui/dialog.js";
import { renderBattle } from "../ui/hud.js";
import { wakeUp } from "../world/nest.js";
import { resistRoll, resistTurns, noteResist } from "./resist.js";

if (!CONFIG.PAINT_TURNS)
  console.warn(
    "[paint] CONFIG.PAINT_TURNS is missing: paintballs cannot mark the map",
  );

/** Every thrown item: 1 damage (never fatal). No text, so the item's own message isn't doubled. */
export function chipHit(m, it) {
  const b = m.hp;
  m.hp = Math.max(1, m.hp - CONFIG.THROW_DMG);
  addLog(
    `[${it.name} hit -${b - m.hp} → ${m.name} HP ${m.hp}/${m.maxHp}]`,
    "dim",
  );
  Audio8.sfx("hit");
  anim($("enemySprite"), "a-hit", 300);
  renderBattle();
}

/** Paintball: marks big monsters on the map; wakes a sleeper (no wake-up blow). */
export async function paintMark(m) {
  if (m.isBoss) {
    m.paint = Math.max(m.paint || 0, CONFIG.PAINT_TURNS);
    addLog(`[paint ${m.name} ${m.paint}t]`, "dim");
    renderBattle();
    await say(
      `HUNTER hit the ${m.name} with a PAINTBALL!\nIt's marked on the MAP!`,
      "good",
    );
  } else await say(`HUNTER hit the ${m.name} with a PAINTBALL!`);
  if (m.sleeping) {
    wakeUp(m);
    Audio8.sfx("roar");
    renderBattle();
    await say(`The ${m.name} woke up!`, "warn");
  }
}

/** Traps roll to hit (guaranteed on a sleeper). A hit replaces an active trap; a miss leaves it. */
export async function setTrap(m, it) {
  const asleep = m.sleeping;
  Audio8.sfx("trap");
  if (!asleep && !resistRoll(m, "trap", it.trapChance ?? CONFIG.TRAP_CHANCE)) {
    renderBattle();
    await say(
      `HUNTER set a ${it.name}...\nBut the ${m.name} avoided it!`,
      "bad",
    );
    return;
  }
  if (m.trapped > 0) {
    addLog(`[${it.name} replaces trap (${m.trapped}t left)]`, "dim");
    await say("The old trap gave way...", "dim");
  }
  m.trapped = resistTurns(m, "trap", it.trapTurns ?? CONFIG.TRAP_TURNS);
  noteResist(m, "trap");
  addLog(
    `[${m.name} trapped ${m.trapped}t${asleep ? " (was asleep: guaranteed)" : ""}]`,
    "dim",
  );
  renderBattle();
  await say(`HUNTER set a ${it.name}!\nThe ${m.name} is TRAPPED!`, "good");
  if (asleep) {
    wakeUp(m);
    Audio8.sfx("roar");
    renderBattle();
    await say(`The ${m.name} woke up in the trap!`, "warn");
  }
}
