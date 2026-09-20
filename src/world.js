// World generation: Rotterdam city grid, districts, roads, river, landmarks.
// Deterministic (seeded) procedural generation with a spatial chunk hash so
// only on-screen chunks are iterated for drawing / collision.

export const WORLD_SIZE = 8192;
export const CELL = 128;          // grid resolution for street/building placement
export const CELLS = WORLD_SIZE / CELL; // 64
export const CHUNK = 512;         // spatial hash bucket size
export const CHUNKS = WORLD_SIZE / CHUNK; // 16

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Districts ------------------------------------------------------------
// Each district: name, rect (world px), palette, building density/height.
export const DISTRICTS = [
  {
    id: 'noord', name: 'Noord',
    rect: { x: 0, y: 0, w: 8192, h: 1400 },
    palette: { building: ['#7a6a52', '#8a7a5f', '#6d5c46'], roof: '#4a3f30', window: '#ffdf8a', accent: '#c9a15a' },
    density: 0.8, minH: 20, maxH: 60,
  },
  {
    id: 'delfshaven', name: 'Delfshaven',
    rect: { x: 0, y: 1400, w: 4096, h: 2400 },
    palette: { building: ['#8a3d2e', '#9a4a35', '#7a3626', '#a85c3c'], roof: '#3d2016', window: '#ffd27a', accent: '#e0c98a' },
    density: 0.9, minH: 18, maxH: 45,
  },
  {
    id: 'centrum', name: 'Centrum',
    rect: { x: 4096, y: 1400, w: 4096, h: 2400 },
    palette: { building: ['#2b3a4a', '#33465a', '#24303d', '#3d5468'], roof: '#151d24', window: '#7fe8ff', accent: '#ff2d95' },
    density: 0.95, minH: 60, maxH: 220,
  },
  {
    id: 'kop-van-zuid', name: 'Kop van Zuid',
    rect: { x: 3200, y: 4400, w: 2400, h: 1400 },
    palette: { building: ['#3a4550', '#455260', '#2f3944', '#526073'], roof: '#1c2329', window: '#8fd6ff', accent: '#ffb238' },
    density: 0.85, minH: 50, maxH: 190,
  },
  {
    id: 'katendrecht', name: 'Katendrecht',
    rect: { x: 3200, y: 5800, w: 2400, h: 2392 },
    palette: { building: ['#8a5a3d', '#9a6a48', '#7a4e34'], roof: '#3a2416', window: '#ffe08a', accent: '#d68a4a' },
    density: 0.75, minH: 18, maxH: 40,
  },
  {
    id: 'feijenoord', name: 'Feijenoord',
    rect: { x: 5600, y: 4400, w: 2592, h: 3792 },
    palette: { building: ['#5a4a3a', '#6a5846', '#4d4030'], roof: '#2a2118', window: '#ffd98a', accent: '#8a9a4a' },
    density: 0.8, minH: 18, maxH: 55,
  },
  {
    id: 'harbour', name: 'Maashaven / Waalhaven',
    rect: { x: 0, y: 4400, w: 3200, h: 3792 },
    palette: { building: ['#555b5e', '#63696c', '#484d50', '#6e5648' /* rust */], roof: '#2c2f31', window: '#ffb44a', accent: '#c0632a' },
    density: 0.5, minH: 20, maxH: 70,
  },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    const r = d.rect;
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return d;
  }
  return null;
}

// ---- River ------------------------------------------------------------
export const RIVER = { y0: 3800, y1: 4400 };
// Crossings: {x0,x1} ranges where the river is replaced by a bridge/tunnel deck.
export const BRIDGE = { name: 'Erasmusbrug', x0: 4180, x1: 4460, type: 'bridge' };
export const TUNNEL = { name: 'Maastunnel', x0: 1980, x1: 2260, type: 'tunnel' };
export const CROSSINGS = [BRIDGE, TUNNEL];

