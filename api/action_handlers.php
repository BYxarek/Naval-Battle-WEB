<?php

declare(strict_types=1);

require_once __DIR__ . '/actions/action_utils.php';
require_once __DIR__ . '/actions/lobby_actions.php';
require_once __DIR__ . '/actions/battle_actions.php';
require_once __DIR__ . '/actions/rematch_actions.php';
require_once __DIR__ . '/actions/presence_actions.php';

function dispatch_action(PDO $pdo, string $action, array $input): never
{
    switch ($action) {
        case 'create-room':
            handle_create_room($pdo, $input);
        case 'create-bot-room':
            handle_create_bot_room($pdo, $input);
        case 'join-room':
            handle_join_room($pdo, $input);
        case 'state':
            handle_state($pdo);
        case 'submit-setup':
            handle_submit_setup($pdo, $input);
        case 'fire':
            handle_fire($pdo, $input);
        case 'request-rematch':
            handle_request_rematch($pdo, $input);
        case 'respond-rematch':
            handle_respond_rematch($pdo, $input);
        case 'restart-room':
            handle_restart_room($pdo, $input);
        case 'surrender-room':
            handle_surrender_room($pdo, $input);
        case 'cancel-room':
            handle_cancel_room($pdo, $input);
        case 'presence-ping':
            handle_presence_ping($pdo, $input);
        case 'online-count':
            handle_online_count($pdo);
        default:
            fail(tr('error.unknown_action'), 404);
    }
}
