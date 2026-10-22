import assert from "node:assert/strict";
import test from "node:test";
import { articles } from "./corpus.ts";
import { isApprovedSource, sources, sourcesNotYetRetrieved } from "./sources.ts";

test("retrieved articles stay inside the approved registry", () => {
  assert.ok(articles.length > 50);
  for (const article of articles) {
    assert.equal(isApprovedSource(article.sourceId), true);
    assert.equal(article.url.includes("utm_source"), false);
  }
  const stored = [...new Set(articles.map((article) => article.sourceId))];
  const pending = sourcesNotYetRetrieved(stored);
  assert.ok(pending.length > 2);
  for (const source of pending) {
    assert.equal(articles.some((article) => article.sourceId === source.id), false, source.id);
  }
  for (const id of ["hax", "pair", "measuringu", "ixdf", "openai-research", "w3c-wai", "fable"]) {
    assert.equal(pending.some((source) => source.id === id), true, id);
  }
  for (const id of ["nng", "figma", "anthropic", "smashing", "ux-collective"]) {
    assert.equal(pending.some((source) => source.id === id), false, id);
    assert.ok(articles.some((article) => article.sourceId === id), id);
  }
  assert.equal(sources.some((source) => source.id === "anthropic-engineering"), true);
  assert.equal(articles.some((article) => article.sourceId === "anthropic-engineering"), false);
});
