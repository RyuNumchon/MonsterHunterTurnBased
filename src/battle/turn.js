/* Turn controller.
   Each turn the faster side acts first (speed roll, see battle/speed.js), then the other,
   then end-of-turn ticks. GUARD / FORESIGHT have priority; RUN and WAIT resolve first.
   Phase pills: 2 ACTION + 3 HIT CALC for the hunter, 4 MONSTER for the monster. */
import { CONFIG, CHARGE_MULT } from '../core/config.js';
import { $, rand, randInt, pick, clamp } from '../core/utils.js';
import { G, UI } from '../core/state.js';
import { WEAPONS, getSharp, isAttack } from '../data/weapons.js';
import { PARTS } from '../data/monsters.js';
import { STATUS } from '../data/status.js';
import { NEST, neighbors } from '../data/world.js';
import { Audio8 } from '../audio/audio8.js';
import { flow, say, pause } from '../ui/dialog.js';
import { renderBattle, setMode } from '../ui/hud.js';
import { anim, pop, addLog, setPhase } from '../ui/fx.js';
import { checkFaint, foeDefeated, returnToField } from './endings.js';
import { applyStatus, blockedBy, defMult, atkMult, accMod, elementSealed, stunOnHit, tickStatuses } from './status.js';
import { speedOf, speedHitMod, firstChance } from './speed.js';

/* ---------- Moves ---------- */
export function findMove(id) { return G ? WEAPONS[G.player.weapon].moves.find(m => m.id === id) || null : null; }

export function moveDisabled(mv) {
  const p = G.player;
  if (blockedBy(p, 'act')) return true;
  if (isAttack(mv) && blockedBy(p, 'attack')) return true;
  if (mv.type === 'charge' && p.charge >= 2) return true;
  if ((mv.type === 'counter' || mv.type === 'finisher') && p.spirit < 1) return true;
  return false;
}

/** The monster can't act this turn (so the hunter effectively goes first and escape is sure). */
const foeHeld = m => m.trapped > 0 || m.sleeping || !!m.skipNext || !!blockedBy(m, 'act');

/* HUNTER HIT CHANCES
   acc     = move.acc + sharp.hit + statuses (water −20) + speed mod (±15) + (trapped ? 25 : 0)
   PartHit = clamp(part.baseHit + acc, 5, 98);  Overall = max(PartHit, clamp(90 + acc, 5, 99))
   Roll R: R < PartHit = clean hit | R < Overall = DRIFT to an adjacent part | else miss */
export function hitChances(move, partKey, sharpLv = getSharp(G.player.sharp)) {
  const m = G.foe, p = G.player;
  const acc = (move.acc || 0) + sharpLv.hit + accMod(p) + speedHitMod(p, m) + (m.trapped > 0 ? CONFIG.TRAP_HIT_BONUS : 0);
  const target = clamp(PARTS[partKey].baseHit + acc, 5, 98);
  return { target, overall: Math.max(target, clamp(CONFIG.OVERALL_HIT + acc, 5, 99)) };
}

/** Monster accuracy: 60% (30% blinded) + its accuracy effects + speed mod. */
export function monsterHitChance(m, p) {
  const base = m.flash > 0 ? CONFIG.MONSTER_HIT_FLASHED : CONFIG.MONSTER_HIT;
  return clamp(base + accMod(m) + speedHitMod(m, p), 5, 95);
}

const escapeChance = () => clamp(CONFIG.ESCAPE_CHANCE + (speedOf(G.player) - speedOf(G.foe)) * CONFIG.SPEED_ESCAPE_FACTOR, .2, .95);

/** % chance the hunter acts first with this move. */
export function firstPct(mv) {
  if (!mv || mv.priority || foeHeld(G.foe)) return 100;
  return Math.round(firstChance(G.player, G.foe) * 100);
}

