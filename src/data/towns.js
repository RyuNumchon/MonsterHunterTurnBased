/* Hand-made town maps (24×18). Extra tiles: p tilled soil · n fence (solid) · h wood floor · H wood wall (solid).
   exits: [x, y, destination]. gathers: [type, x, y]. Objects with deco:true don't block movement.
   'counter' objects talk to their npc; needSeat = the hunter must stand on a 'chair' first. */
import { VILLAGE, FARM, HUB, GATE } from './world.js';

export const TOWN_MAPS = {
  [VILLAGE]: {
    theme: 'village', spawn: [12, 11],
    rows: [
      '#'.repeat(11) + 'EE' + '#'.repeat(11),
      '##' + '.'.repeat(9) + '::' + '.'.repeat(9) + '##',
      ...Array(3).fill('#' + '.'.repeat(10) + '::' + '.'.repeat(10) + '#'),
      ...Array(3).fill('#....:.....::.....:....#'),
      'E' + ':'.repeat(22) + 'E',
      'E' + ':'.repeat(22) + 'E',
      ...Array(2).fill('#' + '.'.repeat(10) + '::' + '.'.repeat(10) + '#'),
      ...Array(3).fill('#' + '.'.repeat(16) + '~~~~..#'),
      '#..f.......f...........#',
      '##' + '.'.repeat(20) + '##',
      '#'.repeat(24)
    ],
    exits: [[11, 0, HUB], [12, 0, HUB], [0, 8, FARM], [0, 9, FARM], [23, 8, GATE], [23, 9, GATE]],
    objects: [
      { type: 'house', x: 3,  y: 2,  w: 5, h: 3, roof: '#c84030', label: "The CHIEF's hall. Lanterns glow by the door." },
      { type: 'house', x: 16, y: 2,  w: 5, h: 3, roof: '#3868b0', label: "The MERCHANT's shop. It smells of herbs and oil." },
      { type: 'house', x: 3,  y: 12, w: 5, h: 3, roof: '#5a8a40', label: 'Your house. Home sweet home.' },
      { type: 'house', x: 13, y: 12, w: 4, h: 3, roof: '#4a4a52', label: 'The FORGE. Heat pours out of the doorway.' },
      { type: 'anvil', x: 17, y: 15, w: 1, h: 1 },
      { type: 'itembox', x: 9, y: 13, w: 1, h: 1 },
      { type: 'sign', x: 14, y: 10, w: 1, h: 1, text: 'THEPARAK VILLAGE\nW: FARM · N: GATHERING HUB · E: QUEST GATE' },
      { type: 'gate', x: 23, y: 8, w: 1, h: 2, deco: true },
    ]
  },

  [FARM]: {
    theme: 'farm', spawn: [22, 8],
    rows: [
      '#'.repeat(24),
      '#.' + 'n'.repeat(20) + '.#',
      ...Array(4).fill('#.n' + 'p'.repeat(18) + 'n.#'),
      '#.nnnnnnnnn::nnnnnnnnn.#',
      '#..........::..........#',
      '#' + ':'.repeat(22) + 'E',
      '#' + ':'.repeat(22) + 'E',
      '#.....:.....:..........#',
      '#.nnnn:nnnn.:..........#',
      ...Array(3).fill('#.n,,,,,,,n.:...~~~~~..#'),
      '#.n,,,,,,,n.:..........#',
      '#.nnnnnnnnn............#',
      '#'.repeat(24)
    ],
    exits: [[23, 8, VILLAGE], [23, 9, VILLAGE]],
    gathers: [
      ['plants', 5, 3], ['plants', 9, 3], ['plants', 14, 3], ['plants', 18, 3],          // crop field, row 1
      ['berries', 5, 5], ['berries', 9, 5], ['berries', 14, 5], ['berries', 18, 5],      // crop field, row 2
      ['mushrooms', 4, 13], ['mushrooms', 8, 13], ['bugs', 6, 15],                       // mushroom grove
      ['honey', 14, 12], ['honey', 14, 14], ['fish', 15, 13], ['fish', 18, 11],          // hives + pond
      ['mining', 21, 13], ['whetstone', 21, 15]                                          // rocks
    ],
    objects: [
      { type: 'sign', x: 20, y: 7, w: 1, h: 1, text: 'THEPARAK FARM\nEvery spot regrows after each quest.' }
    ]
  },

  [HUB]: {
    theme: 'hub', spawn: [11, 15],
    rows: [
      'H'.repeat(11) + 'EE' + 'H'.repeat(11),
      'H'.repeat(11) + 'hh' + 'H'.repeat(11),
      ...Array(3).fill('HH' + 'h'.repeat(8) + 'Hhh' + 'HH' + 'h'.repeat(6) + 'HHH'),
      ...Array(12).fill('H' + 'h'.repeat(22) + 'H'),
      'H'.repeat(11) + 'EE' + 'H'.repeat(11)
    ],
    exits: [[11, 0, GATE], [12, 0, GATE], [11, 17, VILLAGE], [12, 17, VILLAGE]],
    objects: [
      { type: 'counter', x: 2, y: 4, w: 8, h: 1, npc: 'chef', needSeat: true,
        seatMsg: 'FELYNE CHEF: Take a seat at the counter\nfirst, nya! Then we can talk food!' },
      { type: 'chair', x: 3, y: 5, w: 1, h: 1, deco: true },
      { type: 'chair', x: 5, y: 5, w: 1, h: 1, deco: true },
      { type: 'chair', x: 7, y: 5, w: 1, h: 1, deco: true },
      { type: 'table', x: 3, y: 9, w: 3, h: 1 }, { type: 'chair', x: 4, y: 10, w: 1, h: 1, deco: true },
      { type: 'table', x: 7, y: 9, w: 3, h: 1 }, { type: 'chair', x: 8, y: 10, w: 1, h: 1, deco: true },
      { type: 'counter', x: 15, y: 4, w: 6, h: 1, npc: 'receptionist' },
      { type: 'itembox', x: 20, y: 13, w: 1, h: 1 },
      { type: 'sign', x: 14, y: 6, w: 1, h: 1, text: 'GATHERING HUB\nKITCHEN: west · QUEST COUNTER: east · GATE: north' },
      { type: 'gate', x: 10, y: 0, w: 4, h: 1, deco: true }
    ]
  }
};