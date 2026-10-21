import { categoryById, type CategoryId } from "./categories.ts";
import { articles, type Article } from "./corpus.ts";
import { explain, type Explanation } from "./explain.ts";
import { byNewestPublished, formatPublished } from "./day.ts";
import { evaluateArticle, rankCategory, selectThree, type Feedback, type Scored } from "./rank.ts";
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

export type Bookmark = {
  id: string;
  title: string;
  url: string;
  publication: string;
};

export type Desk = {
  shown: Recommendation[];
  note: string | null;
  qualifiedCount: number;
};

export type DeskPage = Desk & {
  /** Zero-based page. The first page is the three newest eligible articles. */
  page: number;
  pageCount: number;
  /** Skipped articles that still belong to this category. */
  hiddenIds: string[];
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

/**
 * Essays marked useful, newest first. A missing or unapproved id is dropped.
 * The same list still boosts ranking; this only resolves what to show.
 */
export function bookmarksFor(ids: readonly string[], library: readonly Article[] = articles): Bookmark[] {
  const byId = new Map(library.map((article) => [article.id, article]));
  const seen = new Set<string>();
  const bookmarks: Bookmark[] = [];
  for (let index = ids.length - 1; index >= 0; index -= 1) {
    const id = ids[index];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const article = byId.get(id);
    if (!article || !article.url.startsWith("https://")) continue;
    const source = sourceById(article.sourceId);
    if (!source) continue;
    bookmarks.push({
      id: article.id,
      title: article.title,
      url: article.url,
      publication: source.name,
    });
  }
  return bookmarks;
}

/** Show a stored day's articles without re-ranking them, newest published date first. */
export function showCached(
  categoryId: CategoryId,
  ids: readonly string[],
  now: Date = new Date(),
  library: readonly Article[] = articles,
): Recommendation[] {
  const shown: { card: Recommendation; publishedAt: string }[] = [];
  for (const id of ids) {
    const article = library.find((item) => item.id === id);
    if (!article) continue;
    const scored = evaluateArticle(article, categoryId, now);
    const card = present({ ...scored, qualified: true }, categoryId);
    if (card) shown.push({ card, publishedAt: article.publishedAt });
  }
  return byNewestPublished(shown, (row) => row.publishedAt).map((row) => row.card);
}

function inPublishedOrder(cards: readonly Recommendation[], publishedAt: ReadonlyMap<string, string>): Recommendation[] {
  const stable = [...cards].sort((a, b) => a.id.localeCompare(b.id));
  return byNewestPublished(stable, (card) => publishedAt.get(card.id) ?? "");
}

export function sameArticleSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const pending = new Set(right);
  return left.every((id) => pending.has(id));
}

/** Replace one category in the day cache and leave the others in place. */
export function replaceDayPick(
  picks: Partial<Record<CategoryId, readonly string[]>>,
  categoryId: CategoryId,
  ids: readonly string[],
): Partial<Record<CategoryId, string[]>> {
  const next: Partial<Record<CategoryId, string[]>> = {};
  for (const key of Object.keys(picks) as CategoryId[]) {
    const value = picks[key];
    if (value) next[key] = [...value];
  }
  next[categoryId] = [...ids];
  return next;
}

function cardsFrom(items: readonly Scored[], categoryId: CategoryId, skipped: ReadonlySet<string>): Recommendation[] {
  const shown: Recommendation[] = [];
  for (const item of items) {
    if (skipped.has(item.article.id)) continue;
    const card = present(item, categoryId);
    if (!card || shown.some((existing) => existing.id === card.id)) continue;
    shown.push(card);
    if (shown.length === CAP) break;
  }
  return shown;
}

/**
 * Next trio for a category. The ordinary ranking is stable, so a refresh has to
 * step past the articles already on the desk. Skipped articles stay out.
 * With fewer than four eligible articles the same trio is returned.
 */
