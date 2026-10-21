/**
 * One primary category, or needs-reevaluation.
 * The primary is the central subject of the excerpt, not the publication and not a stray word.
 * A thin excerpt, a title with nothing behind it in the excerpt, or two subjects too close
 * to call stay in needs-reevaluation. Needs reevaluation is not a category.
 * Tags live in tags.ts and never stand in for the primary.
 */

import { categories, type CategoryId } from "./categories.ts";
import type { Article } from "./corpus.ts";
import { articleTags } from "./tags.ts";
import { containsPhrase, normalize, sameWord } from "./terms.ts";

export { articleTags };

export type ClassificationStatus = "classified" | "needs-reevaluation";

export type Classification = {
  status: ClassificationStatus;
  primary: CategoryId | null;
  matched: Partial<Record<CategoryId, string[]>>;
  titleStrong: Partial<Record<CategoryId, boolean>>;
};

const THIN_EXCERPT = 80;
const SHORT_EXCERPT = 420;
const MIN_SCORE = 4;
const CLOSE_MARGIN = 1.6;

const LOW_WEIGHT: Record<string, number> = {
  agent: 1.7,
  layout: 3.3,
  enterprise: 3.3,
  dialogue: 3.3,
  javascript: 3.3,
  react: 3.3,
  roi: 3.6,
};

const STRONG_WORD = new Set([
  "accessibility",
  "agentic",
  "chatbot",
  "css",
  "dashboard",
  "typography",
  "usability",
  "conversational",
  "naming",
]);

/** A bare technology token does not make the article design engineering. */
const TECH_ONLY = new Set(["react"]);
const GENERIC_ENGINEERING = new Set(["css", "javascript", "front end", "frontend", "react", "stylesheet"]);
const DESIGN_CONTEXT = ["design", "interface", "css", "layout", "ux", "prototype", "frontend", "front end", "stylesheet"];

/** Title phrases that can place an article when the excerpt is about the same work. */
const TITLE_CORROBORATE = new Set([
  "boardroom",
  "design leadership",
  "ux writing",
  "storytelling",
  "visual identity",
  "great product",
]);

type Hit = {
  id: CategoryId;
  excerptScore: number;
  score: number;
  phrases: string[];
  titleStrong: boolean;
};

const cache = new WeakMap<object, Classification>();

function signalWeight(phrase: string): number {
  const lowered = LOW_WEIGHT[phrase];
  if (lowered !== undefined) return lowered;
  const words = phrase.split(" ").length;
  if (words >= 3) return 5;
  if (words === 2 || STRONG_WORD.has(phrase)) return 4.2;
  return 3.3;
}

function countSignal(raw: string, folded: string, phrase: string): number {
  if (phrase === "react") return raw.match(/\bReact\b/g)?.length ?? 0;
  return countPhrase(folded, phrase);
}

function countPhrase(haystack: string, phrase: string): number {
  const words = haystack.split(" ").filter(Boolean);
  const parts = phrase.split(" ").filter(Boolean);
  if (!parts.length || words.length < parts.length) return 0;
  let count = 0;
  for (let start = 0; start <= words.length - parts.length; start += 1) {
    let found = true;
    for (let offset = 0; offset < parts.length; offset += 1) {
      const word = words[start + offset];
      const part = parts[offset];
      if (!word || !part || !sameWord(word, part)) {
        found = false;
        break;
      }
    }
    if (!found) continue;
    count += 1;
    start += parts.length - 1;
  }
  return count;
}

function activePhrases(rawTitle: string, rawExcerpt: string, title: string, excerpt: string): Set<string> {
  const matched = new Set<string>();
  for (const category of categories) {
    for (const phrase of category.signals) {
      if (countSignal(rawTitle, title, phrase) > 0 || countSignal(rawExcerpt, excerpt, phrase) > 0) matched.add(phrase);
    }
  }
  const drop = new Set<string>();
  for (const phrase of matched) {
    for (const other of matched) {
      if (phrase !== other && containsPhrase(other, phrase)) drop.add(phrase);
    }
  }
  for (const phrase of drop) matched.delete(phrase);
  return matched;
}

function designContext(title: string, excerpt: string): boolean {
  const text = `${title} ${excerpt}`;
  return DESIGN_CONTEXT.some((phrase) => containsPhrase(text, phrase));
}

