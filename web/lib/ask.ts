/**
 * Answers from the retrieved article library. No model call.
 * A question is scored the way a category is: by the words in the articles themselves.
 */

import { categories, type CategoryId } from "./categories.ts";
import { articles, type Article } from "./corpus.ts";
import { explain } from "./explain.ts";
import { formatPublished } from "./day.ts";
import { articleUrlOk, evaluateArticle, nearDuplicate, scoreOf, type Scored } from "./rank.ts";
import { sourceById } from "./sources.ts";
import type { Recommendation } from "./desk.ts";

export const NO_MATCH = "Nothing retrieved matches that well enough to recommend. No article was invented.";

export type AskResult = { kind: "reads"; articles: Recommendation[] } | { kind: "none"; text: string };

const STOP = new Set(
  "a an the of to for and or in on with my me i should what how do does is it this that be can about please something some want need would could from your you at by as if when which into out up just get make too many really very give am are was were been being have has had not no yes so than then there here also only blog article read reading link".split(
    " ",
  ),
);

function questionSignals(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word));
}

function questionScore(article: Article, words: string[]): number {
  const text = `${article.title} ${article.excerpt}`.toLowerCase();
  const title = article.title.toLowerCase();
  let score = 0;
  for (const word of words) {
    if (title.includes(word)) score += 2;
    else if (text.includes(word)) score += 1;
  }
  return score;
}

export function ask(question: string, now: Date = new Date(), library: readonly Article[] = articles): AskResult {
  const words = questionSignals(question);
  if (words.length === 0) return { kind: "none", text: NO_MATCH };

  const hinted = categories.find((category) =>
    category.signals.some((signal) => question.toLowerCase().includes(signal)),
  );
  const categoryId: CategoryId = hinted?.id ?? "general-ux";

  const ranked: Scored[] = [];
  for (const article of library) {
    const base = evaluateArticle(article, categoryId, now);
    const q = questionScore(article, words);
    if (base.rejection === "unapproved-source" || base.rejection === "invalid-url" || base.rejection === "insufficient" || base.rejection === "index-page") {
      continue;
    }
    if (q < 2 && base.dimensions.relevance < 2) continue;
    if (!articleUrlOk(article.url)) continue;
    const boosted: Scored = {
      ...base,
      qualified: true,
      score: scoreOf({
        ...base.dimensions,
        relevance: Math.min(5, base.dimensions.relevance + Math.min(3, q)),
      }),
      matched: base.matched.length > 0 ? base.matched : words.slice(0, 2),
    };
    if (ranked.some((other) => nearDuplicate(other.article.title, article.title))) continue;
    ranked.push(boosted);
  }

  ranked.sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title));
  const shown: Recommendation[] = [];
  for (const item of ranked) {
    if (shown.length >= 3) break;
    const source = sourceById(item.article.sourceId);
    const category = categories.find((entry) => entry.id === categoryId);
    if (!source || !category) continue;
    const explanation = explain(item.article, category, item.matched);
    if (!explanation) continue;
    shown.push({
      id: item.article.id,
      title: item.article.title,
      url: item.article.url,
      publication: source.name,
      author: item.article.author,
      date: formatPublished(item.article.publishedAt),
      explanation,
      evidence: item.evidence,
    });
  }

  if (shown.length === 0) return { kind: "none", text: NO_MATCH };
  return { kind: "reads", articles: shown };
}
