import {
  WORLD_SIZE, CELL, DISTRICTS, RIVER, CROSSINGS, LANDMARKS,
  buildingsInRect, propsInRect, findSpawnPoint, districtAt,
} from './world.js';
import { Player } from './player.js';
import { Vehicle, CAR_TYPES, findNearbyVehicle } from './vehicles.js';
import { WEAPONS, Bullet, Explosion } from './weapons.js';
import { spawnPedestriansAround } from './npc.js';
import { WantedSystem } from './police.js';
import { MissionSystem, PAYPHONES, SPRAYSHOPS, BOMBSHOPS, CAR_CRUSHERS, FOOD_VENDORS } from './missions.js';
import { audio } from './audio.js';
import { UI } from './ui.js';
import { MenuController } from './menu.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ---- Input ------------------------------------------------------------
class Input {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, rightDown: false };
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) this.mouse.rightDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  down(code) { return this.keys.has(code); }
  pressed(code) {
    if (this.justPressed.has(code)) { this.justPressed.delete(code); return true; }
    return false;
  }
  endFrame() { this.justPressed.clear(); }
}
const input = new Input();

// ---- Camera ------------------------------------------------------------
const camera = { x: 4900, y: 2900, w: canvas.width, h: canvas.height };

// ---- Game state ------------------------------------------------------------
const spawn = findSpawnPoint();
const player = new Player(spawn.x, spawn.y);
player.weapons = ['fists', 'pistol'];
player.ammo.pistol = 40;

const vehicles = [];
const pedestrians = [];
const bullets = [];
const explosions = [];
const wanted = new WantedSystem();
const ui = new UI();
const missions = new MissionSystem(ui);

for (let i = 0; i < 5; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 150 + Math.random() * 300;
  vehicles.push(new Vehicle(spawn.x + Math.cos(a) * r, spawn.y + Math.sin(a) * r, (Math.random() * (CAR_TYPES.length - 1)) | 0));
}
spawnPedestriansAround(pedestrians, spawn.x, spawn.y, 18);

let killFrenzy = null; // {kills, target, timer, bonus}

function fireWeapon(x, y, angle, key, owner) {
  const w = WEAPONS[key];
  const pellets = w.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const a = angle + (Math.random() - 0.5) * (w.spread || 0);
    bullets.push(new Bullet(x, y, a, key, owner));
  }
  audio.gunshot(w.sound || 'pistol');
}

function explodeAt(x, y, radius, owner) {
  explosions.push(new Explosion(x, y, radius));
  audio.explosion();
  for (const p of pedestrians) {
    if (!p.alive) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < radius) { p.takeDamage(999); if (owner === 'player') registerKill(p); }
  }
  for (const v of vehicles) {
    if (v.wrecked || v.exploding) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < radius) destroyVehicle(v, owner);
  }
  for (const u of wanted.units) {
    if (!u.alive) continue;
    const d = Math.hypot(u.x - x, u.y - y);
    if (d < radius) u.takeDamage(999);
  }
  const dp = Math.hypot(player.x - x, player.y - y);
  if (dp < radius) player.takeDamage(60 * (1 - dp / radius));
}

function destroyVehicle(v, owner) {
  if (v.wrecked || v.exploding) return;
  v.explode();
  if (owner === 'player') missions.onVehicleDestroyed(player);
}

function registerKill(p) {
  if (p.gang) missions.onEnemyKilled(player, p.gang);
  if (killFrenzy) { killFrenzy.kills++; }
  wanted.addHeat(p.gang ? 8 : 20);
}

// ---- Interactions (E key) ------------------------------------------------------------
function tryInteract() {
  if (player.inVehicle) {
    const v = player.inVehicle;
    v.driver = null;
    player.inVehicle = null;
    player.x = v.x - Math.cos(v.angle) * (v.w / 2 + 14);
    player.y = v.y - Math.sin(v.angle) * (v.h / 2 + 14);
    audio.stopEngine();
    return;
  }
  const v = findNearbyVehicle(vehicles, player.x, player.y, 44);
  if (v) {
    v.driver = 'player';
    player.inVehicle = v;
    audio.startEngine();
    return;
  }
  const phone = missions.nearestPayphone(player.x, player.y);
  if (phone) { missions.startMissionAt(phone, player); return; }

  const spray = missions.nearestOf(SPRAYSHOPS, player.x, player.y);
  if (spray) { wanted.clear(); ui.subtitle('Wanted level gewist!'); audio.pickup(); return; }

  const bomb = missions.nearestOf(BOMBSHOPS, player.x, player.y);
  if (bomb) {
    const near = findNearbyVehicle(vehicles, player.x, player.y, 60);
    if (near) { near.bombArmed = true; ui.subtitle('Bom geplaatst! Klik rechts om te detoneren.'); audio.pickup(); }
    return;
  }

  const crusher = missions.nearestOf(CAR_CRUSHERS, player.x, player.y);
  if (crusher) {
    const near = findNearbyVehicle(vehicles, player.x, player.y, 60);
    if (near) { destroyVehicle(near, 'player'); player.cash += 80; ui.subtitle('Auto verpletterd! +€80'); audio.pickup(); }
    return;
  }

  const food = missions.nearestOf(FOOD_VENDORS, player.x, player.y);
  if (food && player.cash >= 15) {
    player.cash -= 15;
    player.health = Math.min(100, player.health + 35);
    ui.subtitle('Gezondheid aangevuld!');
    audio.pickup();
    return;
  }
}

