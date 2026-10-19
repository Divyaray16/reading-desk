/**
 * Answers a question from the catalog in this browser.
 * No network search and no API key. Titles are publication names, not invented essays.
 */

import {
  CAP,
  categories,
  hrefForAsk,
  sources,
  toBlogCard,
  type BlogCard,
  type CategoryId,
  type Source,
} from "./catalog.ts";

export const NO_MATCH = "Nothing in the catalog matches that.";

export type AskResult = { kind: "reads"; sources: BlogCard[] } | { kind: "none"; text: string };

const READING = /\b(give me|blogs?|articles?|reads?|reading|links?)\b/i;

const STOP = new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "for",
  "and",
  "or",
  "in",
  "on",
  "with",
  "my",
  "me",
  "i",
  "should",
  "what",
  "how",
  "do",
  "does",
  "is",
  "it",
  "this",
  "that",
  "be",
  "can",
  "about",
  "please",
  "something",
  "some",
  "want",
  "need",
  "would",
  "could",
  "from",
  "your",
  "you",
  "at",
  "by",
  "as",
  "if",
  "when",
  "which",
  "into",
  "out",
  "up",
  "just",
  "get",
  "make",
  "her",
  "his",
  "its",
  "too",
  "many",
  "really",
  "very",
  "give",
  "am",
  "are",
  "was",
  "were",
  "been",
  "being",
  "have",
  "has",
  "had",
  "not",
  "no",
  "yes",
  "so",
  "than",
  "then",
  "there",
  "here",
  "also",
  "only",
]);

const WEAK = new Set(["blog", "article", "read", "reading", "link"]);

/** Common words. They do not match a source on their own. A two-word phrase still can. */
const GENERIC = new Set([
  "design",
  "product",
  "research",
  "ux",
  "ai",
  "user",
  "interface",
  "writing",
  "team",
  "practice",
  "system",
  "human",
  "technology",
  "interaction",
  "work",
  "notes",
  "published",
  "practical",
  "essay",
  "think",
  "people",
  "complex",
  "emerging",
]);

const STEM: Record<string, string> = {
  assistants: "assistant",
  assistant: "assistant",
  workflows: "workflow",
  workflow: "workflow",
  trends: "trend",
  trend: "trend",
  systems: "system",
  system: "system",
  blogs: "blog",
  articles: "article",
  essays: "essay",
};

function stemPhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .map((token) => STEM[token] ?? token)
    .join(" ");
}

function tokensOf(text: string): string[] {
  const phrase = stemPhrase(text);
  return phrase ? phrase.split(" ") : [];
}

function contentTokens(question: string): { strong: string[]; weak: string[] } {
  const strong: string[] = [];
  const weak: string[] = [];
  for (const token of tokensOf(question)) {
    if (STOP.has(token)) continue;
    if (WEAK.has(token)) weak.push(token);
    else strong.push(token);
  }
  return { strong, weak };
}

function categoryScores(question: string, tokens: string[]): Map<CategoryId, number> {
  const phrase = stemPhrase(question);
  const has = (word: string) => tokens.includes(word);
  const scores = new Map<CategoryId, number>();
  const add = (id: CategoryId, points: number) => {
    if (points <= 0) return;
    scores.set(id, (scores.get(id) ?? 0) + points);
  };

  if (phrase.includes("general ux")) add("general-ux", 2);
  if (has("usability")) add("general-ux", 2);
  if (has("ux") && !has("ai")) add("general-ux", 1);

  if (phrase.includes("ai ux") || (has("ai") && has("ux"))) add("ai-ux", 3);
  if (phrase.includes("human ai")) add("ai-ux", 2);

  if (has("agentic") || has("agent") || phrase.includes("ai agent")) add("agentic", 3);

  if (phrase.includes("design system")) add("product", 3);
  if (phrase.includes("product design")) add("product", 2);

  if (has("conversational") || has("assistant")) add("conversational", 3);

  if (has("enterprise") || has("workflow")) add("enterprise", 3);

  if (has("strategy") || phrase.includes("design thinking")) add("strategy", 3);

  if (has("emerging") || has("trend") || phrase.includes("ai technology")) add("ai-technology", 3);
  else if (has("technology")) add("ai-technology", 1);

  const specificAi =
    has("ux") ||
    has("agent") ||
    has("agentic") ||
    has("assistant") ||
    has("technology") ||
    has("emerging") ||
    has("trend");
  if (has("ai") && !specificAi) add("ai-ux", 2);

  return scores;
}

