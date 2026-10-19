import assert from "node:assert/strict";
import test from "node:test";
import { categories } from "./categories.ts";
import { articles, type Article } from "./corpus.ts";
import { kolkataDay } from "./day.ts";
import { selectDesk } from "./desk.ts";
import {
  articleUrlOk,
  evaluateArticle,
  nearDuplicate,
  rankCategory,
  scoreOf,
  selectThree,
  type Scored,
} from "./rank.ts";
import { sources } from "./sources.ts";

const NOW = new Date("2026-10-19T12:00:00Z");

function fixture(partial: Partial<Article> & Pick<Article, "id" | "title" | "url">): Article {
  return {
    sourceId: "nng",
    author: "Test Author",
    publishedAt: "2026-09-01T00:00:00Z",
    excerpt:
      "This synthetic fixture explains a usability test method and a practical pattern for navigation. It is not a retrieved article.",
    evidence: "excerpt",
    retrievedAt: "2026-10-19T00:00:00Z",
    ...partial,
  };
}

test("the score weights sum to 100 at the top of each scale", () => {
  assert.equal(scoreOf({ relevance: 5, actionability: 5, depth: 5, credibility: 5, freshness: 5 }), 100);
  assert.equal(scoreOf({ relevance: 5, actionability: 0, depth: 0, credibility: 0, freshness: 0 }), 35);
  assert.equal(scoreOf({ relevance: 0, actionability: 5, depth: 0, credibility: 0, freshness: 0 }), 25);
  assert.equal(scoreOf({ relevance: 0, actionability: 0, depth: 5, credibility: 0, freshness: 0 }), 20);
  assert.equal(scoreOf({ relevance: 0, actionability: 0, depth: 0, credibility: 5, freshness: 0 }), 10);
  assert.equal(scoreOf({ relevance: 0, actionability: 0, depth: 0, credibility: 0, freshness: 5 }), 10);
});

test("every approved source is registered once", () => {
  assert.equal(sources.length, 22);
  assert.equal(new Set(sources.map((source) => source.id)).size, 22);
  for (const source of sources) {
    assert.equal(source.url.startsWith("https://"), true);
  }
});

test("an NN/g article about agents can qualify for agentic work", () => {
  const article = articles.find((item) => item.sourceId === "nng" && /agentic/i.test(item.title));
  assert.ok(article);
  const scored = evaluateArticle(article, "agentic", NOW);
  assert.equal(scored.qualified, true, scored.rejection);
  const general = evaluateArticle(article, "general-ux", NOW);
  assert.equal(general.qualified, false);
});

test("sources are not locked to one category", () => {
  const library = [
    fixture({
      id: "nng-agent",
      sourceId: "nng",
      title: "How agentic handoff should escalate to a person",
      url: "https://www.nngroup.com/articles/synthetic-agent-handoff/",
      excerpt:
        "This synthetic fixture describes an agentic workflow, tool use, and when escalation back to a person is the right pattern. It is not a retrieved article.",
    }),
    fixture({
      id: "figma-usability",
      sourceId: "figma",
      title: "A usability test pattern for navigation",
      url: "https://www.figma.com/blog/synthetic-usability-navigation/",
      excerpt:
        "This synthetic fixture covers a usability test, navigation, and a practical method for information architecture. It is not a retrieved article.",
    }),
  ];
  const agentic = rankCategory("agentic", library, NOW);
  const general = rankCategory("general-ux", library, NOW);
  assert.deepEqual(agentic.shown.map((item) => item.article.id), ["nng-agent"]);
  assert.deepEqual(general.shown.map((item) => item.article.id), ["figma-usability"]);
});

test("invalid urls, thin metadata, and outside sources are rejected", () => {
  const badUrl = evaluateArticle(
    fixture({ id: "bad-url", title: "Usability test method", url: "https://www.nngroup.com/blog" }),
    "general-ux",
    NOW,
  );
  assert.equal(badUrl.rejection, "invalid-url");
  assert.equal(articleUrlOk("notaurl"), false);

  const thin = evaluateArticle(
    fixture({
      id: "thin",
      title: "Usability",
      url: "https://www.nngroup.com/articles/thin-usability/",
      excerpt: "Too short.",
      evidence: "metadata",
    }),
    "general-ux",
    NOW,
  );
  assert.equal(thin.rejection, "insufficient");

  const outsider = evaluateArticle(
    fixture({
      id: "outsider",
      sourceId: "not-approved",
      title: "A usability test for navigation",
      url: "https://example.com/articles/usability-test-navigation/",
    }),
    "general-ux",
    NOW,
  );
  assert.equal(outsider.rejection, "unapproved-source");
});

