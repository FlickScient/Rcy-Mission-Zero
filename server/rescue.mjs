import { findPath } from "./game/pathfinding.mjs";

export const MISSION_SECONDS = 180;
export const STEP_TICKS = 4;

// Mirrors the site/unit layout in src/RescueVillage.tsx.
export const sites = [
  { id: "north", col: 2, row: 2, survivors: 2 },
  { id: "school", col: 8, row: 1, survivors: 1 },
  { id: "clinic", col: 9, row: 5, survivors: 2 },
  { id: "market", col: 3, row: 6, survivors: 1 }
];

export const unitsSeed = [
  { id: "alpha", col: 5, row: 3 },
  { id: "bravo", col: 6, row: 4 },
  { id: "charlie", col: 4, row: 4 }
];

export const TOTAL_SURVIVORS = sites.reduce((a, s) => a + s.survivors, 0);

function cloneUnits() {
  return unitsSeed.map((u) => ({ ...u, task: null, path: null, stepProgress: 0 }));
}

/**
 * Deterministically replays a Rescue Village operation from the
 * player's recorded dispatch orders alone.
 *
 * The client never reports a score, an XP amount, or a survivor
 * count directly -- it only reports WHAT ORDERS WERE GIVEN AND WHEN.
 * Everything about the outcome (which routes were actually valid,
 * how many survivors were actually rescued, how much time and
 * supplies were actually used, how much XP that is worth) is
 * recomputed here against the exact same fixed map and pathfinding
 * used on the frontend. A tampered or fabricated dispatch log can at
 * worst waste its own orders; it cannot fabricate a result, because
 * this function never reads a result out of the input -- only orders.
 */
export function simulateRescue(dispatches) {
  const orders = Array.isArray(dispatches) ? dispatches.slice(0, 200) : [];
  const bySecond = new Map();
  for (const raw of orders) {
    if (!raw || typeof raw !== "object") continue;
    const unitId = typeof raw.unitId === "string" ? raw.unitId : null;
    const siteId = typeof raw.siteId === "string" ? raw.siteId : null;
    const atSecond = Number.isInteger(raw.atSecond) ? raw.atSecond : null;
    if (!unitId || !siteId || atSecond === null) continue;
    if (atSecond < 0 || atSecond >= MISSION_SECONDS) continue;
    if (!sites.some((s) => s.id === siteId)) continue;
    if (!unitsSeed.some((u) => u.id === unitId)) continue;
    const list = bySecond.get(atSecond) || [];
    list.push({ unitId, siteId });
    bySecond.set(atSecond, list);
  }

  let units = cloneUnits();
  const saved = {};
  let kits = 6;
  let water = 8;
  let secondsUsed = 0;

  for (let second = 0; second < MISSION_SECONDS; second++) {
    const totalSaved = Object.values(saved).reduce((a, b) => a + b, 0);
    if (totalSaved >= TOTAL_SURVIVORS) break;
    const allIdle = units.every((u) => !u.task);
    if ((kits <= 0 || water <= 0) && allIdle) break;

    for (const order of bySecond.get(second) || []) {
      const unit = units.find((u) => u.id === order.unitId);
      const site = sites.find((s) => s.id === order.siteId);
      if (!unit || !site || unit.task) continue;
      const already = (saved[site.id] || 0) + units.filter((u) => u.task === site.id).length;
      if (already >= site.survivors) continue;
      const route = findPath({ col: unit.col, row: unit.row }, { col: site.col, row: site.row });
      if (route === null) continue;
      const travelPath = route.slice(1);
      if (travelPath.length === 0) continue;
      const waterCost = 1 + Math.floor(travelPath.length / 4);
      if (kits <= 0 || water < waterCost) continue;
      kits -= 1;
      water -= waterCost;
      unit.task = site.id;
      unit.path = travelPath;
      unit.stepProgress = 0;
    }

    units = units.map((u) => {
      if (!u.task || !u.path || u.path.length === 0) return u;
      const stepProgress = u.stepProgress + 1;
      if (stepProgress >= STEP_TICKS) {
        const nextCell = u.path[0];
        const rest = u.path.slice(1);
        if (rest.length === 0) {
          const site = sites.find((s) => s.id === u.task);
          saved[site.id] = Math.min(site.survivors, (saved[site.id] || 0) + 1);
          return { ...u, col: nextCell.col, row: nextCell.row, task: null, path: null, stepProgress: 0 };
        }
        return { ...u, col: nextCell.col, row: nextCell.row, path: rest, stepProgress: 0 };
      }
      return { ...u, stepProgress };
    });

    secondsUsed = second + 1;
  }

  const survivorsRescued = Object.values(saved).reduce((a, b) => a + b, 0);
  const completed = survivorsRescued >= TOTAL_SURVIVORS;
  const secondsRemaining = completed ? MISSION_SECONDS - secondsUsed : 0;
  const kitsUsed = 6 - kits;
  const waterUsed = 8 - water;
  const xp = survivorsRescued * 8 + (completed ? 25 + Math.floor(secondsRemaining / 10) : 0);

  return {
    survivorsRescued,
    totalSurvivors: TOTAL_SURVIVORS,
    completed,
    secondsUsed,
    kitsUsed,
    waterUsed,
    xp
  };
}
