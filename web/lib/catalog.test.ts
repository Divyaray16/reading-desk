import assert from "node:assert/strict";
import test from "node:test";
import {
  categories,
  categoriesFor,
  cleanSourceUrl,
  sources,
  type CategoryId,
} from "./catalog.ts";

const LABELS = [
  "General UX & Usability",
  "AI UX & Human–AI Interaction",
  "Agentic AI & AI Product Design",
  "Product Design & Design Systems",
  "Conversational AI & AI Assistants",
  "Enterprise UX & Complex Workflows",
  "UX Strategy & Design Thinking",
  "AI Technology & Emerging Trends",
];

const FEATURED: Record<CategoryId, readonly [string, string, string]> = {
  "general-ux": ["nng", "smashing", "ux-collective"],
  "ai-ux": ["pair", "hax", "anthropic"],
  agentic: ["smashing", "shumin", "pair"],
  product: ["figma", "stripe", "linear"],
  conversational: ["intercom", "pair", "hax"],
  enterprise: ["nng", "ibm-think", "ibm-research"],
  strategy: ["ux-collective", "uxmatters", "julie-zhuo"],
  "ai-technology": ["anthropic", "amazon-science", "ibm-research"],
};

test("the catalog has eight categories and three featured blogs in each", () => {
  assert.equal(categories.length, 8);
  assert.deepEqual(
    categories.map((category) => category.label),
    LABELS,
  );
  for (const category of categories) {
    assert.deepEqual(category.featured, FEATURED[category.id]);
    assert.equal(category.featured.length, 3);
    assert.equal(new Set(category.featured).size, 3);
  }
});

test("extra sources stay in the catalog and off the featured three", () => {
  const extras: Record<CategoryId, readonly string[]> = {
    "general-ux": ["ux-planet", "alistapart", "baymard", "uxmatters"],
    "ai-ux": ["ibm-research", "amazon-science"],
    agentic: ["ibm-think"],
    product: ["bradfrost", "lukew"],
    conversational: [],
    enterprise: ["baymard", "stripe"],
    strategy: ["alistapart"],
    "ai-technology": ["nvidia"],
  };
  for (const category of categories) {
    assert.deepEqual(category.extras, extras[category.id]);
    for (const id of category.extras) {
      assert.equal(category.featured.includes(id), false);
      assert.ok(sources.some((source) => source.id === id));
    }
  }
  assert.equal(sources.length, 22);
});

test("the same publication can belong to more than one category", () => {
  assert.deepEqual(categoriesFor("pair"), ["ai-ux", "agentic", "conversational"]);
  assert.deepEqual(categoriesFor("nng"), ["general-ux", "enterprise"]);
  assert.deepEqual(categoriesFor("smashing"), ["general-ux", "agentic"]);
  assert.deepEqual(categoriesFor("baymard"), ["general-ux", "enterprise"]);
  assert.ok(categoriesFor("nvidia").includes("ai-technology"));
  assert.equal(
    categories.some((category) => category.featured.includes("nvidia")),
    false,
  );
});

test("every url is a real https link with chatgpt tracking removed", () => {
  assert.equal(
    cleanSourceUrl("https://www.nngroup.com/?utm_source=chatgpt.com"),
    "https://www.nngroup.com/",
  );
  assert.equal(
    cleanSourceUrl("https://baymard.com/blog?utm_source=chatgpt.com"),
    "https://baymard.com/blog",
  );
  assert.equal(
    cleanSourceUrl("https://www.smashingmagazine.com/category/ux/?foo=1&utm_source=chatgpt.com"),
    "https://www.smashingmagazine.com/category/ux/?foo=1",
  );
  assert.equal(cleanSourceUrl("https://stripe.com/blog"), "https://stripe.com/blog");

  for (const source of sources) {
    assert.equal(source.url.startsWith("https://"), true);
    assert.equal(source.url.includes("utm_source"), false);
    assert.equal(source.line.includes("http"), false);
    assert.ok(source.line.endsWith("."));
    for (const url of Object.values(source.categoryUrls ?? {})) {
      assert.equal(url.startsWith("https://"), true);
      assert.equal(url.includes("utm_source"), false);
    }
  }
});

test("shape up and the old situation filters are not sources", () => {
  const names = sources.map((source) => source.name.toLowerCase());
  assert.equal(names.some((name) => name.includes("shape up")), false);
  assert.equal(
    sources.some((source) => source.url.includes("basecamp.com")),
    false,
  );
  const labels = categories.map((category) => category.label);
  for (const retired of ["Just the best three", "Empty screen", "Too many controls", "Critique"]) {
    assert.equal(labels.includes(retired), false);
  }
});
