import test from "node:test";
import assert from "node:assert/strict";
import { evaluateChoice, findMission, missions, publicMission } from "./missions.mjs";

test("mission catalogue exposes the demo mission", () => {
  assert.equal(missions.length, 1);
  assert.equal(findMission("roadside-collision-001")?.title, "The Roadside Collision");
});

test("public mission does not expose answer keys", () => {
  const mission = publicMission(findMission("roadside-collision-001"));
  assert.ok(mission.choices.length > 0);
  assert.equal("evaluation" in mission, false);
  assert.equal("correct" in mission.choices[0], false);
});

test("safe decision receives server-defined score", () => {
  const result = evaluateChoice(findMission("roadside-collision-001"), "secure");
  assert.equal(result.correct, true);
  assert.equal(result.score, 100);
});

test("unsafe or unknown decisions cannot receive a passing score", () => {
  const mission = findMission("roadside-collision-001");
  assert.equal(evaluateChoice(mission, "rush").score, 0);
  assert.equal(evaluateChoice(mission, "not-a-choice"), null);
});
