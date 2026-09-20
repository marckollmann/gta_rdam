export const WEAPONS = {
  fists:   { name: 'Vuisten', damage: 8,  range: 22, melee: true, rate: 0.4 },
  pistol:  { name: 'Pistool', damage: 18, range: 420, rate: 0.28, spread: 0.05, bulletSpeed: 900, ammoMax: 60,  sound: 'pistol' },
  uzi:     { name: 'Uzi',     damage: 10, range: 380, rate: 0.08, spread: 0.12, bulletSpeed: 900, ammoMax: 150, sound: 'uzi' },
  shotgun: { name: 'Shotgun', damage: 12, range: 260, rate: 0.7,  spread: 0.28, bulletSpeed: 800, ammoMax: 40,  sound: 'shotgun', pellets: 6 },
  rocket:  { name: 'Bazooka', damage: 140, range: 700, rate: 1.1, spread: 0.01, bulletSpeed: 480, ammoMax: 8,   sound: 'rocket', explosive: true },
};

export class Bullet {
  constructor(x, y, angle, weaponKey, owner) {
    this.x = x; this.y = y;
    this.weaponKey = weaponKey;
    const w = WEAPONS[weaponKey];
    this.vx = Math.cos(angle) * w.bulletSpeed;
    this.vy = Math.sin(angle) * w.bulletSpeed;
    this.dist = 0;
    this.maxDist = w.range;
    this.owner = owner;
    this.dead = false;
  }

  update(dt) {
    const dx = this.vx * dt, dy = this.vy * dt;
    this.x += dx; this.y += dy;
    this.dist += Math.hypot(dx, dy);
    if (this.dist >= this.maxDist) this.dead = true;
  }

  draw(ctx) {
    const w = WEAPONS[this.weaponKey];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = w.explosive ? '#ff8a2d' : '#fff6c2';
    ctx.beginPath();
    ctx.arc(0, 0, w.explosive ? 4 : 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Explosion {
  constructor(x, y, radius = 60) {
    this.x = x; this.y = y;
    this.radius = radius;
    this.t = 0;
    this.dur = 0.5;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.dur) this.dead = true;
  }
  draw(ctx) {
    const p = this.t / this.dur;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * p + 4);
    grad.addColorStop(0, '#fff7c2');
    grad.addColorStop(0.4, '#ff9a2d');
    grad.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * p + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
