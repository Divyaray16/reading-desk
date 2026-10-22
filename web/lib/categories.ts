/**
 * Fifteen subject categories. They describe what an article actually discusses,
 * not the publication it came from. An article may carry zero, one, or many of
 * these labels. There is no primary category, and an untagged article is not a
 * sixteenth category. Every approved source may appear under any label its text supports.
 */

export type CategoryId =
  | "foundations"
  | "research"
  | "interaction"
  | "visual"
  | "product"
  | "systems"
  | "engineering"
  | "ai-product"
  | "conversational"
  | "agentic"
  | "enterprise"
  | "service"
  | "content"
  | "accessibility"
  | "emerging";

export type FreshnessPace = "slow" | "fast";

export type Category = {
  id: CategoryId;
  label: string;
  line: string;
  /** Phrases that can place the article when the excerpt actually discusses them. */
  signals: readonly string[];
  /** Nearby words. They add weight only after a signal is already present. */
  support: readonly string[];
  pace: FreshnessPace;
};

export const categories: readonly Category[] = [
  {
    id: "foundations",
    label: "UX Foundations & Usability",
    line: "Principles, heuristics, and the usability decisions people feel immediately.",
    pace: "slow",
    signals: [
      "usability heuristic",
      "heuristic",
      "information architecture",
      "mental model",
      "cognitive load",
      "wayfinding",
      "readability",
      "form design",
      "usability",
      "web user experience",
      "interface design",
      "cognitive strain",
      "laws of ux",
      "jakobs law",
      "fitts law",
      "hicks law",
    ],
    support: ["navigation", "principle", "guideline", "interface"],
  },
  {
    id: "research",
    label: "UX Research",
    line: "Interviews, studies, and the methods that show how people actually behave.",
    pace: "slow",
    signals: [
      "user research",
      "ux research",
      "usability testing",
      "usability test",
      "usability study",
      "diary study",
      "field study",
      "user interview",
      "research method",
      "empathy map",
      "empathy mapping",
      "behavioral insight",
      "behavioural insight",
      "qualitative research",
      "quantitative research",
      "research design",
      "users think",
    ],
    support: ["interview", "participant", "survey", "persona", "behavior", "behaviour"],
  },
  {
    id: "interaction",
    label: "Interaction Design",
    line: "Flows, patterns, and the behavior of the interaction itself.",
    pace: "slow",
    signals: [
      "interaction design",
      "microinteraction",
      "user flow",
      "task flow",
      "interaction pattern",
      "navigation pattern",
      "motion design",
      "point and click",
      "graphical user interface",
      "search bar",
      "tactile",
    ],
    support: ["prototype", "prototyping", "gesture", "navigation", "flow"],
  },
  {
    id: "visual",
    label: "UI & Visual Design",
    line: "Hierarchy, typography, color, and the layout of the interface.",
    pace: "slow",
    signals: [
      "visual design",
      "visual hierarchy",
      "typography",
      "typeface",
      "color palette",
      "graphic design",
      "visual identity",
      "visual direction",
      "visual noise",
      "ui badge",
      "image editing",
      "layout",
      "whitespace",
      "visual concept",
    ],
    support: ["font", "color", "grid", "aesthetic", "responsive"],
  },
  {
    id: "product",
    label: "Product Design & Strategy",
    line: "Discovery, framing, and the decisions that shape the product.",
    pace: "slow",
    signals: [
      "product strategy",
      "product discovery",
      "product thinking",
      "design strategy",
      "ux strategy",
      "brand strategy",
      "design leadership",
      "product decision",
      "prioritization",
      "prioritisation",
      "roadmap",
      "boardroom",
      "roi",
      "product builder",
      "great product",
    ],
    support: ["stakeholder", "priority", "strategy", "leadership"],
  },
  {
    id: "systems",
    label: "Design Systems",
    line: "Tokens, libraries, and the governance that keeps a system coherent.",
    pace: "slow",
    signals: ["design system", "design token", "component library", "figma library"],
    support: ["component", "token", "naming", "governance", "library"],
  },
  {
    id: "engineering",
    label: "Design Engineering",
    line: "Design-to-code, the front end, and the work shared by design and engineering.",
    pace: "slow",
    signals: [
      "design engineering",
      "design to code",
      "creative coding",
      "code connect",
      "code layer",
      "container query",
      "front end",
      "frontend",
      "css",
      "stylesheet",
      "javascript",
      "react",
    ],
    support: ["html", "browser", "component", "code"],
  },
  {
    id: "ai-product",
    label: "AI Product Design",
    line: "How a person understands, directs, and trusts a model in a product.",
    pace: "fast",
    signals: [
      "human ai",
      "ai ux",
      "ai usability",
      "ai product",
      "designing ai",
      "designing with ai",
      "designing with uncertainty",
      "explainability",
      "explainable",
      "ai labelling",
      "ai labeling",
      "disclose ai",
      "responsible ai",
      "ai modality",
      "in the loop",
    ],
    support: ["trust", "transparency", "uncertainty", "oversight"],
  },
  {
    id: "conversational",
    label: "Conversational UX",
    line: "Chat, voice, and the turns between a person and an assistant.",
    pace: "fast",
    signals: [
      "conversational",
      "conversation design",
      "dialogue",
      "chatbot",
      "chat interface",
      "voice interface",
      "voice assistant",
      "ai assistant",
      "virtual assistant",
      "siri",
      "language assistant",
    ],
    support: ["chat", "voice", "prompt", "turn"],
  },
  {
    id: "agentic",
    label: "Agentic AI & Automation",
    line: "Agents that plan, act, and hand control back to a person.",
    pace: "fast",
    signals: [
      "agentic",
      "ai agent",
      "multi agent",
      "orchestration",
      "tool calling",
      "tool use",
      "agent workflow",
      "autonomous agent",
      "agent",
    ],
    support: ["handoff", "escalation", "planning", "monitoring", "approval"],
  },
  {
    id: "enterprise",
    label: "Enterprise UX",
    line: "Complex workflows, dashboards, and software built for organizations.",
    pace: "slow",
    signals: [
      "enterprise",
      "dashboard",
      "data heavy",
      "complex workflow",
      "business process",
      "enterprise application",
      "enterprise screen",
      "internal tool",
    ],
    support: ["workflow", "adoption", "organization", "saas", "data"],
  },
  {
    id: "service",
    label: "Service Design",
    line: "Journeys, blueprints, and the service on both sides of the counter.",
    pace: "slow",
    signals: [
      "service design",
      "journey map",
      "customer journey",
      "service blueprint",
      "frontstage",
      "backstage",
      "front stage",
      "back stage",
      "customer experience",
    ],
    support: ["touchpoint", "ecosystem", "blueprint"],
  },
  {
    id: "content",
    label: "Content Design & UX Writing",
    line: "Microcopy, content strategy, and the words in the interface.",
    pace: "slow",
    signals: [
      "ux writing",
      "content design",
      "content strategy",
      "microcopy",
      "error message",
      "content model",
      "voice and tone",
      "ux writer",
      "content designer",
      "storytelling",
      "naming",
      "textual content",
    ],
    support: ["copy", "terminology", "tone", "writing"],
  },
  {
    id: "accessibility",
    label: "Accessibility & Inclusive Design",
    line: "Inclusive patterns, assistive technology, and access for more people.",
    pace: "slow",
    signals: [
      "accessibility",
      "wcag",
      "inclusive design",
      "assistive technology",
      "assistive tech",
      "screen reader",
      "cognitive inclusion",
      "cognitive accessibility",
      "inclusive research",
      "a11y",
    ],
    support: ["disability", "keyboard", "inclusion", "barrier"],
  },
  {
    id: "emerging",
    label: "Emerging Technology & Design Futures",
    line: "Spatial interfaces and other practice that is still taking shape.",
    pace: "fast",
    signals: [
      "spatial computing",
      "extended reality",
      "augmented reality",
      "virtual reality",
      "mixed reality",
      "design futures",
      "speculative design",
      "emerging technology",
      "no interface",
      "humanoid",
      "final form",
      "possibilities of design",
    ],
    support: ["headset", "paradigm", "futures"],
  },
];

/** Opening desk only. Search does not apply a category unless the reader selects one. */
export const DEFAULT_CATEGORY: CategoryId = "foundations";

export function categoryById(id: CategoryId): Category {
  const category = categories.find((item) => item.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
