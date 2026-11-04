/* Message engine + list menus + flow control.
   say()    : typewriter text (battle -> bottom panel, field -> dialog box)
   choose() : Pokémon-style list menu; resolves to the picked index (-1 = cancelled)
   ask()    : YES/NO prompt
   flow()   : runs an async sequence with input locked, then restores the UI.
   Every wait checks `G !== g` afterwards and throws Abort if the hunt was restarted. */
import { CONFIG } from '../core/config.js';
import { $, sleep, clamp, Abort } from '../core/utils.js';
import { G, UI, waits, text } from '../core/state.js';
import { Audio8 } from '../audio/audio8.js';
import { pimg } from '../art/index.js';
import { addLog, fitText } from './fx.js';
import { setMode, renderPanel } from './hud.js';

export async function typeText(str, cls) {
  const g = G;
  addLog(str.replace(/\n/g, ' '), cls);
  let el, arrow;
 if (G.screen === 'battle' && !G.over) {
    setMode('message'); el = $('msg'); arrow = $('arrow');
    el.textContent = str; fitText(el.closest('.tb')); el.textContent = '';   // size the font for the full line first
  } else {
    $('fDialog').classList.remove('hidden'); el = $('fmsg'); arrow = $('farrow');
  }
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
    UI.menu = {
      title,
      opts: list,
      idx: Math.max(0, idx),
      resolve: res,
      cancel: cfg.cancel !== false,
      yn: !!cfg.yn,
      desc: !!cfg.desc,
      paged: !!cfg.paged
    };
    renderMenu();
  }).then(v => { if (G !== g) throw new Abort(); return v; });
}

export async function ask(str) {
  await typeText(str);
  return (await choose(null, ['YES', 'NO'], { yn: true })) === 0;
}

export function renderMenu() {
  const el = $('fMenu'), s = UI.menu;
  if (!s) { if (UI.count) renderCount(); else { el.className = 'hidden'; el.innerHTML = ''; } return; }
  el.className = s.yn ? 'yn' : '';
  const cur = s.opts[s.idx];
  const md = el.querySelector('.mdesc');
  if (md) fitText(md, md.children);
  const head = !s.title ? '' : s.paged
      ? `<div class="mh paged"><button class="pg" data-act="mpage" data-val="-1">◀</button><span>${s.title}</span><button class="pg" data-act="mpage" data-val="1">▶</button></div>`
      : `<div class="mh">${s.title}</div>`;
  el.innerHTML = `<div class="menu${s.desc ? ' withdesc' : ''}">${head}${s.opts.map((o, i) =>
      `<button class="mi ${i === s.idx ? 'focus' : ''}" data-act="menu" data-val="${i}" ${o.disabled ? 'disabled' : ''}>${o.icon ? pimg(o.icon) : ''}<span>${o.label}</span>${o.right !== undefined ? `<span class="q">${o.right}</span>` : ''}</button>`
    ).join('')}${s.desc ? `<div class="mdesc"><span>${(cur && cur.desc) || ''}</span></div>` : ''}</div>`;
  UI.lastMenu = { html: el.innerHTML, cls: el.className };

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

/* ---------- Paged menus: choose() resolves to these when the page changes ---------- */
export const MENU_PREV = -2, MENU_NEXT = -3;
export function pageMenu(d) {
  const s = UI.menu; if (!s || !s.paged) return;
  Audio8.sfx('blip');
  UI.menu = null; renderMenu(); s.resolve(d < 0 ? MENU_PREV : MENU_NEXT);
}

/* ---------- Count box: resolves to 0 (cancel) … max. ▲▼ ±1, ◀▶ ±10, A confirm, B cancel ----------
   Drawn to the left of the last item list, which stays visible but can't be clicked. */
export function askCount(max) {
  const g = G;
  if (max < 1) return Promise.resolve(0);
  return new Promise(res => {
    UI.count = { max, n: 1, resolve: res };
    renderCount();
  }).then(v => { if (G !== g) throw new Abort(); return v; });
}

export function renderCount() {
  const el = $('fMenu'), c = UI.count, last = UI.lastMenu;
  if (!c) return;
  el.className = `${last ? last.cls : ''} counting`;
  el.innerHTML = `<div class="cntwrap">
      <div class="cnt">
        <button class="cb" data-act="cnt" data-val="1">▲</button>
        <span class="cnum">${c.n}</span>
        <button class="cb" data-act="cnt" data-val="-1">▼</button>
      </div>
      ${last ? `<div class="frozen" inert>${last.html}</div>` : ''}
    </div>`;
}

export function stepCount(d) {
  const c = UI.count; if (!c) return;
  const n = clamp(c.n + d, 0, c.max);
  if (n !== c.n) { c.n = n; Audio8.sfx('blip'); renderCount(); }
}
function closeCount(v) {
  const c = UI.count; if (!c) return;
  UI.count = null; renderMenu(); c.resolve(v);
}
export const confirmCount = () => { Audio8.sfx('select'); closeCount(UI.count ? UI.count.n : 0); };
export const cancelCount = () => { Audio8.sfx('back'); closeCount(0); };
export const countAct = v => stepCount(+v);

/* ---------- Other waits ---------- */
export function doCarve() { if (waits.carve) { const r = waits.carve; waits.carve = null; r(); } }
export function closeStorage() { if (waits.store) { const r = waits.store; waits.store = null; r(); } }

/** Wake every pending promise; each then throws Abort because G has changed. */
export function releaseWaits() {
  text.typing = false;
  if (waits.advance) waits.advance();
  if (UI.menu) { const s = UI.menu; UI.menu = null; renderMenu(); s.resolve(-1); }
  closeCount(0);
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