// Ember Duel — the rules engine.
// Pure state and turns: no drawing here, no DOM here. The renderer reads
// this state; main.js feeds it clicks and keys.

const HERO_LIFE = 20;
const HAND_LIMIT = 7;
const BOARD_LIMIT = 5;
const EMBER_CAP = 10;

function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function freshHero(name, random) {
  return {
    name,
    life: HERO_LIFE,
    maxLife: HERO_LIFE,
    ember: 0,
    maxEmber: 0,
    deck: buildDeck(random),
    hand: [],
    board: [],
  };
}

function newGame(seed) {
  const random = makeRng(seed || 20261123);
  const state = {
    phase: 'title',
    turn: 'player',
    turnCount: 1,
    log: 'Welcome to Ember Duel. Press Enter or click Begin to play.',
    selected: null,
    random,
    player: freshHero('You', random),
    enemy: freshHero('Cinder Warden', random),
  };
  return state;
}

function drawCards(hero, count, state) {
  for (let i = 0; i < count; i++) {
    if (hero.hand.length >= HAND_LIMIT) break;
    const card = hero.deck.shift();
    if (!card) break;
    hero.hand.push(card);
  }
  return state;
}

function beginDuel(state) {
  state.phase = 'play';
  state.turn = 'player';
  state.turnCount = 1;
  drawCards(state.player, 4, state);
  drawCards(state.enemy, 4, state);
  startTurn(state, 'player');
  state.log = 'Your turn — play a card, then attack.';
  return state;
}

function startTurn(state, side) {
  const hero = side === 'player' ? state.player : state.enemy;
  hero.maxEmber = Math.min(EMBER_CAP, hero.maxEmber + 1);
  hero.ember = hero.maxEmber;
  for (const creature of hero.board) creature.canAttack = true;
  drawCards(hero, 1, state);
}

function playCard(state, side, handIndex) {
  const hero = side === 'player' ? state.player : state.enemy;
  const foe = side === 'player' ? state.enemy : state.player;
  const card = hero.hand[handIndex];
  if (!card || state.phase !== 'play') return false;
  if (hero.ember < card.cost) return false;
  if (card.kind === CARD_KINDS.CREATURE && hero.board.length >= BOARD_LIMIT) return false;

  hero.hand.splice(handIndex, 1);
  hero.ember -= card.cost;

  if (card.kind === CARD_KINDS.CREATURE) {
    hero.board.push({
      uid: card.uid,
      id: card.id,
      name: card.name,
      attack: card.attack,
      health: card.health,
      maxHealth: card.health,
      hue: card.hue,
      canAttack: false,
    });
    state.log = hero.name + ' summoned ' + card.name + '.';
  } else if (card.spell === 'bolt') {
    foe.life -= card.power;
    state.log = hero.name + ' hurled Ember Bolt for ' + card.power + ' damage.';
  } else if (card.spell === 'mend') {
    hero.life = Math.min(hero.maxLife, hero.life + card.power);
    state.log = hero.name + ' mended the flame for ' + card.power + ' life.';
  } else if (card.spell === 'draw') {
    drawCards(hero, card.power, state);
    state.log = hero.name + ' kindled the deck and drew ' + card.power + ' cards.';
  } else if (card.spell === 'wildfire') {
    for (const creature of foe.board) creature.health -= card.power;
    foe.board = foe.board.filter((c) => c.health > 0);
    state.log = hero.name + ' set the whole enemy row alight.';
  }
  checkEnd(state);
  return true;
}

function attack(state, side, boardIndex, target) {
  const hero = side === 'player' ? state.player : state.enemy;
  const foe = side === 'player' ? state.enemy : state.player;
  const attacker = hero.board[boardIndex];
  if (!attacker || state.phase !== 'play' || !attacker.canAttack) return false;

  attacker.canAttack = false;
  if (target === 'hero') {
    foe.life -= attacker.attack;
    state.log = attacker.name + ' struck ' + foe.name + ' for ' + attacker.attack + '.';
  } else {
    const defender = foe.board[target];
    if (!defender) return false;
    defender.health -= attacker.attack;
    attacker.health -= defender.attack;
    state.log = attacker.name + ' clashed with ' + defender.name + '.';
    hero.board = hero.board.filter((c) => c.health > 0);
    foe.board = foe.board.filter((c) => c.health > 0);
  }
  checkEnd(state);
  return true;
}

