// After a desk is written, remember which piece ids went out and the
// India date. The next morning reads this from load-desk.
import { defineHook } from "@cursor/bdk/hooks";
import {
  deskKeys,
  indiaDate,
  pieceIdsInDesk,
  readDecision,
  readLastSent,
  sameLastSent,
} from "../lib/desk-memory.js";

export default defineHook({
  events: {
    async "turn.completed"(event, ctx) {
      const result = event.data.result;
      if (typeof result !== "string" || !result.includes("Line for the file")) return;
      const pieceIds = pieceIdsInDesk(result);
      if (pieceIds.length === 0) return;

      const keys = deskKeys(ctx.session);
      const decision = readDecision(await ctx.host.kv.get(keys.decision));
      const instant =
        ctx.session.asOf !== undefined && !Number.isNaN(Date.parse(ctx.session.asOf))
          ? new Date(ctx.session.asOf)
          : new Date();
      const next = {
        pieceIds,
        date: indiaDate(instant),
        decisionSentence: decision?.sentence ?? null,
      };
      const current = readLastSent(await ctx.host.kv.get(keys.lastSent));
      if (current !== null && sameLastSent(current, next)) return;
      await ctx.host.kv.put(keys.lastSent, next);
    },
  },
});
