/* Battle HUD (HP boxes, chips, sprites) and the bottom panel for every mode. */
import { CONFIG, CHARGE_MULT } from '../core/config.js';
import { $, clamp } from '../core/utils.js';
import { G, UI } from '../core/state.js';
import { WEAPONS, getSharp } from '../data/weapons.js';
import { PARTS, MONSTERS } from '../data/monsters.js';
import { ITEMS, BOSS_ONLY } from '../data/items.js';
import { AREAS } from '../data/world.js';
import { DATA, pimg } from '../art/index.js';
import { addLog, setPhase } from './fx.js';
import { findMove, moveDisabled, hitChances } from '../battle/turn.js';
import { blockedBy, statusChips, stunChance, hasStatus } from '../battle/status.js';
import { speedOf } from '../battle/speed.js';

export const hpColor = pct => pct > 50 ? '#58d080' : pct > 20 ? '#f8d030' : '#f05038';
export const chip = (t, c) => `<span class="chip ${c}">${t}</span>`;
export function setBar(el, pct, color) { el.style.width = clamp(pct, 0, 100) + '%'; el.style.backgroundColor = color; }
export const pips = (n, max) => Array.from({ length: max }, (_, i) => `<span class="pip ${i < n ? 'on' : ''}"></span>`).join('');
export const balls = n => Array.from({ length: CONFIG.MAX_CARTS }, (_, i) => `<span class="ball ${i < n ? 'used' : ''}"></span>`).join('');

export function showScreen() { $('battle').classList.toggle('hidden', !G || G.screen !== 'battle'); }

/** Builds the four part bars and the sharpness zone markers once at boot. */
export function initHud() {
  $('eParts').innerHTML = Object.keys(PARTS).map(k =>
    `<div class="pt" id="pb-${k}"><span>${PARTS[k].label}</span><div class="trk"><div class="fill"></div></div></div>`).join('');
  const marks = $('pSharp').parentElement.querySelectorAll('i');
  marks[0].style.left = (CONFIG.SHARP_YELLOW / CONFIG.SHARP_MAX * 100) + '%';
  marks[1].style.left = (CONFIG.SHARP_GREEN / CONFIG.SHARP_MAX * 100) + '%';
}

export function renderBattle() {
  if (!G || !G.foe) return;
  const p = G.player, m = G.foe, w = WEAPONS[p.weapon];
  // --- Enemy box ---
  $('eName').textContent = m.name;
  $('eRank').textContent = `${m.isBoss ? '★' + m.rank : 'Lv' + m.rank} · SPD ${speedOf(m)}`;
  const eP = m.hp / m.maxHp * 100;
  setBar($('eHp'), eP, hpColor(eP));
  for (const k in PARTS) {
    const pt = m.parts[k], el = $('pb-' + k);
    el.classList.toggle('brk', pt.broken);
    setBar(el.querySelector('.fill'), pt.hp / pt.max * 100, pt.broken ? '#8a8a8a' : '#e09030');
  }
  const ec = [];
  if (m.captured) ec.push(chip('CAPTURED', 'c-cap'));
  else if (m.isBoss && !m.dead && eP <= CONFIG.CAPTURE_PCT * 100) ec.push(chip('CAPTURE OK', 'c-cap'));
  if (m.sleeping && !m.captured) ec.push(chip('SLP', 'c-slp'));
  if (m.trapped > 0) ec.push(chip(`TRAP ${m.trapped}`, 'c-trap'));
  if (m.tranq > 0 && !m.captured) ec.push(chip(`TRANQ ${m.tranq}/${CONFIG.TRANQ_NEEDED}`, 'c-tq'));
  if (m.flash > 0) ec.push(chip(`BLIND ${m.flash}`, 'c-bln'));
  if (m.isBoss && G.paint > 0) ec.push(chip(`PAINT ${G.paint}`, 'c-pnt'));
  if (m.skipNext) ec.push(chip('STUN', 'c-stun'));
  if (m.isBoss && m.parts.tail.broken) ec.push(chip('ATK↓', 'c-cut'));
  if (m.armorCracked) ec.push(chip('DEF↓', 'c-crk'));
  $('eChips').innerHTML = ec.join('') + statusChips(m);

  // --- Player box ---
  $('pWpn').textContent = w.short;
  $('pBalls').innerHTML = balls(p.carts);
  const pP = p.hp / p.maxHp * 100;
  setBar($('pHp'), pP, hpColor(pP));
  $('pHpNum').textContent = `${p.hp}/${p.maxHp}`;
  const s = getSharp(p.sharp);
  setBar($('pSharp'), p.sharp / CONFIG.SHARP_MAX * 100, s.color);
  $('pSharpLbl').innerHTML = `<span style="color:${s.text}">${s.name}</span> ${p.sharp}/${CONFIG.SHARP_MAX}`;
  $('pGauge').innerHTML = (p.weapon === 'greatsword' ? `CHG${pips(p.charge, 2)}` : `SPR${pips(p.spirit, 3)}`) + ` · SPD ${speedOf(p)}`;
  const pc = [];
  if (p.buffs.might > 0) pc.push(chip(`MIGHT ${p.buffs.might}`, 'c-mgt'));
  if (p.guarding) pc.push(chip('GUARD', 'c-grd'));
  if (p.foresight) pc.push(chip('FORESIGHT', 'c-fs'));
  if (s.bounce) pc.push(chip('BOUNCE!', 'c-crk'));
  const dizzy = stunChance(p);
  if (dizzy > 0 && !hasStatus(p, 'stun')) pc.push(chip(`DIZZY ${dizzy}%`, 'c-stun'));
  $('pChips').innerHTML = pc.join('') + statusChips(p);

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
    if (mode === 'main' || mode === 'bag') setPhase(1);
    else if (['fight', 'target', 'confirm'].includes(mode)) setPhase(2);
    if (mode === 'main' && G.loggedTurn !== G.turn) { G.loggedTurn = G.turn; addLog(`━━ TURN ${G.turn} ━━`, 'turn'); }
  }
  renderPanel();
}