// ---- Melee & shooting ------------------------------------------------------------
function meleeAttack() {
  const w = WEAPONS.fists;
  for (const p of pedestrians) {
    if (!p.alive) continue;
    if (Math.hypot(p.x - player.x, p.y - player.y) < w.range) {
      p.takeDamage(w.damage);
      audio.impact();
      if (!p.alive) registerKill(p);
    }
  }
  for (const u of wanted.units) {
    if (!u.alive) continue;
    if (Math.hypot(u.x - player.x, u.y - player.y) < w.range) { u.takeDamage(w.damage); audio.impact(); }
  }
}

// ---- Main update ------------------------------------------------------------
let last = performance.now();
let frenzyPickupT = 8 + Math.random() * 10;

function update(dt) {
  // world-space mouse & aim angle
  const worldMouseX = camera.x - camera.w / 2 + input.mouse.x;
  const worldMouseY = camera.y - camera.h / 2 + input.mouse.y;
  player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

  if (input.pressed('KeyE')) tryInteract();
  if (input.pressed('KeyQ') && player.weapons.length > 1) {
    player.weaponIndex = (player.weaponIndex + 1) % player.weapons.length;
    audio.click(600);
  }

  if (player.inVehicle) {
    const v = player.inVehicle;
    v.update(dt, input);
    player.x = v.x; player.y = v.y;
    audio.updateEngine(v.vel / v.type.maxSpeed);

    if (input.mouse.rightDown && v.bombArmed) {
      explodeAt(v.x, v.y, 90, 'player');
      v.bombArmed = false;
    }
  } else {
    player.update(dt, input);

    if (input.mouse.down) {
      const wk = player.currentWeapon();
      if (!player._fireCd || player._fireCd <= 0) {
        const def = WEAPONS[wk];
        player._fireCd = def.rate;
        if (def.melee) { meleeAttack(); }
        else if (player.ammo[wk] === undefined || player.ammo[wk] > 0) {
          if (player.ammo[wk] !== undefined) player.ammo[wk]--;
          fireWeapon(player.x, player.y, player.angle, wk, 'player');
        }
      }
    }
    if (player._fireCd > 0) player._fireCd -= dt;
  }

  // right click = melee on foot (one-shot per press, using justPressed pattern via mouse state edge)
  if (!player.inVehicle && input.mouse.rightDown && !player._meleeLock) {
    player._meleeLock = true;
    meleeAttack();
  }
  if (!input.mouse.rightDown) player._meleeLock = false;

  for (const v of vehicles) if (v !== player.inVehicle) v.update(dt, null);

  for (const p of pedestrians) p.update(dt, null, player);

  wanted.update(dt, player, (x, y, a, key) => fireWeapon(x, y, a, key, 'police'), null);

  for (const b of bullets) {
    b.update(dt);
    const w = WEAPONS[b.weaponKey];
    if (b.owner === 'player') {
      for (const p of pedestrians) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < 10) {
          if (w.explosive) explodeAt(b.x, b.y, 70, 'player');
          else { p.takeDamage(w.damage); if (!p.alive) registerKill(p); }
          b.dead = true; break;
        }
      }
      if (!b.dead) for (const u of wanted.units) {
        if (!u.alive) continue;
        if (Math.hypot(u.x - b.x, u.y - b.y) < 10) {
          if (w.explosive) explodeAt(b.x, b.y, 70, 'player');
          else u.takeDamage(w.damage);
          b.dead = true; break;
        }
      }
      if (!b.dead) for (const v of vehicles) {
        if (v.wrecked || v.exploding) continue;
        const box = v.aabb();
        if (b.x > box.x0 && b.x < box.x1 && b.y > box.y0 && b.y < box.y1) {
          if (w.explosive) { explodeAt(b.x, b.y, 90, 'player'); }
          else { v.health -= w.damage; if (v.health <= 0) destroyVehicle(v, 'player'); }
          b.dead = true; break;
        }
      }
    } else if (b.owner === 'police') {
      if (Math.hypot(player.x - b.x, player.y - b.y) < 12) {
        if (w.explosive) explodeAt(b.x, b.y, 70, 'police');
        else player.takeDamage(w.damage);
        b.dead = true;
      }
    }
  }
  for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].dead) bullets.splice(i, 1);

  for (const ex of explosions) ex.update(dt);
  for (let i = explosions.length - 1; i >= 0; i--) if (explosions[i].dead) explosions.splice(i, 1);

  missions.update(dt, player);

  // kill frenzy timer / spawn
  if (killFrenzy) {
    killFrenzy.timer -= dt;
    if (killFrenzy.kills >= killFrenzy.target) {
      player.cash += killFrenzy.bonus;
      ui.subtitle(`Kill Frenzy voltooid! +€${killFrenzy.bonus}`);
      killFrenzy = null;
    } else if (killFrenzy.timer <= 0) {
      ui.subtitle('Kill Frenzy mislukt!');
      killFrenzy = null;
    }
  } else {
    frenzyPickupT -= dt;
    if (frenzyPickupT <= 0 && Math.hypot(player.x - frenzyStar.x, player.y - frenzyStar.y) < 26) {
      killFrenzy = { kills: 0, target: 8, timer: 40, bonus: 500 };
      ui.subtitle('KILL FRENZY! Dood 8 vijanden in 40 seconden!');
      audio.pickup();
      frenzyPickupT = 40 + Math.random() * 30;
      frenzyStar.x = 3200 + Math.random() * 2000;
      frenzyStar.y = 2000 + Math.random() * 2000;
    }
  }

  if (!player.alive) {
    respawnTimer -= dt;
    if (respawnTimer <= 0) {
      const s = findSpawnPoint();
      player.respawn(s.x, s.y);
      respawnTimer = 3;
    }
  }

  // respawn thinned-out pedestrians near player
  if (pedestrians.length < 26) spawnPedestriansAround(pedestrians, player.x, player.y, 4);
  for (let i = pedestrians.length - 1; i >= 0; i--) {
    const p = pedestrians[i];
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d > 1400) pedestrians.splice(i, 1);
  }
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (v.driver) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d > 1600) vehicles.splice(i, 1);
  }
  if (vehicles.length < 10 && Math.random() < 0.02) {
    const a = Math.random() * Math.PI * 2;
    const r = 400 + Math.random() * 400;
    vehicles.push(new Vehicle(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, (Math.random() * CAR_TYPES.length) | 0));
  }

  camera.x += (player.x - camera.x) * Math.min(1, dt * 6);
  camera.y += (player.y - camera.y) * Math.min(1, dt * 6);
  camera.w = canvas.width; camera.h = canvas.height;

  audio.tickMusic(dt);
  ui.update(dt, player, wanted);
  input.endFrame();
}

