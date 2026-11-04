/* =====================================================================
   CORE ENGINE & UI CONTROLLER (game.js)
   ===================================================================== */

import { Audio8 } from "./audio.js";
import {
  CONFIG, CHARGE_MULT, getSharp, isAttack, WEAPONS, MONSTERS, SMALLS, SMALL_SPAWNS,
  PARTS, ITEMS, GATHER, LOOT, ITEM_RAR, AREAS, LINKS, NEST, neighbors, sideTo,
  THEMES, SOLID, WATERS, MW, MH, CXT, CYT, DIRV, OPP, dirOf, SIDE_IN, CAMP_SPAWN,
  rng32, weighted, hexRgb, rgbHex, mixRgb, lighten, darken, renderArt,
  ITEM_ART, WEAPON_ART, GATHER_ART, ICON_ART, MON_ART, SKY, BGC, ART, DATA, hunterBackDef,
  FONT35, pxText, genArea, MAPS, findFree
} from "./data.js";

const $ = (id) => document.getElementById(id);
const rand = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BOX_KEY = "mh_gen3_itembox_v3";
const defaultBox = () => ({ items: {}, zenny: CONFIG.START_ZENNY, hunts: 0, weapon: "greatsword", muted: false });

function loadBox() {
  try { return { ...defaultBox(), ...(JSON.parse(localStorage.getItem(BOX_KEY)) || {}) }; }
  catch (e) { return defaultBox(); }
}
function saveBox() {
  try { localStorage.setItem(BOX_KEY, JSON.stringify(BOX)); } catch (e) {}
}

let BOX = loadBox();
Audio8.setMuted(BOX.muted);

let G = null;
const UI = { mode: "main", data: {} };
let typing = false, skipType = false, advance = null;

const NPC_DEFS = [
  { id: "campcat", area: 0, at: [9, 6], name: "CAMP FELYNE" },
  { id: "veteran", area: 2, at: [8, 12], name: "VETERAN HUNTER" },
  { id: "comrade", area: 3, at: [16, 13], name: "FELYNE COMRADE" }
];

function makeFoe(key, d, isBoss) {
  const parts = {};
  for (const k in d.parts) parts[k] = { hp: d.parts[k], max: d.parts[k], broken: false };
  return {
    kind: isBoss ? "boss" : "small", key, isBoss, name: d.name, rank: d.rank, attacks: d.attacks,
    hp: d.hp, maxHp: d.hp, parts, sleeping: false, sleepTurns: 0, flash: 0, skipNext: null,
    atkMult: 1, armorCracked: false, trapped: 0, trapCount: 0, tranq: 0, turnsInArea: 0,
    roamTimer: 0, restTurns: 0, fleeAt: randInt(CONFIG.FLEE_MIN, CONFIG.FLEE_MAX),
    lowHpFled: false, warnedCap: false, roared: false, dead: false, captured: false,
    area: null, posArea: null, x: 0, y: 0, hx: 0, hy: 0, mv: null, next: 0, dir: "left", alerted: false
  };
}

function initGame(targetBoss = "rathalos") {
  G = {
    state: "field",
    area: 0,
    px: CAMP_SPAWN.x,
    py: CAMP_SPAWN.y,
    pdir: CAMP_SPAWN.dir,
    hp: CONFIG.PLAYER_MAX_HP,
    maxHp: CONFIG.PLAYER_MAX_HP,
    carts: CONFIG.MAX_CARTS,
    weapon: BOX.weapon,
    sharp: CONFIG.SHARP_MAX,
    spirit: 0,
    charge: 0,
    might: 0,
    flashTurns: 0,
    guarding: false,
    invincible: false,
    paint: 0,
    targetBoss,
    boss: makeFoe(targetBoss, MONSTERS[targetBoss], true),
    smalls: {},
    npcs: NPC_DEFS.map((n) => ({ ...n, x: n.at[0], y: n.at[1] })),
    pouch: { potion: 5, whetstone: 1, might: 2, paintball: 3, flash: 2, shock: 1, tranq: 4 },
    log: []
  };

  G.boss.area = 5;
  const p = findFree(MAPS[5], CXT, CYT, true);
  G.boss.posArea = 5;
  G.boss.x = p.x;
  G.boss.y = p.y;
  G.boss.hx = p.x * 16;
  G.boss.hy = p.y * 16;

  spawnSmallsForArea(1);
  spawnSmallsForArea(6);
  spawnSmallsForArea(9);
}

