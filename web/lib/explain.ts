import type { Category } from "./categories.ts";
import type { Article, Evidence } from "./corpus.ts";

export type Explanation = {
  text: string;
  focus: string;
  evidence: Evidence;
};

function sentences(excerpt: string): string[] {
  return excerpt
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
}

/** Editorial line taken from the excerpt. It does not add claims the excerpt does not make. */
export function explain(article: Article, category: Category, matched: readonly string[]): Explanation | null {
  if (article.evidence === "metadata" || article.excerpt.trim().length < 40) return null;
  const found = sentences(article.excerpt);
  const sentence =
    found.find((line) => matched.some((signal) => line.toLowerCase().includes(signal))) ?? found[0];
  if (!sentence) return null;
  const clipped = sentence.length > 320 ? `${sentence.slice(0, 317).trim()}…` : sentence;
  const focus = matched.slice(0, 2);
  const focusLine =
    focus.length > 0
      ? `It belongs with ${category.label} because the excerpt discusses ${focus.join(" and ")}.`
      : "";
  return {
    text: clipped,
    focus: focusLine,
    evidence: article.evidence,
  };
}
