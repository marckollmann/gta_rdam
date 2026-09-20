// All sound is synthesized in real time with the Web Audio API — no sample files.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.musicTimer = 0;
    this.musicNextT = 0;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  now() { return this.ctx.currentTime; }

  click(freq = 800) {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.09);
  }

  gunshot(kind = 'pistol') {
    this.ensure();
    const t = this.now();
    const dur = kind === 'shotgun' ? 0.18 : kind === 'uzi' ? 0.07 : 0.1;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = kind === 'shotgun' ? 1800 : 3200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(kind === 'shotgun' ? 0.5 : 0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t);

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(kind === 'rocket' ? 90 : 180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + dur);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.25, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(og); og.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  explosion() {
    this.ensure();
    const t = this.now();
    const dur = 0.9;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.5);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1200, t);
    filt.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t);
  }

  impact() {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.16);
  }

  pickup() {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(1040, t + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.2);
  }

  siren(level) {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const base = 500 + level * 60;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base + 260, t + 0.28);
    osc.frequency.linearRampToValueAtTime(base, t + 0.56);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.05);
    g.gain.linearRampToValueAtTime(0.001, t + 0.56);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.58);
  }

  startEngine() {
    this.ensure();
    if (this.engineOsc) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 400;
    osc.connect(filt); filt.connect(g); g.connect(this.master);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = g;
    this.engineFilt = filt;
  }

  updateEngine(speedRatio) {
    if (!this.engineOsc) return;
    const t = this.now();
    this.engineOsc.frequency.setTargetAtTime(55 + Math.abs(speedRatio) * 220, t, 0.05);
    this.engineGain.gain.setTargetAtTime(0.05 + Math.min(1, Math.abs(speedRatio)) * 0.12, t, 0.08);
    this.engineFilt.frequency.setTargetAtTime(300 + Math.abs(speedRatio) * 900, t, 0.1);
  }

  stopEngine() {
    if (!this.engineOsc) return;
    try { this.engineOsc.stop(this.now() + 0.05); } catch (e) { /* already stopped */ }
    this.engineOsc = null;
    this.engineGain = null;
  }

  // Sparse ambient synth pad, ticked from the main loop; not a full track,
  // but genuine procedural music rather than silence.
  tickMusic(dt) {
    this.ensure();
    this.musicTimer += dt;
    if (this.musicTimer < this.musicNextT) return;
    this.musicNextT = this.musicTimer + 1.6 + Math.random() * 2.2;
    const scale = [220, 246.94, 261.63, 293.66, 329.63, 392, 440];
    const freq = scale[(Math.random() * scale.length) | 0] * (Math.random() < 0.5 ? 1 : 0.5);
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + 2.4);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 2.5);
  }
}

export const audio = new AudioEngine();
