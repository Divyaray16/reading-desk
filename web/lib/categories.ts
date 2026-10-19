/**
 * Category definitions are semantic guidance for scoring an article's text.
 * They do not restrict which publications may contribute.
 */

export type CategoryId =
  | "general-ux"
  | "ai-ux"
  | "agentic"
  | "product"
  | "conversational"
  | "enterprise"
  | "strategy"
  | "ai-technology";

export type FreshnessPace = "slow" | "fast";

export type Category = {
  id: CategoryId;
  label: string;
  line: string;
  /** Phrases that indicate the subject. Matching is a signal, not a keyword gate by itself. */
  signals: readonly string[];
  pace: FreshnessPace;
};

export const categories: readonly Category[] = [
  {
    id: "general-ux",
    label: "General UX & Usability",
    line: "Usability, accessibility, navigation, and evidence for interface decisions.",
    pace: "slow",
    signals: [
      "usability",
      "accessible",
      "accessibility",
      "navigation",
      "information architecture",
      "cognitive load",
      "heuristic",
      "wayfinding",
      "form design",
      "microinteraction",
      "user research",
      "readability",
      "error message",
      "usability test",
    ],
  },
  {
    id: "ai-ux",
    label: "AI UX & Human–AI Interaction",
    line: "Trust, control, uncertainty, and how people work with AI systems.",
    pace: "slow",
    signals: [
      "trust",
      "transparency",
      "uncertainty",
      "oversight",
      "explainability",
      "explainable",
      "human-ai",
      "human ai",
      "disclosure",
      "user control",
      "responsible ai",
      "confidence",
      "people and ai",
      "ai experience",
    ],
  },
  {
    id: "agentic",
    label: "Agentic AI & AI Product Design",
    line: "Agents, tool use, orchestration, and where a person still intervenes.",
    pace: "fast",
    signals: [
      "agentic",
      "ai agent",
      "agents",
      "orchestration",
      "tool calling",
      "tool use",
      "multi-agent",
      "autonomous",
      "escalation",
      "agent workflow",
      "agent design",
    ],
  },
  {
    id: "product",
    label: "Product Design & Design Systems",
    line: "Product craft, components, and design-to-development collaboration.",
    pace: "slow",
    signals: [
      "design system",
      "component",
      "prototyp",
      "interaction design",
      "design token",
      "product design",
      "interface design",
      "consistency",
      "craft",
      "design-to-dev",
    ],
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
      "copilot",
      "assistant",
      "turn-taking",
      "clarification",
      "messaging",
      "customer support",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise UX & Complex Workflows",
    line: "Dense work, operational tools, and workflows with many roles.",
    pace: "slow",
    signals: [
      "enterprise",
      "workflow",
      "operational",
      "dashboard",
      "checkout",
      "ecommerce",
      "productivity",
      "role-based",
      "business process",
      "supply chain",
      "data-heavy",
    ],
  },
  {
    id: "strategy",
    label: "UX Strategy & Design Thinking",
    line: "Framing the problem, research strategy, and design leadership.",
    pace: "slow",
    signals: [
      "design strategy",
      "ux strategy",
      "leadership",
      "design thinking",
      "problem framing",
      "opportunity",
      "organizational",
      "product strategy",
      "systems thinking",
      "influence",
      "design-led",
    ],
  },
  {
    id: "ai-technology",
    label: "AI Technology & Emerging Trends",
    line: "Model capabilities, architectures, and research that changes the product.",
    pace: "fast",
    signals: [
      "foundation model",
      "language model",
      "multimodal",
      "inference",
      "benchmark",
      "transformer",
      "neural",
      "training",
      "reasoning",
      "model capability",
      "gpu",
    ],
  },
];

export const DEFAULT_CATEGORY: CategoryId = "general-ux";

export function categoryById(id: CategoryId): Category {
  const category = categories.find((item) => item.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
