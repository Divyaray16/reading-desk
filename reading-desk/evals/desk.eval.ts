import { defineEval, satisfies } from "@cursor/bdk/evals";

function lineCount(value: unknown): boolean {
  const text = typeof value === "string" ? value : "";
  const count = text.split("Line for the file").length - 1;
  return count >= 1 && count <= 3;
}

export default defineEval({
  tags: ["smoke"],
  cases: [
    {
      id: "decision",
      description: "She names a decision and asks for a desk.",
      async test(t) {
        await t.send(
          "The decision: the empty state of a reading list should tell someone what is going on and how to add the first item. Send the desk.",
        );
        t.succeeded();
        t.toolOrder(["record-decision", "load-desk"]);
        t.notCalledTool("record-skip");
        t.loadedSkill("desk");
        t.check(
          t.reply,
          satisfies(lineCount, "reply has 1–3 occurrences of Line for the file"),
        );
      },
    },
    {
      id: "skip",
      description: "She skips one catalog id and says not to send a desk.",
      async test(t) {
        await t.send(
          "Skip catalog id ten-heuristics. Reason: too general for my work. Remember that and don't send a desk.",
        );
        t.succeeded();
        t.calledTool("record-skip", { input: { pieceId: "ten-heuristics" } });
        t.notCalledTool("load-desk");
        t.notCalledTool("record-decision");
      },
    },
    {
      id: "morning",
      description: "A morning run with no stored decision still loads the desk and stays within 1–3 lines.",
      async test(t) {
        await t.send(
          "It is the 8:00 Asia/Kolkata morning run. Write today's reading desk. No project sentence is stored. Do not invent one.",
        );
        t.succeeded();
        t.calledTool("load-desk");
        t.notCalledTool("record-decision");
        t.notCalledTool("record-skip");
        t.loadedSkill("desk");
        t.check(
          t.reply,
          satisfies(lineCount, "reply has 1–3 occurrences of Line for the file"),
        );
      },
    },
  ],
});
