/**
 * Turn a public RSS or Atom document into articles.
 * Titles, dates, authors, excerpts, and URLs come from the feed.
 * Nothing is filled in when the feed leaves it out.
 */

import { articleUrlOk } from "./rank.ts";
import type { Article } from "./corpus.ts";

export type FeedKind = "rss" | "atom";

export type ParsedItem = {
  title: string;
  url: string;
  author: string;
  publishedAt: string;
  excerpt: string;
};

export type ParsedFeed = {
  kind: FeedKind;
  items: ParsedItem[];
};

const EXCERPT_MIN = 40;
const EXCERPT_MAX = 900;

const INDEX_SEGMENTS = new Set([
  "tag",
  "tags",
  "tagged",
  "topic",
  "topics",
  "category",
  "categories",
  "author",
  "authors",
  "user",
  "users",
  "page",
  "pages",
  "search",
  "comments",
  "comment",
  "feed",
  "rss",
  "atom",
]);

const TRACKING_PARAMS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid"]);

export function looksLikeFeed(body: string): boolean {
  return feedKind(body) !== null;
}

export function feedKind(body: string): FeedKind | null {
  const head = body.slice(0, 8000).replace(/^\uFEFF/, "").toLowerCase();
  const rssAt = head.search(/<rss\b|<rdf:rdf\b/);
  const atomAt = head.search(/<feed\b/);
  if (rssAt === -1 && atomAt === -1) return null;
  if (rssAt === -1) return "atom";
  if (atomAt === -1) return "rss";
  return rssAt < atomAt ? "rss" : "atom";
}

export function parseFeed(xml: string, feedUrl: string): ParsedFeed | null {
  const kind = feedKind(xml);
  if (!kind) return null;
  const source = xml.replace(/^\uFEFF/, "").replace(/<!--[\s\S]*?-->/g, "");
  const blocks = kind === "atom" ? extractElements(source, "entry") : extractElements(source, "item");
  const items: ParsedItem[] = [];
  for (const block of blocks) {
    const item = parseItem(block, feedUrl);
    if (item) items.push(item);
  }
  return { kind, items };
}

export type SiteConstraint = {
  /** Hostnames with a leading www removed. */
  hosts: string[];
  /** When the publication lives under a path on a shared host, only that path counts. */
  pathPrefix?: string;
};

export function articleFromFeedItem(
  source: { id: string; url: string; name: string },
  item: ParsedItem,
  feedUrl: string,
  retrievedAt: string,
  takenIds: ReadonlySet<string>,
  constraint?: SiteConstraint,
): Article | null {
  if (!titleOk(item.title, source.name)) return null;
  const url = canonicalArticleUrl(item.url);
  if (!url) return null;
  if (!onPublication(url, source.url, feedUrl, constraint)) return null;
  if (isIndexOrTagUrl(url) || isFeedResource(url) || !articleUrlOk(url)) return null;
  const excerpt = clipExcerpt(item.excerpt);
  if (!excerptOk(excerpt, item.title)) return null;
  const author = item.author.trim();
  const publishedAt = item.publishedAt.trim();
  return {
    sourceId: source.id,
    title: item.title.trim(),
    url,
    publishedAt,
    author,
    excerpt,
    evidence: "excerpt",
    id: articleId(source.id, url, takenIds),
    retrievedAt,
  };
}

export function mergeArticles(existing: readonly Article[], incoming: readonly Article[]): Article[] {
  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const article of existing) {
    const key = urlKey(article.url);
    if (key) seen.add(key);
    ids.add(article.id);
  }
  const added: Article[] = [];
  for (const article of incoming) {
    const key = urlKey(article.url);
    if (!key || seen.has(key) || !article.url.startsWith("https://")) continue;
    let next = article;
    if (ids.has(next.id)) next = { ...next, id: articleId(next.sourceId, next.url, ids) };
    seen.add(key);
    ids.add(next.id);
    added.push(next);
  }
  return [...existing, ...added];
}

/** Insert new articles without rewriting the bytes already in the file. */
export function appendArticles(raw: string, added: readonly Article[]): string {
  if (added.length === 0) return raw;
  const end = raw.lastIndexOf("]");
  if (end < 0) throw new Error("articles.json is not a JSON array");
  const before = raw.slice(0, end).replace(/\s*$/, "");
  const blocks = added.map((article) => JSON.stringify(orderedArticle(article), null, 2).replace(/^/gm, "  "));
  const joiner = before.endsWith("[") ? "\n" : ",\n";
  return `${before}${joiner}${blocks.join(",\n")}\n]\n`;
}

