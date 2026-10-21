import assert from "node:assert/strict";
import test from "node:test";
import { ask } from "./ask.ts";
import { categories } from "./categories.ts";
import { articles, type Article } from "./corpus.ts";
import { byNewestPublished, parsePublished } from "./day.ts";
import { bookmarksFor, pageDesk, refreshDesk, replaceDayPick, selectDesk, showCached } from "./desk.ts";
import { rankCategory } from "./rank.ts";

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
      "This synthetic fixture explains usability heuristics, information architecture, and a practical wayfinding pattern for navigation. It is not a retrieved article.",
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
    assert.equal(desk.shown.length, 3);
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

test("shown articles put the later published date first and leave undated articles last", () => {
  const excerpt =
    "This synthetic fixture explains usability heuristics, information architecture, and a practical wayfinding pattern for navigation. It is not a retrieved article.";
  function row(id: string, sourceId: string, title: string, publishedAt: string): Article {
    return {
      id,
      sourceId,
      title,
      url: `https://www.nngroup.com/articles/${id}/`,
      author: "Test Author",
      publishedAt,
      excerpt,
      evidence: "excerpt",
      retrievedAt: "2026-10-19T00:00:00Z",
    };
  }
  const newer = row("date-july-9", "nng", "Zebra wayfinding checklist for navigation labels", "Thu, 09 Jul 2026 15:00:00 GMT");
  const older = row("date-july-3", "smashing", "Alpha wayfinding checklist for form labels", "Fri, 03 Jul 2026 13:00:00 GMT");
  const october = row("date-oct-3", "figma", "October wayfinding checklist for menu labels", "2026-10-03T08:00:00Z");
  const undatedFirst = row("date-none-a", "alistapart", "Middle wayfinding checklist for page labels", "");
  const undatedSecond = row("date-none-b", "baymard", "Other wayfinding checklist for icon labels", "not-a-date");
  const trio = [older, undatedFirst, newer];

  const selected = selectDesk("foundations", { skipped: [], useful: ["date-july-3", "date-none-a"] }, NOW, trio);
  assert.deepEqual(idsOf(selected.shown), ["date-july-9", "date-july-3", "date-none-a"]);
  assert.equal(selected.shown[0]?.date, "9 Jul 2026");
  assert.equal(selected.shown[1]?.date, "3 Jul 2026");
  assert.equal(selected.shown[2]?.date, null);

  const refreshed = refreshDesk(
    "foundations",
    { skipped: [], useful: ["date-july-3", "date-none-a"] },
    idsOf(selected.shown),
    NOW,
    trio,
  );
  assert.deepEqual(idsOf(refreshed.shown), ["date-july-9", "date-july-3", "date-none-a"]);

  const stored = ["date-none-b", "date-july-3", "date-none-a", "date-july-9", "date-oct-3"];
  const library = [october, older, undatedFirst, newer, undatedSecond];
  const cached = showCached("foundations", stored, NOW, library);
  assert.deepEqual(idsOf(cached), ["date-oct-3", "date-july-9", "date-july-3", "date-none-b", "date-none-a"]);
  assert.ok(idsOf(cached).indexOf("date-july-9") < idsOf(cached).indexOf("date-july-3"));
  assert.ok(idsOf(cached).indexOf("date-none-a") > idsOf(cached).indexOf("date-july-3"));

  const asked = ask("wayfinding checklist", NOW, trio);
  assert.equal(asked.kind, "reads");
  if (asked.kind === "reads") {
    assert.deepEqual(
      asked.articles.map((article) => article.id),
      ["date-july-9", "date-july-3", "date-none-a"],
    );
  }

  const bookmarks = bookmarksFor(["date-july-9", "date-july-3"], trio);
  assert.deepEqual(
    bookmarks.map((item) => item.id),
    ["date-july-3", "date-july-9"],
  );
});

function publishedDays(items: readonly { id: string }[], library: readonly Article[]): string[] {
  return items.map((item) => {
    const article = library.find((row) => row.id === item.id);
    assert.ok(article, item.id);
    const parsed = parsePublished(article.publishedAt);
    return parsed ? parsed.toISOString().slice(0, 10) : "";
  });
}

test("the screenshot trio comes out 2026-09-24, 2026-09-11, then 2025-07-23", () => {
  const titles = [
    "An Holistic Framework for Shared Design Leadership",
    "Building A UX ROI Case That Survives The Boardroom",
    "What it takes to build great products now",
  ];
  const wanted = new Set(titles);
  const library = articles.filter((article) => wanted.has(article.title));
  assert.equal(library.length, 3);
  const byTitle = new Map(library.map((article) => [article.title, article]));
  const oldestFirst = titles.map((title) => byTitle.get(title));
  assert.ok(oldestFirst.every((article): article is Article => Boolean(article)));
  const stored = oldestFirst.map((article) => article.id);
  assert.deepEqual(publishedDays(oldestFirst, library), ["2025-07-23", "2026-09-11", "2026-09-24"]);

  const expected = ["2026-09-24", "2026-09-11", "2025-07-23"];
  assert.deepEqual(publishedDays(showCached("product", stored, NOW, library), library), expected);
  assert.deepEqual(publishedDays(selectDesk("product", EMPTY, NOW, library).shown, library), expected);
  assert.deepEqual(publishedDays(refreshDesk("product", EMPTY, stored, NOW, library).shown, library), expected);

  const live = selectDesk("product", EMPTY, NOW);
  const liveDays = publishedDays(live.shown, articles);
  assert.deepEqual(liveDays, byNewestPublished(liveDays, (day) => day));
  if (live.shown.length === 3 && titles.every((title) => live.shown.some((item) => item.title === title))) {
    assert.deepEqual(live.shown.map((item) => item.title), [
      "What it takes to build great products now",
      "Building A UX ROI Case That Survives The Boardroom",
      "An Holistic Framework for Shared Design Leadership",
    ]);
    assert.deepEqual(liveDays, expected);
  }
});

