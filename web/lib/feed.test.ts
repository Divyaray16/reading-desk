import assert from "node:assert/strict";
import test from "node:test";
import type { Article } from "./corpus.ts";
import {
  appendArticles,
  articleFromFeedItem,
  articleId,
  commonFeedUrls,
  discoverFeedLinks,
  isIndexOrTagUrl,
  mergeArticles,
  parseFeed,
  allowFeedHost,
  siteConstraint,
  urlKey,
} from "./feed.ts";

const SOURCE = { id: "example", url: "https://example.com/blog/", name: "Example" };
const WHEN = "2026-11-12T21:45:00.000Z";

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Example</title>
    <item>
      <title><![CDATA[Should you add a feed item]]></title>
      <link>https://example.com/2026/11/should-you-add-a-feed-item/?utm_source=rss</link>
      <dc:creator>ada@example.com (Ada Lovelace)</dc:creator>
      <pubDate>Thu, 12 Nov 2026 10:00:00 GMT</pubDate>
      <description><![CDATA[A real description from the feed, long enough to keep as the excerpt for this item.]]></description>
      <content:encoded><![CDATA[<p>The full HTML body is longer than the description and should not replace a real description.</p>]]></content:encoded>
    </item>
    <item>
      <title>Tag index</title>
      <link>https://example.com/tags/design/</link>
      <description>This is a tag page and must not enter the library even though the description is long enough.</description>
    </item>
    <item>
      <title>No excerpt here</title>
      <link>https://example.com/2026/11/no-excerpt-here/</link>
      <description>Too short.</description>
    </item>
    <item>
      <title>Plain HTTP</title>
      <link>http://example.com/2026/11/plain-http-item/</link>
      <description>This description is long enough, but the URL is not an https article URL.</description>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:thr="http://purl.org/syndication/thread/1.0">
  <title>Example</title>
  <entry>
    <title type="html"><![CDATA[Atom entry with an image prefix]]></title>
    <author><name>Grace Hopper</name></author>
    <published>2026-11-11T17:00:00Z</published>
    <updated>2026-11-10T00:00:00Z</updated>
    <link rel="replies" type="application/atom+xml" href="https://example.com/blog/atom-entry/feed/" />
    <link rel="alternate" type="text/html" href="https://example.com/blog/atom-entry/" />
    <id>https://example.com/blog/?p=15</id>
    <summary type="html"><![CDATA[<img src="https://example.com/a.png" alt="ignored" />This synthetic summary is long enough to count as a real excerpt from the feed.]]></summary>
    <thr:total>0</thr:total>
  </entry>
