/* Procedural area builder (seeded, so every area looks the same each time):
   themed ground -> border -> water features -> obstacle clusters -> exits on the edge
   facing the destination -> L-shaped paths from every exit to the centre (guarantees
   connectivity; water becomes a ford) -> arena clearing -> camp props -> gathering
   points on reachable, off-path tiles. */
import { rng32 } from "../core/utils.js";
import {
  AREAS,
  THEMES,
  SOLID,
  WATERS,
  MW,
  MH,
  CXT,
  CYT,
  SIDE_IN,
  neighbors,
  sideTo,
} from "../data/world.js";
import { TOWN_MAPS } from "../data/towns.js";

function genArea(id) {
  const A = AREAS[id],
    th = THEMES[A.theme],
    r = rng32(9000 + id * 101);
  const g = [];
  for (let y = 0; y < MH; y++) {
    const row = [];
    for (let x = 0; x < MW; x++) {
      const v = r();
      row.push(v < th.tall ? "," : v < th.tall + th.flower ? "f" : th.ground);
    }
    g.push(row);
  }
  // Border (solid outer ring + ragged second ring)
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      const e = Math.min(x, y, MW - 1 - x, MH - 1 - y);
      if (e === 0 || (e === 1 && r() < 0.55)) g[y][x] = th.border;
    }
  // Water features
  if (th.feature === "streamV")
    for (let y = 0; y < MH; y++)
      for (let x = 4; x <= 5; x++) g[y][x] = y === 9 || y === 10 ? "-" : "~";
  if (th.feature === "riverH")
    for (let y = 4; y <= 5; y++) for (let x = 0; x < MW; x++) g[y][x] = "~";
  if (th.feature === "pool")
    for (let y = 1; y <= 4; y++)
      for (let x = 5; x <= 18; x++)
        g[y][x] = y === 1 && x >= 9 && x <= 14 ? "w" : "~";
  // Obstacle clusters
  for (let i = 0; i < th.clusters; i++) {
    const cx = 2 + Math.floor(r() * (MW - 4)),
      cy = 2 + Math.floor(r() * (MH - 4)),
      rad = 1 + Math.floor(r() * 2);
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++) {
        const x = cx + dx,
          y = cy + dy;
        if (x < 1 || y < 1 || x > MW - 2 || y > MH - 2) continue;
        if (
          dx * dx + dy * dy <= rad * rad + 1 &&
          r() < 0.75 &&
          !WATERS.has(g[y][x])
        )
          g[y][x] = th.obs;
      }
  }
  if (th.bones)
    for (let y = 1; y < MH - 1; y++)
      for (let x = 1; x < MW - 1; x++)
        if (g[y][x] === th.ground && r() < th.bones) g[y][x] = "x";
  if (A.theme === "camp")
    for (let y = 2; y <= 7; y++)
      for (let x = 8; x <= 20; x++) g[y][x] = th.ground;

  // Exits: one per linked area, on the edge facing it, spread evenly along that edge
  const exits = [],
    bySide = { N: [], S: [], E: [], W: [] };
  neighbors(id).forEach((to) => bySide[sideTo(id, to)].push(to));
  for (const s in bySide) {
    const list = bySide[s],
      horiz = s === "N" || s === "S";
    list.sort((a, b) =>
      horiz ? AREAS[a].mx - AREAS[b].mx : AREAS[a].my - AREAS[b].my,
    );
    list.forEach((to, i) => {
      const span = horiz ? MW : MH,
        pos = Math.round(3 + ((span - 7) * (i + 1)) / (list.length + 1));
      const x = s === "W" ? 0 : s === "E" ? MW - 1 : pos,
        y = s === "N" ? 0 : s === "S" ? MH - 1 : pos;
      const [ix, iy, idir] = SIDE_IN[s];
      exits.push({ x, y, to, ix, iy, idir, side: s });
    });
  }
  // Paths: exit -> 2 tiles inward -> L-shape to the centre
  const carved = new Set();
  const carve = (x, y) => {
    const c = g[y][x];
    if (c === "E") return;
    g[y][x] = WATERS.has(c) ? "-" : th.path;
    carved.add(x + "," + y);
  };
  exits.forEach((e) => {
    g[e.y][e.x] = "E";
    let x = e.x + e.ix,
      y = e.y + e.iy;
    carve(x, y);
    x += e.ix;
    y += e.iy;
    carve(x, y);
    const stepX = () => {
      while (x !== CXT) {
        x += Math.sign(CXT - x);
        carve(x, y);
      }
    };
    const stepY = () => {
      while (y !== CYT) {
        y += Math.sign(CYT - y);
        carve(x, y);
      }
    };
    if (r() < 0.5) {
      stepX();
      stepY();
    } else {
      stepY();
      stepX();
    }
  });
  // Arena clearing in the middle (big monster spawns here)
  for (let y = CYT - 4; y <= CYT + 3; y++)
    for (let x = CXT - 4; x <= CXT + 3; x++) {
      if ((x - 11.5) ** 2 + (y - 8.5) ** 2 <= 11 && g[y][x] !== "E")
        g[y][x] = carved.has(x + "," + y) ? th.path : th.ground;
    }
  // Props
  const objects = [],
    blockers = new Set();
  if (A.theme === "camp")
    objects.push(
      { type: "tent", x: 15, y: 3, w: 3, h: 2 },
      { type: "bed", x: 19, y: 4, w: 1, h: 1 },
      { type: "box", x: 13, y: 4, w: 1, h: 1 },
      { type: "sign", x: 9, y: 3, w: 1, h: 1 },
    );
  objects.forEach((o) => {
    for (let dy = 0; dy < o.h; dy++)
      for (let dx = 0; dx < o.w; dx++) blockers.add(`${o.x + dx},${o.y + dy}`);
  });

  // Reachability (BFS from the first exit)
  const ok = (x, y) =>
    x >= 0 &&
    y >= 0 &&
    x < MW &&
    y < MH &&
    !SOLID.has(g[y][x]) &&
    !blockers.has(x + "," + y);
  const start = [exits[0].x + exits[0].ix, exits[0].y + exits[0].iy];
  const reach = new Set([start.join(",")]),
    q = [start];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        k = nx + "," + ny;
      if (!reach.has(k) && ok(nx, ny)) {
        reach.add(k);
        q.push([nx, ny]);
      }
    }
  }
  // Gathering points: reachable, off-path, away from exits and the arena, spaced apart
  const cands = [];
  reach.forEach((k) => {
    const [x, y] = k.split(",").map(Number),
      c = g[y][x];
    if (carved.has(k) || c === "E" || c === "-") return;
    if ((x - 11.5) ** 2 + (y - 8.5) ** 2 < 16) return;
    if (exits.some((e) => Math.abs(e.x - x) + Math.abs(e.y - y) < 3)) return;
    cands.push([x, y]);
  });
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  const gathers = [];
  (A.gather || []).forEach((type) => {
    const c = cands.find(
      ([x, y]) =>
        !gathers.some(
          (gp) => Math.abs(gp.x - x) <= 2 && Math.abs(gp.y - y) <= 2,
        ),
    );
    if (!c) return;
    gathers.push({ x: c[0], y: c[1], type });
    blockers.add(c[0] + "," + c[1]);
  });
  return {
    id,
    theme: A.theme,
    w: MW,
    h: MH,
    tiles: g,
    exits,
    objects,
    gathers,
    blockers,
    carved,
    reach,
  };
}

