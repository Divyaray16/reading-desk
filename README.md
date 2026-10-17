# Reading desk

Divya's UX reading assistant. Every morning at 8:00 IST it sends three things to read. The rest of the day she can ask it something else, and it answers that instead of forcing another list.

The project lives in [`reading-desk/`](reading-desk/).

## What she gets

- A morning note at 8:00 India time. If she has named what she is working on, the three pieces fit that. If she has not, it still sends three and says no project was on file.
- A normal answer when she asks about a critique, an empty screen, a handoff, or anything that is not a request for reading.
- At most three pieces. Each one has a reason, a line she can put on the work, what to skip inside the piece, and a real URL from the shelf.

## Where the articles come from

A publication map in [`reading-desk/bot/lib/publications.ts`](reading-desk/bot/lib/publications.ts): Stripe, UX Collective, UX Planet, The Looking Glass, Nielsen Norman Group, Smashing Magazine, A List Apart, Intercom, Figma, Linear, Brad Frost, and Shape Up.

Confirmed articles live in [`reading-desk/bot/lib/shelf.ts`](reading-desk/bot/lib/shelf.ts). The agent does not invent a URL. UX Collective, UX Planet, Intercom, and Linear are on the map, and a piece is added there only when its page is confirmed. She can say “add Built for Mars” with a homepage, or “stop sending Smashing,” and that is stored for next time.

## Where the morning note shows up

The schedule starts a session and the reply in that session is the note. It does not text a phone or post to Slack.

The clock is 02:30 UTC, which is 08:00 IST. Dev mode does not fire the schedule on its own. With the playground running:

```bash
curl -X POST http://127.0.0.1:43123/v1/dev/schedules/morning
```

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
