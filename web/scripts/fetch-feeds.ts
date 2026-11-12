/**
 * Fetch public RSS and Atom feeds for the registered publications.
 * Appends new articles to lib/corpus/articles.json and writes
 * lib/corpus/retrieval-status.json. Existing articles stay.
 *
 * A failed feed is recorded and the run continues. Login pages and
 * paywalled article HTML are not fetched.
 */

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Article } from "../lib/corpus.ts";
import {
  appendArticles,
  articleFromFeedItem,
  commonFeedUrls,
  allowFeedHost,
  discoverFeedLinks,
  isPublicFeedUrl,
  looksLikeFeed,
  mergeArticles,
  parseFeed,
  siteConstraint,
  type FeedKind,
  type ParsedFeed,
  type ParsedItem,
  type SiteConstraint,
} from "../lib/feed.ts";
import { sources, type Source } from "../lib/sources.ts";

type StatusRecord = {
  sourceId: string;
  method: FeedKind | "feed";
  url: string;
  ok: boolean;
  items: number;
  kept: number;
  added: number;
  checkedAt: string;
  error?: string;
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTICLES_PATH = path.join(ROOT, "lib/corpus/articles.json");
const STATUS_PATH = path.join(ROOT, "lib/corpus/retrieval-status.json");
const CONCURRENCY = 6;
const REQUEST_MS = 12_000;
const SOURCE_MS = 40_000;
const HOME_BYTES = 400_000;
const FEED_BYTES = 4_000_000;
const PROBE_LIMIT = 6;
const IDENTIFYING_UA = "ReadingDesk/1.0 (+https://readingdesk.vercel.app)";
const BROWSER_UA = "Mozilla/5.0 (compatible; ReadingDesk/1.0; +https://readingdesk.vercel.app)";

type FetchText = { ok: boolean; status: number; body: string; finalUrl: string; error?: string };

async function main(): Promise<void> {
  const retrievedAt = new Date().toISOString();
  const rawArticles = await readFile(ARTICLES_PATH, "utf8");
  const existing = JSON.parse(rawArticles) as Article[];
  if (!Array.isArray(existing)) throw new Error("articles.json is not an array");
  const previous = await readStatus();
  const results = await pool(sources, CONCURRENCY, (source) =>
    withTimeout(fetchSource(source, previous, retrievedAt), SOURCE_MS, source.id).catch((error: unknown) =>
      failed(source, source.feedUrl || source.url, message(error), retrievedAt),
    ),
  );

  const incoming = results.flatMap((result) => result.articles);
  const merged = mergeArticles(existing, incoming);
  const added = merged.slice(existing.length);
  const addedBySource = new Map<string, number>();
  for (const article of added) addedBySource.set(article.sourceId, (addedBySource.get(article.sourceId) ?? 0) + 1);

  const status: StatusRecord[] = results.map((result) => ({
    ...result.status,
    added: addedBySource.get(result.status.sourceId) ?? 0,
  }));

  if (added.length > 0) {
    const next = appendArticles(rawArticles, added);
    const parsed = JSON.parse(next) as Article[];
    if (parsed.length !== existing.length + added.length) {
      throw new Error("Refusing to write articles.json because the append count did not match.");
    }
    await writeText(ARTICLES_PATH, next.endsWith("\n") ? next : `${next}\n`);
  }
  await writeText(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);

  const newest = newestPublished(merged);
  const failedSources = status.filter((row) => !row.ok);
  const nothingNew = status.filter((row) => row.ok && row.added === 0);
  console.log(`Added ${added.length} articles.`);
  console.log(`Corpus size ${merged.length}.`);
  console.log(`Newest published: ${newest || "none"}`);
  console.log(`Failed sources (${failedSources.length}): ${failedSources.map((row) => row.sourceId).join(", ") || "none"}`);
  console.log(`Feeds with nothing new (${nothingNew.length}): ${nothingNew.map((row) => row.sourceId).join(", ") || "none"}`);
  for (const row of status) {
    if (row.ok) console.log(`${row.sourceId} ok ${row.url} items=${row.items} kept=${row.kept} added=${row.added}`);
    else console.log(`${row.sourceId} fail ${row.url} ${row.error ?? ""}`);
  }
}

async function fetchSource(
  source: Source,
  previous: StatusRecord[],
  retrievedAt: string,
): Promise<{ status: StatusRecord; articles: Article[] }> {
  const known = unique([
    source.feedUrl ?? "",
    previous.find((row) => row.sourceId === source.id && row.ok && (row.method === "rss" || row.method === "atom"))?.url ?? "",
  ]);
  for (const url of known) {
    const read = await readFeed(url);
    if (read.feed) return accept(source, read.finalUrl, read.feed.kind, read.feed.items, retrievedAt, siteConstraint(source.url));
    if (read.error) continue;
  }

  const home = await getText(source.url, HOME_BYTES);
  const constraint = siteConstraint(source.url, home.ok ? home.finalUrl : undefined);
  const discovered = home.ok ? discoverFeedLinks(home.body, home.finalUrl || source.url) : [];
  for (const url of discovered.slice(0, 3)) {
    if (known.includes(url)) continue;
    const read = await readFeed(url);
    if (read.feed) return accept(source, read.finalUrl, read.feed.kind, read.feed.items, retrievedAt, constraint);
  }

  let probes = 0;
  let lastError = home.ok ? "No public RSS or Atom feed found." : home.error || "Homepage could not be read.";
  let lastUrl = known[0] || source.url;
  for (const url of commonFeedUrls(source.url)) {
    if (known.includes(url) || discovered.includes(url)) continue;
    if (probes >= PROBE_LIMIT) break;
    probes += 1;
    lastUrl = url;
    const read = await readFeed(url);
    if (read.feed) return accept(source, read.finalUrl, read.feed.kind, read.feed.items, retrievedAt, constraint);
    if (read.error) lastError = read.error;
  }

  return failed(source, lastUrl, lastError, retrievedAt);
}

function accept(
  source: Source,
  feedUrl: string,
  kind: FeedKind,
  items: ParsedItem[],
  retrievedAt: string,
  constraint: SiteConstraint,
): { status: StatusRecord; articles: Article[] } {
  const taken = new Set<string>();
  const articles: Article[] = [];
  const scoped = allowFeedHost(constraint, source.url, feedUrl);
  for (const item of items) {
    const article = articleFromFeedItem(source, item, feedUrl, retrievedAt, taken, scoped);
    if (!article) continue;
    taken.add(article.id);
    articles.push(article);
  }
  return {
    articles,
    status: {
      sourceId: source.id,
      method: kind,
      url: feedUrl,
      ok: true,
      items: items.length,
      kept: articles.length,
      added: 0,
      checkedAt: retrievedAt,
    },
  };
}

function failed(source: Source, url: string, error: string, retrievedAt: string): { status: StatusRecord; articles: Article[] } {
  return {
    articles: [],
    status: {
      sourceId: source.id,
      method: "feed",
      url,
      ok: false,
      items: 0,
      kept: 0,
      added: 0,
      checkedAt: retrievedAt,
      error: error.slice(0, 300),
    },
  };
}

async function readFeed(url: string): Promise<{ feed?: ParsedFeed; finalUrl: string; error?: string }> {
  if (!isPublicFeedUrl(url)) return { finalUrl: url, error: "Feed URL is not public https." };
  const response = await getText(url, FEED_BYTES);
  if (!response.ok) return { finalUrl: response.finalUrl || url, error: response.error || `HTTP ${response.status}` };
  if (!looksLikeFeed(response.body)) return { finalUrl: response.finalUrl, error: "Response was not RSS or Atom." };
  const feed = parseFeed(response.body, response.finalUrl || url);
  if (!feed) return { finalUrl: response.finalUrl, error: "Could not parse the feed." };
  return { feed, finalUrl: response.finalUrl };
}

async function getText(url: string, maxBytes: number): Promise<FetchText> {
  if (!isPublicFeedUrl(url) && !isPublicPage(url)) return { ok: false, status: 0, body: "", finalUrl: url, error: "URL is not public https." };
  const first = await request(url, IDENTIFYING_UA, maxBytes);
  if (first.status === 401 || first.status === 403 || first.status === 429) {
    const second = await request(url, BROWSER_UA, maxBytes);
    if (second.ok) return second;
  }
  return first;
}

async function request(url: string, userAgent: string, maxBytes: number): Promise<FetchText> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_MS),
      headers: {
        "user-agent": userAgent,
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.5, */*;q=0.1",
      },
    });
    const finalUrl = response.url || url;
    if (!isPublicHttpUrl(finalUrl)) {
      return { ok: false, status: response.status, body: "", finalUrl, error: "Redirected away from a public host." };
    }
    const body = await readBody(response, maxBytes);
    if (!response.ok) return { ok: false, status: response.status, body: "", finalUrl, error: `HTTP ${response.status}` };
    // Some publishers redirect a https feed to http. Keep the body and record the https URL we requested.
    const recorded = finalUrl.startsWith("https://") ? finalUrl : url;
    if (!recorded.startsWith("https://")) {
      return { ok: false, status: response.status, body: "", finalUrl, error: "Redirected away from https." };
    }
    return { ok: true, status: response.status, body, finalUrl: recorded };
  } catch (error) {
    return { ok: false, status: 0, body: "", finalUrl: url, error: message(error) };
  }
}

async function readBody(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (size >= maxBytes) {
      await reader.cancel();
      break;
    }
  }
  text += decoder.decode();
  return text;
}

function isPublicPage(url: string): boolean {
  return isPublicFeedUrl(url);
}

function isPublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return isPublicFeedUrl(`https://${url.host}${url.pathname}${url.search}`);
}

async function readStatus(): Promise<StatusRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(STATUS_PATH, "utf8")) as StatusRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeText(file: string, contents: string): Promise<void> {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, contents);
  await rename(tmp, file);
}

function newestPublished(articles: readonly Article[]): string {
  let best = "";
  let bestTime = Number.NEGATIVE_INFINITY;
  for (const article of articles) {
    const time = Date.parse(article.publishedAt);
    if (!Number.isNaN(time) && time > bestTime) {
      bestTime = time;
      best = article.publishedAt;
    }
  }
  return best;
}

function message(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/\s+/g, " ").slice(0, 300);
  return "request failed";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

async function pool<T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
