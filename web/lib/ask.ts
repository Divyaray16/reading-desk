/**
 * Search entry used by the desk. The library is the retrieved article cache.
 * No model call. Short words such as "UX" are kept and expanded.
 * Category ids are optional filters (OR). An empty list searches the whole library.
 */

import { categoryById, type CategoryId } from "./categories.ts";
import { classifyArticle } from "./classify.ts";
import { articles, type Article } from "./corpus.ts";
import { explain } from "./explain.ts";
import { formatPublished } from "./day.ts";
import { searchArticles } from "./search.ts";
import { sourceById } from "./sources.ts";
import { readingMinutes, type Recommendation } from "./desk.ts";
import type { Evidence } from "./corpus.ts";

export const NO_MATCH = "No relevant articles were found. Broaden the query or clear filters.";

export type AskResult = { kind: "reads"; articles: Recommendation[] } | { kind: "none"; text: string };

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asEvidence(value: unknown): Evidence {
  if (value === "full_text" || value === "excerpt" || value === "metadata") return value;
  return "metadata";
}

export function ask(
  question: string,
  now: Date = new Date(),
  library: readonly Article[] = articles,
  categoryIds: readonly CategoryId[] = [],
): AskResult {
  const hits = searchArticles(asText(question), library, now, categoryIds);
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
    const classified = classifyArticle({ title, excerpt, evidence });
    const labels = classified.tags.map((id) => categoryById(id).label);
    const lead = classified.tags[0];
    const category = lead ? categoryById(lead) : undefined;
    const safeArticle = { ...hit.article, title, excerpt, author, publishedAt, evidence };
    const explained = category && lead ? explain(safeArticle, category, classified.matched[lead] ?? []) : null;
    const summary = explained?.text || excerpt.trim().slice(0, 280) || title;
    shown.push({
      id: hit.article.id,
      title,
      url: hit.article.url,
      publication: source.name,
      author,
      date: formatPublished(publishedAt),
      categories: labels,
      readingMinutes: readingMinutes(excerpt, evidence),
      explanation: { text: summary, focus: "", evidence: shownEvidence },
      evidence: shownEvidence,
    });
  }

  if (shown.length === 0) return { kind: "none", text: NO_MATCH };
  return { kind: "reads", articles: shown };
}
