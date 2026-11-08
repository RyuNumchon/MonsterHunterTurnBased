/* Battle HUD + bottom panel.
   The player never sees numbers (HP, damage, hit %, speed, sharpness, durations): only bars and words.
   Exact values go to the debug BATTLE LOG (logSnapshot at the start of every turn). */
import { CONFIG } from '../core/config.js';
import { $, clamp } from '../core/utils.js';
import { G, UI } from '../core/state.js';
import { WEAPONS, getSharp } from '../data/weapons.js';
import { PARTS, MONSTERS } from '../data/monsters.js';
import { FEASTS, ITEMS, BOSS_ONLY } from '../data/items.js';
import { areaInfo } from '../data/world.js';
import { DATA, pimg, itemIcon } from '../art/index.js';
import { addLog, setPhase, fitText } from './fx.js';
import { findMove, moveDisabled, runLock } from '../battle/turn.js';
import { curable, elementSealed, blockedBy, statusChips, stunChance } from '../battle/status.js';
import { speedOf } from '../battle/speed.js';
import { BOX } from '../core/save.js';
import { armorDef } from '../core/gear.js';
import { pouchCount } from '../core/pouch.js';

/* HP bars never change colour. */
export const HP_COLOR = '#58d080';
export const hpColor = () => HP_COLOR;
/** Hunter HP bar length (%): shorter by default, longer after a feast. */
const FULL_HP = CONFIG.PLAYER_MAX_HP + Math.max(...FEASTS.map(f => f.hp));
export const hpLen = p => Math.min(100, p.maxHp / FULL_HP * 100);
export const elemTag = p => {
  const w = WEAPONS[p.weapon];
  return w.element ? `<span class="elem e-${w.element}${elementSealed(p) ? ' sealed' : ''}">${w.element.toUpperCase()}</span>` : '';
};
export const chip = (t, c) => `<span class="chip ${c}">${t}</span>`;
export function setBar(el, pct, color) { el.style.width = clamp(pct, 0, 100) + '%'; el.style.backgroundColor = color; }
export const pips = (n, max) => Array.from({ length: max }, (_, i) => `<span class="pip ${i < n ? 'on' : ''}"></span>`).join('');
export const cartsUsed = used => `${used}/${CONFIG.MAX_CARTS}`;
const PART_HINT = { head: 'WEAK SPOT', body: 'EASY TARGET', legs: 'CAN TRIP IT', tail: 'CAN BE CUT' };

export function showScreen() { $('battle').classList.toggle('hidden', !G || G.screen !== 'battle'); }

/** Builds the four part bars and the sharpness zone markers once at boot. */
export function initHud() {
  $('eParts').innerHTML = Object.keys(PARTS).map(k =>
    `<div class="pt" id="pb-${k}"><span>${PARTS[k].label}</span><div class="trk"><div class="fill"></div></div></div>`).join('');
  const marks = $('pSharp').parentElement.querySelectorAll('i');
  marks[0].style.left = (CONFIG.SHARP_YELLOW / CONFIG.SHARP_MAX * 100) + '%';
  marks[1].style.left = (CONFIG.SHARP_GREEN / CONFIG.SHARP_MAX * 100) + '%';
}

/** Debug: every hidden number, logged once per turn. */
export function logSnapshot() {
  const p = G.player, m = G.foe;
  const st = u => Object.entries(u.status || {}).map(([k, s]) => `${k}:${s.turns}t`).join(' ') || '-';
  addLog(`[HUNTER HP ${p.hp}/${p.maxHp} · EDGE ${p.sharp}/${CONFIG.SHARP_MAX} · SPD ${speedOf(p)} · stun ${stunChance(p)}% · might ${p.buffs.might}t · status ${st(p)}]`, 'dim');
  if (m) addLog(`[${m.name} HP ${m.hp}/${m.maxHp} · ${Object.entries(m.parts).map(([k, v]) => `${k} ${v.hp}/${v.max}`).join(', ')} · SPD ${speedOf(m)} · trap ${m.trapped}t · tranq ${m.tranq}/${CONFIG.TRANQ_NEEDED} · blind ${m.flash}t · status ${st(m)}]`, 'dim');
  addLog(`[paint ${G.paint}t · items ${G.itemsUsed}/${CONFIG.MAX_ITEMS_PER_TURN}]`, 'dim');
  addLog(`[GEAR ${p.weapon} (atk x${WEAPONS[p.weapon].atk || 1}${WEAPONS[p.weapon].element ? ' · ' + WEAPONS[p.weapon].element : ''}) · armor DEF ${armorDef()}]`, 'dim');
}

