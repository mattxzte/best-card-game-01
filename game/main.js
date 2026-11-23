// Ember Duel — input, sound and the game loop.
// Wires clicks and keys to the engine, keeps a tiny WebAudio blip set for
// feedback, and re-renders after every change.

(function () {
  const canvas = document.getElementById('table');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene');
  const seed = Number(params.get('seed') || 20261123);

  let state = newGame(seed);
  let hover = null;
  let regions = [];
  let muted = false;
  let audio = null;

  function blip(freq, dur) {
    if (muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.12, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + dur);
    } catch (e) {
      muted = true;
    }
  }

  function draw() {
    regions = renderGame(ctx, state, hover);
  }

  function pointIn(r, x, y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function regionAt(x, y) {
    for (let i = regions.length - 1; i >= 0; i--) {
      if (pointIn(regions[i], x, y)) return regions[i];
    }
    return null;
  }

  function canvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (event.clientY - rect.top) * (CANVAS_H / rect.height),
    };
  }

  function clickAt(x, y) {
    const region = regionAt(x, y);
    if (!region) {
      state.selected = null;
      draw();
      return;
    }
    if (region.kind === 'begin') {
      beginDuel(state);
      blip(660, 0.15);
      draw();
      return;
    }
    if (region.kind === 'restart') {
      state = newGame(seed);
      beginDuel(state);
      draw();
      return;
    }
    if (state.phase !== 'play' || state.turn !== 'player') return;
    if (region.kind === 'end-turn') {
      blip(330, 0.12);
      endTurn(state);
      draw();
      return;
    }
    if (region.kind === 'hand') {
      if (playCard(state, 'player', region.index)) blip(520, 0.12);
      state.selected = null;
      draw();
      return;
    }
    if (region.kind === 'player-creature') {
      const creature = state.player.board[region.index];
      if (creature && creature.canAttack) {
        state.selected = region.index;
        blip(440, 0.08);
      }
      draw();
      return;
    }
    if (state.selected !== null && (region.kind === 'enemy-creature' || region.kind === 'enemy-hero')) {
      const target = region.kind === 'enemy-hero' ? 'hero' : region.index;
      if (attack(state, 'player', state.selected, target)) blip(220, 0.18);
      state.selected = null;
      draw();
    }
  }

  canvas.addEventListener('click', (event) => {
    const p = canvasPos(event);
    clickAt(p.x, p.y);
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPos(event);
    const region = regionAt(p.x, p.y);
    const next = region ? { kind: region.kind, index: region.index } : null;
    if (JSON.stringify(next) !== JSON.stringify(hover)) {
      hover = next;
      draw();
    }
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'm') {
      muted = !muted;
      return;
    }
    if (state.phase === 'title' && (key === 'enter' || key === ' ')) {
      beginDuel(state);
      draw();
      return;
    }
    if ((state.phase === 'won' || state.phase === 'lost') && key === 'r') {
      state = newGame(seed);
      beginDuel(state);
      draw();
      return;
    }
    if (state.phase !== 'play' || state.turn !== 'player') return;
    if (key === 'enter') {
      endTurn(state);
      draw();
      return;
    }
    const num = Number(key);
    if (num >= 1 && num <= 5) {
      if (playCard(state, 'player', num - 1)) blip(520, 0.12);
      state.selected = null;
      draw();
    }
  });

  if (scene) setupScene(state, scene);
  draw();
})();
