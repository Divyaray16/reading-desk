"use client";

import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import { Bookmark, Check, ChevronDown, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ask, type AskResult } from "@/lib/ask";
import { categories, DEFAULT_CATEGORY, type CategoryId } from "@/lib/categories";
import { articles } from "@/lib/corpus";
import { kolkataDay } from "@/lib/day";
import { bookmarksFor, refreshDesk, replaceDayPick, sameArticleSet, selectDesk, showCached, type Recommendation } from "@/lib/desk";
import { visitorLocalLabel } from "@/lib/local-time";
import { categoryArticleCounts } from "@/lib/rank";

const SKIP_KEY = "reading-desk-skips";
const USEFUL_KEY = "reading-desk-useful";
const DAY_KEY = "reading-desk-day-v6";

type DayCache = { date: string; picks: Partial<Record<CategoryId, string[]>> };

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function readDay(): DayCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DAY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as { date?: unknown; picks?: unknown };
    if (typeof record.date !== "string" || !record.picks || typeof record.picks !== "object") return null;
    return { date: record.date, picks: record.picks as DayCache["picks"] };
  } catch {
    return null;
  }
}

const CLOCK_MS = 60_000;

function browserTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof zone !== "string") return undefined;
    const trimmed = zone.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

function VisitorClock() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setLabel(visitorLocalLabel(new Date(), browserTimeZone()));
    update();
    const id = window.setInterval(update, CLOCK_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="mt-5 min-h-6 text-sm leading-6 text-muted-foreground tabular-nums" data-local-time={label ?? ""}>
      {label ?? "Local time"}
    </p>
  );
}

