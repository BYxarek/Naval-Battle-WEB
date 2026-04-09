CREATE TABLE IF NOT EXISTS rooms (
  code VARCHAR(5) NOT NULL PRIMARY KEY,
  phase VARCHAR(16) NOT NULL,
  host_player_id CHAR(36) NOT NULL,
  current_turn_player_id CHAR(36) NULL,
  winner_id CHAR(36) NULL,
  rematch_requester_id CHAR(36) NULL,
  last_action VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_players (
  id CHAR(36) NOT NULL PRIMARY KEY,
  room_code VARCHAR(5) NOT NULL,
  player_token CHAR(36) NOT NULL,
  name VARCHAR(24) NOT NULL,
  ready TINYINT(1) NOT NULL DEFAULT 0,
  shots_fired INT NOT NULL DEFAULT 0,
  board_json JSON NOT NULL,
  target_board_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_room_token (room_code, player_token),
  KEY idx_room_code (room_code),
  CONSTRAINT fk_room_players_room
    FOREIGN KEY (room_code) REFERENCES rooms(code)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
