<<<<<<< HEAD
# Monster Hunt: Mountain Stream

Turn-based Monster Hunter fan prototype with a Pokémon Gen-3 look.
Plain HTML/CSS/JS (ES modules). No dependencies, no build step.

## Run
ES modules don't load from file://, so serve the folder:

    npx serve .            # or
    python -m http.server 8000

Then open http://localhost:8000 (or the URL `serve` prints).

## Controls
Arrows/WASD move · Z/Space = A · X = B · Enter/Esc = menu · M = map · N = music

## Where things live
- Balance numbers: `src/core/config.js`
- New monster: `src/data/monsters.js` (stats + loot) and `src/art/defs.js` (MON_ART)
- New item: `src/data/items.js` and `src/art/defs.js` (ITEM_ART)
- Map layout: `src/data/world.js` (AREAS, LINKS, THEMES)
=======
# MonsterHunterTurnBased
A demo for a monster-hunter turn based game (Monster Hunter + Pokemon) 
>>>>>>> 362633ef7d3d8e7b7a916ddc55dd562e0d1e7c23
