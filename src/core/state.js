/* Shared mutable state.
   ES-module imports are read-only bindings, but they stay LIVE: when this module
   reassigns `G`, every importer sees the new value. So:
     - `G` is replaced only through setG().
     - Everything else that changes at runtime lives inside plain objects, which
       any module may mutate (UI.menu = ..., waits.map = ..., etc.).            */

/** The current hunt (null before boot). Compare `G !== g` to detect a restart. */
export let G = null;
export function setG(v) { G = v; }

/** Battle-panel mode + the open list menu (field START menu, shop, YES/NO...). */
export const UI = { mode: 'main', data: {}, menu: null, count: null };

/** Pending "wait for the player" promises: resolve functions, or null. */
export const waits = { advance: null, map: null, carve: null, store: null };

/** Typewriter state. */
export const text = { typing: false, skip: false };

/** Held directions (last = active) and the D-pad button being held. */
export const input = { dirs: [], held: null };