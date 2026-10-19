/**
 * Answers a question from the shelf already copied into catalog.ts.
 * No model call. Titles and URLs are the piece's own.
 */

import { pieces, publicationName, type Piece } from "./catalog.ts";
import { CAP, score, selectDesk } from "./desk.ts";

export const NO_MATCH = "Nothing on the shelf matches that.";

export type AskResult =
  | { kind: "reads"; pieces: Piece[] }
  | { kind: "advice"; pieces: Piece[]; text: string }
  | { kind: "none"; text: string };

const READING =
  /\b(give me|blogs?|articles?|reads?|reading|links?)\b/i;

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

/** Format words. They ask for a read, and they are weak matches on their own. */
const WEAK = new Set(["blog", "article", "read", "reading", "link"]);

const STEM: Record<string, string> = {
  accessibility: "access",
  accessible: "access",
  colors: "color",
  colour: "color",
  colours: "color",
  controls: "control",
  control: "control",
  systems: "system",
  system: "system",
  screens: "screen",
  screen: "screen",
  states: "state",
  state: "state",
  blogs: "blog",
  articles: "article",
  critiques: "critique",
  reads: "read",
  links: "link",
};

/** Words for the topic tags she actually asks with, including the desk labels. */
const TOPIC_WORDS: Record<Piece["topics"][number], string[]> = {
  "empty states": ["empty", "state", "screen"],
  critique: ["critique"],
  "design systems": ["design", "system"],
  complexity: ["complexity", "control"],
  craft: ["craft"],
  "product writing": ["product", "writing", "copy"],
};

type Field = "title" | "publication" | "about" | "gives" | "topic";

const FIELD_WEIGHT: Record<Field, number> = {
  title: 4,
  topic: 4,
  about: 2,
  gives: 2,
  publication: 2,
};

function stem(word: string): string {
  return STEM[word] ?? word;
}

function tokensOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(stem);
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

function indexPiece(piece: Piece): Map<string, Set<Field>> {
  const map = new Map<string, Set<Field>>();
  function add(field: Field, text: string) {
    for (const token of tokensOf(text)) {
      const set = map.get(token) ?? new Set<Field>();
      set.add(field);
      map.set(token, set);
    }
  }
  add("title", piece.title);
  add("publication", publicationName(piece.publicationId));
  add("about", piece.about);
  add("gives", piece.gives);
  for (const topic of piece.topics) {
    add("topic", topic);
    add("topic", TOPIC_WORDS[topic].join(" "));
  }
  return map;
}

const indexed = pieces.map((piece) => ({ piece, fields: indexPiece(piece) }));
const shelfIndex = new Map(pieces.map((piece, index) => [piece.id, index]));

function weightOf(fields: Set<Field> | undefined, weak: boolean): number {
  if (!fields || fields.size === 0) return 0;
  let weight = 0;
  for (const field of fields) weight += FIELD_WEIGHT[field];
  return weak ? Math.min(weight, 2) : weight;
}

/** A publication name alone is not the piece's own words. */
function matchesInPiece(fields: Set<Field> | undefined): boolean {
  if (!fields) return false;
  for (const field of fields) {
    if (field !== "publication") return true;
  }
  return false;
}

type Ranked = { piece: Piece; strongHits: number; contentHits: number; weight: number };

function rank(question: string): Ranked[] {
  const { strong, weak } = contentTokens(question);
  const ranked: Ranked[] = [];
  for (const entry of indexed) {
    let strongHits = 0;
    let contentHits = 0;
    let weight = 0;
    for (const token of strong) {
      const fields = entry.fields.get(token);
      const tokenWeight = weightOf(fields, false);
      if (tokenWeight > 0) {
        strongHits += 1;
        weight += tokenWeight;
        if (matchesInPiece(fields)) contentHits += 1;
      }
    }
    for (const token of weak) {
      weight += weightOf(entry.fields.get(token), true);
    }
    const usable = strong.length > 0 ? strongHits > 0 : weight > 0;
    if (!usable) continue;
    ranked.push({ piece: entry.piece, strongHits, contentHits, weight });
  }
  ranked.sort((a, b) => {
    if (b.strongHits !== a.strongHits) return b.strongHits - a.strongHits;
    if (b.weight !== a.weight) return b.weight - a.weight;
    const scoreGap = score(b.piece) - score(a.piece);
    if (scoreGap !== 0) return scoreGap;
    return (shelfIndex.get(a.piece.id) ?? 0) - (shelfIndex.get(b.piece.id) ?? 0);
  });
  return ranked;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function adviceText(piece: Piece): string {
  const named = `That is from ${piece.title}.`;
  const body = [...splitSentences(piece.about), ...splitSentences(piece.gives)].slice(0, 3);
  const used = body.length > 0 ? body : [piece.about];
  return [...used, named].join(" ");
}

export function asksForReads(question: string): boolean {
  return READING.test(question);
}

export function ask(question: string): AskResult {
  const trimmed = question.trim();
  if (!trimmed) return { kind: "none", text: NO_MATCH };

  const reading = asksForReads(trimmed);
  const { strong, weak } = contentTokens(trimmed);
  if (strong.length === 0 && weak.length === 0) {
    if (reading) return { kind: "reads", pieces: selectDesk("best", [], 0).shown };
    return { kind: "none", text: NO_MATCH };
  }

  const ranked = rank(trimmed);
  const inThePiece = ranked.filter((item) => item.contentHits > 0);
  // A publication-name overlap does not fill a remaining slot.
  const pool = inThePiece.length > 0 ? inThePiece : ranked;
  const matches = pool.slice(0, CAP);
  if (matches.length === 0) return { kind: "none", text: NO_MATCH };

  const found = matches.map((item) => item.piece);
  if (reading) return { kind: "reads", pieces: found };

  const best = found[0];
  if (!best) return { kind: "none", text: NO_MATCH };
  return { kind: "advice", pieces: found, text: adviceText(best) };
}
