// Ember Duel — the card catalogue.
// Every card is an original design for this game: a cost in embers, a kind
// (creature or spell), and the numbers the table reads. Creatures carry an
// attack and a health; spells carry their effect in plain words.

const CARD_KINDS = {
  CREATURE: 'creature',
  SPELL: 'spell',
};

const EMBER_CARDS = [
  { id: 'imp',     name: 'Ember Imp',    kind: CARD_KINDS.CREATURE, cost: 1, attack: 2, health: 1, text: 'Small, quick, and always grinning.', hue: 28 },
  { id: 'pup',     name: 'Cinder Pup',   kind: CARD_KINDS.CREATURE, cost: 1, attack: 1, health: 2, text: 'Barks sparks. Fetches trouble.', hue: 35 },
  { id: 'sprite',  name: 'Spark Sprite', kind: CARD_KINDS.CREATURE, cost: 2, attack: 2, health: 2, text: 'Darts between the flames.', hue: 45 },
  { id: 'hound',   name: 'Flame Hound',  kind: CARD_KINDS.CREATURE, cost: 2, attack: 3, health: 2, text: 'Its howl smells of smoke.', hue: 18 },
  { id: 'golem',   name: 'Ash Golem',    kind: CARD_KINDS.CREATURE, cost: 3, attack: 2, health: 5, text: 'Slow. Patient. Made of yesterday.', hue: 220 },
  { id: 'knight',  name: 'Blaze Knight', kind: CARD_KINDS.CREATURE, cost: 3, attack: 4, health: 3, text: 'Sworn to the last ember.', hue: 8 },
  { id: 'crow',    name: 'Storm Crow',   kind: CARD_KINDS.CREATURE, cost: 4, attack: 4, health: 4, text: 'It nests in thunderheads.', hue: 260 },
  { id: 'drake',   name: 'Inferno Drake', kind: CARD_KINDS.CREATURE, cost: 5, attack: 6, health: 5, text: 'The sky catches fire when it lands.', hue: 0 },
  { id: 'bolt',    name: 'Ember Bolt',   kind: CARD_KINDS.SPELL, cost: 2, text: 'Deal 3 damage to the enemy hero.', hue: 20, spell: 'bolt', power: 3 },
  { id: 'mend',    name: 'Mend Flame',   kind: CARD_KINDS.SPELL, cost: 2, text: 'Restore 5 life to your hero.', hue: 150, spell: 'mend', power: 5 },
  { id: 'kindling', name: 'Kindling',    kind: CARD_KINDS.SPELL, cost: 1, text: 'Draw 2 cards.', hue: 50, spell: 'draw', power: 2 },
  { id: 'wildfire', name: 'Wildfire',    kind: CARD_KINDS.SPELL, cost: 4, text: 'Deal 2 damage to every enemy creature.', hue: 12, spell: 'wildfire', power: 2 },
];

function cardById(id) {
  return EMBER_CARDS.find((c) => c.id === id) || null;
}

// A fresh 24-card deck: two copies of each catalogue card, shuffled with a
// caller-supplied random source so replays and screenshots stay stable.
function buildDeck(random) {
  const deck = [];
  for (const card of EMBER_CARDS) {
    deck.push({ ...card, uid: card.id + '-a' });
    deck.push({ ...card, uid: card.id + '-b' });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}
