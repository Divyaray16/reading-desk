/**
 * Publication sources for the reading desk.
 * These are real blogs and research homes, not invented essays.
 * A source may belong to more than one category.
 * Each category desk shows only its three featured sources.
 */

export const CAP = 3;

export type CategoryId =
  | "general-ux"
  | "ai-ux"
  | "agentic"
  | "product"
  | "conversational"
  | "enterprise"
  | "strategy"
  | "ai-technology";

export type Source = {
  id: string;
  name: string;
  url: string;
  line: string;
  aliases: readonly string[];
  /** URL to open when this source is shown in a particular category. */
  categoryUrls?: Partial<Record<CategoryId, string>>;
};

export type Category = {
  id: CategoryId;
  label: string;
  line: string;
  featured: readonly [string, string, string];
  extras: readonly string[];
};

export type BlogCard = {
  id: string;
  name: string;
  url: string;
  line: string;
};

/** Drop utm_source=chatgpt.com. Leave every other part of the URL alone. */
export function cleanSourceUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.searchParams.get("utm_source") !== "chatgpt.com") return url;
  parsed.searchParams.delete("utm_source");
  const query = parsed.searchParams.toString();
  const hash = parsed.hash;
  const path = `${parsed.origin}${parsed.pathname}`;
  return query ? `${path}?${query}${hash}` : `${path}${hash}`;
}

function cleanCategoryUrls(
  urls: Partial<Record<CategoryId, string>> | undefined,
): Partial<Record<CategoryId, string>> | undefined {
  if (!urls) return undefined;
  const cleaned: Partial<Record<CategoryId, string>> = {};
  for (const id of Object.keys(urls) as CategoryId[]) {
    const url = urls[id];
    if (url) cleaned[id] = cleanSourceUrl(url);
  }
  return cleaned;
}

function listed(source: Source): Source {
  return {
    ...source,
    url: cleanSourceUrl(source.url),
    categoryUrls: cleanCategoryUrls(source.categoryUrls),
  };
}

export const sources: Source[] = [
  listed({
    id: "nng",
    name: "Nielsen Norman Group (NN/g)",
    url: "https://www.nngroup.com/",
    line: "Research-based usability guidance from Nielsen Norman Group.",
    aliases: ["nng", "nn", "nielsen", "nielsen norman", "nielsen norman group"],
  }),
  listed({
    id: "smashing",
    name: "Smashing Magazine",
    url: "https://www.smashingmagazine.com/",
    line: "A magazine of practical writing on UX, design, and front-end work.",
    aliases: ["smashing", "smashing magazine"],
    categoryUrls: {
      "general-ux": "https://www.smashingmagazine.com/category/ux/",
    },
  }),
  listed({
    id: "ux-collective",
    name: "UX Collective",
    url: "https://uxdesign.cc/",
    line: "UX essays from designers and researchers, published on Medium.",
    aliases: ["ux collective", "uxdesign"],
  }),
  listed({
    id: "pair",
    name: "Google People + AI Research (PAIR)",
    url: "https://pair.withgoogle.com/",
    line: "Google's guidebook for designing people-centered AI products.",
    aliases: ["pair", "google pair", "people + ai", "people and ai"],
  }),
  listed({
    id: "hax",
    name: "Microsoft HAX Toolkit",
    url: "https://www.microsoft.com/en-us/haxtoolkit/",
    line: "Microsoft's guidelines and patterns for human-AI interaction.",
    aliases: ["hax", "hax toolkit", "microsoft hax"],
  }),
  listed({
    id: "anthropic",
    name: "Anthropic Research",
    url: "https://www.anthropic.com/research",
    line: "Research from Anthropic on AI systems and how people use them.",
    aliases: ["anthropic", "anthropic research"],
  }),
  listed({
    id: "shumin",
    name: "Shu-Min Yang — AI Agent Design",
    url: "https://shumin.design/blog/",
    line: "A product designer's notes on designing AI agents.",
    aliases: ["shu-min", "shumin", "shu min", "shu-min yang"],
  }),
  listed({
    id: "figma",
    name: "Figma Blog",
    url: "https://www.figma.com/blog/",
    line: "Product writing from the team that makes Figma.",
    aliases: ["figma", "figma blog"],
  }),
  listed({
    id: "stripe",
    name: "Stripe Blog",
    url: "https://stripe.com/blog",
    line: "Essays from Stripe on product, design, and engineering.",
    aliases: ["stripe", "stripe blog"],
  }),
  listed({
    id: "linear",
    name: "Linear Blog",
    url: "https://linear.app/blog",
    line: "Product and design writing from the Linear team.",
    aliases: ["linear", "linear blog"],
  }),
  listed({
    id: "intercom",
    name: "Intercom Blog",
    url: "https://www.intercom.com/blog/",
    line: "Writing from Intercom on customer communication and conversational products.",
    aliases: ["intercom", "intercom blog"],
  }),
  listed({
    id: "ibm-think",
    name: "IBM Think",
    url: "https://www.ibm.com/think",
    line: "IBM's publication on technology, business, and enterprise practice.",
    aliases: ["ibm think"],
  }),
  listed({
    id: "ibm-research",
    name: "IBM Research",
    url: "https://research.ibm.com/",
    line: "Research from IBM on computing, AI, and systems.",
    aliases: ["ibm research"],
  }),
  listed({
    id: "uxmatters",
    name: "UXmatters",
    url: "https://www.uxmatters.com/",
    line: "A journal of UX strategy, research, and practice.",
    aliases: ["uxmatters", "ux matters"],
  }),
  listed({
    id: "julie-zhuo",
    name: "Julie Zhuo — The Looking Glass",
    url: "https://lg.substack.com/",
    line: "Product design essays by Julie Zhuo.",
    aliases: ["julie zhuo", "looking glass", "zhuo", "the looking glass"],
  }),
  listed({
    id: "amazon-science",
    name: "Amazon Science",
    url: "https://www.amazon.science/",
    line: "Research writing from Amazon on science and applied AI.",
    aliases: ["amazon science", "amazon"],
  }),
  listed({
    id: "ux-planet",
    name: "UX Planet",
    url: "https://uxplanet.org/",
    line: "UX articles from practitioners, published on Medium.",
    aliases: ["ux planet", "uxplanet"],
  }),
  listed({
    id: "alistapart",
    name: "A List Apart",
    url: "https://alistapart.com/",
    line: "Long-form writing for people who make websites.",
    aliases: ["a list apart", "alistapart", "list apart"],
  }),
  listed({
    id: "baymard",
    name: "Baymard Institute",
    url: "https://baymard.com/blog",
    line: "Research on ecommerce UX, including checkout and finding products.",
    aliases: ["baymard", "baymard institute", "ecommerce"],
  }),
  listed({
    id: "bradfrost",
    name: "Brad Frost",
    url: "https://bradfrost.com/blog/",
    line: "Brad Frost's writing on design systems and interface structure.",
    aliases: ["brad frost", "frost", "bradfrost"],
  }),
  listed({
    id: "lukew",
    name: "Luke Wroblewski",
    url: "https://www.lukew.com/",
    line: "Product design writing from Luke Wroblewski.",
    aliases: ["luke wroblewski", "wroblewski", "lukew"],
  }),
  listed({
    id: "nvidia",
    name: "NVIDIA Developer Blog",
    url: "https://developer.nvidia.com/blog/",
    line: "Technical posts from NVIDIA on GPUs, AI, and developer tools.",
    aliases: ["nvidia", "nvidia developer"],
  }),
];