/** All ten areas, generated once at load. */
export const MAPS = {};
for (const a in AREAS) MAPS[a] = genArea(+a);

/* Town maps are hand-made (data/towns.js): fixed layout, fixed gathering points, no monsters. */
function buildTown(id, def) {
  const g = def.rows.map((r, i) => {
    if (r.length !== MW)
      console.warn(
        `[towns] ${id} row ${i} is ${r.length} wide, expected ${MW}`,
      );
    return [...r];
  });
  const exits = def.exits.map(([x, y, to]) => {
    const side = x === 0 ? "W" : x === MW - 1 ? "E" : y === 0 ? "N" : "S";
    const [ix, iy, idir] = SIDE_IN[side];
    return { x, y, to, ix, iy, idir, side };
  });
  const objects = def.objects || [],
    blockers = new Set();
  objects
    .filter((o) => !o.deco)
    .forEach((o) => {
      for (let dy = 0; dy < o.h; dy++)
        for (let dx = 0; dx < o.w; dx++)
          blockers.add(`${o.x + dx},${o.y + dy}`);
    });
  const gathers = (def.gathers || []).map(([type, x, y]) => ({ type, x, y }));
  gathers.forEach((gp) => blockers.add(gp.x + "," + gp.y));
  const ok = (x, y) =>
    x >= 0 &&
    y >= 0 &&
    x < MW &&
    y < MH &&
    !SOLID.has(g[y][x]) &&
    !blockers.has(x + "," + y);
  const reach = new Set([def.spawn.join(",")]),
    q = [def.spawn];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        k = nx + "," + ny;
      if (!reach.has(k) && ok(nx, ny)) {
        reach.add(k);
        q.push([nx, ny]);
      }
    }
  }
  return {
    id,
    theme: def.theme,
    w: MW,
    h: MH,
    tiles: g,
    exits,
    objects,
    gathers,
    blockers,
    carved: new Set(),
    reach,
    town: true,
  };
}
for (const [id, def] of Object.entries(TOWN_MAPS))
  MAPS[id] = buildTown(id, def);

/** Nearest free, reachable tile to (x0, y0), away from exits. Used to place NPCs and the boss. */
export function findFree(M, x0, y0, avoid, allowPath) {
  let best = null,
    bd = Infinity;
  M.reach.forEach((k) => {
    const [x, y] = k.split(",").map(Number),
      c = M.tiles[y][x];
    if (M.blockers.has(k) || c === "E" || c === "-") return;
    if (!allowPath && M.carved.has(k)) return;
    if (M.exits.some((e) => Math.abs(e.x - x) + Math.abs(e.y - y) < 4)) return;
    if (avoid && avoid(x, y)) return;
    const d = (x - x0) ** 2 + (y - y0) ** 2;
    if (d < bd) {
      bd = d;
      best = { x, y };
    }
  });
  return best || { x: CXT, y: CYT };
}
