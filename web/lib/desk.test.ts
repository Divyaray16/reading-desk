import assert from "node:assert/strict";
import test from "node:test";
import { kolkataLabel, selectDesk } from "./desk.ts";

test("best three vary publications and stay on the shelf", () => {
  const desk = selectDesk("best", [], 0);
  assert.equal(desk.shown.length, 3);
  assert.deepEqual(
    desk.shown.map((piece) => piece.id),
    ["set-boundaries", "uxcollective-empty-types", "stripe-color"],
  );
  assert.equal(new Set(desk.shown.map((piece) => piece.publicationId)).size, 3);
  assert.equal(desk.note, null);
});

test("next three does not repeat until the set is exhausted", () => {
  const first = selectDesk("best", [], 0).shown.map((piece) => piece.id);
  const second = selectDesk("best", [], 1).shown.map((piece) => piece.id);
  assert.equal(second.length, 3);
  assert.equal(second.some((id) => first.includes(id)), false);
  const wrapped = selectDesk("best", [], 9).shown.map((piece) => piece.id);
  assert.deepEqual(wrapped, first);
});

test("a topic with fewer than three matches shows those and says so", () => {
  const desk = selectDesk("critique", [], 0);
  assert.deepEqual(
    desk.shown.map((piece) => piece.id),
    ["intercom-dribbblisation", "product-critique"],
  );
  assert.equal(desk.note, "Two pieces match. The shelf does not have a third.");
});

test("empty screen, controls, and design system each cap at three", () => {
  assert.deepEqual(
    selectDesk("empty", [], 0).shown.map((piece) => piece.id),
    ["uxcollective-empty-types", "empty-states", "smashing-empty"],
  );
  assert.deepEqual(
    selectDesk("controls", [], 0).shown.map((piece) => piece.id),
    ["set-boundaries", "progressive-disclosure", "stripe-payments-apis"],
  );
  assert.deepEqual(
    selectDesk("system", [], 0).shown.map((piece) => piece.id),
    ["linear-design-reset", "no-crap", "ala-modular"],
  );
});

test("a skip hides that piece and the next one fills the desk", () => {
  const desk = selectDesk("best", ["set-boundaries"], 0);
  assert.equal(desk.shown.length, 3);
  assert.equal(desk.shown.some((piece) => piece.id === "set-boundaries"), false);
  assert.equal(desk.shown[0]?.id, "uxcollective-empty-types");
});

test("skipping a short topic can empty the desk without inventing a piece", () => {
  const desk = selectDesk("critique", ["intercom-dribbblisation", "product-critique"], 0);
  assert.deepEqual(desk.shown, []);
  assert.match(desk.note ?? "", /skipped/i);
});

test("the date label is Asia/Kolkata", () => {
  const label = kolkataLabel(new Date("2026-10-16T20:00:00Z"));
  assert.match(label, /Saturday, 17 October 2026/);
  assert.match(label, /Asia\/Kolkata/);
});
