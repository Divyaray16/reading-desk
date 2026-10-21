/**
 * Editorial ranking. Score math, gates, and the final three are deterministic.
 * Semantic signals come from the category definition and the article text.
 * Ranking version 3 — 21 Oct 2026. Weights: relevance 35, actionability 25,
 * depth 20, credibility 10, freshness 10. An article qualifies for a desk
 * only when that desk is its primary category.
 */

import { categories, categoryById, type Category, type CategoryId } from "./categories.ts";
import { classifyArticle } from "./classify.ts";
import { articles as corpusArticles, type Article, type Evidence } from "./corpus.ts";
import { parsePublished } from "./day.ts";
import { sourceById, type SourceType } from "./sources.ts";

export const RANKING_VERSION = 3;

/** Known publication dates older than this stay in the library and stay out of the desk. */
export const MAX_ARTICLE_AGE_DAYS = 548;

export const WEIGHTS = {
  relevance: 35,
  actionability: 25,
  depth: 20,
  credibility: 10,
  freshness: 10,
} as const;

export type Dimensions = {
  relevance: number;
  actionability: number;
  depth: number;
  credibility: number;
  freshness: number;
};

export type Rejection =
  | "unapproved-source"
  | "invalid-url"
  | "insufficient"
  | "irrelevant"
  | "duplicate"
  | "promotional"
  | "index-page"
  | "stale";

export type Scored = {
  article: Article;
  dimensions: Dimensions;
  score: number;
  evidence: Evidence;
  matched: string[];
  angle: "research" | "method" | "perspective";
  qualified: boolean;
  rejection?: Rejection;
};

export type Selection = {
  shown: Scored[];
  qualifiedCount: number;
  note: string | null;
  /** Qualified articles in rank order, including ones held back from the three. */
  pool: Scored[];
};

const ACTION = [
  "how to",
  "practice",
  "pattern",
  "principle",
  "method",
  "framework",
  "checklist",
  "recommend",
  "guideline",
  "lesson",
];

const PROMO = /^(announcing|introducing|we.?re hiring|join our team|comments for)\b/i;

const INDEX_TITLE = /^(ux blog|blog|home|comments for)\b/i;

export function scoreOf(dimensions: Dimensions): number {
  const raw =
    (clamp(dimensions.relevance) / 5) * WEIGHTS.relevance +
    (clamp(dimensions.actionability) / 5) * WEIGHTS.actionability +
    (clamp(dimensions.depth) / 5) * WEIGHTS.depth +
    (clamp(dimensions.credibility) / 5) * WEIGHTS.credibility +
    (clamp(dimensions.freshness) / 5) * WEIGHTS.freshness;
  return Math.round(raw * 10) / 10;
}

function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 5) return 5;
  return value;
}

export function articleUrlOk(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const path = parsed.pathname.replace(/\/+$/, "");
  if (!path || path === "") return false;
  const parts = path.split("/").filter(Boolean);
  if (parts.some((part) => part === "feed" || part === "comments")) return false;
  if (parts.length === 1) {
    const slug = parts[0]?.toLowerCase() ?? "";
    const index = new Set(["blog", "research", "articles", "category", "ux", "news", "feed"]);
    return slug.length >= 12 && !index.has(slug);
  }
  if (parts.length < 1) return false;
  const last = parts[parts.length - 1] ?? "";
  if (["blog", "research", "articles", "category", "ux"].includes(last) && parts.length < 3) {
    return false;
  }
  return true;
}

function haystack(article: Article): string {
  return `${article.title} ${article.excerpt}`.toLowerCase();
}

export function isRecentArticle(publishedAt: string, now: Date): boolean {
  const published = parsePublished(publishedAt);
  if (!published) return true;
  const days = (now.getTime() - published.getTime()) / 86_400_000;
  if (days < 0) return true;
  return days <= MAX_ARTICLE_AGE_DAYS;
}

