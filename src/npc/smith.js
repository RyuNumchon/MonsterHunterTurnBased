/* BLACKSMITH (village): forges weapons and armor from ITEM BOX materials + zenny. */
import { BOX, saveBox } from '../core/save.js';
import { boxCount, boxRemove } from '../core/pouch.js';
import { equipWeapon, equipArmor } from '../core/gear.js';
import { attackOf, WEAPONS } from '../data/weapons.js';
import { ARMOR, SETS, SLOT_NAME } from '../data/armor.js';
import { ITEM_RAR } from '../data/items.js';
import { LOOT } from '../data/monsters.js';
import { DATA } from '../art/index.js';
import { Audio8 } from '../audio/audio8.js';
import { say, ask, choose } from '../ui/dialog.js';

// Dev check: every recipe material must exist somewhere in the loot tables
const KNOWN = new Set([...Object.keys(ITEM_RAR),
  ...(JSON.stringify(LOOT).match(/"[A-Z][A-Z0-9 '\-]+"/g) || []).map(s => s.slice(1, -1))]);
for (const g of [...Object.values(WEAPONS), ...Object.values(ARMOR)])
  for (const m in g.cost?.mats || {}) if (!KNOWN.has(m)) console.warn(`[forge] ${g.name} needs '${m}', which no loot table drops`);

const matsText = c => Object.entries(c.mats).map(([m, n]) => `${m} x${n} (${boxCount(m)})`).join('<br>');
const canPay = c => BOX.zenny >= c.z && Object.entries(c.mats).every(([m, n]) => boxCount(m) >= n);

export async function talkSmith() {
  await say("BLACKSMITH: Hah! Bring me monster parts\nand I'll forge you something fierce!");
  while (true) {
    const i = await choose(`BLACKSMITH · WALLET ${BOX.zenny}z`, ['FORGE WEAPON', 'FORGE ARMOR', 'BYE']);
    if (i === 0) await weaponList();
    else if (i === 1) await armorSets();
    else { await say('BLACKSMITH: Wear it with pride, hunter!'); return; }
  }
}

/** Pays and forges. Returns true on success. */
async function forge(d, owned) {
  if (owned) { await say(`BLACKSMITH: You already own the ${d.name}!`, 'dim'); return false; }
  if (!canPay(d.cost)) {
    await say(BOX.zenny < d.cost.z ? `BLACKSMITH: That's ${d.cost.z}z.\nYou only have ${BOX.zenny}z.`
                                   : "BLACKSMITH: You're short on materials.\nI work from your ITEM BOX!", 'bad');
    return false;
  }
  if (!(await ask(`Forge the ${d.name}?\nCOST ${d.cost.z}z + materials`))) return false;
  for (const [m, n] of Object.entries(d.cost.mats)) boxRemove(m, n);
  BOX.zenny -= d.cost.z;
  Audio8.sfx('sharpen');
  await say('*CLANG* *CLANG* *CLANG*...', 'dim');
  Audio8.sfx('capture');
  await say(`The ${d.name} is ready!`, 'good');
  return true;
}

async function weaponList() {
  const keys = Object.keys(WEAPONS).filter(k => WEAPONS[k].cost);
  while (true) {
    const opts = keys.map(k => {
      const w = WEAPONS[k];
      return { icon: DATA['wpn_' + k], label: w.name, right: BOX.weapons.includes(k) ? 'OWNED' : w.cost.z + 'z',
              desc: `ATTACK ${attackOf(w)}<br>${w.blurb}<br>${matsText(w.cost)}` };
    });
    opts.push({ label: 'BACK', desc: '' });
    const i = await choose(`FORGE WEAPON · ${BOX.zenny}z`, opts, { desc: true });
    if (i < 0 || i === keys.length) return;
    const k = keys[i], w = WEAPONS[k];
    if (!(await forge(w, BOX.weapons.includes(k)))) continue;
    BOX.weapons.push(k); saveBox();
    if (await ask(`Equip the ${w.name} now?`)) { equipWeapon(k); await say(`HUNTER equipped the ${w.name}!`, 'good'); }
  }
}

async function armorSets() {
  const sets = Object.keys(SETS);
  while (true) {
    const opts = sets.map(s => ({ label: `${SETS[s].label} SET`,
      right: `${BOX.armor.filter(id => ARMOR[id].set === s).length}/5` }));
    opts.push({ label: 'BACK' });
    const i = await choose(`FORGE ARMOR · ${BOX.zenny}z`, opts);
    if (i < 0 || i === sets.length) return;
    await armorList(sets[i]);
  }
}

async function armorList(set) {
  const ids = Object.keys(ARMOR).filter(id => ARMOR[id].set === set);
  while (true) {
    const opts = ids.map(id => {
      const a = ARMOR[id];
      return { label: a.name, right: BOX.armor.includes(id) ? 'OWNED' : a.cost.z + 'z', desc: `${a.desc}<br>${matsText(a.cost)}` };
    });
    opts.push({ label: 'BACK', desc: '' });
    const i = await choose(`${SETS[set].label} ARMOR · ${BOX.zenny}z`, opts, { desc: true });
    if (i < 0 || i === ids.length) return;
    const a = ARMOR[ids[i]];
    if (!(await forge(a, BOX.armor.includes(a.id)))) continue;
    BOX.armor.push(a.id); saveBox();
    if (await ask(`Equip the ${a.name} now?`)) { equipArmor(a.slot, a.id); await say(`HUNTER put on the ${a.name}!`, 'good'); }
  }
}