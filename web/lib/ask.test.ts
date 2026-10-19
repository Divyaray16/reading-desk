import assert from "node:assert/strict";
import test from "node:test";
import { ask, adviceText, NO_MATCH } from "./ask.ts";
import { pieces } from "./catalog.ts";

const urls = new Set(pieces.map((piece) => piece.url));
const titles = new Set(pieces.map((piece) => piece.title));

function sentenceCount(text: string): number {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function piecesOf(result: ReturnType<typeof ask>) {
  if (result.kind === "reads" || result.kind === "advice") return result.pieces;
  return [];
}

function assertOnShelf(result: ReturnType<typeof ask>) {
  const list = piecesOf(result);
  for (const piece of list) {
    assert.equal(urls.has(piece.url), true);
    assert.equal(titles.has(piece.title), true);
    const source = pieces.find((item) => item.id === piece.id);
    assert.ok(source);
    assert.equal(piece.url, source.url);
    assert.equal(piece.title, source.title);
  }
}

test("a reading question returns the matching shelf pieces, at most three", () => {
  const result = ask("give me an AI UX blog");
  assert.equal(result.kind, "reads");
  if (result.kind !== "reads") return;
  assert.deepEqual(
    result.pieces.map((piece) => piece.id),
    ["figma-content", "smashing-microcopy"],
  );
  assertOnShelf(result);
  assert.equal(
    result.pieces[0]?.title,
    "How to do content design / UX writing in Figma",
  );
  assert.equal(
    result.pieces[0]?.url,
    "https://www.figma.com/blog/how-to-do-content-design-ux-writing-in-figma/",
  );
});

test("an empty-screen question returns the matching essays and one advice sentence", () => {
  const result = ask("what should the empty screen say");
  assert.equal(result.kind, "advice");
  if (result.kind !== "advice") return;
  assert.deepEqual(
    result.pieces.map((piece) => piece.id),
    ["empty-states", "uxplanet-empty-guide", "smashing-empty"],
  );
  const lead = result.pieces[0];
  assert.ok(lead);
  assert.equal(result.text.includes(lead.about), true);
  assert.equal(result.text.includes(lead.gives), true);
  assert.equal(result.text.includes(lead.title), true);
  const count = sentenceCount(result.text);
  assert.ok(count >= 2 && count <= 4);
  assert.equal(adviceText(lead), result.text);
  assert.equal(new Set(result.pieces.map((piece) => piece.id)).size, result.pieces.length);
  assertOnShelf(result);
});

test("color and accessibility match the color-system piece and do not pad", () => {
  const result = ask("give me an article on color and accessibility");
  assert.equal(result.kind, "reads");
  if (result.kind !== "reads") return;
  assert.deepEqual(
    result.pieces.map((piece) => piece.id),
    ["stripe-color"],
  );
  assert.equal(result.pieces[0]?.url, "https://stripe.com/blog/accessible-color-systems");
  assertOnShelf(result);
});

test("critique, controls, and design system use those topic tags", () => {
  const critique = ask("give me a critique");
  assert.equal(critique.kind, "reads");
  if (critique.kind === "reads") {
    assert.deepEqual(
      critique.pieces.map((piece) => piece.id),
      ["product-critique", "intercom-dribbblisation"],
    );
  }

  const controls = ask("what should I do about too many controls");
  assert.equal(controls.kind, "advice");
  if (controls.kind === "advice") {
    assert.deepEqual(
      controls.pieces.map((piece) => piece.id),
      ["progressive-disclosure", "ala-interaction", "training-wheels"],
    );
    assert.ok(controls.pieces.every((piece) => piece.topics.includes("complexity")));
    assert.equal(adviceText(controls.pieces[0]!), controls.text);
    assert.ok(sentenceCount(controls.text) >= 2 && sentenceCount(controls.text) <= 4);
  }

  const system = ask("give me a design system article");
  assert.equal(system.kind, "reads");
  if (system.kind === "reads") {
    assert.equal(system.pieces.length, 3);
    assert.ok(system.pieces.every((piece) => piece.topics.includes("design systems")));
  }
});

test("a design question returns three essays and keeps the short advice", () => {
  const result = ask("ai in design");
  assert.equal(result.kind, "advice");
  if (result.kind !== "advice") return;
  assert.deepEqual(
    result.pieces.map((piece) => piece.id),
    ["linear-design-reset", "no-crap", "figma-ds-101"],
  );
  assert.equal(result.text, adviceText(result.pieces[0]!));
  assert.equal(sentenceCount(result.text) <= 4, true);
  for (const piece of result.pieces) {
    const haystack = `${piece.title} ${piece.about} ${piece.topics.join(" ")}`.toLowerCase();
    assert.equal(haystack.includes("design"), true);
    assert.equal(piece.url.startsWith("https://"), true);
  }
  assertOnShelf(result);
});

test("an unknown question is one sentence and invents nothing", () => {
  const result = ask("quantum origami for a submarine");
  assert.deepEqual(result, { kind: "none", text: NO_MATCH });
  assert.equal(sentenceCount(NO_MATCH), 1);
  assert.equal(NO_MATCH.includes("http"), false);
});
