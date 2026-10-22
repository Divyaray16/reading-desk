const WHEN: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

/**
 * Deprecated English names still carried by IANA links and by Intl.
 * The city in the timezone id is kept when it is already current.
 * Lookup is lowercase so a legacy spelling in any case is renamed.
 */
const CURRENT_CITY_NAME: Readonly<Record<string, string>> = {
  calcutta: "Kolkata",
  bombay: "Mumbai",
  madras: "Chennai",
  bangalore: "Bengaluru",
  trivandrum: "Thiruvananthapuram",
  cochin: "Kochi",
  poona: "Pune",
  calicut: "Kozhikode",
  saigon: "Ho Chi Minh City",
  peking: "Beijing",
  canton: "Guangzhou",
  rangoon: "Yangon",
  kiev: "Kyiv",
  "ulan bator": "Ulaanbaatar",
  godthab: "Nuuk",
  katmandu: "Kathmandu",
};

function currentCityName(city: string): string {
  return CURRENT_CITY_NAME[city.toLowerCase()] ?? city;
}

/**
 * Readable place from an IANA timezone id.
 * America/New_York → New York. Asia/Kolkata → Kolkata.
 * A legacy link uses the current city: Asia/Calcutta → Kolkata.
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
  return currentCityName(city);
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