function spawnSmallsForArea(aid) {
  const defs = SMALL_SPAWNS[aid];
  if (!defs) return;
  G.smalls[aid] = defs.map((k, idx) => {
    const f = makeFoe(k, SMALLS[k], false);
    f.area = aid;
    f.posArea = aid;
    const pos = findFree(MAPS[aid], CXT + (idx * 3 - 3), CYT, true);
    f.x = pos.x;
    f.y = pos.y;
    f.hx = pos.x * 16;
    f.hy = pos.y * 16;
    return f;
  });
}

function logMsg(txt, cls = "") {
  G.log.unshift({ txt, cls });
  if (G.log.length > 80) G.log.pop();
  renderLog();
}

function renderLog() {
  const el = $("log");
  if (!el) return;
  el.innerHTML = G.log.map((l) => `<div class="${l.cls}">${l.txt}</div>`).join("");
}

async function typeText(el, text, spd = CONFIG.TEXT_SPEED) {
  typing = true;
  skipType = false;
  el.innerHTML = "";
  for (let i = 0; i < text.length; i++) {
    if (skipType) {
      el.innerHTML = text;
      break;
    }
    el.innerHTML += text[i];
    if (text[i] !== " " && i % 3 === 0) Audio8.sfx("blip");
    await sleep(spd);
  }
  typing = false;
}

function getFieldStatusMsg() {
  const aid = G.area;
  const A = AREAS[aid];
  let m = `You are in ${A.name} (${A.sub}).`;
  if (aid === 0) m += " Safe base camp. Rest in the tent or check your item box.";
  if (G.boss.area === aid) m += ` ⚠️ ${G.boss.name} is roaming here!`;
  return m;
}

function setUI(mode, data = {}) {
  UI.mode = mode;
  UI.data = data;
  const panel = $("panel");
  panel.innerHTML = "";

  if (mode === "main") {
    panel.innerHTML = `
      <div class="tb adv" data-act="advance">
        <div id="msg"></div>
        <div class="sub" id="subMsg"></div>
        <span class="arrow show">▼</span>
      </div>
      <div class="cmds">
        <button class="cmd k-fight" data-act="cmd_fight">⚔ FIGHT<small>Engage Monster</small></button>
        <button class="cmd k-pouch" data-act="cmd_pouch">🎒 ITEM POUCH<small>Use / Inspect</small></button>
        <button class="cmd k-map" data-act="cmd_map">🗺 FIELD MAP<small>Area Travel</small></button>
        <button class="cmd k-run" data-act="cmd_camp">⛺ RETURN<small>Back to Camp</small></button>
      </div>
    `;
    typeText($("msg"), getFieldStatusMsg());
    $("subMsg").textContent = "Arrow keys to move. Choose an action.";
  } else if (mode === "battle_root") {
    const b = data.foe;
    panel.innerHTML = `
      <div class="tb">
        <div style="color:#e0b040; margin-bottom:0.4em;">BATTLE: ${b.name}</div>
        <div id="msg">What will HUNTER do?</div>
        <div class="sub">Edge: ${getSharp(G.sharp).name} | HP: ${G.hp}/${G.maxHp}</div>
      </div>
      <div class="cmds">
        <button class="cmd k-fight" data-act="b_attack">⚔ ATTACK<small>Weapon Moves</small></button>
        <button class="cmd k-pouch" data-act="b_pouch">🎒 ITEMS<small>Potions & Traps</small></button>
        <button class="cmd k-head" data-act="b_target">🎯 TARGET<small>Select Part</small></button>
        <button class="cmd k-run" data-act="b_flee">🏃 FLEE<small>Escape Area</small></button>
      </div>
    `;
  } else if (mode === "battle_moves") {
    const wpn = WEAPONS[G.weapon];
    let html = `<div class="movebox">`;
    wpn.moves.forEach((m) => {
      let dis = false, sub = m.desc;
      if (m.type === "release" && G.charge === 0) dis = true;
      if (m.type === "finisher" && G.spirit <= 0) dis = true;
      if (m.type === "counter" && G.spirit <= 0) dis = true;
      html += `<button class="mv" data-move="${m.id}" ${dis ? "disabled" : ""}>${m.name}<small>${sub}</small></button>`;
    });
    html += `</div><div class="minfo"><div id="mInfo" class="desc">Select a move to execute.</div><button class="mv back" data-act="b_back">◀ BACK</button></div>`;
    panel.innerHTML = html;
  }
}

