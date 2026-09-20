import { collidesSolid } from './world.js';
import { drawHumanoid } from './sprites.js';

const WALK_SPEED = 90;      // px/s
const SPRINT_SPEED = 165;
const JUMP_DURATION = 0.45;
const RADIUS = 10;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = RADIUS * 2;
    this.h = RADIUS * 2;
    this.angle = 0;          // facing / aim angle (radians)
    this.moveAngle = 0;      // movement direction for legs animation
    this.speed = 0;
    this.health = 100;
    this.armor = 0;
    this.cash = 250;
    this.inVehicle = null;
    this.jumping = false;
    this.jumpT = 0;
    this.animT = 0;
    this.alive = true;
    this.weaponIndex = 0;
    this.weapons = ['fists'];
    this.ammo = {};
    this.wanted = 0;
    this.respect = {}; // districtId -> -100..100
  }

  get centerX() { return this.x; }
  get centerY() { return this.y; }

  currentWeapon() { return this.weapons[this.weaponIndex]; }

  tryMove(dx, dy) {
    if (dx === 0 && dy === 0) return;
    const nx = this.x + dx;
    const ny = this.y + dy;
    // slide along walls: attempt full move, else axis-separated.
    if (!collidesSolid(nx - RADIUS, ny - RADIUS, RADIUS * 2, RADIUS * 2)) {
      this.x = nx; this.y = ny; return;
    }
    if (!collidesSolid(nx - RADIUS, this.y - RADIUS, RADIUS * 2, RADIUS * 2)) { this.x = nx; return; }
    if (!collidesSolid(this.x - RADIUS, ny - RADIUS, RADIUS * 2, RADIUS * 2)) { this.y = ny; return; }
  }

  update(dt, input) {
    if (!this.alive) return;
    if (this.inVehicle) return; // vehicle module drives position while inside

    let mx = 0, my = 0;
    if (input.down('KeyW')) my -= 1;
    if (input.down('KeyS')) my += 1;
    if (input.down('KeyA')) mx -= 1;
    if (input.down('KeyD')) mx += 1;

    const moving = mx !== 0 || my !== 0;
    if (moving) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      this.moveAngle = Math.atan2(my, mx);
      const sprinting = input.down('ShiftLeft') || input.down('ShiftRight');
      this.speed = sprinting ? SPRINT_SPEED : WALK_SPEED;
      this.tryMove(mx * this.speed * dt, my * this.speed * dt);
      this.animT += dt * (sprinting ? 10 : 6);
    } else {
      this.speed = 0;
    }

    if (input.pressed('Space') && !this.jumping) {
      this.jumping = true;
      this.jumpT = 0;
    }
    if (this.jumping) {
      this.jumpT += dt;
      if (this.jumpT >= JUMP_DURATION) { this.jumping = false; this.jumpT = 0; }
    }
  }

  get jumpZ() {
    if (!this.jumping) return 0;
    const t = this.jumpT / JUMP_DURATION;
    return Math.sin(t * Math.PI) * 18;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.6);
      this.armor -= absorbed;
      amount -= absorbed;
    }
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
  }

  respawn(x, y) {
    this.x = x; this.y = y;
    this.health = 100;
    this.armor = 0;
    this.alive = true;
    this.wanted = Math.max(0, this.wanted - 1);
  }

  draw(ctx) {
    if (this.inVehicle) return;
    const z = this.jumpZ;
    ctx.save();
    ctx.translate(this.x, this.y - z);

    // shadow (stays on ground even mid-jump)
    ctx.save();
    ctx.translate(0, z);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, RADIUS * 0.6, RADIUS * 0.9, RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawHumanoid(ctx, this.angle, RADIUS, '#2f6fd6', '#20304a', this.speed > 0, this.animT, { hasWeapon: this.currentWeapon() !== 'fists' });

    ctx.restore();
  }
}
