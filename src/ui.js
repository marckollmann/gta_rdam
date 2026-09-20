import { WEAPONS } from './weapons.js';
import { WORLD_SIZE, DISTRICTS, RIVER } from './world.js';
import { GANGS } from './npc.js';

export class UI {
  constructor() {
    this.healthBar = document.getElementById('health-bar');
    this.armorBar = document.getElementById('armor-bar');
    this.weaponInfo = document.getElementById('weapon-info');
    this.wantedStars = document.getElementById('wanted-stars');
    this.cashEl = document.getElementById('cash');
    this.respectEl = document.getElementById('respect-list');
    this.missionEl = document.getElementById('mission-brief');
    this.subtitleEl = document.getElementById('subtitle');
    this.minimap = document.getElementById('minimap');
    this.mctx = this.minimap.getContext('2d');
    this._subtitleT = 0;
  }

  missionBrief(text) { this.missionEl.textContent = text; }

  subtitle(text, dur = 2.5) {
    this.subtitleEl.textContent = text;
    this._subtitleT = dur;
  }

  update(dt, player, wanted) {
    this.healthBar.style.width = Math.max(0, player.health) + '%';
    this.armorBar.style.width = Math.max(0, player.armor) + '%';
    const wk = WEAPONS[player.currentWeapon()];
    const ammo = player.ammo[player.currentWeapon()];
    this.weaponInfo.textContent = wk.name + (ammo !== undefined ? `  x${ammo}` : '');
    this.wantedStars.innerHTML =
      '<span style="color:#ffdd33">' + '★'.repeat(wanted.level) + '</span>' +
      '<span style="color:rgba(255,255,255,0.25)">' + '★'.repeat(5 - wanted.level) + '</span>';
    this.cashEl.textContent = '€' + Math.floor(player.cash);

    let html = '';
    for (const g of GANGS) {
      const r = Math.round(player.respect[g.id] || 0);
      html += `<div style="color:${g.color}">${g.name}: ${r > 0 ? '+' : ''}${r}</div>`;
    }
    this.respectEl.innerHTML = html;

    if (this._subtitleT > 0) {
      this._subtitleT -= dt;
      if (this._subtitleT <= 0) this.subtitleEl.textContent = '';
    }

    this.drawMinimap(player, wanted);
  }

  drawMinimap(player, wanted) {
    const ctx = this.mctx;
    const size = this.minimap.width;
    const scale = size / WORLD_SIZE;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#0a1420';
    ctx.fillRect(0, 0, size, size);

    for (const d of DISTRICTS) {
      ctx.fillStyle = d.palette.building[0];
      ctx.globalAlpha = 0.35;
      ctx.fillRect(d.rect.x * scale, d.rect.y * scale, d.rect.w * scale, d.rect.h * scale);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1c4a6e';
    ctx.fillRect(0, RIVER.y0 * scale, size, (RIVER.y1 - RIVER.y0) * scale);

    // player
    ctx.fillStyle = '#33d9ff';
    ctx.beginPath();
    ctx.arc(player.x * scale, player.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // viewport box drawn by caller via camera if desired (kept simple here)
  }
}
