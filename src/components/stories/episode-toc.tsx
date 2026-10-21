"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

/* "In this episode": sticky contents for the episode notes, built from the
   article's sections. Highlights the section being read, scrolls to a section
   below the sticky header, and shows reading progress across the article only.
   Below 1024px it collapses into one compact sticky control. */

type Item = { id: string; label: string };

const REDUCED = "(prefers-reduced-motion: reduce)";
const DESKTOP = 1024;

/** Everything pinned above the article: the site header plus the "Back to First Take" row. */
function headerHeight() {
  const header = document.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().height ?? 72;
  const back = document.querySelector<HTMLElement>(".ep-back")?.getBoundingClientRect().height ?? 0;
  return header + back;
}

/** Where a jumped-to section's heading lands: just under the header (and the mobile contents bar). */
function landingOffset() {
  return headerHeight() + (window.innerWidth < DESKTOP ? 88 : 32);
}

/** A section is "being read" once its heading is in the upper part of the viewport. */
function readingLine() {
  return landingOffset() + Math.min(160, window.innerHeight * 0.18);
}

export function EpisodeToc({ items, articleId }: { items: Item[]; articleId: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const article = document.getElementById(articleId);
    const sections = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el !== null);
    let frame = 0;

    const update = () => {
      frame = 0;
      const line = readingLine();
      let current = sections[0]?.id ?? "";
      for (const section of sections) if (section.getBoundingClientRect().top <= line) current = section.id;
      setActive(current);
      if (article) {
        const rect = article.getBoundingClientRect();
        const start = rect.top + window.scrollY - line;
        const end = rect.bottom + window.scrollY - window.innerHeight;
        const value = (window.scrollY - start) / Math.max(1, end - start);
        setProgress(Math.round(100 * Math.min(1, Math.max(0, value))));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const resize = new ResizeObserver(schedule);
    if (article) resize.observe(article);
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items, articleId]);

  // Keep the active entry visible inside a long contents list.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!list || !item || list.scrollHeight <= list.clientHeight) return;
    const box = list.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    if (itemBox.top < box.top + 24) list.scrollTop -= box.top + 24 - itemBox.top;
    else if (itemBox.bottom > box.bottom - 24) list.scrollTop += itemBox.bottom - box.bottom + 24;
  }, [active]);

  const go = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (mobileRef.current) mobileRef.current.open = false;
    history.replaceState(null, "", `#${id}`);
    const top = target.getBoundingClientRect().top + window.scrollY - landingOffset();
    window.scrollTo({ top, behavior: window.matchMedia(REDUCED).matches ? "auto" : "smooth" });
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  };

  const links = (
    <ol className="ep-toc__list">
      {items.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} aria-current={active === item.id ? "location" : undefined} onClick={(event) => go(event, item.id)}>
            {item.label}
          </a>
        </li>
      ))}
    </ol>
  );

  const current = items.find((item) => item.id === active)?.label ?? items[0]?.label;

  return (
    <>
      <div className="ep-progress" role="progressbar" aria-label="Reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <aside className="ep-toc" aria-label="In this episode">
        <div ref={listRef} className="ep-toc__desktop">
          <p className="ep-toc__title">In this episode</p>
          <nav aria-label="Episode sections">{links}</nav>
        </div>
        <details ref={mobileRef} className="ep-toc__mobile">
          <summary>
            <span>
              <span className="ep-toc__title">In this episode</span>
              <span className="ep-toc__current">{current}</span>
            </span>
            <b aria-hidden>+</b>
          </summary>
          <nav aria-label="Episode sections">{links}</nav>
        </details>
      </aside>
    </>
  );
}