export function isRiver(x, y) {
  if (y < RIVER.y0 || y >= RIVER.y1) return false;
  for (const c of CROSSINGS) if (x >= c.x0 && x < c.x1) return false;
  return true;
}

// ---- Landmarks ------------------------------------------------------------
export const LANDMARKS = [
  { name: 'Euromast', x: 3900, y: 3620, w: 90, h: 90, type: 'tower', color: '#d9d9d9' },
  { name: 'Markthal', x: 6100, y: 2100, w: 420, h: 220, type: 'arch', color: '#e8e2d0' },
  { name: 'Kubuswoningen', x: 6560, y: 2050, w: 260, h: 200, type: 'cubes', color: '#e8c23a' },
  { name: 'De Rotterdam', x: 4560, y: 4560, w: 260, h: 300, type: 'towers', color: '#c7d3da' },
  { name: 'Hofplein', x: 5200, y: 1750, w: 260, h: 260, type: 'roundabout', color: '#556' },
  { name: 'Blaak', x: 5850, y: 2400, w: 40, h: 40, type: 'label', color: '#fff' },
  { name: 'Coolsingel', x: 4900, y: 2600, w: 40, h: 40, type: 'label', color: '#fff' },
];

// Cells reserved by landmarks (no random building there).
function landmarkCells() {
  const set = new Set();
  for (const lm of LANDMARKS) {
    if (lm.type === 'label') continue;
    const cx0 = Math.floor((lm.x - 40) / CELL), cx1 = Math.floor((lm.x + lm.w + 40) / CELL);
    const cy0 = Math.floor((lm.y - 40) / CELL), cy1 = Math.floor((lm.y + lm.h + 40) / CELL);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) set.add(cx + ',' + cy);
  }
  return set;
}

// ---- Procedural generation -------------------------------------------
const rng = mulberry32(1337);

export const buildings = [];   // {x,y,w,h,color,roof,window,accent,shadowLen,hasDoor,district}
export const roadCells = [];   // {x,y} cell world-space top-left, for rendering asphalt
export const props = [];       // harbour cranes, containers, payphones-adjacent scenery
const chunkMap = new Map();    // key "cx,cy" -> {buildings:[], props:[]}

function chunkKey(cx, cy) { return cx + ',' + cy; }
function chunkOf(x, y) { return { cx: Math.floor(x / CHUNK), cy: Math.floor(y / CHUNK) }; }

function addToChunks(list, obj, x0, y0, x1, y1) {
  const c0 = chunkOf(x0, y0), c1 = chunkOf(x1, y1);
  for (let cy = c0.cy; cy <= c1.cy; cy++) {
    for (let cx = c0.cx; cx <= c1.cx; cx++) {
      const key = chunkKey(cx, cy);
      let bucket = chunkMap.get(key);
      if (!bucket) { bucket = { buildings: [], props: [] }; chunkMap.set(key, bucket); }
      bucket[list].push(obj);
    }
  }
}

