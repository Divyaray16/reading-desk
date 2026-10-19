"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ask, type AskResult } from "@/lib/ask";
import { pieces, publicationName, type Piece } from "@/lib/catalog";
import { matches, selectDesk, views, type DeskView } from "@/lib/desk";
import { visitorLocalLabel } from "@/lib/local-time";

const SKIP_KEY = "reading-desk-skips";

function readSkips(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SKIP_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
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
  const [view, setView] = useState<DeskView>("best");
  const [page, setPage] = useState(0);
  const [skipped, setSkipped] = useState<string[] | null>(null);
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState<AskResult | null>(null);

  useEffect(() => {
    setSkipped(readSkips());
  }, []);

  useEffect(() => {
    if (skipped === null) return;
    window.localStorage.setItem(SKIP_KEY, JSON.stringify(skipped));
  }, [skipped]);

  const skipIds = skipped ?? [];
  const desk = selectDesk(view, skipIds, page);
  const viewLine = views.find((item) => item.id === view)?.line ?? "";
  const hiddenCount = skipIds.filter((id) => {
    const piece = pieces.find((item) => item.id === id);
    return piece ? matches(piece, view) : false;
  }).length;

  function choose(next: DeskView) {
    setView(next);
    setPage(0);
  }

  function skip(id: string) {
    setSkipped((current) => {
      const base = current ?? readSkips();
      if (base.includes(id)) return base;
      return [...base, id];
    });
  }

  function restore() {
    setSkipped((current) => {
      const base = current ?? readSkips();
      return base.filter((id) => {
        const piece = pieces.find((item) => item.id === id);
        return piece ? !matches(piece, view) : true;
      });
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setAnswer(ask(question));
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-[42rem] px-5 py-12 sm:px-8 sm:py-16">
      <header className="border-b border-border pb-8">
        <p className="text-[0.68rem] font-medium tracking-[0.22em] text-ember uppercase">Today</p>
        <h1 className="mt-4 font-serif text-[2.85rem] leading-[0.98] tracking-[-0.03em] text-balance text-foreground sm:text-6xl">
          Reading desk
        </h1>
        <p className="mt-4 max-w-[34rem] font-serif text-xl leading-snug text-pretty text-foreground/90 sm:text-[1.65rem]">
          Three pieces for the work in front of you.
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
              placeholder="give me an AI UX blog"
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
        {answer ? <Answer answer={answer} /> : null}
      </section>

      <div className="mt-10">
        <div className="desk-topics" role="group" aria-label="Work in front of you">
          {views.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={item.id === view ? "default" : "ghost"}
              aria-pressed={item.id === view}
              onClick={() => choose(item.id)}
              className={
                item.id === view
                  ? "h-11 rounded-[0.7rem] px-3.5 text-sm shadow-none"
                  : "h-11 rounded-[0.7rem] px-3.5 text-sm text-muted-foreground shadow-none hover:bg-foreground/8 hover:text-foreground"
              }
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {hiddenCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="h-11 rounded-xl px-3 text-muted-foreground" onClick={restore}>
              Restore skipped
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-border bg-card px-4 shadow-none hover:bg-foreground/8"
            onClick={() => setPage((current) => current + 1)}
          >
            Next three
          </Button>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{viewLine}</p>

      <div aria-live="polite" data-piece-count={desk.shown.length}>
        {desk.note ? <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-foreground">{desk.note}</p> : null}

        {desk.shown.length > 0 ? (
          <ol className="mt-5 flex list-none flex-col gap-4 p-0">
            {desk.shown.map((piece, index) => {
              const primary = index === 0;
              const number = String((page % desk.pages) * 3 + index + 1).padStart(2, "0");
              return (
                <PieceItem
                  key={piece.id}
                  piece={piece}
                  number={number}
                  primary={primary}
                  onSkip={() => skip(piece.id)}
                />
              );
            })}
          </ol>
        ) : null}
      </div>

      <p className="mt-14 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        This page reads the shelf in the browser. Ask on this page. It does not sign in to Cursor.
      </p>
    </main>
  );
}

function Answer({ answer }: { answer: AskResult }) {
  if (answer.kind === "none") {
    return (
      <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-foreground" data-ask-answer="none" aria-live="polite">
        {answer.text}
      </p>
    );
  }

  if (answer.kind === "advice") {
    return (
      <div className="mt-5" data-ask-answer="advice" aria-live="polite">
        <p className="max-w-[36rem] font-serif text-lg leading-snug text-pretty text-foreground sm:text-xl">{answer.text}</p>
        <div className="desk-card mt-4 space-y-4 px-5 py-4">
          {answer.pieces.map((piece) => (
            <div key={piece.id} className="min-w-0 border-t border-border pt-4 first:border-t-0 first:pt-0">
              <p>
                <a
                  href={piece.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-serif text-lg leading-snug text-foreground underline-offset-[0.14em] hover:underline focus-visible:underline"
                >
                  {piece.title}
                </a>
              </p>
              <p className="mt-2 text-xs break-all text-muted-foreground">{piece.url}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5" data-ask-answer="reads" aria-live="polite">
      <p className="text-[0.68rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">From the shelf</p>
      <ol className="mt-4 flex list-none flex-col gap-4 p-0">
        {answer.pieces.map((piece, index) => (
          <PieceItem
            key={piece.id}
            piece={piece}
            number={String(index + 1).padStart(2, "0")}
            primary={index === 0}
          />
        ))}
      </ol>
    </div>
  );
}

function PieceItem({
  piece,
  number,
  primary,
  onSkip,
}: {
  piece: Piece;
  number: string;
  primary: boolean;
  onSkip?: () => void;
}) {
  return (
    <li className="min-w-0 list-none" data-piece-id={piece.id}>
      <article className={primary ? "desk-card desk-card-lead min-w-0 px-5 py-6 sm:px-7 sm:py-7" : "desk-card min-w-0 px-5 py-6 sm:px-7 sm:py-7"}>
        <p
          className={
            primary
              ? "text-[0.68rem] font-medium tracking-[0.18em] text-ember uppercase"
              : "text-[0.68rem] font-medium tracking-[0.18em] text-muted-foreground uppercase"
          }
        >
          {number}
        </p>
        <h2
          className={
            primary
              ? "mt-3 font-serif text-[1.85rem] leading-[1.12] tracking-[-0.025em] text-balance text-foreground sm:text-[2.35rem]"
              : "mt-3 font-serif text-[1.45rem] leading-snug tracking-[-0.02em] text-balance text-foreground sm:text-[1.7rem]"
          }
        >
          <a
            href={piece.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-[0.14em] hover:underline focus-visible:underline"
          >
            {piece.title}
          </a>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {piece.by}
          <span aria-hidden="true"> · </span>
          <span>{publicationName(piece.publicationId)}</span>
          <span aria-hidden="true"> · </span>
          <span>{piece.minutes} min</span>
        </p>

        <div className={primary ? "mt-6 space-y-5" : "mt-5 space-y-4"}>
          <div>
            <h3 className="text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">Why it is here</h3>
            <p
              className={
                primary
                  ? "mt-2 font-serif text-lg leading-snug text-pretty text-foreground sm:text-xl"
                  : "mt-2 text-base leading-relaxed text-pretty text-foreground"
              }
            >
              {piece.why}
            </p>
          </div>
          <div>
            <h3 className="text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">Line for the file</h3>
            <p className="mt-2 text-base leading-relaxed text-pretty text-foreground">{piece.gives}</p>
          </div>
          <div>
            <h3 className="text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">Leave out</h3>
            <p className="mt-2 text-base leading-relaxed text-pretty text-foreground">{piece.leaveOut}</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed break-all text-muted-foreground">{piece.url}</p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button
            variant="link"
            nativeButton={false}
            className="h-auto px-0 text-[0.95rem] text-foreground"
            render={<a href={piece.url} target="_blank" rel="noopener noreferrer" />}
          >
            Open the piece
          </Button>
          {onSkip ? (
            <Button type="button" variant="ghost" size="sm" className="h-10 rounded-xl px-3 text-muted-foreground" onClick={onSkip}>
              Skip
            </Button>
          ) : null}
        </div>
      </article>
    </li>
  );
}
