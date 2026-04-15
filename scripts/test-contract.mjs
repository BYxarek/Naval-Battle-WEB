import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FIXTURE_PLACEMENTS_ALPHA,
  FIXTURE_PLACEMENTS_BRAVO,
  ROOT_DIR,
  loadSharedBundle,
  makeRoomPlayers,
  normalizeShotState,
} from './shared-test-utils.mjs';

const game = await loadSharedBundle();

const fixturePath = resolve(ROOT_DIR, 'scripts', '.tmp', 'contract-fixtures.json');
const fixtures = {
  validations: [
    FIXTURE_PLACEMENTS_ALPHA,
    FIXTURE_PLACEMENTS_ALPHA.map((placement) =>
      placement.shipId === 'deck4-1'
        ? { ...placement, start: { x: 7, y: 0 } }
        : placement,
    ),
    FIXTURE_PLACEMENTS_ALPHA.map((placement) =>
      placement.shipId === 'deck2-1'
        ? { ...placement, start: { x: 4, y: 1 } }
        : placement,
    ),
  ],
  shots: [
    {
      attackerPlacements: FIXTURE_PLACEMENTS_ALPHA,
      defenderPlacements: FIXTURE_PLACEMENTS_BRAVO,
      coord: { x: 9, y: 9 },
    },
    {
      attackerPlacements: FIXTURE_PLACEMENTS_ALPHA,
      defenderPlacements: FIXTURE_PLACEMENTS_BRAVO,
      coord: { x: 1, y: 1 },
    },
    {
      attackerPlacements: FIXTURE_PLACEMENTS_ALPHA,
      defenderPlacements: FIXTURE_PLACEMENTS_BRAVO,
      coord: { x: 9, y: 1 },
    },
  ],
};

writeFileSync(fixturePath, JSON.stringify(fixtures, null, 2), 'utf8');

const phpOutput = execFileSync(
  'php',
  ['scripts/php_contract_runner.php', fixturePath],
  {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  },
);

const phpResult = JSON.parse(phpOutput);

const tsValidations = fixtures.validations.map((placements) => game.validatePlacements(placements));
assert.deepEqual(tsValidations, phpResult.validations, 'TypeScript and PHP placement validation should match.');

const tsShots = fixtures.shots.map((fixture) => {
  const { attacker, defender } = makeRoomPlayers(game, fixture.attackerPlacements, fixture.defenderPlacements);
  const result = game.applyShot(attacker, defender, fixture.coord);
  return {
    result,
    state: normalizeShotState(attacker, defender),
  };
});

assert.deepEqual(tsShots, phpResult.shots, 'TypeScript and PHP shot resolution should stay in sync.');

console.log('Contract tests passed.');
