import { GANGS, gangForDistrict } from './npc.js';

// ---- Fixed service locations, placed inside district bounds on buildable
// ground (approximate, clear of the road grid by margin). ----------------
export const PAYPHONES = [
  { x: 4820, y: 2450, district: 'centrum' },
  { x: 1800, y: 2800, district: 'delfshaven' },
  { x: 4400, y: 5000, district: 'kop-van-zuid' },
  { x: 4400, y: 6600, district: 'katendrecht' },
  { x: 6600, y: 5600, district: 'feijenoord' },
  { x: 1400, y: 6200, district: 'harbour' },
];

export const SPRAYSHOPS = [
  { x: 4550, y: 2200, name: 'Spuiterij Centrum' },
  { x: 1600, y: 6600, name: 'Spuiterij Haven' },
];

export const BOMBSHOPS = [
  { x: 1200, y: 5200, name: 'Bommenlegger Haven' },
];

export const CAR_CRUSHERS = [
  { x: 900, y: 6900, name: 'Autoverpletteraar' },
];

export const FOOD_VENDORS = [
  { x: 5000, y: 2650, name: 'Frietkraam' },
  { x: 4200, y: 6900, name: 'Snackbar Zuid' },
  { x: 6900, y: 5000, name: 'Cafetaria Feijenoord' },
];

const MISSION_TEMPLATES = [
  { text: 'Klap een rivaliserende dealer neer in {enemy}.', type: 'kill', respect: 20, cash: 300 },
  { text: 'Steel een auto en breng hem naar de haven.', type: 'deliver', respect: 12, cash: 250 },
  { text: 'Vernietig 3 voertuigen van {enemy}.', type: 'destroy', respect: 18, cash: 350 },
  { text: 'Overleef de aanval op ons territorium.', type: 'survive', respect: 25, cash: 400 },
];

export class MissionSystem {
  constructor(ui) {
    this.ui = ui;
    this.active = null;
    this.cooldowns = new Map();
  }

  nearestPayphone(x, y, range = 40) {
    let best = null, bd = range;
    for (const p of PAYPHONES) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  nearestOf(list, x, y, range = 46) {
    let best = null, bd = range;
    for (const p of list) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  startMissionAt(phone, player) {
    if (this.active) { this.ui.subtitle('Je hebt al een missie lopen.'); return; }
    const homeGang = gangForDistrict(phone.district);
    const rivals = GANGS.filter(g => g.id !== (homeGang && homeGang.id));
    const enemy = rivals[Math.floor(Math.random() * rivals.length)];
    const tpl = MISSION_TEMPLATES[Math.floor(Math.random() * MISSION_TEMPLATES.length)];
    this.active = {
      ...tpl,
      text: tpl.text.replace('{enemy}', enemy ? enemy.name : 'de stad'),
      giver: homeGang,
      enemy,
      progress: 0,
      target: tpl.type === 'destroy' ? 3 : 1,
      timer: 60,
    };
    this.ui.missionBrief(this.active.text);
    this.ui.subtitle('Missie gestart!');
  }

  applyRespect(player, gang, delta) {
    if (!gang) return;
    player.respect[gang.id] = Math.max(-100, Math.min(100, (player.respect[gang.id] || 0) + delta));
    for (const g of GANGS) {
      if (g.id === gang.id) continue;
      player.respect[g.id] = Math.max(-100, Math.min(100, (player.respect[g.id] || 0) - delta * 0.5));
    }
  }

  onEnemyKilled(player, gang) {
    if (!this.active || this.active.type !== 'kill') return;
    if (this.active.enemy && gang && this.active.enemy.id === gang.id) this.completeMission(player);
  }

  onVehicleDestroyed(player) {
    if (!this.active || this.active.type !== 'destroy') return;
    this.active.progress++;
    if (this.active.progress >= this.active.target) this.completeMission(player);
  }

  completeMission(player) {
    if (!this.active) return;
    player.cash += this.active.cash;
    this.applyRespect(player, this.active.giver, this.active.respect);
    this.ui.missionBrief('');
    this.ui.subtitle(`Missie voltooid! +€${this.active.cash}`);
    this.active = null;
  }

  failMission() {
    if (!this.active) return;
    this.ui.missionBrief('');
    this.ui.subtitle('Missie mislukt.');
    this.active = null;
  }

  update(dt, player) {
    if (this.active) {
      this.active.timer -= dt;
      if (this.active.timer <= 0) this.failMission();
    }
  }
}
