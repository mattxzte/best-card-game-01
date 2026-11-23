// Ember Duel — the table renderer.
// Draws the whole game on one canvas: title screen, the duel table, and the
// win / loss screens. It also reports the clickable regions it drew, so the
// input layer never has to guess where a card sits.

const CANVAS_W = 1280;
const CANVAS_H = 800;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFlame(ctx, cx, cy, size, hue) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 60, size / 60);
  const grad = ctx.createLinearGradient(0, -28, 0, 22);
  grad.addColorStop(0, 'hsl(' + hue + ', 95%, 62%)');
  grad.addColorStop(0.6, 'hsl(' + hue + ', 90%, 50%)');
  grad.addColorStop(1, 'hsl(' + (hue + 20) + ', 85%, 38%)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.bezierCurveTo(14, -8, 20, 2, 16, 14);
  ctx.bezierCurveTo(13, 22, 6, 24, 0, 24);
  ctx.bezierCurveTo(-6, 24, -13, 22, -16, 14);
  ctx.bezierCurveTo(-20, 2, -14, -8, 0, -28);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 240, 180, 0.9)';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(7, 2, 8, 10, 4, 15);
  ctx.bezierCurveTo(2, 17, -2, 17, -4, 15);
  ctx.bezierCurveTo(-8, 10, -7, 2, 0, -8);
  ctx.fill();
  ctx.restore();
}

