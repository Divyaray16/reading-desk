# Reading desk

Every morning at 8:00 America/Los_Angeles, Divya gets a short note: the things she should read, at most three. Two or one is allowed when fewer pieces actually fit. The note does not wait for her to open a chat.

The project lives in [`reading-desk/`](reading-desk/).

## What the morning note contains

Each piece has why it is there, a line she can put in the file, what to leave out, and the real URL from the shelf. The desk does not invent a title, author, or URL.

If a decision sentence is on file, the note is ranked for that decision and opens with it. She can tell the chat a new decision any time. That replaces the sentence the next morning uses. A changed decision may bring a piece back. The same decision does not get the same three pieces again the next morning, unless the shelf cannot justify different ones.

If no decision is on file, she still gets pieces a product designer can use, with variety across the shelf. The note says in one sentence that no specific decision was on file. It does not invent a project.

When Ten Usability Heuristics or Atomic Design was the tempting general essay and was left off, the note adds one held-back line.

The desk stores the piece ids and the America/Los_Angeles date it sent. The next morning reads that memory before it chooses.

## Where she reads it

The note is the reply in the scheduled session named `morning`. On this machine that session shows up in the playground at [http://127.0.0.1:43123/playground](http://127.0.0.1:43123/playground). Open the session titled "Schedule morning".

It does not push to her phone, and Slack is not connected. Nothing is texted or emailed.

BDK runs the schedule as UTC cron `0 15 * * *` (15:00 UTC). That is 8:00 in America/Los_Angeles while Pacific Daylight Time is in effect. During Pacific Standard Time the same cron is 7:00 America/Los_Angeles, because schedules have no timezone field. To keep 8:00 through the winter, change that cron to `0 16 * * *` on the first Sunday in November, and change it back on the second Sunday in March. The file is [`reading-desk/bot/schedules/morning.md`](reading-desk/bot/schedules/morning.md).

## Dev schedules do not auto-fire

`serve --dev` does not fire schedules or reminders on the clock. Dispatch by hand through the same path production uses. The docs show:

```bash
curl -X POST http://127.0.0.1:3000/<slug>/v1/dev/schedules/heartbeat
# {"scheduleId":"heartbeat","sessionIds":["ses_…"]}
```

This desk is served with `--mode single` on port 43123, so there is no slug prefix and the schedule id is `morning`:

```bash
curl -X POST http://127.0.0.1:43123/v1/dev/schedules/morning
# {"scheduleId":"morning","sessionIds":["ses_…"]}
```

The playground can dispatch schedules in dev mode too.

## Edit the shelf

Change pieces in [`reading-desk/bot/lib/shelf.ts`](reading-desk/bot/lib/shelf.ts). Each entry has `id`, `title`, `by`, `source`, `year`, `minutes`, `url`, `about`, and `gives`. Year is null when the piece has no year. There is no tool that adds a piece.

Ranking stays in [`reading-desk/bot/skills/desk.md`](reading-desk/bot/skills/desk.md).

## Check and serve

From this repository, with Node (not Bun):

```bash
npx --yes "@cursor/bdk@0.2.27" validate --dir reading-desk
npx --yes "@cursor/bdk@0.2.27" info --dir reading-desk --json
npx --yes "@cursor/bdk@0.2.27" call load-desk --dir reading-desk --input '{}'
npx tsc --noEmit -p reading-desk
npx --yes "@cursor/bdk@0.2.27" serve --dir reading-desk --mode single --dev --port 43123 --host 127.0.0.1
```

`validate`, `info`, `call`, and bringing the server up do not need a Cursor login. A real model turn (`run`, `eval`, or a message in the playground) needs a Cursor credential: `CURSOR_API_KEY`, or `CURSOR_API_KEY_FILE`, or `CURSOR_SERVICE_ACCOUNT_KEY`.
