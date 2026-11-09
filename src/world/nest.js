/* Nest sleep: a limping big monster sleeps at its nest as soon as the hunter isn't in that area.
   After NEST_SLEEP_TURNS turns asleep in a row (field or battle), it wakes up healed.
   Being woken early (hit, paint, trap) cancels the heal. */
import { CONFIG } from "../core/config.js";
import { G } from "../core/state.js";
import { addLog } from "../ui/fx.js";

export const nestOf = (m) => m.nest ?? CONFIG.NEST_AREA; // point this at your nest area

/** Field tick: falls asleep at once if conditions are met. Returns true if it just fell asleep. */
export function nestCheck(m) {
  if (!m.isBoss || m.sleeping || !m.limping || m.area !== nestOf(m))
    return false;
  if (G.f && G.f.area === m.area) return false; // the hunter is watching
  m.sleeping = true;
  m.nestSleep = 0;
  addLog(`[${m.name} fell asleep in the nest (area ${m.area})]`, "dim");
  return true;
}

/** One sleeping turn (field or battle). Returns a message when it wakes up healed. */
export function nestTick(m) {
  if (m.nestSleep == null) return null;
  if (!m.sleeping) {
    m.nestSleep = null;
    return null;
  } // woken by something else
  if (++m.nestSleep < CONFIG.NEST_SLEEP_TURNS) {
    addLog(
      `[${m.name} nest sleep ${m.nestSleep}/${CONFIG.NEST_SLEEP_TURNS}]`,
      "dim",
    );
    return null;
  }
  const b = m.hp;
  m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * CONFIG.NEST_HEAL));
  m.sleeping = false;
  m.limping = false;
  m.nestSleep = null;
  addLog(`[${m.name} woke rested +${m.hp - b} → HP ${m.hp}/${m.maxHp}]`, "dim");
  return `The ${m.name} woke up!\nIt looks refreshed...`;
}

/** Woken early: no heal. */
export function wakeUp(m) {
  m.sleeping = false;
  m.nestSleep = null;
}