export function moveSub(mv) {
  const p = G.player;
  switch (mv.type) {
    case 'release':  return `${CHARGE_MULT[p.charge]}x NOW`;
    case 'charge':   return `HELD Lv${p.charge}/2`;
    case 'guard':    return 'DMG -60%';
    case 'counter':  return p.spirit < 1 ? 'NEED SPIRIT' : 'EVADE';
    case 'finisher': return p.spirit < 1 ? 'NEED SPIRIT' : `x${1 + 0.5 * p.spirit}`;
    default:         return `POW ${mv.power}`;
  }
}
export function moveInfo(mv) {
  const p = G.player, s = getSharp(p.sharp);
  const stats = mv.power ? `POW ${mv.power} · ACC ${mv.acc >= 0 ? '+' : ''}${mv.acc}` : '';
  return `<div>EDGE <b style="color:${s.text}">${p.sharp}/${CONFIG.SHARP_MAX}</b> (-${mv.sharp})</div>
    <div>TYPE/${mv.tag}</div><div>${stats}</div><div class="desc">${mv.desc}</div>`;
}

export function renderPanel() {
  const P = $('panel');
  if (!G) { P.innerHTML = ''; return; }
  if (G.over) {
    const win = G.outcome === 'slay' || G.outcome === 'capture';
    const otherKey = G.monsterKey === 'rathalos' ? 'tigrex' : 'rathalos';
    P.innerHTML = `<div class="tb">${win ? 'Great hunting!' : 'The hunt is over.'}<br>Check the reward screen above.</div>
      <div class="cmds"><button class="cmd k-fight" data-act="rematch">REMATCH</button>
        <button class="cmd k-run" data-act="hunt" data-val="${otherKey}">HUNT<small>${MONSTERS[otherKey].name}</small></button></div>`;
    return;
  }
  if (G.screen === 'field') { renderFieldPanel(P); return; }

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
          <div class="sub">${m.sleeping ? 'Target is ASLEEP: guaranteed hit, x2 damage' : 'A near-miss DRIFTS to an adjacent part'}</div></div>
        <div class="cmds">${Object.keys(PARTS).map(k => {
          const c = m.sleeping ? 100 : hitChances(mv, k).target, pt = m.parts[k];
          return `<button class="cmd k-${k}" data-act="part" data-val="${k}">${PARTS[k].label} ${c}%<small>${pt.broken ? 'BROKEN' : `${pt.hp}/${pt.max}`} · DMG x${PARTS[k].dmgMult}</small></button>`;
        }).join('')}<button class="cmd back" data-act="back">BACK</button></div>`;
      break;
    }
    case 'confirm':
      h = `<div class="tb">${d.q}<div class="sub">${d.sub || ''}</div></div>
        <div class="yn"><button data-act="yes">YES</button><button data-act="no">NO</button></div>`;
      break;
    case 'bag': {
      const left = CONFIG.MAX_ITEMS_PER_TURN - G.itemsUsed, itemLock = blockedBy(p, 'item');
      h = `<div class="tb" id="bagInfo">${itemLock ? `Can't use items! (${itemLock.name})` : left > 0 ? 'Choose an item.<br>It takes effect immediately.' : 'No more items this turn!'}
          <div class="sub">ITEMS USED ${G.itemsUsed}/${CONFIG.MAX_ITEMS_PER_TURN} THIS TURN · no turn cost</div></div>
        <div class="baglist">${Object.keys(ITEMS).map(k => {
          const dis = !!itemLock || left <= 0 || G.inventory[k] <= 0 || (BOSS_ONLY.includes(k) && !m.isBoss);
          return `<button class="it" data-act="item" data-val="${k}" data-info="${k}" ${dis ? 'disabled' : ''}>
            ${pimg(DATA['item_' + k])}${ITEMS[k].name}<span class="q">x${G.inventory[k]}</span></button>`;
        }).join('')}<button class="cmd back" data-act="back">BACK</button></div>`;
      break;
    }
    case 'carve':
      h = `<div class="tb">${d.what === 'TAIL' ? `The severed ${m.name} TAIL...` : `The ${m.name} lies still...`}<br>Carve it for materials! (${d.i + 1}/${d.n})
          <div class="sub">Press CARVE or Z for each carve.</div></div>
        <div class="cmds"><button class="cmd k-fight carvebtn" data-act="carve">CARVE</button></div>`;
      break;

      default: { // 'main'
      const act = blockedBy(p, 'act'), itemLock = blockedBy(p, 'item');
      const left = CONFIG.MAX_ITEMS_PER_TURN - G.itemsUsed;
      h = `<div class="tb">${act ? `HUNTER can't move!<br>(${act.name})` : 'What will<br>HUNTER do?'}
          <div class="sub">TURN ${G.turn} · ITEMS ${G.itemsUsed}/${CONFIG.MAX_ITEMS_PER_TURN} · items don't end your turn</div></div>
        <div class="cmds">
          ${act ? `<button class="cmd k-fight" data-act="wait">WAIT<small>${act.name}</small></button>`
                : `<button class="cmd k-fight" data-act="fight">FIGHT</button>`}
          <button class="cmd k-bag" data-act="bag" ${itemLock ? 'disabled' : ''}>BAG<small>${itemLock ? itemLock.name : left + ' LEFT'}</small></button>
          <button class="cmd k-map" data-act="map">MAP</button>
          <button class="cmd k-run" data-act="run" ${act ? 'disabled' : ''}>RUN</button>
        </div>`;
    }
  }
  P.innerHTML = h;
}

/** Field panel: GBA-style D-pad, status card, START/MAP/BAG, A/B. */
export function renderFieldPanel(P) {
  const p = G.player, s = getSharp(p.sharp), f = G.f, hp = p.hp / p.maxHp * 100;
  P.innerHTML = `<div id="fpad">
    <div class="dpad"><button data-dir="up">▲</button><button data-dir="left">◀</button><span class="dc"></span>
      <button data-dir="right">▶</button><button data-dir="down">▼</button></div>
    <div class="fmid">
      <div class="fstat">
        <div class="srow"><b>AREA</b>${AREAS[f.area].name} · ${AREAS[f.area].sub}</div>
        <div class="srow"><b>HP</b><span class="mbar"><i style="width:${hp}%;background:${hpColor(hp)}"></i></span>${p.hp}/${p.maxHp}</div>
        <div class="srow"><b>COND</b>${statusChips(p) || 'NORMAL'}</div>
        <div class="srow"><b>EDGE</b><span class="mbar"><i style="width:${p.sharp / CONFIG.SHARP_MAX * 100}%;background:${s.color}"></i></span>${s.name}</div>
        <div class="srow"><b>GEAR</b>${pimg(DATA['wpn_' + p.weapon])}${WEAPONS[p.weapon].short} · SPD ${speedOf(p)} · CARTS <span class="balls">${balls(p.carts)}</span></div>
      </div>
      <div class="ss"><button data-act="fstart">START</button><button data-act="fmap">MAP</button><button data-act="fbag">BAG</button></div>
      <div class="keys">ARROWS/WASD move · Z talk/A · X back · ENTER menu · M map · N music</div>
    </div>
    <div class="abtns"><button class="ab b" data-act="fb">B</button><button class="ab" data-act="fa">A</button></div>
  </div>`;
}