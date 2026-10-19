import {
  CAP,
  categoryById,
  hrefFor,
  sourceById,
  toBlogCard,
  type BlogCard,
  type CategoryId,
} from "./catalog.ts";

export { CAP };

export const DEFAULT_CATEGORY: CategoryId = "general-ux";

export function matchesCategory(sourceId: string, categoryId: CategoryId): boolean {
  const category = categoryById(categoryId);
  return category.featured.includes(sourceId);
}

export function deskNote(total: number, available: number, shown: number): string | null {
  if (total === 0) {
    return "Nothing in this category. No blog was invented to fill the gap.";
  }
  if (available === 0) {
    return "You skipped every blog in this category. They stay hidden in this browser.";
  }
  if (shown < CAP && available < total) {
    return "Fewer than three are left. Skipped blogs stay hidden in this browser.";
  }
  if (shown < CAP) {
    return "This category has fewer than three blogs. No blog was invented to fill the gap.";
  }
  return null;
}

export function selectDesk(categoryId: CategoryId, skippedIds: readonly string[]) {
  const category = categoryById(categoryId);
  const skipped = new Set(skippedIds);
  const featured = category.featured.map((id) => sourceById(id));
  const available = featured.filter((source) => !skipped.has(source.id));
  const shown: BlogCard[] = available
    .slice(0, CAP)
    .map((source) => toBlogCard(source, hrefFor(source, category.id)));
  return {
    shown,
    total: featured.length,
    available: available.length,
    note: deskNote(featured.length, available.length, shown.length),
  };
}
