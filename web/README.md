# Reading desk

A browser page that recommends three articles for a design category. The articles come from one shared library of approved publications. A category filters by subject, not by which site published the piece.

Matching and ranking run in the browser from the committed article library. The page does not invent titles, and it does not call a model. Excerpts are labeled as excerpts.

From this directory:

```bash
npm test
npm run dev
```

Open http://127.0.0.1:47231

## Morning fetch

`npm run fetch-feeds` reads public RSS and Atom feeds for the publications in `lib/sources.ts`. It discovers a feed from the source's `feedUrl`, from a previous successful fetch, from `<link rel="alternate">` on the source homepage, or from a short list of public paths such as `/feed` and `/rss`. New items are appended to `lib/corpus/articles.json` only when the feed provides an https article URL, a title, and an excerpt or description. Existing articles are left in place. Failures are written to `lib/corpus/retrieval-status.json` and the run continues.

The same command is scheduled in `.github/workflows/morning-feed.yml` at `30 2 * * *` UTC, which is 08:00 Asia/Kolkata. The workflow commits `articles.json` and `retrieval-status.json` when they change and pushes to `main`. The public site serves the committed JSON, so a production deploy still has to pick up that commit.
