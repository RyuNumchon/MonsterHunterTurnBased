/* Message engine + list menus + flow control.
   say()    : typewriter text (battle -> bottom panel, field -> dialog box)
   choose() : Pokémon-style list menu; resolves to the picked index (-1 = cancelled)
   ask()    : YES/NO prompt
   flow()   : runs an async sequence with input locked, then restores the UI.
   Every wait checks `G !== g` afterwards and throws Abort if the hunt was restarted. */
import { CONFIG } from '../core/config.js';
import { $, sleep, Abort } from '../core/utils.js';
import { G, UI, waits, text } from '../core/state.js';
import { Audio8 } from '../audio/audio8.js';
import { pimg } from '../art/index.js';
import { addLog } from './fx.js';
import { setMode, renderPanel } from './hud.js';

export async function typeText(str, cls) {
  const g = G;
  addLog(str.replace(/\n/g, ' '), cls);
  let el, arrow;
  if (G.screen === 'battle' && !G.over) { setMode('message'); el = $('msg'); arrow = $('arrow'); }
  else { $('fDialog').classList.remove('hidden'); el = $('fmsg'); arrow = $('farrow'); }
  arrow.classList.remove('show');
  text.typing = true; text.skip = false;
  for (let i = 1; i <= str.length; i++) {
    if (text.skip) { el.textContent = str; break; }
    el.textContent = str.slice(0, i);
    await sleep(CONFIG.TEXT_SPEED);
    if (G !== g) { text.typing = false; throw new Abort(); }
  }
  text.typing = false;
  return arrow;
}

export async function say(str, cls = '') {
  const g = G;
  const arrow = await typeText(str, cls);
  arrow.classList.add('show');
  await new Promise(res => {
    let t = null;
    const done = () => { if (waits.advance !== done) return; waits.advance = null; clearTimeout(t); res(); };
    waits.advance = done;
    // Battle text may auto-advance; field dialogue always waits for the player
    if (CONFIG.AUTO && G.screen === 'battle') t = setTimeout(done, CONFIG.AUTO_ADVANCE + str.length * 8);
  });
  if (G !== g) throw new Abort();
}

/** First press finishes the typewriter; second press advances. */
export function doAdvance() {
  if (text.typing) text.skip = true;
  else if (waits.advance) { Audio8.sfx('blip'); waits.advance(); }
}

export async function pause(ms) { const g = G; await sleep(ms); if (G !== g) throw new Abort(); }

/* ---------- List menus ---------- */
export function choose(title, opts, cfg = {}) {
  const g = G;
  const list = opts.map(o => typeof o === 'string' ? { label: o } : o);
  return new Promise(res => {
    const idx = list.findIndex(o => !o.disabled);
    UI.menu = { title, opts: list, idx: Math.max(0, idx), resolve: res, cancel: cfg.cancel !== false, yn: !!cfg.yn, desc: !!cfg.desc };
    renderMenu();
  }).then(v => { if (G !== g) throw new Abort(); return v; });
}

export async function ask(str) {
  await typeText(str);
  return (await choose(null, ['YES', 'NO'], { yn: true })) === 0;
}

export function renderMenu() {
  const el = $('fMenu'), s = UI.menu;
  if (!s) { el.className = 'hidden'; el.innerHTML = ''; return; }
  el.className = s.yn ? 'yn' : '';
  const cur = s.opts[s.idx];
el.innerHTML = `<div class="menu${s.desc ? ' withdesc' : ''}">${s.title ? `<div class="mh">${s.title}</div>` : ''}${s.opts.map((o, i) =>
    `<button class="mi ${i === s.idx ? 'focus' : ''}" data-act="menu" data-val="${i}" ${o.disabled ? 'disabled' : ''}>${o.icon ? pimg(o.icon) : ''}<span>${o.label}</span>${o.right !== undefined ? `<span class="q">${o.right}</span>` : ''}</button>`
  ).join('')}${s.desc ? `<div class="mdesc">${(cur && cur.desc) || ''}</div>` : ''}</div>`;
}

export function moveMenu(d) {
  const s = UI.menu; if (!s) return;
  const n = s.opts.length;
  for (let i = 1; i <= n; i++) { const j = (s.idx + d * i + n * 4) % n; if (!s.opts[j].disabled) { s.idx = j; break; } }
  Audio8.sfx('blip'); renderMenu();
}

export function pickMenu(i) {
  const s = UI.menu;
  if (!s || !s.opts[i] || s.opts[i].disabled) return;
  Audio8.sfx('select');
  UI.menu = null; renderMenu(); s.resolve(i);
}

export function cancelMenu() {
  const s = UI.menu; if (!s || !s.cancel) return;
  Audio8.sfx('back');
  UI.menu = null; renderMenu(); s.resolve(-1);
}

/* ---------- Other waits ---------- */
export function doCarve() { if (waits.carve) { const r = waits.carve; waits.carve = null; r(); } }
export function closeStorage() { if (waits.store) { const r = waits.store; waits.store = null; r(); } }

/** Wake every pending promise; each then throws Abort because G has changed. */
export function releaseWaits() {
  text.typing = false;
  if (waits.advance) waits.advance();
  if (UI.menu) { const s = UI.menu; UI.menu = null; renderMenu(); s.resolve(-1); }
  if (waits.map) { const r = waits.map; waits.map = null; r(); }
  doCarve(); closeStorage();
}

/* ---------- Flow control ---------- */
export async function flow(fn) {
  if (!G || G.busy) return;
  const g = G;
  g.busy = true;
  let next;
  try { next = await fn(); }
  catch (e) { if (e instanceof Abort) return; console.error(e); }
  if (G !== g) return;
  g.busy = false;
  $('fDialog').classList.add('hidden');
  if (G.over) { UI.mode = 'end'; renderPanel(); return; }
  if (G.screen === 'battle') setMode(next || 'main');
  else renderPanel();
}