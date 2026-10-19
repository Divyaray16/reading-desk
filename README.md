# Reading desk

Divya's reading desk is one assistant with two habits.

Every morning at 8:00 Asia/Kolkata she gets three UX pieces worth reading. Two or one is fine when fewer pieces actually fit. India does not use daylight saving, so 8:00 IST is 02:30 UTC every day.

The rest of the day she can ask anything else: a critique, an empty state, a handoff, or "find me something on settings." The desk answers that question. It sends a reading list only when she asked for reads, or when the morning run fires.

The project lives in [`reading-desk/`](reading-desk/).

## What the morning note contains

Each piece says why it is there, a line she can paste on the work, what to skip inside the piece, and the real URL. The desk does not invent a title, author, or URL.

If a current project sentence is stored, the three fit that work and the note says which decision they are for. If none is stored, she still gets strong pieces, with variety, and one sentence that no specific project was on file. The desk does not invent a project.

When a famous general essay was close but would not change her decision, the note names that held-back piece.

The desk remembers the piece ids and the Asia/Kolkata date it sent them. The next morning does not repeat those pieces unless her decision changed or nothing else qualifies.

## Where she reads it

The morning note is the reply in the agent's scheduled session, `morning-reads`. On this machine that session shows up in the playground at [http://127.0.0.1:43123/playground](http://127.0.0.1:43123/playground).

It is not a phone text. Slack is not connected. Nothing is emailed.

## A page with no login

The browser page is separate from the agent. Divya opens it with no Cursor login and asks on this same page. It shows up to three articles from one shared library of approved sources, ranked in the browser from retrieved titles and excerpts. A category filters by subject, not by publication. It does not call a model and it does not use a Cursor credential. The three stay fixed for the Asia/Kolkata day unless she refreshes. Skip and Useful are stored in the browser and affect the next selection.

From `web/`:

```bash
npm run dev
```

Then open [http://127.0.0.1:47231](http://127.0.0.1:47231).

## Publications

The desk only recommends posts from this map, plus blogs she adds:

- Stripe blog — https://stripe.com/blog
- UX Collective — https://uxdesign.cc
- UX Planet — https://uxplanet.org
- Julie Zhuo, The Looking Glass — https://medium.com/the-year-of-the-looking-glass
- Nielsen Norman Group — https://www.nngroup.com/articles/
- Smashing Magazine — https://www.smashingmagazine.com
- A List Apart — https://alistapart.com
- Intercom blog — https://www.intercom.com/blog
- Figma blog — https://www.figma.com/blog/
- Linear blog — https://linear.app/blog
- Brad Frost — https://bradfrost.com/blog/
- Shape Up — https://basecamp.com/shapeup

She can say "add Built for Mars" or "stop sending Smashing." Adding a blog needs its real homepage. The confirmed articles are the shelf until a live fetch exists. A publication with no confirmed article stays on the map and does not get an invented post.

The list of articles is [`reading-desk/bot/lib/shelf.ts`](reading-desk/bot/lib/shelf.ts). Ranking is [`reading-desk/bot/skills/desk.md`](reading-desk/bot/skills/desk.md).

## Dev schedules do not auto-fire

`serve --dev` does not fire schedules on the clock. The package docs say to dispatch by hand:

```bash
curl -X POST http://127.0.0.1:3000/<slug>/v1/dev/schedules/heartbeat
# {"scheduleId":"heartbeat","sessionIds":["ses_…"]}
```

This desk is served with `--mode single` on port 43123, so there is no slug in the path. The schedule id is `morning-reads`, and the cron is `30 2 * * *` (02:30 UTC, 08:00 IST):

```bash
curl -X POST http://127.0.0.1:43123/v1/dev/schedules/morning-reads
# {"scheduleId":"morning-reads","sessionIds":["ses_…"]}
```

The playground can dispatch that schedule in dev mode too.

## Check and serve

From this repository, with Node (not Bun):

```bash
npx --yes "@cursor/bdk@0.2.27" validate --dir reading-desk
npx --yes "@cursor/bdk@0.2.27" info --dir reading-desk --json
npx --yes "@cursor/bdk@0.2.27" call load-desk --dir reading-desk --input '{}'
npx tsc --noEmit -p reading-desk
npx --yes "@cursor/bdk@0.2.27" serve --dir reading-desk --mode single --dev --port 43123 --host 127.0.0.1
```

`validate`, `info`, `call`, and bringing the server up do not need a Cursor login. A model turn (`run`, `eval`, or a message in the playground) needs a Cursor credential: `CURSOR_API_KEY`, or `CURSOR_API_KEY_FILE`, or `CURSOR_SERVICE_ACCOUNT_KEY`.
