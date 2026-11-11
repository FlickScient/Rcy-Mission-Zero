import { isBlocked } from "./grid.mjs";

function cellKey(cell) {
  return `${cell.col},${cell.row}`;
}

const DIRECTIONS = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 }
];

// Mirrors src/game/pathfinding.ts exactly (same BFS, same return
// shape: [start, ...cells..., goal], or null if unreachable).
export function findPath(start, goal) {
  if (isBlocked(start.col, start.row) || isBlocked(goal.col, goal.row)) return null;
  if (start.col === goal.col && start.row === goal.row) return [];

  const startKey = cellKey(start);
  const goalKey = cellKey(goal);
  const visited = new Set([startKey]);
  const queue = [start];
  const cameFrom = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    for (const dir of DIRECTIONS) {
      const next = { col: current.col + dir.col, row: current.row + dir.row };
      const nextKey = cellKey(next);
      if (visited.has(nextKey)) continue;
      const isGoal = nextKey === goalKey;
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

function reconstructPath(cameFrom, start, goal) {
  const path = [goal];
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
