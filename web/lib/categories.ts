/**
 * Eight subject categories. They describe an article's contribution,
 * not the publication it came from. Every approved source may appear in any category.
 */

export type CategoryId =
  | "foundations"
  | "research"
  | "interaction"
  | "systems"
  | "ai-ux"
  | "conversational"
  | "agentic"
  | "enterprise";

export type FreshnessPace = "slow" | "fast";

export type Category = {
  id: CategoryId;
  label: string;
  line: string;
  /** Phrases that carry the category's subject. A passing mention is not enough. */
  signals: readonly string[];
  /** Nearby words. They support a strong phrase; they do not place an article alone. */
  support: readonly string[];
  pace: FreshnessPace;
};

export const categories: readonly Category[] = [
  {
    id: "foundations",
    label: "UX Foundations & Usability",
    line: "Usability, accessibility, and the interface decisions people feel immediately.",
    pace: "slow",
    signals: [
      "usability",
      "accessibility",
      "inclusive design",
      "cognitive inclusion",
      "information architecture",
      "heuristic",
      "wayfinding",
      "form design",
      "readability",
      "error message",
      "ux writing",
      "ux audit",
      "tactile ux",
      "cognitive load",
      "navigation",
    ],
    support: ["user experience", "interface"],
  },
  {
    id: "research",
    label: "UX Research & Behavioral Insights",
    line: "How people are studied, and what their behavior changes in the design.",
    pace: "slow",
    signals: [
      "ux research",
      "user research",
      "empathy map",
      "empathy mapping",
      "design thinking",
      "form insight",
      "storytelling",
      "personalization",
      "usability test",
      "usability testing",
      "diary study",
      "field study",
    ],
    support: ["interview", "survey", "persona", "participant", "behavioral", "behaviour"],
  },
  {
    id: "interaction",
    label: "Product Design & Interaction Patterns",
    line: "Patterns, prototypes, and the shape of the interaction itself.",
    pace: "slow",
    signals: [
      "interaction design",
      "product design",
      "interface design",
      "microinteraction",
      "prototype",
      "design pattern",
      "service design",
      "visual direction",
      "tactile",
    ],
    support: ["interface", "layout", "button", "pattern"],
  },
  {
    id: "systems",
    label: "Design Systems & Design Engineering",
    line: "Components, tokens, and the work of keeping a system buildable.",
    pace: "slow",
    signals: [
      "design system",
      "design token",
      "component library",
      "design engineering",
      "code connect",
      "content model",
    ],
    support: ["component", "token", "naming"],
  },
  {
    id: "ai-ux",
    label: "AI UX & Human–AI Interaction",
    line: "How a person understands, directs, and trusts a model.",
    pace: "slow",
    signals: [
      "human-ai",
      "human ai",
      "human in the loop",
      "ai usability",
      "ai experience",
      "using ai for ux",
      "designing ai",
      "users think",
      "designing with uncertainty",
      "ai labelling",
      "ai labeling",
      "disclose ai",
      "responsible ai",
      "explainability",
    ],
    support: ["trust", "transparency", "uncertainty", "oversight", "modality"],
  },
  {
    id: "conversational",
    label: "Conversational AI & AI Assistants",
    line: "Dialogue, assistants, and the turns between a person and a system.",
    pace: "fast",
    signals: [
      "conversational",
      "conversation design",
      "dialogue",
      "chatbot",
      "assistant",
      "copilot",
      "siri",
    ],
    support: ["chat", "messaging", "turn-taking"],
  },
  {
    id: "agentic",
    label: "Agentic AI & Autonomous Workflows",
    line: "Agents that plan, use tools, and hand work back to a person.",
    pace: "fast",
    signals: [
      "agentic",
      "ai agent",
      "agents",
      "agent",
      "autonomous",
      "orchestration",
      "tool calling",
      "tool use",
      "multi-agent",
      "agent workflow",
    ],
    support: ["handoff", "escalation", "planning"],
  },
  {
    id: "enterprise",
    label: "Enterprise UX & Product Strategy",
    line: "Operating models, adoption, and strategy for complex product work.",
    pace: "slow",
    signals: [
      "enterprise",
      "brand strategy",
      "product strategy",
      "design strategy",
      "ux strategy",
      "design leadership",
      "leadership",
      "operating model",
      "roi",
      "boardroom",
      "stakeholder",
    ],
    support: ["organization", "roadmap", "dashboard", "workflow", "adoption", "data residency"],
  },
];

export const DEFAULT_CATEGORY: CategoryId = "foundations";

export function categoryById(id: CategoryId): Category {
  const category = categories.find((item) => item.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
