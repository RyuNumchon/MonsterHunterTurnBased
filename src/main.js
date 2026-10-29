/* Entry point: wire up the HUD and input, spawn into Base Camp, run the main loop. */
import { G } from './core/state.js';
import { BOX } from './core/save.js';
import { Audio8 } from './audio/audio8.js';
import { initHud } from './ui/hud.js';
import { renderMini } from './ui/map.js';
import { drawField } from './ui/fieldRender.js';
import { updateField } from './world/field.js';
import { initInput, updateMuteLabel } from './input.js';
import { newGame } from './game.js';

let lastT = performance.now();
function loop(now) {
  const dt = Math.min(50, now - lastT);   // clamp so a background tab doesn't teleport anyone
  lastT = now;
  if (G && G.screen === 'field') {
    updateField(dt, now);
    if (G.screen === 'field') drawField(now);
  }
  renderMini();                            // cheap: only rebuilds when its content changes
  requestAnimationFrame(loop);
}

initHud();
initInput();
Audio8.setMuted(BOX.muted);
updateMuteLabel();
newGame('rathalos');
requestAnimationFrame(loop);