let respawnTimer = 3;
const frenzyStar = { x: 5300, y: 2000 };

// ---- Rendering ------------------------------------------------------------
function drawRoadGrid(x0, y0, x1, y1) {
  ctx.fillStyle = '#2b2f33';
  const startX = Math.floor(x0 / CELL) * CELL;
  const startY = Math.floor(y0 / CELL) * CELL;
  for (let wy = startY; wy < y1; wy += CELL) {
    for (let wx = startX; wx < x1; wx += CELL) {
      const midx = wx + CELL / 2, midy = wy + CELL / 2;
      if (midy >= RIVER.y0 && midy < RIVER.y1) continue; // river handles its own cells
      const d = districtAt(midx, midy);
      if (!d) continue;
      const gridN = 4;
      const offX = Math.floor(d.rect.x / CELL) % gridN;
      const offY = Math.floor(d.rect.y / CELL) % gridN;
      const isRoadCol = ((Math.floor(wx / CELL) + offX) % gridN) === 0;
      const isRoadRow = ((Math.floor(wy / CELL) + offY) % gridN) === 0;
      const nearBridgeX = midx > 4180 - 40 && midx < 4460 + 40;
      const nearTunnelX = midx > 1980 - 40 && midx < 2260 + 40;
      if (isRoadCol || isRoadRow || nearBridgeX || nearTunnelX) {
        ctx.fillRect(wx, wy, CELL, CELL);
      }
    }
  }
}

