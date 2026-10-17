import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { activePublications, allowedHosts } from "../lib/active-publications.js";
import {
  dedupeSkips,
  deskKeys,
  readDecision,
  readLastSent,
  readPublications,
} from "../lib/desk-memory.js";
import { urlAllowed } from "../lib/publications.js";
import { shelf as catalog } from "../lib/shelf.js";

export default defineTool({
  description:
    "Read publications, allowed hosts, the filtered shelf, the stored decision, skips, and last sent. Pieces whose publication was dropped are omitted. Call it before any reading list, including the 8:00 IST morning note. Every URL you recommend must be one returned here.",
  effect: "read",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const keys = deskKeys(ctx.session);
    const decision = readDecision(await ctx.host.kv.get(keys.decision));
    const skips = dedupeSkips(await ctx.host.kv.get(keys.skips));
    const publicationRecord = readPublications(await ctx.host.kv.get(keys.publications));
    const publications = activePublications(publicationRecord);
    const hosts = allowedHosts(publications);
    const openIds = new Set(publications.map((publication) => publication.id));
    const pieces = catalog
      .filter((piece) => openIds.has(piece.publicationId) && urlAllowed(piece.url, hosts))
      .map((piece) => ({ ...piece, topics: [...piece.topics] }));
    return {
      cap: 3,
      minutesDefault: 20,
      morning: "08:00 Asia/Kolkata",
      publications,
      allowedHosts: hosts,
      shelf: pieces,
      decision,
      skips,
      lastSent: readLastSent(await ctx.host.kv.get(keys.lastSent)),
      note: "The shelf is confirmed pages from publications that have not been dropped. Do not invent a URL. Publications with no article in shelf are still on the map.",
    };
  },
});
