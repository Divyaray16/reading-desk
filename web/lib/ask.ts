/**
 * Search entry used by the desk. The library is the retrieved article cache.
 * No model call. Short words such as "UX" are kept and expanded.
 */

import { categories } from "./categories.ts";
import { articles, type Article } from "./corpus.ts";
import { explain } from "./explain.ts";
import { formatPublished } from "./day.ts";
import { searchArticles } from "./search.ts";
import { sourceById } from "./sources.ts";
import type { Recommendation } from "./desk.ts";
import type { Evidence } from "./corpus.ts";

export const NO_MATCH = "No articles match that. Try a related term, such as usability, agents, or design systems.";

export type AskResult = { kind: "reads"; articles: Recommendation[] } | { kind: "none"; text: string };

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asEvidence(value: unknown): Evidence {
  if (value === "full_text" || value === "excerpt" || value === "metadata") return value;
  return "metadata";
}

export function ask(question: string, _now: Date = new Date(), library: readonly Article[] = articles): AskResult {
  const hits = searchArticles(asText(question), library);
  if (hits.length === 0) return { kind: "none", text: NO_MATCH };

  const shown: Recommendation[] = [];
  for (const hit of hits) {
    const source = sourceById(asText(hit.article.sourceId));
    if (!source || typeof hit.article.title !== "string" || typeof hit.article.url !== "string") continue;
    const title = hit.article.title;
    const excerpt = asText(hit.article.excerpt);
    const author = asText(hit.article.author);
    const publishedAt = asText(hit.article.publishedAt);
    const evidence = asEvidence(hit.article.evidence);
    const shownEvidence: Evidence = evidence === "full_text" ? "excerpt" : evidence;
    const text = `${title} ${excerpt}`.toLowerCase();
    const category =
      categories.find((item) => item.signals.some((signal) => text.includes(signal))) ?? categories[0];
    if (!category) continue;
    const safeArticle = { ...hit.article, title, excerpt, author, publishedAt, evidence };
    const explanation = explain(safeArticle, category, hit.matched) ?? {
      text: excerpt.trim().slice(0, 280) || title,
      focus: "",
      evidence: shownEvidence,
    };
    explanation.evidence = shownEvidence;
    if (hit.matched.length > 0) {
      explanation.focus = `Matched ${hit.matched.slice(0, 3).join(", ")}.`;
    }
    shown.push({
      id: hit.article.id,
      title,
      url: hit.article.url,
      publication: source.name,
      author,
      date: formatPublished(publishedAt),
      explanation,
      evidence: shownEvidence,
    });
  }

  if (shown.length === 0) return { kind: "none", text: NO_MATCH };
  return { kind: "reads", articles: shown };
}
