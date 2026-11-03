/* Quest boards. Each quest remembers its board: you depart from that area's gate and return there.
   Reward money comes from LOOT[target].zenny. The fee is refunded on cancel or success. */
import { VILLAGE, HUB } from './world.js';

const BASE = [
  { id: 'q_rathalos', title: 'King of the Skies', target: 'rathalos', stars: 6, map: 'SACRED FOREST', fee: 360,
    desc: 'A RATHALOS is scorching the mountain. Slay or capture it!' },
  { id: 'q_tigrex', title: 'The Absolute Roar', target: 'tigrex', stars: 6, map: 'SACRED FOREST', fee: 420,
    desc: 'A TIGREX is tearing up the trails. Slay or capture it!' }
];

export const VILLAGE_QUESTS = BASE.map(q => ({ ...q, board: VILLAGE }));
export const HUB_QUESTS = BASE.map(q => ({ ...q, id: 'hub_' + q.id, board: HUB }));   // copy for now
export const QUEST_BOARDS = { [VILLAGE]: VILLAGE_QUESTS, [HUB]: HUB_QUESTS };