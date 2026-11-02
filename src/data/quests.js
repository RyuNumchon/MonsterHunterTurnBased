/* Quests offered by the Village Chief. Reward money comes from LOOT[target].zenny.
   The contract fee is paid on accept, refunded on cancel or success, lost on failure. */
export const QUESTS = [
  { id: 'q_rathalos', title: 'King of the Skies', target: 'rathalos', stars: 6, map: 'MOUNTAIN STREAM', fee: 360,
    desc: 'A RATHALOS is scorching the mountain. Slay or capture it!' },
  { id: 'q_tigrex', title: 'The Absolute Roar', target: 'tigrex', stars: 6, map: 'MOUNTAIN STREAM', fee: 420,
    desc: 'A TIGREX is tearing up the trails. Slay or capture it!' }
];