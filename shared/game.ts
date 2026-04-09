export const BOARD_SIZE = 10;

export const SHIPS = [
  { id: 'deck4-1', label: 'Четырёхпалубный', length: 4 },
  { id: 'deck3-1', label: 'Трёхпалубный #1', length: 3 },
  { id: 'deck3-2', label: 'Трёхпалубный #2', length: 3 },
  { id: 'deck2-1', label: 'Двухпалубный #1', length: 2 },
  { id: 'deck2-2', label: 'Двухпалубный #2', length: 2 },
  { id: 'deck2-3', label: 'Двухпалубный #3', length: 2 },
  { id: 'deck1-1', label: 'Однопалубный #1', length: 1 },
  { id: 'deck1-2', label: 'Однопалубный #2', length: 1 },
  { id: 'deck1-3', label: 'Однопалубный #3', length: 1 },
  { id: 'deck1-4', label: 'Однопалубный #4', length: 1 },
] as const;

export type ShipId = (typeof SHIPS)[number]['id'];
export type Orientation = 'horizontal' | 'vertical';
export type MatchPhase = 'lobby' | 'setup' | 'battle' | 'finished' | 'closed';
export type ShotResult = 'miss' | 'hit' | 'sunk';
export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export type Coord = {
  x: number;
  y: number;
};

export type ShipPlacement = {
  shipId: ShipId;
  length: number;
  start: Coord;
  orientation: Orientation;
};

export type BoardCell = {
  x: number;
  y: number;
  state: CellState;
  shipId?: ShipId;
};

export type PlayerBoard = {
  cells: BoardCell[][];
  ships: ShipPlacement[];
  sunkShips: ShipId[];
};

export type PublicBoardCell = {
  x: number;
  y: number;
  state: 'unknown' | 'hit' | 'miss' | 'sunk';
};

export type PublicPlayerState = {
  id: string;
  name: string;
  ready: boolean;
  board: PlayerBoard;
  targetBoard: PublicBoardCell[][];
  shotsFired: number;
};

export type PlayerState = PublicPlayerState & {
  socketId?: string;
};

export type RoomState = {
  code: string;
  phase: MatchPhase;
  hostId: string;
  players: PlayerState[];
  currentTurnPlayerId?: string;
  winnerId?: string;
  lastAction?: string;
  createdAt: number;
};

export type SanitizedRoomState = {
  code: string;
  phase: MatchPhase;
  currentTurnPlayerId?: string;
  winnerId?: string;
  lastAction?: string;
  rematchRequesterId?: string;
  createdAt?: number;
  updatedAt?: number;
  youAreHost: boolean;
  youPlayerId?: string;
  players: Array<{
    id: string;
    name: string;
    ready: boolean;
    shotsFired: number;
    sunkShips: ShipId[];
    ownBoard: PlayerBoard;
    targetBoard: PublicBoardCell[][];
    isYou: boolean;
  }>;
};

export type PlacementValidation = {
  valid: boolean;
  reason?: string;
};

export function createEmptyBoard(): PlayerBoard {
  return {
    cells: Array.from({ length: BOARD_SIZE }, (_, y) =>
      Array.from({ length: BOARD_SIZE }, (_, x) => ({
        x,
        y,
        state: 'empty' as CellState,
      })),
    ),
    ships: [],
    sunkShips: [],
  };
}

export function createEmptyTargetBoard(): PublicBoardCell[][] {
  return Array.from({ length: BOARD_SIZE }, (_, y) =>
    Array.from({ length: BOARD_SIZE }, (_, x) => ({
      x,
      y,
      state: 'unknown' as const,
    })),
  );
}

export function createPlayerState(id: string, name: string): PlayerState {
  return {
    id,
    name,
    ready: false,
    board: createEmptyBoard(),
    targetBoard: createEmptyTargetBoard(),
    shotsFired: 0,
  };
}

export function createRoom(code: string, host: PlayerState): RoomState {
  return {
    code,
    phase: 'lobby',
    hostId: host.id,
    players: [host],
    createdAt: Date.now(),
  };
}

export function inBounds(coord: Coord): boolean {
  return coord.x >= 0 && coord.x < BOARD_SIZE && coord.y >= 0 && coord.y < BOARD_SIZE;
}

export function placementCells(placement: ShipPlacement): Coord[] {
  return Array.from({ length: placement.length }, (_, index) => ({
    x: placement.start.x + (placement.orientation === 'horizontal' ? index : 0),
    y: placement.start.y + (placement.orientation === 'vertical' ? index : 0),
  }));
}

function neighborKeys(coord: Coord): string[] {
  const keys: string[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const next = { x: coord.x + dx, y: coord.y + dy };
      if (inBounds(next)) {
        keys.push(`${next.x}:${next.y}`);
      }
    }
  }
  return keys;
}