export function urlKey(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let path = url.pathname;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    path = url.pathname;
  }
  path = path.replace(/\/+$/, "").toLowerCase();
  const params = [...url.searchParams.entries()]
    .filter(([key]) => {
      const name = key.toLowerCase();
      return !name.startsWith("utm_") && !TRACKING_PARAMS.has(name);
    })
    .sort(([left], [right]) => left.localeCompare(right));
  const search = params.length === 0 ? "" : `?${params.map(([key, value]) => `${key}=${value}`).join("&")}`;
  return `${host}${path}${search}`;
}

export function canonicalArticleUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!isPublicHostname(url.hostname)) return null;
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    const name = key.toLowerCase();
    if (name.startsWith("utm_") || TRACKING_PARAMS.has(name)) url.searchParams.delete(key);
  }
  return url.toString();
}

export function isPublicHttpsUrl(raw: string): boolean {
  return canonicalArticleUrl(raw) !== null || isPublicFeedUrl(raw);
}

export function isPublicFeedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === "https:" && !url.username && !url.password && isPublicHostname(url.hostname);
}

export function discoverFeedLinks(html: string, baseUrl: string): string[] {
  const found: string[] = [];
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs = attributes(tag);
    const type = (attrs.type ?? "").toLowerCase();
    const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/);
    const href = attrs.href ? decodeEntities(attrs.href).trim() : "";
    if (!href || !rel.includes("alternate")) continue;
    const feedType = type.includes("rss") || type.includes("atom");
    if (!feedType) continue;
    try {
      const abs = new URL(href, baseUrl).toString();
      if (isPublicFeedUrl(abs)) found.push(abs);
    } catch {
      // Ignore a homepage link that is not a URL.
    }
  }
  return unique(found);
}

const COMMON_FEED_PATHS = [
  "/feed",
  "/feed/",
  "/rss",
  "/rss/",
  "/rss.xml",
  "/atom.xml",
  "/feed.xml",
  "/index.xml",
  "/blog/feed",
  "/blog/rss.xml",
  "/blog/atom.xml",
  "/blog/feed/atom.xml",
  "/feed/atom.xml",
  "/articles/feed",
];

export function commonFeedUrls(siteUrl: string): string[] {
  let page: URL;
  try {
    page = new URL(siteUrl);
  } catch {
    return [];
  }
  const urls = COMMON_FEED_PATHS.map((path) => page.origin + path);
  const directory = page.pathname.endsWith("/") ? page.pathname : page.pathname.replace(/\/[^/]*$/, "/");
  if (directory && directory !== "/") {
    const base = page.origin + directory.replace(/\/$/, "");
    for (const path of ["/feed", "/feed/", "/rss", "/rss.xml", "/atom.xml"]) urls.push(base + path);
  }
  return unique(urls).filter((url) => isPublicFeedUrl(url));
}

export function articleId(sourceId: string, url: string, taken: ReadonlySet<string>): string {
  const base = baseId(sourceId, url);
  if (!taken.has(base)) return base;
  const hash = fnv1a(`${sourceId}\n${url}`).toString(36).padStart(6, "0").slice(-6);
  const candidate = `${base.slice(0, 83).replace(/-+$/g, "")}-${hash}`;
  if (!taken.has(candidate)) return candidate;
  return `${candidate.slice(0, 86)}-${fnv1a(url).toString(36).slice(-3)}`;
}

export function isIndexOrTagUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  const parts = url.pathname.split("/").filter(Boolean).map((part) => part.toLowerCase());
  if (parts.length === 0) return true;
  if (parts.some((part) => INDEX_SEGMENTS.has(part))) return true;
  if (parts.length <= 3 && parts.every((part) => /^\d{2,4}$/.test(part))) return true;
  if (url.searchParams.has("replytocom") || url.searchParams.has("page") || url.searchParams.has("paged")) return true;
  return false;
}

function parseItem(block: string, feedUrl: string): ParsedItem | null {
  const title = cleanText(extractElements(block, "title")[0] ?? "");
  const url = chooseUrl(block, feedUrl);
  const author = chooseAuthor(block);
  const publishedAt = chooseDate(block);
  const excerpt = chooseExcerpt(block);
  if (!title || !url) return null;
  return { title, url, author, publishedAt, excerpt };
}

