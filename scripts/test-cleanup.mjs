import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { ROOT_DIR } from './shared-test-utils.mjs';

const fixtureId = `cleanup${Date.now().toString(36)}`;

function runFixture(command) {
  const result = spawnSync('php', ['scripts/php_cleanup_fixture.php', command, fixtureId], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Fixture command failed: ${command}`);
  }

  return result.stdout.trim();
}

try {
  runFixture('seed');
  const seededRaw = runFixture('assert');
  const seeded = JSON.parse(seededRaw);

  assert.deepEqual(seeded.stale, { rooms: 1, players: 1, presence: 1 }, 'Stale fixture should exist before cleanup.');
  assert.deepEqual(seeded.fresh, { rooms: 1, players: 1, presence: 1 }, 'Fresh fixture should exist before cleanup.');

  runFixture('run-cleanup');

  const assertionRaw = runFixture('assert');
  const assertion = JSON.parse(assertionRaw);

  assert.deepEqual(assertion.stale, { rooms: 0, players: 0, presence: 0 }, 'Stale room, player info, and presence token should be deleted.');
  assert.deepEqual(assertion.fresh, { rooms: 1, players: 1, presence: 1 }, 'Fresh room and token should remain untouched.');

  console.log('Cleanup maintenance test passed.');
} finally {
  runFixture('teardown');
}
