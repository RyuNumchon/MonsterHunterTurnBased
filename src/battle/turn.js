/* Turn controller: strict order  Action (2) -> Hit Calc (3) -> Monster (4) -> end-of-turn ticks.
   Also owns move selection and the YES/NO confirmation prompts (actions confirm, items don't). */
import { CONFIG, CHARGE_MULT } from '../core/config.js';
import { $, rand, randInt, pick, clamp } from '../core/utils.js';
import { G, UI } from '../core/state.js';
import { WEAPONS, getSharp, isAttack } from '../data/weapons.js';
import { PARTS } from '../data/monsters.js';
import { NEST, neighbors } from '../data/world.js';
import { Audio8 } from '../audio/audio8.js';
import { flow, say, pause } from '../ui/dialog.js';
import { renderBattle, setMode } from '../ui/hud.js';
import { anim, pop, addLog, setPhase } from '../ui/fx.js';
import { checkFaint, foeDefeated, returnToField } from './endings.js';

/* ---------- Moves ---------- */
export function findMove(id) { return G ? WEAPONS[G.player.weapon].moves.find(m => m.id === id) || null : null; }

export function moveDisabled(mv) {
  const p = G.player;
  if (mv.type === 'charge' && p.charge >= 2) return true;                       // Lv2 is the max you can hold
  if ((mv.type === 'counter' || mv.type === 'finisher') && p.spirit < 1) return true;
  return false;
}

/* HIT CHANCES
   acc     = move.acc + sharp.hit + (trapped ? 25 : 0)
   PartHit = clamp(part.baseHit + acc, 5, 98)
   Overall = max(PartHit, clamp(90 + acc, 5, 99))
   One roll R: R < PartHit = clean hit | R < Overall = DRIFT to an adjacent part | else miss */
export function hitChances(move, partKey, sharpLv = getSharp(G.player.sharp)) {
  const m = G.foe;
  const acc = (move.acc || 0) + sharpLv.hit + (m && m.trapped > 0 ? CONFIG.TRAP_HIT_BONUS : 0);
  const target = clamp(PARTS[partKey].baseHit + acc, 5, 98);
  return { target, overall: Math.max(target, clamp(CONFIG.OVERALL_HIT + acc, 5, 99)) };
}

/* ---------- Confirmation prompts ---------- */
export function pickMove(id) {
  const mv = findMove(id), p = G.player;
  if (!mv || moveDisabled(mv)) return;
  Audio8.sfx('select');
  if (isAttack(mv)) { setMode('target', { moveId: id }); return; }   // attacks ask for a body part first
  const drop = p.charge > 0 && mv.type !== 'charge' ? '<br>Your held charge will be lost!' : '';
  if (mv.type === 'charge') setMode('confirm', { q: `Charge the ${WEAPONS[p.weapon].name}?`,
    sub: `Lv${p.charge} -> Lv${p.charge + 1} held. A HEAVY hit may break it (30%).`,
    action: { kind: 'move', moveId: id }, back: 'fight' });
  else if (mv.type === 'guard') setMode('confirm', { q: 'Raise your GUARD?',
    sub: `Take only 40% damage this turn.${drop}`, action: { kind: 'move', moveId: id }, back: 'fight' });
}

export function confirmAttack(moveId, part) {
  const mv = findMove(moveId), p = G.player, m = G.foe;
  let name = mv.name;
  if (mv.type === 'release')  name += ` Lv${p.charge + 1} (${CHARGE_MULT[p.charge]}x)`;
  if (mv.type === 'finisher') name += ` (x${1 + 0.5 * p.spirit})`;
  let sub;
  if (m.sleeping) sub = 'SNEAK ATTACK: 100% HIT · WAKE-UP x2';
  else {
    const c = hitChances(mv, part);
    sub = `HIT ${c.target}% · DRIFT ${c.overall - c.target}% (to ${PARTS[part].drift.map(d => PARTS[d].label).join('/')}) · MISS ${100 - c.overall}%`;
    if (m.trapped > 0) sub += ' (TRAPPED +25)';
  }
  if (p.charge > 0 && mv.type !== 'release') sub += '<br>Your held charge will be lost!';
  if (getSharp(p.sharp).bounce) sub += '<br>WARNING: RED edge, the attack will BOUNCE!';
  Audio8.sfx('select');
  setMode('confirm', { q: `Use ${name}<br>on the ${PARTS[part].label}?`, sub,
    action: { kind: 'move', moveId, target: part }, back: 'target', backData: { moveId } });
}

