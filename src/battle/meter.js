/* TIMING METER: press the shown key (W/A/S/D) while the pointer is inside the zone.
   The pointer sweeps until a key is pressed. Stances: evade · guard · counter · wake · fish.
   Mobile: four big Kahoot-style buttons in the battle command panel (or inside the meter box).
   POINTER SPEED t ∈ [0,1] → sweep = SLOW × (FAST/SLOW)^t.  ZONE SIZE s ∈ [0,1] → zone = MIN × (1/MIN)^s.
   All numbers hidden (console only). */
import { CONFIG } from "../core/config.js";
import { $, clamp, pick } from "../core/utils.js";
import { Audio8 } from "../audio/audio8.js";
import { addLog } from "../ui/fx.js";
import { skillVal } from "../core/gear.js";
import { speedOf } from "./speed.js";
import { accMod, blockedBy } from "./status.js";
import { moodAcc } from "./mood.js";

const TITLE = {
  evade: "DODGE!",
  guard: "BLOCK!",
  counter: "COUNTER!",
  wake: "WAKE-UP BLOW!",
  fish: "FISHING!",
};
const CMD_PANEL = "#bMenu"; // battle command panel (mobile buttons go here)
const isMobile = () => document.documentElement.classList.contains("mobile");

function skewed(lo, hi, r) {
  const k = Math.log(clamp(r, 0.05, 0.95)) / Math.log(0.5);
  return lo + (hi - lo) * Math.pow(Math.random(), k);
}
const sweepOf = (t) =>
  CONFIG.METER_SLOW_MS *
  Math.pow(CONFIG.METER_FAST_MS / CONFIG.METER_SLOW_MS, t);
const zoneOf = (s) =>
  Math.min(1, CONFIG.METER_MIN_ZONE * Math.pow(1 / CONFIG.METER_MIN_ZONE, s));
const place = (sweep, zone, log) => ({
  sweep,
  zone,
  log,
  key: pick([...CONFIG.METER_KEYS]),
  start: Math.random() * (1 - zone),
});

/** 0 (harmless) … 1 (deadliest). An attack can set `danger` itself. */
export function moveDanger(m, atk) {
  if (atk.danger != null) return clamp(atk.danger, 0, 1);
  if (atk.roar) return CONFIG.METER_ROAR_DANGER;
  const top = Math.max(
    1,
    ...m.attacks.filter((a) => !a.roar).map((a) => a.power || 0),
  );
  return clamp(((atk.power || 0) / top) * (atk.heavy ? 1 : 0.8), 0, 1);
}

export function meterParams(m, p, atk, stance = "evade") {
  const C = CONFIG;
  if (stance === "wake") {
    const sweep = sweepOf(skewed(0, C.WAKE_METER_SPEED_MAX, 0.5)),
      zone = zoneOf(skewed(0, 1, C.WAKE_METER_ZONE_MED));
    return place(
      sweep,
      zone,
      `wake-up · ${Math.round(sweep)}ms/sweep · zone ${(zone * 100).toFixed(1)}%`,
    );
  }
  const small = !m.isBoss,
    prof = small ? C.METER_SMALL : C.METER_LARGE;
  const hs = speedOf(p),
    ms = speedOf(m);
  const d = clamp(
    ((hs - ms) / Math.max(hs, ms, 1)) * C.METER_SPEED_SENS,
    -1,
    1,
  );
  const lo = (d < 0 ? -d * C.METER_SPEED_CUT : 0) * prof.speedMax;
  const hi = (d > 0 ? 1 - d * C.METER_SPEED_CUT : 1) * prof.speedMax;
  const t = skewed(lo, hi, C.METER_SPEED_MED - d * C.METER_SPEED_LEAN),
    sweep = sweepOf(t);
  const acc = accMod(p) + moodAcc(m) + skillVal("accuracy", 0),
    eva = skillVal("evasion", 0);
  const accTerm = clamp((acc + eva) / C.METER_ACC_SCALE, -1, 1);
  const danger = moveDanger(m, atk) * prof.danger;
  const pinned = !!blockedBy(p, "move"); // e.g. wind: smaller zone
  const med =
    C.METER_ZONE_MED +
    C.METER_ACC_W * accTerm -
    C.METER_DANGER_W * (danger - 0.5) +
    prof.zone +
    (m.flash > 0 ? C.METER_FLASH_BONUS : 0) -
    (pinned ? C.METER_STUCK_PENALTY : 0);
  const s = skewed(0, 1, med),
    zone = zoneOf(s);
  return place(
    sweep,
    zone,
    `${small ? "small" : "large"} · spd ${hs} vs ${ms} (gap ${d.toFixed(2)}) → t ${t.toFixed(2)} in [${lo.toFixed(2)},${hi.toFixed(2)}] = ${Math.round(sweep)}ms/sweep` +
      ` · zone ${(zone * 100).toFixed(1)}% (s ${s.toFixed(2)}; acc ${acc} eva ${eva} danger ${danger.toFixed(2)}${m.flash > 0 ? " flash" : ""}${pinned ? " PINNED" : ""})`,
  );
}