export function refreshDesk(
  categoryId: CategoryId,
  feedback: Feedback = { skipped: [], useful: [] },
  currentIds: readonly string[] = [],
  now: Date = new Date(),
  library: readonly Article[] = articles,
): Desk {
  const ranked = rankCategory(categoryId, library, now, feedback);
  const skipped = new Set(feedback.skipped);
  const eligible = ranked.pool.filter((item) => !skipped.has(item.article.id));
  const eligibleIds = new Set(eligible.map((item) => item.article.id));
  const visibleNow = currentIds.filter((id) => eligibleIds.has(id));

  let ordered = eligible;
  if (eligible.length >= 4 && visibleNow.length > 0) {
    const avoid = new Set(visibleNow);
    const fresh = eligible.filter((item) => !avoid.has(item.article.id));
    if (fresh.length >= CAP) {
      ordered = fresh;
    } else {
      const omit = visibleNow[0];
      ordered = eligible.filter((item) => item.article.id !== omit);
    }
  }

  const picked = selectThree(ordered);
  const rest = ordered.filter((item) => !picked.includes(item));
  let shown = cardsFrom([...picked, ...rest], categoryId, skipped);

  if (eligible.length >= 4 && visibleNow.length > 0 && sameArticleSet(shown.map((item) => item.id), visibleNow)) {
    const omit = visibleNow[0];
    shown = cardsFrom(
      eligible.filter((item) => item.article.id !== omit),
      categoryId,
      skipped,
    );
  }

  const publishedAt = new Map(eligible.map((item) => [item.article.id, item.article.publishedAt]));
  return {
    shown: inPublishedOrder(shown, publishedAt),
    note: null,
    qualifiedCount: eligible.length,
  };
}

function eligibleCards(
  categoryId: CategoryId,
  feedback: Feedback,
  now: Date,
  library: readonly Article[],
): { cards: Recommendation[]; qualifiedCount: number; hiddenIds: string[] } {
  const ranked = rankCategory(categoryId, library, now, feedback);
  const skipped = new Set(feedback.skipped);
  const hiddenIds = ranked.pool.filter((item) => skipped.has(item.article.id)).map((item) => item.article.id);
  const eligible = ranked.pool.filter((item) => !skipped.has(item.article.id));
  // Tie-break on id so a useful mark cannot reshuffle equal dates.
  eligible.sort((a, b) => a.article.id.localeCompare(b.article.id));
  const ordered = byNewestPublished(eligible, (item) => item.article.publishedAt);
  const cards: Recommendation[] = [];
  for (const item of ordered) {
    const card = present(item, categoryId);
    if (!card || cards.some((existing) => existing.id === card.id)) continue;
    cards.push(card);
  }
  return { cards, qualifiedCount: ranked.qualifiedCount, hiddenIds };
}

/**
 * One page of a category. The eligible pool is newest published date first
 * (undated last, 18-month gate unchanged), then cut into pages of three.
 * Useful marks still affect ranking and do not change this order.
 */
export function pageDesk(
  categoryId: CategoryId,
  page = 0,
  feedback: Feedback = { skipped: [], useful: [] },
  now: Date = new Date(),
  library: readonly Article[] = articles,
): DeskPage {
  const { cards, qualifiedCount, hiddenIds } = eligibleCards(categoryId, feedback, now, library);
  const pageCount = Math.max(1, Math.ceil(cards.length / CAP));
  const requested = Number.isFinite(page) ? Math.trunc(page) : 0;
  const safePage = cards.length === 0 ? 0 : Math.min(Math.max(requested, 0), pageCount - 1);
  return {
    shown: cards.slice(safePage * CAP, safePage * CAP + CAP),
    note: null,
    qualifiedCount,
    page: safePage,
    pageCount,
    hiddenIds,
  };
}

/** First page: the three newest eligible articles. */
export function selectDesk(
  categoryId: CategoryId,
  feedback: Feedback = { skipped: [], useful: [] },
  now: Date = new Date(),
  library: readonly Article[] = articles,
): Desk {
  const { shown, note, qualifiedCount } = pageDesk(categoryId, 0, feedback, now, library);
  return { shown, note, qualifiedCount };
}
