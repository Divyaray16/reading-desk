import assert from "node:assert/strict";
import test from "node:test";
import { categories } from "./categories.ts";
import { classifyArticle, technologyTags } from "./classify.ts";
import { articles, type Article } from "./corpus.ts";
import { selectDesk } from "./desk.ts";
import { isRecentArticle, MAX_ARTICLE_AGE_DAYS } from "./rank.ts";

const NOW = new Date("2026-10-19T12:00:00Z");

function article(partial: Partial<Article> & Pick<Article, "title" | "excerpt">): Article {
  return {
    id: "fixture",
    sourceId: "nng",
    url: "https://www.nngroup.com/articles/fixture/",
    author: "Test Author",
    publishedAt: "2026-09-01T00:00:00Z",
    evidence: "excerpt",
    retrievedAt: "2026-10-19T00:00:00Z",
    ...partial,
  };
}

test("the desk has eight distinct categories and no technology bucket", () => {
  assert.equal(categories.length, 8);
  assert.equal(new Set(categories.map((category) => category.label)).size, 8);
  assert.equal(categories.some((category) => /technology|emerging trends/i.test(category.label)), false);
  assert.deepEqual(
    categories.map((category) => category.label),
    [
      "UX Foundations & Usability",
      "UX Research & Behavioral Insights",
      "Product Design & Interaction Patterns",
      "Design Systems & Design Engineering",
      "AI UX & Human–AI Interaction",
      "Conversational AI & AI Assistants",
      "Agentic AI & Autonomous Workflows",
      "Enterprise UX & Product Strategy",
    ],
  );
});

test("a design-system article that mentions an agent stays with the system", () => {
  const classified = classifyArticle(
    article({
      title: "How to lighten design system upkeep with the Figma agent",
      excerpt:
        "This note is about keeping a design system maintainable when an agent edits components. The system, the tokens, and the review path are the work. The agent is the tool used along the way, not the subject of a new workflow.",
    }),
  );
  assert.equal(classified.status, "classified");
  assert.equal(classified.primary, "systems");
  assert.equal(classified.secondary.includes("agentic"), true);
});

test("a passing keyword does not set the primary category", () => {
  const classified = classifyArticle(
    article({
      title: "A content model is not a design system",
      excerpt:
        "The essay argues that a content model and a design system solve different problems. It mentions an agent once, in a clause about a future demo, and then returns to components, tokens, and naming.",
    }),
  );
  assert.equal(classified.primary, "systems");
  assert.equal(classified.secondary.includes("agentic"), false);
});

test("model research without a design decision is tagged, not forced into a category", () => {
  const piece = article({
    title: "A transformer benchmark for gpu inference",
    excerpt:
      "The paper reports a transformer benchmark, inference speed, and gpu utilization for a language model. It does not describe an interface, a workflow, or a person using the system.",
  });
  const classified = classifyArticle(piece);
  assert.equal(classified.status, "needs-reevaluation");
  assert.equal(classified.primary, null);
  assert.ok(technologyTags(piece).includes("transformer"));
  assert.ok(technologyTags(piece).includes("gpu"));
});

test("a short excerpt is marked for reevaluation instead of being filed", () => {
  const classified = classifyArticle(
    article({
      title: "Usability heuristics",
      excerpt: "Too short to judge.",
    }),
  );
  assert.equal(classified.status, "needs-reevaluation");
  assert.equal(classified.primary, null);
});

test("one publication can contribute to more than one category", () => {
  const homes = new Set<string>();
  for (const category of categories) {
    const desk = selectDesk(category.id, { skipped: [], useful: [] }, NOW);
    for (const item of desk.shown) {
      if (item.publication === "Nielsen Norman Group") homes.add(category.id);
    }
  }
  const nngCategories = new Set(
    articles
      .filter((item) => item.sourceId === "nng")
      .map((item) => classifyArticle(item).primary)
      .filter((id): id is NonNullable<typeof id> => id !== null),
  );
  assert.ok(nngCategories.size >= 2, [...nngCategories].join(","));
  assert.ok(homes.size >= 1);
});

test("every category shows three recent articles", () => {
  for (const category of categories) {
    const desk = selectDesk(category.id, { skipped: [], useful: [] }, NOW);
    assert.equal(desk.shown.length, 3, category.id);
    for (const item of desk.shown) {
      const source = articles.find((article) => article.id === item.id);
      assert.ok(source);
      assert.equal(isRecentArticle(source.publishedAt, NOW), true, item.title);
      assert.ok(MAX_ARTICLE_AGE_DAYS >= 540);
    }
  }
});