</feed>`;

function keptFrom(xml: string, feedUrl: string): Article[] {
  const parsed = parseFeed(xml, feedUrl);
  assert.ok(parsed);
  const taken = new Set<string>();
  const articles: Article[] = [];
  for (const item of parsed.items) {
    const article = articleFromFeedItem(SOURCE, item, feedUrl, WHEN, taken);
    if (!article) continue;
    taken.add(article.id);
    articles.push(article);
  }
  return articles;
}

test("an RSS item keeps the feed description, author, date, and https URL", () => {
  const articles = keptFrom(RSS, "https://example.com/feed/");
  assert.equal(articles.length, 1);
  const article = articles[0];
  assert.ok(article);
  assert.equal(article.title, "Should you add a feed item");
  assert.equal(article.url, "https://example.com/2026/11/should-you-add-a-feed-item/");
  assert.equal(article.author, "ada@example.com (Ada Lovelace)");
  assert.equal(article.publishedAt, "Thu, 12 Nov 2026 10:00:00 GMT");
  assert.equal(article.excerpt.includes("real description from the feed"), true);
  assert.equal(article.excerpt.includes("full HTML body"), false);
  assert.equal(article.evidence, "excerpt");
  assert.equal(article.retrievedAt, WHEN);
  assert.equal(article.sourceId, "example");
});

test("an Atom entry prefers the article link over the comment feed", () => {
  const articles = keptFrom(ATOM, "https://example.com/blog/feed/atom.xml");
  assert.equal(articles.length, 1);
  const article = articles[0];
  assert.ok(article);
  assert.equal(article.url, "https://example.com/blog/atom-entry/");
  assert.equal(article.author, "Grace Hopper");
  assert.equal(article.publishedAt, "2026-11-11T17:00:00Z");
  assert.equal(article.excerpt.startsWith("This synthetic summary"), true);
  assert.equal(article.excerpt.includes("ignored"), false);
});

test("tag pages, short excerpts, and non-https links are skipped", () => {
  assert.equal(isIndexOrTagUrl("https://example.com/tags/design/"), true);
  assert.equal(isIndexOrTagUrl("https://example.com/2026/11/"), true);
  assert.equal(isIndexOrTagUrl("https://example.com/2026/11/a-real-article/"), false);
  const parsed = parseFeed(RSS, "https://example.com/feed/");
  assert.ok(parsed);
  assert.equal(parsed.items.length, 4);
  assert.equal(keptFrom(RSS, "https://example.com/feed/").length, 1);
});

test("new articles append and existing URLs are not stored again", () => {
  const existing: Article = {
    sourceId: "example",
    title: "Already stored",
    url: "https://www.example.com/2026/11/should-you-add-a-feed-item/",
    publishedAt: "Thu, 12 Nov 2026 10:00:00 GMT",
    author: "Ada Lovelace",
    excerpt: "Already stored excerpt that is long enough to have been a real feed description.",
    evidence: "excerpt",
    id: "example-already",
    retrievedAt: "2026-10-19T20:30:00Z",
  };
  const incoming = keptFrom(RSS, "https://example.com/feed/");
  const merged = mergeArticles([existing], incoming);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.id, "example-already");
  assert.equal(merged[0]?.retrievedAt, "2026-10-19T20:30:00Z");
  assert.equal(urlKey(existing.url), urlKey(incoming[0]?.url ?? ""));

  const fresh = keptFrom(ATOM, "https://example.com/blog/feed/atom.xml");
  const withNew = mergeArticles([existing], fresh);
  assert.equal(withNew.length, 2);
  assert.equal(withNew[0], existing);
  const raw = `${JSON.stringify([existing], null, 2)}\n`;
  const appended = appendArticles(raw, withNew.slice(1));
  assert.equal(appended.startsWith(raw.slice(0, raw.lastIndexOf("]")).replace(/\s*$/, "")), true);
  const parsed = JSON.parse(appended) as Article[];
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]?.id, "example-already");
  assert.equal(parsed[1]?.url, "https://example.com/blog/atom-entry/");
});

test("ids are stable and stay unique when the base id is taken", () => {
  const url = "https://example.com/blog/atom-entry/";
  const first = articleId("example", url, new Set());
  const second = articleId("example", url, new Set());
  assert.equal(first, second);
  assert.ok(first.length <= 90);
  const taken = articleId("example", url, new Set([first]));
  assert.notEqual(taken, first);
  assert.equal(taken, articleId("example", url, new Set([first])));
});

test("movable type article URLs are not treated as archive indexes", () => {
  assert.equal(
    isIndexOrTagUrl("https://www.uxmatters.com/mt/archives/2024/03/evolving-the-user-experience-to-curb-digital-addiction.php"),
    false,
  );
});

test("keyboard-mash excerpts and off-site feed items are rejected", () => {
  const parsed = parseFeed(
    `<?xml version="1.0"?><rss version="2.0"><channel><item>
      <title>Rd2 testing</title>
      <link>https://example.com/2021/05/rd2-testing/</link>
      <description>Red text dfsdsfdsfsdf dsfdsfsdfdsf sdfdsfdsdsfds The post Rd2 testing appeared first on Example and this sentence is long enough.</description>
    </item></channel></rss>`,
    "https://example.com/feed/",
  );
  assert.ok(parsed);
  assert.equal(articleFromFeedItem(SOURCE, parsed.items[0]!, "https://example.com/feed/", WHEN, new Set()), null);

  const moved = siteConstraint("https://cookbook.openai.com/", "https://developers.openai.com/cookbook");
  assert.deepEqual(moved, { hosts: ["developers.openai.com"], pathPrefix: "/cookbook" });
  const offsite = articleFromFeedItem(
    { id: "openai-cookbook", url: "https://cookbook.openai.com/", name: "OpenAI Cookbook" },
    {
      title: "Model optimization for developers",
      url: "https://developers.openai.com/tracks/model-optimization/",
      author: "",
      publishedAt: "2026-04-30T00:00:00Z",
      excerpt: "Fine-tune, distill, and optimize models for the best performance and cost on the public docs site.",
    },
    "https://developers.openai.com/rss.xml",
    WHEN,
    new Set(),
    moved,
  );
  assert.equal(offsite, null);
  const scoped = allowFeedHost(moved, "https://cookbook.openai.com/", "https://developers.openai.com/rss.xml");
  assert.equal(scoped.pathPrefix, "/cookbook");
  const blog = allowFeedHost(
    siteConstraint("https://blog.langchain.com/"),
    "https://blog.langchain.com/",
    "https://www.langchain.com/blog/rss.xml",
  );
  assert.deepEqual(blog.hosts, ["blog.langchain.com", "langchain.com"]);
});

test("homepage alternate links and common feed paths are discovered", () => {
  const html = `<html><head>
    <link rel="alternate" type="application/rss+xml" href="/feed/" />
    <link rel="alternate" title="oEmbed" type="application/json+oembed" href="https://example.com/wp-json/oembed" />
  </head></html>`;
  assert.deepEqual(discoverFeedLinks(html, "https://example.com/blog/"), ["https://example.com/feed/"]);
  const paths = commonFeedUrls("https://example.com/blog/");
  assert.equal(paths.includes("https://example.com/feed"), true);
  assert.equal(paths.includes("https://example.com/blog/feed"), true);
});
