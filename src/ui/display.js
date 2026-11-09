/* Desktop vs mobile layout, desktop keyboard/mouse mapping, full-window scaling,
   and keyboard focus for battle buttons. Mobile keeps the on-screen controls. */
import { G, UI } from '../core/state.js';
import { meterActive } from '../battle/meter.js';

const ROOT = '#game';                                   // element holding the whole game screen
const IGNORE = 'button, [data-act], input, select, a, .meter';   // clicks here are not "confirm"
const html = document.documentElement;
const touchQuery = matchMedia('(hover: none) and (pointer: coarse)');

export const isDesktop = () => html.classList.contains('desktop');

/** Desktop key → { dir } | { a } | { b, start } | { pouch } | { map }, or null. Uses physical keys (e.code). */
const DIRS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
               ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
export function readKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (DIRS[e.code]) return { dir: DIRS[e.code] };
  if (e.code === 'KeyF' || e.code === 'Space' || e.key === 'MouseConfirm') return { a: true };
  if (e.key === 'MouseBack') return { b: true };
  if (e.code === 'Escape') return { b: true, start: true };
  if (e.code === 'KeyE') return { pouch: true };
  if (e.code === 'KeyM') return { map: true };
  return null;
}

/* ---------- Layout ---------- */
function fit() {
  const el = document.querySelector(ROOT);
  if (!el) return;
  el.dataset.css0 ??= el.style.cssText;
  el.style.cssText = el.dataset.css0;                   // natural size first
  if (!isDesktop()) return;
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;
  const s = Math.min(innerWidth / w, innerHeight / h);
  Object.assign(el.style, { position: 'fixed', left: '50%', top: '50%', margin: '0',
    transformOrigin: 'center center', transform: `translate(-50%,-50%) scale(${s})` });
}

function applyMode() {
  const forced = new URLSearchParams(location.search).get('mode');
  const mobile = forced ? forced === 'mobile' : touchQuery.matches;
  html.classList.toggle('mobile', mobile);
  html.classList.toggle('desktop', !mobile);
  requestAnimationFrame(fit);
}

/* ---------- Mouse: left click = confirm, right click = back ---------- */
const virtual = key => ['keydown', 'keyup'].forEach(t => document.dispatchEvent(new KeyboardEvent(t, { key, bubbles: true })));

/* ---------- Battle buttons: keyboard focus ---------- */
let focus = null;
const battleBtns = () => [...document.querySelectorAll('#battle button[data-act]:not([disabled])')]
  .filter(b => b.offsetParent && !b.closest('.meter, #fMenu'));
function setFocus(b) {
  document.querySelectorAll('.kfocus').forEach(x => x.classList.remove('kfocus'));
  focus = b || null;
  if (focus) focus.classList.add('kfocus');
}
function nearest(from, list, dir) {
  const mid = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const [fx, fy] = mid(from), [vx, vy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  let best = null, bd = Infinity;
  for (const b of list) {
    if (b === from) continue;
    const [x, y] = mid(b), dx = x - fx, dy = y - fy, along = dx * vx + dy * vy;
    if (along <= 1) continue;
    const d = along + Math.abs(dx * vy - dy * vx) * 2;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

/** Keyboard control of the battle command buttons. Returns true if the key was used. */
export function battleNav(k) {
  if (!isDesktop() || !G || G.screen !== 'battle' || G.busy || UI.menu || UI.count || meterActive()) return false;
  const btns = battleBtns();
  if (!btns.length) return false;
  if (!btns.includes(focus)) { setFocus(btns[0]); if (!k.pouch) return true; }
  if (k.dir) { setFocus(nearest(focus, btns, k.dir) || focus); return true; }
  if (k.a) { focus.click(); return true; }
  if (k.pouch) { const b = btns.find(x => /POUCH/i.test(x.textContent)); if (b) { b.click(); return true; } return false; }
  if (k.b) { const back = btns.find(x => x.dataset.act === 'back'); if (back) { back.click(); return true; } }
  return false;
}

export function initDisplay() {
  applyMode();
  touchQuery.addEventListener('change', applyMode);
  addEventListener('resize', () => requestAnimationFrame(fit));

  addEventListener('click', e => {
    if (isDesktop() && e.button === 0 && !meterActive() && !e.target.closest(IGNORE)) virtual('MouseConfirm');
  });
  addEventListener('contextmenu', e => {
    if (!isDesktop()) return;
    e.preventDefault();
    if (!meterActive()) virtual('MouseBack');
  });
  document.addEventListener('mouseover', e => {
    const b = e.target.closest?.('#battle button[data-act]');
    if (b && isDesktop() && battleBtns().includes(b)) setFocus(b);
  });
  const battle = document.getElementById('battle');
  if (battle) new MutationObserver(() => {             // panel re-rendered: highlight its first button
    if (isDesktop() && !(focus && focus.isConnected && battleBtns().includes(focus))) setFocus(battleBtns()[0]);
  }).observe(battle, { childList: true, subtree: true });
}