import assert from "node:assert/strict";
import test from "node:test";
import { ask, NO_MATCH } from "./ask.ts";
import { classifyArticle } from "./classify.ts";
import { articles, type Article } from "./corpus.ts";
import { byNewestPublished, parsePublished } from "./day.ts";
import { CAP, selectDesk } from "./desk.ts";
import { RESULT_CAP, searchArticles } from "./search.ts";

const NOW = new Date("2026-10-19T12:00:00Z");

function titles(query: string): string[] {
  const result = ask(query, NOW);
  assert.equal(result.kind, "reads", query);
  if (result.kind !== "reads") return [];
  return result.articles.map((article) => `${article.title} ${article.explanation.text}`.toLowerCase());
}

test("UX finds usability and experience writing, not an empty result", () => {
  const found = titles("UX");
  assert.equal(found.length, RESULT_CAP);
  assert.ok(found.some((text) => /usability|user experience|accessibility|interaction design|ux/.test(text)));
});

test("user experience, usability, UI, and interaction design return articles", () => {
  for (const query of ["user experience", "usability", "UI", "interaction design"]) {
    const found = titles(query);
    assert.ok(found.length >= 1 && found.length <= RESULT_CAP, query);
  }
});

test("a query with many matches returns ten articles from more than one publication", () => {
  assert.equal(RESULT_CAP, 10);
  assert.equal(CAP, 3);
  for (const query of ["UX", "design systems"]) {
    const hits = searchArticles(query, articles, NOW);
    assert.equal(hits.length, 10, query);
    const sources = new Set(hits.map((hit) => hit.article.sourceId));
    assert.ok(sources.size >= 3, query);
    const categories = new Set(hits.map((hit) => classifyArticle(hit.article).primary));
    assert.ok(categories.size >= 1, query);
    for (const hit of hits) {
      assert.equal(hit.article.url.startsWith("https://"), true);
      assert.equal(
        articles.some((article) => article.id === hit.article.id && article.url === hit.article.url),
        true,
      );
    }
  }
  const asked = ask("design systems", NOW);
  assert.equal(asked.kind, "reads");
  if (asked.kind !== "reads") return;
  assert.equal(asked.articles.length, 10);
  assert.ok(new Set(asked.articles.map((article) => article.publication)).size >= 3);
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
    "user research",
    "React",
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

test("an exact title phrase is the strongest match", () => {
  const hits = searchArticles("Designing for AI Agents in 2026", articles, NOW);
  const exact = hits.find((hit) => /Designing for AI Agents in 2026/.test(hit.article.title));
  assert.ok(exact);
  assert.equal(exact.score, Math.max(...hits.map((hit) => hit.score)));
});

test("UX expands past the literal abbreviation", () => {
  const hits = searchArticles("UX");
  const blob = hits
    .map((hit) => `${hit.article.title} ${hit.article.excerpt} ${hit.matched.join(" ")}`)
    .join("\n")
    .toLowerCase();
  assert.match(blob, /user experience|usability|accessibility|interaction/);
});

test("design systems keeps a real design-system title as its strongest match", () => {
  const hits = searchArticles("design systems", articles, NOW);
  const best = Math.max(...hits.map((hit) => hit.score));
  assert.ok(hits.some((hit) => hit.score === best && /design system/i.test(hit.article.title)));
});

test("search results with two different dates come out newest first", () => {
  const excerpt =
    "A practical usability note about user experience, interface design, and a checklist for navigation labels.";
  function row(id: string, title: string, publishedAt: string): Article {
    return {
      id,
      sourceId: "nng",
      title,
      url: `https://www.nngroup.com/articles/${id}/`,
      author: "Test Author",
      publishedAt,
      excerpt,
      evidence: "excerpt",
      retrievedAt: "2026-10-19T00:00:00Z",
    };
  }
  const older = row("search-date-older", "UX notes from the July case", "2025-07-23T14:10:22+00:00");
  const newer = row("search-date-newer", "UX notes from the September case", "2026-09-24T20:44:00.000Z");
  const undated = row("search-date-undated", "UX notes with no publication date", "");
  const library = [older, undated, newer];
  const hits = searchArticles("UX", library, NOW);
  assert.deepEqual(
    hits.map((hit) => hit.article.id),
    ["search-date-newer", "search-date-older", "search-date-undated"],
  );
  const asked = ask("UX", NOW, library);
  assert.equal(asked.kind, "reads");
  if (asked.kind !== "reads") return;
  assert.deepEqual(
    asked.articles.map((article) => article.id),
    ["search-date-newer", "search-date-older", "search-date-undated"],
  );

  const corpusHits = searchArticles("design systems", articles, NOW);
  assert.ok(corpusHits.length >= 2);
  const dated = new Set(
    corpusHits.map((hit) => parsePublished(hit.article.publishedAt)?.toISOString() ?? "").filter((day) => day.length > 0),
  );
  assert.ok(dated.size >= 2);
  assert.deepEqual(
    corpusHits.map((hit) => hit.article.id),
    byNewestPublished(corpusHits, (hit) => hit.article.publishedAt).map((hit) => hit.article.id),
  );
  const corpusAsked = ask("design systems", NOW);
  assert.equal(corpusAsked.kind, "reads");
  if (corpusAsked.kind !== "reads") return;
  assert.deepEqual(
    corpusAsked.articles.map((article) => article.id),
    corpusHits.map((hit) => hit.article.id),
  );
});

test("enterprise UX stays on enterprise product writing", () => {
  const hits = searchArticles("enterprise UX", articles, NOW);
  assert.ok(hits.length >= 1);
  for (const hit of hits) {
    const blob = `${hit.article.title} ${hit.article.excerpt} ${hit.matched.join(" ")}`;
    assert.match(blob, /enterprise|dashboard|workflow|saas|adoption|complex|business/i);
    assert.match(blob, /ux|usability|user experience|interface|design/i);
    assert.equal(hit.article.url.startsWith("https://"), true);
  }
});

test("user research and React search the real library", () => {
  for (const query of ["user research", "React"]) {
    const hits = searchArticles(query, articles, NOW);
    assert.ok(hits.length >= 1, query);
    for (const hit of hits) {
      assert.equal(articles.some((article) => article.id === hit.article.id), true);
      assert.equal(hit.article.url.startsWith("https://"), true);
    }
  }
  const research = searchArticles("user research", articles, NOW)
    .map((hit) => `${hit.article.title} ${hit.article.excerpt} ${hit.matched.join(" ")}`)
    .join("\n")
    .toLowerCase();
  assert.match(research, /research|usability test|empathy/);
  const react = searchArticles("React", articles, NOW);
  assert.match(react.map((hit) => hit.article.title).join("\n"), /React/);
});

test("search covers the whole library and does not narrow to one category", () => {
  const hits = searchArticles("design systems", articles, NOW);
  assert.ok(hits.length >= 1);
  assert.ok(hits.some((hit) => classifyArticle(hit.article).primary !== "agentic"));
  const asked = ask("design systems", NOW);
  assert.equal(asked.kind, "reads");
  if (asked.kind !== "reads") return;
  assert.deepEqual(
    asked.articles.map((article) => article.id).sort(),
    hits.map((hit) => hit.article.id).sort(),
  );
});

test("search is not limited to the articles on the current category desk", () => {
  const desk = selectDesk("foundations", { skipped: [], useful: [] }, NOW);
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
