"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ask, type AskResult } from "@/lib/ask";
import { categories, DEFAULT_CATEGORY, type CategoryId } from "@/lib/categories";
import { kolkataDay } from "@/lib/day";
import { refreshDesk, replaceDayPick, sameArticleSet, selectDesk, showCached, type Recommendation } from "@/lib/desk";
import { visitorLocalLabel } from "@/lib/local-time";

const categoryItems = categories.map((category) => ({
  value: category.id,
  label: category.label,
}));

const SKIP_KEY = "reading-desk-skips";
const USEFUL_KEY = "reading-desk-useful";
const DAY_KEY = "reading-desk-day-v2";

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
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState<AskResult | null>(null);

  useEffect(() => {
    const today = kolkataDay();
    const stored = readDay();
    setSkipped(readIds(SKIP_KEY));
    setUseful(readIds(USEFUL_KEY));
    setDay(stored && stored.date === today ? stored : { date: today, picks: {} });
    setReady(true);
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
  const cachedIds = day?.picks[view];
  const computed = selectDesk(view, { skipped: skipIds, useful: usefulIds });
  const shown = (cachedIds ? showCached(view, cachedIds) : computed.shown).filter((item) => !skipIds.includes(item.id));

  useEffect(() => {
    if (!ready || !day || skipped === null || useful === null) return;
    if (day.picks[view]) return;
    const fresh = selectDesk(view, { skipped, useful });
    setDay((current) => {
      if (!current || current.picks[view]) return current;
      return { ...current, picks: { ...current.picks, [view]: fresh.shown.map((item) => item.id) } };
    });
  }, [ready, view, day, skipped, useful]);

  const viewLine = categories.find((item) => item.id === view)?.line ?? "";
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

  function markUseful(id: string) {
    setUseful((current) => {
      const base = current ?? readIds(USEFUL_KEY);
      if (base.includes(id)) return base;
      return [...base, id];
    });
  }

  function restore() {
    const ids = new Set(cachedIds ?? computed.shown.map((item) => item.id));
    setSkipped((current) => (current ?? readIds(SKIP_KEY)).filter((id) => !ids.has(id)));
  }

  const currentIds = cachedIds ?? shown.map((item) => item.id);
  const upcoming = refreshDesk(view, { skipped: skipIds, useful: usefulIds }, currentIds);
  const searchOpen = Boolean(answer) || draft.trim().length > 0;
  const canRotate = !sameArticleSet(
    upcoming.shown.map((item) => item.id),
    shown.map((item) => item.id),
  );

  function refresh() {
    const fresh = refreshDesk(view, { skipped: skipIds, useful: usefulIds }, currentIds);
    setDay((current) => ({
      date: current?.date ?? today,
      picks: replaceDayPick(current?.picks ?? {}, view, fresh.shown.map((item) => item.id)),
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
    setAnswer(ask(question));
  }

  useEffect(() => {
    const question = draft.trim();
    if (!question) {
      setAnswer(null);
      setAsked("");
      return;
    }
    if (question.length < 2) return;
    const id = window.setTimeout(() => {
      setAsked(question);
      setAnswer(ask(question));
    }, 250);
    return () => window.clearTimeout(id);
  }, [draft]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-[42rem] px-5 py-12 sm:px-8 sm:py-16">
      <header className="border-b border-border pb-8">
        <p className="text-[0.68rem] font-medium tracking-[0.22em] text-ember uppercase">Today</p>
        <h1 className="mt-4 font-serif text-[2.85rem] leading-[0.98] tracking-[-0.03em] text-balance text-foreground sm:text-6xl">
          Reading desk
        </h1>
        <p className="mt-4 max-w-[34rem] font-serif text-xl leading-snug text-pretty text-foreground/90 sm:text-[1.65rem]">
          Three articles for the work in front of you.
        </p>
        <VisitorClock />
      </header>

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

      <div className="mt-8">
        <div className="desk-filter">
          <div className="min-w-0 flex-1">
            <CategorySelect value={view} onValueChange={choose} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 min-h-10 min-w-10 shrink-0 rounded-xl px-0 text-ember"
            aria-label="Refresh articles"
            title={searchOpen || canRotate ? "Refresh articles" : "No other articles in this category"}
            disabled={!searchOpen && !canRotate}
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
      </div>

      {answer ? (
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">Matches for “{asked}” across the whole library</p>
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
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{viewLine}</p>
      )}

      <div aria-live="polite" data-blog-count={answer?.kind === "reads" ? answer.articles.length : shown.length} data-category={view} data-day={today}>
        {answer?.kind === "none" ? (
          <EmptyState kicker="No match" title="Nothing in the library fits." body={answer.text} />
        ) : null}
        {answer?.kind === "reads" ? (
          <ol className="mt-4 flex list-none flex-col gap-4 p-0">
            {answer.articles.map((article, index) => (
              <ArticleItem key={article.id} article={article} number={String(index + 1).padStart(2, "0")} primary={index === 0} />
            ))}
          </ol>
        ) : null}
        {!answer ? (
          <>
            {!ready ? <EmptyState kicker="Loading" title="Choosing three reads." body="The desk is lining up today’s articles." /> : null}
            {ready && shown.length === 0 && hiddenHere > 0 ? (
              <EmptyState
                kicker="Skipped"
                title="Nothing left on this desk."
                body="You skipped the articles for this category. Restore them, or refresh for the next set."
              />
            ) : null}
            {ready && shown.length === 0 && hiddenHere === 0 ? (
              <EmptyState
                kicker="Empty"
                title="No article is ready for this category."
                body="Refresh the desk. Nothing is invented to fill a gap."
              />
            ) : null}
            {ready && shown.length > 0 ? (
              <ol className="mt-4 flex list-none flex-col gap-4 p-0">
                {shown.map((article, index) => (
                  <ArticleItem
                    key={article.id}
                    article={article}
                    number={String(index + 1).padStart(2, "0")}
                    primary={index === 0}
                    useful={usefulIds.includes(article.id)}
                    onSkip={() => skip(article.id)}
                    onUseful={() => markUseful(article.id)}
                  />
                ))}
              </ol>
            ) : null}
          </>
        ) : null}
      </div>

      <p className="mt-14 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Articles are retrieved from the approved sources and judged from their titles and excerpts. The desk does not invent a title, and it does not sign in to a model. The three stay put for the India calendar day unless you refresh.
      </p>
    </main>
  );
}

function CategorySelect({ value, onValueChange }: { value: CategoryId; onValueChange: (next: CategoryId) => void }) {
  return (
    <Select.Root
      items={categoryItems}
      value={value}
      modal={false}
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
          <Select.Popup className="box-border w-[min(var(--available-width),max(var(--anchor-width),22rem))] max-w-[var(--available-width)] origin-[var(--transform-origin)] rounded-xl border border-border bg-[#231f1b] text-foreground shadow-[inset_0_1px_0_rgba(255,236,214,0.06),0_18px_40px_-24px_rgba(0,0,0,0.9)] outline-none transition-[opacity,transform] duration-100 ease-out data-[closed]:pointer-events-none data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
            <Select.List className="max-h-[min(24rem,var(--available-height))] overflow-y-auto overscroll-contain p-1.5 [scrollbar-color:#e0b08a_transparent] [scrollbar-width:thin]">
              {categories.map((category) => (
                <Select.Item
                  key={category.id}
                  value={category.id}
                  className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm leading-snug text-foreground outline-none select-none data-[highlighted]:bg-foreground/8 data-[selected]:bg-ember/12 data-[selected]:text-ember"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <Select.ItemIndicator>
                      <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
                    </Select.ItemIndicator>
                  </span>
                  <Select.ItemText className="min-w-0 flex-1 whitespace-normal">{category.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
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
        {article.explanation.focus ? (
          <p className="mt-3 max-w-[36rem] text-sm leading-relaxed text-muted-foreground">{article.explanation.focus}</p>
        ) : null}
        <p className="mt-3 text-xs tracking-wide text-muted-foreground uppercase">
          {article.evidence === "full_text" ? "Read in full" : "Assessed from the excerpt"}
        </p>
        {onSkip && onUseful ? (
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl px-3 text-muted-foreground"
              aria-pressed={useful}
              onClick={onUseful}
            >
              {useful ? "Useful" : "Mark useful"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-10 rounded-xl px-3 text-muted-foreground" onClick={onSkip}>
              Skip
            </Button>
          </div>
        ) : null}
      </article>
    </li>
  );
}