export const categories: Category[] = [
  {
    id: "general-ux",
    label: "General UX & Usability",
    line: "Usability research and everyday interface practice.",
    featured: ["nng", "smashing", "ux-collective"],
    extras: ["ux-planet", "alistapart", "baymard", "uxmatters"],
  },
  {
    id: "ai-ux",
    label: "AI UX & Human–AI Interaction",
    line: "How people interact with AI systems.",
    featured: ["pair", "hax", "anthropic"],
    extras: ["ibm-research", "amazon-science"],
  },
  {
    id: "agentic",
    label: "Agentic AI & AI Product Design",
    line: "Designing AI agents and AI products.",
    featured: ["smashing", "shumin", "pair"],
    extras: ["ibm-think"],
  },
  {
    id: "product",
    label: "Product Design & Design Systems",
    line: "Product design and shared design systems.",
    featured: ["figma", "stripe", "linear"],
    extras: ["bradfrost", "lukew"],
  },
  {
    id: "conversational",
    label: "Conversational AI & AI Assistants",
    line: "Conversational products and AI assistants.",
    featured: ["intercom", "pair", "hax"],
    extras: [],
  },
  {
    id: "enterprise",
    label: "Enterprise UX & Complex Workflows",
    line: "Enterprise products and complex workflows.",
    featured: ["nng", "ibm-think", "ibm-research"],
    extras: ["baymard", "stripe"],
  },
  {
    id: "strategy",
    label: "UX Strategy & Design Thinking",
    line: "UX strategy and design thinking.",
    featured: ["ux-collective", "uxmatters", "julie-zhuo"],
    extras: ["alistapart"],
  },
  {
    id: "ai-technology",
    label: "AI Technology & Emerging Trends",
    line: "AI research and emerging technology.",
    featured: ["anthropic", "amazon-science", "ibm-research"],
    extras: ["nvidia"],
  },
];

const byId = new Map(sources.map((source) => [source.id, source]));

export function sourceById(id: string): Source {
  const source = byId.get(id);
  if (!source) throw new Error(`Unknown source: ${id}`);
  return source;
}

export function categoryById(id: CategoryId): Category {
  const category = categories.find((item) => item.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}

export function categoriesFor(sourceId: string): CategoryId[] {
  return categories
    .filter(
      (category) =>
        category.featured.includes(sourceId) || category.extras.includes(sourceId),
    )
    .map((category) => category.id);
}

export function hrefFor(source: Source, categoryId?: CategoryId): string {
  if (categoryId) {
    const override = source.categoryUrls?.[categoryId];
    if (override) return override;
  }
  return source.url;
}

/** Prefer a category-specific URL when Ask matched that category. */
export function hrefForAsk(source: Source, matched: readonly CategoryId[]): string {
  const membership = new Set(categoriesFor(source.id));
  for (const categoryId of matched) {
    if (!membership.has(categoryId)) continue;
    const override = source.categoryUrls?.[categoryId];
    if (override) return override;
  }
  return source.url;
}

export function toBlogCard(source: Source, url: string): BlogCard {
  return {
    id: source.id,
    name: source.name,
    url,
    line: source.line,
  };
}