export function renderBattle() {
  if (!G || !G.foe) return;
  const p = G.player, m = G.foe;
  // --- Enemy box ---
  $('eName').textContent = m.name;
  $('eRank').textContent = m.isBoss ? `★${m.rank}` : `Lv${m.rank}`;
  setBar($('eHp'), m.hp / m.maxHp * 100, HP_COLOR);
  $('eParts').classList.toggle('hidden', !m.isBoss);          // small monsters: one body
  if (m.isBoss) for (const k in PARTS) {
    const pt = m.parts[k], el = $('pb-' + k);
    el.classList.toggle('brk', pt.broken);
    setBar(el.querySelector('.fill'), pt.hp / pt.max * 100, pt.broken ? '#8a8a8a' : '#e09030');
  }
  const ec = [];
  if (m.captured) ec.push(chip('CAPTURED', 'c-cap'));
  if (m.sleeping && !m.captured) ec.push(chip('SLP', 'c-slp'));
  if (m.trapped > 0) ec.push(chip('TRAP', 'c-trap'));
  if (m.tranq > 0 && !m.captured) ec.push(chip('DROWSY', 'c-tq'));
  if (m.flash > 0) ec.push(chip('BLIND', 'c-bln'));
  if (m.isBoss && G.paint > 0) ec.push(chip('PAINT', 'c-pnt'));
  if (m.skipNext) ec.push(chip('STAGGER', 'c-stun'));
  if (m.isBoss && m.parts.tail.broken) ec.push(chip('ATK↓', 'c-cut'));
  if (m.armorCracked) ec.push(chip('DEF↓', 'c-crk'));
  $('eChips').innerHTML = ec.join('') + statusChips(m);
  fitText($('eChips'), $('eChips').children);

  // --- Player box ---
  $('pWpn').innerHTML = `${WEAPONS[p.weapon].short} ${elemTag(p)}`;
  $('pBalls').textContent = 'CARTS ' + cartsUsed(p.carts);
  const track = $('pHp').parentElement;
  track.style.width = hpLen(p) + '%'; track.style.flex = 'none';
  setBar($('pHp'), p.hp / p.maxHp * 100, HP_COLOR);
  const s = getSharp(p.sharp);
  setBar($('pSharp'), p.sharp / CONFIG.SHARP_MAX * 100, s.color);
  $('pSharpLbl').innerHTML = `<span style="color:${s.text}">${s.name}</span>`;
  $('pGauge').innerHTML = WEAPONS[p.weapon].cls === 'greatsword' ? `CHG${pips(p.charge, 2)}` : `SPR${pips(p.spirit, 3)}`;
  const pc = [];
  if (p.buffs.might > 0) pc.push(chip('MIGHT', 'c-mgt'));
  if (p.guarding) pc.push(chip('GUARD', 'c-grd'));
  if (p.foresight) pc.push(chip('FORESIGHT', 'c-fs'));
  if (s.bounce) pc.push(chip('DULL!', 'c-crk'));
  $('pChips').innerHTML = pc.join('') + statusChips(p);
  fitText($('pChips'), $('pChips').children);

  // --- Sprite state classes ---
  const es = $('enemySprite');
  es.querySelector('.zzz').classList.toggle('hidden', !m.sleeping);
  es.classList.toggle('small', !m.isBoss);
  es.classList.toggle('trapped', m.trapped > 0);
  const ps = $('playerSprite');
  ps.classList.toggle('chg1', p.charge === 1);
  ps.classList.toggle('chg2', p.charge >= 2);
  ps.classList.toggle('guard', p.guarding);
  ps.classList.toggle('gone', p.down);
}

/** Switches the battle panel mode and lights the matching phase pill. */
export function setMode(mode, data = {}) {
  UI.mode = mode; UI.data = data;
  if (G && G.screen === 'battle' && !G.over) {
    if (mode === 'main' || mode === 'pouch') setPhase(1);
    else if (['fight', 'target', 'confirm'].includes(mode)) setPhase(2);
    if (mode === 'main' && G.loggedTurn !== G.turn) { G.loggedTurn = G.turn; addLog(`━━ TURN ${G.turn} ━━`, 'turn'); logSnapshot(); }
  }
  renderPanel();
}

