# Reading desk

A small [BDK](https://cursor.com/docs/bdk) agent for Divya. She names one design decision in a sentence. The agent returns at most three published pieces that would change that decision, each with a reason, a line she can put in the file, what to leave out, and the real URL.

The project lives in [`reading-desk/`](reading-desk/).

## Contract

- Channels are the playground and HTTP. Slack, GitHub, MCP, and a Monday schedule are not wired.
- The shelf is fixed. The agent does not invent a title, author, or URL.
- When a message names or changes a decision, the agent records it before it loads the shelf.
- A skip is recorded only when she skips, dismisses, or already knows a piece. A request that only remembers a decision or a skip does not load the shelf.
- If she has not named a decision and none is stored, the agent asks for one sentence.
- The reply is the decision sentence, then one to three pieces (`Why this work`, `Line for the file`, `Leave out`, URL), then one held-back piece when a famous general essay was the tempting wrong choice.
- The decision and skips are stored in `ctx.host.kv`. Live sessions share `desk:live:decision` and `desk:live:skips`. Eval sessions prefix those keys with the session id so parallel cases do not clobber each other.

## Edit the shelf

Change pieces in [`reading-desk/bot/lib/shelf.ts`](reading-desk/bot/lib/shelf.ts). Each entry has `id`, `title`, `by`, `source`, `year`, `minutes`, `url`, `about`, and `gives`. There is no tool that adds a piece.

Ranking stays in [`reading-desk/bot/skills/desk.md`](reading-desk/bot/skills/desk.md). The model drops skipped ids, prefers pieces at or under her minutes, and keeps a piece only when its `about` or `gives` would change this decision.

## Check and serve

From this repository, with Node (not Bun):

```bash
npx --yes "@cursor/bdk@0.2.27" validate --dir reading-desk
npx --yes "@cursor/bdk@0.2.27" info --dir reading-desk --json
npx --yes "@cursor/bdk@0.2.27" call load-desk --dir reading-desk --input '{}'
npx tsc --noEmit -p reading-desk
npx --yes "@cursor/bdk@0.2.27" serve --dir reading-desk --mode single --dev --port 43123 --host 127.0.0.1
```

Playground: [http://127.0.0.1:43123/playground](http://127.0.0.1:43123/playground)

`validate`, `info`, `call`, and `tsc` do not need a Cursor login. A model turn (`run`, `eval`, or a message in the playground) needs a Cursor credential: `CURSOR_API_KEY`, or `CURSOR_API_KEY_FILE`, or `CURSOR_SERVICE_ACCOUNT_KEY`.

A Monday schedule is intentionally not wired yet.
