/* Always-on minimap (top-right, field only) and the full Mountain Stream map. */
import { $, Abort } from '../core/utils.js';
import { G, waits } from '../core/state.js';
import { AREAS, LINKS, THEMES } from '../data/world.js';
import { GATHER } from '../data/items.js';
import { DATA, pimg } from '../art/index.js';
import { Audio8 } from '../audio/audio8.js';

// The minimap is rebuilt only when what it shows changes (checked every frame)
let miniKey = '';
export function resetMini() { miniKey = ''; }

export function renderMini() {
  const el = $('mini');
  const show = !!G && G.screen === 'field' && !G.over
    && $('mapOv').classList.contains('hidden') && $('rewardOv').classList.contains('hidden');
  el.classList.toggle('hidden', !show);
  if (!show) return;
  const m = G.monster, cur = G.f.area;
  const vis = !m.dead && !m.captured && (G.paint > 0 || m.area === cur);
  const key = `${cur}|${vis ? m.area : '-'}|${m.sleeping}|${G.paint}`;
  if (key === miniKey) return;
  miniKey = key;
  const lines = LINKS.map(([a, b]) =>
    `<line x1="${AREAS[a].mx}" y1="${AREAS[a].my}" x2="${AREAS[b].mx}" y2="${AREAS[b].my}" stroke="#3e4436" stroke-width="2.5" stroke-linecap="round"/>`).join('');
  let h = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>`;
  for (const k in AREAS) {
    const a = +k, A = AREAS[a];
    h += `<div class="mblob ${a === 0 ? 'camp' : ''} ${a === cur ? 'cur' : ''}" style="left:${A.mx}%;top:${A.my}%;background:${THEMES[A.theme].map}"></div>
      <div class="mnum" style="left:${A.mx}%;top:${A.my}%">${a === 0 ? 'C' : a}</div>`;
  }
  const C = AREAS[cur];
  h += `<img class="mmk" src="${DATA.player}" style="left:${C.mx - 3}%;top:${C.my}%" alt="">`;
  if (vis) {
    const M = AREAS[m.area];
    h += `<img class="mmk mon" src="${DATA['mf_' + m.key]}" style="left:${M.mx + 5}%;top:${M.my}%" alt="">`;
  }
  h += `<div class="mtag">${G.paint > 0 ? 'PAINT ' + G.paint : 'M = MAP'}${vis && m.sleeping ? ' · ZZZ' : ''}</div>`;
  el.innerHTML = h;
}

export function renderMapOv() {
  const cur = G.f.area, m = G.monster;
  const showMon = !m.dead && !m.captured && (G.paint > 0 || m.area === cur);
  const lines = LINKS.map(([a, b]) => {
    const A = AREAS[a], B = AREAS[b], c = `x1="${A.mx}" y1="${A.my}" x2="${B.mx}" y2="${B.my}" stroke-linecap="round"`;
    return `<line ${c} stroke="#3e4436" stroke-width="2.6"/><line ${c} stroke="#a8a890" stroke-width="1" stroke-dasharray="1.5 2"/>`;
  }).join('');
  let h = `<div class="mapL"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg><div class="mapTitle">Mountain Stream</div>`;
  for (const k in AREAS) {
    const a = +k, A = AREAS[a];
    h += `<div class="blob ${a === 0 ? 'camp' : ''}" style="left:${A.mx}%;top:${A.my}%;background:${THEMES[A.theme].map}"></div>
      <div class="anum ${a === cur ? 'cur' : ''}" style="left:${A.mx}%;top:${A.my}%">${a === 0 ? `<img src="${DATA.ic_tent}" style="width:1.2em;display:block" alt="">` : a}</div>`;
    if (A.gather) h += `<div class="gics" style="left:${A.mx}%;top:${A.my + 9}%">${[...new Set(A.gather)].map(g => `<img src="${DATA['g_' + g]}" alt="">`).join('')}</div>`;
    if (G.npcs.some(n => n.area === a)) h += `<img class="mk npc" src="${DATA.ic_bubble}" style="left:${A.mx + 6}%;top:${A.my + 2}%" alt="">`;
  }
  const C = AREAS[cur];
  h += `<img class="mk" src="${DATA.player}" style="left:${C.mx - 3}%;top:${C.my - 4}%" alt="">`;
  if (showMon) {
    const M = AREAS[m.area];
    h += `<img class="mk mon" src="${DATA['mf_' + m.key]}" style="left:${M.mx + 4}%;top:${M.my - 4}%" alt="">`;
  }
  h += `</div><div class="legend"><div class="lgh">Legend</div>
    ${Object.keys(GATHER).map(g => `<div>${pimg(DATA['g_' + g])} ${GATHER[g].label}</div>`).join('')}
    <div class="lgs">${pimg(DATA.player)} YOU<br>${pimg(DATA.ic_bubble)} NPC<br>${pimg(DATA['mf_' + m.key])} ${m.name}
      ${showMon ? `→ AREA ${m.area}${m.sleeping ? ' (ASLEEP)' : ''}` : '(needs PAINTBALL)'}<br>
      PAINT: ${G.paint > 0 ? G.paint + ' turns' : 'none'} · TURN ${G.turn}</div>
    <button class="mi focus" data-act="closemap">CLOSE</button></div>`;
  $('mapOv').innerHTML = h;
}

/** Opens the full map and resolves when it is closed. */
export function openMap() {
  const g = G;
  renderMapOv(); $('mapOv').classList.remove('hidden'); Audio8.sfx('select');
  return new Promise(res => { waits.map = res; }).then(() => {
    $('mapOv').classList.add('hidden');
    if (G !== g) throw new Abort();
  });
}
export function closeMap() {
  if (waits.map) { const r = waits.map; waits.map = null; Audio8.sfx('back'); r(); }
}