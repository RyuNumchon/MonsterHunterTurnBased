/* Overworld renderer: 480×320 canvas drawn at 2× (a 15×10 tile view).
   Everything is drawn fully opaque; only shadows use translucent fills. */
import { CONFIG } from '../core/config.js';
import { $, clamp } from '../core/utils.js';
import { G } from '../core/state.js';
import { THEMES } from '../data/world.js';
import { TILES, OVER, SPR, NPCSPR, CATSPR } from '../art/tiles.js';
import { ART, pxText } from '../art/index.js';
import { MAPS } from '../world/mapgen.js';

const CV = $('fieldCv'), CX = CV.getContext('2d');

/** Pixel position of an entity, including its in-progress step tween. */
export function entPos(e) {
  const t = e.mv ? Math.min(1, e.mv.t) : 0;
  return { x: (e.x + (e.mv ? (e.mv.tx - e.x) * t : 0)) * 16, y: (e.y + (e.mv ? (e.mv.ty - e.y) * t : 0)) * 16, t };
}
function ellipse(x, y, rx, ry) { CX.beginPath(); CX.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); CX.fill(); }
function tri(a, b, c, d, e, f) { CX.beginPath(); CX.moveTo(a, b); CX.lineTo(c, d); CX.lineTo(e, f); CX.closePath(); CX.fill(); }
function blit(img, x, y, flip) {
  x = Math.round(x); y = Math.round(y);
  if (!flip) { CX.drawImage(img, x, y); return; }
  CX.save(); CX.translate(x + img.width, y); CX.scale(-1, 1); CX.drawImage(img, 0, 0); CX.restore();
}
// Pokémon "!" when a monster spots the hunter
function drawBang(cx, top) {
  cx = Math.round(cx); top = Math.round(top);
  CX.fillStyle = '#283038'; CX.fillRect(cx - 5, top - 12, 10, 12);
  CX.fillStyle = '#ffffff'; CX.fillRect(cx - 4, top - 11, 8, 10);
  CX.fillStyle = '#e03030'; CX.fillRect(cx - 1, top - 10, 2, 5); CX.fillRect(cx - 1, top - 4, 2, 2);
}

function drawObject(o) {
  const X = o.x * 16, Y = o.y * 16;
  switch (o.type) {
    case 'tent':
      CX.fillStyle = 'rgba(0,0,0,.2)'; CX.fillRect(X + 2, Y + 27, 46, 5);
      CX.fillStyle = '#7a3020'; tri(X, Y + 30, X + 24, Y + 1, X + 48, Y + 30);
      CX.fillStyle = '#d84838'; tri(X + 3, Y + 29, X + 24, Y + 4, X + 45, Y + 29);
      CX.fillStyle = '#f0d8b0'; tri(X + 14, Y + 29, X + 24, Y + 10, X + 34, Y + 29);
      CX.fillStyle = '#402018'; tri(X + 18, Y + 29, X + 24, Y + 17, X + 30, Y + 29);
      CX.fillStyle = '#f8c040'; CX.fillRect(X + 23, Y, 2, 3);
      break;
    case 'bed':
      CX.fillStyle = '#6a4428'; CX.fillRect(X + 1, Y + 1, 14, 15);
      CX.fillStyle = '#f8f8f0'; CX.fillRect(X + 2, Y + 2, 12, 13);
      CX.fillStyle = '#dce4f0'; CX.fillRect(X + 4, Y + 3, 8, 3);
      CX.fillStyle = '#4878c8'; CX.fillRect(X + 2, Y + 8, 12, 7);
      break;
    case 'box':       // blue Supply Box
      CX.fillStyle = 'rgba(0,0,0,.2)'; CX.fillRect(X + 1, Y + 13, 15, 3);
      CX.fillStyle = '#1f3f80'; CX.fillRect(X + 1, Y + 3, 14, 12);
      CX.fillStyle = '#3c6cc8'; CX.fillRect(X + 2, Y + 4, 12, 4); CX.fillRect(X + 2, Y + 9, 12, 5);
      CX.fillStyle = '#f0c040'; CX.fillRect(X + 7, Y + 7, 2, 3);
      break;
    case 'itembox':   // red Item Box (weapon select + storage)
      CX.fillStyle = 'rgba(0,0,0,.2)'; CX.fillRect(X + 1, Y + 13, 15, 3);
      CX.fillStyle = '#601818'; CX.fillRect(X + 1, Y + 3, 14, 12);
      CX.fillStyle = '#c83a30'; CX.fillRect(X + 2, Y + 4, 12, 4); CX.fillRect(X + 2, Y + 9, 12, 5);
      CX.fillStyle = '#e8b840'; CX.fillRect(X + 1, Y + 8, 14, 1); CX.fillRect(X + 7, Y + 7, 2, 3);
      break;
    case 'sign':
      CX.fillStyle = '#6a4428'; CX.fillRect(X + 7, Y + 9, 2, 7);
      CX.fillStyle = '#8a5a30'; CX.fillRect(X + 2, Y + 2, 12, 8);
      CX.fillStyle = '#c8945a'; CX.fillRect(X + 3, Y + 3, 10, 6);
      CX.fillStyle = '#6a4428'; CX.fillRect(X + 5, Y + 5, 6, 1); CX.fillRect(X + 5, Y + 7, 4, 1);
      break;
  }
}

