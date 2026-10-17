import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { dedupeSkips, deskKeys, skipCap } from "../lib/desk-memory.js";
import { pieceById } from "../lib/shelf.js";

export default defineTool({
  description:
    "Remember that Divya skipped, dismissed, or already knows a shelf piece. pieceId must be an id from the shelf.",
  effect: "write",
  inputSchema: z.object({
    pieceId: z.string().min(1),
    reason: z.string().min(1),
  }),
  async execute({ pieceId, reason }, ctx) {
    if (pieceById(pieceId) === undefined) {
      throw new Error(`Unknown piece id: ${pieceId}`);
    }
    const keys = deskKeys(ctx.session);
    const without = dedupeSkips(await ctx.host.kv.get(keys.skips)).filter(
      (skip) => skip.pieceId !== pieceId,
    );
    without.push({ pieceId, reason });
    const skips = without.length > skipCap ? without.slice(without.length - skipCap) : without;
    await ctx.host.kv.put(keys.skips, skips);
    return { pieceId, reason };
  },
});
