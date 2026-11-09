/* Paintball and traps in battle. */
import { CONFIG } from "../core/config.js";
import { $ } from "../core/utils.js";
import { Audio8 } from "../audio/audio8.js";
import { addLog, anim } from "../ui/fx.js"; // use the same anim import as turn.js
import { say } from "../ui/dialog.js";
import { renderBattle } from "../ui/hud.js";
import { wakeUp } from "../world/nest.js";

/** 1 damage (never lethal), marks big monsters, wakes a sleeper (no wake-up blow). */
export async function paintHit(m) {
  const b = m.hp;
  m.hp = Math.max(1, m.hp - CONFIG.PAINT_DMG);
  addLog(`[paintball -${b - m.hp} → ${m.name} HP ${m.hp}/${m.maxHp}]`, "dim");
  Audio8.sfx("hit");
  anim($("enemySprite"), "a-hit", 400);
  renderBattle();
  await say(`HUNTER threw a PAINTBALL!\nIt splattered the ${m.name}!`);
  if (m.isBoss) {
    m.paint = CONFIG.PAINT_TURNS;
    renderBattle();
    await say(`The ${m.name} is marked on the MAP!`, "good");
  }
  if (m.sleeping) {
    wakeUp(m);
    Audio8.sfx("roar");
    renderBattle();
    await say(`The ${m.name} woke up!`, "warn");
  }
}

/** Always works on a sleeping monster (it wakes up trapped). A new trap replaces an active one. */
export async function setTrap(m, it) {
  const turns = it.trapTurns ?? CONFIG.TRAP_TURNS_FIRST,
    asleep = m.sleeping;
  if (m.trapped > 0) {
    addLog(`[${it.name} replaces trap (${m.trapped}t left)]`, "dim");
    await say("The old trap gave way...", "dim");
  }
  m.trapped = turns;
  addLog(
    `[${m.name} trapped ${turns}t${asleep ? " (was asleep)" : ""}]`,
    "dim",
  );
  Audio8.sfx("trap");
  renderBattle();
  await say(`HUNTER set a ${it.name}!\nThe ${m.name} is TRAPPED!`, "good");
  if (asleep) {
    wakeUp(m);
    Audio8.sfx("roar");
    renderBattle();
    await say(`The ${m.name} woke up in the trap!`, "warn");
  }
}
