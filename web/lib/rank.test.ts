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
      "This synthetic fixture explains usability heuristics and a practical pattern for information architecture and navigation. It is not a retrieved article.",
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
  assert.ok(sources.length > 22);
  assert.equal(new Set(sources.map((source) => source.id)).size, sources.length);
  for (const source of sources) {
    assert.equal(source.url.startsWith("https://"), true);
  }
});

test("an NN/g article about agents can qualify for agentic work", () => {
  const article = articles.find((item) => item.sourceId === "nng" && /agentic/i.test(item.title));
  assert.ok(article);
  const scored = evaluateArticle(article, "agentic", NOW);
  assert.equal(scored.qualified, true, scored.rejection);
  const general = evaluateArticle(article, "foundations", NOW);
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
        "This synthetic fixture covers usability heuristics, wayfinding, and a method for information architecture. It is not a retrieved article.",
    }),
  ];
  const agentic = rankCategory("agentic", library, NOW);
  const general = rankCategory("foundations", library, NOW);
  assert.deepEqual(agentic.shown.map((item) => item.article.id), ["nng-agent"]);
  assert.deepEqual(general.shown.map((item) => item.article.id), ["figma-usability"]);
});

test("invalid urls, thin metadata, and outside sources are rejected", () => {
  const badUrl = evaluateArticle(
    fixture({ id: "bad-url", title: "Usability test method", url: "https://www.nngroup.com/blog" }),
    "foundations",
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
    "foundations",
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
    "foundations",
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
  const ranked = rankCategory("foundations", library, NOW);
  assert.equal(ranked.shown.length, 1);
});

test("category pages show only real articles and do not mention an empty place", () => {
  for (const category of categories) {
    const desk = selectDesk(category.id, { skipped: [], useful: [] }, NOW);
    assert.equal(desk.shown.length, Math.min(3, desk.qualifiedCount), category.id);
    assert.equal(desk.note, null);
    assert.equal(JSON.stringify(desk).toLowerCase().includes("empty place"), false);
    for (const item of desk.shown) {
      assert.equal(item.url.startsWith("https://"), true);
      assert.equal(item.explanation.text.toLowerCase().includes("cleared the bar"), false);
      assert.equal(item.explanation.text.toLowerCase().includes("empty place"), false);
      assert.equal(item.explanation.text.includes("It belongs with"), false);
      assert.equal(item.explanation.focus.includes("Assessed from the excerpt"), false);
    }
  }
});

test("skip feedback changes the next selection without deleting the article", () => {
  const library = [
    fixture({
      id: "strong",
      title: "A usability heuristic framework and practical checklist",
      url: "https://www.nngroup.com/articles/usability-test-framework-checklist/",
      excerpt:
        "This synthetic fixture gives a usability heuristic framework, a checklist, and a method for information architecture and cognitive load. It is not a retrieved article.",
    }),
    fixture({
      id: "other",
      sourceId: "smashing",
      title: "How to run a usability test for form design",
      url: "https://www.smashingmagazine.com/2026/10/how-to-usability-test-form-design/",
      excerpt:
        "This synthetic fixture explains how to apply usability heuristics, with a pattern for information architecture and wayfinding. It is not a retrieved article.",
    }),
  ];
  const before = rankCategory("foundations", library, NOW);
  assert.equal(before.shown[0]?.article.id, "strong");
  const after = rankCategory("foundations", library, NOW, { skipped: ["strong"], useful: [] });
  assert.equal(after.shown[0]?.article.id, "other");
  assert.equal(after.qualifiedCount, 2);
});

test("articles older than 18 months are left off the desk", () => {
  const library = [
    fixture({
      id: "old",
      title: "A usability method for information architecture",
      url: "https://www.nngroup.com/articles/usability-information-architecture/",
      publishedAt: "2018-01-01T00:00:00Z",
      excerpt:
        "This synthetic fixture from 2018 still gives a usability heuristic, a checklist, and a framework for information architecture and navigation. It is not a retrieved article. The study covered 40 tasks.",
    }),
    fixture({
      id: "new",
      sourceId: "ux-planet",
      title: "A readability checklist for navigation labels",
      url: "https://uxplanet.org/readability-checklist-navigation-labels/",
      publishedAt: "2026-10-18T00:00:00Z",
      excerpt:
        "This synthetic fixture explains a readability checklist, usability heuristics, and information architecture for navigation labels. It is not a retrieved article.",
    }),
  ];
  const old = evaluateArticle(library[0]!, "foundations", NOW);
  assert.equal(old.rejection, "stale");
  const ranked = rankCategory("foundations", library, NOW);
  assert.deepEqual(
    ranked.shown.map((item) => item.article.id),
    ["new"],
  );
});

test("the India calendar day, not UTC, decides the cache date", () => {
  assert.equal(kolkataDay(new Date("2026-10-19T18:29:00Z")), "2026-10-19");
  assert.equal(kolkataDay(new Date("2026-10-19T18:30:00Z")), "2026-10-20");
});

test("selection is stable for the same inputs", () => {
  const first = selectDesk("systems", { skipped: [], useful: [] }, NOW);
  const second = selectDesk("systems", { skipped: [], useful: [] }, NOW);
  assert.deepEqual(
    first.shown.map((item) => item.id),
    second.shown.map((item) => item.id),
  );
  assert.equal(first.shown.length, Math.min(3, first.qualifiedCount));
  assert.ok(first.shown.length >= 1);
});

test("visible desks are not the same three articles", () => {
  const signatures = categories
    .map((category) => selectDesk(category.id, { skipped: [], useful: [] }, NOW).shown.map((item) => item.id).join("|"))
    .filter((signature) => signature.length > 0);
  assert.ok(signatures.length >= 2);
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