export function confirmRun() {
  const m = G.foe, sure = m.trapped > 0 || m.sleeping || !!m.skipNext;
  Audio8.sfx('select');
  setMode('confirm', { q: `Retreat from the ${m.name}?`,
    sub: sure ? "It can't chase you right now: 100% escape." : `${Math.round(CONFIG.ESCAPE_CHANCE * 100)}% chance. A failed escape costs your turn.`,
    action: { kind: 'run' }, back: 'main' });
}

export function goBack() {
  if (!G || G.busy || G.screen !== 'battle') return;
  const backs = { fight: 'main', target: 'fight', bag: 'main' };
  if (UI.mode === 'confirm') { Audio8.sfx('back'); setMode(UI.data.back, UI.data.backData || {}); }
  else if (backs[UI.mode]) { Audio8.sfx('back'); setMode(backs[UI.mode]); }
}

/* ---------- Turn controller (triggered by YES) ---------- */
export function runTurn(action) {
  flow(async () => {
    const m = G.foe;
    setPhase(2);
    if (action.kind === 'run') {
      if (await tryEscape()) return;
    } else {
      const intent = await playerActionPhase(action);
      setPhase(3);
      if (intent) await hitCalculationPhase(intent);
      if (G.over || G.screen !== 'battle') return;
      if (m.hp <= 0) { await foeDefeated(); return; }
    }
    setPhase(4);
    await monsterActionPhase();
    if (G.over || G.screen !== 'battle') return;
    await endOfTurnTicks();
    return 'main';
  });
}

/* PHASE 2 — returns an "intent" for attacks; charge / guard resolve here. */
async function playerActionPhase(action) {
  const p = G.player, w = WEAPONS[p.weapon], move = findMove(action.moveId);
  if (p.charge > 0 && move.type !== 'charge' && move.type !== 'release') {
    p.charge = 0; renderBattle();
    await say("HUNTER's held charge faded away.", 'warn');
  }
  if (move.type === 'charge') {
    p.charge = Math.min(2, p.charge + 1);
    Audio8.sfx('charge'); renderBattle();
    await say(`HUNTER is charging the ${w.name}!\n(Lv${p.charge} held: next release ${CHARGE_MULT[p.charge]}x)`);
    return null;
  }
  if (move.type === 'guard') {
    p.guarding = true; p.sharp = Math.max(0, p.sharp - move.sharp);
    Audio8.sfx('clang'); renderBattle();
    await say('HUNTER raised the blade to GUARD!');
    return null;
  }
  const sharpLv = getSharp(p.sharp);          // sharpness BEFORE this swing
  p.sharp = Math.max(0, p.sharp - move.sharp);
  let chargeMult = 1, label = move.name;
  if (move.type === 'release') { chargeMult = CHARGE_MULT[p.charge]; label = `${move.name} Lv${p.charge + 1}`; p.charge = 0; }
  if (move.type === 'finisher') { chargeMult = 1 + 0.5 * p.spirit; p.spirit = 0; }   // power × (1 + 0.5 × spirit)
  if (move.type === 'counter') { p.foresight = true; p.spirit = Math.max(0, p.spirit - 1); }
  if (move.spirit) p.spirit = Math.min(3, p.spirit + move.spirit);
  renderBattle();
  anim($('playerSprite'), 'a-lunge', 350); Audio8.sfx('swoosh');
  await say(`HUNTER used ${label}!`);
  return { move, label, power: move.power, chargeMult, sharpLv, target: action.target };
}

/* PHASE 3 — HIT CALCULATION
   DAMAGE = power × partMult × sharpMult × might × charge × wake × crack × variance(0.9–1.1) */
