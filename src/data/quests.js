/* Quest boards. targets are hunted ONE AT A TIME: the next appears when the previous one
   is slain or captured. Reward money = sum of each target's LOOT zenny. */
import { VILLAGE, HUB } from './world.js';
import { MONSTERS, LOOT } from './monsters.js';

export const VILLAGE_QUESTS = [
  { id: 'q_rathalos', title: 'King of the Skies', targets: ['rathalos'], stars: 6, map: 'SACRED FOREST', fee: 360,
    desc: 'A RATHALOS is scorching the forest. Slay or capture it!' },
  { id: 'q_tigrex', title: 'The Absolute Roar', targets: ['tigrex'], stars: 6, map: 'SACRED FOREST', fee: 420,
    desc: 'A TIGREX is tearing up the trails. Slay or capture it!' }
].map(q => ({ ...q, board: VILLAGE }));

export const HUB_QUESTS = [
  { id: 'hub_twin_rathalos', title: 'Twin Flames', targets: ['rathalos', 'rathalos'], stars: 7, map: 'SACRED FOREST', fee: 720,
    desc: 'Two RATHALOS are terrorizing the forest. Hunt them both!' },
  { id: 'hub_sky_earth', title: 'Sky and Earth', targets: ['rathalos', 'tigrex'], stars: 7, map: 'SACRED FOREST', fee: 780,
    desc: 'A RATHALOS and a TIGREX are fighting over the forest. Hunt them both!' }
].map(q => ({ ...q, board: HUB }));

export const QUEST_BOARDS = { [VILLAGE]: VILLAGE_QUESTS, [HUB]: HUB_QUESTS };

/** "RATHALOS x2" / "RATHALOS + TIGREX" */
export function questTargets(q) {
  const c = {};
  q.targets.forEach(k => { c[k] = (c[k] || 0) + 1; });
  return Object.entries(c).map(([k, n]) => MONSTERS[k].name + (n > 1 ? ` x${n}` : '')).join(' + ');
}
export const questReward = q => q.targets.reduce((s, k) => s + LOOT[k].zenny, 0);