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

export type AddedPublication = {
  id: string;
  name: string;
  url: string;
  host: string;
};

export type PublicationRecord = {
  added: AddedPublication[];
  dropped: string[];
};

export type LastSentRecord = {
  pieceIds: string[];
  date: string;
  decisionSentence: string | null;
};

export type DeskKeys = {
  decision: string;
  skips: string;
  publications: string;
  lastSent: string;
};

/** Live keys are shared. Eval keys include the session id so parallel cases do not clobber. */
export function deskKeys(session: Pick<SessionInfo, "id" | "purpose">): DeskKeys {
  if (session.purpose === "eval") {
    const prefix = `eval:${session.id}`;
    return {
      decision: `${prefix}:decision`,
      skips: `${prefix}:skips`,
      publications: `${prefix}:publications`,
      lastSent: `${prefix}:last-sent`,
    };
  }
  return {
    decision: "decision",
    skips: "skips",
    publications: "publications",
    lastSent: "last-sent",
  };
}

export function readDecision(value: unknown): DecisionRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("sentence" in value) || typeof value.sentence !== "string" || value.sentence.length === 0) {
    return null;
  }
  const record: DecisionRecord = { sentence: value.sentence };
  if ("draft" in value && typeof value.draft === "string" && value.draft.length > 0) {
    record.draft = value.draft;
  }
  if (
    "minutes" in value &&
    typeof value.minutes === "number" &&
    Number.isInteger(value.minutes) &&
    value.minutes > 0
  ) {
    record.minutes = value.minutes;
  }
  return record;
}

/** One entry per pieceId. A later reason replaces the earlier one. Keeps the newest 30. */
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

export function readPublications(value: unknown): PublicationRecord {
  const added: AddedPublication[] = [];
  const dropped: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { added, dropped };
  }
  if ("added" in value && Array.isArray(value.added)) {
    const seen = new Set<string>();
    for (const entry of value.added) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      if (!("id" in entry) || typeof entry.id !== "string" || entry.id.length === 0) continue;
      if (!("name" in entry) || typeof entry.name !== "string" || entry.name.length === 0) continue;
      if (!("url" in entry) || typeof entry.url !== "string" || entry.url.length === 0) continue;
      if (!("host" in entry) || typeof entry.host !== "string" || entry.host.length === 0) continue;
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      added.push({ id: entry.id, name: entry.name, url: entry.url, host: entry.host });
    }
  }
  if ("dropped" in value && Array.isArray(value.dropped)) {
    for (const id of value.dropped) {
      if (typeof id === "string" && id.length > 0 && !dropped.includes(id)) dropped.push(id);
    }
  }
  return { added, dropped };
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
  if (!("date" in value) || typeof value.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
    return null;
  }
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

/** Calendar date in Asia/Kolkata, which does not observe daylight saving. YYYY-MM-DD. */
export function todayInIndia(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
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

/** Calendar date in India, YYYY-MM-DD. */
export function indiaDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