// Map & Field Renderer
function drawField() {
  const cv = $("fieldCv");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const M = MAPS[G.area];

  // Draw background sky/ground
  const skyCol = SKY[M.theme] || SKY.camp;
  ctx.fillStyle = skyCol[0];
  ctx.fillRect(0, 0, cv.width, cv.height);

  // Draw Grid Tiles
  const tw = cv.width / MW;
  const th = cv.height / MH;

  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const tile = M.tiles[y][x];
      ctx.fillStyle = SOLID.has(tile) ? "#2c2218" : "#4a3c2a";
      ctx.fillRect(x * tw, y * th, tw - 1, th - 1);
    }
  }

  // Draw Player Marker
  ctx.fillStyle = "#e0b040";
  ctx.beginPath();
  ctx.arc(G.px * tw + tw / 2, G.py * th + th / 2, tw / 3, 0, Math.PI * 2);
  ctx.fill();

  // Draw Boss Monster Marker if in current area
  if (G.boss.area === G.area) {
    ctx.fillStyle = "#d9534f";
    ctx.beginPath();
    ctx.arc(G.boss.x * tw + tw / 2, G.boss.y * th + th / 2, tw / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function movePlayer(dx, dy) {
  if (G.state !== "field") return;
  const nx = clamp(G.px + dx, 1, MW - 2);
  const ny = clamp(G.py + dy, 1, MH - 2);
  const M = MAPS[G.area];
  if (!M.blockers.has(`${nx},${ny}`)) {
    G.px = nx;
    G.py = ny;
    Audio8.sfx("swoosh");
  }
}

// Event Listeners
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") movePlayer(0, -1);
  if (e.key === "ArrowDown" || e.key === "s") movePlayer(0, 1);
  if (e.key === "ArrowLeft" || e.key === "a") movePlayer(-1, 0);
  if (e.key === "ArrowRight" || e.key === "d") movePlayer(1, 0);
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button, [data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === "reset") { initGame("rathalos"); setUI("main"); }
  if (act === "mute") {
    const m = !Audio8.muted;
    Audio8.setMuted(m);
    BOX.muted = m;
    saveBox();
    $("muteBtn").textContent = `♪ MUSIC: ${m ? "OFF" : "ON"}`;
  }
  if (act === "cmd_fight") {
    if (G.boss.area === G.area) {
      G.state = "battle";
      Audio8.music("battle");
      $("battle").classList.remove("hidden");
      setUI("battle_root", { foe: G.boss, targetPart: "head" });
    } else {
      logMsg("No large monsters detected in this area.", "l-warn");
    }
  }
  if (act === "cmd_camp") {
    G.area = 0;
    G.px = CAMP_SPAWN.x;
    G.py = CAMP_SPAWN.y;
    Audio8.music("camp");
    setUI("main");
  }
  if (act === "b_back") setUI("battle_root", { foe: G.boss, targetPart: "head" });
  if (act === "b_attack") setUI("battle_moves", { foe: G.boss });
});

window.addEventListener("DOMContentLoaded", () => {
  Audio8.init();
  initGame("rathalos");
  setUI("main");
  Audio8.music("camp");
  requestAnimationFrame(gameLoop);
});

function gameLoop() {
  drawField();
  requestAnimationFrame(gameLoop);
}