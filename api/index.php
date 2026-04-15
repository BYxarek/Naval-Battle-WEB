<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/game.php';
require __DIR__ . '/room_repository.php';
require __DIR__ . '/action_handlers.php';

$input = json_input();
set_app_lang((string) ($input['lang'] ?? ($_GET['lang'] ?? 'ru')));

try {
    $pdo = pdo_connect($config);
} catch (Throwable $exception) {
    fail(tr('error.db'), 500);
}

try {
    maybe_run_storage_cleanup($pdo, $config);
} catch (Throwable) {
    // Cleanup must not block gameplay requests.
}

$action = (string) ($_GET['action'] ?? '');

try {
    dispatch_action($pdo, $action, $input);
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fail(tr('error.internal', ['message' => $exception->getMessage()]), 500);
}