function generate() {
  const reserved = landmarkCells();
  for (let cy = 0; cy < CELLS; cy++) {
    for (let cx = 0; cx < CELLS; cx++) {
      const wx = cx * CELL, wy = cy * CELL;
      const midx = wx + CELL / 2, midy = wy + CELL / 2;

      if (isRiver(midx, midy)) continue; // water, no geometry (handled by renderer)

      const district = districtAt(midx, midy);
      if (!district) continue;

      // Street grid: every 4th cell is a road; offset varies per-district for organic feel.
      const gridN = 4;
      const offX = Math.floor(district.rect.x / CELL) % gridN;
      const offY = Math.floor(district.rect.y / CELL) % gridN;
      const isRoadCol = ((cx + offX) % gridN) === 0;
      const isRoadRow = ((cy + offY) % gridN) === 0;

      // Bridge/tunnel approach roads: force a road corridor leading to crossings.
      const nearBridgeX = midx > BRIDGE.x0 - 40 && midx < BRIDGE.x1 + 40;
      const nearTunnelX = midx > TUNNEL.x0 - 40 && midx < TUNNEL.x1 + 40;

      if (isRoadCol || isRoadRow || nearBridgeX || nearTunnelX) {
        roadCells.push({ x: wx, y: wy });
        continue;
      }

      if (reserved.has(cx + ',' + cy)) continue;

      if (rng() > district.density) continue; // empty lot / plaza

      const pal = district.palette;
      const margin = 8 + rng() * 6;
      const w = CELL - margin * 2;
      const h = CELL - margin * 2;
      const bx = wx + margin;
      const by = wy + margin;
      const height = district.minH + rng() * (district.maxH - district.minH);
      const b = {
        x: bx, y: by, w, h,
        color: pal.building[(rng() * pal.building.length) | 0],
        roof: pal.roof,
        window: pal.window,
        accent: pal.accent,
        shadowLen: 4 + (height / district.maxH) * 14,
        hasDoor: rng() < 0.18,
        doorSide: (rng() * 4) | 0,
        signage: rng() < (district.id === 'centrum' ? 0.22 : 0.04),
        district: district.id,
        litSeed: rng(),
      };
      buildings.push(b);
      addToChunks('buildings', b, bx, by, bx + w, by + h);
    }
  }

  // Harbour props: cranes and container stacks scattered along the harbour edge.
  const harbour = DISTRICTS.find(d => d.id === 'harbour');
  for (let i = 0; i < 22; i++) {
    const px = harbour.rect.x + 40 + rng() * (harbour.rect.w - 80);
    const py = harbour.rect.y + 40 + rng() * (harbour.rect.h - 80);
    const kind = rng() < 0.35 ? 'crane' : 'containers';
    const p = { x: px, y: py, kind, seed: rng() };
    props.push(p);
    addToChunks('props', p, px - 60, py - 60, px + 60, py + 60);
  }
}

generate();

export function chunksInRect(x0, y0, x1, y1) {
  const c0 = chunkOf(x0, y0), c1 = chunkOf(x1, y1);
  const out = [];
  for (let cy = Math.max(0, c0.cy); cy <= Math.min(CHUNKS - 1, c1.cy); cy++) {
    for (let cx = Math.max(0, c0.cx); cx <= Math.min(CHUNKS - 1, c1.cx); cx++) {
      const bucket = chunkMap.get(chunkKey(cx, cy));
      if (bucket) out.push(bucket);
    }
  }
  return out;
}

export function buildingsInRect(x0, y0, x1, y1) {
  const seen = new Set();
  const out = [];
  for (const bucket of chunksInRect(x0, y0, x1, y1)) {
    for (const b of bucket.buildings) {
      if (seen.has(b)) continue;
      seen.add(b);
      if (b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0) out.push(b);
    }
  }
  return out;
}

export function propsInRect(x0, y0, x1, y1) {
  const seen = new Set();
  const out = [];
  for (const bucket of chunksInRect(x0, y0, x1, y1)) {
    for (const p of bucket.props) {
      if (seen.has(p)) continue;
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

// AABB collision test against solid geometry (buildings + river banks).
export function collidesSolid(x, y, w, h) {
  if (isRiver(x, y) || isRiver(x + w, y) || isRiver(x, y + h) || isRiver(x + w, y + h)) return true;
  const cand = buildingsInRect(x, y, x + w, y + h);
  for (const b of cand) {
    if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return true;
  }
  return false;
}

export function findSpawnPoint() {
  // Coolsingel-ish open area in Centrum, guaranteed clear of buildings.
  let x = 4900, y = 2900;
  for (let tries = 0; tries < 200; tries++) {
    if (!collidesSolid(x - 12, y - 12, 24, 24)) return { x, y };
    x = 4600 + rng() * 800;
    y = 2600 + rng() * 800;
  }
  return { x: 4900, y: 2900 };
}
