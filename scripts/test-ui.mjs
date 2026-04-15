import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { ROOT_DIR } from './shared-test-utils.mjs';

const releaseDir = resolve(ROOT_DIR, 'release', 'morskoy-boy');
const port = 8137;
const baseUrl = `http://127.0.0.1:${port}/`;

function ensureReleaseExists() {
  if (!existsSync(resolve(releaseDir, 'index.html')) || !existsSync(resolve(releaseDir, 'api', 'index.php'))) {
    throw new Error('Release build not found. Run `npm run release` before `npm run test:ui`.');
  }
}

function startPhpServer() {
  return spawn('php', ['-S', `127.0.0.1:${port}`, '-t', releaseDir], {
    cwd: ROOT_DIR,
    stdio: 'ignore',
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }
    await delay(200);
  }

  throw new Error('UI test server did not start in time.');
}

function attachErrorCollection(page, label) {
  const errors = [];

  page.on('pageerror', (error) => {
    errors.push(`${label}: pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`${label}: console error: ${message.text()}`);
    }
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText ?? 'unknown';
    if (errorText !== 'net::ERR_ABORTED') {
      errors.push(`${label}: request failed: ${request.method()} ${request.url()} (${errorText})`);
    }
  });

  return errors;
}

async function findFirstCellByState(page, boardTestId, stateClass) {
  const testId = await page.locator(`[data-testid="${boardTestId}"] .${stateClass}`).first().getAttribute('data-testid');
  if (!testId) {
    throw new Error(`No cell with class ${stateClass} found in ${boardTestId}.`);
  }

  const match = /cell-(\d+)-(\d+)$/.exec(testId);
  if (!match) {
    throw new Error(`Failed to parse coordinates from ${testId}.`);
  }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
  };
}

async function waitForCellEnabled(page, testId) {
  await page.waitForFunction(
    (id) => {
      const cell = document.querySelector(`[data-testid="${id}"]`);
      return Boolean(cell && !cell.hasAttribute('disabled'));
    },
    testId,
    { timeout: 10_000 },
  );
}

async function findEnabledOpponentBoard(page) {
  return page.evaluate(() => {
    const board = Array.from(document.querySelectorAll('[data-testid^="opponent-board-"]'))
      .find((element) => element.querySelector('button:not([disabled])'));
    return board?.getAttribute('data-testid') ?? null;
  });
}

async function postRoomAction(page, action, body) {
  return page.evaluate(
    async ({ actionName, payload }) => {
      const roomCode = window.localStorage.getItem('morskoy-boy-room-code');
      const playerToken = window.localStorage.getItem('morskoy-boy-player-token');
      const locale = window.localStorage.getItem('morskoy-boy-locale') ?? 'ru';
      if (!roomCode || !playerToken) {
        throw new Error('Missing room code or player token in localStorage.');
      }

      const response = await fetch(`./api/index.php?action=${actionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: roomCode,
          playerToken,
          lang: locale,
          ...payload,
        }),
      });

      return response.json();
    },
    { actionName: action, payload: body },
  );
}

async function fetchRoomSnapshot(page) {
  return page.evaluate(async () => {
    const roomCode = window.localStorage.getItem('morskoy-boy-room-code');
    const playerToken = window.localStorage.getItem('morskoy-boy-player-token');
    if (!roomCode || !playerToken) {
      return {
        roomCode,
        playerTokenPresent: Boolean(playerToken),
        room: null,
      };
    }

    const response = await fetch(`./api/index.php?action=state&code=${encodeURIComponent(roomCode)}&playerToken=${encodeURIComponent(playerToken)}&lang=ru`);
    const data = await response.json();
    return {
      roomCode,
      playerTokenPresent: true,
      room: data.room ?? null,
      error: data.error ?? null,
    };
  });
}

async function fetchDomSnapshot(page) {
  return page.evaluate(() => ({
    battleTitle: document.querySelector('[data-testid="battle-title"]')?.textContent ?? null,
    roomCode: document.querySelector('[data-testid="room-code-display"]')?.textContent ?? null,
    hasSurrenderButton: Boolean(document.querySelector('[data-testid="surrender-button"]')),
    setupButtonDisabled: document.querySelector('[data-testid="confirm-setup-button"]')?.hasAttribute('disabled') ?? null,
    opponentCellDisabled: document.querySelector('[data-testid="opponent-board-0-cell-0-0"]')?.hasAttribute('disabled') ?? null,
  }));
}

function assertNoClientErrors(errors) {
  if (errors.length > 0) {
    throw new Error(`UI client errors detected:\n${errors.join('\n')}`);
  }
}

async function waitForOwnBoardDamage(player, coord) {
  try {
    await player.page.waitForFunction(
      ({ x, y }) => {
        const cell = document.querySelector(`[data-testid="player-board-cell-${x}-${y}"]`);
        return Boolean(cell && (cell.className.includes('cell-hit') || cell.className.includes('cell-sunk')));
      },
      coord,
      { timeout: 15_000 },
    );
  } catch (error) {
    const snapshot = await fetchRoomSnapshot(player.page);
    const dom = await fetchDomSnapshot(player.page);
    throw new Error(
      `Own-board damage did not appear for ${player.name} at ${coord.x},${coord.y}.\n`
      + `DOM: ${JSON.stringify(dom)}\n`
      + `Room: ${JSON.stringify(snapshot)}\n`
      + `Errors: ${JSON.stringify(player.errors)}`,
      { cause: error },
    );
  }
}

