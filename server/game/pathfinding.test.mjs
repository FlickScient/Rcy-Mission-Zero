import { test } from "node:test";
import assert from "node:assert/strict";
import { findPath } from "./pathfinding.mjs";
import { isBlocked, COLS, ROWS } from "./grid.mjs";

test("every rescue site has a valid obstacle-aware route from each starting team", async () => {
  const starts = [{ col: 5, row: 3 }, { col: 6, row: 4 }, { col: 4, row: 4 }];
  const goals = [{ col: 2, row: 2 }, { col: 8, row: 1 }, { col: 9, row: 5 }, { col: 3, row: 6 }];
  for (const start of starts) {
    for (const goal of goals) {
      const path = findPath(start, goal);
      assert.ok(path && path.length > 0, `expected route from ${start.col},${start.row} to ${goal.col},${goal.row}`);
      assert.deepEqual(path[0], start);
      assert.deepEqual(path[path.length - 1], goal);
      for (let i = 1; i < path.length; i++) {
        const step = path[i];
        const previous = path[i - 1];
        assert.equal(Math.abs(step.col - previous.col) + Math.abs(step.row - previous.row), 1);
        if (i < path.length - 1) assert.equal(isBlocked(step.col, step.row), false);
        assert.ok(step.col >= 0 && step.col < COLS && step.row >= 0 && step.row < ROWS);
      }
    }
  }
});

test("pathfinder rejects destinations outside the playable grid", () => {
  assert.equal(findPath({ col: 5, row: 3 }, { col: -1, row: 2 }), null);
  assert.equal(findPath({ col: 5, row: 3 }, { col: COLS, row: ROWS }), null);
});

test("pathfinder handles a unit already at its destination", () => {
  assert.deepEqual(findPath({ col: 2, row: 2 }, { col: 2, row: 2 }), []);
});
