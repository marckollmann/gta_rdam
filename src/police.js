import { collidesSolid } from './world.js';
import { drawHumanoid } from './sprites.js';

const LEVEL_NAMES = ['', 'POLITIE', 'POLITIE', 'SWAT', 'FBI', 'LEGER'];

export class PoliceUnit {
  constructor(x, y, level) {
    this.x = x; this.y = y;
    this.level = level;
    this.health = level >= 3 ? 80 : 40;
    this.alive = true;
    this.angle = 0;
    this.speed = 60 + level * 8;
    this.fireCd = 0;
    this.animT = Math.random() * 10;
  }

  update(dt, player, addBullet) {
    if (!this.alive) return;
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.angle = Math.atan2(dy, dx);

    if (d > 90) {
      const nx = this.x + (dx / d) * this.speed * dt;
      const ny = this.y + (dy / d) * this.speed * dt;
      if (!collidesSolid(nx - 8, ny - 8, 16, 16)) { this.x = nx; this.y = ny; this.animT += dt * 8; }
    }

    this.fireCd -= dt;
    if (d < 320 && this.fireCd <= 0) {
      this.fireCd = this.level >= 3 ? 0.35 : 0.9;
      addBullet(this.x, this.y, this.angle, this.level >= 4 ? 'rocket' : (this.level >= 2 ? 'shotgun' : 'pistol'));
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) { this.health = 0; this.alive = false; }
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    const colors = ['', '#1c3a8a', '#1c3a8a', '#2b2b2b', '#1a1a1a', '#3a4a2a'];
    const r = this.level >= 3 ? 11 : 9;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.5, r * 0.8, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    drawHumanoid(ctx, this.angle, r, colors[this.level] || '#1c3a8a', '#111318', true, this.animT, { hasWeapon: true });
    ctx.restore();
  }
}

export class WantedSystem {
  constructor() {
    this.level = 0;       // 0..5 stars
    this.heat = 0;         // internal float, thresholds bump `level`
    this.decayTimer = 0;
    this.units = [];
    this.spawnCd = 0;
  }

  addHeat(amount) {
    this.heat = Math.min(500, this.heat + amount);
    this.decayTimer = 8; // seconds before heat starts decaying
    this.level = Math.min(5, Math.floor(this.heat / 100) + (this.heat > 0 ? 1 : 0));
  }

  clear() {
    this.heat = 0; this.level = 0; this.units = [];
  }

  levelName() { return LEVEL_NAMES[this.level] || ''; }

  update(dt, player, addBullet, world) {
    if (this.heat > 0) {
      this.decayTimer -= dt;
      if (this.decayTimer <= 0) {
        this.heat = Math.max(0, this.heat - 12 * dt);
        this.level = this.heat <= 0 ? 0 : Math.min(5, Math.floor(this.heat / 100) + 1);
      }
    }

    this.spawnCd -= dt;
    const maxUnits = this.level * 2;
    if (this.level > 0 && this.units.filter(u => u.alive).length < maxUnits && this.spawnCd <= 0) {
      this.spawnCd = Math.max(0.6, 3 - this.level * 0.4);
      const a = Math.random() * Math.PI * 2;
      const dist = 380 + Math.random() * 140;
      this.units.push(new PoliceUnit(player.x + Math.cos(a) * dist, player.y + Math.sin(a) * dist, this.level));
    }

    for (const u of this.units) u.update(dt, player, addBullet);
    this.units = this.units.filter(u => u.alive || Math.random() > 0.002);
  }

  draw(ctx) {
    for (const u of this.units) u.draw(ctx);
  }
}
