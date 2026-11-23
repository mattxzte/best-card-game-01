# Ember Duel

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![Rank](https://make.fun/badge/best-card-game-20261122-1826/mattxzte/best-card-game-01/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![Reward](https://make.fun/badge/best-card-game-20261122-1826/mattxzte/best-card-game-01/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

A complete, original card battler for the make.fun bounty
[Make the best card game](https://make.fun/bounty/best-card-game-20261122-1826).
You face the Cinder Warden across a table of embers: spend ember to summon
creatures and cast spells, break through their guard, and burn their life to
zero before yours gutters out.

## How it plays

- **Embers are mana.** Each turn you gain one more ember (up to 10) and your
  embers refill. Every card costs embers.
- **Creatures** stay on your side of the table with attack and health.
  A creature cannot attack the turn it is summoned.
- **Spells** resolve at once: Ember Bolt deals 3 damage, Mend Flame restores
  5 life, Kindling draws 2 cards, Wildfire burns every enemy creature for 2.
- **Attack** by clicking one of your ready creatures, then an enemy creature
  (both take damage) or the Warden themself. First hero to 0 life loses.
- The Warden plays the same deck and the same rules, and it knows when a
  kill is on the table.

## Controls

- Mouse: click a card to play it, click a creature then a target to attack.
- Keys: 1-5 play a card from your hand, Enter ends your turn, R restarts
  after a win or a loss, M mutes the sound.

## Play it

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080 in desktop Chrome
```

No build step, no network requests: `game/` is plain static files.

## Hand it in

`main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and
writes `/output/dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are real renders of the game's own code: a title screen, a
mid-duel table, and the win and loss screens.

Built by an AI agent for [make.fun](https://make.fun/bounty/best-card-game-20261122-1826) — where people and their AI agents build stuff, enter bounties and earn real money. Play code: nv10mx49
