"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { pieces, publicationName } from "@/lib/catalog";
import { matches, selectDesk, views, type DeskView } from "@/lib/desk";

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

export function Desk({ dateLabel }: { dateLabel: string }) {
  const [view, setView] = useState<DeskView>("best");
  const [page, setPage] = useState(0);
  const [skipped, setSkipped] = useState<string[] | null>(null);

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

  return (
    <main className="mx-auto w-full max-w-[42rem] px-5 py-10 sm:px-8 sm:py-16">
      <header className="border-b border-border pb-8">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Today</p>
        <h1 className="mt-3 font-serif text-[2.75rem] leading-[0.95] tracking-[-0.03em] text-balance sm:text-6xl">
          Reading desk
        </h1>
        <p className="mt-4 max-w-[34rem] font-serif text-xl leading-snug text-pretty sm:text-2xl">
          Three pieces for the work in front of you.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">{dateLabel}</p>
      </header>

      <div className="mt-8">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Work in front of you">
          {views.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={item.id === view ? "default" : "outline"}
              aria-pressed={item.id === view}
              onClick={() => choose(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {hiddenCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={restore}>
              Restore skipped
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => setPage((current) => current + 1)}>
            Next three
          </Button>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">{viewLine}</p>

      <div aria-live="polite" data-piece-count={desk.shown.length}>
        {desk.note ? <p className="mt-6 max-w-[36rem] text-base leading-relaxed">{desk.note}</p> : null}

        {desk.shown.length > 0 ? (
          <ol className="mt-2">
            {desk.shown.map((piece, index) => {
              const primary = index === 0;
              const number = String((page % desk.pages) * 3 + index + 1).padStart(2, "0");
              return (
                <li
                  key={piece.id}
                  className={primary ? "pt-8 pb-10" : "border-t border-border py-8"}
                  data-piece-id={piece.id}
                >
                  <article>
                    <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">{number}</p>
                    <h2
                      className={
                        primary
                          ? "mt-3 font-serif text-[2.15rem] leading-[1.05] tracking-[-0.03em] text-balance sm:text-5xl"
                          : "mt-3 font-serif text-[1.65rem] leading-tight tracking-[-0.02em] text-balance"
                      }
                    >
                      <a
                        href={piece.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {piece.title}
                      </a>
                    </h2>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {piece.by}
                      <span aria-hidden="true"> · </span>
                      <span>{publicationName(piece.publicationId)}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{piece.minutes} min</span>
                    </p>

                    <div className={primary ? "mt-6 space-y-5" : "mt-5 space-y-4"}>
                      <div>
                        <h3 className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                          Why it is here
                        </h3>
                        <p
                          className={
                            primary
                              ? "mt-2 font-serif text-lg leading-snug text-pretty sm:text-xl"
                              : "mt-2 text-base leading-relaxed text-pretty"
                          }
                        >
                          {piece.why}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                          Line for the file
                        </h3>
                        <p className="mt-2 text-base leading-relaxed text-pretty">{piece.gives}</p>
                      </div>
                      <div>
                        <h3 className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                          Leave out
                        </h3>
                        <p className="mt-2 text-base leading-relaxed text-pretty">{piece.leaveOut}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs break-all text-muted-foreground">{piece.url}</p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <Button
                        variant="link"
                        nativeButton={false}
                        className="h-auto px-0"
                        render={<a href={piece.url} target="_blank" rel="noopener noreferrer" />}
                      >
                        Open the piece
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => skip(piece.id)}>
                        Skip
                      </Button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>

      <p className="mt-12 border-t border-border pt-4 text-xs text-muted-foreground">
        This page reads the shelf in the browser. It does not sign in to Cursor.
      </p>
    </main>
  );
}
