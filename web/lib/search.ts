/**
 * Keyword search over the retrieved article library.
 * No model and no network. Synonyms help recall; a direct hit still ranks higher.
 *
 * Direct weights, before the document-frequency factor (0.62–1):
 * exact phrase in the title 42, topic signals 16, excerpt 24, author or publication 9.
 * A query word scores title 22, topic/tag 14, excerpt 12, author or publication 9.
 * An expansion scores title 14, topic 9, excerpt 8, byline 5, then its map weight,
 * so a synonym stays below the same direct hit.
 */

import { categoryById } from "./categories.ts";
import { articleTags, classifyArticle } from "./classify.ts";
import { articles, type Article } from "./corpus.ts";
import { articleUrlOk, isRecentArticle, nearDuplicate } from "./rank.ts";
import { sourceById } from "./sources.ts";
import {
  EXPANSIONS,
  containsPhrase,
  normalize,
  queryTokens,
  root,
  sameWord,
  stem,
  type Expansion,
} from "./terms.ts";

export const RESULT_CAP = 3;

const MIN_SCORE = 8;
const EXPANSION_ONLY_MIN = 10;
const SOURCE_BAND = 0.55;

const DIRECT = {
  phraseTitle: 42,
  phraseExcerpt: 24,
  phraseTopics: 16,
  title: 22,
  excerpt: 12,
  topics: 14,
  byline: 9,
} as const;

const EXPANDED = {
  title: 14,
  excerpt: 8,
  topics: 9,
  byline: 5,
} as const;

const INDEX_TITLE = /^(ux blog|blog|home|comments for)\b/i;

export type SearchHit = {
  article: Article;
  score: number;
  matched: string[];
};

type Indexed = {
  article: Article;
  title: string;
  excerpt: string;
  author: string;
  publication: string;
  topics: string;
  words: string[];
};

type Plan = Expansion & { covers: string[] };

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function wordsOf(value: string): string[] {
  return value.split(" ").filter(Boolean);
}

function hasWord(words: readonly string[], token: string): boolean {
  return words.some((word) => sameWord(word, token));
}

function urlOk(url: unknown): boolean {
  if (typeof url !== "string" || !url.startsWith("https://")) return false;
  try {
    return articleUrlOk(url);
  } catch {
    return false;
  }
}

function indexArticle(article: Article): Indexed | null {
  if (!article || typeof article !== "object") return null;
  if (typeof article.id !== "string" || typeof article.title !== "string") return null;
  if (!urlOk(article.url)) return null;
  if (INDEX_TITLE.test(article.title)) return null;
  const title = normalize(article.title);
  const excerpt = normalize(asText(article.excerpt));
  const author = normalize(asText(article.author));
  const publication = normalize(sourceById(asText(article.sourceId))?.name ?? "");
  if (title.length < 3 && excerpt.length < 20) return null;
  const classified = classifyArticle(article);
  const label = classified.primary ? normalize(categoryById(classified.primary).label) : "";
  const tags = articleTags(article).map((tag) => normalize(tag));
  const topics = [label, ...tags].filter(Boolean).join(" ");
  return {
    article,
    title,
    excerpt,
    author,
    publication,
    topics,
    words: wordsOf(`${title} ${excerpt} ${author} ${publication} ${topics}`),
  };
}

const index: Indexed[] = articles.flatMap((article) => {
  const row = indexArticle(article);
  return row ? [row] : [];
});

const documentFrequency = new Map<string, number>();
for (const row of index) {
  const seen = new Set<string>();
  for (const word of wordsOf(`${row.title} ${row.excerpt}`)) {
    const key = stem(word);
    if (seen.has(key)) continue;
    seen.add(key);
    documentFrequency.set(key, (documentFrequency.get(key) ?? 0) + 1);
  }
}

function idf(token: string, documents: number, frequency: Map<string, number>): number {
  const docs = frequency.get(stem(token)) ?? frequency.get(root(token)) ?? 0;
  const raw = Math.log((documents + 1) / (docs + 1));
  const scaled = Math.max(0, Math.min(1, raw / 4));
  return 0.62 + 0.38 * scaled;
}

function phraseKeys(normalized: string): string[] {
  return Object.keys(EXPANSIONS)
    .filter((key) => key.includes(" ") && containsPhrase(normalized, normalize(key)))
    .sort((a, b) => b.length - a.length);
}

function tokensCovered(phrase: string, tokens: readonly string[]): string[] {
  const parts = normalize(phrase).split(" ").filter(Boolean);
  return tokens.filter((token) => parts.some((part) => part === token || sameWord(part, token)));
}