/* ---------- Confirmation prompts ---------- */
export function pickMove(id) {
  const mv = findMove(id), p = G.player;
  if (!mv || moveDisabled(mv)) return;
  Audio8.sfx('select');
  if (isAttack(mv)) { setMode('target', { moveId: id }); return; }
  const drop = p.charge > 0 && mv.type !== 'charge' ? '<br>Your held charge will be lost!' : '';
  if (mv.type === 'charge') setMode('confirm', { q: `Charge the ${WEAPONS[p.weapon].name}?`,
    sub: `Lv${p.charge} -> Lv${p.charge + 1} held. A HEAVY hit may break it (30%).`,
    action: { kind: 'move', moveId: id }, back: 'fight' });
  else if (mv.type === 'guard') setMode('confirm', { q: 'Raise your GUARD?',
    sub: `Take only 40% damage this turn. GUARD always goes first.${drop}`, action: { kind: 'move', moveId: id }, back: 'fight' });
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
  sub += `<br>FIRST ${firstPct(mv)}% · SPD ${speedOf(p)} vs ${speedOf(m)}`;
  if (p.charge > 0 && mv.type !== 'release') sub += '<br>Your held charge will be lost!';
  if (getSharp(p.sharp).bounce) sub += '<br>WARNING: RED edge, the attack will BOUNCE!';
  Audio8.sfx('select');
  setMode('confirm', { q: `Use ${name}<br>on the ${PARTS[part].label}?`, sub,
    action: { kind: 'move', moveId, target: part }, back: 'target', backData: { moveId } });
}

export function confirmRun() {
  const m = G.foe;
  if (blockedBy(G.player, 'act')) return;
  Audio8.sfx('select');
  setMode('confirm', { q: `Retreat from the ${m.name}?`,
    sub: foeHeld(m) ? "It can't chase you right now: 100% escape."
      : `${Math.round(escapeChance() * 100)}% chance (SPD ${speedOf(G.player)} vs ${speedOf(m)}). A failed escape costs your turn.`,
    action: { kind: 'run' }, back: 'main' });
}

export function confirmWait() {
  const why = blockedBy(G.player, 'act');
  Audio8.sfx('select');
  setMode('confirm', {
    q: why ? `HUNTER can't move! (${why.name})<br>Let the turn pass?` : 'Wait and watch this turn?',
    sub: 'The monster still takes its turn.', action: { kind: 'wait' }, back: UI.mode === 'fight' ? 'fight' : 'main' });
}

export function goBack() {
  if (!G || G.busy || G.screen !== 'battle') return;
  const backs = { fight: 'main', target: 'fight', bag: 'main' };
  if (UI.mode === 'confirm') { Audio8.sfx('back'); setMode(UI.data.back, UI.data.backData || {}); }
  else if (backs[UI.mode]) { Audio8.sfx('back'); setMode(backs[UI.mode]); }
}

/* ---------- Turn controller (triggered by YES) ---------- */
const ended = () => G.over || G.screen !== 'battle';

function hunterFirst(action) {
  if (action.kind !== 'move') return true;              // RUN / WAIT resolve first
  const mv = findMove(action.moveId);
  if (mv.priority || foeHeld(G.foe)) return true;       // GUARD / FORESIGHT, or the monster can't act
  return Math.random() < firstChance(G.player, G.foe);
}

export function runTurn(action) {
  flow(async () => {
    const m = G.foe, p = G.player;
    const first = hunterFirst(action);
    addLog(`[order: ${first ? 'HUNTER' : m.name} first · SPD ${speedOf(p)} vs ${speedOf(m)}]`, 'dim');

    if (!first) {
      setPhase(4);
      await say(`The ${m.name} is quicker!`, 'warn');
      await monsterTurn(m);
      if (ended()) return;
    }

    if (action.kind === 'run') {
      setPhase(2);
      if (await tryEscape()) return;
      p.acted = true;
    } else {
      await hunterTurn(action);
      if (ended()) return;
      if (m.hp <= 0) { await foeDefeated(); return; }
    }

    if (first) {
      setPhase(4);
      await monsterTurn(m);
      if (ended()) return;
    }

    await endOfTurnTicks();
    if (ended()) return;
    if (m.hp <= 0) { await foeDefeated(); return; }   // e.g. poisoned to death
    return 'main';
  });
}

