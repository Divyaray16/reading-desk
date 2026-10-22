import assert from "node:assert/strict";
import test from "node:test";
import { placeFromTimeZone, visitorLocalLabel } from "./local-time.ts";

const instant = new Date("2026-10-16T20:00:00Z");

test("a timezone id supplies the local clock and its city", () => {
  assert.equal(
    visitorLocalLabel(instant, "America/New_York"),
    "Friday, 16 October 2026 · 16:00 · New York",
  );
  assert.equal(
    visitorLocalLabel(instant, "America/Argentina/Buenos_Aires"),
    "Friday, 16 October 2026 · 17:00 · Buenos Aires",
  );
  const kolkata = visitorLocalLabel(instant, "Asia/Kolkata");
  assert.equal(kolkata, "Saturday, 17 October 2026 · 01:30 · Kolkata");
  assert.equal(kolkata.includes("Calcutta"), false);
  const legacy = visitorLocalLabel(instant, "Asia/Calcutta");
  assert.equal(legacy, "Saturday, 17 October 2026 · 01:30 · Kolkata");
  assert.equal(legacy.includes("Calcutta"), false);
});

test("place names keep hyphens and only turn underscores into spaces", () => {
  assert.equal(placeFromTimeZone("America/New_York"), "New York");
  assert.equal(placeFromTimeZone("America/Port-au-Prince"), "Port-au-Prince");
  assert.equal(placeFromTimeZone("  Europe/London  "), "London");
  assert.equal(placeFromTimeZone("Asia/Kolkata"), "Kolkata");
  assert.equal(placeFromTimeZone("Asia/Calcutta"), "Kolkata");
});

test("deprecated English names use the current city", () => {
  const legacy: Readonly<Record<string, string>> = {
    "Asia/Calcutta": "Kolkata",
    "Asia/Bombay": "Mumbai",
    "Asia/Madras": "Chennai",
    "Asia/Bangalore": "Bengaluru",
    "Asia/Trivandrum": "Thiruvananthapuram",
    "Asia/Cochin": "Kochi",
    "Asia/Poona": "Pune",
    "Asia/Calicut": "Kozhikode",
    "Asia/Saigon": "Ho Chi Minh City",
    "Asia/Peking": "Beijing",
    "Asia/Canton": "Guangzhou",
    "Asia/Rangoon": "Yangon",
    "Europe/Kiev": "Kyiv",
    "Asia/Ulan_Bator": "Ulaanbaatar",
    "America/Godthab": "Nuuk",
    "Asia/Katmandu": "Kathmandu",
  };
  for (const [zone, city] of Object.entries(legacy)) {
    assert.equal(placeFromTimeZone(zone), city);
    const older = zone.split("/").at(-1)?.replaceAll("_", " ") ?? "";
    assert.equal(city.includes(older), false);
  }
  assert.equal(placeFromTimeZone("asia/calcutta"), "Kolkata");

  const saigon = visitorLocalLabel(instant, "Asia/Saigon");
  assert.equal(saigon, "Saturday, 17 October 2026 · 03:00 · Ho Chi Minh City");
  assert.equal(saigon.includes("Saigon"), false);
  const kiev = visitorLocalLabel(instant, "Europe/Kiev");
  assert.equal(kiev, "Friday, 16 October 2026 · 23:00 · Kyiv");
  assert.equal(kiev.includes("Kiev"), false);
  const rangoon = visitorLocalLabel(instant, "Asia/Rangoon");
  assert.equal(rangoon, "Saturday, 17 October 2026 · 02:30 · Yangon");
  assert.equal(rangoon.includes("Rangoon"), false);
  assert.equal(
    visitorLocalLabel(instant, "America/Godthab"),
    "Friday, 16 October 2026 · 19:00 · Nuuk",
  );
  assert.equal(
    visitorLocalLabel(instant, "Asia/Katmandu"),
    "Saturday, 17 October 2026 · 01:45 · Kathmandu",
  );
  assert.equal(
    visitorLocalLabel(instant, "Asia/Ulan_Bator"),
    "Saturday, 17 October 2026 · 04:00 · Ulaanbaatar",
  );
});

test("a current timezone id keeps its own city", () => {
  assert.equal(placeFromTimeZone("Asia/Ho_Chi_Minh"), "Ho Chi Minh");
  assert.equal(placeFromTimeZone("Europe/Kyiv"), "Kyiv");
  assert.equal(placeFromTimeZone("Asia/Yangon"), "Yangon");
  assert.equal(placeFromTimeZone("America/Nuuk"), "Nuuk");
  assert.equal(placeFromTimeZone("Asia/Kathmandu"), "Kathmandu");
  assert.equal(placeFromTimeZone("Asia/Ulaanbaatar"), "Ulaanbaatar");
  assert.equal(placeFromTimeZone("America/Indiana/Indianapolis"), "Indianapolis");
  assert.equal(
    visitorLocalLabel(instant, "Asia/Ho_Chi_Minh"),
    "Saturday, 17 October 2026 · 03:00 · Ho Chi Minh",
  );
  assert.equal(
    visitorLocalLabel(instant, "Europe/Kyiv"),
    "Friday, 16 October 2026 · 23:00 · Kyiv",
  );
  assert.equal(
    visitorLocalLabel(instant, "America/Indiana/Indianapolis"),
    "Friday, 16 October 2026 · 16:00 · Indianapolis",
  );
});

test("a timezone with no city still shows the time", () => {
  assert.equal(visitorLocalLabel(instant, "Etc/UTC"), "Friday, 16 October 2026 · 20:00");
  assert.equal(placeFromTimeZone("UTC"), null);
  assert.equal(placeFromTimeZone("Etc/GMT+5"), null);
  assert.equal(placeFromTimeZone(""), null);
  assert.equal(placeFromTimeZone(undefined), null);
});

test("a missing or unreadable timezone does not invent a city", () => {
  const clock = /^[A-Z][a-z]+, \d{1,2} [A-Z][a-z]+ \d{4} · \d{2}:\d{2}$/;
  assert.match(visitorLocalLabel(instant, undefined), clock);
  assert.match(visitorLocalLabel(instant, "   "), clock);
  assert.match(visitorLocalLabel(instant, "Not/A_Real_Zone"), clock);
  assert.equal(visitorLocalLabel(instant, "Not/A_Real_Zone").includes("Real Zone"), false);
});
