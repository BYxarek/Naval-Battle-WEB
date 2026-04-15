import { inBounds } from './board';
import type { Coord } from './types';

export function neighborKeys(coord: Coord): string[] {
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
