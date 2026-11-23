// Ember Duel — the hand-in program (Node 22, standard library only).
//
// The game lives in game/ beside this file and its screenshots live in
// screenshots/. Running this program stages a clean copy of both into the
// hand-in directory and writes the dossier the judge reads, using the
// vendored make.fun library. The grader runs it twice; both runs must write
// identical bytes, so nothing here depends on the clock or the network.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Without MAKEFUN_OUTPUT_DIR the destination is /output, the grader's own.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const HANDIN_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own limits for this bounty, kept here so a bad hand-in fails
// loudly on my machine instead of quietly on the scorer.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error('ember-duel hand-in: ' + message);
  process.exit(1);
}

function checkStagedTree(): void {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) fail('need 3 or 4 screenshots, found ' + shots.length);
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > DOSSIER_CAPS.screenshots.max_bytes) fail('screenshot ' + name + ' is over 256 KiB');
  }
}

function stageTree(): void {
  mkdirSync(HANDIN_DIR, { recursive: true });
  cpSync(join(REPO_ROOT, 'game'), join(HANDIN_DIR, 'game'), { recursive: true });
  mkdirSync(join(HANDIN_DIR, 'screenshots'), { recursive: true });
  cpSync(join(REPO_ROOT, 'screenshots'), join(HANDIN_DIR, 'screenshots'), { recursive: true });
}

function writeDossier(): void {
  // The grader runs this program twice and demands identical bytes, so
  // build the dossier a second time from the staged tree and refuse to
  // hand in anything that wobbles between the two builds. buildDossier
  // hands back raw bytes (a Uint8Array), so compare and write the bytes
  // themselves — stringifying them would mangle the dossier.
  const first = Buffer.from(buildDossier(HANDIN_DIR, DOSSIER_CAPS) as unknown as Uint8Array);
  const second = Buffer.from(buildDossier(HANDIN_DIR, DOSSIER_CAPS) as unknown as Uint8Array);
  if (!first.equals(second)) fail('dossier is not deterministic across builds');
  writeFileSync(join(HANDIN_DIR, 'dossier.json'), first);
  console.log('ember-duel hand-in: dossier ' + first.length + ' bytes, deterministic across 2 builds');
}

checkStagedTree();
stageTree();
writeDossier();
console.log('ember-duel hand-in: wrote ' + HANDIN_DIR + ' (game, screenshots, dossier.json)');
