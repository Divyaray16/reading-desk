import assert from "node:assert/strict";
import test from "node:test";
import { categories } from "./categories.ts";
import type { Article } from "./corpus.ts";
import { refreshDesk, replaceDayPick, selectDesk, showCached } from "./desk.ts";

const NOW = new Date("2026-10-19T12:00:00Z");
const EMPTY = { skipped: [] as string[], useful: [] as string[] };

function fixture(id: string, sourceId: string, title: string): Article {
  return {
    id,
    sourceId,
    title,
    url: `https://www.nngroup.com/articles/${id}/`,
    author: "Test Author",
    publishedAt: "2026-09-01T00:00:00Z",
    excerpt:
      "This synthetic fixture explains a usability test method and a practical pattern for navigation and accessibility. It is not a retrieved article.",
    evidence: "excerpt",
    retrievedAt: "2026-10-19T00:00:00Z",
  };
}

const POOL: Article[] = [
  fixture("refresh-1", "nng", "Accessibility heuristics for navigation labels"),
  fixture("refresh-2", "smashing", "How form design improves readability"),
  fixture("refresh-3", "alistapart", "Information architecture and wayfinding on screens"),
  fixture("refresh-4", "figma", "Cognitive load when writing an error message"),
  fixture("refresh-5", "baymard", "An inclusive design checklist for tactile ux"),
];

function idsOf(items: { id: string }[]): string[] {
  return items.map((item) => item.id);
}

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

test("refresh yields a different set and the day cache keeps it", () => {
  const first = selectDesk("foundations", EMPTY, NOW, POOL);
  assert.equal(first.shown.length, 3);
  assert.ok(first.qualifiedCount > 3);
  const original = idsOf(first.shown);

  const recomputed = idsOf(selectDesk("foundations", EMPTY, NOW, POOL).shown);
  assert.deepEqual(recomputed, original);

  const refreshed = refreshDesk("foundations", EMPTY, original, NOW, POOL);
  const nextIds = idsOf(refreshed.shown);
  assert.equal(nextIds.length, 3);
  assert.notDeepEqual([...nextIds].sort(), [...original].sort());
  for (const id of nextIds) {
    assert.equal(POOL.some((article) => article.id === id), true);
    assert.equal(refreshed.shown.find((item) => item.id === id)?.url.startsWith("https://"), true);
  }

  const picks = replaceDayPick({ interaction: ["leave-this"] }, "foundations", nextIds);
  assert.deepEqual(picks.interaction, ["leave-this"]);
  const restored = idsOf(showCached("foundations", picks["foundations"] ?? [], NOW, POOL));
  assert.deepEqual(restored, nextIds);
  assert.notDeepEqual(restored, original);

  const again = idsOf(refreshDesk("foundations", EMPTY, restored, NOW, POOL).shown);
  assert.equal(again.length, 3);
  assert.notDeepEqual([...again].sort(), [...restored].sort());
});

test("refresh rotates the real eligible set when only one extra article exists", () => {
  const library = POOL.slice(0, 4);
  const first = selectDesk("foundations", EMPTY, NOW, library);
  assert.equal(first.qualifiedCount, 4);
  const original = idsOf(first.shown);
  const nextIds = idsOf(refreshDesk("foundations", EMPTY, original, NOW, library).shown);
  assert.equal(nextIds.length, 3);
  assert.notDeepEqual([...nextIds].sort(), [...original].sort());
  for (const id of nextIds) assert.equal(library.some((article) => article.id === id), true);
});

test("refresh does not invent articles when fewer than four are eligible", () => {
  const library = POOL.slice(0, 3);
  const first = selectDesk("foundations", EMPTY, NOW, library);
  assert.equal(first.qualifiedCount, 3);
  const original = idsOf(first.shown);
  const refreshed = refreshDesk("foundations", EMPTY, original, NOW, library);
  assert.deepEqual(idsOf(refreshed.shown), original);
  const picks = replaceDayPick({}, "foundations", idsOf(refreshed.shown));
  assert.deepEqual(idsOf(showCached("foundations", picks["foundations"] ?? [], NOW, library)), original);
});

test("refresh keeps skipped articles hidden and does not require clearing useful marks", () => {
  const first = selectDesk("foundations", EMPTY, NOW, POOL);
  const skipped = first.shown[0]?.id;
  assert.ok(skipped);
  const useful = first.shown[1]?.id ?? "";
  const refreshed = refreshDesk("foundations", { skipped: [skipped], useful: [useful] }, idsOf(first.shown), NOW, POOL);
  assert.equal(refreshed.shown.some((item) => item.id === skipped), false);
  assert.equal(refreshed.shown.length, 3);
  for (const item of refreshed.shown) {
    assert.equal(POOL.some((article) => article.id === item.id), true);
  }
});
