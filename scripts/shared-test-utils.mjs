import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP_DIR = resolve(ROOT_DIR, 'scripts', '.tmp');
const BUNDLE_PATH = resolve(TMP_DIR, 'shared-game.bundle.mjs');
const ROLLDOWN_BIN = resolve(
  ROOT_DIR,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'rolldown.cmd' : 'rolldown',
);

export const FIXTURE_PLACEMENTS_ALPHA = [
  { shipId: 'deck4-1', length: 4, orientation: 'horizontal', start: { x: 0, y: 0 } },
  { shipId: 'deck3-1', length: 3, orientation: 'horizontal', start: { x: 0, y: 2 } },
  { shipId: 'deck3-2', length: 3, orientation: 'horizontal', start: { x: 0, y: 4 } },
  { shipId: 'deck2-1', length: 2, orientation: 'horizontal', start: { x: 5, y: 0 } },
  { shipId: 'deck2-2', length: 2, orientation: 'horizontal', start: { x: 5, y: 2 } },
  { shipId: 'deck2-3', length: 2, orientation: 'horizontal', start: { x: 5, y: 4 } },
  { shipId: 'deck1-1', length: 1, orientation: 'horizontal', start: { x: 9, y: 0 } },
  { shipId: 'deck1-2', length: 1, orientation: 'horizontal', start: { x: 9, y: 2 } },
  { shipId: 'deck1-3', length: 1, orientation: 'horizontal', start: { x: 9, y: 4 } },
  { shipId: 'deck1-4', length: 1, orientation: 'horizontal', start: { x: 9, y: 6 } },
];

export const FIXTURE_PLACEMENTS_BRAVO = [
  { shipId: 'deck4-1', length: 4, orientation: 'vertical', start: { x: 1, y: 1 } },
  { shipId: 'deck3-1', length: 3, orientation: 'vertical', start: { x: 4, y: 1 } },
  { shipId: 'deck3-2', length: 3, orientation: 'vertical', start: { x: 7, y: 1 } },
  { shipId: 'deck2-1', length: 2, orientation: 'vertical', start: { x: 0, y: 6 } },
  { shipId: 'deck2-2', length: 2, orientation: 'vertical', start: { x: 3, y: 6 } },
  { shipId: 'deck2-3', length: 2, orientation: 'vertical', start: { x: 6, y: 6 } },
  { shipId: 'deck1-1', length: 1, orientation: 'horizontal', start: { x: 9, y: 1 } },
  { shipId: 'deck1-2', length: 1, orientation: 'horizontal', start: { x: 9, y: 3 } },
  { shipId: 'deck1-3', length: 1, orientation: 'horizontal', start: { x: 9, y: 5 } },
  { shipId: 'deck1-4', length: 1, orientation: 'horizontal', start: { x: 9, y: 7 } },
];

export const FIXTURE_PLACEMENTS_CHARLIE = [
  { shipId: 'deck4-1', length: 4, orientation: 'vertical', start: { x: 2, y: 0 } },
  { shipId: 'deck3-1', length: 3, orientation: 'horizontal', start: { x: 5, y: 0 } },
  { shipId: 'deck3-2', length: 3, orientation: 'horizontal', start: { x: 5, y: 3 } },
  { shipId: 'deck2-1', length: 2, orientation: 'vertical', start: { x: 0, y: 5 } },
  { shipId: 'deck2-2', length: 2, orientation: 'vertical', start: { x: 3, y: 5 } },
  { shipId: 'deck2-3', length: 2, orientation: 'vertical', start: { x: 8, y: 5 } },
  { shipId: 'deck1-1', length: 1, orientation: 'horizontal', start: { x: 5, y: 7 } },
  { shipId: 'deck1-2', length: 1, orientation: 'horizontal', start: { x: 7, y: 7 } },
  { shipId: 'deck1-3', length: 1, orientation: 'horizontal', start: { x: 9, y: 5 } },
  { shipId: 'deck1-4', length: 1, orientation: 'horizontal', start: { x: 9, y: 9 } },
];

export function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }
}

export async function loadSharedBundle() {
  ensureTmpDir();
  const args = [
    'shared/game/index.ts',
    '--file',
    BUNDLE_PATH,
    '--format',
    'esm',
    '--platform',
    'node',
    '--log-level',
    'silent',
  ];

  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/c', ROLLDOWN_BIN, ...args], {
      cwd: ROOT_DIR,
      stdio: 'pipe',
    });
  } else {
    execFileSync(ROLLDOWN_BIN, args, {
      cwd: ROOT_DIR,
      stdio: 'pipe',
    });
  }

  return import(`${pathToFileURL(BUNDLE_PATH).href}?t=${Date.now()}`);
}

export function makeRoomPlayers(game, placementsAlpha = FIXTURE_PLACEMENTS_ALPHA, placementsBravo = FIXTURE_PLACEMENTS_BRAVO) {
  const attacker = game.createPlayerState('alpha', 'Alpha');
  const defender = game.createPlayerState('bravo', 'Bravo');
  attacker.board = game.buildBoardFromPlacements(placementsAlpha);
  defender.board = game.buildBoardFromPlacements(placementsBravo);
  const room = {
    code: 'TEST1',
    phase: 'battle',
    hostId: attacker.id,
    maxPlayers: 2,
    setupVersion: 1,
    players: [attacker, defender],
    currentTurnPlayerId: attacker.id,
    createdAt: Date.now(),
  };
  game.ensureRoomTargetBoards(room);
  return { attacker, defender, room };
}

export function makeThreePlayerRoom(game) {
  const alpha = game.createPlayerState('alpha', 'Alpha');
  const bravo = game.createPlayerState('bravo', 'Bravo');
  const charlie = game.createPlayerState('charlie', 'Charlie');
  alpha.board = game.buildBoardFromPlacements(FIXTURE_PLACEMENTS_ALPHA);
  bravo.board = game.buildBoardFromPlacements(FIXTURE_PLACEMENTS_BRAVO);
  charlie.board = game.buildBoardFromPlacements(FIXTURE_PLACEMENTS_CHARLIE);
  const room = {
    code: 'TEST3',
    phase: 'battle',
    hostId: alpha.id,
    maxPlayers: 3,
    setupVersion: 1,
    players: [alpha, bravo, charlie],
    currentTurnPlayerId: alpha.id,
    createdAt: Date.now(),
  };
  game.ensureRoomTargetBoards(room);
  return { alpha, bravo, charlie, room };
}

export function normalizeShotState(attacker, defender) {
  return {
    attacker: {
      shotsFired: attacker.shotsFired,
      targetBoard: attacker.targetBoards[defender.id],
    },
    defender: {
      sunkShips: defender.board.sunkShips,
      board: defender.board.cells,
    },
  };
}

export function assertValidFixture(game, placements) {
  assert.equal(game.validatePlacements(placements).valid, true, 'Fixture placements must stay valid.');
}
