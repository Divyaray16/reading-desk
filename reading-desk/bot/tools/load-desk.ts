import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { activePublications, allowedHosts } from "../lib/active-publications.js";
import { dedupeSkips, deskKeys, readDecision, readLastSent, readPublications } from "../lib/desk-memory.js";
import { shelf } from "../lib/shelf.js";

export default defineTool({
  description:
    "Read the publication map, the confirmed articles, the stored decision, skips, and the last morning send. This is the only source of titles, authors, and URLs. Call it before any reading list, including the 8:00 IST morning note.",
  effect: "read",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const keys = deskKeys(ctx.session);
    const decision = readDecision(await ctx.host.kv.get(keys.decision));
    const skips = dedupeSkips(await ctx.host.kv.get(keys.skips));
    const publicationRecord = readPublications(await ctx.host.kv.get(keys.publications));
    const open = activePublications(publicationRecord);
    const openIds = new Set(open.map((publication) => publication.id));
    return {
      cap: 3,
      minutesDefault: 20,
      morning: "08:00 Asia/Kolkata",
      publications: open,
      allowedHosts: allowedHosts(open),
      shelf: shelf.filter((piece) => openIds.has(piece.publicationId)).map((piece) => ({ ...piece })),
      decision,
      skips,
      lastSent: readLastSent(await ctx.host.kv.get(keys.lastSent)),
      note: "Articles are confirmed pages from the publication map. Do not invent a URL. Publications with no article in shelf are still on the map.",
    };
  },
});
