import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { activePublications, allowedHosts, matchPublications } from "../lib/active-publications.js";
import { deskKeys, readPublications, type PublicationRecord } from "../lib/desk-memory.js";
import { hostFromUrl, publications, slugify } from "../lib/publications.js";

function snapshot(record: PublicationRecord) {
  const list = activePublications(record);
  return {
    publications: list,
    dropped: record.dropped,
    allowedHosts: allowedHosts(list),
  };
}

export default defineTool({
  description:
    "Add or drop a publication by name or id. Use add when she says to include a blog, and pass its real homepage. Use drop when she says to stop sending one, such as Smashing. Do not invent a homepage.",
  effect: "write",
  inputSchema: z.object({
    action: z.enum(["add", "drop"]),
    name: z.string().min(1),
    url: z.string().optional(),
  }),
  async execute({ action, name, url }, ctx) {
    const keys = deskKeys(ctx.session);
    const current = readPublications(await ctx.host.kv.get(keys.publications));
    const matches = matchPublications(name, current);

    if (action === "drop") {
      if (matches.length !== 1) {
        return {
          ok: false,
          action,
          message:
            matches.length === 0
              ? `No publication matches "${name}".`
              : `More than one publication matches "${name}".`,
          matches: matches.map((publication) => publication.name),
        };
      }
      const id = matches[0].id;
      const dropped = current.dropped.includes(id) ? current.dropped : [...current.dropped, id];
      const record: PublicationRecord = {
        added: current.added.filter((publication) => publication.id !== id),
        dropped,
      };
      await ctx.host.kv.put(keys.publications, record);
      return { ok: true, action, id, name: matches[0].name, ...snapshot(record) };
    }

    if (matches.length === 1) {
      const id = matches[0].id;
      const record: PublicationRecord = {
        added: current.added,
        dropped: current.dropped.filter((droppedId) => droppedId !== id),
      };
      await ctx.host.kv.put(keys.publications, record);
      return { ok: true, action, id, name: matches[0].name, restored: true, ...snapshot(record) };
    }
    if (matches.length > 1) {
      return {
        ok: false,
        action,
        message: `More than one publication matches "${name}".`,
        matches: matches.map((publication) => publication.name),
      };
    }
    if (!url) {
      return {
        ok: false,
        action,
        message: "Adding a publication needs its real homepage URL. Do not invent one.",
      };
    }
    let homepage: URL;
    try {
      homepage = new URL(url);
    } catch {
      return { ok: false, action, message: "Homepage must be an http or https URL." };
    }
    if (homepage.protocol !== "http:" && homepage.protocol !== "https:") {
      return { ok: false, action, message: "Homepage must be an http or https URL." };
    }
    let id = slugify(name);
    if (!id) return { ok: false, action, message: "Publication name needs a letter or number." };
    const taken = new Set([
      ...publications.map((publication) => publication.id),
      ...current.added.map((publication) => publication.id),
    ]);
    if (taken.has(id)) id = `${id}-added`.slice(0, 48);
    const host = hostFromUrl(homepage.href);
    const record: PublicationRecord = {
      added: [...current.added, { id, name: name.trim(), url: homepage.href, host }],
      dropped: current.dropped.filter((droppedId) => droppedId !== id),
    };
    await ctx.host.kv.put(keys.publications, record);
    return { ok: true, action, id, name: name.trim(), ...snapshot(record) };
  },
});
