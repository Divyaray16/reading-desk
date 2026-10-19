import assert from "node:assert/strict";
import test from "node:test";
import { categories } from "./categories.ts";
import { selectDesk } from "./desk.ts";

test("each category returns only https articles from the library", () => {
  for (const category of categories) {
    const desk = selectDesk(category.id, { skipped: [], useful: [] }, new Date("2026-10-19T12:00:00Z"));
    assert.ok(desk.shown.length <= 3);
    for (const article of desk.shown) {
      assert.equal(article.url.startsWith("https://"), true);
      assert.equal(article.explanation.text.length > 40, true);
      assert.notEqual(article.evidence, "full_text");
    }
  }
});
