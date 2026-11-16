export const COLS = 12;
export const ROWS = 8;

// Mirrors src/game/grid.ts exactly. Kept as a separate server copy
// (rather than importing the frontend file) because this is a plain
// Node ESM server with no TypeScript build step, and this grid must
// never depend on anything the client sends.
export const obstacles = [
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

export function isBlocked(col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  return blockedKey.has(`${col},${row}`);
}
