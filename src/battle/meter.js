/* TIMING METER: the hunter's defense against monster attacks is a skill check.
   A pointer sweeps back and forth; press the shown letter while it's inside the marked zone.
   POINTER SPEED  t ∈ [0,1]: 0 = very slow, 1 = impossibly fast.   sweep = SLOW × (FAST / SLOW)^t
     faster hunter  → top of the range is cut, rolls lean slow
     faster monster → bottom of the range is cut, rolls lean fast
   ZONE SIZE      s ∈ [0,1]: 0 = one pixel, 1 = the whole bar.      zone = MIN × (1 / MIN)^s
     hunter accuracy + EVASION push it up; dangerous moves push it down.
   All numbers are hidden (debug log only). */
import { CONFIG } from '../core/config.js';
import { $, clamp, pick } from '../core/utils.js';
import { Audio8 } from '../audio/audio8.js';
import { addLog } from '../ui/fx.js';
import { skillVal } from '../core/gear.js';
import { speedOf } from './speed.js';
import { accMod, blockedBy } from './status.js';
import { moodAcc } from './mood.js';

const TITLE = { evade: 'DODGE!', guard: 'BLOCK!', counter: 'COUNTER!' };

/** Random value in [lo, hi]; `r` (0–1) is where its median sits inside that range. */
function skewed(lo, hi, r) {
  const k = Math.log(clamp(r, .05, .95)) / Math.log(.5);
  return lo + (hi - lo) * Math.pow(Math.random(), k);
}

/** 0 (harmless) … 1 (deadliest). An attack can set `danger` itself. */
export function moveDanger(m, atk) {
  if (atk.danger != null) return clamp(atk.danger, 0, 1);
  const top = Math.max(1, ...m.attacks.filter(a => !a.roar).map(a => a.power || 0));
  return clamp((atk.power || 0) / top * (atk.heavy ? 1 : .8), 0, 1);
}

export function meterParams(m, p, atk) {
  const C = CONFIG;
  // --- Pointer speed: hunter vs monster speed ---
  const hs = speedOf(p), ms = speedOf(m);
  const d = clamp((hs - ms) / Math.max(hs, ms, 1) * C.METER_SPEED_SENS, -1, 1);   // + hunter faster
  const lo = d < 0 ? -d * C.METER_SPEED_CUT : 0;
  const hi = d > 0 ? 1 - d * C.METER_SPEED_CUT : 1;
  const t = skewed(lo, hi, C.METER_SPEED_MED - d * C.METER_SPEED_LEAN);
  const sweep = C.METER_SLOW_MS * Math.pow(C.METER_FAST_MS / C.METER_SLOW_MS, t);
  // --- Zone size: hunter accuracy + EVASION vs move danger ---
  const acc = accMod(p) + moodAcc(m) + skillVal('accuracy', 0), eva = skillVal('evasion', 0);
  const accTerm = clamp((acc + eva) / C.METER_ACC_SCALE, -1, 1);
  const danger = moveDanger(m, atk), stuck = !!(blockedBy(p, 'act') || blockedBy(p, 'move'));
  const med = C.METER_ZONE_MED + C.METER_ACC_W * accTerm - C.METER_DANGER_W * (danger - .5)
            + (m.flash > 0 ? C.METER_FLASH_BONUS : 0) - (stuck ? C.METER_STUCK_PENALTY : 0);
  const s = skewed(0, 1, med);
  const zone = Math.min(1, C.METER_MIN_ZONE * Math.pow(1 / C.METER_MIN_ZONE, s));
  return {
    sweep, zone, start: Math.random() * (1 - zone), key: pick([...C.METER_KEYS]),
    log: `spd ${hs} vs ${ms} (gap ${d.toFixed(2)}) → t ${t.toFixed(2)} in [${lo.toFixed(2)},${hi.toFixed(2)}] = ${Math.round(sweep)}ms/sweep`
       + ` · zone ${(zone * 100).toFixed(1)}% (s ${s.toFixed(2)}; acc ${acc} eva ${eva} danger ${danger.toFixed(2)}${m.flash > 0 ? ' flash' : ''}${stuck ? ' STUCK' : ''})`
  };
}

let active = null;
export const meterActive = () => !!active;
export function cancelMeter() { if (active) active(false, 'cancelled'); }

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function decoys(key, n) {
  const pool = [...CONFIG.METER_KEYS].filter(k => k !== key), out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

/** Runs the meter. stance: 'evade' | 'guard' | 'counter'. Resolves true on success. */
export function timingMeter(m, p, atk, stance = 'evade') {
  const P = meterParams(m, p, atk), C = CONFIG;
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = `meter st-${stance}`;
    el.innerHTML = `<div class="mt-title">${TITLE[stance]}</div>
      <div class="mt-key">${P.key}</div>
      <div class="mt-bar"><div class="mt-zone" style="left:${P.start * 100}%;width:${P.zone * 100}%"></div><div class="mt-ptr"></div></div>
      <div class="mt-btns">${shuffle([P.key, ...decoys(P.key, C.METER_DECOYS)]).map(k => `<button class="mt-btns touch-only" data-k="${k}">${k}</button>`).join('')}</div>`;
    $('battle').appendChild(el);
    const bar = el.querySelector('.mt-bar'), ptr = el.querySelector('.mt-ptr');
    const limit = Math.max(P.sweep * 1.2, Math.min(P.sweep * C.METER_PASSES, C.METER_MAX_MS));
    let begin = 0, raf = 0, done = false;
    const posAt = now => { const ph = ((now - begin) / P.sweep) % 2; return ph < 1 ? ph : 2 - ph; };

    const finish = (ok, why) => {
      if (done) return;
      done = true; active = null;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
      addLog(`[meter ${P.log} · key ${P.key} · ${why} → ${ok ? 'SUCCESS' : 'FAIL'}]`, 'dim');
      el.classList.add(ok ? 'ok' : 'bad');
      Audio8.sfx(ok ? 'select' : 'back');
      setTimeout(() => { el.remove(); resolve(ok); }, why === 'cancelled' ? 0 : C.METER_RESULT_MS);
    };
    const press = k => {
      const now = performance.now();
      if (done || !begin || now < begin) return;                 // "get ready" pause: ignored
      if (k !== P.key) return finish(false, `wrong key ${k}`);
      const pos = posAt(now), w = bar.clientWidth, x = pos * w, a = P.start * w, b = a + Math.max(1, P.zone * w);
      finish(x >= a - .5 && x <= b + .5, `stopped at ${(pos * 100).toFixed(1)}%`);
    };
    const onKey = e => {                                         // the meter owns the keyboard while it's up
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat && /^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
    };
    const frame = now => {
      if (!begin) begin = now + C.METER_LEAD_MS;
      if (now >= begin) {
        ptr.style.left = posAt(now) * 100 + '%';
        if (now - begin > limit) return finish(false, 'too late');
      }
      raf = requestAnimationFrame(frame);
    };

    window.addEventListener('keydown', onKey, true);
    el.querySelectorAll('.mt-b').forEach(b => b.addEventListener('pointerdown', ev => {
      ev.preventDefault(); ev.stopPropagation(); press(b.dataset.k);
    }));
    active = finish;
    Audio8.sfx('blip');
    raf = requestAnimationFrame(frame);
  });
}