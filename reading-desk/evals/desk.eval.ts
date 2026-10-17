import { defineEval, includes, satisfies } from "@cursor/bdk/evals";

const shelfHost =
  /nngroup\.com|basecamp\.com\/shapeup|bradfrost\.com|medium\.com\/the-year-of-the-looking-glass|atomicdesign\.bradfrost\.com/;

function lineCount(value: unknown): boolean {
  const text = typeof value === "string" ? value : "";
  const count = text.split("Line for the file").length - 1;
  return count >= 1 && count <= 3;
}

export default defineEval({
  tags: ["smoke"],
  cases: [
    {
      id: "empty-list",
      description: "Empty reading-list decision, 15 minutes, send the desk.",
      async test(t) {
        await t.send(
          "The decision: the empty state of a reading list should tell someone what is going on. Draft: an illustration that says Nothing here yet. I have 15 minutes. Send the desk.",
        );
        t.succeeded();
        t.toolOrder(["record-decision", "load-desk"]);
        t.notCalledTool("record-skip");
        t.calledTool("record-decision");
        t.loadedSkill("desk");
        t.check(
          t.reply,
          satisfies(lineCount, "reply has 1–3 occurrences of Line for the file"),
        );
        t.check(t.reply, includes(shelfHost));
        t.check(
          t.reply,
          includes("https://www.nngroup.com/articles/empty-state-interface-design/"),
        ).soft();
      },
    },
    {
      id: "skip",
      description: "Skip ten-heuristics and do not send a desk.",
      async test(t) {
        await t.send(
          "Skip the shelf piece ten-heuristics. Reason: too general for my work. Remember that and don't send a desk.",
        );
        t.succeeded();
        t.calledTool("record-skip", { input: { pieceId: "ten-heuristics" } });
        t.notCalledTool("load-desk");
        t.notCalledTool("record-decision");
      },
    },
    {
      id: "settings",
      description: "Settings first-view decision, 8 minutes, send the desk.",
      async test(t) {
        await t.send(
          "Decision: which controls stay on the first view of a settings screen that grew a second column. I have 8 minutes. Send the desk.",
        );
        t.succeeded();
        t.calledTool("record-decision", { input: { minutes: 8 } });
        t.calledTool("load-desk");
        t.notCalledTool("record-skip");
        t.loadedSkill("desk");
        t.check(
          t.reply,
          satisfies(lineCount, "reply has 1–3 occurrences of Line for the file"),
        );
        t.check(
          t.reply,
          includes("https://www.nngroup.com/articles/progressive-disclosure/"),
        ).soft();
      },
    },
  ],
});
