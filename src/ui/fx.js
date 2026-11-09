/* Small visual helpers: CSS animations, floating numbers, log, phase pills, toasts. */
import { $ } from '../core/utils.js';
import { areaInfo } from '../data/world.js';
import { CONFIG } from '../core/config.js';
import { G } from '../core/state.js';

/** Restart a CSS animation class on an element. */
export function anim(el, cls, ms) {
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  if (ms) setTimeout(() => el.classList.remove(cls), ms);
}

/** Floating damage / heal / loot text above an element. */
export function pop(el, txt, cls = '') {
  const sc = $('screen'), r = el.getBoundingClientRect(), s = sc.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'pop ' + cls; d.textContent = txt;
  d.style.left = (r.left + r.width / 2 - s.left) + 'px';
  d.style.top = (r.top - s.top + r.height * 0.15) + 'px';
  sc.appendChild(d);
  setTimeout(() => d.remove(), 1400);
}

const LOG_STYLE = { dim: 'color:#8a8a8a', good: 'color:#2a9a40', bad: 'color:#d03030', warn: 'color:#c07800' };
export function addLog(msg, tone = '') {
  if (!CONFIG.DEBUG_LOG) return;
  const t = G && G.phase === 'quest' ? `T${G.turn} ` : '';
  console.log(`%c${t}${msg}`, LOG_STYLE[tone] || '');
}

let lastAction = '';
/** Former on-screen action indicator → console (only when it changes). */
export function logAction(t) {
  if (t && t !== lastAction) {
    lastAction = t;
    addLog(`[action] ${t}`, 'dim');
  }
}

/** Highlights the active phase pill in the top bar (0 = none). */
export function setPhase(n) {
  document.querySelectorAll('.ph').forEach(el => el.classList.toggle('on', +el.dataset.p === n));
}

let toastTimer = null, locTimer = null;
export function toast(txt) {
  const el = $('toast');
  el.textContent = txt; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

/** Pokémon-style location banner sliding in from the top. */
export function showLocation(a) {
  const el = $('locPop');
  el.innerHTML = `<b>${areaInfo(a).name}</b><br><small>${areaInfo(a).sub}</small>`;
  el.classList.add('show');
  clearTimeout(locTimer);
  locTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/** Shrinks text until it fits its box, so nothing is cut off. The box keeps its size.
    `targets` receive the smaller font (default: the box itself). Use targets when the box's
    height is set in its own em units, so shrinking its font doesn't also shrink the box. */
export function fitText(box, targets) {
  if (!box || !box.clientHeight) return;
  const els = targets ? [...targets] : [box];
  els.forEach(e => { e.style.fontSize = ''; });
  const base = els.map(e => parseFloat(getComputedStyle(e).fontSize));
  const over = () => box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1;
  for (let s = .95; over() && s >= .4; s -= .05) els.forEach((e, i) => { e.style.fontSize = base[i] * s + 'px'; });
}