export function validatePlacements(placements: ShipPlacement[]): PlacementValidation {
  if (placements.length !== SHIPS.length) {
    return { valid: false, reason: 'Нужно расставить все корабли.' };
  }

  const sortedIds = [...placements.map((ship) => ship.shipId)].sort();
  const requiredIds = [...SHIPS.map((ship) => ship.id)].sort();
  if (JSON.stringify(sortedIds) !== JSON.stringify(requiredIds)) {
    return { valid: false, reason: 'Состав флота не совпадает с правилами.' };
  }

  const occupied = new Set<string>();
  const forbidden = new Set<string>();
  for (const placement of placements) {
    const definition = SHIPS.find((ship) => ship.id === placement.shipId);
    if (!definition || definition.length !== placement.length) {
      return { valid: false, reason: 'Некорректная длина корабля.' };
    }

    const cells = placementCells(placement);
    for (const cell of cells) {
      if (!inBounds(cell)) {
        return { valid: false, reason: 'Корабль выходит за пределы поля.' };
      }
      const key = `${cell.x}:${cell.y}`;
      if (occupied.has(key)) {
        return { valid: false, reason: 'Корабли не могут пересекаться.' };
      }
      if (forbidden.has(key)) {
        return { valid: false, reason: 'Между кораблями должна быть минимум одна клетка.' };
      }
    }

    for (const cell of cells) {
      const key = `${cell.x}:${cell.y}`;
      occupied.add(key);
    }

    for (const cell of cells) {
      for (const neighbor of neighborKeys(cell)) {
        if (!occupied.has(neighbor)) {
          forbidden.add(neighbor);
        }
      }
    }
  }

  return { valid: true };
}

export function canPlaceShip(
  currentPlacements: ShipPlacement[],
  nextPlacement: ShipPlacement,
): PlacementValidation {
  for (const cell of placementCells(nextPlacement)) {
    if (!inBounds(cell)) {
      return { valid: false, reason: 'Корабль выходит за пределы поля.' };
    }
  }

  const rest = currentPlacements.filter((item) => item.shipId !== nextPlacement.shipId);
  const occupied = new Set<string>();
  const forbidden = new Set<string>();
  for (const placement of rest) {
    for (const cell of placementCells(placement)) {
      const key = `${cell.x}:${cell.y}`;
      occupied.add(key);
      for (const neighbor of neighborKeys(cell)) {
        forbidden.add(neighbor);
      }
    }
  }

  for (const cell of placementCells(nextPlacement)) {
    const key = `${cell.x}:${cell.y}`;
    if (occupied.has(key)) {
      return { valid: false, reason: 'Корабли не могут пересекаться.' };
    }
    if (forbidden.has(key)) {
      return { valid: false, reason: 'Между кораблями должна быть минимум одна клетка.' };
    }
  }

  return { valid: true };
}

export function buildBoardFromPlacements(placements: ShipPlacement[]): PlayerBoard {
  const board = createEmptyBoard();
  board.ships = placements.map((ship) => ({ ...ship, start: { ...ship.start } }));

  for (const ship of board.ships) {
    for (const cell of placementCells(ship)) {
      board.cells[cell.y][cell.x] = {
        x: cell.x,
        y: cell.y,
        state: 'ship',
        shipId: ship.shipId,
      };
    }
  }

  return board;
}

export function generateRandomPlacements(initialPlacements: ShipPlacement[] = []): ShipPlacement[] {
  function shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function randomPlacementForShip(
    ship: (typeof SHIPS)[number],
    placements: ShipPlacement[],
  ): ShipPlacement | undefined {
    const orientations: Orientation[] = ship.length === 1 ? ['horizontal'] : shuffle(['horizontal', 'vertical']);

    for (let attempt = 0; attempt < 160; attempt += 1) {
      const orientation = orientations[attempt % orientations.length];
      const maxX = orientation === 'horizontal' ? BOARD_SIZE - ship.length : BOARD_SIZE - 1;
      const maxY = orientation === 'vertical' ? BOARD_SIZE - ship.length : BOARD_SIZE - 1;
      const placement: ShipPlacement = {
        shipId: ship.id,
        length: ship.length,
        orientation,
        start: {
          x: Math.floor(Math.random() * (maxX + 1)),
          y: Math.floor(Math.random() * (maxY + 1)),
        },
      };

      if (canPlaceShip(placements, placement).valid) {
        return placement;
      }
    }

    return undefined;
  }

  const normalizedInitialPlacements = initialPlacements.map((placement) => ({
    ...placement,
    start: { ...placement.start },
  }));

  const seenShipIds = new Set<ShipId>();
  const checkedPlacements: ShipPlacement[] = [];
  for (const placement of normalizedInitialPlacements) {
    if (seenShipIds.has(placement.shipId)) {
      throw new Error('Корабль уже расставлен.');
    }

    const validation = canPlaceShip(checkedPlacements, placement);
    if (!validation.valid) {
      throw new Error(validation.reason ?? 'Часть флота уже расставлена некорректно.');
    }

    seenShipIds.add(placement.shipId);
    checkedPlacements.push(placement);
  }

  const remainingShips = shuffle(
    SHIPS.filter((ship) => !seenShipIds.has(ship.id)).sort((left, right) => right.length - left.length),
  );

  for (let restart = 0; restart < 400; restart += 1) {
    let placements = [...checkedPlacements];
    let failed = false;

    for (const ship of remainingShips) {
      const placement = randomPlacementForShip(ship, placements);
      if (!placement) {
        failed = true;
        break;
      }
      placements = [...placements, placement];
    }

    if (!failed && validatePlacements(placements).valid) {
      return placements;
    }
  }

  if (checkedPlacements.length === SHIPS.length && validatePlacements(checkedPlacements).valid) {
    return checkedPlacements;
  }

  {
    throw new Error('Не удалось сгенерировать корректную расстановку флота.');
  }
}