export function Desk() {
  const [view, setView] = useState<CategoryId>(DEFAULT_CATEGORY);
  const [skipped, setSkipped] = useState<string[] | null>(null);
  const [useful, setUseful] = useState<string[] | null>(null);
  const [day, setDay] = useState<DayCache | null>(null);
  const [ready, setReady] = useState(false);
  const [introduced, setIntroduced] = useState(false);
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState<AskResult | null>(null);
  const counts = useMemo(() => categoryArticleCounts(articles), []);
  const visible = useMemo(
    () => categories.filter((category) => (counts[category.id] ?? 0) > 0),
    [counts],
  );
  const active: CategoryId = visible.some((category) => category.id === view) ? view : (visible[0]?.id ?? view);

  useEffect(() => {
    if (active !== view) setView(active);
  }, [active, view]);

  useEffect(() => {
    const today = kolkataDay();
    const stored = readDay();
    setSkipped(readIds(SKIP_KEY));
    setUseful(readIds(USEFUL_KEY));
    setDay(stored && stored.date === today ? stored : { date: today, picks: {} });
    setReady(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setIntroduced(true), reduceMotion ? 0 : 780);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (skipped === null) return;
    window.localStorage.setItem(SKIP_KEY, JSON.stringify(skipped));
  }, [skipped]);

  useEffect(() => {
    if (useful === null) return;
    window.localStorage.setItem(USEFUL_KEY, JSON.stringify(useful));
  }, [useful]);

  useEffect(() => {
    if (!day) return;
    window.localStorage.setItem(DAY_KEY, JSON.stringify(day));
  }, [day]);

  const skipIds = skipped ?? [];
  const usefulIds = useful ?? [];
  const today = day?.date ?? kolkataDay();
  const cachedIds = day?.picks[active];
  const computed = selectDesk(active, { skipped: skipIds, useful: usefulIds });
  const shown = (cachedIds ? showCached(active, cachedIds) : computed.shown).filter((item) => !skipIds.includes(item.id));

  useEffect(() => {
    if (!ready || !day || skipped === null || useful === null) return;
    if (day.picks[active]) return;
    const fresh = selectDesk(active, { skipped, useful });
    setDay((current) => {
      if (!current || current.picks[active]) return current;
      return { ...current, picks: { ...current.picks, [active]: fresh.shown.map((item) => item.id) } };
    });
  }, [ready, active, day, skipped, useful]);

  const viewLine = categories.find((item) => item.id === active)?.line ?? "";
  const hiddenHere = (cachedIds ?? computed.shown.map((item) => item.id)).filter((id) => skipIds.includes(id)).length;

  function choose(next: CategoryId) {
    setView(next);
    setAnswer(null);
    setAsked("");
    setDraft("");
  }

  function skip(id: string) {
    setSkipped((current) => {
      const base = current ?? readIds(SKIP_KEY);
      if (base.includes(id)) return base;
      return [...base, id];
    });
  }

  function toggleBookmark(id: string) {
    setUseful((current) => {
      const base = current ?? readIds(USEFUL_KEY);
      if (base.includes(id)) return base.filter((item) => item !== id);
      return [...base, id];
    });
  }

  function restore() {
    const ids = new Set(cachedIds ?? computed.shown.map((item) => item.id));
    setSkipped((current) => (current ?? readIds(SKIP_KEY)).filter((id) => !ids.has(id)));
  }

  const currentIds = cachedIds ?? shown.map((item) => item.id);
  const upcoming = refreshDesk(active, { skipped: skipIds, useful: usefulIds }, currentIds);
  const canRotate = !sameArticleSet(
    upcoming.shown.map((item) => item.id),
    shown.map((item) => item.id),
  );

  function refresh() {
    const fresh = refreshDesk(active, { skipped: skipIds, useful: usefulIds }, currentIds);
    setDay((current) => ({
      date: current?.date ?? today,
      picks: replaceDayPick(current?.picks ?? {}, active, fresh.shown.map((item) => item.id)),
    }));
    if (answer || asked || draft.trim()) {
      setDraft("");
      setAsked("");
      setAnswer(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setAsked(question);
    setAnswer(ask(question, new Date(), articles));
  }

  useEffect(() => {
    const question = draft.trim();
    if (question.length < 2) {
      setAnswer(null);
      setAsked("");
      return;
    }
    const id = window.setTimeout(() => {
      setAsked(question);
      setAnswer(ask(question, new Date(), articles));
    }, 250);
    return () => window.clearTimeout(id);
  }, [draft]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-[42rem] px-5 py-12 sm:px-8 sm:py-16">
      <header className="border-b border-border pb-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-medium tracking-[0.22em] text-ember uppercase">Today</p>
          <BookmarkMenu ids={usefulIds} onRemove={toggleBookmark} />
        </div>
        <h1 className="mt-4 font-serif text-[2.85rem] leading-[0.98] tracking-[-0.03em] text-balance text-foreground sm:text-6xl">
          Reading desk
        </h1>
        <p className="mt-4 max-w-[34rem] font-serif text-xl leading-snug text-pretty text-foreground/90 sm:text-[1.65rem]">
          Three articles for the work in front of you.
        </p>
        <VisitorClock />
      </header>

      {useful !== null ? <Bookmarks ids={usefulIds} onRemove={toggleBookmark} /> : null}

      <section className="mt-10" aria-labelledby="ask-label">
        <form onSubmit={submit}>
          <label id="ask-label" htmlFor="ask" className="block font-serif text-2xl leading-snug text-balance">
            Ask about the work in front of you
          </label>
          <div className="desk-ask mt-4">
            <input
              id="ask"
              name="question"
              type="text"
              value={draft}
              data-ask-field=""
              onChange={(event) => setDraft(event.target.value)}
              placeholder="give me an AI UX article"
              autoComplete="off"
              className="h-12 max-h-12 min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-field px-3.5 text-base text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] outline-none placeholder:text-[#b3a898] focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/35"
            />
            <Button
              type="submit"
              className="h-12 max-h-12 min-h-12 shrink-0 rounded-xl px-5 text-[0.95rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_18px_-14px_rgba(0,0,0,0.95)] hover:bg-[#e7dccb] active:translate-y-px"
              disabled={draft.trim().length === 0}
            >
              Ask
            </Button>
          </div>
        </form>
      </section>

      {answer ? (
        <div className="mt-8 flex items-baseline justify-between gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground" data-search-library="all">
            Matches for “{asked}” across the whole library.
          </p>
          <button
            type="button"
            className="shrink-0 text-xs text-ember underline-offset-4 hover:underline"
            onClick={() => {
              setAnswer(null);
              setAsked("");
              setDraft("");
            }}
          >
            Back to the desk
          </button>
        </div>
      ) : (
        <div className="mt-8">
          <div className="desk-filter">
            <div className="min-w-0 flex-1">
              <CategorySelect value={active} counts={counts} options={visible} onValueChange={choose} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-10 min-h-10 min-w-10 shrink-0 rounded-xl border border-border bg-field px-0 text-ember shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] hover:bg-foreground/8 hover:text-ember"
              aria-label="Refresh articles"
              title={canRotate ? "Refresh articles" : "No other articles in this category"}
              disabled={!canRotate}
              onClick={refresh}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
          {hiddenHere > 0 ? (
            <button type="button" className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={restore}>
              Restore {hiddenHere} skipped
            </button>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{viewLine}</p>
        </div>
      )}

      <div aria-live="polite" data-blog-count={answer?.kind === "reads" ? answer.articles.length : shown.length} data-category={active} data-day={today}>
        {answer?.kind === "none" ? (
          <EmptyState kicker="No match" title="Nothing in the library fits." body={answer.text} />
        ) : null}
        {answer?.kind === "reads" ? (
          <ol className="mt-4 flex list-none flex-col gap-4 p-0">
            {answer.articles.map((article, index) => (
              <ArticleItem
                key={article.id}
                article={article}
                number={String(index + 1).padStart(2, "0")}
                primary={index === 0}
                useful={usefulIds.includes(article.id)}
                onUseful={() => toggleBookmark(article.id)}
              />
            ))}
          </ol>
        ) : null}
        {!answer ? (
          <>
            {!introduced ? <DeskLoader /> : null}
            {introduced && shown.length === 0 && hiddenHere > 0 ? (
              <EmptyState
                kicker="Skipped"
                title="Nothing left on this desk."
                body="You skipped the articles for this category. Restore them, or refresh for the next set."
              />
            ) : null}
            {introduced && shown.length === 0 && hiddenHere === 0 ? (
              <EmptyState
                kicker="Empty"
                title="No article is ready for this category."
                body="Refresh the desk. Nothing is invented to fill a gap."
              />
            ) : null}
            {introduced && shown.length > 0 ? (
              <ol className="desk-arrive mt-4 flex list-none flex-col gap-4 p-0">
                {shown.map((article, index) => (
                  <ArticleItem
                    key={article.id}
                    article={article}
                    number={String(index + 1).padStart(2, "0")}
                    primary={index === 0}
                    useful={usefulIds.includes(article.id)}
                    onSkip={() => skip(article.id)}
                    onUseful={() => toggleBookmark(article.id)}
                  />
                ))}
              </ol>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}

function CategorySelect({
  value,
  counts,
  options,
  onValueChange,
}: {
  value: CategoryId;
  counts: Partial<Record<CategoryId, number>>;
  options: readonly { id: CategoryId; label: string }[];
  onValueChange: (next: CategoryId) => void;
}) {
  const [filter, setFilter] = useState("");
  const items = options.map((category) => ({ value: category.id, label: category.label }));
  const query = filter.trim().toLowerCase();
  const shown = options.filter((category) => category.label.toLowerCase().includes(query));
  return (
    <Select.Root
      items={items}
      value={value}
      modal={false}
      onOpenChange={(open) => {
        if (!open) setFilter("");
      }}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
    >
      <Select.Trigger
        type="button"
        data-category-select=""
        className="group flex h-10 min-h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-field px-3.5 text-left text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] outline-none focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/35 data-[popup-open]:border-ember"
      >
        <span className="sr-only">Category</span>
        <Select.Value className="min-w-0 flex-1 truncate" />
        <Select.Icon className="shrink-0 text-ember">
          <ChevronDown className="size-4 transition-transform duration-150 group-data-[popup-open]:rotate-180" aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="z-50 outline-none"
          side="bottom"
          align="start"
          sideOffset={6}
          alignItemWithTrigger={false}
          collisionPadding={16}
          collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "none" }}
        >
          <Select.Popup className="box-border w-[min(var(--available-width),max(var(--anchor-width),28rem))] max-w-[var(--available-width)] origin-[var(--transform-origin)] rounded-xl border border-border bg-[#231f1b] text-foreground shadow-[inset_0_1px_0_rgba(255,236,214,0.06),0_18px_40px_-24px_rgba(0,0,0,0.9)] outline-none transition-[opacity,transform] duration-100 ease-out data-[closed]:pointer-events-none data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
            <div className="border-b border-border p-1.5">
              <input
                data-category-filter=""
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") event.stopPropagation();
                }}
                onClick={(event) => event.stopPropagation()}
                placeholder="Find a category"
                aria-label="Find a category"
                autoComplete="off"
                className="h-9 w-full rounded-lg border border-border bg-field px-2.5 text-sm text-foreground outline-none placeholder:text-[#b3a898] focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/35"
              />
            </div>
            <Select.List className="max-h-[min(22rem,var(--available-height))] overflow-y-auto overscroll-contain p-1.5 [scrollbar-color:#e0b08a_transparent] [scrollbar-width:thin]">
              {shown.map((category) => {
                const count = counts[category.id] ?? 0;
                return (
                  <Select.Item
                    key={category.id}
                    value={category.id}
                    data-category-id={category.id}
                    data-category-count={count}
                    aria-label={`${category.label}, ${count} ${count === 1 ? "article" : "articles"}`}
                    className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm leading-snug text-foreground outline-none select-none data-[highlighted]:bg-foreground/8 data-[selected]:bg-ember/12 data-[selected]:text-ember"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      <Select.ItemIndicator>
                        <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
                      </Select.ItemIndicator>
                    </span>
                    <Select.ItemText className="min-w-0 flex-1 whitespace-normal">{category.label}</Select.ItemText>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
                      {count}
                    </span>
                  </Select.Item>
                );
              })}
              {shown.length === 0 ? <p className="px-2.5 py-3 text-sm text-muted-foreground">No category matches.</p> : null}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function BookmarkMenu({ ids, onRemove }: { ids: readonly string[]; onRemove: (id: string) => void }) {
  const bookmarks = bookmarksFor(ids);
  const count = bookmarks.length;

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        aria-label="Bookmarks"
        data-bookmarks-trigger=""
        data-bookmark-count={count}
        className={(state) => {
          const marked = state.open || count > 0;
          return [
            "group inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-border bg-field shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] outline-none focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/35",
            marked ? "text-ember" : "text-muted-foreground",
            state.open ? "border-ember" : "",
            count > 0 ? "gap-1 px-2" : "w-9",
          ].join(" ");
        }}
      >
        <Bookmark
          aria-hidden="true"
          className="size-4 group-data-[popup-open]:fill-current"
          fill={count > 0 ? "currentColor" : "none"}
          strokeWidth={1.75}
        />
        {count > 0 ? (
          <span className="min-w-4 text-center text-[0.7rem] leading-none font-medium tabular-nums" aria-hidden="true">
            {count}
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="z-50 outline-none"
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "none" }}
        >
          <Popover.Popup
            data-bookmarks={count}
            className="box-border w-[min(22rem,var(--available-width,calc(100vw-1.5rem)))] max-w-[min(var(--available-width,calc(100vw-1.5rem)),calc(100vw-1.5rem))] origin-[var(--transform-origin)] rounded-xl border border-border bg-card text-foreground shadow-[inset_0_1px_0_rgba(255,236,214,0.06),0_18px_40px_-24px_rgba(0,0,0,0.9)] outline-none"
          >
            <div className="max-h-[min(24rem,var(--available-height,70vh))] overflow-x-hidden overflow-y-auto overscroll-contain p-3 [scrollbar-color:#e0b08a_transparent] [scrollbar-width:thin]">
              <Popover.Title className="text-[0.68rem] font-medium tracking-[0.22em] text-ember uppercase">
                Bookmarks
              </Popover.Title>
              {count === 0 ? (
                <Popover.Description className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
                  The articles you bookmark stay in this browser.
                </Popover.Description>
              ) : (
                <ul className="mt-1 flex list-none flex-col p-0">
                  {bookmarks.map((bookmark) => (
                    <li
                      key={bookmark.id}
                      className="flex items-start gap-3 border-t border-border py-2.5 first:border-t-0"
                      data-bookmark-id={bookmark.id}
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-serif text-base leading-snug text-pretty break-words text-foreground underline-offset-[0.14em] hover:underline focus-visible:underline"
                        >
                          {bookmark.title}
                        </a>
                        <p className="mt-1 text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">{bookmark.publication}</p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 pt-0.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        onClick={() => onRemove(bookmark.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Bookmarks({ ids, onRemove }: { ids: readonly string[]; onRemove: (id: string) => void }) {
  const bookmarks = bookmarksFor(ids);
  return (
    <section className="mt-8" aria-labelledby="bookmarks-label" data-bookmarks={bookmarks.length}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="bookmarks-label" className="text-[0.68rem] font-medium tracking-[0.22em] text-ember uppercase">
          Bookmarks
        </h2>
        {bookmarks.length > 0 ? <p className="text-xs text-muted-foreground">{bookmarks.length} saved in this browser</p> : null}
      </div>
      {bookmarks.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Bookmark an article and it stays here the next time you open this desk.
        </p>
      ) : (
        <ul className="mt-3 flex list-none flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card p-0">
          {bookmarks.map((bookmark) => (
            <li key={bookmark.id} className="flex items-start gap-3 px-4 py-3" data-bookmark-id={bookmark.id}>
              <div className="min-w-0 flex-1">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-serif text-lg leading-snug text-balance text-foreground underline-offset-[0.14em] hover:underline focus-visible:underline"
                >
                  {bookmark.title}
                </a>
                <p className="mt-1 text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">{bookmark.publication}</p>
              </div>
              <button
                type="button"
                className="shrink-0 pt-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => onRemove(bookmark.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeskLoader() {
  return (
    <div className="desk-loader" role="status" data-empty="loading">
      <p className="text-[0.68rem] font-medium tracking-[0.18em] text-ember uppercase">Today’s three</p>
      <div className="desk-loader-rows" aria-hidden="true">
        <span>01</span>
        <span>02</span>
        <span>03</span>
      </div>
      <p className="font-serif text-2xl leading-snug text-foreground">Choosing three reads</p>
    </div>
  );
}

function EmptyState({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="desk-card mt-4 px-5 py-7 sm:px-7" data-empty={kicker.toLowerCase()}>
      <p className="text-[0.68rem] font-medium tracking-[0.18em] text-ember uppercase">{kicker}</p>
      <p className="mt-3 font-serif text-2xl leading-snug text-balance text-foreground">{title}</p>
      <p className="mt-3 max-w-[34rem] text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function readableAuthor(author: string): string {
  const named = author.match(/\(([^)]+)\)/);
  if (named?.[1] && !named[1].includes("@")) return named[1].trim();
  if (author.includes("@")) return "";
  return author.trim();
}

function ArticleItem({
  article,
  number,
  primary,
  useful,
  onSkip,
  onUseful,
}: {
  article: Recommendation;
  number: string;
  primary: boolean;
  useful?: boolean;
  onSkip?: () => void;
  onUseful?: () => void;
}) {
  const byline = [readableAuthor(article.author), article.date].filter(Boolean).join(" · ");
  return (
    <li className="min-w-0 list-none" data-blog-id={article.id}>
      <article className={primary ? "desk-card desk-card-lead min-w-0 px-5 py-6 sm:px-7 sm:py-7" : "desk-card min-w-0 px-5 py-6 sm:px-7 sm:py-7"}>
        <p
          className={
            primary
              ? "text-[0.68rem] font-medium tracking-[0.18em] text-ember uppercase"
              : "text-[0.68rem] font-medium tracking-[0.18em] text-muted-foreground uppercase"
          }
        >
          {number}
          <span className="ml-3 tracking-[0.14em]">{article.publication}</span>
        </p>
        <h2
          className={
            primary
              ? "mt-3 font-serif text-[1.85rem] leading-[1.12] tracking-[-0.025em] text-balance text-foreground sm:text-[2.15rem]"
              : "mt-3 font-serif text-[1.45rem] leading-snug tracking-[-0.02em] text-balance text-foreground sm:text-[1.7rem]"
          }
        >
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-[0.14em] hover:underline focus-visible:underline"
          >
            {article.title}
          </a>
        </h2>
        {byline ? <p className="mt-3 text-sm text-muted-foreground">{byline}</p> : null}
        <p
          className={
            primary
              ? "mt-4 max-w-[36rem] font-serif text-lg leading-snug text-pretty text-foreground sm:text-xl"
              : "mt-3 max-w-[36rem] text-base leading-relaxed text-pretty text-foreground"
          }
        >
          {article.explanation.text}
        </p>
        {onSkip || onUseful ? (
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
            {onUseful ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={useful ? "h-10 rounded-xl px-3 text-ember" : "h-10 rounded-xl px-3 text-muted-foreground"}
                aria-pressed={useful}
                onClick={onUseful}
              >
                {useful ? "Bookmarked" : "Bookmark"}
              </Button>
            ) : null}
            {onSkip ? (
              <Button type="button" variant="ghost" size="sm" className="h-10 rounded-xl px-3 text-muted-foreground" onClick={onSkip}>
                Skip
              </Button>
            ) : null}
          </div>
        ) : null}
      </article>
    </li>
  );
}
