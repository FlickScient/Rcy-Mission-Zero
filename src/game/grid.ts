export const COLS = 12;
export const ROWS = 8;

export type ObstacleKind = "shed" | "rubble" | "water";

export type Obstacle = {
  col: number;
  row: number;
  kind: ObstacleKind;
};

// Real obstacles the pathfinder must route around. These are placed so
// that the direct line from the starting units to the clinic and market
// sites is blocked, forcing an actual detour rather than a straight walk.
export const obstacles: Obstacle[] = [
  { col: 5, row: 1, kind: "shed" },
  { col: 6, row: 2, kind: "shed" },
  { col: 7, row: 2, kind: "rubble" },
  { col: 1, row: 5, kind: "rubble" },
  { col: 8, row: 4, kind: "water" },
  { col: 8, row: 5, kind: "water" },
  { col: 9, row: 4, kind: "water" },
  { col: 7, row: 6, kind: "water" },
  { col: 6, row: 6, kind: "water" }
];

const blockedKey = new Set(obstacles.map((o) => `${o.col},${o.row}`));

export function isBlocked(col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  return blockedKey.has(`${col},${row}`);
}

export function obstacleAt(col: number, row: number): Obstacle | undefined {
  return obstacles.find((o) => o.col === col && o.row === row);
}
