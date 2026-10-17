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
import { shelf } from "../lib/shelf.js";

export default defineTool({
  description:
    "Read publications, allowed hosts, the confirmed catalog, the stored decision, skips, and last sent. The catalog is the shelf until a fetch exists. It is not a live search. Every URL you recommend must be one returned here, and its host must be in allowedHosts.",
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
    const catalog = shelf
      .filter((piece) => openIds.has(piece.publicationId) && urlAllowed(piece.url, hosts))
      .map((piece) => ({ ...piece, topics: [...piece.topics] }));
    return {
      cap: 3,
      morning: "08:00 Asia/Kolkata",
      publications,
      dropped: publicationRecord.dropped,
      allowedHosts: hosts,
      hostRule:
        "A URL is allowed only when its host equals an allowedHosts entry, or is a subdomain of one. A leading www does not count. Every recommended URL must also appear in catalog.",
      catalog,
      decision,
      skips,
      lastSent: readLastSent(await ctx.host.kv.get(keys.lastSent)),
      note: "The catalog is the shelf until a fetch exists. It is not today's internet. Do not invent a title, author, or URL. A publication with no catalog piece stays on the map.",
    };
  },
});
