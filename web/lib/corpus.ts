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

/** Verified articles retrieved on 2026-10-19. None were written by the agent. */
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
