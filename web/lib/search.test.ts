import assert from "node:assert/strict";
import test from "node:test";
import { ask, NO_MATCH } from "./ask.ts";
import { articles, type Article } from "./corpus.ts";
import { selectDesk } from "./desk.ts";
import { searchArticles } from "./search.ts";

const NOW = new Date("2026-10-19T12:00:00Z");

function titles(query: string): string[] {
  const result = ask(query, NOW);
  assert.equal(result.kind, "reads", query);
  if (result.kind !== "reads") return [];
  return result.articles.map((article) => `${article.title} ${article.explanation.text}`.toLowerCase());
}

test("UX finds usability and experience writing, not an empty result", () => {
  const found = titles("UX");
  assert.equal(found.length, 3);
  assert.ok(found.some((text) => /usability|user experience|accessibility|interaction design|ux/.test(text)));
});

test("user experience, usability, UI, and interaction design return articles", () => {
  for (const query of ["user experience", "usability", "UI", "interaction design"]) {
    assert.equal(titles(query).length, 3, query);
  }
});

test("AI UX, agents, design systems, enterprise, and conversational queries return articles", () => {
  for (const query of [
    "AI UX",
    "human–AI interaction",
    "AI agents",
    "agentic AI",
    "design systems",
    "enterprise UX",
    "conversational AI",
    "usability testing",
    "trustworthy AI assistants",
  ]) {
    const result = ask(query, NOW);
    assert.equal(result.kind, "reads", query);
  }
});

test("whitespace and capitalization do not change the search", () => {
  const plain = ask("design systems", NOW);
  const messy = ask("  DeSiGN   Systems  ", NOW);
  assert.equal(plain.kind, "reads");
  assert.equal(messy.kind, "reads");
  if (plain.kind !== "reads" || messy.kind !== "reads") return;
  assert.deepEqual(
    plain.articles.map((article) => article.id),
    messy.articles.map((article) => article.id),
  );
});

test("a query with no indexed meaning returns the empty state", () => {
  // Both words have to be present. "quantum" alone exists in the corpus; the pair does not.
  const result = ask("xylophone quantum", NOW);
  assert.deepEqual(result, { kind: "none", text: NO_MATCH });
});

test("search reads the whole library and keeps real links", () => {
  const hits = searchArticles("AI agents");
  assert.ok(hits.length >= 1);
  const sources = new Set(hits.map((hit) => hit.article.sourceId));
  assert.ok(sources.size >= 1);
  for (const hit of hits) {
    assert.equal(hit.article.url.startsWith("https://"), true);
    assert.equal(typeof hit.article.title, "string");
    assert.equal(articles.some((article) => article.id === hit.article.id), true);
  }
});

test("an exact title phrase ranks first", () => {
  const hits = searchArticles("Designing for AI Agents in 2026");
  assert.match(hits[0]?.article.title ?? "", /Designing for AI Agents in 2026/);
});

test("UX expands past the literal abbreviation", () => {
  const hits = searchArticles("UX");
  const blob = hits
    .map((hit) => `${hit.article.title} ${hit.article.excerpt} ${hit.matched.join(" ")}`)
    .join("\n")
    .toLowerCase();
  assert.match(blob, /user experience|usability|accessibility|interaction/);
});

test("design systems ranks a real design-system title first", () => {
  const hits = searchArticles("design systems");
  assert.match(hits[0]?.article.title ?? "", /design system/i);
});

test("enterprise UX stays on articles that mention enterprise", () => {
  const hits = searchArticles("enterprise UX");
  assert.ok(hits.length >= 1);
  for (const hit of hits) {
    const blob = `${hit.article.title} ${hit.article.excerpt}`;
    assert.match(blob, /enterprise/i);
    assert.match(blob, /ux|usability|user experience|interface/i);
  }
});

test("search is not limited to the articles on the current category desk", () => {
  const desk = selectDesk("general-ux", { skipped: [], useful: [] }, NOW);
  const deskIds = new Set(desk.shown.map((item) => item.id));
  const hits = searchArticles("AI agents");
  assert.ok(hits.length >= 1);
  assert.ok(hits.some((hit) => !deskIds.has(hit.article.id)));
  assert.equal(articles.length > 200, true);
});

test("missing metadata does not crash and still keeps real links", () => {
  const broken = {
    id: "broken-meta",
    sourceId: "nng",
    url: "https://www.nngroup.com/articles/missing-metadata-example",
    evidence: "metadata",
  } as Article;
  const thin: Article = {
    id: "thin-meta",
    sourceId: "nng",
    title: "UX notes without an excerpt",
    url: "https://www.nngroup.com/articles/ux-notes-without-an-excerpt",
    author: "",
    publishedAt: "",
    excerpt: "",
    evidence: "metadata",
    retrievedAt: "2026-10-19",
  };
  assert.doesNotThrow(() => searchArticles("ux", [broken, thin]));
  const hits = searchArticles("ux", [broken, thin]);
  for (const hit of hits) {
    assert.equal(hit.article.url.startsWith("https://"), true);
    assert.equal(typeof hit.article.title, "string");
  }
  const asked = ask("ux", NOW, [broken, thin]);
  assert.equal(asked.kind === "reads" || asked.kind === "none", true);
  if (asked.kind === "reads") {
    for (const article of asked.articles) {
      assert.equal(article.url.startsWith("https://"), true);
      assert.equal(typeof article.author, "string");
      assert.equal(article.explanation.evidence === "full_text", false);
    }
  }
});

test("an empty query returns the empty state", () => {
  assert.deepEqual(searchArticles("   "), []);
  assert.deepEqual(ask("   ", NOW), { kind: "none", text: NO_MATCH });
});