function drawRiver(x0, y1) {
  ctx.fillStyle = '#12405e';
  ctx.fillRect(x0 < 0 ? 0 : 0, RIVER.y0, WORLD_SIZE, RIVER.y1 - RIVER.y0);
  const t = performance.now() / 800;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3;
  for (let wx = 0; wx < WORLD_SIZE; wx += 60) {
    ctx.beginPath();
    ctx.moveTo(wx, RIVER.y0 + 20 + Math.sin(t + wx * 0.01) * 6);
    ctx.lineTo(wx + 30, RIVER.y0 + 20 + Math.sin(t + wx * 0.01 + 1) * 6);
    ctx.stroke();
  }
  for (const c of CROSSINGS) {
    if (c.type === 'bridge') {
      ctx.fillStyle = '#8a8f94';
      ctx.fillRect(c.x0, RIVER.y0 - 10, c.x1 - c.x0, (RIVER.y1 - RIVER.y0) + 20);
      ctx.strokeStyle = '#4a4f54';
      ctx.lineWidth = 4;
      ctx.strokeRect(c.x0, RIVER.y0 - 10, c.x1 - c.x0, (RIVER.y1 - RIVER.y0) + 20);
      ctx.fillStyle = '#d9d9d9';
      ctx.fillRect(c.x0 + (c.x1 - c.x0) / 2 - 4, RIVER.y0 - 120, 8, 130);
    } else {
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(c.x0, RIVER.y0 - 10, c.x1 - c.x0, (RIVER.y1 - RIVER.y0) + 20);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(c.x0 + 10, RIVER.y0, c.x1 - c.x0 - 20, RIVER.y1 - RIVER.y0);
    }
  }
}

function drawBuilding(b) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(b.x + b.shadowLen, b.y + b.shadowLen, b.w, b.h);

  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = b.roof;
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x, b.y, b.w, b.h);

  // windows grid
  const cols = Math.max(1, Math.floor(b.w / 10));
  const rows = Math.max(1, Math.floor(b.h / 10));
  ctx.fillStyle = b.window;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = (r * 31 + c * 17 + b.litSeed * 1000) % 5;
      if (seed < 2) continue;
      ctx.globalAlpha = 0.55 + (seed / 5) * 0.4;
      ctx.fillRect(b.x + 3 + c * (b.w / cols), b.y + 3 + r * (b.h / rows), Math.max(2, b.w / cols - 4), Math.max(2, b.h / rows - 4));
    }
  }
  ctx.globalAlpha = 1;

  if (b.hasDoor) {
    ctx.fillStyle = '#241a12';
    const sides = [
      { x: b.x + b.w / 2 - 5, y: b.y - 2, w: 10, h: 6 },
      { x: b.x + b.w / 2 - 5, y: b.y + b.h - 4, w: 10, h: 6 },
      { x: b.x - 2, y: b.y + b.h / 2 - 5, w: 6, h: 10 },
      { x: b.x + b.w - 4, y: b.y + b.h / 2 - 5, w: 6, h: 10 },
    ];
    const s = sides[b.doorSide];
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }

  if (b.signage) {
    const blink = Math.floor(performance.now() / 500 + b.litSeed * 10) % 2 === 0;
    ctx.fillStyle = blink ? b.accent : 'rgba(255,255,255,0.25)';
    ctx.fillRect(b.x + b.w * 0.15, b.y - 10, b.w * 0.7, 7);
  }
}

function drawProp(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.kind === 'crane') {
    ctx.strokeStyle = '#c0632a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 40); ctx.lineTo(0, -60);
    ctx.lineTo(50, -60);
    ctx.stroke();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, -60); ctx.lineTo(40, -20);
    ctx.stroke();
  } else {
    const colors = ['#c0632a', '#3d6a9a', '#4a8a4a', '#c0a03a'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = colors[(i + (p.seed * 10 | 0)) % colors.length];
      ctx.fillRect(-20, -10 - i * 14, 44, 12);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeRect(-20, -10 - i * 14, 44, 12);
    }
  }
  ctx.restore();
}

