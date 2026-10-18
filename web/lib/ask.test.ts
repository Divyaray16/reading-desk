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

function assertOnShelf(result: ReturnType<typeof ask>) {
  const list =
    result.kind === "reads" ? result.pieces : result.kind === "advice" ? [result.piece] : [];
  for (const piece of list) {
    assert.equal(urls.has(piece.url), true);
    assert.equal(titles.has(piece.title), true);
    const source = pieces.find((item) => item.id === piece.id);
    assert.ok(source);
    assert.equal(piece.url, source.url);
    assert.equal(piece.title, source.title);
  }
}

test("a reading question returns at most three shelf pieces", () => {
  const result = ask("give me an AI UX blog");
  assert.equal(result.kind, "reads");
  if (result.kind !== "reads") return;
  assert.ok(result.pieces.length >= 1 && result.pieces.length <= 3);
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

test("an empty-screen question is answered from the matching piece", () => {
  const result = ask("what should the empty screen say");
  assert.equal(result.kind, "advice");
  if (result.kind !== "advice") return;
  assert.equal(result.piece.id, "empty-states");
  assert.equal(result.text.includes(result.piece.about), true);
  assert.equal(result.text.includes(result.piece.gives), true);
  assert.equal(result.text.includes(result.piece.title), true);
  const count = sentenceCount(result.text);
  assert.ok(count >= 2 && count <= 4);
  assert.equal(adviceText(result.piece), result.text);
  assertOnShelf(result);
});

test("color and accessibility match the color-system piece", () => {
  const result = ask("give me an article on color and accessibility");
  assert.equal(result.kind, "reads");
  if (result.kind !== "reads") return;
  assert.equal(result.pieces[0]?.id, "stripe-color");
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
    assert.equal(controls.piece.topics.includes("complexity"), true);
    assert.ok(sentenceCount(controls.text) >= 2 && sentenceCount(controls.text) <= 4);
  }

  const system = ask("give me a design system article");
  assert.equal(system.kind, "reads");
  if (system.kind === "reads") {
    assert.ok(system.pieces.every((piece) => piece.topics.includes("design systems")));
    assert.ok(system.pieces.length <= 3);
  }
});

test("an unknown question is one sentence and invents nothing", () => {
  const result = ask("quantum origami for a submarine");
  assert.deepEqual(result, { kind: "none", text: NO_MATCH });
  assert.equal(sentenceCount(NO_MATCH), 1);
  assert.equal(NO_MATCH.includes("http"), false);
});
