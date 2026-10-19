import assert from "node:assert/strict";
import test from "node:test";
import { articles } from "./corpus.ts";
import { isApprovedSource, sources } from "./sources.ts";

test("retrieved articles stay inside the approved registry", () => {
  assert.ok(articles.length > 50);
  for (const article of articles) {
    assert.equal(isApprovedSource(article.sourceId), true);
    assert.equal(article.url.includes("utm_source"), false);
  }
  const represented = new Set(articles.map((article) => article.sourceId));
  const missing = sources.filter((source) => !represented.has(source.id)).map((source) => source.id);
  assert.deepEqual(missing.sort(), ["hax", "pair"]);
});
