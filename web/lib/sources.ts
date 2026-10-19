/**
 * One shared registry of approved publications.
 * Categories do not own sources. An article from any source can qualify
 * for any category when its own text supports that subject.
 */

export type SourceType = "research" | "publication" | "practitioner" | "company";

export type RetrievalStatus = "ok" | "partial" | "unavailable";

export type Source = {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  /** How this source can be read. Empty when no public article feed or index was found. */
  methods: readonly string[];
  feedUrl?: string;
  lastSuccess: string | null;
  status: RetrievalStatus;
};

export const sources: readonly Source[] = [
  {
    id: "nng",
    name: "Nielsen Norman Group",
    url: "https://www.nngroup.com/",
    type: "research",
    methods: ["sitemap", "article-page"],
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "smashing",
    name: "Smashing Magazine",
    url: "https://www.smashingmagazine.com/category/ux/",
    type: "publication",
    methods: ["rss"],
    feedUrl: "https://www.smashingmagazine.com/feed/",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "ux-collective",
    name: "UX Collective",
    url: "https://uxdesign.cc/",
    type: "publication",
    methods: ["rss"],
    feedUrl: "https://uxdesign.cc/feed",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "ux-planet",
    name: "UX Planet",
    url: "https://uxplanet.org/",
    type: "publication",
    methods: ["rss"],
    feedUrl: "https://uxplanet.org/feed",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "alistapart",
    name: "A List Apart",
    url: "https://alistapart.com/",
    type: "publication",
    methods: ["rss"],
    feedUrl: "https://alistapart.com/main/feed/",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "baymard",
    name: "Baymard Institute",
    url: "https://baymard.com/blog",
    type: "research",
    methods: ["index", "article-page"],
    lastSuccess: "2026-10-19",
    status: "partial",
  },
  {
    id: "uxmatters",
    name: "UXmatters",
    url: "https://www.uxmatters.com/",
    type: "publication",
    methods: ["rss"],
    feedUrl: "https://www.uxmatters.com/index.xml",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "pair",
    name: "Google People + AI Research (PAIR)",
    url: "https://pair.withgoogle.com/",
    type: "research",
    methods: [],
    lastSuccess: null,
    status: "unavailable",
  },
  {
    id: "hax",
    name: "Microsoft HAX Toolkit",
    url: "https://www.microsoft.com/en-us/haxtoolkit/",
    type: "research",
    methods: ["index"],
    lastSuccess: null,
    status: "unavailable",
  },
  {
    id: "anthropic",
    name: "Anthropic Research",
    url: "https://www.anthropic.com/research",
    type: "research",
    methods: ["sitemap", "article-page"],
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "ibm-research",
    name: "IBM Research",
    url: "https://research.ibm.com/",
    type: "research",
    methods: ["sitemap", "article-page"],
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "amazon-science",
    name: "Amazon Science",
    url: "https://www.amazon.science/",
    type: "research",
    methods: ["index", "article-page"],
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "shumin",
    name: "Shu-Min Yang — AI Agent Design",
    url: "https://shumin.design/blog/",
    type: "practitioner",
    methods: ["index", "article-page"],
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "ibm-think",
    name: "IBM Think",
    url: "https://www.ibm.com/think",
    type: "company",
    methods: ["index", "article-page"],
    lastSuccess: "2026-10-19",
    status: "partial",
  },
  {
    id: "figma",
    name: "Figma Blog",
    url: "https://www.figma.com/blog/",
    type: "company",
    methods: ["rss"],
    feedUrl: "https://www.figma.com/blog/feed/atom.xml",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "stripe",
    name: "Stripe Blog",
    url: "https://stripe.com/blog",
    type: "company",
    methods: ["rss"],
    feedUrl: "https://stripe.com/blog/feed.rss",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "linear",
    name: "Linear Blog",
    url: "https://linear.app/blog",
    type: "company",
    methods: ["sitemap", "article-page"],
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "bradfrost",
    name: "Brad Frost",
    url: "https://bradfrost.com/blog/",
    type: "practitioner",
    methods: ["rss"],
    feedUrl: "https://bradfrost.com/feed/",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "lukew",
    name: "Luke Wroblewski",
    url: "https://www.lukew.com/",
    type: "practitioner",
    methods: ["rss"],
    feedUrl: "https://www.lukew.com/ff/rss/",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "intercom",
    name: "Intercom Blog",
    url: "https://www.intercom.com/blog/",
    type: "company",
    methods: ["rss"],
    feedUrl: "https://www.intercom.com/blog/feed",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "julie-zhuo",
    name: "Julie Zhuo — The Looking Glass",
    url: "https://lg.substack.com/",
    type: "practitioner",
    methods: ["rss"],
    feedUrl: "https://lg.substack.com/feed",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
  {
    id: "nvidia",
    name: "NVIDIA Developer Blog",
    url: "https://developer.nvidia.com/blog/",
    type: "company",
    methods: ["atom"],
    feedUrl: "https://developer.nvidia.com/blog/feed",
    lastSuccess: "2026-10-19",
    status: "ok",
  },
];

const byId = new Map(sources.map((source) => [source.id, source]));

export function sourceById(id: string): Source | undefined {
  return byId.get(id);
}

export function isApprovedSource(id: string): boolean {
  return byId.has(id);
}