function excerptBacksTitle(id: CategoryId, excerpt: string): boolean {
  const practice =
    id === "product"
      ? ["ux", "design", "user", "product", "stakeholder", "wireframe", "budget"]
      : id === "content"
        ? ["write", "writing", "user", "design", "story", "content"]
        : id === "visual"
          ? ["design", "brand", "visual"]
          : [];
  return practice.some((phrase) => containsPhrase(excerpt, phrase));
}

function earliestWord(title: string, phrases: readonly string[]): number {
  const words = title.split(" ").filter(Boolean);
  let best = -1;
  for (const phrase of phrases) {
    const parts = phrase.split(" ").filter(Boolean);
    if (!parts.length || words.length < parts.length) continue;
    for (let start = 0; start <= words.length - parts.length; start += 1) {
      let found = true;
      for (let offset = 0; offset < parts.length; offset += 1) {
        const word = words[start + offset];
        const part = parts[offset];
        if (!word || !part || !sameWord(word, part)) {
          found = false;
          break;
        }
      }
      if (!found) continue;
      if (best < 0 || start < best) best = start;
      break;
    }
  }
  return best;
}

/**
 * A long excerpt needs the title, the opening, a repeated phrase, a strong phrase
 * early in the piece, or two subject phrases. One late weak mention is not the subject.
 */
function anchored(
  rawTitle: string,
  rawExcerpt: string,
  title: string,
  excerpt: string,
  phrases: readonly string[],
  signals: readonly string[],
): boolean {
  if (phrases.length === 0) return false;
  // The title can name the subject while the excerpt uses a different phrase from the same category.
  if (signals.some((phrase) => countSignal(rawTitle, title, phrase) > 0)) return true;
  if (excerpt.length < SHORT_EXCERPT) return true;
  const opening = excerpt.slice(0, 220);
  const rawOpening = rawExcerpt.slice(0, 220);
  if (phrases.some((phrase) => countSignal(rawOpening, opening, phrase) > 0)) return true;
  const early = excerpt.slice(0, 430);
  const rawEarly = rawExcerpt.slice(0, 430);
  for (const phrase of phrases) {
    const hits = countSignal(rawExcerpt, excerpt, phrase);
    if (hits >= 2) return true;
    // A specific phrase in the first part of the essay is the subject. A bare word is not.
    if (signalWeight(phrase) >= 4.2 && countSignal(rawEarly, early, phrase) > 0) return true;
  }
  return false;
}