function chooseUrl(block: string, feedUrl: string): string {
  const links = itemLinks(block, feedUrl);
  const usable = links.filter((link) => /^https?:\/\//i.test(link.href) && !isFeedResource(link.href));
  const alternate = usable.filter((link) => link.rel === "" || link.rel.includes("alternate"));
  const html = alternate.find((link) => link.type === "" || link.type.includes("html"));
  const chosen = html ?? alternate[0] ?? usable[0];
  if (chosen) return chosen.href;
  return guidUrl(block);
}

function itemLinks(block: string, feedUrl: string): { href: string; rel: string; type: string }[] {
  const links: { href: string; rel: string; type: string }[] = [];
  const re = /<link\b([^>]*?)(?:\/>|>([\s\S]*?)<\/link>)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block))) {
    const attrs = attributes(match[1] ?? "");
    const text = cleanText(match[2] ?? "");
    const href = decodeEntities(attrs.href || text).trim();
    if (!href) continue;
    const rel = (attrs.rel ?? "").toLowerCase();
    const type = (attrs.type ?? "").toLowerCase();
    if (rel.includes("self") || rel.includes("replies") || rel.includes("enclosure")) continue;
    if (type.includes("atom") || type.includes("rss")) continue;
    try {
      const abs = new URL(href, feedUrl).toString();
      links.push({ href: abs, rel, type });
    } catch {
      // Skip a link the feed did not write as a URL.
    }
  }
  return links;
}

function guidUrl(block: string): string {
  const match = block.match(/<(?:[A-Za-z_][\w.-]*:)?guid\b([^>]*)>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?guid\s*>/i);
  if (!match) return "";
  const attrs = attributes(match[1] ?? "");
  if ((attrs.ispermalink ?? "").toLowerCase() === "false") return "";
  const text = cleanText(match[2] ?? "");
  return text.startsWith("https://") ? text : "";
}

function chooseAuthor(block: string): string {
  for (const author of extractElements(block, "author")) {
    const name = cleanText(extractElements(author, "name")[0] ?? "");
    if (name) return name;
    const plain = cleanText(author);
    if (plain) return plain;
  }
  return cleanText(extractElements(block, "creator")[0] ?? "");
}

function chooseDate(block: string): string {
  for (const name of ["pubDate", "published", "date", "updated"]) {
    const raw = cleanText(extractElements(block, name)[0] ?? "");
    const kept = keepDate(raw);
    if (kept) return kept;
  }
  return "";
}

function chooseExcerpt(block: string): string {
  const description = cleanText(extractElements(block, "description")[0] ?? "");
  const summary = cleanText(extractElements(block, "summary")[0] ?? "");
  const encoded = cleanText(extractElements(block, "encoded")[0] ?? "");
  const content = cleanText(extractElements(block, "content")[0] ?? "");
  for (const candidate of [description, summary, encoded, content]) {
    if (excerptOk(candidate, "")) return clipExcerpt(candidate);
  }
  return "";
}

function keepDate(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getUTCFullYear();
  if (year < 1990 || year > 2100) return "";
  return text;
}

function titleOk(title: string, sourceName: string): boolean {
  const text = title.trim();
  if (text.length < 4) return false;
  if (/^(read more|untitled|rss|atom|feed|home|blog)$/i.test(text)) return false;
  if (/^comments for\b/i.test(text)) return false;
  if (/^(block test|test press release)\b/i.test(text)) return false;
  if (text.toLowerCase() === sourceName.trim().toLowerCase()) return false;
  return true;
}

function excerptOk(excerpt: string, title: string): boolean {
  const text = excerpt.trim();
  if (text.length < EXCERPT_MIN) return false;
  if (title && text.toLowerCase() === title.trim().toLowerCase()) return false;
  if (/^(continue reading|read more|comments? for)\b/i.test(text) && text.length < 160) return false;
  if (hasGibberish(text)) return false;
  return true;
}

/** A token with no vowels is not a word the feed meant as prose. */
function hasGibberish(text: string): boolean {
  return text.split(/\s+/).some((token) => {
    const word = token.replace(/[^a-z]/gi, "");
    return word.length >= 8 && !/[aeiou]/i.test(word);
  });
}

function clipExcerpt(excerpt: string): string {
  const text = excerpt.replace(/\s+/g, " ").trim();
  if (text.length <= EXCERPT_MAX) return text;
  const slice = text.slice(0, EXCERPT_MAX);
  const space = slice.lastIndexOf(" ");
  return (space > 700 ? slice.slice(0, space) : slice).trim();
}

function onPublication(articleUrl: string, sourceUrl: string, feedUrl: string, constraint?: SiteConstraint): boolean {
  const article = hostname(articleUrl);
  if (!article) return false;
  if (constraint && constraint.hosts.length > 0) {
    if (!constraint.hosts.some((host) => host === article)) return false;
    if (constraint.pathPrefix) {
      const path = new URL(articleUrl).pathname.replace(/\/+$/, "");
      const prefix = constraint.pathPrefix.replace(/\/+$/, "");
      if (!(path === prefix || path.startsWith(`${prefix}/`))) return false;
    }
    return true;
  }
  return hostsMatch(article, hostname(sourceUrl)) || hostsMatch(article, hostname(feedUrl));
}