export function drawField(now) {
  const f = G.f, M = MAPS[f.area], th = THEMES[M.theme];
  CX.setTransform(2, 0, 0, 2, 0, 0);
  CX.imageSmoothingEnabled = false;
  CX.globalAlpha = 1;
  const pp = entPos(f);
  const camX = Math.round(clamp(pp.x + 8 - 120, 0, M.w * 16 - 240));
  const camY = Math.round(clamp(pp.y + 8 - 80, 0, M.h * 16 - 160));
  CX.fillStyle = '#101418'; CX.fillRect(0, 0, 240, 160);
  CX.save(); CX.translate(-camX, -camY);

  // --- Tiles (only the visible window) ---
  const wf = Math.floor(now / 450) % 2;
  const v = (arr, x, y) => arr[(x * 7 + y * 13) % arr.length];
  const x0 = Math.floor(camX / 16), y0 = Math.floor(camY / 16);
  const x1 = Math.min(M.w - 1, x0 + 15), y1 = Math.min(M.h - 1, y0 + 10);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = M.tiles[y][x];
    const set = c === 'E' ? TILES[th.path] : (TILES[c] || TILES[th.ground]);
    CX.drawImage((c === '~' || c === 'w') ? set[wf] : v(set, x, y), x * 16, y * 16);
    if (OVER[c]) CX.drawImage(v(OVER[c], x, y), x * 16, y * 16);
  }

  // --- Exit markers with the destination area number ---
  const glow = Math.sin(now / 250) > 0;
  M.exits.forEach(e => {
    const X = e.x * 16, Y = e.y * 16, label = e.to === 0 ? 'C' : String(e.to);
    CX.fillStyle = glow ? '#f8d850' : '#e0b830'; CX.fillRect(X + 3, Y + 3, 10, 10);
    CX.fillStyle = '#1c2818'; CX.fillRect(X + 3, Y + 3, 10, 1); CX.fillRect(X + 3, Y + 12, 10, 1);
    CX.fillRect(X + 3, Y + 3, 1, 10); CX.fillRect(X + 12, Y + 3, 1, 10);
    pxText(CX, label, X + 8 - Math.floor((label.length * 4 - 1) / 2), Y + 6, '#1c2818');
  });

  // --- Props & gathering points (used-up spots turn grey but stay opaque) ---
  M.objects.forEach(drawObject);
  M.gathers.forEach(gp => {
    const used = G.gatherUses[`${f.area},${gp.x},${gp.y}`] || 0;
    CX.fillStyle = 'rgba(0,0,0,.25)'; ellipse(gp.x * 16 + 8, gp.y * 16 + 14, 6, 2);
    CX.drawImage(ART[(used >= CONFIG.GATHER_USES ? 'gx_' : 'g_') + gp.type], gp.x * 16, gp.y * 16 - 2);
  });

  // --- Entities + hunter, y-sorted so lower things draw in front ---
  const list = G.ents.map(e => ({ e, p: entPos(e) }));
  list.push({ e: null, p: pp });
  list.sort((a, b) => a.p.y - b.p.y);
  for (const { e, p } of list) {
    if (!e) { blit(SPR[f.dir][f.mv ? (f.step % 2 ? 'A' : 'B') : 'S'], p.x, p.y - 2); continue; }
    if (e.kind === 'npc') {
  // Bottom-centred so sprites of any size stand on their tile; Palicos face the way they walk
    const img = e.look === 'hunter' ? NPCSPR[e.dir][e.mv ? 'A' : 'S'] : CATSPR[e.look];
    blit(img, p.x + 8 - img.width / 2, p.y + 14 - img.height, e.look !== 'hunter' && e.dir === 'right');
    continue;
  }

    const img = ART['mf_' + e.key], hop = e.mv ? -2 * Math.sin(Math.PI * p.t) : 0;
    const top = p.y + 16 - img.height;
    CX.fillStyle = 'rgba(0,0,0,.3)'; ellipse(p.x + 8, p.y + 14, img.width * 0.38, 3);
    blit(img, p.x + 8 - img.width / 2, top + hop, e.dir === 'right');   // art faces left
    if (e.kind === 'boss' && e.sleeping) {
      const k = (now / 900) % 1;
      pxText(CX, 'Z', Math.round(p.x + 16 + k * 4), Math.round(top - 2 - k * 6), '#3848a8');
    }
    if (e.bang > now) drawBang(p.x + 8, top - 1);
  }
  CX.restore();

  // --- Cave darkness around the hunter (Wyvern Nest) ---
  if (M.theme === 'cave') {
    const sx = pp.x - camX + 8, sy = pp.y - camY + 8;
    const gr = CX.createRadialGradient(sx, sy, 30, sx, sy, 150);
    gr.addColorStop(0, 'rgba(10,6,30,0)'); gr.addColorStop(1, 'rgba(10,6,30,.6)');
    CX.fillStyle = gr; CX.fillRect(0, 0, 240, 160);
  }
}