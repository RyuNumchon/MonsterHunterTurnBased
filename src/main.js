/* Entry point: load sprites, wire up the HUD and input, spawn into Base Camp, run the main loop. */
import { G } from './core/state.js';
import { BOX } from './core/save.js';
import { Audio8 } from './audio/audio8.js';
import { loadSprites } from './art/sprites.js';
import { initHud, renderPanel, renderBattle } from './ui/hud.js';
import { renderMini } from './ui/map.js';
import { drawField } from './ui/fieldRender.js';
import { updateField } from './world/field.js';
import { initInput, updateMuteLabel } from './input.js';
import { newSession } from './game.js';

let lastT = performance.now();
function loop(now) {
  const dt = Math.min(50, now - lastT);   // clamp so a background tab doesn't teleport anyone
  lastT = now;
  if (G && G.screen === 'field') {
    updateField(dt, now);
    if (G.screen === 'field') drawField(now);
  }
  renderMini();
  requestAnimationFrame(loop);
}

initHud();
initInput();
Audio8.setMuted(BOX.muted);
updateMuteLabel();
await loadSprites();   // swap in the ./resources images before anything is drawn
document.fonts?.ready.then(() => { renderPanel(); renderBattle(); });
newSession();
requestAnimationFrame(loop);