export function allowFeedHost(constraint: SiteConstraint, sourceUrl: string, feedUrl: string): SiteConstraint {
  if (constraint.pathPrefix) return constraint;
  const feedHost = hostname(feedUrl);
  const sourceHost = hostname(sourceUrl);
  if (!feedHost || !sourceHost || feedHost === sourceHost) return constraint;
  if (rootDomain(feedHost) !== rootDomain(sourceHost)) return constraint;
  if (constraint.hosts.includes(feedHost)) return constraint;
  return { hosts: [...constraint.hosts, feedHost], pathPrefix: constraint.pathPrefix };
}

function rootDomain(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  return parts.slice(-2).join(".");
}

export function siteConstraint(sourceUrl: string, homepageFinal?: string): SiteConstraint {
  const sourceHost = hostname(sourceUrl);
  if (!homepageFinal) return { hosts: sourceHost ? [sourceHost] : [] };
  let final: URL;
  try {
    final = new URL(homepageFinal);
  } catch {
    return { hosts: sourceHost ? [sourceHost] : [] };
  }
  const finalHost = hostname(final.href);
  if (!finalHost || final.protocol !== "https:" || finalHost === sourceHost) {
    return { hosts: sourceHost ? [sourceHost] : [] };
  }
  const path = final.pathname.replace(/\/+$/, "");
  return path ? { hosts: [finalHost], pathPrefix: path } : { hosts: [finalHost] };
}

function hostsMatch(left: string, right: string): boolean {
  if (!left || !right) return false;
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}

function hostname(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isFeedResource(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  const last = url.pathname.split("/").filter(Boolean).pop()?.toLowerCase() ?? "";
  if (["feed", "rss", "atom", "rss.xml", "atom.xml", "feed.xml", "index.xml"].includes(last)) return true;
  return last.endsWith(".rss") || last.endsWith(".atom");
}

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (host === "0.0.0.0" || host === "::1") return false;
  const match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (!match) return true;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  return true;
}

function baseId(sourceId: string, url: string): string {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");
  const slug = `${host}${parsed.pathname}${parsed.search}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const full = `${sourceId}-${slug}`.replace(/^-+|-+$/g, "");
  if (full.length <= 90) return full;
  const hash = fnv1a(url).toString(36).padStart(6, "0").slice(-6);
  return `${full.slice(0, 83).replace(/-+$/g, "")}-${hash}`;
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function orderedArticle(article: Article): Article {
  return {
    sourceId: article.sourceId,
    title: article.title,
    url: article.url,
    publishedAt: article.publishedAt,
    author: article.author,
    excerpt: article.excerpt,
    evidence: article.evidence,
    id: article.id,
    retrievedAt: article.retrievedAt,
  };
}

export function extractElements(xml: string, localName: string): string[] {
  const blocks: string[] = [];
  const name = escapeRegExp(localName);
  const open = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${name}(?=[\\s>/])[^>]*>`, "gi");
  const close = new RegExp(`</(?:[A-Za-z_][\\w.-]*:)?${name}\\s*>`, "i");
  let match: RegExpExecArray | null;
  while ((match = open.exec(xml))) {
    const tag = match[0];
    if (tag.endsWith("/>")) {
      blocks.push("");
      continue;
    }
    const start = match.index + tag.length;
    let cursor = start;
    let closed = false;
    while (cursor < xml.length) {
      const cdata = xml.indexOf("<![CDATA[", cursor);
      const endMatch = close.exec(xml.slice(cursor));
      if (!endMatch) break;
      const end = cursor + endMatch.index;
      if (cdata !== -1 && cdata < end) {
        const cdataEnd = xml.indexOf("]]>", cdata + 9);
        if (cdataEnd === -1) return blocks;
        cursor = cdataEnd + 3;
        continue;
      }
      blocks.push(xml.slice(start, end));
      open.lastIndex = end + endMatch[0].length;
      closed = true;
      break;
    }
    if (!closed) break;
  }
  return blocks;
}

function attributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([:\w.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(tag))) attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
  return attrs;
}

export function cleanText(raw: string): string {
  const withoutCdata = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const withoutTags = withoutCdata
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(withoutTags).replace(/\s+/g, " ").trim();
}

export function decodeEntities(input: string): string {
  let text = input;
  for (let pass = 0; pass < 2; pass += 1) {
    text = text
      .replace(/&#(\d+);/g, (all, digits: string) => fromCodePoint(Number(digits), all))
      .replace(/&#x([0-9a-f]+);/gi, (all, hex: string) => fromCodePoint(Number.parseInt(hex, 16), all))
      .replace(/&([a-z]+);/gi, (all, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? all);
  }
  return text;
}

function fromCodePoint(code: number, fallback: string): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
