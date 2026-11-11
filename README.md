# Monster Hunt: Sacred Forest

Turn-based Monster Hunter fan prototype with a 8-bit.
Plain HTML/CSS/JS (ES modules). No dependencies, no build step.
Obviously vibe coded (use AI)

## Run

You can run an old demo build with MH_Demo.html directly

But the new ones will require to start a local server.
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
