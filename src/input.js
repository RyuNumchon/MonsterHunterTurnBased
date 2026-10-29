/* All input: mouse/touch clicks (event delegation on data-act), keyboard, on-screen D-pad.
   Audio is unlocked on the first user gesture (browser autoplay rules). */
import { CONFIG } from './core/config.js';
import { $ } from './core/utils.js';
import { G, UI, waits, text, input } from './core/state.js';
import { BOX, saveBox, wipeBox } from './core/save.js';
import { ITEMS } from './data/items.js';
import { DATA, pimg } from './art/index.js';
import { Audio8 } from './audio/audio8.js';
import { flow, doAdvance, pickMenu, moveMenu, cancelMenu, doCarve, closeStorage } from './ui/dialog.js';
import { setMode, moveInfo } from './ui/hud.js';
import { openMap, closeMap } from './ui/map.js';
import { canAct } from './world/field.js';
import { interact, openStartMenu, fieldBag } from './world/interact.js';
import { useItemBattle } from './battle/encounter.js';
import { findMove, pickMove, confirmAttack, confirmRun, goBack, runTurn } from './battle/turn.js';
import { putAllInBox, renderStorage } from './quest/rewards.js';
import { restart } from './game.js';

const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };

export function updateMuteLabel() { $('muteBtn').textContent = `♪ MUSIC: ${Audio8.muted ? 'OFF' : 'ON'}`; }
function toggleMute() {
  Audio8.init();
  Audio8.setMuted(!Audio8.muted);
  BOX.muted = Audio8.muted; saveBox();
  updateMuteLabel();
}

/* ---------- Clicks ---------- */
function onClick(e) {
  // While text is showing, a tap anywhere on the game advances it (D-pad excluded)
  if ((waits.advance || text.typing) && e.target.closest('#gb') && !e.target.closest('[data-dir]')) { doAdvance(); return; }
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  const act = t.dataset.act, val = t.dataset.val;

  // Always available
  switch (act) {
    case 'reset': case 'rematch': restart(G ? G.monsterKey : 'rathalos'); return;
    case 'hunt':     restart(val); return;
    case 'mute':     toggleMute(); return;
    case 'auto':     CONFIG.AUTO = !CONFIG.AUTO; $('autoBtn').textContent = `BATTLE TEXT: ${CONFIG.AUTO ? 'AUTO' : 'CLICK'}`; return;
    case 'putall':   putAllInBox(); return;
    case 'closebox': Audio8.sfx('back'); closeStorage(); return;
    case 'wipebox':  wipeBox(); renderStorage(); return;
    case 'advance':  doAdvance(); return;
    case 'menu':     pickMenu(+val); return;
    case 'closemap': closeMap(); return;
    case 'carve':    doCarve(); return;
  }
  if (!G || G.over) return;

  // Field
  if (G.screen === 'field') {
    switch (act) {
      case 'fa':
        if (UI.menu) pickMenu(UI.menu.idx);
        else if (waits.map) closeMap();
        else if (waits.store) closeStorage();
        else if (canAct()) interact();
        break;
      case 'fb':     cancelMenu(); closeMap(); closeStorage(); break;
      case 'fstart': if (canAct()) openStartMenu(); break;
      case 'fmap':   if (canAct()) flow(openMap); break;
      case 'fbag':   if (canAct()) flow(fieldBag); break;
    }
    return;
  }

  // Battle
  if (G.busy) return;
  switch (act) {
    case 'fight': Audio8.sfx('select'); setMode('fight'); break;
    case 'bag':   Audio8.sfx('select'); setMode('bag'); break;
    case 'map':   flow(async () => { await openMap(); return 'main'; }); break;
    case 'run':   confirmRun(); break;
    case 'back':  goBack(); break;
    case 'move':  pickMove(val); break;
    case 'part':  confirmAttack(UI.data.moveId, val); break;
    case 'item':  useItemBattle(val); break;              // instant, no confirmation
    case 'yes':   Audio8.sfx('select'); runTurn(UI.data.action); break;
    case 'no':    Audio8.sfx('back'); setMode(UI.data.back, UI.data.backData || {}); break;
  }
}