function plansFor(normalized: string, tokens: readonly string[]): Plan[] {
  const seen = new Set<string>();
  const plans: Plan[] = [];
  const add = (phrase: string, weight: number, covers: readonly string[]) => {
    const normalizedPhrase = normalize(phrase);
    if (!normalizedPhrase || seen.has(normalizedPhrase) || normalizedPhrase === normalized) return;
    if (tokens.length === 1 && tokens[0] === normalizedPhrase) return;
    const covered = [...new Set(covers.filter((token) => tokens.some((item) => item === token || sameWord(item, token))))];
    if (covered.length === 0) return;
    seen.add(normalizedPhrase);
    plans.push({ phrase: normalizedPhrase, weight, covers: covered });
  };

  const keys = [...phraseKeys(normalized), ...tokens.filter((token) => EXPANSIONS[token])];
  for (const key of keys) {
    const keyTokens = normalize(key).split(" ").filter(Boolean);
    const abbreviation = keyTokens.length === 1;
    for (const expansion of EXPANSIONS[key] ?? []) {
      const inPhrase = tokensCovered(expansion.phrase, tokens);
      const inKey = abbreviation ? tokensCovered(key, tokens) : [];
      add(expansion.phrase, expansion.weight, [...inPhrase, ...inKey]);
    }
  }

  for (const [key, expansions] of Object.entries(EXPANSIONS)) {
    for (const expansion of expansions) {
      const phrase = normalize(expansion.phrase);
      if (expansion.weight < 0.65 || !phrase || !containsPhrase(normalized, phrase)) continue;
      const covered = tokensCovered(phrase, tokens);
      if (covered.length !== tokens.length) continue;
      add(key, Math.min(0.8, expansion.weight), covered);
    }
  }
  return plans;
}

function bestDirect(row: Indexed, phrase: string): number {
  if (containsPhrase(row.title, phrase)) return DIRECT.phraseTitle;
  if (containsPhrase(row.topics, phrase)) return DIRECT.phraseTopics;
  if (containsPhrase(row.excerpt, phrase)) return DIRECT.phraseExcerpt;
  if (containsPhrase(`${row.author} ${row.publication}`, phrase)) return DIRECT.byline;
  return 0;
}

function tokenScore(row: Indexed, token: string, factor: number): number {
  const title = wordsOf(row.title);
  const excerpt = wordsOf(row.excerpt);
  const topics = wordsOf(row.topics);
  const byline = wordsOf(`${row.author} ${row.publication}`);
  if (hasWord(title, token)) return DIRECT.title * factor;
  if (hasWord(topics, token)) return DIRECT.topics * factor;
  if (hasWord(excerpt, token)) return DIRECT.excerpt * factor;
  if (hasWord(byline, token)) return DIRECT.byline * factor;
  return 0;
}

function expansionField(row: Indexed, phrase: string): number {
  if (containsPhrase(row.title, phrase)) return EXPANDED.title;
  if (containsPhrase(row.topics, phrase)) return EXPANDED.topics;
  if (containsPhrase(row.excerpt, phrase)) return EXPANDED.excerpt;
  if (containsPhrase(`${row.author} ${row.publication}`, phrase)) return EXPANDED.byline;
  return 0;
}

function tokenSpan(words: readonly string[], tokens: readonly string[]): number {
  const positions = tokens.map((token) => {
    const found: number[] = [];
    words.forEach((word, index) => {
      if (sameWord(word, token)) found.push(index);
    });
    return found;
  });
  if (positions.some((list) => list.length === 0)) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  const walk = (index: number, low: number, high: number) => {
    if (index === positions.length) {
      best = Math.min(best, high - low);
      return;
    }
    const places = positions[index] ?? [];
    for (const position of places.slice(0, 6)) walk(index + 1, Math.min(low, position), Math.max(high, position));
  };
  walk(0, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY);
  return best;
}

function requiredTokens(count: number): number {
  if (count <= 2) return count;
  return Math.ceil((count * 2) / 3);
}

function adjacentPair(words: readonly string[], left: string, right: string): boolean {
  for (let index = 0; index < words.length - 1; index += 1) {
    const current = words[index];
    const next = words[index + 1];
    if (!current || !next) continue;
    if ((sameWord(current, left) && sameWord(next, right)) || (sameWord(current, right) && sameWord(next, left))) return true;
  }
  return false;
}

function rarestIndex(tokens: readonly string[], documents: number, frequency: Map<string, number>): number {
  let chosen = 0;
  let best = -1;
  tokens.forEach((token, index) => {
    const factor = idf(token, documents, frequency);
    if (factor > best) {
      best = factor;
      chosen = index;
    }
  });
  return chosen;
}

