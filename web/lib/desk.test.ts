import assert from "node:assert/strict";
import test from "node:test";
import { categories } from "./catalog.ts";
import { selectDesk } from "./desk.ts";

const EXPECTED: Record<string, { names: string[]; urls: string[] }> = {
  "general-ux": {
    names: ["Nielsen Norman Group (NN/g)", "Smashing Magazine", "UX Collective"],
    urls: [
      "https://www.nngroup.com/",
      "https://www.smashingmagazine.com/category/ux/",
      "https://uxdesign.cc/",
    ],
  },
  "ai-ux": {
    names: [
      "Google People + AI Research (PAIR)",
      "Microsoft HAX Toolkit",
      "Anthropic Research",
    ],
    urls: [
      "https://pair.withgoogle.com/",
      "https://www.microsoft.com/en-us/haxtoolkit/",
      "https://www.anthropic.com/research",
    ],
  },
  agentic: {
    names: [
      "Smashing Magazine",
      "Shu-Min Yang — AI Agent Design",
      "Google People + AI Research (PAIR)",
    ],
    urls: [
      "https://www.smashingmagazine.com/",
      "https://shumin.design/blog/",
      "https://pair.withgoogle.com/",
    ],
  },
  product: {
    names: ["Figma Blog", "Stripe Blog", "Linear Blog"],
    urls: ["https://www.figma.com/blog/", "https://stripe.com/blog", "https://linear.app/blog"],
  },
  conversational: {
    names: ["Intercom Blog", "Google People + AI Research (PAIR)", "Microsoft HAX Toolkit"],
    urls: [
      "https://www.intercom.com/blog/",
      "https://pair.withgoogle.com/",
      "https://www.microsoft.com/en-us/haxtoolkit/",
    ],
  },
  enterprise: {
    names: ["Nielsen Norman Group (NN/g)", "IBM Think", "IBM Research"],
    urls: ["https://www.nngroup.com/", "https://www.ibm.com/think", "https://research.ibm.com/"],
  },
  strategy: {
    names: ["UX Collective", "UXmatters", "Julie Zhuo — The Looking Glass"],
    urls: ["https://uxdesign.cc/", "https://www.uxmatters.com/", "https://lg.substack.com/"],
  },
  "ai-technology": {
    names: ["Anthropic Research", "Amazon Science", "IBM Research"],
    urls: [
      "https://www.anthropic.com/research",
      "https://www.amazon.science/",
      "https://research.ibm.com/",
    ],
  },
};

test("eight categories each show their three named blogs", () => {
  assert.equal(categories.length, 8);
  assert.equal(Object.keys(EXPECTED).length, 8);
  for (const category of categories) {
    const expected = EXPECTED[category.id];
    assert.ok(expected);
    const desk = selectDesk(category.id, []);
    assert.equal(desk.shown.length, 3);
    assert.deepEqual(
      desk.shown.map((blog) => blog.name),
      expected.names,
    );
    assert.deepEqual(
      desk.shown.map((blog) => blog.url),
      expected.urls,
    );
    assert.equal(desk.note, null);
    for (const blog of desk.shown) {
      assert.equal(blog.url.includes("utm_source"), false);
      assert.ok(blog.line.endsWith("."));
    }
  }
});

test("the general UX desk is the three featured blogs, not the extras", () => {
  const desk = selectDesk("general-ux", []);
  assert.deepEqual(
    desk.shown.map((blog) => blog.id),
    ["nng", "smashing", "ux-collective"],
  );
  assert.equal(
    desk.shown.some((blog) => ["ux-planet", "alistapart", "baymard", "uxmatters"].includes(blog.id)),
    false,
  );
});

test("a skip hides that blog and does not backfill from the rest of the catalog", () => {
  const desk = selectDesk("general-ux", ["nng"]);
  assert.deepEqual(
    desk.shown.map((blog) => blog.id),
    ["smashing", "ux-collective"],
  );
  assert.match(desk.note ?? "", /skipped/i);
  assert.equal(desk.shown.some((blog) => blog.id === "ux-planet"), false);
});

test("skipping every blog in a category leaves the desk empty", () => {
  const desk = selectDesk("general-ux", ["nng", "smashing", "ux-collective"]);
  assert.deepEqual(desk.shown, []);
  assert.match(desk.note ?? "", /skipped/i);
});

test("smashing opens the UX category on the general desk and the homepage for agents", () => {
  assert.equal(
    selectDesk("general-ux", []).shown.find((blog) => blog.id === "smashing")?.url,
    "https://www.smashingmagazine.com/category/ux/",
  );
  assert.equal(
    selectDesk("agentic", []).shown.find((blog) => blog.id === "smashing")?.url,
    "https://www.smashingmagazine.com/",
  );
});
