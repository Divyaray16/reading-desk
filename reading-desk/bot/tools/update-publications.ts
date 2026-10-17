import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { activePublications } from "../lib/active-publications.js";
import { deskKeys, readPublications, type AddedPublication } from "../lib/desk-memory.js";
import { hostFromUrl, publications, slugify } from "../lib/publications.js";

function findId(name: string, added: readonly AddedPublication[]): string | undefined {
  const needle = name.trim().toLowerCase();
  const builtin = publications.find(
    (publication) => publication.id === needle || publication.name.toLowerCase() === needle,
  );
  if (builtin) return builtin.id;
  return added.find(
    (publication) => publication.id === needle || publication.name.toLowerCase() === needle,
  )?.id;
}

export default defineTool({
  description:
    "Add or drop a publication. Use add when she names a blog to include, and pass its homepage URL. Use drop when she says to stop a publication, matching its id or name.",
  effect: "write",
  inputSchema: z.object({
    action: z.enum(["add", "drop"]),
    name: z.string().min(1),
    url: z.string().url().optional(),
  }),
  async execute({ action, name, url }, ctx) {
    const keys = deskKeys(ctx.session);
    const current = readPublications(await ctx.host.kv.get(keys.publications));
    if (action === "drop") {
      const id = findId(name, current.added);
      if (!id) throw new Error(`Unknown publication: ${name}`);
      const dropped = current.dropped.includes(id) ? current.dropped : [...current.dropped, id];
      const record = {
        added: current.added.filter((publication) => publication.id !== id),
        dropped,
      };
      await ctx.host.kv.put(keys.publications, record);
      return { action, id, publications: activePublications(record) };
    }
    if (!url) throw new Error("Adding a publication needs its homepage URL.");
    const id = slugify(name);
    if (!id) throw new Error("Publication name needs a letter or number.");
    const added = current.added.filter((publication) => publication.id !== id);
    added.push({ id, name: name.trim(), url, host: hostFromUrl(url) });
    const record = {
      added,
      dropped: current.dropped.filter((droppedId) => droppedId !== id),
    };
    await ctx.host.kv.put(keys.publications, record);
    return { action, id, publications: activePublications(record) };
  },
});
