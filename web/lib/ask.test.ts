import assert from "node:assert/strict";
import test from "node:test";
import { ask, NO_MATCH } from "./ask.ts";
import { sourceById } from "./sources.ts";

test("a question returns up to three real articles", () => {
  const result = ask("agent orchestration and tool use", new Date("2026-10-19T12:00:00Z"));
  assert.equal(result.kind, "reads");
  if (result.kind !== "reads") return;
  assert.ok(result.articles.length >= 1);
  assert.ok(result.articles.length <= 3);
  for (const article of result.articles) {
    assert.equal(article.url.startsWith("https://"), true);
    assert.equal(Boolean(sourceById(article.publication) || article.publication.length > 0), true);
    assert.equal(article.explanation.evidence === "full_text", false);
  }
});

test("an empty question does not invent an article", () => {
  const result = ask("the");
  assert.deepEqual(result, { kind: "none", text: NO_MATCH });
});
