import { BOARD_SIZE, SHIPS } from './constants';
import { canPlaceShip } from './placement';
import type { Orientation, ShipPlacement } from './types';

type RandomLike = () => number;

function randomInt(random: RandomLike, max: number) {
  return Math.floor(random() * max);
}

export function generateRandomPlacements(random: RandomLike = Math.random): ShipPlacement[] {
  const placements: ShipPlacement[] = [];

  for (const ship of [...SHIPS].sort((left, right) => right.length - left.length)) {
    let placed = false;

    for (let attempt = 0; attempt < 2_000; attempt += 1) {
      const orientation: Orientation = random() < 0.5 ? 'horizontal' : 'vertical';
      const placement: ShipPlacement = {
        shipId: ship.id,
        length: ship.length,
          orientation,
          start: {
          x: randomInt(random, BOARD_SIZE),
          y: randomInt(random, BOARD_SIZE),
        },
      };

      if (!canPlaceShip(placements, placement).valid) {
        continue;
      }

      placements.push(placement);
      placed = true;
      break;
    }

    if (!placed) {
      throw new Error(`Не удалось автоматически расставить корабль ${ship.id}.`);
    }
  }

  return placements;
}