/** Fishing: fixed profile; `diff` −1 (easy) … 1 (hard) per spot. */
export function fishParams(diff = 0) {
  const F = CONFIG.FISH_METER,
    d = clamp(diff, -1, 1);
  const sweep = sweepOf(skewed(0, F.speedMax, 0.5 + d * 0.25)),
    zone = zoneOf(skewed(0, 1, F.zoneMed - d * 0.2));
  return place(
    sweep,
    zone,
    `fish (diff ${d}) · ${Math.round(sweep)}ms/sweep · zone ${(zone * 100).toFixed(1)}%`,
  );
}

let active = null;
export const meterActive = () => !!active;
export function cancelMeter() {
  if (active) active(false, "cancelled");
}

const padHtml = () =>
  [...CONFIG.METER_KEYS]
    .map((k) => `<button class="mt-b" data-k="${k}">${k}</button>`)
    .join("");

function runMeter(P, stance, host, panel) {
  const C = CONFIG;
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = `meter st-${stance}`;
    el.innerHTML = `<div class="mt-title">${TITLE[stance]}</div>
      <div class="mt-key">${P.key}</div>
      <div class="mt-bar"><div class="mt-zone" style="left:${P.start * 100}%;width:${P.zone * 100}%"></div><div class="mt-ptr"></div></div>`;
    host.appendChild(el);
    let pad = null,
      padHost = null;
    if (isMobile()) {
      pad = document.createElement("div");
      pad.className = "mt-pad";
      pad.innerHTML = padHtml();
      padHost = panel && panel.offsetParent ? panel : el;
      if (padHost === panel) panel.classList.add("mt-host");
      padHost.appendChild(pad);
      pad.querySelectorAll(".mt-b").forEach((b) =>
        b.addEventListener("pointerdown", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          press(b.dataset.k);
        }),
      );
    }
    const bar = el.querySelector(".mt-bar"),
      ptr = el.querySelector(".mt-ptr");
    let begin = 0,
      raf = 0,
      done = false;
    const posAt = (now) => {
      const ph = ((now - begin) / P.sweep) % 2;
      return ph < 1 ? ph : 2 - ph;
    };

    const finish = (ok, why) => {
      if (done) return;
      done = true;
      active = null;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey, true);
      addLog(
        `[meter ${stance} · ${P.log} · key ${P.key} · ${why} → ${ok ? "SUCCESS" : "FAIL"}]`,
        "dim",
      );
      el.classList.add(ok ? "ok" : "bad");
      Audio8.sfx(ok ? "select" : "back");
      setTimeout(
        () => {
          el.remove();
          pad?.remove();
          panel?.classList.remove("mt-host");
          resolve(ok);
        },
        why === "cancelled" ? 0 : C.METER_RESULT_MS,
      );
    };
    function press(k) {
      const now = performance.now();
      if (done || !begin || now < begin) return;
      if (k !== P.key) return finish(false, `wrong key ${k}`);
      const pos = posAt(now),
        w = bar.clientWidth,
        x = pos * w,
        a = P.start * w,
        b = a + Math.max(1, P.zone * w);
      ptr.style.left = pos * 100 + "%";
      finish(
        x >= a - 0.5 && x <= b + 0.5,
        `stopped at ${(pos * 100).toFixed(1)}%`,
      );
    }
    const onKey = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const k = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3) : "";
      if (!e.repeat && k && C.METER_KEYS.includes(k)) press(k);
    };
    const frame = (now) => {
      if (!begin) begin = now + C.METER_LEAD_MS;
      if (now >= begin) ptr.style.left = posAt(now) * 100 + "%";
      raf = requestAnimationFrame(frame);
    };
    window.addEventListener("keydown", onKey, true);
    active = finish;
    Audio8.sfx("blip");
    raf = requestAnimationFrame(frame);
  });
}

/** Battle meter (monster attacks, roars, wake-up blows). Resolves true on success. */
export function timingMeter(m, p, atk, stance = "evade") {
  const panel =
    document.querySelector(CMD_PANEL) ||
    document.querySelector("#battle button[data-act]")?.parentElement ||
    null;
  return runMeter(meterParams(m, p, atk, stance), stance, $("battle"), panel);
}

/** Field fishing meter. Resolves true on a catch. */
export function fishingMeter(diff = 0) {
  return runMeter(
    fishParams(diff),
    "fish",
    document.querySelector("#screen") || document.body,
    null,
  );
}
