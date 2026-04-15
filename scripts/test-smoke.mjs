import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { ROOT_DIR, FIXTURE_PLACEMENTS_ALPHA, FIXTURE_PLACEMENTS_BRAVO } from './shared-test-utils.mjs';

const port = 8135;
const baseUrl = `http://127.0.0.1:${port}/api/index.php?action=`;

function spawnPhpServer() {
  return spawn('php', ['-S', `127.0.0.1:${port}`, '-t', '.'], {
    cwd: ROOT_DIR,
    stdio: 'ignore',
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}online-count`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }
    await delay(200);
  }

  throw new Error('PHP smoke server did not start in time.');
}

async function request(action, body, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${action}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify({ ...body, lang: 'en' }) : undefined,
  });
  const data = await response.json();
  assert.equal(response.status, expectedStatus, `Unexpected status for ${action}: ${JSON.stringify(data)}`);
  return data;
}

async function getState(code, playerToken) {
  const response = await fetch(`${baseUrl}state&code=${encodeURIComponent(code)}&playerToken=${encodeURIComponent(playerToken)}&lang=en`);
  const data = await response.json();
  assert.equal(response.status, 200, `Unexpected state status: ${JSON.stringify(data)}`);
  return data.room;
}

const server = spawnPhpServer();

try {
  await waitForServer();

  const hostToken = 'smoke-host-token';
  const guestToken = 'smoke-guest-token';

  const created = await request('create-room', {
    name: 'Host',
    maxPlayers: 2,
    playerToken: hostToken,
  });
  const code = created.room.code;
  assert.equal(created.room.phase, 'setup', 'New room should start in setup.');

  const joined = await request('join-room', {
    name: 'Guest',
    code,
    playerToken: guestToken,
  });
  assert.equal(joined.room.players.length, 2, 'Second player should join the room.');

  const hostStateBeforeSetup = await getState(code, hostToken);
  const guestStateBeforeSetup = await getState(code, guestToken);
  assert.equal(hostStateBeforeSetup.players.find((player) => !player.isYou).ownBoard.ships.length, 0, 'Host should not see guest ships.');
  assert.equal(guestStateBeforeSetup.players.find((player) => !player.isYou).ownBoard.ships.length, 0, 'Guest should not see host ships.');

  await request('submit-setup', {
    code,
    playerToken: hostToken,
    placements: FIXTURE_PLACEMENTS_ALPHA,
  });
  const battleStart = await request('submit-setup', {
    code,
    playerToken: guestToken,
    placements: FIXTURE_PLACEMENTS_BRAVO,
  });
  assert.equal(battleStart.room.phase, 'battle', 'Room should enter battle once both players are ready.');
  const battleTurnStartedAt = battleStart.room.turnStartedAt;

  const guestId = battleStart.room.players.find((player) => player.name === 'Guest')?.id;
  const hostId = battleStart.room.players.find((player) => player.name === 'Host')?.id;
  assert.ok(guestId && hostId, 'Both players must have ids.');

  const afterMiss = await request('fire', {
    code,
    playerToken: hostToken,
    targetPlayerId: guestId,
    x: 9,
    y: 9,
  });
  assert.equal(afterMiss.room.currentTurnPlayerId, guestId, 'Turn should pass after a miss.');

  const afterHit = await request('fire', {
    code,
    playerToken: guestToken,
    targetPlayerId: hostId,
    x: 0,
    y: 0,
  });
  assert.equal(afterHit.room.currentTurnPlayerId, guestId, 'Player should retain the turn after a hit.');
  assert.ok(
    typeof afterHit.room.turnStartedAt === 'number' && typeof battleTurnStartedAt === 'number' && afterHit.room.turnStartedAt >= battleTurnStartedAt,
    'Turn timer should restart after a hit.',
  );

  const afterSurrender = await request('surrender-room', {
    code,
    playerToken: guestToken,
  });
  assert.equal(afterSurrender.room.phase, 'finished', 'Surrender should finish the match.');
  assert.equal(afterSurrender.room.winnerId, hostId, 'Opponent should win after surrender.');

  await request('request-rematch', {
    code,
    playerToken: hostToken,
  });
  const rematchAccepted = await request('respond-rematch', {
    code,
    playerToken: guestToken,
    decision: 'accept',
  });
  assert.equal(rematchAccepted.room.phase, 'setup', 'Accepted rematch should reset the room to setup.');

  await request('cancel-room', {
    code,
    playerToken: hostToken,
  });

  const soloToken = 'smoke-solo-token';
  const soloRoom = await request('create-bot-room', {
    name: 'Solo',
    playerToken: soloToken,
  });
  const soloCode = soloRoom.room.code;
  assert.equal(soloRoom.room.players.length, 2, 'Bot game should create a room with one human and one bot.');
  assert.equal(soloRoom.room.players.filter((player) => player.isBot).length, 1, 'Bot room should expose exactly one bot.');

  const botBattle = await request('submit-setup', {
    code: soloCode,
    playerToken: soloToken,
    placements: FIXTURE_PLACEMENTS_ALPHA,
  });
  assert.equal(botBattle.room.phase, 'battle', 'Bot game should start after the human confirms setup.');

  const botOpponent = botBattle.room.players.find((player) => player.isBot);
  assert.ok(botOpponent, 'Bot opponent must exist.');

  let botAnswered = false;
  for (let y = 0; y < 10 && !botAnswered; y += 1) {
    for (let x = 0; x < 10 && !botAnswered; x += 1) {
      const afterBotTurn = await request('fire', {
        code: soloCode,
        playerToken: soloToken,
        targetPlayerId: botOpponent.id,
        x,
        y,
      });
      const ownBoardStates = afterBotTurn.room.players.find((player) => player.isYou)?.ownBoard.cells.flat().map((cell) => cell.state) ?? [];
      botAnswered = ownBoardStates.includes('miss') || ownBoardStates.includes('hit') || ownBoardStates.includes('sunk');
    }
  }

  assert.ok(botAnswered, 'Bot should answer with at least one shot after the human eventually passes the turn.');

  console.log('Smoke scenario passed.');
} finally {
  server.kill();
}