function checkEnd(state) {
  if (state.phase !== 'play') return;
  if (state.enemy.life <= 0) {
    state.enemy.life = 0;
    state.phase = 'won';
    state.log = 'The Cinder Warden falls. You win the duel!';
  } else if (state.player.life <= 0) {
    state.player.life = 0;
    state.phase = 'lost';
    state.log = 'Your flame gutters out. The Warden wins.';
  }
}

// The Warden's turn: play what it can afford, then send every ready
// creature at the weakest enemy it can kill, or at your hero.
function aiTakeTurn(state) {
  const foe = state.enemy;
  const you = state.player;

  let played = true;
  while (played) {
    played = false;
    for (let i = 0; i < foe.hand.length; i++) {
      const card = foe.hand[i];
      if (card.cost > foe.ember) continue;
      if (card.kind === CARD_KINDS.CREATURE && foe.board.length >= BOARD_LIMIT) continue;
      if (card.spell === 'mend' && foe.life >= foe.maxLife) continue;
      playCard(state, 'enemy', i);
      played = true;
      break;
    }
    if (state.phase !== 'play') return;
  }

  for (let i = 0; i < foe.board.length; i++) {
    const creature = foe.board[i];
    if (!creature || !creature.canAttack) continue;
    let target = 'hero';
    let weakest = null;
    for (let j = 0; j < you.board.length; j++) {
      const defender = you.board[j];
      if (defender.health <= creature.attack && (!weakest || defender.health < weakest.health)) {
        weakest = defender;
        target = j;
      }
    }
    attack(state, 'enemy', i, target);
    if (state.phase !== 'play') return;
  }
}

function endTurn(state) {
  if (state.phase !== 'play' || state.turn !== 'player') return;
  state.selected = null;
  state.turn = 'enemy';
  state.log = 'The Cinder Warden takes its turn…';
  startTurn(state, 'enemy');
  aiTakeTurn(state);
  if (state.phase !== 'play') return;
  state.turn = 'player';
  state.turnCount += 1;
  startTurn(state, 'player');
  state.log = 'Your turn — turn ' + state.turnCount + '. Play a card, then attack.';
}

// Fixed tableaus for screenshots and for the title screen's backdrop, so a
// render is the same every time it is taken.
function setupScene(state, scene) {
  if (scene === 'table') {
    beginDuel(state);
    state.player.life = 14;
    state.enemy.life = 16;
    state.player.maxEmber = 6;
    state.player.ember = 4;
    state.enemy.maxEmber = 6;
    state.enemy.ember = 2;
    state.turnCount = 5;
    state.player.hand = [
      { ...cardById('knight'), uid: 'knight-a' },
      { ...cardById('bolt'), uid: 'bolt-a' },
      { ...cardById('mend'), uid: 'mend-a' },
      { ...cardById('imp'), uid: 'imp-a' },
      { ...cardById('drake'), uid: 'drake-a' },
    ];
    state.enemy.hand = [
      { ...cardById('imp'), uid: 'imp-b' },
      { ...cardById('hound'), uid: 'hound-b' },
      { ...cardById('bolt'), uid: 'bolt-b' },
      { ...cardById('crow'), uid: 'crow-b' },
    ];
    state.player.board = [
      { uid: 'golem-a', id: 'golem', name: 'Ash Golem', attack: 2, health: 4, maxHealth: 5, hue: 220, canAttack: true },
      { uid: 'hound-a', id: 'hound', name: 'Flame Hound', attack: 3, health: 2, maxHealth: 2, hue: 18, canAttack: true },
      { uid: 'sprite-a', id: 'sprite', name: 'Spark Sprite', attack: 2, health: 2, maxHealth: 2, hue: 45, canAttack: false },
    ];
    state.enemy.board = [
      { uid: 'knight-b', id: 'knight', name: 'Blaze Knight', attack: 4, health: 3, maxHealth: 3, hue: 8, canAttack: true },
      { uid: 'crow-b', id: 'crow', name: 'Storm Crow', attack: 4, health: 2, maxHealth: 4, hue: 260, canAttack: true },
    ];
    state.log = 'Turn 5 — your move. The Warden is at 16 life.';
  } else if (scene === 'win') {
    beginDuel(state);
    state.enemy.life = 0;
    state.phase = 'won';
    state.player.life = 9;
    state.log = 'The Cinder Warden falls. You win the duel!';
  } else if (scene === 'loss') {
    beginDuel(state);
    state.player.life = 0;
    state.phase = 'lost';
    state.enemy.life = 7;
    state.log = 'Your flame gutters out. The Warden wins.';
  }
  return state;
}
