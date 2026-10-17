import { pieces, type Piece, type Topic } from "./catalog.ts";

export const CAP = 3;

export type DeskView = "best" | "empty" | "controls" | "system" | "critique";

const VIEW_TOPIC: Record<Exclude<DeskView, "best">, Topic> = {
  empty: "empty states",
  controls: "complexity",
  system: "design systems",
  critique: "critique",
};

const DECISION_TOPICS = new Set<Topic>([
  "empty states",
  "critique",
  "design systems",
  "complexity",
]);

const TAG_WEIGHT: Record<Topic, number> = {
  "empty states": 5,
  critique: 5,
  "design systems": 5,
  complexity: 5,
  "product writing": 2,
  craft: 1,
};

export const views: { id: DeskView; label: string; line: string }[] = [
  {
    id: "best",
    label: "Just the best three",
    line: "The strongest three, with variety across publications.",
  },
  {
    id: "empty",
    label: "Empty screen",
    line: "Pieces about an empty screen.",
  },
  {
    id: "controls",
    label: "Too many controls",
    line: "Pieces about complexity and too many controls.",
  },
  {
    id: "system",
    label: "Design system",
    line: "Pieces about design systems.",
  },
  {
    id: "critique",
    label: "Critique",
    line: "Pieces about critique.",
  },
];

const shelfIndex = new Map(pieces.map((piece, index) => [piece.id, index]));

export function score(piece: Piece): number {
  return piece.topics.reduce((sum, topic) => sum + TAG_WEIGHT[topic], 0);
}

export function matches(piece: Piece, view: DeskView): boolean {
  if (view === "best") return true;
  return piece.topics.includes(VIEW_TOPIC[view]);
}

function better(candidate: number[], best: number[]): boolean {
  for (let i = 0; i < candidate.length; i += 1) {
    if (candidate[i] !== best[i]) return candidate[i] > best[i];
  }
  return false;
}

function orderPieces(list: Piece[], view: DeskView): Piece[] {
  if (view === "best") {
    const specific = list.filter((piece) => !piece.general);
    const general = list
      .filter((piece) => piece.general)
      .sort((a, b) => (shelfIndex.get(a.id) ?? 0) - (shelfIndex.get(b.id) ?? 0));
    return [...greedy(specific, null), ...general];
  }
  return greedy(list, VIEW_TOPIC[view]);
}

function greedy(list: Piece[], topic: Topic | null): Piece[] {
  const remaining = [...list];
  const result: Piece[] = [];
  while (remaining.length > 0) {
    const windowStart = Math.floor(result.length / CAP) * CAP;
    const inWindow = result.slice(windowStart);
    const usedPubs = new Set(inWindow.map((piece) => piece.publicationId));
    const usedTopics = new Set(
      inWindow.flatMap((piece) => piece.topics.filter((item) => DECISION_TOPICS.has(item))),
    );
    let bestAt = 0;
    let bestKey: number[] | null = null;
    for (let i = 0; i < remaining.length; i += 1) {
      const piece = remaining[i];
      const decisionTopics = piece.topics.filter((item) => DECISION_TOPICS.has(item));
      const key = [
        piece.general ? 0 : 1,
        topic !== null && piece.topics[0] === topic ? 1 : 0,
        usedPubs.has(piece.publicationId) ? 0 : 1,
        topic === null && decisionTopics.some((item) => !usedTopics.has(item)) ? 1 : 0,
        score(piece),
        -(shelfIndex.get(piece.id) ?? 0),
      ];
      if (bestKey === null || better(key, bestKey)) {
        bestKey = key;
        bestAt = i;
      }
    }
    const next = remaining.splice(bestAt, 1)[0];
    if (next) result.push(next);
  }
  return result;
}

export function pageCount(count: number): number {
  if (count <= 0) return 1;
  return Math.ceil(count / CAP);
}

export function pageOf(list: Piece[], page: number): Piece[] {
  const pages = pageCount(list.length);
  const safe = ((page % pages) + pages) % pages;
  const start = safe * CAP;
  return list.slice(start, start + CAP);
}

export function shelfNote(total: number, available: number, shown: number): string | null {
  if (total === 0) {
    return "Nothing on the shelf matches this. No piece was invented to fill the gap.";
  }
  if (available === 0) {
    return "You skipped every piece that matches this. They stay hidden in this browser.";
  }
  if (total < CAP) {
    const noun = total === 1 ? "One piece matches" : "Two pieces match";
    return `${noun}. The shelf does not have a third.`;
  }
  if (shown < CAP && available < CAP) {
    return "Fewer than three are left. Skipped pieces stay hidden in this browser.";
  }
  if (shown < CAP) {
    return "That is the last of this set. Next three starts again.";
  }
  return null;
}

export function selectDesk(view: DeskView, skippedIds: readonly string[], page: number) {
  const skipped = new Set(skippedIds);
  const matching = pieces.filter((piece) => matches(piece, view));
  const ordered = orderPieces(matching, view).filter((piece) => !skipped.has(piece.id));
  const available = ordered;
  const shown = pageOf(ordered, page);
  return {
    shown,
    total: matching.length,
    available: available.length,
    note: shelfNote(matching.length, available.length, shown.length),
    pages: pageCount(available.length),
  };
}

export function kolkataLabel(now: Date): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  return `${formatted} · Asia/Kolkata`;
}