async function hitCalculationPhase(intent) {
  const p = G.player, m = G.foe, { target, sharpLv } = intent, wake = m.sleeping;
  let hitPart = null, drifted = false;
  if (wake) { hitPart = target; addLog('[sleeping target: guaranteed hit]', 'dim'); }
  else {
    const c = hitChances(intent.move, target, sharpLv), roll = Math.random() * 100;
    addLog(`[roll ${roll.toFixed(1)} | ${PARTS[target].label} <${c.target} | drift <${c.overall} | miss >=${c.overall}]`, 'dim');
    if (roll < c.target) hitPart = target;
    else if (roll < c.overall) { hitPart = pick(PARTS[target].drift); drifted = true; }
  }
  if (!hitPart) { Audio8.sfx('miss'); await say("HUNTER's attack missed!", 'bad'); return; }
  if (drifted) await say(`The swing drifted off the ${PARTS[target].label}...\nand struck the ${PARTS[hitPart].label}!`, 'warn');

  const part = m.parts[hitPart], pdef = PARTS[hitPart];
  const mightM = p.buffs.might > 0 ? CONFIG.MIGHT_MULT : 1;
  const wakeM  = wake ? CONFIG.WAKE_MULT : 1;
  const crackM = m.armorCracked ? CONFIG.BODY_CRACK_MULT : 1;
  const variance = rand(0.9, 1.1);
  const dmg = Math.max(1, Math.round(intent.power * pdef.dmgMult * sharpLv.dmg * mightM * intent.chargeMult * wakeM * crackM * variance));
  addLog(`[DMG ${intent.power} x part ${pdef.dmgMult} x sharp ${sharpLv.dmg} x might ${mightM} x charge ${intent.chargeMult} x wake ${wakeM} x crack ${crackM} x var ${variance.toFixed(2)} = ${dmg}]`, 'dim');

  m.hp = Math.max(0, m.hp - dmg);
  part.hp = Math.max(0, part.hp - dmg);
  const big = wake || intent.chargeMult >= 2 || (hitPart === 'head' && !drifted);
  Audio8.sfx(sharpLv.bounce ? 'clang' : big ? 'crit' : 'hit');
  anim($('enemySprite'), 'a-hit', 500); pop($('enemySprite'), `-${dmg}`); renderBattle();
  await say(`The ${m.name}'s ${pdef.label} took ${dmg} damage!`);
  if (wake) await say('A WAKE-UP BLOW! Damage x2!', 'good');
  else if (hitPart === 'head' && !drifted) await say('It hit a weak spot!', 'good');
  if (intent.chargeMult >= 3) await say(`A full-power charge! x${intent.chargeMult}!`, 'good');

  // Red sharpness: bounce (half damage already applied) + recoil. A killing blow can't faint you.
  if (sharpLv.bounce) {
    const recoil = Math.round(p.maxHp * CONFIG.BOUNCE_RECOIL_PCT);
    p.hp = Math.max(m.hp <= 0 ? 1 : 0, p.hp - recoil);
    anim($('playerSprite'), 'a-shake', 400); pop($('playerSprite'), `-${recoil}`); renderBattle();
    await say(`The dull blade BOUNCED off!\nHalf damage, and ${recoil} recoil to HUNTER!`, 'bad');
  }
  if (wake && m.hp > 0) { m.sleeping = false; renderBattle(); Audio8.sfx('roar'); await say(`The ${m.name} woke up in a rage!`, 'warn'); }
  if (m.isBoss && !part.broken && part.hp <= 0) { part.broken = true; await applyBreak(hitPart); }
  if (m.isBoss && m.hp > 0 && m.hp / m.maxHp <= CONFIG.CAPTURE_PCT && !m.warnedCap) {
    m.warnedCap = true; renderBattle();
    await say(`The ${m.name} looks exhausted...\nIt can be CAPTURED now!`, 'warn');
  }
  if (m.hp > 0) await checkFaint();
}

async function applyBreak(k) {
  const m = G.foe;
  Audio8.sfx('breakp'); anim($('enemySprite'), 'a-shake', 400); renderBattle();
  switch (k) {
    case 'head': m.skipNext = 'is reeling from its broken head';
      await say(`The ${m.name}'s HEAD was broken!\nIt's staggered!`, 'good'); break;
    case 'body': m.armorCracked = true;
      await say(`The ${m.name}'s armor CRACKED!\nAll damage +10%!`, 'good'); break;
    case 'legs': m.skipNext = 'tripped over its broken legs';
      await say(`The ${m.name}'s LEGS were broken!\nIt's about to trip!`, 'good'); break;
    case 'tail': m.atkMult *= CONFIG.TAIL_ATK_MULT;
      await say(`The ${m.name}'s TAIL was severed!\nIts ATTACK fell! (x${m.atkMult.toFixed(2)})`, 'good'); break;
  }
  renderBattle();
}

/* PHASE 4 — MONSTER AI
   Order: trapped -> asleep -> stunned -> flee check (boss only) -> attack
   Flee: below 25% HP 40% once per hunt (limps to the NEST); after 4–6 battle turns 50%/turn
   Monster DMG = power × atkMult (tail) × variance(0.9–1.1) × (guard ? 0.4 : 1) */
