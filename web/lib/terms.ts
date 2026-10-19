/**
 * Query expansions. A direct word always outranks its synonyms.
 * Weights are relative to a direct match, never equal to one.
 */

export type Expansion = {
  phrase: string;
  weight: number;
};

export const EXPANSIONS: Record<string, readonly Expansion[]> = {
  ux: [
    { phrase: "user experience", weight: 0.75 },
    { phrase: "usability", weight: 0.7 },
    { phrase: "interaction design", weight: 0.55 },
    { phrase: "user research", weight: 0.5 },
    { phrase: "information architecture", weight: 0.45 },
    { phrase: "accessibility", weight: 0.45 },
  ],
  ui: [
    { phrase: "user interface", weight: 0.75 },
    { phrase: "interface design", weight: 0.65 },
  ],
  ai: [{ phrase: "artificial intelligence", weight: 0.7 }],
  "ai ux": [
    { phrase: "ai interaction", weight: 0.7 },
    { phrase: "human-ai interaction", weight: 0.75 },
    { phrase: "human ai interaction", weight: 0.75 },
    { phrase: "human-ai", weight: 0.7 },
    { phrase: "human ai", weight: 0.7 },
    { phrase: "ai usability", weight: 0.65 },
  ],
  "ai agents": [
    { phrase: "autonomous agents", weight: 0.7 },
    { phrase: "agentic workflows", weight: 0.65 },
    { phrase: "agentic workflow", weight: 0.65 },
    { phrase: "orchestration", weight: 0.55 },
    { phrase: "tool use", weight: 0.5 },
    { phrase: "agentic", weight: 0.6 },
  ],
  "agentic ai": [
    { phrase: "ai agents", weight: 0.75 },
    { phrase: "autonomous agents", weight: 0.65 },
    { phrase: "agentic workflows", weight: 0.6 },
    { phrase: "orchestration", weight: 0.5 },
    { phrase: "tool use", weight: 0.45 },
  ],
  "design systems": [
    { phrase: "component systems", weight: 0.6 },
    { phrase: "component system", weight: 0.6 },
    { phrase: "design tokens", weight: 0.55 },
    { phrase: "component libraries", weight: 0.55 },
    { phrase: "component library", weight: 0.55 },
  ],
  "enterprise ux": [
    { phrase: "enterprise applications", weight: 0.65 },
    { phrase: "complex workflows", weight: 0.55 },
    { phrase: "business software", weight: 0.45 },
  ],
  "conversational ai": [
    { phrase: "ai assistants", weight: 0.65 },
    { phrase: "dialogue design", weight: 0.6 },
    { phrase: "conversational interfaces", weight: 0.7 },
    { phrase: "dialogue", weight: 0.5 },
  ],
  "usability testing": [
    { phrase: "usability test", weight: 0.8 },
    { phrase: "user testing", weight: 0.65 },
    { phrase: "usability evaluation", weight: 0.6 },
  ],
};

const STOP = new Set(
  "a an the of to for and or in on with my me i should what how do does is it this that be can about please something some want need would could from your you at by as if when which into out up just get make too many really very give am are was were been being have has had not no yes so than then there here also only blog article read reading link".split(
    " ",
  ),
);

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Singular form. "interfaces" stays "interface", not a clipped stem. */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ses") && word.length > 5) return word.slice(0, -2);
  if (/(ches|shes|xes|zes|sses)$/.test(word) && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Shared root for interaction/interacting and testing/test. Abbreviations stay whole. */
export function root(word: string): string {
  const stemmed = stem(word);
  if (stemmed.length > 6 && stemmed.endsWith("ing")) return stemmed.slice(0, -3);
  if (stemmed.length > 6 && stemmed.endsWith("ion")) return stemmed.slice(0, -3);
  return stemmed;
}

export function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length <= 3 || b.length <= 3) return false;
  if (stem(a) === stem(b)) return true;
  const left = root(a);
  const right = root(b);
  // "interaction" and "interacting" share a root. The bare word "interact" does not.
  return left.length >= 4 && left === right && a.length > left.length && b.length > right.length;
}

export function containsPhrase(haystack: string, phrase: string): boolean {
  const words = haystack.split(" ").filter(Boolean);
  const parts = phrase.split(" ").filter(Boolean);
  if (!parts.length || words.length < parts.length) return false;
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
    if (found) return true;
  }
  return false;
}

/** Abbreviations stay. Ordinary one- and two-letter words do not. */
export function queryTokens(normalized: string): string[] {
  const tokens: string[] = [];
  for (const word of normalized.split(" ")) {
    if (!word || STOP.has(word)) continue;
    if (word.length <= 2 && !EXPANSIONS[word]) continue;
    const stemmed = stem(word);
    if (!tokens.includes(word)) tokens.push(word);
    if (stemmed !== word && !tokens.includes(stemmed)) tokens.push(stemmed);
  }
  return tokens;
}
