import { categoryById, type CategoryId } from "./categories.ts";
import { articles, type Article } from "./corpus.ts";
import { explain, type Explanation } from "./explain.ts";
import { formatPublished } from "./day.ts";
import { evaluateArticle, rankCategory, type Feedback, type Scored } from "./rank.ts";
import { sourceById } from "./sources.ts";

export const CAP = 3;

export type Recommendation = {
  id: string;
  title: string;
  url: string;
  publication: string;
  author: string;
  date: string | null;
  explanation: Explanation;
  evidence: Scored["evidence"];
};

export type Desk = {
  shown: Recommendation[];
  note: string | null;
  qualifiedCount: number;
};

export function present(item: Scored, categoryId: CategoryId): Recommendation | null {
  const source = sourceById(item.article.sourceId);
  if (!source) return null;
  const category = categoryById(categoryId);
  const explanation = explain(item.article, category, item.matched);
  if (!explanation) return null;
  return {
    id: item.article.id,
    title: item.article.title,
    url: item.article.url,
    publication: source.name,
    author: item.article.author,
    date: formatPublished(item.article.publishedAt),
    explanation,
    evidence: item.evidence,
  };
}

/** Show a stored day's articles without re-ranking them. */
export function showCached(categoryId: CategoryId, ids: readonly string[], now: Date = new Date()): Recommendation[] {
  const shown: Recommendation[] = [];
  for (const id of ids) {
    const article = articles.find((item) => item.id === id);
    if (!article) continue;
    const scored = evaluateArticle(article, categoryId, now);
    const card = present({ ...scored, qualified: true }, categoryId);
    if (card) shown.push(card);
  }
  return shown;
}

export function selectDesk(
  categoryId: CategoryId,
  feedback: Feedback = { skipped: [], useful: [] },
  now: Date = new Date(),
  library: readonly Article[] = articles,
): Desk {
  const ranked = rankCategory(categoryId, library, now, feedback);
  const shown = ranked.shown
    .map((item) => present(item, categoryId))
    .filter((item): item is Recommendation => item !== null);
  return {
    shown: shown.slice(0, CAP),
    note: null,
    qualifiedCount: ranked.qualifiedCount,
  };
}
