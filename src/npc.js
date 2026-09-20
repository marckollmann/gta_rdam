import { collidesSolid, districtAt, DISTRICTS } from './world.js';

// Gangs mapped roughly to districts for the respect/territory system.
export const GANGS = [
  { id: 'havenrats', name: 'Havenratten', color: '#c0632a', home: 'harbour' },
  { id: 'zuidbenden', name: 'Zuid Bende', color: '#8a3d2e', home: 'katendrecht' },
  { id: 'delfsecrew', name: 'Delfse Crew', color: '#4a7a3d', home: 'delfshaven' },
  { id: 'neonsyndicaat', name: 'Neon Syndicaat', color: '#ff2d95', home: 'centrum' },
];

export function gangForDistrict(districtId) {
  return GANGS.find(g => g.home === districtId) || null;
}

let idCounter = 1;

export class Pedestrian {
  constructor(x, y, gang = null) {
    this.id = idCounter++;
    this.x = x; this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 26 + Math.random() * 18;
    this.health = 30;
    this.alive = true;
    this.gang = gang; // null = civilian
    this.hostileTimer = 0;
    this.wanderT = Math.random() * 2;
    this.fleeing = false;
    this.shade = 0.7 + Math.random() * 0.3;
    this.hue = Math.floor(Math.random() * 360);
  }

  isHostileTo(player) {
    if (!this.gang) return false;
    const rep = player.respect[this.gang.id] || 0;
    return rep <= -25;
  }

  update(dt, world, player) {
    if (!this.alive) return;

    if (this.fleeing) {
      const dx = this.x - player.x, dy = this.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      this.angle = Math.atan2(dy / d, dx / d);
      this.move(dt, this.speed * 1.8);
      return;
    }

    const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
    if (this.isHostileTo(player) && distToPlayer < 260) {
      const dx = player.x - this.x, dy = player.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.angle = Math.atan2(dy / d, dx / d);
      this.move(dt, this.speed * 1.3);
      return;
    }

    if (distToPlayer < 60 && !this.gang) {
      this.fleeing = Math.random() < 0.02;
    }

    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.angle += (Math.random() - 0.5) * 2;
      this.wanderT = 1 + Math.random() * 2;
    }
    this.move(dt, this.speed);
  }

  move(dt, speed) {
    const dx = Math.cos(this.angle) * speed * dt;
    const dy = Math.sin(this.angle) * speed * dt;
    const nx = this.x + dx, ny = this.y + dy;
    if (!collidesSolid(nx - 7, ny - 7, 14, 14)) {
      this.x = nx; this.y = ny;
    } else {
      this.angle += Math.PI * 0.5 + Math.random();
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) { this.health = 0; this.alive = false; }
    else this.fleeing = !this.gang;
  }

  draw(ctx) {
    if (!this.alive) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = 'rgba(90,10,10,0.8)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(0, 0, 9.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.gang ? this.gang.color : `hsl(${this.hue},65%,${45 * this.shade}%)`;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c48d';
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnPedestriansAround(list, x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 100 + Math.random() * 500;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (collidesSolid(px - 8, py - 8, 16, 16)) continue;
    const d = districtAt(px, py);
    const gang = d && Math.random() < 0.25 ? gangForDistrict(d.id) : null;
    list.push(new Pedestrian(px, py, gang));
  }
}