export function matchedSignals(article: Article, category: Category): string[] {
  return classifyArticle(article).matched[category.id] ?? [];
}

/** Only the primary category earns relevance. A passing keyword does not. */
function relevanceScore(article: Article, category: Category): number {
  const classified = classifyArticle(article);
  if (classified.status !== "classified" || classified.primary !== category.id) return 0;
  // The title agreeing with the category outranks a body-only match.
  return classified.titleStrong[category.id] ? 5 : 3;
}

function actionabilityScore(article: Article): number {
  const text = haystack(article);
  const hits = ACTION.filter((phrase) => text.includes(phrase)).length;
  if (hits >= 4) return 5;
  if (hits >= 3) return 4;
  if (hits >= 2) return 3;
  if (hits >= 1) return 2;
  return 1;
}

function depthScore(article: Article): number {
  const words = article.excerpt.split(/\s+/).filter(Boolean).length;
  let score = 0;
  if (words >= 80) score += 2;
  else if (words >= 40) score += 1;
  if (/\d/.test(article.excerpt)) score += 1;
  if (article.title.length > 42) score += 1;
  if (!/^(a |an |the )?(introduction|overview|update)s?\b/i.test(article.title)) score += 1;
  return Math.min(5, score);
}

function credibilityScore(type: SourceType, evidence: Evidence): number {
  const base = type === "company" ? 3 : 4;
  return Math.min(5, base + (evidence === "excerpt" || evidence === "full_text" ? 1 : 0));
}

export function freshnessScore(article: Article, category: Category, now: Date, depth: number): number {
  const published = parsePublished(article.publishedAt);
  if (!published) return depth >= 4 ? 3 : 2;
  const days = (now.getTime() - published.getTime()) / 86_400_000;
  if (days < 0) return 3;
  if (days > MAX_ARTICLE_AGE_DAYS) return 1;
  if (category.pace === "fast") {
    if (days <= 45) return 5;
    if (days <= 120) return 4;
    if (days <= 270) return 3;
    return 2;
  }
  if (days <= 120) return 5;
  if (days <= 270) return 4;
  return 2;
}

function angleOf(article: Article, type: SourceType | undefined): Scored["angle"] {
  const text = haystack(article);
  if (type === "research" || /study|finding|evidence|experiment|benchmark/.test(text)) return "research";
  if (ACTION.some((phrase) => text.includes(phrase))) return "method";
  return "perspective";
}

