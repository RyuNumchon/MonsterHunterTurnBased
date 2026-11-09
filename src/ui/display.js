/* Desktop vs mobile layout. Desktop: only the game view is shown, at an exact 16:9 ratio,
   scaled to fill the browser. Mobile: unchanged, with on-screen controls.
   Also: desktop key mapping, right-click = back, keyboard focus for battle buttons. */
import { G, UI } from "../core/state.js";
import { meterActive } from "../battle/meter.js";

const SCREEN = "#screen"; // the game view: map canvas + menus, battle, text box
const KEEP = ["#fMenu", "#battle", "#panel", "#fDialog"]; // must stay visible (should be inside SCREEN)
const TEXTBOX = "#fDialog, #panel .tb.adv"; // left-clicking text advances it (null = off)
const ASPECT = 16 / 9;
const html = document.documentElement;
const touchQuery = matchMedia("(hover: none) and (pointer: coarse)");

export const isDesktop = () => html.classList.contains("desktop");

const DIRS = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
export function readKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (DIRS[e.code]) return { dir: DIRS[e.code] };
  if (e.code === "KeyF" || e.code === "Space" || e.key === "MouseConfirm")
    return { a: true };
  if (e.key === "MouseBack") return { b: true };
  if (e.code === "Escape") return { b: true, start: true };
  if (e.code === "KeyE") return { pouch: true };
  if (e.code === "KeyM") return { map: true };
  return null;
}

/* ---------- Layout ---------- */
let natW = 0;

/** Hide everything that isn't the game view (or a KEEP element), and log what was hidden. */
function isolate(el) {
  const keep = KEEP.map((s) => document.querySelector(s)).filter(Boolean);
  for (const k of keep)
    if (!el.contains(k))
      console.warn(
        `[display] ${k.id ? "#" + k.id : k.className} is outside ${SCREEN}: move it inside so it scales with the game`,
      );
  const hidden = [];
  for (let n = el; n.parentElement && n !== document.body; n = n.parentElement)
    for (const sib of n.parentElement.children)
      if (
        sib !== n &&
        !["SCRIPT", "STYLE", "LINK"].includes(sib.tagName) &&
        !keep.some((k) => sib === k || sib.contains(k))
      ) {
        sib.classList.add("dz-off");
        hidden.push(sib);
      }
  if (hidden.length) console.info("[display] hidden on desktop:", hidden);
}

function layout() {
  const el = document.querySelector(SCREEN);
  if (!el) {
    console.warn(`[display] ${SCREEN} not found: set SCREEN in display.js`);
    return;
  }
  el.dataset.css0 ??= el.style.cssText;
  el.style.cssText = el.dataset.css0;
  document
    .querySelectorAll(".dz-off")
    .forEach((x) => x.classList.remove("dz-off"));
  el.querySelectorAll("#fieldCv").forEach((c) =>
    c.classList.toggle("dz-fill", isDesktop()),
  );
  if (!isDesktop()) return;
  isolate(el);
  natW ||= el.offsetWidth; // design width; height is set to 16:9
  const W = natW,
    H = Math.round(W / ASPECT),
    s = Math.min(innerWidth / W, innerHeight / H);
  Object.assign(el.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    width: W + "px",
    height: H + "px",
    margin: "0",
    border: "0",
    borderRadius: "0",
    boxSizing: "border-box",
    overflow: "hidden",
    transformOrigin: "center center",
    transform: `translate(-50%,-50%) scale(${s})`,
  });
}

function applyMode() {
  const forced = new URLSearchParams(location.search).get("mode");
  const mobile = forced ? forced === "mobile" : touchQuery.matches;
  html.classList.toggle("mobile", mobile);
  html.classList.toggle("desktop", !mobile);
  requestAnimationFrame(layout);
}

const virtual = (key) =>
  ["keydown", "keyup"].forEach((t) =>
    document.dispatchEvent(new KeyboardEvent(t, { key, bubbles: true })),
  );

/* ---------- Battle buttons: keyboard focus ---------- */
let focus = null;
const battleBtns = () =>
  [
    ...document.querySelectorAll("#battle button[data-act]:not([disabled])"),
  ].filter((b) => b.offsetParent && !b.closest(".meter, #fMenu"));
function setFocus(b) {
  document
    .querySelectorAll(".kfocus")
    .forEach((x) => x.classList.remove("kfocus"));
  focus = b || null;
  if (focus) focus.classList.add("kfocus");
}
function nearest(from, list, dir) {
  const mid = (el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const [fx, fy] = mid(from),
    [vx, vy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  let best = null,
    bd = Infinity;
  for (const b of list) {
    if (b === from) continue;
    const [x, y] = mid(b),
      dx = x - fx,
      dy = y - fy,
      along = dx * vx + dy * vy;
    if (along <= 1) continue;
    const d = along + Math.abs(dx * vy - dy * vx) * 2;
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

export function battleNav(k) {
  if (
    !isDesktop() ||
    !G ||
    G.screen !== "battle" ||
    G.busy ||
    UI.menu ||
    UI.count ||
    meterActive()
  )
    return false;
  const btns = battleBtns();
  if (!btns.length) return false;
  if (!btns.includes(focus)) {
    setFocus(btns[0]);
    if (!k.pouch) return true;
  }
  if (k.dir) {
    setFocus(nearest(focus, btns, k.dir) || focus);
    return true;
  }
  if (k.a) {
    focus.click();
    return true;
  }
  if (k.pouch) {
    const b = btns.find((x) => /POUCH/i.test(x.textContent));
    if (b) {
      b.click();
      return true;
    }
    return false;
  }
  if (k.b) {
    const back = btns.find((x) => x.dataset.act === "back");
    if (back) {
      back.click();
      return true;
    }
  }
  return false;
}

export function initDisplay() {
  applyMode();
  touchQuery.addEventListener("change", applyMode);
  addEventListener("resize", () => requestAnimationFrame(layout));

  addEventListener("click", (e) => {
    if (
      TEXTBOX &&
      isDesktop() &&
      e.button === 0 &&
      !meterActive() &&
      e.target.closest?.(TEXTBOX)
    )
      virtual("MouseConfirm");
  });
  addEventListener("contextmenu", (e) => {
    if (!isDesktop()) return;
    e.preventDefault();
    if (!meterActive()) virtual("MouseBack");
  });
  document.addEventListener("mouseover", (e) => {
    const b = e.target.closest?.("#battle button[data-act]");
    if (b && isDesktop() && battleBtns().includes(b)) setFocus(b);
  });
  const battle = document.getElementById("battle");
  if (battle)
    new MutationObserver(() => {
      if (
        isDesktop() &&
        !(focus && focus.isConnected && battleBtns().includes(focus))
      )
        setFocus(battleBtns()[0]);
    }).observe(battle, { childList: true, subtree: true });
}