/** The hunter's half of the turn. Re-checks locks: a faster monster may have stunned or toppled the hunter. */
async function hunterTurn(action) {
  const p = G.player;
  setPhase(2);
  if (action.kind === 'wait') {
    const why = blockedBy(p, 'act');
    await say(why ? `HUNTER can't move! (${why.name})` : 'HUNTER waits and watches...', 'dim');
  } else {
    const mv = findMove(action.moveId);
    const lock = blockedBy(p, 'act') || (isAttack(mv) ? blockedBy(p, 'attack') : null);
    if (lock) await say(`HUNTER can't ${(lock.blocks || []).includes('act') ? 'move' : 'attack'}! (${lock.name})`, 'bad');
    else {
      const intent = await playerActionPhase(action);
      setPhase(3);
      if (intent) await hitCalculationPhase(intent);
    }
  }
  p.acted = true;   // effects landing on the hunter from now on start next turn
}

async function monsterTurn(m) {
  await monsterActionPhase();
  m.acted = true;
}

/* PHASE 2: returns an "intent" for attacks; charge / guard resolve here.
   Sharpness is spent in phase 3, and only if the attack connects. */
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
    p.guarding = true; p.sharp = Math.max(0, p.sharp - move.sharp);   // blocking wears the edge
    Audio8.sfx('clang'); renderBattle();
    await say('HUNTER raised the blade to GUARD!');
    return null;
  }
  const sharpLv = getSharp(p.sharp);
  let chargeMult = 1, label = move.name;
  if (move.type === 'release') { chargeMult = CHARGE_MULT[p.charge]; label = `${move.name} Lv${p.charge + 1}`; p.charge = 0; }
  if (move.type === 'finisher') { chargeMult = 1 + 0.5 * p.spirit; p.spirit = 0; }
  if (move.type === 'counter') { p.foresight = true; p.spirit = Math.max(0, p.spirit - 1); }
  if (move.spirit) p.spirit = Math.min(3, p.spirit + move.spirit);
  renderBattle();
  anim($('playerSprite'), 'a-lunge', 350); Audio8.sfx('swoosh');
  await say(`HUNTER used ${label}!`);
  return { move, label, power: move.power, chargeMult, sharpLv, target: action.target };
}

/* PHASE 3: HIT CALCULATION
   DAMAGE = power × partMult × sharpMult × might × charge × wake × crack × variance(0.9–1.1)
            × hunter atkMult (dragon 0.8) × monster defMult (fire 1.15, bleed 1.3)
            + weapon element power (unless Dragonblighted) */
