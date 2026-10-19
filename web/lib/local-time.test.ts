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
  assert.equal(
    visitorLocalLabel(instant, "Asia/Kolkata"),
    "Saturday, 17 October 2026 · 01:30 · Kolkata",
  );
});

test("place names keep hyphens and only turn underscores into spaces", () => {
  assert.equal(placeFromTimeZone("America/New_York"), "New York");
  assert.equal(placeFromTimeZone("America/Port-au-Prince"), "Port-au-Prince");
  assert.equal(placeFromTimeZone("  Europe/London  "), "London");
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
