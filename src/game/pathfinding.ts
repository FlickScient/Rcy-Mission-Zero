import { isBlocked } from "./grid";

export type Cell = { col: number; row: number };

function cellKey(cell: Cell): string {
  return `${cell.col},${cell.row}`;
}

const DIRECTIONS: Cell[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 }
];

/**
 * Breadth-first search over the grid defined in ./grid.
 * Returns the full route INCLUDING the start cell and the goal cell,
 * e.g. [start, ...intermediate cells..., goal].
 * Returns null when no route exists so callers can handle an
 * unreachable destination explicitly instead of assigning an
 * impossible task.
 */
export function findPath(start: Cell, goal: Cell): Cell[] | null {
  if (start.col === goal.col && start.row === goal.row) return [];

  const startKey = cellKey(start);
  const goalKey = cellKey(goal);
  const visited = new Set<string>([startKey]);
  const queue: Cell[] = [start];
  const cameFrom = new Map<string, Cell>();

  while (queue.length > 0) {
    const current = queue.shift() as Cell;
    for (const dir of DIRECTIONS) {
      const next: Cell = { col: current.col + dir.col, row: current.row + dir.row };
      const nextKey = cellKey(next);
      if (visited.has(nextKey)) continue;
      const isGoal = nextKey === goalKey;
      // The goal tile itself is always enterable (it's a rescue site),
      // even though it is never listed as an obstacle in practice.
      if (!isGoal && isBlocked(next.col, next.row)) continue;
      visited.add(nextKey);
      cameFrom.set(nextKey, current);
      if (isGoal) {
        return reconstructPath(cameFrom, start, next);
      }
      queue.push(next);
    }
  }
  return null;
}

function reconstructPath(cameFrom: Map<string, Cell>, start: Cell, goal: Cell): Cell[] {
  const path: Cell[] = [goal];
  const startKey = cellKey(start);
  let currentKey = cellKey(goal);
  while (currentKey !== startKey) {
    const previous = cameFrom.get(currentKey);
    if (!previous) break;
    path.push(previous);
    currentKey = cellKey(previous);
  }
  return path.reverse();
}
