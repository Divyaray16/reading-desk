import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { dedupeSkips, deskKeys, readDecision, readLastSent } from "../lib/desk-memory.js";
import { shelf } from "../lib/shelf.js";

export default defineTool({
  description:
    "Read the fixed shelf, the stored decision, skips, and the last morning send. This is the only source of titles, authors, and URLs.",
  effect: "read",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const keys = deskKeys(ctx.session);
    const decision = readDecision(await ctx.host.kv.get(keys.decision));
    const skips = dedupeSkips(await ctx.host.kv.get(keys.skips));
    const lastSent = readLastSent(await ctx.host.kv.get(keys.lastSent));
    return {
      cap: 3,
      minutesDefault: 20,
      shelf: shelf.map((piece) => ({ ...piece })),
      decision,
      skips,
      lastSent,
    };
  },
});