async function monsterActionPhase() {
  const m = G.foe, p = G.player;
  if (m.trapped > 0) {
    m.trapped--; renderBattle(); Audio8.sfx('trap');
    await say(`The ${m.name} is stuck in the SHOCK TRAP!${m.trapped > 0 ? `\n(${m.trapped} turn${m.trapped > 1 ? 's' : ''} left)` : ''}`, 'good');
    if (m.trapped === 0) { renderBattle(); await say(`The ${m.name} broke free of the trap!`, 'warn'); }
    return;
  }
  if (m.sleeping) { await say(`The ${m.name} is fast asleep.`, 'dim'); return; }
  m.turnsInArea++;
  if (m.skipNext) {
    const why = m.skipNext; m.skipNext = null; renderBattle();
    await say(`The ${m.name} ${why}\nand can't move!`, 'good');
    return;
  }
  if (m.isBoss) {
    if (m.hp / m.maxHp < CONFIG.LOW_HP_FLEE && !m.lowHpFled && Math.random() < CONFIG.LOW_HP_FLEE_CHANCE) {
      m.lowHpFled = true; await monsterFlee(true); return;
    }
    if (m.turnsInArea >= m.fleeAt && Math.random() < CONFIG.FLEE_CHANCE) { await monsterFlee(false); return; }
  }
  const atk = pick(m.attacks);
  anim($('enemySprite'), 'a-elunge', 350); Audio8.sfx('swoosh');
  await say(`The ${m.name} used ${atk.name}!`);
  if (p.foresight) { Audio8.sfx('miss'); await say("HUNTER's FORESIGHT SLASH evaded it!", 'good'); return; }

  const hitChance = m.flash > 0 ? CONFIG.MONSTER_HIT_FLASHED : CONFIG.MONSTER_HIT, roll = Math.random() * 100;
  addLog(`[monster roll ${roll.toFixed(1)} vs ${hitChance}%]`, 'dim');
  if (roll >= hitChance) {
    Audio8.sfx('miss');
    await say(m.flash > 0 ? `The blinded ${m.name} missed wildly!` : 'HUNTER dodged! The attack missed!', 'good');
    return;
  }
  let dmg = atk.power * m.atkMult * rand(0.9, 1.1);
  if (p.guarding) dmg *= CONFIG.GUARD_TAKEN;
  dmg = Math.max(1, Math.round(dmg));
  p.hp = Math.max(0, p.hp - dmg);
  Audio8.sfx(p.guarding ? 'clang' : 'hurt');
  anim($('playerSprite'), 'a-shake', 400); pop($('playerSprite'), `-${dmg}`); renderBattle();
  await say(`HUNTER took ${dmg} damage!${p.guarding ? ' (GUARDED)' : ''}${atk.heavy ? '\nIt was a HEAVY blow!' : ''}`, 'bad');

  // Charge interruption: a HEAVY hit has a 30% chance to break a held charge
  if (p.charge > 0 && atk.heavy && p.hp > 0) {
    if (Math.random() < CONFIG.HEAVY_INTERRUPT_CHANCE) { p.charge = 0; renderBattle(); await say('The impact knocked HUNTER out of the charge!', 'bad'); }
    else await say('HUNTER held the charge through the blow!', 'good');
  }
  await checkFaint();
}

async function monsterFlee(limping) {
  const m = G.foe;
  if (limping) await say(`The ${m.name} is limping...`, 'warn');
  const dest = limping && m.area !== NEST ? NEST : pick(neighbors(m.area).filter(a => a !== 0));
  Audio8.sfx('swoosh'); $('enemySprite').classList.add('a-flee');
  await pause(650);
  Object.assign(m, { area: dest, posArea: null, turnsInArea: 0, roamTimer: 0, restTurns: 0, sleeping: false,
                     fleeAt: randInt(CONFIG.FLEE_MIN, CONFIG.FLEE_MAX) });
  await say(G.paint > 0
    ? `The ${m.name} fled to AREA ${dest}!\nThe paintball marks its trail.`
    : `The ${m.name} fled!\nWithout a paintball you'll have to search...`, 'warn');
  await returnToField(800);
}

async function tryEscape() {
  const m = G.foe, sure = m.trapped > 0 || m.sleeping || !!m.skipNext;
  if (sure || Math.random() < CONFIG.ESCAPE_CHANCE) {
    Audio8.sfx('area');
    await say('HUNTER got away safely!', 'good');
    G.turn++;
    await returnToField(CONFIG.GRACE_MS);
    return true;
  }
  await say(`Couldn't escape!\nThe ${m.name} blocks the way!`, 'bad');
  return false;
}

async function endOfTurnTicks() {
  const p = G.player, m = G.foe;
  p.guarding = false; p.foresight = false;
  G.turn++; G.itemsUsed = 0;                    // item allowance resets every turn
  if (G.paint > 0 && --G.paint === 0) { renderBattle(); await say('The paintball scent faded...', 'warn'); }
  if (m.flash > 0 && --m.flash === 0) { renderBattle(); await say(`The ${m.name} can see again!`, 'warn'); }
  if (p.buffs.might > 0 && --p.buffs.might === 0) { renderBattle(); await say('The MIGHT SEED wore off.', 'warn'); }
  renderBattle();
}