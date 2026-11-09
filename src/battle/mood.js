/* Large-monster phases: ENRAGED -> FATIGUE (small chance to skip) -> calm cooldown.
   Low HP: higher enrage chance and a shorter cooldown. All numbers hidden (logged only). */
import { CONFIG } from "../core/config.js";
import { randInt } from "../core/utils.js";
import { addLog } from "../ui/fx.js";

export const isLow = (m) => m.hp / m.maxHp <= CONFIG.BOSS_LOW_HP;
export const isEnraged = (m) => !!m && m.mood === "enrage";
export const isTired = (m) => !!m && m.mood === "fatigue";

export const moodAtk = (m) => (isEnraged(m) ? CONFIG.ENRAGE_ATK : 1);
export const moodSpeed = (u) =>
  isEnraged(u) ? CONFIG.ENRAGE_SPD : isTired(u) ? CONFIG.FATIGUE_SPD : 1;
export const moodDef = (m) => (isTired(m) ? CONFIG.FATIGUE_DMG_TAKEN : 1); // < 1 = tougher
export const moodAcc = (m) =>
  isEnraged(m)
    ? CONFIG.ENRAGE_HUNTER_ACC
    : isTired(m)
      ? CONFIG.FATIGUE_HUNTER_ACC
      : 0;

const roll = ([a, b], max) => Math.min(max, randInt(a, b));

function calm(m) {
  m.mood = null;
  m.moodTurns = 0;
  m.calmTurns = isLow(m) ? CONFIG.ENRAGE_COOLDOWN_LOW : CONFIG.ENRAGE_COOLDOWN;
}

/** Rolled at the start of the monster's action. Returns true if it just became enraged. */
export function tryEnrage(m) {
  if (!m.isBoss || m.mood || m.calmTurns > 0) return false;
  const chance = isLow(m) ? CONFIG.ENRAGE_CHANCE_LOW : CONFIG.ENRAGE_CHANCE,
    r = Math.random();
  addLog(
    `[enrage roll ${(r * 100).toFixed(1)} vs ${chance * 100}%${isLow(m) ? " (low HP)" : ""}]`,
    "dim",
  );
  if (r >= chance) return false;
  m.mood = "enrage";
  m.moodTurns = roll(CONFIG.ENRAGE_TURNS, CONFIG.ENRAGE_MAX);
  addLog(
    `[${m.name} ENRAGED ${m.moodTurns}t · atk x${CONFIG.ENRAGE_ATK} · spd x${CONFIG.ENRAGE_SPD} · hunter acc ${CONFIG.ENRAGE_HUNTER_ACC}]`,
    "dim",
  );
  return true;
}

/** End of each battle turn. Returns { msg, tone } when the phase changes. */
export function tickMood(m) {
  if (!m.isBoss) return null;
  if (!m.mood) {
    if (m.calmTurns > 0) m.calmTurns--;
    return null;
  }
  if (--m.moodTurns > 0) return null;
  if (m.mood === "enrage") {
    if (Math.random() < CONFIG.FATIGUE_SKIP) {
      calm(m);
      addLog(`[${m.name} skipped fatigue · cooldown ${m.calmTurns}t]`, "dim");
      return { msg: `The ${m.name} calmed down.`, tone: "dim" };
    }
    m.mood = "fatigue";
    m.moodTurns = roll(CONFIG.FATIGUE_TURNS, CONFIG.FATIGUE_MAX);
    addLog(
      `[${m.name} FATIGUE ${m.moodTurns}t · spd x${CONFIG.FATIGUE_SPD} · dmg taken x${CONFIG.FATIGUE_DMG_TAKEN} · hunter acc +${CONFIG.FATIGUE_HUNTER_ACC}]`,
      "dim",
    );
    return {
      msg: `The ${m.name} is exhausted!\nIt's drooling and slowing down...`,
      tone: "good",
    };
  }
  calm(m);
  addLog(`[${m.name} recovered · cooldown ${m.calmTurns}t]`, "dim");
  return { msg: `The ${m.name} recovered its stamina.`, tone: "warn" };
}
