import assert from "node:assert/strict";
import test from "node:test";
import { categories } from "./categories.ts";
import { classifyArticle } from "./classify.ts";
import { articles, type Article } from "./corpus.ts";
import { selectDesk } from "./desk.ts";
import { isRecentArticle, MAX_ARTICLE_AGE_DAYS } from "./rank.ts";
import { articleTags, isCanonicalTag, TAG_CAP } from "./tags.ts";

const NOW = new Date("2026-10-19T12:00:00Z");

const LABELS = [
  "UX Foundations & Usability",
  "UX Research",
  "Interaction Design",
  "UI & Visual Design",
  "Product Design & Strategy",
  "Design Systems",
  "Design Engineering",
  "AI Product Design",
  "Conversational UX",
  "Agentic AI & Automation",
  "Enterprise UX",
  "Service Design",
  "Content Design & UX Writing",
  "Accessibility & Inclusive Design",
  "Emerging Technology & Design Futures",
];

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

test("the desk has fifteen categories and needs-review is not one of them", () => {
  assert.equal(categories.length, 15);
  assert.equal(new Set(categories.map((category) => category.label)).size, 15);
  assert.deepEqual(
    categories.map((category) => category.label),
    LABELS,
  );
  assert.equal(categories.some((category) => /needs review/i.test(category.label)), false);
});

test("a design-system article that mentions an agent stays with the system", () => {
  const piece = article({
    title: "How to lighten design system upkeep with the Figma agent",
    excerpt:
      "This note is about keeping a design system maintainable when an agent edits components. The system, the tokens, and the review path are the work. The agent is the tool used along the way, not the subject of a new workflow.",
  });
  const classified = classifyArticle(piece);
  assert.equal(classified.status, "classified");
  assert.equal(classified.primary, "systems");
  assert.equal("secondary" in classified, false);
  assert.equal(articleTags(piece).includes("AI Agents"), false);
  assert.ok(articleTags(piece).includes("Figma"));
});

test("a passing keyword does not set the primary category", () => {
  const piece = article({
    title: "A content model is not a design system",
    excerpt:
      "The essay argues that a content model and a design system solve different problems. It mentions an agent once, in a clause about a future demo, and then returns to components, tokens, and naming.",
  });
  const classified = classifyArticle(piece);
  assert.equal(classified.primary, "systems");
  assert.equal(articleTags(piece).includes("AI Agents"), false);
});

test("two subjects in equal measure stay in needs-review", () => {
  const classified = classifyArticle(
    article({
      title: "Service design and the design system",
      excerpt:
        "This essay gives the same attention to service design and the design system. It explains service design and the design system in equal depth, and it never picks one as the point of the piece. Both service design and the design system stay in frame the whole way through.",
    }),
  );
  assert.equal(classified.status, "needs-review");
  assert.equal(classified.primary, null);
});

test("a title without excerpt support is not classified", () => {
  const classified = classifyArticle(
    article({
      title: "Usability heuristics for navigation",
      excerpt:
        "The team met for a planning offsite, compared calendars, and wrote down the publishing schedule for the next quarter. The notes mention the weather, the room, and the lunch order, and they stop there.",
    }),
  );
  assert.equal(classified.status, "needs-review");
  assert.equal(classified.primary, null);
});

test("model research without a design decision is tagged, not forced into a category", () => {
  const piece = article({
    title: "A transformer benchmark for gpu inference",
    excerpt:
      "The paper reports a transformer benchmark, inference speed, and gpu utilization for a language model. It does not describe an interface, a workflow, or a person using the system.",
  });
  const classified = classifyArticle(piece);
  const tags = articleTags(piece);
  assert.equal(classified.status, "needs-review");
  assert.equal(classified.primary, null);
  assert.ok(tags.includes("Transformer"));
  assert.ok(tags.includes("GPU"));
  assert.ok(tags.length <= TAG_CAP);
  for (const tag of tags) assert.equal(isCanonicalTag(tag), true);
});

test("human in the loop and HITL are the same tag", () => {
  const spaced = articleTags(
    article({
      title: "HITL review",
      excerpt:
        "A long enough excerpt about keeping a human in the loop when a person must approve the model's next step before it ships to customers in the product.",
    }),
  );
  const dashed = articleTags(
    article({
      title: "Review",
      excerpt:
        "A long enough excerpt about human-in-the-loop approval, where a person stays responsible for the outcome of the model recommendation in the product workflow.",
    }),
  );
  assert.ok(spaced.includes("Human-in-the-Loop"));
  assert.ok(dashed.includes("Human-in-the-Loop"));
});

test("a short excerpt is marked for review instead of being filed", () => {
  const classified = classifyArticle(
    article({
      title: "Usability heuristics",
      excerpt: "Too short to judge.",
    }),
  );
  assert.equal(classified.status, "needs-review");
  assert.equal(classified.primary, null);
});

test("every real article has one primary or needs-review, and tags stay separate", () => {
  const labels = new Set(LABELS);
  const urls = new Set<string>();
  assert.ok(articles.length > 200);
  for (const piece of articles) {
    assert.equal(urls.has(piece.url), false, piece.url);
    urls.add(piece.url);
    const classified = classifyArticle(piece);
    assert.equal("secondary" in classified, false);
    assert.ok(classified.status === "classified" || classified.status === "needs-review");
    if (classified.status === "needs-review") {
      assert.equal(classified.primary, null);
    } else {
      assert.ok(categories.some((category) => category.id === classified.primary));
    }
    const tags = articleTags(piece);
    assert.ok(tags.length <= TAG_CAP);
    for (const tag of tags) {
      assert.equal(labels.has(tag), false, tag);
      assert.equal(isCanonicalTag(tag), true, tag);
    }
  }
  const real = articles.find((piece) => piece.title === "How to lighten design system upkeep with the Figma agent");
  assert.ok(real);
  assert.equal(classifyArticle(real).primary, "systems");
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

test("a category shows three recent articles only when the corpus has them", () => {
  let full = 0;
  for (const category of categories) {
    const desk = selectDesk(category.id, { skipped: [], useful: [] }, NOW);
    assert.equal(desk.shown.length, Math.min(3, desk.qualifiedCount), category.id);
    if (desk.qualifiedCount >= 3) full += 1;
    for (const item of desk.shown) {
      const source = articles.find((piece) => piece.id === item.id);
      assert.ok(source);
      assert.equal(classifyArticle(source).primary, category.id, item.title);
      assert.equal(isRecentArticle(source.publishedAt, NOW), true, item.title);
      assert.ok(MAX_ARTICLE_AGE_DAYS >= 540);
    }
  }
  assert.ok(full >= 1);
});