async function hitCalculationPhase(intent) {
  const p = G.player, m = G.foe, w = WEAPONS[p.weapon], { target, sharpLv } = intent, wake = m.sleeping;
  let hitPart = null, drifted = false;
  if (wake) { hitPart = target; addLog('[sleeping target: guaranteed hit]', 'dim'); }
  else {
    const c = hitChances(intent.move, target, sharpLv), roll = Math.random() * 100;
    addLog(`[roll ${roll.toFixed(1)} | ${PARTS[target].label} <${c.target} | drift <${c.overall} | miss >=${c.overall}]`, 'dim');
    if (roll < c.target) hitPart = target;
    else if (roll < c.overall) { hitPart = pick(PARTS[target].drift); drifted = true; }
  }
  if (!hitPart) { Audio8.sfx('miss'); await say("HUNTER's attack missed!", 'bad'); return; }   // a miss costs no sharpness
  p.sharp = Math.max(0, p.sharp - intent.move.sharp);
  if (drifted) await say(`The swing drifted off the ${PARTS[target].label}...\nand struck the ${PARTS[hitPart].label}!`, 'warn');

  const part = m.parts[hitPart], pdef = PARTS[hitPart];
  const mightM = p.buffs.might > 0 ? CONFIG.MIGHT_MULT : 1;
  const wakeM  = wake ? CONFIG.WAKE_MULT : 1;
  const crackM = m.armorCracked ? CONFIG.BODY_CRACK_MULT : 1;
  const atkM = atkMult(p), defM = defMult(m), variance = rand(0.9, 1.1);
  const elem = w.element && !elementSealed(p) ? w.element : null;
  const elemDmg = elem ? (w.elemPower || 0) : 0;
  const dmg = Math.max(1, Math.round(
    intent.power * pdef.dmgMult * sharpLv.dmg * mightM * intent.chargeMult * wakeM * crackM * variance * atkM * defM + elemDmg));
  addLog(`[DMG ${intent.power} x part ${pdef.dmgMult} x sharp ${sharpLv.dmg} x might ${mightM} x charge ${intent.chargeMult} x wake ${wakeM} x crack ${crackM} x var ${variance.toFixed(2)} x atk ${atkM.toFixed(2)} x def ${defM.toFixed(2)} + elem ${elemDmg} = ${dmg}]`, 'dim');

  m.hp = Math.max(0, m.hp - dmg);
  part.hp = Math.max(0, part.hp - dmg);
  const big = wake || intent.chargeMult >= 2 || (hitPart === 'head' && !drifted);
  Audio8.sfx(sharpLv.bounce ? 'clang' : big ? 'crit' : 'hit');
  anim($('enemySprite'), 'a-hit', 500); pop($('enemySprite'), `-${dmg}`); renderBattle();
  await say(`The ${m.name}'s ${pdef.label} took ${dmg} damage!`);
  if (wake) await say('A WAKE-UP BLOW! Damage x2!', 'good');
  else if (hitPart === 'head' && !drifted) await say('It hit a weak spot!', 'good');
  if (intent.chargeMult >= 3) await say(`A full-power charge! x${intent.chargeMult}!`, 'good');
  if (w.element && elementSealed(p)) await say(`Dragonblight sealed the ${STATUS[w.element].name} element!`, 'warn');

  // Weapon element can inflict its status (no weapon has one yet)
  if (elem && m.hp > 0 && Math.random() < (w.elemChance || 0)) {
    const msg = applyStatus(m, elem, p);
    if (msg) { renderBattle(); await say(msg, 'good'); }
  }
  // Stun (KO) on monsters: BLUNT weapons only. Every demo weapon cuts, so this stays dormant.
  // Thunderblight on the monster raises the minimum chance through stunChance().
  if (m.hp > 0 && w.dmgType === 'blunt') {
    const s = stunOnHit(m, hitPart === 'head' ? CONFIG.KO_BUILD_HEAD : CONFIG.KO_BUILD);
    if (s) { renderBattle(); await say(s, 'good'); }
  }

  if (sharpLv.bounce) {
    const recoil = Math.round(p.maxHp * CONFIG.BOUNCE_RECOIL_PCT);
    p.hp = Math.max(m.hp <= 0 ? 1 : 0, p.hp - recoil);
    anim($('playerSprite'), 'a-shake', 400); pop($('playerSprite'), `-${recoil}`); renderBattle();
    await say(`The dull blade BOUNCED off!\nHalf damage, and ${recoil} recoil to HUNTER!`, 'bad');
  }
  if (wake && m.hp > 0) {
    m.sleeping = false; m.limping = false; renderBattle(); Audio8.sfx('roar');
    await say(`The ${m.name} woke up in a rage!`, 'warn');
  }
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
    case 'tail':
      m.atkMult *= CONFIG.TAIL_ATK_MULT;
      // The tail drops where the fight happened; it's placed on the map when the battle ends
      G.tailDrop = { area: G.f.area, x: m.x, y: m.y, key: m.key, name: m.name, placed: false, carved: false };
      await say(`The ${m.name}'s TAIL was severed!\nIts ATTACK fell! (x${m.atkMult.toFixed(2)})`, 'good');
      await say('The tail crashed to the ground.\nCarve it after the battle!', 'dim');
      break;
  }
  renderBattle();
}