function matchedCategories(question: string, tokens: string[]): CategoryId[] {
  const scores = categoryScores(question, tokens);
  let best = 0;
  for (const value of scores.values()) best = Math.max(best, value);
  if (best === 0) return [];
  return categories.filter((category) => scores.get(category.id) === best).map((category) => category.id);
}

function nameBonus(question: string, source: Source): number {
  const phrase = stemPhrase(question);
  for (const candidate of [source.name, ...source.aliases]) {
    const stemmed = stemPhrase(candidate);
    if (stemmed.length < 4) continue;
    if (phrase.includes(stemmed)) return 12;
  }
  return 0;
}

function pairBonus(tokens: string[], line: string): number {
  const stemmedLine = stemPhrase(line);
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const pair = `${tokens[i]} ${tokens[i + 1]}`;
    if (stemmedLine.includes(pair)) return 9;
  }
  return 0;
}

function tokenScore(source: Source, tokens: string[]): number {
  const nameTokens = new Set(tokensOf(`${source.name} ${source.aliases.join(" ")}`));
  const lineTokens = new Set(tokensOf(source.line));
  let score = 0;
  for (const token of tokens) {
    if (GENERIC.has(token)) continue;
    if (nameTokens.has(token)) score += 8;
    else if (lineTokens.has(token)) score += 4;
  }
  return score;
}

function featuredIndex(sourceId: string, matched: readonly CategoryId[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const categoryId of matched) {
    const category = categories.find((item) => item.id === categoryId);
    const index = category?.featured.indexOf(sourceId) ?? -1;
    if (index >= 0 && index < best) best = index;
  }
  return best;
}

type Ranked = { source: Source; score: number; index: number; featuredAt: number };

function rank(question: string, tokens: string[]): { ranked: Ranked[]; matched: CategoryId[] } {
  const matched = matchedCategories(question, tokens);
  const matchedSet = new Set(matched);
  const ranked: Ranked[] = [];
  sources.forEach((source, index) => {
    let score = nameBonus(question, source) + pairBonus(tokens, source.line) + tokenScore(source, tokens);
    if (matchedSet.size > 0) {
      for (const categoryId of matched) {
        const category = categories.find((item) => item.id === categoryId);
        if (!category) continue;
        if (category.featured.includes(source.id)) score += 10;
        else if (category.extras.includes(source.id)) score += 4;
      }
    }
    if (score <= 0) return;
    ranked.push({
      source,
      score,
      index,
      featuredAt: featuredIndex(source.id, matched),
    });
  });
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.featuredAt !== b.featuredAt) return a.featuredAt - b.featuredAt;
    return a.index - b.index;
  });
  return { ranked, matched };
}

function cardsFor(categoryId: CategoryId): BlogCard[] {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return [];
  return category.featured.slice(0, CAP).map((id) => {
    const source = sources.find((item) => item.id === id);
    if (!source) throw new Error(`Unknown source: ${id}`);
    return toBlogCard(source, hrefForAsk(source, [categoryId]));
  });
}

export function asksForReads(question: string): boolean {
  return READING.test(question);
}

export function ask(question: string): AskResult {
  const trimmed = question.trim();
  if (!trimmed) return { kind: "none", text: NO_MATCH };

  const { strong, weak } = contentTokens(trimmed);
  if (strong.length === 0) {
    if (weak.length > 0 || asksForReads(trimmed)) {
      return { kind: "reads", sources: cardsFor("general-ux") };
    }
    return { kind: "none", text: NO_MATCH };
  }

  const { ranked, matched } = rank(trimmed, strong);
  const found = ranked.slice(0, CAP).map((item) => toBlogCard(item.source, hrefForAsk(item.source, matched)));
  if (found.length === 0) return { kind: "none", text: NO_MATCH };
  return { kind: "reads", sources: found };
}