function drawLandmark(lm) {
  ctx.save();
  ctx.translate(lm.x, lm.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(6, 6, lm.w, lm.h);
  switch (lm.type) {
    case 'tower':
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.moveTo(lm.w / 2, 0); ctx.lineTo(lm.w * 0.65, lm.h * 0.5); ctx.lineTo(lm.w * 0.55, lm.h);
      ctx.lineTo(lm.w * 0.45, lm.h); ctx.lineTo(lm.w * 0.35, lm.h * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff5050';
      ctx.beginPath(); ctx.arc(lm.w / 2, 0, 5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'arch':
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.moveTo(0, lm.h); ctx.quadraticCurveTo(lm.w / 2, -lm.h * 0.4, lm.w, lm.h);
      ctx.lineTo(lm.w, lm.h * 0.6); ctx.quadraticCurveTo(lm.w / 2, -lm.h * 0.05, 0, lm.h * 0.6);
      ctx.closePath(); ctx.fill();
      break;
    case 'cubes':
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(i * (lm.w / 5) + lm.w / 10, lm.h / 2);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = lm.color;
        ctx.fillRect(-22, -22, 44, 44);
        ctx.strokeStyle = '#8a6a10';
        ctx.strokeRect(-22, -22, 44, 44);
        ctx.restore();
      }
      break;
    case 'towers':
      ctx.fillStyle = lm.color;
      ctx.fillRect(0, lm.h * 0.1, lm.w * 0.3, lm.h * 0.9);
      ctx.fillRect(lm.w * 0.35, 0, lm.w * 0.3, lm.h);
      ctx.fillRect(lm.w * 0.7, lm.h * 0.15, lm.w * 0.3, lm.h * 0.85);
      break;
    case 'roundabout':
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.arc(lm.w / 2, lm.h / 2, lm.w / 2 - 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#3a5c3a';
      ctx.beginPath();
      ctx.arc(lm.w / 2, lm.h / 2, lm.w / 2 - 40, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();

  if (lm.type !== 'label' && lm.type !== 'roundabout') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(lm.name, lm.x + lm.w / 2, lm.y - 16);
  } else if (lm.type === 'label') {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(lm.name, lm.x, lm.y);
  } else {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(lm.name, lm.x + lm.w / 2, lm.y - 4);
  }
}

function drawServiceMarker(x, y, label, color) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(performance.now() / 300) * 3;
  ctx.translate(0, bob);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -20, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y - 34);
}

function render() {
  ctx.save();
  ctx.translate(-camera.x + camera.w / 2, -camera.y + camera.h / 2);

  const x0 = camera.x - camera.w / 2 - 100, y0 = camera.y - camera.h / 2 - 100;
  const x1 = camera.x + camera.w / 2 + 100, y1 = camera.y + camera.h / 2 + 100;

  // ground base color per-district (broad strokes, then roads/buildings on top)
  for (const d of DISTRICTS) {
    const r = d.rect;
    if (r.x + r.w < x0 || r.x > x1 || r.y + r.h < y0 || r.y > y1) continue;
    ctx.fillStyle = '#1e2226';
    ctx.fillRect(Math.max(r.x, x0), Math.max(r.y, y0), Math.min(r.x + r.w, x1) - Math.max(r.x, x0), Math.min(r.y + r.h, y1) - Math.max(r.y, y0));
  }

  drawRoadGrid(x0, y0, x1, y1);
  drawRiver(x0, x1);

  for (const b of buildingsInRect(x0, y0, x1, y1)) drawBuilding(b);
  for (const p of propsInRect(x0, y0, x1, y1)) drawProp(p);
  for (const lm of LANDMARKS) {
    if (lm.x + lm.w < x0 || lm.x > x1 || lm.y + lm.h < y0 || lm.y > y1) continue;
    drawLandmark(lm);
  }

  for (const p of PAYPHONES) drawServiceMarker(p.x, p.y, 'Telefooncel', '#ffdd33');
  for (const s of SPRAYSHOPS) drawServiceMarker(s.x, s.y, s.name, '#33ff77');
  for (const s of BOMBSHOPS) drawServiceMarker(s.x, s.y, s.name, '#ff5533');
  for (const s of CAR_CRUSHERS) drawServiceMarker(s.x, s.y, s.name, '#aaaaaa');
  for (const s of FOOD_VENDORS) drawServiceMarker(s.x, s.y, s.name, '#ff9933');

  if (!killFrenzy && frenzyPickupT <= 0) {
    ctx.save();
    ctx.translate(frenzyStar.x, frenzyStar.y);
    ctx.rotate(performance.now() / 300);
    ctx.fillStyle = '#ff2d95';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('★', 0, 8);
    ctx.restore();
  }

  for (const v of vehicles) v.draw(ctx);
  for (const p of pedestrians) p.draw(ctx);
  wanted.draw(ctx);
  for (const b of bullets) b.draw(ctx);
  player.draw(ctx);
  for (const ex of explosions) ex.draw(ctx);

  ctx.restore();
}

// ---- Loop ------------------------------------------------------------
let running = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (running && !menu.paused) update(dt);
  render();
  requestAnimationFrame(frame);
}

const menu = new MenuController({
  onStart: () => {
    running = true;
    audio.resume();
    last = performance.now();
  },
});

document.addEventListener('click', () => audio.resume(), { once: true });

requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
