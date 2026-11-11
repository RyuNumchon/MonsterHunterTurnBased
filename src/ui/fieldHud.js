/* Quest overworld HUD (bottom-right, no panel): statuses → HP → stamina → weapon gauge.
   Hidden in town, during battle, and when the game is over. */
import { $ } from "../core/utils.js";
import { CONFIG } from "../core/config.js";
import { G } from "../core/state.js";
import { WEAPONS, getSharp } from "../data/weapons.js";
import { chip, pips, hpLen, stLen, HP_COLOR } from "./hud.js";
import { syncStamina, maxStamina } from "../world/stamina.js";
import { statusChips } from "../battle/status.js";

const SCREEN = "#screen";
let el = null,
  sig = "";

function mount() {
  if (el?.isConnected) return el;
  el = document.createElement("div");
  el.id = "fHud";
  (document.querySelector(SCREEN) || document.body).appendChild(el);
  sig = "";
  return el;
}

const gauge = (p) =>
  WEAPONS[p.weapon].cls === "greatsword"
    ? `CHG${pips(p.charge, CONFIG.CHARGE_MAX)}`
    : `SPR${pips(p.spirit, 3)}`;

/** Call every frame; only rebuilds when something it shows has changed. */
export function syncFieldHud() {
  const h = mount();
  const show =
    !!G &&
    G.phase === "quest" &&
    G.screen === "field" &&
    !G.over &&
    !G.busy &&
    $("mapOv").classList.contains("hidden") &&
    $("rewardOv").classList.contains("hidden");

  h.classList.toggle("hidden", !show);
  if (!show) {
    sig = "";
    return;
  }
  const p = G.player;
  const st = Object.entries(p.status || {})
    .map(([k, s]) => k + s.turns)
    .join();
  const w = getSharp(p.sharp);
  const s = [
    p.hp,
    p.maxHp,
    p.maxStamina,
    st,
    p.buffs?.might,
    p.weapon,
    p.charge,
    p.spirit,
  ].join("|");
  if (s !== sig) {
    sig = s;
    h.innerHTML = `
      <div class="fh-st">${p.buffs?.might > 0 ? chip("MIGHT", "c-mgt") : ""}${statusChips(p)}</div>
      <div class="fh-row"><span class="fh-slot"><span class="fh-bar" style="width:${hpLen(p)}%"><i style="width:${(p.hp / p.maxHp) * 100}%;background:${HP_COLOR}"></i></span></span></div>
      <div class="fh-row"><span class="fh-slot"><span class="fh-bar" style="width:${stLen(p)}%"><i id="fHudSta" class="fSta" style="width:${Math.round(((p.stamina ?? maxStamina(p)) / maxStamina(p)) * 100)}%"></i></span></span></div>
      <div class="srow" style="color:${w.text}">${w.name}</div>
      <div class="fh-row fh-g">${gauge(p)}</div>
    `;
  }
  syncStamina();
}
