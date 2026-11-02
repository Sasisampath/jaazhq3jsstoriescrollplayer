"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { TOPICS, durationLabel, embedUrl, isoDuration, type Topic } from "@/data/episodes";
import { COLLECTION_LABEL, consoleMedia, type ConsoleMedia } from "@/data/media";
import { markNotesFromConsole } from "./back-to-first-take";
import { searchStories } from "./stories-search";
import { STORY_KEY, writeSession } from "./stories-session";

/* The Gallery view: the same consoleMedia as the 3D console, as ordinary
   scrolling HTML. FIRST TAKE is the large two-column feature; MORE STORIES is a
   denser grid. A thumbnail plays the video in an overlay (no 3D player involved);
   the iframe only exists while the overlay is open. */

const firstTake = consoleMedia.filter((m) => m.collection === "first-take");
const moreStories = consoleMedia.filter((m) => m.collection === "more-stories");

const kicker = (item: ConsoleMedia) => (item.episode ? `EP. ${item.spineMark} · ${item.duration}` : item.duration);

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

function Card({ item, lead, eager, onPlay }: { item: ConsoleMedia; lead: boolean; eager: boolean; onPlay: (item: ConsoleMedia, trigger: HTMLElement) => void }) {
  const spoken = `${item.title}${item.guest ? `, with ${item.guest}` : ""}, ${durationLabel(item.duration)}`;
  return (
    <article className={`st-g-card${lead ? " st-g-card--lead" : ""}`}>
      <button type="button" className="st-g-thumb" onClick={(event) => onPlay(item, event.currentTarget)} aria-label={`Play: ${spoken}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumbnail} alt="" width={1280} height={720} loading={eager ? "eager" : "lazy"} decoding="async" />
        <span className="st-g-play">
          <PlayGlyph />
        </span>
        <span className="st-g-dur" aria-hidden>
          {item.duration}
        </span>
      </button>
      <div className="st-g-meta">
        {item.episode ? (
          <p className="st-g-kicker">
            <time dateTime={isoDuration(item.duration)}>{kicker(item)}</time>
          </p>
        ) : (
          <time className="st-sr-only" dateTime={isoDuration(item.duration)}>
            {durationLabel(item.duration)}
          </time>
        )}
        <h3 className="st-g-title">{item.title}</h3>
        {item.guest && <p className="st-g-guest">{item.guest}</p>}
        {item.href && (
          <Link className="st-g-notes" href={item.href} onClick={() => markNotesFromConsole(item.key)}>
            Read episode notes <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </article>
  );
}

function VideoOverlay({ item, onClose }: { item: ConsoleMedia; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Hold the page still behind the overlay (and keep its width, so nothing shifts).
    const body = document.body;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    const before = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("a[href], button, iframe") ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = before.overflow;
      body.style.paddingRight = before.paddingRight;
    };
  }, [onClose]);

  return createPortal(
    <div className="st-modal" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={panelRef} className="st-modal__panel" role="dialog" aria-modal="true" aria-label={item.title}>
        <button ref={closeRef} type="button" className="st-modal__close" onClick={onClose} aria-label="Close video">
          <X size={20} strokeWidth={1.75} aria-hidden />
        </button>
        <div className="st-modal__frame">
          <iframe
            src={embedUrl(item)}
            title={item.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="st-modal__meta">
          <div>
            <p className="st-g-kicker">{kicker(item)}</p>
            <p className="st-modal__title">{item.title}</p>
            {item.guest && <p className="st-g-guest">{item.guest}</p>}
          </div>
          {item.href && (
            <Link className="st-modal__notes" href={item.href} onClick={() => markNotesFromConsole(item.key)}>
              Read episode notes <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function StoriesGallery() {
  const [playing, setPlaying] = useState<ConsoleMedia | null>(null);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const play = useCallback((item: ConsoleMedia, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    // The 3D console opens with this story loaded if the visitor switches over.
    writeSession(STORY_KEY, String(consoleMedia.indexOf(item)));
    setPlaying(item);
  }, []);

  const close = useCallback(() => {
    setPlaying(null);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setTopic(null);
  }, []);

  const term = query.trim();
  const filtering = term !== "" || topic !== null;
  const results = useMemo(() => (filtering ? searchStories(term, topic) : []), [filtering, term, topic]);
  const count = `${results.length} ${results.length === 1 ? "story" : "stories"}`;
  const resultsTitle = topic && term ? `${topic} · “${term}”` : topic ? topic : `Results for “${term}”`;

  return (
    <section className="st-gallery" aria-labelledby="st-gallery-title">
      <header className="st-gallery__head">
        <h1 id="st-gallery-title" className="st-gallery__title">
          Stories
        </h1>
        <p>Conversations worth watching.</p>
      </header>

      <div className="st-find">
        <form className="st-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <Search className="st-search__icon" size={18} strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                setQuery("");
              }
            }}
            placeholder="Search stories, guests or topics..."
            aria-label="Search stories, guests or topics"
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button type="button" className="st-search__clear" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          )}
        </form>
        <div className="st-chips" role="group" aria-label="Filter by topic">
          {[null, ...TOPICS].map((value) => (
            <button key={value ?? "all"} type="button" className="st-chip" aria-pressed={topic === value} onClick={() => setTopic(value)}>
              {value ?? "All"}
            </button>
          ))}
        </div>
      </div>

      {filtering ? (
        <section className="st-g-section st-g-results" aria-labelledby="st-g-results">
          {results.length > 0 ? (
            <>
              <div className="st-g-section__head">
                <h2 id="st-g-results">{resultsTitle}</h2>
                <span className="st-g-section__rule" aria-hidden />
                <span className="st-g-section__count" role="status">
                  {count}
                </span>
              </div>
              <button type="button" className="st-g-clear" onClick={clear}>
                Clear filters
              </button>
              <ol className="st-g-grid st-g-grid--more">
                {results.map((item) => (
                  <li key={item.key}>
                    <Card item={item} lead={false} eager={false} onPlay={play} />
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div className="st-g-empty" role="status">
              <h2 id="st-g-results">No stories found.</h2>
              <p>Try another search or topic.</p>
              <button type="button" className="st-g-clear" onClick={clear}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          {firstTake.length > 0 && (
            <section className="st-g-section" aria-labelledby="st-g-first-take">
              <div className="st-g-section__head">
                <h2 id="st-g-first-take">{COLLECTION_LABEL["first-take"]}</h2>
                <span className="st-g-section__rule" aria-hidden />
                <span className="st-g-section__count">{firstTake.length} episodes</span>
              </div>
              <ol className="st-g-grid st-g-grid--lead">
                {firstTake.map((item, i) => (
                  <li key={item.key}>
                    <Card item={item} lead eager={i < 2} onPlay={play} />
                  </li>
                ))}
              </ol>
            </section>
          )}

          {moreStories.length > 0 && (
            <section className="st-g-section" aria-labelledby="st-g-more">
              <div className="st-g-section__head">
                <h2 id="st-g-more">{COLLECTION_LABEL["more-stories"]}</h2>
                <span className="st-g-section__rule" aria-hidden />
                <span className="st-g-section__count">{moreStories.length} stories</span>
              </div>
              <ol className="st-g-grid st-g-grid--more">
                {moreStories.map((item) => (
                  <li key={item.key}>
                    <Card item={item} lead={false} eager={false} onPlay={play} />
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      {playing && <VideoOverlay item={playing} onClose={close} />}
    </section>
  );
}
