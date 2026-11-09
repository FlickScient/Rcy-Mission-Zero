import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateRescue, sites, unitsSeed, TOTAL_SURVIVORS } from "./rescue.mjs";

test("no dispatches rescues nobody and awards no XP", () => {
  const r = simulateRescue([]);
  assert.equal(r.survivorsRescued, 0);
  assert.equal(r.completed, false);
  assert.equal(r.xp, 0);
});

test("a single valid dispatch eventually rescues a survivor", () => {
  const unit = unitsSeed[0];
  const site = sites.find((s) => s.id === "north");
  const r = simulateRescue([{ unitId: unit.id, siteId: site.id, atSecond: 0 }]);
  assert.ok(r.survivorsRescued >= 1, "expected at least one survivor rescued");
  assert.ok(r.kitsUsed >= 1, "expected at least one kit spent");
});

test("malformed, unknown or out-of-range orders are ignored rather than crashing", () => {
  const r = simulateRescue([
    { unitId: "not-a-real-unit", siteId: "north", atSecond: 0 },
    { unitId: unitsSeed[0].id, siteId: "nowhere", atSecond: 0 },
    { unitId: unitsSeed[0].id, siteId: "north", atSecond: 999999 },
    null,
    "garbage",
    42
  ]);
  assert.equal(r.survivorsRescued, 0);
});

test("a unit already on a task cannot be double-dispatched", () => {
  const unit = unitsSeed[0];
  const r = simulateRescue([
    { unitId: unit.id, siteId: "north", atSecond: 0 },
    { unitId: unit.id, siteId: "school", atSecond: 0 }
  ]);
  // Only the first order for this unit at this second can possibly
  // take effect; the unit cannot be in two places at once.
  assert.ok(r.kitsUsed <= 1);
});

test("dispatching every unit to every site never exceeds the map total", () => {
  const dispatches = [];
  for (const unit of unitsSeed) {
    for (const site of sites) {
      dispatches.push({ unitId: unit.id, siteId: site.id, atSecond: 0 });
    }
  }
  const r = simulateRescue(dispatches);
  assert.ok(r.survivorsRescued <= TOTAL_SURVIVORS);
  assert.ok(r.secondsUsed <= 180);
});
