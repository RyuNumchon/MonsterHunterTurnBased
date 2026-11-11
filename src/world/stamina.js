/* Overworld stamina (quests only). Hold RUN to move faster while stamina drains.
   Empty while running → winded: the hunter can't move until stamina refills to WINDED_RECOVER.
   Towns: unlimited running, no bar. Battle: unused. */
import { CONFIG } from "../core/config.js";
import { G } from "../core/state.js";
import { skillVal } from "../core/gear.js";
import { addLog } from "../ui/fx.js";

export const inTown = () => !G || G.phase !== "quest";

export const maxStamina = (p = G?.player) =>
  p?.maxStamina ??
  (G?.feast ? CONFIG.STAMINA_MAX + (G.feast.st || 0) : CONFIG.STAMINA_MAX);

export function resetStamina(p = G?.player) {
  if (!p) return;
  p.maxStamina = maxStamina(p);
  p.stamina = p.maxStamina;
  p.winded = false;
  p.runRest = 0;
  syncStamina();
}

let running = false;
export const isRunning = () => running;

/** Once per field frame (dt in ms). Returns the hunter's speed multiplier: walk, run, or 0 (winded). */
export function staminaTick(dt, wantRun, moving) {
  const p = G.player,
    C = CONFIG,
    s = dt / 1000,
    max = maxStamina(p);
  p.stamina ??= max;

  if (inTown()) {
    // free running, no drain
    p.stamina = max;
    p.winded = false;
    running = wantRun && moving;
    return running ? C.HUNTER_RUN_MULT : C.HUNTER_WALK_MULT;
  }
  if (p.winded) {
    // stopped until refilled
    running = false;
    p.stamina = Math.min(max, p.stamina + C.STAMINA_REGEN * s);
    if (p.stamina >= max * C.WINDED_RECOVER) {
      p.winded = false;
      addLog("[stamina: caught breath]", "dim");
    }
    return 0;
  }
  if (wantRun && moving && p.stamina > 0) {
    // running
    running = true;
    const drain = C.STAMINA_DRAIN * skillVal("marathon", 1);
    p.stamina = Math.max(0, p.stamina - drain * s);
    if (p.stamina <= 0) {
      p.winded = true;
      running = false;
      addLog(`[stamina: out of breath (drain ${drain.toFixed(1)}/s)]`, "dim");
      return 0;
    }
    return C.HUNTER_RUN_MULT;
  }
  running = false; // walking or standing: refill after a pause
  p.stamina = Math.min(max, p.stamina + C.STAMINA_REGEN * s);
  return C.HUNTER_WALK_MULT;
}

/** Updates the stamina bar in place (cheap; called every frame). */
export function syncStamina() {
  if (!G?.player) return;
  const els = document.querySelectorAll("#fSta, #fHudSta, .fSta");
  if (!els.length) return;
  const p = G.player,
    max = maxStamina(p),
    pct = Math.round((p.stamina / max) * 100);
  const v = String(pct);
  const winded = !!p.winded;
  for (const el of els) {
    if (el.dataset.v !== v) {
      el.style.width = pct + "%";
      el.dataset.v = v;
    }
    el.classList.toggle("winded", winded);
  }
}