async function waitForRoomPhase(player, phase) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15_000) {
    const snapshot = await fetchRoomSnapshot(player.page);
    if (snapshot.room?.phase === phase) {
      return snapshot;
    }
    await delay(250);
  }

  const snapshot = await fetchRoomSnapshot(player.page);
  const dom = await fetchDomSnapshot(player.page);
  throw new Error(
    `Timed out waiting for phase ${phase} on ${player.name}.\n`
    + `DOM: ${JSON.stringify(dom)}\n`
    + `Room: ${JSON.stringify(snapshot)}\n`
    + `Errors: ${JSON.stringify(player.errors)}`,
  );
}

async function waitForResultModal(player) {
  try {
    await player.page.getByTestId('result-modal').waitFor({ timeout: 20_000 });
  } catch (error) {
    const snapshot = await fetchRoomSnapshot(player.page);
    const dom = await fetchDomSnapshot(player.page);
    throw new Error(
      `Result modal did not appear for ${player.name}.\n`
      + `DOM: ${JSON.stringify(dom)}\n`
      + `Room: ${JSON.stringify(snapshot)}\n`
      + `Errors: ${JSON.stringify(player.errors)}`,
      { cause: error },
    );
  }
}

const phpServer = startPhpServer();

try {
  ensureReleaseExists();
  await waitForServer();

  const browser = await chromium.launch({ headless: true });

  try {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    const hostErrors = attachErrorCollection(hostPage, 'host');
    const guestErrors = attachErrorCollection(guestPage, 'guest');

    await hostPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await hostPage.getByTestId('captain-name-input').waitFor({ timeout: 10_000 });
    await hostPage.getByTestId('open-settings').click();
    await hostPage.getByTestId('settings-back').waitFor();
    await hostPage.getByTestId('language-en').click();
    await hostPage.getByTestId('settings-toggle-theme').click();
    await hostPage.getByTestId('settings-back').click();
    await hostPage.getByTestId('captain-name-input').waitFor();

    await hostPage.getByTestId('captain-name-input').fill('Host');
    await hostPage.getByTestId('create-room-button').click();
    await hostPage.getByTestId('room-code-display').waitFor();
    const roomCode = (await hostPage.getByTestId('room-code-display').textContent())?.trim();
    assert.ok(roomCode, 'Room code should be rendered after creating a room.');

    await guestPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await guestPage.getByTestId('captain-name-input').waitFor({ timeout: 10_000 });
    await guestPage.getByTestId('captain-name-input').fill('Guest');
    await guestPage.getByTestId('room-code-input').fill(roomCode);
    await guestPage.getByTestId('join-room-button').click();
    await guestPage.getByTestId('room-code-display').waitFor();

    await hostPage.getByTestId('auto-place-button').click();
    await hostPage.getByTestId('confirm-setup-button').click();
    await guestPage.getByTestId('auto-place-button').click();
    await guestPage.getByTestId('confirm-setup-button').click();

    const host = { page: hostPage, errors: hostErrors, name: 'host' };
    const guest = { page: guestPage, errors: guestErrors, name: 'guest' };

    const hostBattleSnapshot = await waitForRoomPhase(host, 'battle');
    const guestBattleSnapshot = await waitForRoomPhase(guest, 'battle');

    await guestPage.getByTestId('surrender-button').waitFor({ timeout: 10_000 });
    await guestPage.getByTestId('surrender-button').click();
    await waitForRoomPhase(guest, 'finished');
    await waitForResultModal(guest);
    await guestPage.getByTestId('exit-to-menu-button').click();
    await guestPage.getByTestId('create-room-button').waitFor({ timeout: 10_000 });

    assertNoClientErrors(hostErrors);
    assertNoClientErrors(guestErrors);

    await hostContext.close();
    await guestContext.close();

    const soloContext = await browser.newContext();
    const soloPage = await soloContext.newPage();
    const soloErrors = attachErrorCollection(soloPage, 'solo');

    await soloPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await soloPage.getByTestId('captain-name-input').waitFor({ timeout: 10_000 });
    await soloPage.getByTestId('captain-name-input').fill('Solo');
    await soloPage.getByTestId('create-bot-room-button').click();
    await soloPage.getByTestId('room-code-display').waitFor({ timeout: 10_000 });
    const soloSetupSnapshot = await fetchRoomSnapshot(soloPage);
    assert.equal(soloSetupSnapshot.room?.players.filter((player) => player.isBot).length, 1, 'Bot room should expose one bot player in the UI flow.');

    await soloPage.getByTestId('auto-place-button').click();
    await soloPage.getByTestId('confirm-setup-button').click();

    const solo = { page: soloPage, errors: soloErrors, name: 'solo' };
    const soloBattleSnapshot = await waitForRoomPhase(solo, 'battle');
    assert.equal(soloBattleSnapshot.room?.players.filter((player) => player.isBot).length, 1, 'Bot room should preserve the bot marker after entering battle.');

    await soloPage.getByTestId('surrender-button').waitFor({ timeout: 10_000 });
    await soloPage.getByTestId('surrender-button').click();
    await waitForRoomPhase(solo, 'finished');
    await waitForResultModal(solo);
    await soloPage.getByTestId('exit-to-menu-button').click();
    await soloPage.getByTestId('create-room-button').waitFor({ timeout: 10_000 });

    assertNoClientErrors(soloErrors);
  } finally {
    await browser.close();
  }

  console.log('UI transition tests passed.');
} finally {
  phpServer.kill();
}
