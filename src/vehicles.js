import { collidesSolid, shade as shadeColor } from './world.js';

export const CAR_TYPES = [
  { name: 'Stadsauto', color: '#d43f3f', w: 34, h: 18, maxSpeed: 260, accel: 220, turn: 3.2, mass: 1 },
  { name: 'Taxi', color: '#e8c93a', w: 34, h: 18, maxSpeed: 240, accel: 210, turn: 3.4, mass: 1 },
  { name: 'Havenwagen', color: '#5a6a72', w: 40, h: 20, maxSpeed: 190, accel: 150, turn: 2.4, mass: 1.6 },
  { name: 'Sportwagen', color: '#2fd6c2', w: 32, h: 16, maxSpeed: 320, accel: 280, turn: 3.8, mass: 0.8 },
  { name: 'Politiewagen', color: '#1c3a8a', w: 34, h: 18, maxSpeed: 270, accel: 240, turn: 3.4, mass: 1, police: true },
];

let idCounter = 1;

export class Vehicle {
  constructor(x, y, typeIndex = 0) {
    this.id = idCounter++;
    this.type = CAR_TYPES[typeIndex];
    this.x = x; this.y = y;
    this.angle = -Math.PI / 2;
    this.vel = 0;          // forward speed, px/s (signed)
    this.health = 100;
    this.driver = null;     // 'player' | npc ref | null
    this.wrecked = false;
    this.bombArmed = false;
    this.exploding = false;
    this.explodeT = 0;
  }

  get w() { return this.type.w; }
  get h() { return this.type.h; }

  corners() {
    const { w, h } = this;
    const cos = Math.cos(this.angle), sin = Math.sin(this.angle);
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    return pts.map(([px, py]) => ({ x: this.x + px * cos - py * sin, y: this.y + px * sin + py * cos }));
  }

  aabb() {
    const c = this.corners();
    const xs = c.map(p => p.x), ys = c.map(p => p.y);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }

  explode() {
    if (this.exploding || this.wrecked) return;
    this.exploding = true;
    this.explodeT = 0;
  }

  update(dt, input) {
    if (this.exploding) {
      this.explodeT += dt;
      if (this.explodeT > 0.6) { this.wrecked = true; this.exploding = false; }
      return;
    }
    if (this.wrecked) return;

    if (this.driver === 'player' && input) {
      const throttle = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
      const steer = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);

      if (throttle !== 0) {
        this.vel += throttle * this.type.accel * dt;
      } else {
        // engine braking / friction
        const s = Math.sign(this.vel);
        this.vel -= s * this.type.accel * 0.6 * dt;
        if (Math.sign(this.vel) !== s) this.vel = 0;
      }
      this.vel = Math.max(-this.type.maxSpeed * 0.5, Math.min(this.type.maxSpeed, this.vel));

      const speedFactor = Math.min(1, Math.abs(this.vel) / 60);
      if (Math.abs(this.vel) > 1) {
        this.angle += steer * this.type.turn * dt * (this.vel < 0 ? -1 : 1) * speedFactor;
      }
    } else {
      // gentle friction to stop AI/unmanned cars drifting forever
      const s = Math.sign(this.vel);
      this.vel -= s * this.type.accel * 0.8 * dt;
      if (Math.sign(this.vel) !== s) this.vel = 0;
    }

    const dx = Math.cos(this.angle) * this.vel * dt;
    const dy = Math.sin(this.angle) * this.vel * dt;
    const nx = this.x + dx, ny = this.y + dy;
    const half = Math.max(this.w, this.h) / 2;
    if (!collidesSolid(nx - half, ny - half, half * 2, half * 2)) {
      this.x = nx; this.y = ny;
    } else {
      this.vel *= -0.15; // bounce/stop on impact
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.exploding) {
      const t = this.explodeT / 0.6;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = `rgba(255,${150 - t * 150 | 0},0,0.9)`;
      ctx.beginPath();
      ctx.arc(0, 0, 10 + t * 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.rotate(this.angle);

    // soft, slightly offset shadow (rendered-sprite look, not a hard block)
    ctx.save();
    ctx.translate(1.5, 2.5);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, this.h * 0.32);
    ctx.fill();
    ctx.restore();

    if (this.wrecked) {
      ctx.fillStyle = '#1c1815';
      ctx.beginPath();
      ctx.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, this.h * 0.32);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#050505';
      ctx.beginPath();
      ctx.roundRect(-this.w / 2 + 3, -this.h / 2 + 3, this.w - 6, this.h - 6, this.h * 0.2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // rounded chunky body with a subtle glossy gradient, GTA2's rendered-sprite look
    const grad = ctx.createLinearGradient(0, -this.h / 2, 0, this.h / 2);
    grad.addColorStop(0, shadeColor(this.type.color, 0.28));
    grad.addColorStop(0.5, this.type.color);
    grad.addColorStop(1, shadeColor(this.type.color, -0.22));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, this.h * 0.32);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // windshield band across the front third
    ctx.fillStyle = 'rgba(20,30,35,0.85)';
    ctx.beginPath();
    ctx.roundRect(this.w / 2 - this.w * 0.36, -this.h / 2 + 2, this.w * 0.22, this.h - 4, 2.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(170,220,240,0.55)';
    ctx.beginPath();
    ctx.roundRect(this.w / 2 - this.w * 0.34, -this.h / 2 + 3, this.w * 0.14, this.h - 6, 2);
    ctx.fill();

    // faint centerline seam + wheel shadows peeking from under the body
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-this.w / 2 + 3, 0); ctx.lineTo(this.w / 2 - 3, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const wx = this.w * 0.22;
    ctx.fillRect(-wx - 2, -this.h / 2 - 0.5, 4, 2);
    ctx.fillRect(-wx - 2, this.h / 2 - 1.5, 4, 2);
    ctx.fillRect(wx - 2, -this.h / 2 - 0.5, 4, 2);
    ctx.fillRect(wx - 2, this.h / 2 - 1.5, 4, 2);

    // headlights
    ctx.fillStyle = '#fff7c2';
    ctx.fillRect(this.w / 2 - 2, -this.h / 2 + 1.5, 2, 2.5);
    ctx.fillRect(this.w / 2 - 2, this.h / 2 - 4, 2, 2.5);

    if (this.type.police) {
      const blink = Math.floor(performance.now() / 200) % 2 === 0;
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.roundRect(-5, -this.h / 2 - 4.5, 10, 4.5, 1.5);
      ctx.fill();
      ctx.fillStyle = blink ? '#ff2b2b' : '#2b6bff';
      ctx.beginPath();
      ctx.roundRect(-4, -this.h / 2 - 3, 8, 3, 1);
      ctx.fill();
    }

    ctx.restore();
  }
}

export function findNearbyVehicle(vehicles, x, y, range = 40) {
  let best = null, bestD = range;
  for (const v of vehicles) {
    if (v.wrecked || v.driver) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}
