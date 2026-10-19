import assert from "node:assert/strict";
import test from "node:test";
import { ask, NO_MATCH } from "./ask.ts";
import { categories, sources } from "./catalog.ts";

const urls = new Set<string>();
for (const source of sources) {
  urls.add(source.url);
  for (const url of Object.values(source.categoryUrls ?? {})) urls.add(url);
}

function blogsOf(result: ReturnType<typeof ask>) {
  return result.kind === "reads" ? result.sources : [];
}

test("an AI UX question returns that category's three blogs", () => {
  const result = ask("give me an AI UX blog");
  assert.equal(result.kind, "reads");
  if (result.kind !== "reads") return;
  assert.deepEqual(
    result.sources.map((blog) => blog.id),
    ["pair", "hax", "anthropic"],
  );
  assert.deepEqual(
    result.sources.map((blog) => blog.name),
    [
      "Google People + AI Research (PAIR)",
      "Microsoft HAX Toolkit",
      "Anthropic Research",
    ],
  );
  assert.equal(result.sources.length, 3);
  for (const blog of result.sources) {
    assert.equal(urls.has(blog.url), true);
    assert.equal(blog.url.includes("utm_source"), false);
  }
});

test("ask can return a source that is not one of the three on a category desk", () => {
  const baymard = ask("baymard checkout");
  assert.equal(baymard.kind, "reads");
  if (baymard.kind !== "reads") return;
  assert.deepEqual(
    baymard.sources.map((blog) => blog.id),
    ["baymard"],
  );
  assert.equal(baymard.sources[0]?.url, "https://baymard.com/blog");
  assert.equal(
    categories.some((category) => category.featured.includes("baymard")),
    false,
  );

  const nvidia = ask("nvidia");
  assert.equal(nvidia.kind, "reads");
  if (nvidia.kind !== "reads") return;
  assert.equal(nvidia.sources[0]?.name, "NVIDIA Developer Blog");
  assert.equal(nvidia.sources[0]?.url, "https://developer.nvidia.com/blog/");
  assert.equal(
    categories.some((category) => category.featured.includes("nvidia")),
    false,
  );
});

test("a design-systems question includes Brad Frost, who is not on the product desk", () => {
  const result = ask("design systems");
  assert.equal(result.kind, "reads");
  if (result.kind !== "reads") return;
  assert.ok(result.sources.length <= 3);
  assert.equal(
    result.sources.some((blog) => blog.id === "bradfrost"),
    true,
  );
  assert.equal(
    categories.find((category) => category.id === "product")?.featured.includes("bradfrost"),
    false,
  );
});

test("ask never returns more than three, and a vague read falls back to general UX", () => {
  const vague = ask("give me a blog");
  assert.equal(vague.kind, "reads");
  if (vague.kind === "reads") {
    assert.deepEqual(
      vague.sources.map((blog) => blog.id),
      ["nng", "smashing", "ux-collective"],
    );
    assert.equal(
      vague.sources.find((blog) => blog.id === "smashing")?.url,
      "https://www.smashingmagazine.com/category/ux/",
    );
  }

  for (const question of ["ux", "ai", "design", "research", "enterprise workflow", "give me an AI UX blog"]) {
    const result = ask(question);
    assert.ok(blogsOf(result).length <= 3);
  }
});

test("shape up and an unknown question invent nothing", () => {
  assert.deepEqual(ask("shape up"), { kind: "none", text: NO_MATCH });
  assert.deepEqual(ask("quantum origami for a submarine"), { kind: "none", text: NO_MATCH });
  assert.equal(NO_MATCH.includes("http"), false);
  assert.equal(sources.some((source) => /shape up/i.test(source.name)), false);
});
