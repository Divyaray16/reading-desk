# Reading desk

Divya's reading desk is one assistant with two habits.

Every morning at 8:00 IST she gets three UX reads. Two or one is fine when fewer pieces fit. The schedule cron is `30 2 * * *`, which is 02:30 UTC, and that is 08:00 in Asia/Kolkata. India does not use daylight saving.

The rest of the time she can ask something else. The desk answers that question. It sends a reading list only when she asked what to read, or when the morning run fires.

The project lives in [`reading-desk/`](reading-desk/).

## Where she sees the articles

She sees the morning note in the playground session, not on her phone. On this machine that session is at [http://127.0.0.1:43123/playground](http://127.0.0.1:43123/playground), under the schedule named `morning`. The links in the note open the real sites. Slack is not connected. Nothing is texted or emailed.

## How to add or drop a blog

She can say "add Built for Mars" or "stop sending Smashing." Adding a blog needs its real homepage. Dropping one works by name or id, such as Smashing or `smashing`. The desk does not invent a homepage or an article URL.

The publication map is [`reading-desk/bot/lib/publications.ts`](reading-desk/bot/lib/publications.ts): Stripe blog, UX Collective, UX Planet, The Looking Glass, Nielsen Norman Group, Smashing Magazine, A List Apart, Intercom blog, Figma blog, Linear blog, Brad Frost, and Shape Up. Confirmed articles are [`reading-desk/bot/lib/shelf.ts`](reading-desk/bot/lib/shelf.ts). UX Collective, UX Planet, Intercom, and Linear stay on the map with no article until a real page is confirmed.

## Dev schedules do not auto-fire

`serve --dev` does not fire the schedule on the clock. Trigger the morning run by hand:

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

`validate`, `info`, `call`, and bringing the server up do not need a Cursor login. A model turn (`run`, `eval`, or a message in the playground) needs a Cursor credential: `CURSOR_API_KEY`, or `CURSOR_API_KEY_FILE`, or `CURSOR_SERVICE_ACCOUNT_KEY`.
