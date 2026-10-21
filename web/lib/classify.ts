/**
 * Primary and secondary category for one article.
 * A category is earned by the article's subject, not by a publication and not by a stray word.
 * Thin text is marked for reevaluation instead of being forced into a category.
 */

import { categories, type CategoryId } from "./categories.ts";
import type { Article } from "./corpus.ts";

export const TECHNOLOGY_TAGS = [
  "foundation model",
  "language model",
  "multimodal",
  "inference",
  "benchmark",
  "transformer",
  "neural",
  "model capability",
  "gpu",
] as const;

export type ClassificationStatus = "classified" | "needs-reevaluation";

export type Classification = {
  status: ClassificationStatus;
  primary: CategoryId | null;
  secondary: CategoryId[];
  matched: Partial<Record<CategoryId, string[]>>;
  titleStrong: Partial<Record<CategoryId, boolean>>;
};

const PRIMARY_MIN = 4;
const SECONDARY_CAP = 2;

type Hit = {
  score: number;
  phrases: string[];
  titleStrong: boolean;
  strong: boolean;
};

function boundary(char: string | undefined): boolean {
  return char === undefined || !/[a-z0-9]/.test(char);
}

export function hasPhrase(text: string, phrase: string): boolean {
  const body = text.toLowerCase();
  const needle = phrase.toLowerCase().trim();
  if (!needle) return false;
  let from = 0;
  while (from <= body.length - needle.length) {
    const at = body.indexOf(needle, from);
    if (at < 0) return false;
    const before = at === 0 ? undefined : body[at - 1];
    const after = body[at + needle.length];
    const plural = after === "s" && boundary(body[at + needle.length + 1]);
    if (boundary(before) && (boundary(after) || plural)) return true;
    from = at + 1;
  }
  return false;
}

function collect(text: string, phrases: readonly string[]): string[] {
  const found = phrases.filter((phrase) => hasPhrase(text, phrase));
  return found.filter(
    (phrase) => !found.some((other) => other.length > phrase.length && other.includes(phrase) && hasPhrase(text, other)),
  );
}

function scoreCategory(title: string, excerpt: string, signals: readonly string[], support: readonly string[]): Hit {
  const titleStrong = collect(title, signals);
  const bodyStrong = collect(excerpt, signals).filter((phrase) => !titleStrong.includes(phrase));
  const strong = titleStrong.length + bodyStrong.length > 0;
  const titleSupport = strong ? [] : collect(title, support);
  const bodySupport = strong ? collect(excerpt, support) : [];
  const score = titleStrong.length * 5 + bodyStrong.length * 2 + titleSupport.length * 2 + bodySupport.length * 0.5;
  return {
    score,
    phrases: [...new Set([...titleStrong, ...bodyStrong, ...titleSupport])],
    titleStrong: titleStrong.length > 0,
    strong,
  };
}

function earliest(title: string, phrases: readonly string[]): number {
  const lower = title.toLowerCase();
  let at = Number.POSITIVE_INFINITY;
  for (const phrase of phrases) {
    const found = lower.indexOf(phrase.toLowerCase());
    if (found >= 0) at = Math.min(at, found);
  }
  return at;
}

export function technologyTags(article: Pick<Article, "title" | "excerpt">): string[] {
  const text = `${article.title} ${article.excerpt}`;
  return TECHNOLOGY_TAGS.filter((tag) => hasPhrase(text, tag));
}

export function classifyArticle(article: Pick<Article, "title" | "excerpt" | "evidence">): Classification {
  const title = typeof article.title === "string" ? article.title : "";
  const excerpt = typeof article.excerpt === "string" ? article.excerpt : "";
  const thin = excerpt.trim().length < 80;
  const hits = categories.map((category) => ({
    id: category.id,
    hit: scoreCategory(title, excerpt, category.signals, category.support),
  }));
  const earned = hits.filter((row) => row.hit.strong && row.hit.score >= PRIMARY_MIN);
  earned.sort((a, b) => {
    if (b.hit.score !== a.hit.score) return b.hit.score - a.hit.score;
    if (a.hit.titleStrong !== b.hit.titleStrong) return a.hit.titleStrong ? -1 : 1;
    const place = earliest(title, a.hit.phrases) - earliest(title, b.hit.phrases);
    if (place !== 0) return place;
    return categories.findIndex((item) => item.id === a.id) - categories.findIndex((item) => item.id === b.id);
  });

  const matched: Classification["matched"] = {};
  const titleStrong: Classification["titleStrong"] = {};
  for (const row of earned) {
    matched[row.id] = row.hit.phrases;
    titleStrong[row.id] = row.hit.titleStrong;
  }

  if (thin || earned.length === 0) {
    return { status: "needs-reevaluation", primary: null, secondary: [], matched, titleStrong };
  }

  const primary = earned[0]?.id ?? null;
  const secondary = earned.slice(1, 1 + SECONDARY_CAP).map((row) => row.id);
  return { status: "classified", primary, secondary, matched, titleStrong };
}