export function sanitizeRoomForPlayer(room: RoomState, playerId?: string): SanitizedRoomState {
  return {
    code: room.code,
    phase: room.phase,
    currentTurnPlayerId: room.currentTurnPlayerId,
    winnerId: room.winnerId,
    lastAction: room.lastAction,
    rematchRequesterId: (room as RoomState & { rematchRequesterId?: string }).rematchRequesterId,
    createdAt: room.createdAt,
    youAreHost: room.hostId === playerId,
    youPlayerId: playerId,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      shotsFired: player.shotsFired,
      sunkShips: [...player.board.sunkShips],
      ownBoard:
        player.id === playerId
          ? player.board
          : {
              ...player.board,
              ships: [],
              cells: player.board.cells.map((row) =>
                row.map((cell) => ({
                  x: cell.x,
                  y: cell.y,
                  state:
                    cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk'
                      ? cell.state
                      : 'empty',
                })),
              ),
            },
      targetBoard: player.targetBoard,
      isYou: player.id === playerId,
    })),
  };
}

function findShip(board: PlayerBoard, shipId: ShipId): ShipPlacement | undefined {
  return board.ships.find((ship) => ship.shipId === shipId);
}

export function applyShot(
  attacker: PlayerState,
  defender: PlayerState,
  coord: Coord,
): { ok: boolean; result?: ShotResult; message?: string } {
  if (!inBounds(coord)) {
    return { ok: false, message: 'Выстрел за пределами поля.' };
  }

  if (attacker.targetBoard[coord.y][coord.x].state !== 'unknown') {
    return { ok: false, message: 'По этой клетке уже стреляли.' };
  }

  const defendingCell = defender.board.cells[coord.y][coord.x];
  if (defendingCell.state === 'empty' || defendingCell.state === 'miss') {
    attacker.targetBoard[coord.y][coord.x].state = 'miss';
    defender.board.cells[coord.y][coord.x].state = 'miss';
    attacker.shotsFired += 1;
    return { ok: true, result: 'miss' };
  }

  if (defendingCell.state === 'ship' || defendingCell.state === 'hit') {
    const shipId = defendingCell.shipId;
    if (!shipId) {
      return { ok: false, message: 'У клетки нет shipId.' };
    }

    defender.board.cells[coord.y][coord.x].state = 'hit';
    attacker.targetBoard[coord.y][coord.x].state = 'hit';
    attacker.shotsFired += 1;

    const ship = findShip(defender.board, shipId);
    if (!ship) {
      return { ok: false, message: 'Корабль не найден.' };
    }

    const shipCells = placementCells(ship);
    const allHit = shipCells.every((cell) => {
      const state = defender.board.cells[cell.y][cell.x].state;
      return state === 'hit' || state === 'sunk';
    });

    if (allHit) {
      for (const cell of shipCells) {
        defender.board.cells[cell.y][cell.x].state = 'sunk';
        attacker.targetBoard[cell.y][cell.x].state = 'sunk';
      }
      if (!defender.board.sunkShips.includes(shipId)) {
        defender.board.sunkShips.push(shipId);
      }
      return { ok: true, result: 'sunk' };
    }

    return { ok: true, result: 'hit' };
  }

  return { ok: false, message: 'Некорректное состояние клетки.' };
}

export function fleetDestroyed(board: PlayerBoard): boolean {
  return board.sunkShips.length === SHIPS.length;
}

export function otherPlayer(room: RoomState, playerId: string): PlayerState | undefined {
  return room.players.find((player) => player.id !== playerId);
}
