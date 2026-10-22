/**
 * One shared registry of approved publications.
 * Categories do not own sources. An article from any source can qualify
 * for any category when its own text supports that subject.
 *
 * Sources with no stored articles are registered only. They are not a feed
 * result, and nothing is invented to fill them. See sourcesNotYetRetrieved.
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

const retrievedSources: readonly Source[] = [
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

/** Registered for a later retrieval. No feed was read for these, and no articles were written for them. */
const pendingSources: readonly Source[] = [
  { id: "measuringu", name: "MeasuringU", url: "https://measuringu.com/", type: "research", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "ixdf", name: "Interaction Design Foundation", url: "https://www.interaction-design.org/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "usabilitygeek", name: "UsabilityGeek", url: "https://usabilitygeek.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "dovetail", name: "Dovetail", url: "https://dovetail.com/blog/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "usertesting", name: "UserTesting", url: "https://www.usertesting.com/blog", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "user-interviews", name: "User Interviews", url: "https://www.userinterviews.com/blog", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "ideo", name: "IDEO", url: "https://www.ideo.com/journal", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "acm-interactions", name: "ACM Interactions", url: "https://interactions.acm.org/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "google-design", name: "Google Design", url: "https://design.google/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "microsoft-design", name: "Microsoft Design", url: "https://microsoft.design/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "carbon", name: "Carbon Design System", url: "https://carbondesignsystem.com/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "atlassian", name: "Atlassian Design", url: "https://atlassian.design/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "polaris", name: "Shopify Polaris", url: "https://polaris.shopify.com/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "material", name: "Material Design", url: "https://m3.material.io/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "apple-hig", name: "Apple Human Interface Guidelines", url: "https://developer.apple.com/design/human-interface-guidelines/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "lightning", name: "Salesforce Lightning Design System", url: "https://www.lightningdesignsystem.com/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "sap", name: "SAP Fiori Design", url: "https://www.sap.com/design-system/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "framer", name: "Framer", url: "https://www.framer.com/blog/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "webflow", name: "Webflow", url: "https://webflow.com/blog", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "vercel", name: "Vercel", url: "https://vercel.com/blog", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "builder", name: "Builder.io", url: "https://www.builder.io/blog", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "josh-comeau", name: "Josh Comeau", url: "https://www.joshwcomeau.com/", type: "practitioner", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "codrops", name: "Codrops", url: "https://tympanus.net/codrops/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "css-tricks", name: "CSS-Tricks", url: "https://css-tricks.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "awwwards", name: "Awwwards", url: "https://www.awwwards.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "mobbin", name: "Mobbin", url: "https://mobbin.com/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "page-flows", name: "Page Flows", url: "https://pageflows.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "refactoring-ui", name: "Refactoring UI", url: "https://www.refactoringui.com/", type: "practitioner", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "smart-interface", name: "Smart Interface Design Patterns", url: "https://smart-interface-design-patterns.com/", type: "practitioner", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "lenny", name: "Lenny's Newsletter", url: "https://www.lennysnewsletter.com/", type: "practitioner", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "product-talk", name: "Product Talk", url: "https://www.producttalk.org/", type: "practitioner", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "svpg", name: "Silicon Valley Product Group", url: "https://www.svpg.com/", type: "practitioner", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "mind-the-product", name: "Mind the Product", url: "https://www.mindtheproduct.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "first-round", name: "First Round Review", url: "https://review.firstround.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "sdn", name: "Service Design Network", url: "https://www.service-design-network.org/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "service-design-tools", name: "Service Design Tools", url: "https://servicedesigntools.org/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "design-council", name: "Design Council", url: "https://www.designcouncil.org.uk/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "thoughtworks", name: "Thoughtworks", url: "https://www.thoughtworks.com/insights", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "systems-thinker", name: "The Systems Thinker", url: "https://thesystemsthinker.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "anthropic-engineering", name: "Anthropic Engineering", url: "https://www.anthropic.com/engineering", type: "research", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "openai-news", name: "OpenAI News", url: "https://openai.com/news/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "openai-research", name: "OpenAI Research", url: "https://openai.com/research/", type: "research", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "openai-cookbook", name: "OpenAI Cookbook", url: "https://cookbook.openai.com/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "deepmind", name: "Google DeepMind", url: "https://deepmind.google/", type: "research", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "microsoft-research", name: "Microsoft Research", url: "https://www.microsoft.com/en-us/research/", type: "research", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "huggingface", name: "Hugging Face", url: "https://huggingface.co/blog", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "langchain", name: "LangChain", url: "https://blog.langchain.com/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "llamaindex", name: "LlamaIndex", url: "https://www.llamaindex.ai/blog", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "voiceflow", name: "Voiceflow", url: "https://www.voiceflow.com/blog", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "botpress", name: "Botpress", url: "https://botpress.com/blog", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "rasa", name: "Rasa", url: "https://rasa.com/blog/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "mit-technology-review", name: "MIT Technology Review", url: "https://www.technologyreview.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "content-design-london", name: "Content Design London", url: "https://contentdesign.london/", type: "practitioner", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "govuk", name: "GOV.UK Content Design", url: "https://www.gov.uk/service-manual/design", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "mailchimp", name: "Mailchimp Content Style Guide", url: "https://styleguide.mailchimp.com/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "ux-writing-hub", name: "UX Writing Hub", url: "https://uxwritinghub.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "google-style", name: "Google Developer Documentation Style Guide", url: "https://developers.google.com/style", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "w3c-wai", name: "W3C WAI", url: "https://www.w3.org/WAI/", type: "research", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "webaim", name: "WebAIM", url: "https://webaim.org/", type: "research", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "a11y-project", name: "The A11Y Project", url: "https://www.a11yproject.com/", type: "publication", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "deque", name: "Deque", url: "https://www.deque.com/blog/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
  { id: "fable", name: "Fable", url: "https://makeitfable.com/", type: "company", methods: [], lastSuccess: null, status: "unavailable" },
];

export const sources: readonly Source[] = [...retrievedSources, ...pendingSources];

const byId = new Map(sources.map((source) => [source.id, source]));

export function sourceById(id: string): Source | undefined {
  return byId.get(id);
}

export function isApprovedSource(id: string): boolean {
  return byId.has(id);
}

/**
 * Registry entries that do not yet have a stored article.
 * `storedSourceIds` is the set of source ids present in the article library.
 */
export function sourcesNotYetRetrieved(storedSourceIds: readonly string[]): Source[] {
  const stored = new Set(storedSourceIds);
  return sources.filter((source) => !stored.has(source.id));
}
