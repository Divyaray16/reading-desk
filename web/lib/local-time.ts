const WHEN: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

/** Legacy English name still carried by the Asia/Calcutta link. */
const CITY_NAMES: Readonly<Record<string, string>> = {
  Calcutta: "Kolkata",
};

/**
 * Readable place from an IANA timezone id.
 * America/New_York → New York. Asia/Kolkata and Asia/Calcutta → Kolkata.
 * Zones with no city (UTC, Etc/GMT) return null.
 */
export function placeFromTimeZone(timeZone: string | null | undefined): string | null {
  if (typeof timeZone !== "string") return null;
  const trimmed = timeZone.trim();
  if (!trimmed.includes("/")) return null;
  const parts = trimmed.split("/");
  if (parts.some((part) => part.length === 0)) return null;
  const area = parts[0];
  if (area === "Etc" || area === "SystemV") return null;
  const city = parts[parts.length - 1]?.replace(/_/g, " ").trim() ?? "";
  if (city.length === 0) return null;
  return CITY_NAMES[city] ?? city;
}

function formatWhen(now: Date, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = { ...WHEN };
  if (timeZone) options.timeZone = timeZone;
  const parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = value("hour").padStart(2, "0");
  const minute = value("minute").padStart(2, "0");
  return `${value("weekday")}, ${value("day")} ${value("month")} ${value("year")} · ${hour}:${minute}`;
}

/**
 * Date and time for the timezone where the page was opened.
 * The place is the city in that timezone id. If the zone cannot be read,
 * the clock is returned with no city.
 */
export function visitorLocalLabel(now: Date, timeZone?: string | null): string {
  const zone = typeof timeZone === "string" ? timeZone.trim() : "";
  if (!zone) return formatWhen(now);
  try {
    const formatted = formatWhen(now, zone);
    const place = placeFromTimeZone(zone);
    return place ? `${formatted} · ${place}` : formatted;
  } catch {
    return formatWhen(now);
  }
}
