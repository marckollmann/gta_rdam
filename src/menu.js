export class MenuController {
  constructor({ onStart }) {
    this.onStart = onStart;
    this.menuOverlay = document.getElementById('menu-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.controlsPanel = document.getElementById('controls-panel');
    this.menuButtons = document.getElementById('menu-buttons');
    this.paused = false;
    this.started = false;

    document.getElementById('btn-start').addEventListener('click', () => this.start());
    document.getElementById('btn-controls').addEventListener('click', () => {
      this.menuButtons.classList.add('hidden');
      this.controlsPanel.classList.remove('hidden');
    });
    document.getElementById('btn-close-controls').addEventListener('click', () => {
      this.controlsPanel.classList.add('hidden');
      this.menuButtons.classList.remove('hidden');
    });
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause(false));

    window.addEventListener('keydown', (e) => {
      if (!this.started) return;
      if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause(!this.paused);
    });
  }

  start() {
    this.menuOverlay.classList.add('hidden');
    this.started = true;
    this.onStart();
  }

  togglePause(state) {
    this.paused = state;
    this.pauseOverlay.classList.toggle('hidden', !state);
  }
}
