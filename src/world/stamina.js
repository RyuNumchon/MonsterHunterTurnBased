/* Overworld stamina (quests only). Hold RUN to move faster while stamina drains.
   Empty while running → winded: the hunter can't move until stamina refills to WINDED_RECOVER.
   Towns: unlimited running, no bar. Battle: unused. */
import { CONFIG } from '../core/config.js';
import { G } from '../core/state.js';
import { skillVal } from '../core/gear.js';
import { addLog } from '../ui/fx.js';

export const inTown = () => !G || G.phase !== 'quest';

export function resetStamina(p = G.player) {
  p.stamina = CONFIG.STAMINA_MAX; p.winded = false; p.runRest = 0;
}

let running = false;
export const isRunning = () => running;

/** Once per field frame (dt in ms). Returns the hunter's speed multiplier: walk, run, or 0 (winded). */
export function staminaTick(dt, wantRun, moving) {
  const p = G.player, C = CONFIG, s = dt / 1000;
  p.stamina ??= C.STAMINA_MAX;

  if (inTown()) {                                        // free running, no drain
    p.stamina = C.STAMINA_MAX; p.winded = false;
    running = wantRun && moving;
    return running ? C.HUNTER_RUN_MULT : C.HUNTER_WALK_MULT;
  }
  if (p.winded) {                                        // stopped until refilled
    running = false;
    p.stamina = Math.min(C.STAMINA_MAX, p.stamina + C.STAMINA_REGEN * s);
    if (p.stamina >= C.STAMINA_MAX * C.WINDED_RECOVER) { p.winded = false; addLog('[stamina: caught breath]', 'dim'); }
    return 0;
  }
  if (wantRun && moving && p.stamina > 0) {              // running
    running = true; p.runRest = C.STAMINA_REGEN_DELAY;
    const drain = C.STAMINA_DRAIN * skillVal('marathon', 1);
    p.stamina = Math.max(0, p.stamina - drain * s);
    if (p.stamina <= 0) {
      p.winded = true; running = false;
      addLog(`[stamina: out of breath (drain ${drain.toFixed(1)}/s)]`, 'dim');
      return 0;
    }
    return C.HUNTER_RUN_MULT;
  }
  running = false;                                       // walking or standing: refill after a pause
  if (p.runRest > 0) p.runRest -= dt;
  else p.stamina = Math.min(C.STAMINA_MAX, p.stamina + C.STAMINA_REGEN * s);
  return C.HUNTER_WALK_MULT;
}

/** Updates the stamina bar in place (cheap; called every frame). */
export function syncStamina() {
  const el = document.getElementById('fSta');
  if (!el || !G?.player) return;
  const p = G.player, pct = Math.round(p.stamina / CONFIG.STAMINA_MAX * 100);
  if (el.dataset.v !== String(pct)) { el.style.width = pct + '%'; el.dataset.v = pct; }
  el.classList.toggle('winded', !!p.winded);
}