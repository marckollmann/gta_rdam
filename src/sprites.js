// Shared rounded humanoid sprite used by the player, pedestrians and police —
// a small top-down rendered figure (rounded torso, arms, head with hair,
// trailing legs) rather than a flat colour-blocked shape.

export function drawHumanoid(ctx, angle, R, shirtColor, pantsColor, moving, animT, opts = {}) {
  const { hasWeapon = false, skin = '#f2c48d', hair = '#2a1c12', outline = '#0a0a0a' } = opts;

  ctx.save();
  ctx.rotate(angle);

  const swing = moving ? Math.sin(animT) * R * 0.5 : 0;

  // trailing legs (rounded, offset by the walk cycle)
  for (const s of [1, -1]) {
    const lx = -R * 0.32 + swing * 0.16 * s;
    const ly = R * 0.42 * s;
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.ellipse(lx, ly, R * 0.34, R * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pantsColor;
    ctx.beginPath();
    ctx.ellipse(lx, ly, R * 0.27, R * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // arms (rounded, with one hand extended forward if armed)
  for (const s of [1, -1]) {
    const ax = hasWeapon && s === 1 ? R * 0.75 : R * 0.05;
    const ay = R * 0.72 * s;
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.ellipse(ax, ay, R * 0.28, R * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(ax, ay, R * 0.21, R * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // torso: rounded, with a soft shaded back edge for a pseudo-3D feel
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.ellipse(-R * 0.05, 0, R * 0.82, R * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.ellipse(-R * 0.05, 0, R * 0.7, R * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(-R * 0.32, 0, R * 0.4, R * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // weapon, drawn from the forward hand
  if (hasWeapon) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(R * 0.75, R * 0.72);
    ctx.lineTo(R * 1.8, R * 0.72 - R * 0.1);
    ctx.stroke();
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(R * 0.75, R * 0.72);
    ctx.lineTo(R * 1.8, R * 0.72 - R * 0.1);
    ctx.stroke();
  }

  // head, forward of the torso, with a hair cap on the back half
  const hx = R * 0.62;
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.ellipse(hx, 0, R * 0.56, R * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(hx, 0, R * 0.47, R * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(hx - R * 0.16, 0, R * 0.36, R * 0.44, 0, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();

  ctx.restore();
}