test("near-duplicate titles collapse to one recommendation", () => {
  assert.equal(
    nearDuplicate(
      "Design systems for AI agents in product teams",
      "Design systems for AI agents across product teams",
    ),
    true,
  );
  const library = [
    fixture({
      id: "first",
      title: "A usability test method for navigation labels",
      url: "https://www.nngroup.com/articles/usability-test-navigation-labels/",
    }),
    fixture({
      id: "second",
      sourceId: "smashing",
      title: "A usability test method for navigation labels today",
      url: "https://www.smashingmagazine.com/2026/10/usability-test-navigation-labels/",
    }),
  ];
  const ranked = rankCategory("general-ux", library, NOW);
  assert.equal(ranked.shown.length, 1);
});

test("fewer than three qualified articles stay fewer than three", () => {
  const desk = selectDesk("ai-ux", { skipped: [], useful: [] }, NOW);
  assert.ok(desk.shown.length < 3);
  assert.match(desk.note ?? "", /cleared the bar/);
  for (const item of desk.shown) assert.equal(item.url.startsWith("https://"), true);
});

test("skip feedback changes the next selection without deleting the article", () => {
  const library = [
    fixture({
      id: "strong",
      title: "A usability test framework and practical checklist",
      url: "https://www.nngroup.com/articles/usability-test-framework-checklist/",
      excerpt:
        "This synthetic fixture gives a usability test framework, a checklist, and a method for navigation and cognitive load. It is not a retrieved article.",
    }),
    fixture({
      id: "other",
      sourceId: "smashing",
      title: "How to run a usability test for form design",
      url: "https://www.smashingmagazine.com/2026/10/how-to-usability-test-form-design/",
      excerpt:
        "This synthetic fixture explains how to run a usability test, with a practical pattern for form design and accessibility. It is not a retrieved article.",
    }),
  ];
  const before = rankCategory("general-ux", library, NOW);
  assert.equal(before.shown[0]?.article.id, "strong");
  const after = rankCategory("general-ux", library, NOW, { skipped: ["strong"], useful: [] });
  assert.equal(after.shown[0]?.article.id, "other");
  assert.equal(after.qualifiedCount, 2);
});

test("an older foundational article can still outrank a shallow new one", () => {
  const library = [
    fixture({
      id: "old",
      title: "A usability test method for information architecture",
      url: "https://www.nngroup.com/articles/usability-test-information-architecture/",
      publishedAt: "2018-01-01T00:00:00Z",
      excerpt:
        "This synthetic fixture from 2018 still gives a usability test method, a checklist, and a framework for information architecture and navigation. It is not a retrieved article. The study covered 40 tasks.",
    }),
    fixture({
      id: "new",
      sourceId: "ux-planet",
      title: "Hello usability",
      url: "https://uxplanet.org/hello-usability-synthetic/",
      publishedAt: "2026-10-18T00:00:00Z",
      excerpt: "This synthetic fixture mentions usability once and little else about the work.",
    }),
  ];
  const ranked = rankCategory("general-ux", library, NOW);
  assert.equal(ranked.shown[0]?.article.id, "old");
  const fresh = evaluateArticle(library[0]!, "general-ux", NOW);
  assert.ok(fresh.dimensions.freshness >= 2);
});

test("the India calendar day, not UTC, decides the cache date", () => {
  assert.equal(kolkataDay(new Date("2026-10-19T18:29:00Z")), "2026-10-19");
  assert.equal(kolkataDay(new Date("2026-10-19T18:30:00Z")), "2026-10-20");
});

test("selection is stable for the same inputs", () => {
  const first = selectDesk("product", { skipped: [], useful: [] }, NOW);
  const second = selectDesk("product", { skipped: [], useful: [] }, NOW);
  assert.deepEqual(
    first.shown.map((item) => item.id),
    second.shown.map((item) => item.id),
  );
  assert.equal(first.shown.length, 3);
});

test("the eight desks are not the same three articles", () => {
  const signatures = categories.map((category) =>
    selectDesk(category.id, { skipped: [], useful: [] }, NOW).shown.map((item) => item.id).join("|"),
  );
  assert.equal(new Set(signatures).size, signatures.length);
});

test("complementary selection will not repeat a source when a close alternative exists", () => {
  function scored(id: string, sourceId: string, score: number, angle: Scored["angle"]): Scored {
    const article = fixture({
      id,
      sourceId,
      title: `${id} usability test method for navigation and accessibility`,
      url: `https://www.nngroup.com/articles/${id}/`,
    });
    return {
      article,
      dimensions: { relevance: 4, actionability: 4, depth: 4, credibility: 4, freshness: 4 },
      score,
      evidence: "excerpt",
      matched: ["usability"],
      angle,
      qualified: true,
    };
  }
  const chosen = selectThree([
    scored("a", "nng", 90, "research"),
    scored("b", "nng", 88, "research"),
    scored("c", "smashing", 80, "method"),
    scored("d", "alistapart", 78, "perspective"),
  ]);
  assert.deepEqual(chosen.map((item) => item.article.sourceId), ["nng", "smashing", "alistapart"]);
});
