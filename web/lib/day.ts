/** Calendar day in India. Daily caches use this, not UTC. */
export function kolkataDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parsePublished(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatPublished(raw: string): string | null {
  const parsed = parsePublished(raw);
  if (!parsed) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/**
 * Newest publishedAt first. Comparison uses the timestamp, not the display string.
 * Missing or unparseable dates stay after every dated item and keep their previous order.
 */
export function byNewestPublished<T>(items: readonly T[], publishedAt: (item: T) => string): T[] {
  const decorated = items.map((item, index) => ({
    item,
    index,
    time: parsePublished(publishedAt(item))?.getTime() ?? null,
  }));
  decorated.sort((left, right) => {
    if (left.time !== null && right.time !== null && left.time !== right.time) return right.time - left.time;
    if (left.time !== null && right.time === null) return -1;
    if (left.time === null && right.time !== null) return 1;
    return left.index - right.index;
  });
  return decorated.map((row) => row.item);
}
