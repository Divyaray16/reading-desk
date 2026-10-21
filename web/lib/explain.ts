import type { Category } from "./categories.ts";
import type { Article, Evidence } from "./corpus.ts";
import { containsPhrase, normalize } from "./terms.ts";

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
  const discusses = (line: string, signal: string) => containsPhrase(normalize(line), normalize(signal));
  const sentence = found.find((line) => matched.some((signal) => discusses(line, signal))) ?? found[0];
  if (!sentence) return null;
  const clipped = sentence.length > 320 ? `${sentence.slice(0, 317).trim()}…` : sentence;
  const discussed = matched.filter((signal) => discusses(article.excerpt, signal)).slice(0, 2);
  const focusLine =
    discussed.length > 0
      ? `It belongs with ${category.label} because the excerpt discusses ${discussed.join(" and ")}.`
      : matched.length > 0
        ? `It belongs with ${category.label} because the title names that subject and the excerpt stays on the same work.`
        : "";
  return {
    text: clipped,
    focus: focusLine,
    evidence: article.evidence,
  };
}