function drawBurst(ctx, cx, cy, size, hue) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'hsl(' + hue + ', 90%, 55%)';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const a2 = a + Math.PI / 8;
    ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
    ctx.lineTo(Math.cos(a2) * size * 0.18, Math.sin(a2) * size * 0.18);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCardFace(ctx, card, x, y, w, h, opts) {
  const o = opts || {};
  const affordable = o.affordable !== false;
  const dim = !affordable;
  ctx.save();
  if (dim) ctx.globalAlpha = 0.55;
  rr(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#f7e8c8';
  ctx.fill();
  ctx.lineWidth = o.selected ? 4 : 2;
  ctx.strokeStyle = o.selected ? '#ffd94a' : '#7a4a1a';
  ctx.stroke();

  // Cost gem.
  ctx.fillStyle = '#2b6cb0';
  ctx.beginPath();
  ctx.arc(x + 20, y + 20, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), x + 20, y + 21);

  // Art band.
  const artH = h * 0.36;
  rr(ctx, x + 8, y + 40, w - 16, artH, 6);
  ctx.fillStyle = 'hsl(' + card.hue + ', 45%, 22%)';
  ctx.fill();
  if (card.kind === CARD_KINDS.CREATURE) drawFlame(ctx, x + w / 2, y + 40 + artH / 2, 48, card.hue);
  else drawBurst(ctx, x + w / 2, y + 40 + artH / 2, 48, card.hue);

  // Name.
  const nameY = y + 40 + artH + 18;
  ctx.fillStyle = '#2a1608';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.name, x + w / 2, nameY, w - 14);

  // Board creatures are compact: name and stats only, so nothing spills.
  if (!o.compact) {
    ctx.font = 'italic 12px Georgia, serif';
    ctx.fillStyle = '#5a3a1a';
    const label = card.kind === CARD_KINDS.CREATURE ? 'Creature' : 'Spell';
    ctx.fillText(label, x + w / 2, nameY + 17);
    ctx.font = '11px Georgia, serif';
    wrapText(ctx, card.text, x + w / 2, nameY + 34, w - 18, 13);
  }

  // Stats for creatures, bottom corners, clear of the text above.
  if (card.kind === CARD_KINDS.CREATURE) {
    const sy = y + h - 16;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(x + 18, sy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.arc(x + w - 18, sy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillText(String(card.attack), x + 18, sy + 1);
    ctx.fillText(String(card.health), x + w - 18, sy + 1);
  }
  if (o.hover) {
    rr(ctx, x - 2, y - 2, w + 4, h + 4, 12);
    ctx.strokeStyle = 'rgba(255, 217, 74, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, y + i * lineH);
  }
}

function drawCardBack(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#5a1f0d';
  ctx.fill();
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawFlame(ctx, x + w / 2, y + h / 2, 34, 22);
}

function drawHeroPanel(ctx, hero, x, y, w, isEnemy, state) {
  rr(ctx, x, y, w, 92, 10);
  ctx.fillStyle = isEnemy ? '#3a1420' : '#123a2a';
  ctx.fill();
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f7e8c8';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(hero.name, x + 14, y + 28);
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillStyle = '#ff6b5e';
  ctx.fillText('♥ ' + hero.life + ' / ' + hero.maxLife, x + 14, y + 60);
  // Ember pips.
  for (let i = 0; i < EMBER_CAP; i++) {
    ctx.beginPath();
    ctx.arc(x + 16 + i * 20, y + 80, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < hero.ember ? '#4aa3ff' : 'rgba(255,255,255,0.18)';
    ctx.fill();
  }
  ctx.fillStyle = '#c9a06a';
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText('Deck: ' + hero.deck.length, x + w - 12, y + 28);
  ctx.fillText('Ember ' + hero.ember + '/' + hero.maxEmber, x + w - 12, y + 60);
}

function drawButton(ctx, x, y, w, h, label, enabled) {
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = enabled ? '#b3541e' : '#4a3a28';
  ctx.fill();
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = enabled ? '#fff' : '#9a8a70';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

function drawTable(ctx, state, hover) {
  const regions = [];
  // Felt.
  const felt = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  felt.addColorStop(0, '#33200f');
  felt.addColorStop(0.5, '#241609');
  felt.addColorStop(1, '#1a0f06');
  ctx.fillStyle = felt;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = 'rgba(217, 164, 65, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(CANVAS_W / 2, CANVAS_H / 2, 560, 330, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Enemy hero + hand backs.
  drawHeroPanel(ctx, state.enemy, 36, 22, 300, true, state);
  for (let i = 0; i < state.enemy.hand.length; i++) {
    drawCardBack(ctx, 700 + i * 68, 26, 58, 82);
  }
  ctx.fillStyle = '#c9a06a';
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Turn ' + state.turnCount + ' — ' + (state.turn === 'player' ? 'your move' : 'Warden thinking…'), 36, 140);

  // Enemy board.
  const eBoard = state.enemy.board;
  const eStartX = (CANVAS_W - eBoard.length * 136) / 2;
  for (let i = 0; i < eBoard.length; i++) {
    const c = eBoard[i];
    const x = eStartX + i * 136;
    const y = 158;
    const isTarget = hover && hover.kind === 'enemy-creature' && hover.index === i;
    drawCardFace(ctx, { ...c, cost: cardById(c.id).cost, text: cardById(c.id).text, kind: CARD_KINDS.CREATURE }, x, y, 120, 150, { hover: isTarget, compact: true });
    regions.push({ kind: 'enemy-creature', index: i, x, y, w: 120, h: 150 });
  }
  // Enemy hero target.
  regions.push({ kind: 'enemy-hero', x: 36, y: 22, w: 300, h: 92 });

  // Middle band: log + end turn.
  ctx.fillStyle = '#f7e8c8';
  ctx.font = 'italic 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.log, CANVAS_W / 2, 348);
  const canEnd = state.phase === 'play' && state.turn === 'player';
  drawButton(ctx, 1060, 322, 180, 44, 'End Turn', canEnd);
  regions.push({ kind: 'end-turn', x: 1060, y: 322, w: 180, h: 44 });

  // Player board.
  const pBoard = state.player.board;
  const pStartX = (CANVAS_W - pBoard.length * 136) / 2;
  for (let i = 0; i < pBoard.length; i++) {
    const c = pBoard[i];
    const x = pStartX + i * 136;
    const y = 386;
    const isSel = state.selected === i;
    const isHover = hover && hover.kind === 'player-creature' && hover.index === i;
    drawCardFace(ctx, { ...c, cost: cardById(c.id).cost, text: cardById(c.id).text, kind: CARD_KINDS.CREATURE }, x, y, 120, 150, {
      selected: isSel,
      hover: isHover || isSel,
      compact: true,
    });
    regions.push({ kind: 'player-creature', index: i, x, y, w: 120, h: 150 });
  }

  // Player hero + hand.
  drawHeroPanel(ctx, state.player, 36, 560, 300, false, state);
  const hand = state.player.hand;
  const hStartX = 380 + Math.max(0, (CANVAS_W - 380 - hand.length * 150) / 2);
  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    const x = hStartX + i * 150;
    const y = 580;
    const affordable = card.cost <= state.player.ember && state.phase === 'play' && state.turn === 'player';
    const isHover = hover && hover.kind === 'hand' && hover.index === i;
    drawCardFace(ctx, card, x, y, 140, 200, { affordable, hover: isHover });
    regions.push({ kind: 'hand', index: i, x, y, w: 140, h: 200 });
  }
  return regions;
}

function drawTitle(ctx, state) {
  const felt = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  felt.addColorStop(0, '#2b1408');
  felt.addColorStop(1, '#120a04');
  ctx.fillStyle = felt;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (let i = 0; i < 40; i++) {
    drawFlame(ctx, 60 + ((i * 173) % 1160), 120 + ((i * 97) % 560), 10 + (i % 3) * 8, 20 + (i % 4) * 12);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 96px Georgia, serif';
  ctx.fillText('EMBER DUEL', CANVAS_W / 2, 300);
  ctx.fillStyle = '#f7e8c8';
  ctx.font = 'italic 28px Georgia, serif';
  ctx.fillText('A card battler of flame and cunning', CANVAS_W / 2, 350);
  ctx.font = '18px Georgia, serif';
  ctx.fillStyle = '#c9a06a';
  ctx.fillText('Outwit the Cinder Warden. Spend embers, summon creatures, break their guard.', CANVAS_W / 2, 400);
  ctx.fillText('First to 0 life loses. Click a card to play it — click your creature, then an enemy, to attack.', CANVAS_W / 2, 430);
  drawButton(ctx, CANVAS_W / 2 - 130, 500, 260, 64, 'Begin the Duel', true);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#8a6a42';
  ctx.fillText('Keys: 1-5 play cards · Enter ends turn · R restarts · M mutes', CANVAS_W / 2, 610);
  return [{ kind: 'begin', x: CANVAS_W / 2 - 130, y: 500, w: 260, h: 64 }];
}

function drawEndScreen(ctx, state, won) {
  drawTable(ctx, state, null);
  ctx.fillStyle = 'rgba(10, 5, 2, 0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  rr(ctx, 340, 230, 600, 340, 16);
  ctx.fillStyle = won ? '#123a2a' : '#3a1420';
  ctx.fill();
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#7dffb0' : '#ff8a7a';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText(won ? 'VICTORY' : 'DEFEAT', CANVAS_W / 2, 330);
  ctx.fillStyle = '#f7e8c8';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText(won ? 'The Cinder Warden falls. Your flame burns on.' : 'Your flame gutters out. The Warden wins.', CANVAS_W / 2, 380);
  ctx.font = '19px Georgia, serif';
  ctx.fillText('Duel lasted ' + state.turnCount + (state.turnCount === 1 ? ' turn' : ' turns') + ' · Your life: ' + state.player.life + ' · Warden life: ' + state.enemy.life, CANVAS_W / 2, 430);
  drawButton(ctx, CANVAS_W / 2 - 130, 470, 260, 56, 'Play Again (R)', true);
  return [{ kind: 'restart', x: CANVAS_W / 2 - 130, y: 470, w: 260, h: 56 }];
}

function renderGame(ctx, state, hover) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (state.phase === 'title') return drawTitle(ctx, state);
  if (state.phase === 'won') return drawEndScreen(ctx, state, true);
  if (state.phase === 'lost') return drawEndScreen(ctx, state, false);
  return drawTable(ctx, state, hover);
}
