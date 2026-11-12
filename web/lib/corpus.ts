import raw from "./corpus/articles.json" with { type: "json" };
import { isApprovedSource } from "./sources.ts";

export type Evidence = "full_text" | "excerpt" | "metadata";

export type Article = {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  author: string;
  publishedAt: string;
  excerpt: string;
  evidence: Evidence;
  retrievedAt: string;
};

function isEvidence(value: string): value is Evidence {
  return value === "full_text" || value === "excerpt" || value === "metadata";
}

/** Articles saved from public feeds and earlier retrievals. The agent does not invent these fields. */
export const articles: Article[] = (raw as Article[]).filter((article) => {
  return (
    typeof article.id === "string" &&
    typeof article.url === "string" &&
    article.url.startsWith("https://") &&
    isApprovedSource(article.sourceId) &&
    isEvidence(article.evidence)
  );
});

export function articleById(id: string): Article | undefined {
  return articles.find((article) => article.id === id);
}
