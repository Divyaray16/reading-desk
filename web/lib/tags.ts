/**
 * Secondary concepts. A tag is not a category and does not place an article.
 * Synonyms collapse to one canonical label. Only phrases the title or excerpt
 * actually contain are kept, and the list is capped.
 */

import { containsPhrase, normalize } from "./terms.ts";

export const TAG_CAP = 5;

export type Tag = {
  label: string;
  phrases: readonly string[];
};

export const tags: readonly Tag[] = [
  { label: "Generative AI", phrases: ["generative ai", "gen ai"] },
  { label: "Agentic AI", phrases: ["agentic"] },
  { label: "RAG", phrases: ["retrieval augmented", "rag"] },
  { label: "Copilots", phrases: ["copilot", "copilots"] },
  { label: "AI Agents", phrases: ["ai agent", "ai agents", "multi-agent", "multi agent"] },
  { label: "Usability Testing", phrases: ["usability testing", "usability test", "user testing"] },
  { label: "Figma", phrases: ["figma"] },
  { label: "React", phrases: ["reactjs", "jsx"] },
  { label: "CSS", phrases: ["css"] },
  { label: "Design Tokens", phrases: ["design token", "design tokens"] },
  { label: "Product Strategy", phrases: ["product strategy"] },
  { label: "Human-in-the-Loop", phrases: ["human in the loop", "human-in-the-loop", "hitl"] },
  { label: "Large Language Models", phrases: ["large language model", "language model", "llm", "llms"] },
  { label: "Foundation Models", phrases: ["foundation model"] },
  { label: "Transformer", phrases: ["transformer"] },
  { label: "GPU", phrases: ["gpu"] },
  { label: "Multimodal", phrases: ["multimodal"] },
  { label: "Benchmarks", phrases: ["benchmark"] },
  { label: "Inference", phrases: ["inference"] },
  { label: "WCAG", phrases: ["wcag"] },
  { label: "Screen Readers", phrases: ["screen reader"] },
  { label: "Information Architecture", phrases: ["information architecture"] },
  { label: "Prototyping", phrases: ["prototype", "prototyping"] },
  { label: "Typography", phrases: ["typography"] },
  { label: "Dashboards", phrases: ["dashboard"] },
  { label: "Journey Maps", phrases: ["journey map", "customer journey"] },
  { label: "UX Writing", phrases: ["ux writing"] },
  { label: "Chatbots", phrases: ["chatbot"] },
  { label: "Orchestration", phrases: ["orchestration"] },
  { label: "Explainability", phrases: ["explainability", "explainable"] },
  { label: "Component Libraries", phrases: ["component library", "component libraries"] },
  { label: "JavaScript", phrases: ["javascript"] },
  { label: "Usability Heuristics", phrases: ["usability heuristic", "heuristic"] },
  { label: "Mental Models", phrases: ["mental model"] },
  { label: "Service Blueprints", phrases: ["service blueprint"] },
  { label: "Inclusive Design", phrases: ["inclusive design"] },
  { label: "Content Strategy", phrases: ["content strategy"] },
  { label: "Neural Networks", phrases: ["neural"] },
  { label: "Voice Interfaces", phrases: ["voice interface", "voice ui"] },
  { label: "Microinteractions", phrases: ["microinteraction"] },
  { label: "Code Connect", phrases: ["code connect"] },
];

const LABELS = new Set(tags.map((tag) => tag.label));

export function isCanonicalTag(label: string): boolean {
  return LABELS.has(label);
}

/** Canonical tags supported by the title or excerpt, longest phrase first, capped. */
export function articleTags(article: { title?: unknown; excerpt?: unknown }): string[] {
  const title = typeof article.title === "string" ? article.title : "";
  const excerpt = typeof article.excerpt === "string" ? article.excerpt : "";
  const text = normalize(`${title} ${excerpt}`);
  const found: { label: string; length: number; index: number }[] = [];
  const raw = `${title} ${excerpt}`;
  tags.forEach((tag, index) => {
    let best = 0;
    if (tag.label === "React" && /\bReact\b/.test(raw)) best = 5;
    for (const phrase of tag.phrases) {
      const normalized = normalize(phrase);
      if (normalized && containsPhrase(text, normalized) && normalized.length > best) best = normalized.length;
    }
    if (best > 0) found.push({ label: tag.label, length: best, index });
  });
  found.sort((a, b) => b.length - a.length || a.index - b.index);
  const labels: string[] = [];
  for (const tag of found) {
    if (labels.length >= TAG_CAP) break;
    if (!labels.includes(tag.label)) labels.push(tag.label);
  }
  return labels;
}