/* ---------- Hover info (FIGHT move details, BAG descriptions) ---------- */
function onHover(e) {
  const t = e.target.closest('[data-info]');
  if (!t || !G || !G.foe) return;
  if (UI.mode === 'fight') {
    const mv = findMove(t.dataset.info);
    if (mv && $('mInfo')) $('mInfo').innerHTML = moveInfo(mv);
  }
  if (UI.mode === 'bag' && $('bagInfo')) {
    const k = t.dataset.info, it = ITEMS[k];
    $('bagInfo').innerHTML = `${pimg(DATA['item_' + k])} ${it.name}<br>${it.desc}<div class="sub">ITEMS USED ${G.itemsUsed}/${CONFIG.MAX_ITEMS_PER_TURN} THIS TURN</div>`;
  }
}

/* ---------- Keyboard ---------- */
function onKeyDown(e) {
  Audio8.init();
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const dir = KEYDIR[k], isA = k === 'z' || k === ' ', isEnter = k === 'Enter', isB = k === 'x' || k === 'Escape';
  if (dir || k === ' ') e.preventDefault();
  if (k === 'n') { toggleMute(); return; }
  if (!G) return;

  if (waits.store) { if (isA || isB || isEnter) closeStorage(); return; }
  if (!$('rewardOv').classList.contains('hidden')) {
    if ((isA || isEnter) && G.over && !G.boxed && (G.outcome === 'slay' || G.outcome === 'capture')) putAllInBox();
    return;
  }
  if (waits.map) { if (isA || isB || isEnter || k === 'm') closeMap(); return; }
  if (UI.menu) {
    if (dir === 'up' || dir === 'left') moveMenu(-1);
    else if (dir === 'down' || dir === 'right') moveMenu(1);
    else if (isA || isEnter) pickMenu(UI.menu.idx);
    else if (isB) cancelMenu();
    return;
  }
  if (dir && G.screen === 'field') {
    if (!e.repeat) { input.dirs = input.dirs.filter(x => x !== dir); input.dirs.push(dir); }
    return;
  }
  if (text.typing || waits.advance) { if (isA || isEnter || isB) doAdvance(); return; }
  if (UI.mode === 'carve' && waits.carve) { if (isA || isEnter) doCarve(); return; }
  if (G.over) return;

  if (G.screen === 'field') {
    if (!canAct()) return;
    if (isA) interact();
    else if (isEnter || k === 'Escape') openStartMenu();
    else if (k === 'm') flow(openMap);
  } else if (isB) goBack();
}
function onKeyUp(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key, dir = KEYDIR[k];
  if (dir) input.dirs = input.dirs.filter(x => x !== dir);
}

/* ---------- On-screen D-pad: hold to walk; also moves menu cursors ---------- */
function onPointerDown(e) {
  const b = e.target.closest('[data-dir]');
  if (!b) return;
  e.preventDefault();
  input.held = b.dataset.dir; b.classList.add('on');
  if (UI.menu) { moveMenu(input.held === 'up' || input.held === 'left' ? -1 : 1); return; }
  input.dirs = input.dirs.filter(x => x !== input.held); input.dirs.push(input.held);
}
function releaseDir() {
  if (!input.held) return;
  input.dirs = input.dirs.filter(x => x !== input.held); input.held = null;
  document.querySelectorAll('.dpad .on').forEach(b => b.classList.remove('on'));
}

export function initInput() {
  document.addEventListener('pointerdown', () => Audio8.init(), true);   // unlock audio
  document.addEventListener('click', onClick);
  $('panel').addEventListener('mouseover', onHover);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerup', releaseDir);
  document.addEventListener('pointercancel', releaseDir);
  window.addEventListener('blur', () => { input.dirs = []; releaseDir(); });
}