import assert from 'node:assert/strict';
import {
  assertValidFixture,
  FIXTURE_PLACEMENTS_ALPHA,
  FIXTURE_PLACEMENTS_BRAVO,
  loadSharedBundle,
  makeRoomPlayers,
  makeThreePlayerRoom,
} from './shared-test-utils.mjs';

const game = await loadSharedBundle();

assertValidFixture(game, FIXTURE_PLACEMENTS_ALPHA);
assertValidFixture(game, FIXTURE_PLACEMENTS_BRAVO);

assert.equal(game.validatePlacements(FIXTURE_PLACEMENTS_ALPHA).valid, true, 'Valid placements should pass.');

const outOfBoundsPlacements = FIXTURE_PLACEMENTS_ALPHA.map((placement) =>
  placement.shipId === 'deck4-1'
    ? { ...placement, start: { x: 7, y: 0 } }
    : placement,
);
assert.equal(game.validatePlacements(outOfBoundsPlacements).valid, false, 'Out-of-bounds placement should fail.');

const touchingPlacements = FIXTURE_PLACEMENTS_ALPHA.map((placement) =>
  placement.shipId === 'deck2-1'
    ? { ...placement, start: { x: 4, y: 1 } }
    : placement,
);
assert.equal(game.validatePlacements(touchingPlacements).valid, false, 'Touching ships should fail.');

for (let iteration = 0; iteration < 50; iteration += 1) {
  const placements = game.generateRandomPlacements();
  assert.equal(game.validatePlacements(placements).valid, true, 'Generated placements must stay valid.');
  assert.equal(new Set(placements.map((placement) => placement.shipId)).size, placements.length, 'Generated fleet should not duplicate ship ids.');
}

{
  const { attacker, defender } = makeRoomPlayers(game);
  const missResult = game.applyShot(attacker, defender, { x: 9, y: 9 });
  assert.deepEqual(missResult, { ok: true, result: 'miss' }, 'Miss shot should return miss.');
  assert.equal(attacker.shotsFired, 1, 'Miss increments shot counter.');
  assert.equal(attacker.targetBoards[defender.id][9][9].state, 'miss', 'Miss marks attacker target board.');
}

{
  const { attacker, defender } = makeRoomPlayers(game);
  const hitResult = game.applyShot(attacker, defender, { x: 1, y: 1 });
  assert.deepEqual(hitResult, { ok: true, result: 'hit' }, 'First ship cell hit should return hit.');
  assert.equal(attacker.shotsFired, 1, 'Hit increments shot counter.');
  assert.equal(defender.board.cells[1][1].state, 'hit', 'Hit marks defender board.');
}

{
  const { attacker, defender } = makeRoomPlayers(game);
  for (const coord of [{ x: 9, y: 1 }]) {
    const sunkResult = game.applyShot(attacker, defender, coord);
    assert.deepEqual(sunkResult, { ok: true, result: 'sunk' }, 'Single-deck ship should sink immediately.');
  }
  assert.deepEqual(defender.board.sunkShips, ['deck1-1'], 'Sunk ship should be tracked.');
  assert.equal(attacker.targetBoards[defender.id][1][9].state, 'sunk', 'Attacker board should expose sunk cell.');
  assert.equal(attacker.targetBoards[defender.id][0][8].state, 'miss', 'Water around sunk ship should open.');
}

{
  const { alpha, bravo, charlie, room } = makeThreePlayerRoom(game);
  bravo.board.sunkShips = bravo.board.ships.map((ship) => ship.shipId);
  assert.equal(game.fleetDestroyed(bravo.board), true, 'Fleet should be considered destroyed when all ships are sunk.');
  assert.equal(game.allowedTargetPlayerId(room, alpha.id), charlie.id, 'Target order should skip eliminated players.');
}

console.log('Shared logic tests passed.');
