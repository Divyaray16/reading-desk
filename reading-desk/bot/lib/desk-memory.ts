import type { SessionInfo } from "@cursor/bdk";
import { shelf } from "./shelf.js";

export const skipCap = 30;

export type DecisionRecord = {
  sentence: string;
  draft?: string;
  minutes?: number;
};

export type SkipRecord = {
  pieceId: string;
  reason: string;
};

export type LastSentRecord = {
  pieceIds: string[];
  date: string;
  decisionSentence: string | null;
};

export type DeskKeys = {
  decision: string;
  skips: string;
  lastSent: string;
};

/** Live sessions share one set of keys. Eval sessions include the session id. */
export function deskKeys(session: Pick<SessionInfo, "id" | "purpose">): DeskKeys {
  if (session.purpose === "eval") {
    return {
      decision: `desk:eval:${session.id}:decision`,
      skips: `desk:eval:${session.id}:skips`,
      lastSent: `desk:eval:${session.id}:last-sent`,
    };
  }
  return {
    decision: "desk:live:decision",
    skips: "desk:live:skips",
    lastSent: "desk:live:last-sent",
  };
}

export function readDecision(value: unknown): DecisionRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("sentence" in value) || typeof value.sentence !== "string" || value.sentence.length === 0) {
    return null;
  }
  const record: DecisionRecord = { sentence: value.sentence };
  if ("draft" in value && typeof value.draft === "string") record.draft = value.draft;
  if (
    "minutes" in value &&
    typeof value.minutes === "number" &&
    Number.isInteger(value.minutes) &&
    value.minutes > 0 &&
    value.minutes <= 240
  ) {
    record.minutes = value.minutes;
  }
  return record;
}

/** One entry per pieceId. Later entries replace the reason. Keeps the newest 30. */
export function dedupeSkips(value: unknown): SkipRecord[] {
  if (!Array.isArray(value)) return [];
  const order: string[] = [];
  const byId = new Map<string, SkipRecord>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    if (!("pieceId" in entry) || typeof entry.pieceId !== "string" || entry.pieceId.length === 0) {
      continue;
    }
    if (!("reason" in entry) || typeof entry.reason !== "string" || entry.reason.length === 0) {
      continue;
    }
    if (!byId.has(entry.pieceId)) order.push(entry.pieceId);
    byId.set(entry.pieceId, { pieceId: entry.pieceId, reason: entry.reason });
  }
  const deduped: SkipRecord[] = [];
  for (const id of order) {
    const skip = byId.get(id);
    if (skip) deduped.push(skip);
  }
  return deduped.length > skipCap ? deduped.slice(deduped.length - skipCap) : deduped;
}

/** Drop unknown and repeated ids. Keep first-seen order, at most three. */
export function dedupePieceIds(ids: readonly unknown[]): string[] {
  const known = new Set(shelf.map((piece) => piece.id));
  const pieceIds: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || !known.has(id) || pieceIds.includes(id)) continue;
    pieceIds.push(id);
    if (pieceIds.length === 3) break;
  }
  return pieceIds;
}

export function readLastSent(value: unknown): LastSentRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("pieceIds" in value) || !Array.isArray(value.pieceIds)) return null;
  if (!("date" in value) || typeof value.date !== "string" || value.date.length === 0) return null;
  const pieceIds = dedupePieceIds(value.pieceIds);
  if (pieceIds.length === 0) return null;
  const decisionSentence =
    "decisionSentence" in value &&
    typeof value.decisionSentence === "string" &&
    value.decisionSentence.length > 0
      ? value.decisionSentence
      : null;
  return { pieceIds, date: value.date, decisionSentence };
}

export function sameLastSent(a: LastSentRecord, b: LastSentRecord): boolean {
  return (
    a.date === b.date &&
    a.decisionSentence === b.decisionSentence &&
    a.pieceIds.length === b.pieceIds.length &&
    a.pieceIds.every((id, index) => id === b.pieceIds[index])
  );
}

/** Calendar date in America/Los_Angeles, YYYY-MM-DD. */
export function losAngelesDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Piece ids actually sent in a desk reply, in the order their URLs appear.
 * A held-back line is not part of the send, so its URL is ignored.
 */
export function pieceIdsInDesk(text: string): string[] {
  const heldAt = text.search(/held back/i);
  const body = heldAt === -1 ? text : text.slice(0, heldAt);
  const found = shelf
    .map((piece) => ({ id: piece.id, at: body.indexOf(piece.url) }))
    .filter((piece) => piece.at >= 0)
    .sort((a, b) => a.at - b.at);
  return dedupePieceIds(found.map((piece) => piece.id));
}