function pickAttack(m) {
  const total = m.attacks.reduce((s, a) => s + (a.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const a of m.attacks) { r -= a.weight ?? 1; if (r < 0) return a; }
  return m.attacks[0];
}

async function inflictAll(atk, src, target, missed) {
  for (const f of atk.inflict || []) {
    if (missed && !f.aoe) continue;
    if (Math.random() >= (f.chance ?? 1)) continue;
    const msg = applyStatus(target, f.id, src);
    if (msg) { Audio8.sfx(STATUS[f.id].sfx || 'tranq'); renderBattle(); await say(msg, 'bad'); }
  }
}

/* PHASE 4: MONSTER AI
   Order: trapped -> asleep -> staggered -> can't act (status) -> flee check (boss) -> attack
   Monster DMG = power × atkMult(tail) × atkMult(status) × hunter defMult(status) × variance × (guard ? 0.4 : 1)
   HUNTER STUN: each hit in a row adds STUN_BUILD % (heavy: STUN_BUILD_HEAVY, guarding: half), capped at
   STUN_CAP. A monster turn that doesn't hit the hunter resets it. Thunderblight raises the minimum. */
async function monsterActionPhase() {
  const m = G.foe, p = G.player;
  const noHit = () => { p.stunBuild = 0; renderBattle(); };
  if (m.trapped > 0) {
    m.trapped--; renderBattle(); Audio8.sfx('trap');
    await say(`The ${m.name} is stuck in the SHOCK TRAP!${m.trapped > 0 ? `\n(${m.trapped} turn${m.trapped > 1 ? 's' : ''} left)` : ''}`, 'good');
    if (m.trapped === 0) { renderBattle(); await say(`The ${m.name} broke free of the trap!`, 'warn'); }
    return noHit();
  }
  if (m.sleeping) { await say(`The ${m.name} is fast asleep.`, 'dim'); return noHit(); }
  m.turnsInArea++;
  if (m.skipNext) {
    const why = m.skipNext; m.skipNext = null; renderBattle();
    await say(`The ${m.name} ${why}\nand can't move!`, 'good');
    return noHit();
  }
  const held = blockedBy(m, 'act');
  if (held) { await say(`The ${m.name} can't move! (${held.name})`, 'good'); return noHit(); }
  if (m.isBoss) {
    if (m.hp / m.maxHp < CONFIG.LOW_HP_FLEE && !m.lowHpFled && Math.random() < CONFIG.LOW_HP_FLEE_CHANCE) {
      m.lowHpFled = true; await monsterFlee(true); return;
    }
    if (m.turnsInArea >= m.fleeAt && Math.random() < CONFIG.FLEE_CHANCE) { await monsterFlee(false); return; }
  }

  const atk = pickAttack(m);
  if (atk.roar) {
    Audio8.sfx('roar'); anim($('enemySprite'), 'a-shake', 400);
    await say(`The ${m.name} let out a deafening ROAR!`, 'warn');
    if (p.foresight) { await say('HUNTER read it and braced through the roar!', 'good'); return noHit(); }
    const msg = applyStatus(p, 'roar', m);
    if (msg) { renderBattle(); await say(msg, 'bad'); }
    return noHit();
  }

  anim($('enemySprite'), 'a-elunge', 350); Audio8.sfx('swoosh');
  await say(`The ${m.name} used ${atk.name}!`);
  if (p.foresight) { Audio8.sfx('miss'); await say("HUNTER's FORESIGHT SLASH evaded it!", 'good'); return noHit(); }

  const hitChance = monsterHitChance(m, p), roll = Math.random() * 100;
  addLog(`[monster roll ${roll.toFixed(1)} vs ${hitChance}%]`, 'dim');
  if (roll >= hitChance) {
    Audio8.sfx('miss');
    await say(m.flash > 0 ? `The blinded ${m.name} missed wildly!` : 'HUNTER dodged! The attack missed!', 'good');
    await inflictAll(atk, m, p, true);
    return noHit();
  }
  let dmg = atk.power * m.atkMult * atkMult(m) * defMult(p) * rand(0.9, 1.1);
  if (p.guarding) dmg *= CONFIG.GUARD_TAKEN;
  dmg = Math.max(1, Math.round(dmg));
  p.hp = Math.max(0, p.hp - dmg);
  Audio8.sfx(p.guarding ? 'clang' : 'hurt');
  anim($('playerSprite'), 'a-shake', 400); pop($('playerSprite'), `-${dmg}`); renderBattle();
  await say(`HUNTER took ${dmg} damage!${p.guarding ? ' (GUARDED)' : ''}${atk.heavy ? '\nIt was a HEAVY blow!' : ''}`, 'bad');
  if (p.hp <= 0) { await checkFaint(); return; }

  await inflictAll(atk, m, p, false);

  const build = (atk.heavy ? CONFIG.STUN_BUILD_HEAVY : CONFIG.STUN_BUILD) * (p.guarding ? .5 : 1);
  const stunned = stunOnHit(p, build, CONFIG.STUN_CAP);
  if (stunned) {
    Audio8.sfx('flash'); anim($('playerSprite'), 'a-shake', 400); renderBattle();
    await say(stunned, 'bad');
    if (p.charge > 0) { p.charge = 0; renderBattle(); await say('The held charge was lost!', 'bad'); }
  } else if (p.charge > 0 && atk.heavy) {
    if (Math.random() < CONFIG.HEAVY_INTERRUPT_CHANCE) { p.charge = 0; renderBattle(); await say('The impact knocked HUNTER out of the charge!', 'bad'); }
    else await say('HUNTER held the charge through the blow!', 'good');
  }
  renderBattle();
}

async function monsterFlee(limping) {
  const m = G.foe;
  if (limping) await say(`The ${m.name} is limping...`, 'warn');
  const dest = limping && m.area !== NEST ? NEST : pick(neighbors(m.area).filter(a => a !== 0));
  Audio8.sfx('swoosh'); $('enemySprite').classList.add('a-flee');
  await pause(650);
  Object.assign(m, {
    area: dest, posArea: null, turnsInArea: 0, sleeping: false, goal: null, leaving: null,
    limping: limping || m.limping, searched: 0,              // limping -> sleeps after 3 unfound areas
    roamMs: rand(CONFIG.ROAM_MIN_MS, CONFIG.ROAM_MAX_MS), fleeAt: randInt(CONFIG.FLEE_MIN, CONFIG.FLEE_MAX)
  });
  await say(G.paint > 0
    ? `The ${m.name} fled to AREA ${dest}!\nThe paintball marks its trail.`
    : `The ${m.name} fled!\nWithout a paintball you'll have to search...`, 'warn');
  await returnToField(800);
}

async function tryEscape() {
  const m = G.foe;
  if (foeHeld(m) || Math.random() < escapeChance()) {
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
  G.turn++; G.itemsUsed = 0;
  for (const u of [p, m]) {
    for (const r of tickStatuses(u)) {
      if (r.dmg) { Audio8.sfx('hurt'); pop($(u === p ? 'playerSprite' : 'enemySprite'), `-${r.dmg}`); }
      renderBattle();
      await say(r.msg, r.dmg ? (u === p ? 'bad' : 'good') : 'dim');
    }
    u.acted = false;
  }
  if (await checkFaint()) return;
  if (G.paint > 0 && --G.paint === 0) { renderBattle(); await say('The paintball scent faded...', 'warn'); }
  if (m.flash > 0 && --m.flash === 0) { renderBattle(); await say(`The ${m.name} can see again!`, 'warn'); }
  if (p.buffs.might > 0 && --p.buffs.might === 0) { renderBattle(); await say('The MIGHT SEED wore off.', 'warn'); }
  renderBattle();
}