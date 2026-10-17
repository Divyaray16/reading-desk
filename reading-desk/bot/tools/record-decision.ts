import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { deskKeys } from "../lib/desk-memory.js";

export default defineTool({
  description:
    "Remember the decision sentence Divya named. Pass draft when she includes one, and minutes when she names a time budget (a positive whole number up to 240). Call this before load-desk when the message names or changes a decision.",
  effect: "write",
  inputSchema: z.object({
    sentence: z.string().min(1),
    draft: z.string().optional(),
    minutes: z.number().int().positive().max(240).optional(),
  }),
  async execute({ sentence, draft, minutes }, ctx) {
    const record = {
      sentence,
      ...(draft !== undefined ? { draft } : {}),
      ...(minutes !== undefined ? { minutes } : {}),
    };
    await ctx.host.kv.put(deskKeys(ctx.session).decision, record);
    return record;
  },
});