function rowsFor(library: readonly Article[]): Indexed[] {
  if (library === articles) return index;
  const cached = new Map(index.map((row) => [row.article.id, row]));
  const rows: Indexed[] = [];
  for (const article of library) {
    if (!article || typeof article !== "object") continue;
    const known = typeof article.id === "string" ? cached.get(article.id) : undefined;
    if (known && known.article === article) {
      rows.push(known);
      continue;
    }
    const row = indexArticle(article);
    if (row) rows.push(row);
  }
  return rows;
}

function frequencyFor(rows: readonly Indexed[]): Map<string, number> {
  if (rows === index) return documentFrequency;
  const frequency = new Map<string, number>();
  for (const row of rows) {
    const seen = new Set<string>();
    for (const word of wordsOf(`${row.title} ${row.excerpt}`)) {
      const key = stem(word);
      if (seen.has(key)) continue;
      seen.add(key);
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
  }
  return frequency;
}

function diversify(hits: readonly SearchHit[]): SearchHit[] {
  const chosen: SearchHit[] = [];
  const blocked = (hit: SearchHit) =>
    chosen.some(
      (other) =>
        other.article.id === hit.article.id ||
        normalize(other.article.title) === normalize(hit.article.title) ||
        nearDuplicate(other.article.title, hit.article.title),
    );
  while (chosen.length < RESULT_CAP) {
    const pool = hits.filter((hit) => !blocked(hit));
    const best = pool[0];
    if (!best) break;
    const sourceUsed = chosen.some((other) => other.article.sourceId === best.article.sourceId);
    const alternative = sourceUsed
      ? pool.find((hit) => hit.article.sourceId !== best.article.sourceId && hit.score >= best.score * SOURCE_BAND)
      : undefined;
    chosen.push(alternative ?? best);
  }
  return chosen;
}

export function searchArticles(
  question: string,
  library: readonly Article[] = articles,
  now: Date = new Date(),
): SearchHit[] {
  const normalized = normalize(asText(question));
  const tokens = queryTokens(normalized);
  const phrases = phraseKeys(normalized);
  if (tokens.length === 0 && phrases.length === 0) return [];

  const rows = rowsFor(library);
  const frequency = frequencyFor(rows);
  const plans = plansFor(normalized, tokens);
  const needed = requiredTokens(tokens.length);
  const hits: SearchHit[] = [];

  for (const row of rows) {
    if (!isRecentArticle(asText(row.article.publishedAt), now)) continue;
    let direct = 0;
    const matched: string[] = [];
    const satisfied = tokens.map(() => false);
    const phraseScore = normalized.length > 2 ? bestDirect(row, normalized) : 0;
    if (phraseScore > 0) {
      direct += phraseScore;
      matched.push(normalized);
      satisfied.fill(true);
    }

    let tokenHits = 0;
    tokens.forEach((token, index) => {
      const gained = tokenScore(row, token, idf(token, rows.length, frequency));
      if (gained <= 0) return;
      direct += gained;
      tokenHits += 1;
      satisfied[index] = true;
      matched.push(token);
    });
    const matchedTokens = tokens.filter((_, tokenIndex) => satisfied[tokenIndex]);
    const span = tokenSpan(row.words, matchedTokens);
    if (tokenHits >= 2 && span <= 3) direct += 12;
    else if (tokenHits >= 2 && span <= 8) direct += 6;

    let expanded = 0;
    let strongExpansion = false;
    for (const plan of plans) {
      const field = expansionField(row, plan.phrase);
      if (field <= 0) continue;
      expanded += field * plan.weight;
      matched.push(plan.phrase);
      if (plan.weight >= 0.6) strongExpansion = true;
      tokens.forEach((token, index) => {
        if (plan.covers.some((item) => item === token || sameWord(item, token))) satisfied[index] = true;
      });
    }

    const covered = satisfied.filter(Boolean).length;
    if (tokens.length > 1 && covered === tokens.length) direct += 6;
    let bigram = 0;
    for (let index = 0; index < tokens.length - 1; index += 1) {
      const left = tokens[index];
      const right = tokens[index + 1];
      if (left && right && adjacentPair(row.words, left, right)) bigram += 16;
    }
    direct += bigram;
    if (tokens.length > 0 && covered < needed) continue;
    if (tokens.length > 2 && covered < tokens.length && span > 8) continue;
    if (tokens.length > 2 && covered < tokens.length && bigram === 0 && !satisfied[rarestIndex(tokens, rows.length, frequency)]) {
      continue;
    }
    if (tokenHits === 0 && phraseScore === 0 && (expanded < EXPANSION_ONLY_MIN || !strongExpansion)) continue;
    const score = Math.round((direct + expanded) * 100) / 100;
    if (score < MIN_SCORE) continue;
    hits.push({ article: row.article, score, matched: [...new Set(matched)].slice(0, 4) });
  }

  hits.sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title));
  return diversify(hits);
}
