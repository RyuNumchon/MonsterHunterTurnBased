/* Battle start + Item Phase (items are used instantly, max 3 per turn, no turn cost). */
import { CONFIG } from '../core/config.js';
import { $ } from '../core/utils.js';
import { G, input } from '../core/state.js';
import { ITEMS, BOSS_ONLY } from '../data/items.js';
import { AREAS } from '../data/world.js';
import { DATA } from '../art/index.js';
import { battleBg } from '../art/backgrounds.js';
import { Audio8 } from '../audio/audio8.js';
import { flow, say, pause } from '../ui/dialog.js';
import { showScreen, renderBattle } from '../ui/hud.js';
import { anim, addLog } from '../ui/fx.js';
import { captureWin } from './endings.js';
import { applyStatus, blockedBy, clearBattleOnly, curable, cureStatuses } from './status.js';

export function startEncounter(e, how) {
  if (!G || G.busy || G.screen !== 'field' || G.over) return;
  G.f.mv = null; input.dirs = [];
  e.mv = null; e.alerted = false; e.bang = 0; e.goal = null; e.leaving = null;
  flow(async () => {
    G.foe = e; G.itemsUsed = 0;
    e.skipNext = null; e.trapped = 0; e.flash = 0;
    clearBattleOnly(G.player); clearBattleOnly(e);
    Audio8.sfx('encounter');
    Audio8.music(e.isBoss ? 'boss' : 'battle');

    const tr = $('trans');
    tr.className = ''; void tr.offsetWidth; tr.className = 'battle';
    await pause(1000);

    G.screen = 'battle';
    $('battle').style.backgroundImage = `url(${battleBg(AREAS[G.f.area].theme)})`;
    $('enemySprite').className = 'sprite';
    $('playerSprite').className = 'sprite';
    $('enemySprite').querySelector('img').src = DATA['mb_' + e.key];
    $('playerSprite').querySelector('img').src = DATA['hb_' + G.player.weapon];
    showScreen(); renderBattle();
    anim($('enemySprite'), 'a-enter', 500);
    anim($('playerSprite'), 'a-enterL', 500);
    tr.className = 'fadeOut'; await pause(260); tr.className = '';

    const n = e.name;
    if (how === 'sneak') await say(`You crept up on the sleeping ${n}!\nYour first hit will be a WAKE-UP BLOW!`, 'good');
    else if (how === 'ambush') await say(e.isBoss ? `The ${n} charged straight into you!` : `A wild ${n} attacked!`, 'warn');
    else await say(e.isBoss ? `You engaged the ${n}!` : `You attacked a wild ${n}!`);

    if (e.isBoss && !e.roared && !e.sleeping) {
      e.roared = true;
      anim($('enemySprite'), 'a-shake', 400); Audio8.sfx('roar');
      await say(`The ${n} let out a mighty ROAR!`, 'warn');
      const msg = applyStatus(G.player, 'roar', e);
      if (msg) { renderBattle(); await say(msg, 'bad'); }
    }
    return 'main';
  });
}

/* PHASE 1: ITEMS. "No effect" uses are refused and NOT consumed or counted. */
export function useItemBattle(key) {
  if (!G || G.itemsUsed >= CONFIG.MAX_ITEMS_PER_TURN || G.inventory[key] <= 0) return;
  flow(async () => {
    const p = G.player, m = G.foe, it = ITEMS[key];
    const lock = blockedBy(p, 'item');
    let why = null;
    if (lock) why = `HUNTER can't use items right now!\n(${lock.name})`;
    else if (key === 'potion' && p.hp >= p.maxHp) why = "It won't have any effect.";
    else if (key === 'whetstone' && p.sharp >= CONFIG.SHARP_MAX) why = 'Your blade is already sharp.';
    else if ((key === 'nullberry' || key === 'antidote') && !curable(p, key)) why = "It won't have any effect.";
    else if (BOSS_ONLY.includes(key) && !m.isBoss) why = `That won't work on a small monster\nlike the ${m.name}.`;
    else if (key === 'shock' && m.trapped > 0) why = `The ${m.name} is already trapped!`;
    else if (key === 'shock' && m.sleeping) why = "It's asleep... the trap won't trigger.\nTry TRANQ BOMBs if it's weak!";
    if (why) { await say(why, 'dim'); return lock ? 'main' : 'bag'; }

    G.inventory[key]--; G.itemsUsed++;
    Audio8.sfx('item');
    await say(`HUNTER used a ${it.name}!`);

    switch (key) {
      case 'potion': {
        const before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + 30);
        addLog(`[potion +${p.hp - before} → HP ${p.hp}/${p.maxHp}]`, 'dim');
        Audio8.sfx('heal'); renderBattle();
        await say("HUNTER's HP was restored!", 'good');
        break;
      }
      case 'whetstone':
        p.sharp = CONFIG.SHARP_MAX; Audio8.sfx('sharpen'); renderBattle();
        await say('The blade is razor-sharp again!', 'good');
        break;
      case 'nullberry':
      case 'antidote': {
        const cured = cureStatuses(p, key);
        Audio8.sfx('heal'); renderBattle();
        await say(`HUNTER was cured of ${cured.join(' & ')}!`, 'good');
        break;
      }
      case 'paintball':
        G.paint = 8; renderBattle();
        await say(`The ${m.name} was marked!\nThe MAP will track it for a while.`, 'good');
        break;
      case 'flash':
        m.flash = 2; Audio8.sfx('flash'); anim($('flashFx'), 'flashing', 700); renderBattle();
        await say(`The ${m.name} is blinded!\nIts attacks will often miss!`, 'good');
        break;
      case 'might':
        p.buffs.might = 3; renderBattle();
        await say("HUNTER's ATTACK rose!", 'good');
        break;
      case 'shock': {
        const turns = m.trapCount === 0 ? CONFIG.TRAP_TURNS_FIRST : CONFIG.TRAP_TURNS_AFTER;
        m.trapCount++; m.trapped = turns;
        addLog(`[shock trap ${turns} turns (trap #${m.trapCount})]`, 'dim');
        Audio8.sfx('trap'); anim($('flashFx'), 'flashing', 700); renderBattle();
        await say(`The ${m.name} stepped into the SHOCK TRAP!\nIt's paralyzed!`, 'good');
        if (m.hp / m.maxHp <= CONFIG.CAPTURE_PCT) await say('Now! Throw TRANQ BOMBs to capture it!', 'warn');
        break;
      }
      case 'tranq': {
        Audio8.sfx('tranq');
        const held = m.trapped > 0 || m.sleeping, weak = m.hp / m.maxHp <= CONFIG.CAPTURE_PCT;
        if (!held) await say('The TRANQ BOMB had no effect!\nThe monster must be TRAPPED or ASLEEP.', 'bad');
        else if (!weak) await say(`The ${m.name} shrugged off the gas!\nIt's still too strong to capture.`, 'bad');
        else {
          m.tranq++; renderBattle();
          addLog(`[tranq ${m.tranq}/${CONFIG.TRANQ_NEEDED}]`, 'dim');
          if (m.tranq >= CONFIG.TRANQ_NEEDED) m.captured = true;
          else await say(`The ${m.name} is getting drowsy...`, 'good');
        }
        break;
      }
    }
    if (m.captured) { await captureWin(); return; }
    return G.itemsUsed < CONFIG.MAX_ITEMS_PER_TURN ? 'bag' : 'main';
  });
}