function tokenSet(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

export function nearDuplicate(a: string, b: string): boolean {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (left.size === 0 || right.size === 0) return false;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  const union = left.size + right.size - shared;
  return union > 0 && shared / union >= 0.72;
}

export function evaluateArticle(article: Article, categoryId: CategoryId, now: Date): Scored {
  const category = categoryById(categoryId);
  const source = sourceById(article.sourceId);
  const matched = source ? matchedSignals(article, category) : [];
  const depth = depthScore(article);
  const dimensions: Dimensions = {
    relevance: source ? relevanceScore(article, category) : 0,
    actionability: actionabilityScore(article),
    depth,
    credibility: source ? credibilityScore(source.type, article.evidence) : 0,
    freshness: freshnessScore(article, category, now, depth),
  };
  const score = scoreOf(dimensions);
  const base: Scored = {
    article,
    dimensions,
    score,
    evidence: article.evidence,
    matched,
    angle: angleOf(article, source?.type),
    qualified: false,
  };

  if (!source) return { ...base, rejection: "unapproved-source" };
  if (!articleUrlOk(article.url)) return { ...base, rejection: "invalid-url" };
  if (INDEX_TITLE.test(article.title) || /comments for/i.test(article.title)) {
    return { ...base, rejection: "index-page" };
  }
  if (article.evidence === "metadata" && article.excerpt.trim().length < 80) {
    return { ...base, rejection: "insufficient" };
  }
  if (article.excerpt.trim().length < 40) return { ...base, rejection: "insufficient" };
  if (!isRecentArticle(article.publishedAt, now)) return { ...base, rejection: "stale" };
  if (PROMO.test(article.title) && dimensions.actionability <= 2 && dimensions.relevance < 3) {
    return { ...base, rejection: "promotional" };
  }
  if (dimensions.relevance < 2) return { ...base, rejection: "irrelevant" };
  return { ...base, qualified: true };
}

export type Feedback = {
  skipped: readonly string[];
  useful: readonly string[];
};

function adjustedScore(item: Scored, feedback: Feedback): number {
  let score = item.score;
  if (feedback.useful.includes(item.article.id)) score += 8;
  if (feedback.skipped.includes(item.article.id)) score -= 18;
  return score;
}

/** Pick three complementary articles. A large score gap beats a diversity preference. */
export function selectThree(ranked: readonly Scored[]): Scored[] {
  const pool = ranked.filter((item) => item.qualified);
  const chosen: Scored[] = [];
  const usedSources = new Set<string>();
  const usedAngles = new Set<string>();

  for (const item of pool) {
    if (chosen.length === 0) {
      chosen.push(item);
      usedSources.add(item.article.sourceId);
      usedAngles.add(item.angle);
      continue;
    }
    if (chosen.length >= 3) break;
  }

  const rest = () => pool.filter((item) => !chosen.includes(item));

  while (chosen.length < 3) {
    const remaining = rest();
    if (remaining.length === 0) break;
    const best = remaining[0];
    if (!best) break;
    const alternate = remaining.find((item) => {
      if (best.score - item.score > 12) return false;
      if (usedSources.has(item.article.sourceId)) return false;
      return true;
    });
    const angled = remaining.find((item) => {
      if (best.score - item.score > 12) return false;
      if (usedSources.has(item.article.sourceId)) return false;
      if (usedAngles.has(item.angle)) return false;
      return true;
    });
    const next = angled ?? alternate ?? best;
    chosen.push(next);
    usedSources.add(next.article.sourceId);
    usedAngles.add(next.angle);
  }

  return chosen;
}

export function rankCategory(
  categoryId: CategoryId,
  library: readonly Article[],
  now: Date,
  feedback: Feedback = { skipped: [], useful: [] },
): Selection {
  const evaluated = library.map((article) => evaluateArticle(article, categoryId, now));
  const kept: Scored[] = [];
  for (const item of evaluated) {
    if (!item.qualified) continue;
    const duplicate = kept.some((other) => nearDuplicate(other.article.title, item.article.title));
    if (duplicate) {
      kept.push({ ...item, qualified: false, rejection: "duplicate" });
      continue;
    }
    kept.push(item);
  }
  // Duplicates were recorded on a side copy; the pool for ranking is qualified only,
  // with the first of a near-duplicate pair kept above.
  const qualified = evaluated
    .map((item) => {
      const replaced = kept.find((row) => row.article.id === item.article.id);
      return replaced ?? item;
    })
    .filter((item) => item.qualified);

  const unique: Scored[] = [];
  for (const item of qualified) {
    if (unique.some((other) => nearDuplicate(other.article.title, item.article.title))) continue;
    unique.push(item);
  }

  unique.sort((a, b) => {
    const delta = adjustedScore(b, feedback) - adjustedScore(a, feedback);
    if (delta !== 0) return delta;
    return a.article.title.localeCompare(b.article.title);
  });

  const shown = selectThree(unique);

  return { shown, qualifiedCount: unique.length, note: null, pool: unique };
}

/** Eligible recent articles whose primary category is that desk. Categories with zero stay hidden. */
export function categoryArticleCounts(
  library: readonly Article[] = corpusArticles,
  now: Date = new Date(),
): Record<CategoryId, number> {
  const counts = {} as Record<CategoryId, number>;
  for (const category of categories) {
    counts[category.id] = rankCategory(category.id, library, now).qualifiedCount;
  }
  return counts;
}
