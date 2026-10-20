"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { SHOW_NAME, durationLabel, episodeHref, episodeLabel, episodeNumber, episodes } from "@/data/episodes";

/* "More from First Take": the archive as a row of thin physical cases.
   Native horizontal scrolling (trackpad, shift+wheel, touch swipe) plus mouse
   drag. Each case's angle and depth is a continuous function of its distance
   from the centre of the row, written as CSS variables on scroll. */
export function MoreFromFirstTake({ current }: { current: string }) {
  const trackRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const items = Array.from(track.children) as HTMLElement[];
    let raf = 0;

    const update = () => {
      raf = 0;
      const box = track.getBoundingClientRect();
      const centre = box.left + box.width / 2;
      for (const item of items) {
        const r = item.getBoundingClientRect();
        const d = Math.max(-1.6, Math.min(1.6, (r.left + r.width / 2 - centre) / r.width));
        item.style.setProperty("--d", d.toFixed(3));
        item.style.setProperty("--ad", Math.abs(d).toFixed(3));
        item.classList.toggle("is-centre", Math.abs(d) < 0.35);
      }
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // Open with the current episode in the centre.
    const active = items.find((item) => item.dataset.slug === current);
    if (active) track.scrollLeft = active.offsetLeft + active.offsetWidth / 2 - track.clientWidth / 2;
    update();

    /* Mouse drag. Touch and pens keep native scrolling. */
    let drag: { x: number; left: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) {
        drag.moved = true;
        track.classList.add("is-dragging");
        track.setPointerCapture(e.pointerId);
      }
      if (drag.moved) track.scrollLeft = drag.left - dx;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      track.classList.remove("is-dragging");
      if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
      if (moved) {
        // Swallow the click that ends a drag so it doesn't navigate.
        const swallow = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        track.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => track.removeEventListener("click", swallow, { capture: true }), 0);
      }
    };

    track.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      track.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
    };
  }, [current]);

  return (
    <section className="ep-more" aria-labelledby="ep-more-title">
      <div className="page-section ep-more__head">
        <h2 id="ep-more-title" className="ep-section-title">
          More from First Take
        </h2>
      </div>
      <ol ref={trackRef} className="ep-more__track" aria-label={`${SHOW_NAME} episodes`}>
        {episodes.map((e) => {
          const isCurrent = e.slug === current;
          return (
            <li key={e.slug} className="ep-case" data-slug={e.slug}>
              <Link
                href={episodeHref(e)}
                className="ep-case__link"
                draggable={false}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`${episodeLabel(e)}: ${e.title}${e.guest ? `, with ${e.guest}` : ""}, ${durationLabel(e.duration)}${isCurrent ? " (now viewing)" : ""}`}
              >
                <span className="ep-case__body">
                  <span className="ep-case__spine" aria-hidden>
                    <span>{episodeNumber(e)}</span>
                  </span>
                  <span className="ep-case__cover">
                    <Image src={e.thumbnail} alt="" fill sizes="(max-width: 640px) 78vw, 420px" draggable={false} />
                  </span>
                </span>
                <span className="ep-case__meta" aria-hidden>
                  EP. {episodeNumber(e)} · {e.duration}
                  {isCurrent && <span className="ep-case__now"> · Now viewing</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