test("every category desk is newest published date first", () => {
  for (const category of categories) {
    const desk = selectDesk(category.id, EMPTY, NOW);
    const stamps = desk.shown.map((item) => articles.find((article) => article.id === item.id)?.publishedAt ?? "");
    assert.deepEqual(stamps, byNewestPublished(stamps, (stamp) => stamp), category.id);
  }
});

test("bookmarks keep the newest mark first and drop unknown ids", () => {
  const marks = ["refresh-1", "missing", "refresh-2", "refresh-1"];
  const bookmarks = bookmarksFor(marks, POOL);
  assert.deepEqual(
    bookmarks.map((item) => item.id),
    ["refresh-1", "refresh-2"],
  );
  assert.equal(bookmarks[0]?.url.startsWith("https://"), true);
  assert.equal(bookmarks[0]?.publication.length > 0, true);
  assert.equal(bookmarksFor([], POOL).length, 0);
});

test("the first page is the three newest and page 2 is the next three without repeats", () => {
  const excerpt =
    "This synthetic fixture explains usability heuristics, information architecture, and a practical wayfinding pattern for navigation. It is not a retrieved article.";
  function row(id: string, sourceId: string, title: string, publishedAt: string): Article {
    return {
      id,
      sourceId,
      title,
      url: `https://www.nngroup.com/articles/${id}/`,
      author: "Test Author",
      publishedAt,
      excerpt,
      evidence: "excerpt",
      retrievedAt: "2026-10-19T00:00:00Z",
    };
  }
  const library = [
    row("p-may-05", "baymard", "Cedar inclusive design checklist for tactile ux", "2026-05-05T00:00:00Z"),
    row("p-oct-10", "nng", "Zebra accessibility heuristics for navigation labels", "2026-10-10T00:00:00Z"),
    row("p-undated", "alistapart", "Aspen wayfinding pattern for page menus", ""),
    row("p-aug-15", "figma", "Quartz information architecture and wayfinding", "2026-08-15T00:00:00Z"),
    row("p-stale", "smashing", "Old usability heuristic checklist for archives", "2024-01-01T00:00:00Z"),
    row("p-sep-02", "smashing", "Harbor form design improves readability", "2026-09-02T00:00:00Z"),
    row("p-jul-01", "nng", "Maple cognitive load when writing an error message", "2026-07-01T00:00:00Z"),
    row("p-jun-20", "alistapart", "Birch usability heuristic checklist for icon labels", "2026-06-20T00:00:00Z"),
  ];
  const newest = ["p-oct-10", "p-sep-02", "p-aug-15"];
  const following = ["p-jul-01", "p-jun-20", "p-may-05"];

  const first = pageDesk("foundations", 0, EMPTY, NOW, library);
  const second = pageDesk("foundations", 1, EMPTY, NOW, library);
  const last = pageDesk("foundations", 2, EMPTY, NOW, library);
  assert.deepEqual(idsOf(first.shown), newest);
  assert.equal(first.shown.length, 3);
  assert.equal(first.page, 0);
  assert.deepEqual(idsOf(selectDesk("foundations", EMPTY, NOW, library).shown), newest);
  assert.deepEqual(idsOf(second.shown), following);
  assert.equal(second.shown.length, 3);
  assert.equal(second.page, 1);
  for (const id of following) assert.equal(newest.includes(id), false);
  assert.deepEqual(idsOf(last.shown), ["p-undated"]);
  assert.equal(last.pageCount, 3);
  assert.equal(JSON.stringify([first, second, last]).toLowerCase().includes("empty place"), false);
  const seen = [...newest, ...following, "p-undated"];
  assert.equal(seen.includes("p-stale"), false);
  assert.equal(new Set(seen).size, seen.length);

  const marked = { skipped: [] as string[], useful: ["p-may-05"] };
  assert.deepEqual(idsOf(pageDesk("foundations", 0, marked, NOW, library).shown), newest);
  assert.deepEqual(idsOf(pageDesk("foundations", 1, marked, NOW, library).shown), following);
  const plainRank = rankCategory("foundations", library, NOW, EMPTY).pool.findIndex((item) => item.article.id === "p-may-05");
  const boostedRank = rankCategory("foundations", library, NOW, marked).pool.findIndex((item) => item.article.id === "p-may-05");
  assert.ok(plainRank >= 0 && boostedRank >= 0 && boostedRank < plainRank);

  const skipped = pageDesk("foundations", 0, { skipped: ["p-oct-10"], useful: [] }, NOW, library);
  assert.deepEqual(idsOf(skipped.shown), ["p-sep-02", "p-aug-15", "p-jul-01"]);
  assert.equal(skipped.shown.some((item) => item.id === "p-oct-10"), false);
  assert.equal(skipped.hiddenIds.includes("p-oct-10"), true);
});
