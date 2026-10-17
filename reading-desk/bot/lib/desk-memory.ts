import type { SessionInfo } from "@cursor/bdk";

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

export type DeskKeys = {
  decision: string;
  skips: string;
};

/** Live sessions share one pair of keys. Eval sessions are isolated by id. */
export function deskKeys(session: Pick<SessionInfo, "id" | "purpose">): DeskKeys {
  if (session.purpose === "eval") {
    return {
      decision: `desk:eval:${session.id}:decision`,
      skips: `desk:eval:${session.id}:skips`,
    };
  }
  return {
    decision: "desk:live:decision",
    skips: "desk:live:skips",
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
    Number.isInteger(value.minutes)
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