function scoreCategory(
  rawTitle: string,
  rawExcerpt: string,
  title: string,
  excerpt: string,
  id: CategoryId,
  allowed: Set<string>,
): Hit {
  const category = categories.find((item) => item.id === id);
  const signals = (category?.signals ?? []).filter((phrase) => allowed.has(phrase));
  const support = category?.support ?? [];
  const titlePhrases = signals.filter((phrase) => countSignal(rawTitle, title, phrase) > 0);
  const excerptPhrases: string[] = [];
  let excerptScore = 0;
  for (const phrase of signals) {
    const hits = countSignal(rawExcerpt, excerpt, phrase);
    if (hits === 0) continue;
    excerptScore += signalWeight(phrase) + Math.min(hits - 1, 3) * 0.85;
    excerptPhrases.push(phrase);
  }
  if (id === "engineering" && excerptPhrases.length > 0 && excerptPhrases.every((phrase) => GENERIC_ENGINEERING.has(phrase))) {
    const titled = excerptPhrases.filter((phrase) => titlePhrases.includes(phrase));
    excerptPhrases.length = 0;
    excerptScore = 0;
    for (const phrase of titled) {
      const hits = countSignal(rawExcerpt, excerpt, phrase);
      if (hits === 0) continue;
      excerptScore += signalWeight(phrase) + Math.min(hits - 1, 3) * 0.85;
      excerptPhrases.push(phrase);
    }
  }
  // "naming" at the end of a systems essay is not content design. The title or a repeated discussion is.
  if (id === "content" && excerptPhrases.includes("naming") && !titlePhrases.includes("naming")) {
    const hits = countSignal(rawExcerpt, excerpt, "naming");
    if (hits < 2) {
      excerptPhrases.splice(excerptPhrases.indexOf("naming"), 1);
      excerptScore -= signalWeight("naming");
    }
  }
  if (excerptPhrases.length === 0 && excerpt.length >= THIN_EXCERPT && excerptBacksTitle(id, excerpt)) {
    const phrase = titlePhrases.find((item) => TITLE_CORROBORATE.has(item));
    if (phrase) {
      excerptPhrases.push(phrase);
      excerptScore += signalWeight(phrase);
    }
  }
  const empty = (titleStrong: boolean): Hit => ({ id, excerptScore: 0, score: 0, phrases: [], titleStrong });
  if (!anchored(rawTitle, rawExcerpt, title, excerpt, excerptPhrases, signals)) return empty(titlePhrases.length > 0);
  let score = excerptScore;
  if (excerptPhrases.length > 0 && titlePhrases.length > 0) score += 3.2;
  if (excerptPhrases.length > 0) {
    let added = 0;
    for (const phrase of support) {
      if (added >= 3) break;
      if (countPhrase(excerpt, phrase) === 0) continue;
      if (excerptPhrases.some((signal) => signal === phrase || containsPhrase(signal, phrase))) continue;
      score += 0.7;
      excerptScore += 0.7;
      added += 1;
    }
  }
  if (
    id === "engineering" &&
    excerptPhrases.length > 0 &&
    excerptPhrases.every((phrase) => TECH_ONLY.has(phrase)) &&
    !designContext(title, excerpt)
  ) {
    return empty(titlePhrases.length > 0);
  }
  // One example of a chatbot or a line of dialogue is not conversation design.
  if (
    id === "conversational" &&
    excerptPhrases.length > 0 &&
    excerptPhrases.every((phrase) => phrase === "chatbot" || phrase === "dialogue") &&
    titlePhrases.length === 0 &&
    excerptPhrases.every((phrase) => countSignal(rawExcerpt, excerpt, phrase) < 2)
  ) {
    return empty(false);
  }
  if (id === "enterprise" && excerptPhrases.length > 0 && excerptPhrases.every((phrase) => phrase === "enterprise")) {
    const text = `${title} ${excerpt}`;
    const designed = ["ux", "design", "interface", "workflow", "dashboard", "user", "usability"].some((word) =>
      containsPhrase(text, word),
    );
    if (!designed) return empty(titlePhrases.length > 0);
  }
  return {
    id,
    excerptScore,
    score,
    phrases: excerptPhrases,
    titleStrong: titlePhrases.length > 0,
  };
}

function tooClose(top: Hit, second: Hit | undefined, title: string): boolean {
  if (!second || second.excerptScore <= 0 || second.score < MIN_SCORE) return false;
  const margin = top.score - second.score;
  if (margin >= CLOSE_MARGIN) return false;
  if (top.score <= 0 || second.score / top.score < 0.8) return false;
  if (top.titleStrong && !second.titleStrong && margin >= 1) return false;
  if (top.titleStrong && second.titleStrong) {
    const topAt = earliestWord(title, top.phrases);
    const secondAt = earliestWord(title, second.phrases);
    if (topAt >= 0 && secondAt >= topAt + 2) return false;
  }
  return true;
}

function classify(article: Pick<Article, "title" | "excerpt" | "evidence">): Classification {
  const rawTitle = typeof article.title === "string" ? article.title : "";
  const rawExcerpt = typeof article.excerpt === "string" ? article.excerpt : "";
  const title = normalize(rawTitle);
  const excerpt = normalize(rawExcerpt);
  const allowed = activePhrases(rawTitle, rawExcerpt, title, excerpt);
  const hits = categories.map((category) => scoreCategory(rawTitle, rawExcerpt, title, excerpt, category.id, allowed));
  const matched: Classification["matched"] = {};
  const titleStrong: Classification["titleStrong"] = {};
  for (const hit of hits) {
    if (hit.phrases.length === 0) continue;
    matched[hit.id] = hit.phrases;
    titleStrong[hit.id] = hit.titleStrong;
  }

  const thin = excerpt.trim().length < THIN_EXCERPT;
  const ranked = hits
    .filter((hit) => hit.excerptScore > 0 && hit.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || categories.findIndex((item) => item.id === a.id) - categories.findIndex((item) => item.id === b.id));
  const top = ranked[0];
  if (thin || !top || tooClose(top, ranked[1], title)) {
    return { status: "needs-reevaluation", primary: null, matched, titleStrong };
  }
  return { status: "classified", primary: top.id, matched, titleStrong };
}

export function classifyArticle(article: Pick<Article, "title" | "excerpt" | "evidence">): Classification {
  if (article && typeof article === "object") {
    const cached = cache.get(article);
    if (cached) return cached;
    const result = classify(article);
    cache.set(article, result);
    return result;
  }
  return classify(article);
}