export function moveSub(mv) {
  const p = G.player;
  switch (mv.type) {
    case 'release':  return `CHARGE Lv${p.charge + 1}`;
    case 'charge':   return `HELD Lv${p.charge}`;
    case 'guard':    return 'DEFEND · FIRST';
    case 'counter':  return p.spirit < 1 ? 'NEED SPIRIT' : 'EVADE · FIRST';
    case 'finisher': return p.spirit < 1 ? 'NEED SPIRIT' : 'FINISHER';
    default:         return mv.tag;
  }
}
export function moveInfo(mv) {
  const s = getSharp(G.player.sharp);
  return `<div>EDGE <b style="color:${s.text}">${s.name}</b></div><div>TYPE/${mv.tag}</div><div class="desc">${mv.desc}</div>`;
}

/** Shrinks any panel text that would overflow its box. */
export function fitPanel() {
  $('panel').querySelectorAll('.tb, #mInfo, .pouchlist, .cmds, .movebox, .fstat').forEach(el => fitText(el));
}

export function renderPanel() {
  const P = $('panel');
  if (!G) { P.innerHTML = ''; return; }
  if (G.over) {
    const win = G.outcome === 'slay' || G.outcome === 'capture';
    P.innerHTML = `<div class="tb">${win ? 'Great hunting!' : 'The hunt is over.'}<br>Check the reward screen above.</div>
      <div class="cmds"><button class="cmd k-map" style="grid-column:1/-1" data-act="village">RETURN TO VILLAGE</button></div>`;
    fitPanel();
    return;
  }
  if (G.screen === 'field') { renderFieldPanel(P); fitPanel(); return; }

  const mode = UI.mode, d = UI.data, p = G.player, m = G.foe, w = WEAPONS[p.weapon];
  let h = '';
  switch (mode) {
    case 'message':
      h = `<div class="tb adv" data-act="advance"><span id="msg"></span><span id="arrow" class="arrow">▼</span></div>`;
      break;
    case 'fight':
      h = `<div class="movebox">${w.moves.map(mv =>
          `<button class="mv" data-act="move" data-val="${mv.id}" data-info="${mv.id}" ${moveDisabled(mv) ? 'disabled' : ''}>${mv.name}<small>${moveSub(mv)}</small></button>`).join('')}</div>
        <div class="minfo"><div id="mInfo">${moveInfo(w.moves[0])}</div>
          <button class="cmd back wait" data-act="wait">WAIT</button><button class="cmd back" data-act="back">BACK</button></div>`;
      break;
    case 'target': {
      const mv = findMove(d.moveId);
      h = `<div class="tb">Aim ${mv.name}<br>at which part?
          <div class="sub">${m.sleeping ? "It's asleep: it can't dodge!" : 'A near-miss may strike another part.'}</div></div>
        <div class="cmds">${Object.keys(PARTS).map(k => {
          const pt = m.parts[k];
          const hint = pt.broken ? (k === 'tail' ? 'SEVERED' : 'BROKEN') : (k === 'tail' && !m.isBoss ? '' : PART_HINT[k]);
          return `<button class="cmd k-${k}" data-act="part" data-val="${k}">${PARTS[k].label}<small>${hint}</small></button>`;
        }).join('')}<button class="cmd back" data-act="back">BACK</button></div>`;
      break;
    }
    case 'confirm':
      h = `<div class="tb">${d.q}<div class="sub">${d.sub || ''}</div></div>
        <div class="yn"><button data-act="yes">YES</button><button data-act="no">NO</button></div>`;
      break;
    case 'pouch': {
      const left = CONFIG.MAX_ITEMS_PER_TURN - G.itemsUsed, itemLock = blockedBy(p, 'item');
      const usable = BOX.pouch.filter(s => ITEMS[s.id]);
      h = `<div class="tb" id="pouchInfo">${itemLock ? `Can't use items! (${itemLock.name})`
            : !usable.length ? 'No usable items in the POUCH!'
            : left > 0 ? 'Choose an item.<br>It takes effect immediately.' : 'No more items this turn!'}
          <div class="sub">ITEMS USED ${G.itemsUsed}/${CONFIG.MAX_ITEMS_PER_TURN} THIS TURN · no turn cost</div></div>
        <div class="pouchlist">${usable.map(s => {
          const deo = s.id === 'deodorant' && curable(p, 'deodorant');
          const dis = (!!itemLock && !deo) || left <= 0 || (BOSS_ONLY.includes(s.id) && !m.isBoss);
          return `<button class="it" data-act="item" data-val="${s.id}" data-info="${s.id}" ${dis ? 'disabled' : ''}>
            ${pimg(itemIcon(s.id))}${ITEMS[s.id].name}<span class="q">x${s.n}</span></button>`;
        }).join('')}<button class="cmd back" data-act="back">BACK</button></div>`;
      break;
    }
    case 'carve':
      h = `<div class="tb">${d.what === 'TAIL' ? `The severed ${m.name} TAIL...` : `The ${m.name} lies still...`}<br>Carve it for materials! (${d.i + 1}/${d.n})
          <div class="sub">Press CARVE or Z for each carve.</div></div>
        <div class="cmds"><button class="cmd k-fight carvebtn" data-act="carve">CARVE</button></div>`;
      break;
    default: { // 'main'
      const run = runLock(p), deoOk = pouchCount('deodorant') > 0 && curable(p, 'deodorant');
      const act = blockedBy(p, 'act'), itemLock = blockedBy(p, 'item');
      const left = CONFIG.MAX_ITEMS_PER_TURN - G.itemsUsed;
      h = `<div class="tb">${act ? `HUNTER can't move!<br>(${act.name})` : 'What will<br>HUNTER do?'}
          <div class="sub">TURN ${G.turn} · ITEMS ${G.itemsUsed}/${CONFIG.MAX_ITEMS_PER_TURN} · items don't end your turn</div></div>
        <div class="cmds">
          ${act ? `<button class="cmd k-fight" data-act="wait">WAIT<small>${act.name}</small></button>`
                : `<button class="cmd k-fight" data-act="fight">FIGHT</button>`}
          <button class="cmd k-pouch" data-act="pouch" ${itemLock && !deoOk ? 'disabled' : ''}>POUCH<small>${itemLock ? itemLock.name : left + ' LEFT'}</small></button>
          <button class="cmd k-map" data-act="map">MAP</button>
          <button class="cmd k-run" data-act="run" ${run ? 'disabled' : ''}>RUN${run ? `${run.name}` : ''}</button>
        </div>`;
    }
  }
  P.innerHTML = h;
  fitPanel();
}

export function renderFieldPanel(P) {
  const p = G.player, s = getSharp(p.sharp), f = G.f, hp = p.hp / p.maxHp * 100;
  P.innerHTML = `<div id="fpad">
    <div class="dpad"><button data-dir="up">▲</button><button data-dir="left">◀</button><span class="dc"></span>
      <button data-dir="right">▶</button><button data-dir="down">▼</button></div>
    <div class="fmid">
      <div class="fstat">
        <div class="srow"><b>AREA</b>${areaInfo(f.area).name} · ${areaInfo(f.area).sub}</div>
        <div class="srow"><b>HP</b><span class="mbar" style="flex:none;width:${(hpLen(p) * .09).toFixed(2)}em"><i style="width:${hp}%;background:${HP_COLOR}"></i></span></div>
        <div class="srow"><b>EDGE</b><span class="mbar"><i style="width:${p.sharp / CONFIG.SHARP_MAX * 100}%;background:${s.color}"></i></span>${s.name}</div>
        <div class="srow"><b>COND</b>${G.feast ? chip('FEAST', 'c-mgt') : ''}${statusChips(p) || (G.feast ? '' : 'NORMAL')}</div>
        <div class="srow"><b>GEAR</b>${pimg(DATA['wpn_' + p.weapon])}${WEAPONS[p.weapon].name} ${elemTag(p)} · CARTS ${cartsUsed(p.carts)}</div>
      </div>
      <div class="ss"><button data-act="fstart">START</button><button data-act="fmap">MAP</button><button data-act="fpouch">POUCH</button></div>
      <div class="keys">ARROWS/WASD move · Z talk/A · X back · ENTER menu · M map · N music</div>
    </div>
    <div class="abtns"><button class="ab b" data-act="fb">B</button><button class="ab" data-act="fa">A</button></div>
  </div>`;
}