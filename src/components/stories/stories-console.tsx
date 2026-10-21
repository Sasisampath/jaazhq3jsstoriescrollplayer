"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { SHOW_TITLE, embedUrl, watchUrl } from "@/data/episodes";
import { COLLECTION_LABEL, consoleMedia, type ConsoleMedia } from "@/data/media";
import type { ScreenRect, StoriesScene } from "./stories-console-scene";
import { markNotesFromConsole } from "./back-to-first-take";

/* FIRST TAKE — BY JAZZHQ: one console, driven by scroll.
   The tall track is only a scroll distance; the stage stays sticky inside it and
   scroll progress alone decides the camera (full console → FIRST TAKE shelf →
   both shelves → player → screen). Choosing a case is the one thing the visitor
   "does": it travels into the player and the screen rises. The first time the
   FIRST TAKE shelf is in focus, one case nudges forward and a small caption
   says it can be previewed; both go away once the visitor has tried it. Every
   case also exists as a real button for keyboards and screen readers. */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const TALL_BELOW = 0.85; // stage aspect under which the portrait camera path is used
const STORAGE_KEY = "jazzhq-stories-episode";
const NUDGED_KEY = "first-take:nudged";
const TOUCH_QUERY = "(hover: none), (pointer: coarse)";

const media = consoleMedia;
const firstTake = media.filter((m) => m.collection === "first-take");
const moreConversations = media.filter((m) => m.collection === "more-conversations");
/** The case that nudges: the outermost FIRST TAKE case, where it's easiest to notice. */
const NUDGE_INDEX = media.indexOf(firstTake[firstTake.length - 1]);
/** Already in the player when the page opens, so the console reads as a working player.
    This is a demo state, not the visitor's choice. */
const DEFAULT_INDEX = Math.max(0, media.findIndex((m) => m.episode?.episode === 2));

/* Until the visitor deliberately selects a case, the journey holds at the
   FIRST TAKE shelf: the scroll track is shortened (in CSS) so the page simply
   ends there, and scene progress is clamped to the same point. Selecting a case
   restores the full track and the rest of the journey (screen, footer). */
const CHECKPOINT = { wide: 0.3, tall: 0.28 } as const;

type Guide = "preview" | "select" | "done";

/* Scroll ranges in which each shelf caption shows (see the camera path in the scene). */
const SHELF_RANGES = {
  wide: { right: [0.16, 0.55], left: [0.42, 0.55], nudgeAt: 0.25 },
  tall: { right: [0.16, 0.36], left: [0.38, 0.52], nudgeAt: 0.2 },
} as const;

function flag(key: string) {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setFlag(key: string) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Storage blocked: the hint may show again on the next visit.
  }
}

const inRange = (p: number, [a, b]: readonly [number, number]) => p >= a && p <= b;

type Hint = "explore" | "choose" | "screen" | null;

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function readSaved(): number | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const index = raw === null ? NaN : Number(raw);
    return Number.isInteger(index) && index >= 0 && index < media.length ? index : null;
  } catch {
    return null;
  }
}

function save(index: number | null) {
  try {
    if (index === null) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, String(index));
  } catch {
    // Storage blocked: selection just isn't remembered.
  }
}

export function StoriesConsole() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const rightShelfRef = useRef<HTMLDivElement>(null);
  const leftShelfRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<Guide>("preview");
  const userSelectedRef = useRef(false);
  const sceneRef = useRef<StoriesScene | null>(null);
  const progressRef = useRef(0);
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
  const [webgl, setWebgl] = useState<"pending" | "ready" | "failed">("pending");
  const [selected, setSelected] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<number | null>(null);
  const [screenUp, setScreenUp] = useState(false);
  const [playing, setPlaying] = useState(false);
  // "Watch" first moves the camera to the canonical square-on view; the player mounts only once it arrives.
  const [watchPending, setWatchPending] = useState(false);
  const viewingRef = useRef(false);

  const watch = useCallback(() => {
    const scene = sceneRef.current;
    if (viewingRef.current) return;
    viewingRef.current = true;
    if (!scene) {
      setPlaying(true);
      return;
    }
    setWatchPending(true);
    scene.view(true, () => {
      if (!viewingRef.current) return;
      setWatchPending(false);
      setPlaying(true);
    });
  }, []);

  // Exit video (or anything that ends playback): unmount the player and give the camera back to scroll.
  const stopWatching = useCallback(() => {
    if (!viewingRef.current) return;
    viewingRef.current = false;
    setWatchPending(false);
    setPlaying(false);
    sceneRef.current?.view(false);
  }, []);
  const [hint, setHint] = useState<Hint>("explore");
  const [hovered, setHovered] = useState<number | null>(null);
  const [guide, setGuide] = useState<Guide>("preview");
  const [userSelected, setUserSelected] = useState(false);
  const [tallLayout, setTallLayout] = useState(false);
  const touch = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );

  // Shelf guidance: "Hover/Tap a case to preview" → after a preview "Select an episode to continue" → gone once chosen.
  const advanceGuide = useCallback((next: Guide) => {
    const order: Guide[] = ["preview", "select", "done"];
    if (order.indexOf(next) <= order.indexOf(guideRef.current)) return;
    guideRef.current = next;
    setGuide(next);
  }, []);

  const selectedRef = useRef(selected);
  const loadedRef = useRef(loaded);
  useEffect(() => {
    selectedRef.current = selected;
    loadedRef.current = loaded;
  }, [selected, loaded]);

  const mode = webgl === "failed" ? "static" : reduced ? "reduced" : "scroll";

  // Only a deliberate click, tap or key press lands here; it unlocks the rest of the journey.
  const choose = useCallback(
    (index: number) => {
      advanceGuide("done");
      userSelectedRef.current = true;
      setUserSelected(true);
      stopWatching();
      save(index);
      if (index === selectedRef.current) {
        sceneRef.current?.acknowledge(); // already in the player: just a status-light nod
        return;
      }
      setSelected(index);
      sceneRef.current?.select(index);
    },
    [advanceGuide, stopWatching],
  );

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!track || !sticky || !stage || !canvas) return;

    let cancelled = false;
    let started = false;
    let raf = 0;
    let lastHint: Hint = "explore";
    let nudged = flag(NUDGED_KEY);
    let nudgeTimer = 0;

    const updateHint = (p: number, isTall: boolean) => {
      let next: Hint = null;
      if (reduced) next = null;
      else if (p < 0.04) next = "explore";
      else if (!userSelectedRef.current) next = isTall ? "choose" : null;
      else if (loadedRef.current !== null) next = p < 0.66 ? "screen" : null;
      else if (selectedRef.current === null && isTall && p > 0.16 && p < 0.52) next = "choose";
      if (next !== lastHint) {
        lastHint = next;
        setHint(next);
      }
    };

    const sync = () => {
      raf = 0;
      // Progress is always measured against the full track, so it carries straight on when the lock lifts.
      const fullHeight = probeRef.current?.offsetHeight || track.offsetHeight;
      const range = fullHeight - sticky.offsetHeight;
      const top = parseFloat(getComputedStyle(sticky).top) || 0;
      const isTallNow = stage.clientWidth / Math.max(1, stage.clientHeight) < TALL_BELOW;
      const cap = !reduced && !userSelectedRef.current ? CHECKPOINT[isTallNow ? "tall" : "wide"] : 1;
      const p = range > 0 ? Math.min(cap, Math.max(0, (top - track.getBoundingClientRect().top) / range)) : 0;
      progressRef.current = p;
      sceneRef.current?.setProgress(p);
      const head = headRef.current;
      if (head && !reduced) {
        const fade = Math.min(1, p / 0.09);
        head.style.opacity = String(1 - fade);
        head.style.transform = `translate3d(0, ${-fade * 48}px, 0)`;
      }
      const isTall = stage.clientWidth / Math.max(1, stage.clientHeight) < TALL_BELOW;
      updateHint(p, isTall);
      const ranges = SHELF_RANGES[isTall ? "tall" : "wide"];
      const showShelves = !reduced;
      rightShelfRef.current?.classList.toggle("is-shown", showShelves && inRange(p, ranges.right));
      leftShelfRef.current?.classList.toggle("is-shown", showShelves && inRange(p, ranges.left));
      // The first arrival at the FIRST TAKE shelf: one case leans out once, after a beat.
      if (!reduced && !nudged && sceneRef.current && p >= ranges.nudgeAt && p <= ranges.right[1]) {
        nudged = true;
        setFlag(NUDGED_KEY);
        if (guideRef.current === "preview") nudgeTimer = window.setTimeout(() => sceneRef.current?.nudge(NUDGE_INDEX), 900);
      }
    };
    const requestSync = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };

    const fit = () => {
      const { width, height } = stage.getBoundingClientRect();
      const isTall = width / Math.max(1, height) < TALL_BELOW;
      setTallLayout(isTall);
      const scene = sceneRef.current;
      if (!scene) return;
      scene.setLayout(isTall ? "tall" : "wide");
      scene.resize(width, height);
      requestSync();
    };

    const onScreen = (rect: ScreenRect | null) => {
      const el = screenRef.current;
      const usable = rect !== null && rect.top >= -4 && rect.width >= 200;
      if (el && rect && usable) {
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.top}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
      }
      setScreenUp(usable);
      if (!usable && !viewingRef.current) setPlaying(false);
    };

    const start = async () => {
      if (!hasWebGL()) {
        setWebgl("failed");
        return;
      }
      try {
        const { createStoriesScene } = await import("./stories-console-scene");
        const scene = await createStoriesScene(canvas, {
          items: media,
          onScreen,
          onShelfAnchors: ({ left, right }) => {
            for (const [el, point] of [
              [leftShelfRef.current, left],
              [rightShelfRef.current, right],
            ] as const) {
              if (!el) continue;
              if (point) {
                el.style.left = `${point.x}px`;
                el.style.top = `${point.y + 10}px`;
              }
              el.classList.toggle("is-placed", point !== null);
            }
          },
          onHoverAnchor: (point) => {
            const el = labelRef.current;
            if (!el) return;
            if (point) {
              el.style.left = `${point.x}px`;
              el.style.top = `${point.y + 12}px`;
            }
            el.classList.toggle("is-placed", point !== null);
          },
          onLoaded: (index) => {
            loadedRef.current = index;
            setLoaded(index);
            requestSync();
          },
          onContextLost: () => {
            sceneRef.current?.dispose();
            sceneRef.current = null;
            setWebgl("failed");
          },
        });
        if (cancelled) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        scene.setReduced(reduced);
        fit();
        sync();
        // A choice made earlier this session is restored (and keeps the journey unlocked);
        // otherwise EP03 sits in the player as the demo state.
        const restore = userSelectedRef.current ? selectedRef.current : readSaved();
        if (restore !== null) {
          userSelectedRef.current = true;
          setUserSelected(true);
          guideRef.current = "done";
          setGuide("done");
        }
        const inPlayer = restore ?? DEFAULT_INDEX;
        selectedRef.current = inPlayer;
        setSelected(inPlayer);
        scene.select(inPlayer, true);
        setWebgl("ready");
      } catch {
        if (!cancelled) setWebgl("failed");
      }
    };

    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          void start();
        }
        sceneRef.current?.setActive(entry.isIntersecting);
        if (entry.isIntersecting) requestSync();
      },
      { rootMargin: "240px 0px" },
    );
    visibility.observe(track);

    const resize = new ResizeObserver(fit);
    resize.observe(stage);
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(nudgeTimer);
      visibility.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setWebgl("pending");
    };
  }, [reduced]);

  // One place that previews a case: the 3D pull-out plus the small DOM label.
  const preview = useCallback(
    (index: number | null) => {
      if (index !== null) advanceGuide("select");
      sceneRef.current?.setHover(index);
      setHovered(index);
    },
    [advanceGuide],
  );

  /* ── Pointer: hover pulls a case out (mouse), a tap or click loads it. ── */
  const local = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, w: rect.width, h: rect.height };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const scene = sceneRef.current;
    if (!scene || event.pointerType !== "mouse") return;
    const { x, y, w, h } = local(event);
    scene.setPointer((x / w) * 2 - 1, (y / h) * 2 - 1);
    const index = scene.pick(x, y);
    if (index !== hovered) preview(index);
    event.currentTarget.style.cursor = index !== null ? "pointer" : "";
  };

  const onPointerLeave = (event: React.PointerEvent<HTMLCanvasElement>) => {
    // Touch fires a leave right after every tap; only a mouse really "leaves".
    if (event.pointerType !== "mouse") return;
    preview(null);
    sceneRef.current?.setPointer(0, 0);
    event.currentTarget.style.cursor = "";
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    tapRef.current = { x: event.clientX, y: event.clientY, t: performance.now() };
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const tap = tapRef.current;
    tapRef.current = null;
    const scene = sceneRef.current;
    if (!scene || !tap) return;
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10 || performance.now() - tap.t > 600) return;
    const { x, y } = local(event);
    if (event.pointerType === "mouse") {
      const index = scene.pick(x, y);
      if (index !== null) {
        preview(null);
        choose(index);
      }
      return;
    }
    // Touch has no hover: the first tap previews (pulls the case out), a second tap on it loads it.
    const index = scene.pick(x, y, 32);
    if (index !== null && index === hovered) {
      preview(null);
      choose(index);
    } else preview(index);
  };

  const active = loaded ?? selected;
  const loadedItem = loaded !== null ? media[loaded] : null;
  const label = hovered !== null ? media[hovered] : null;
  const named = (item: ConsoleMedia) => (item.episode ? `${item.label}, ${item.title}` : item.title);
  const status = !userSelected
    ? ""
    : loaded !== null
      ? `${named(media[loaded])} is loaded. The screen is up${mode === "scroll" ? "; keep scrolling to watch" : ""}.`
      : selected !== null
        ? `Loading ${named(media[selected])}…`
        : "";
  const frameTitle = (item: ConsoleMedia) => (item.episode ? `${SHOW_TITLE} — ${item.label}: ${item.title}` : `JazzHQ — ${item.title}`);

  // Over the scene it fades as the camera moves in; with reduced motion it sits above the stage instead.
  const heading = (
    <header ref={headRef} className="st-head">
      <h1 id="st-title" className="st-title">
        First Take by JazzHQ
      </h1>
    </header>
  );

  return (
    <section
      className={`st-stories st-stories--${mode}${mode === "scroll" && !userSelected ? " is-locked" : ""}${playing || watchPending ? " is-viewing" : ""}`}
      aria-labelledby="st-title"
      style={{ "--st-lock-p": CHECKPOINT[tallLayout ? "tall" : "wide"] } as React.CSSProperties}
    >
      <div ref={trackRef} className="st-track">
        <div ref={probeRef} className="st-track__probe" aria-hidden />
        <div ref={stickyRef} className="st-sticky">
          {mode === "reduced" && heading}
          <div ref={stageRef} className="st-stage">
            {mode !== "static" && (
              <canvas
                ref={canvasRef}
                className={`st-canvas${webgl === "ready" ? " is-ready" : ""}`}
                aria-hidden
                onPointerMove={onPointerMove}
                onPointerLeave={onPointerLeave}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={() => (tapRef.current = null)}
              />
            )}

            {mode !== "reduced" && heading}

            {mode !== "static" && (
              <div ref={screenRef} className={`st-screen${screenUp && loadedItem ? " is-up" : ""}`}>
                {loadedItem && screenUp && !playing && !watchPending && (
                  <>
                    <button type="button" className="st-screen__play" onClick={watch} aria-label={`Watch ${named(loadedItem)}`}>
                      <span className="st-screen__glyph" aria-hidden>
                        <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
                      </span>
                    </button>
                    <div className="st-screen__actions">
                      <button type="button" className="st-screen__watch" onClick={watch}>
                        {loadedItem.episode ? "Watch episode" : "Watch conversation"}
                      </button>
                      {loadedItem.href && (
                        <Link className="st-screen__notes" href={loadedItem.href} onClick={() => markNotesFromConsole(loadedItem.key)}>
                          Read episode notes →
                        </Link>
                      )}
                    </div>
                  </>
                )}
                {loadedItem && screenUp && playing && (
                  <div className="st-screen__player">
                    <iframe
                      src={embedUrl(loadedItem)}
                      title={frameTitle(loadedItem)}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                    <button type="button" className="st-screen__exit" onClick={stopWatching}>
                      Exit video <span aria-hidden>×</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <p ref={labelRef} className={`st-label${label ? " is-visible" : ""}`} aria-hidden>
              {label?.caption}
            </p>

            {mode === "scroll" && (
              <>
                <div ref={rightShelfRef} className="st-shelf" aria-hidden>
                  <span className="st-shelf__name">{COLLECTION_LABEL["first-take"]}</span>
                  <span className={`st-shelf__hint${guide === "done" ? " is-done" : ""}`}>
                    {guide === "preview" ? `${touch ? "Tap" : "Hover"} a case to preview →` : "Select an episode to continue"}
                  </span>
                </div>
                {moreConversations.length > 0 && (
                  <div ref={leftShelfRef} className="st-shelf" aria-hidden>
                    <span className="st-shelf__name">{COLLECTION_LABEL["more-conversations"]}</span>
                  </div>
                )}
              </>
            )}

            {mode === "static" && (
              <div className="st-static">
                {active !== null && (
                  <div className="st-static__screen">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={media[active].thumbnail} alt="" />
                    <a href={watchUrl(media[active])} target="_blank" rel="noopener noreferrer">
                      Watch on YouTube ↗
                    </a>
                    {media[active].href && <Link href={media[active].href}>Read episode notes →</Link>}
                  </div>
                )}
              </div>
            )}

            <p className={`st-hint${hint ? " is-visible" : ""}`} aria-hidden>
              {hint === "explore" && <>Scroll to explore <span>↓</span></>}
              {hint === "choose" && hovered !== null && "Tap again to load it"}
              {hint === "screen" && <>Keep scrolling to the screen <span>↓</span></>}
            </p>
          </div>

          <nav className="st-episodes" aria-label="Stories collections">
            {[firstTake, moreConversations].map((group) =>
              group.length === 0 ? null : (
                <ol key={group[0].collection} aria-label={COLLECTION_LABEL[group[0].collection]}>
                  {group.map((item) => {
                    const index = media.indexOf(item);
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          className="st-episode"
                          aria-pressed={userSelected && selected === index}
                          onClick={() => choose(index)}
                          onFocus={() => preview(index)}
                          onBlur={() => preview(null)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.thumbnail} alt="" width={64} height={36} loading="lazy" />
                          <span>
                            <span className="st-episode__num">{item.spineMark ? `EP ${item.spineMark}` : item.duration}</span>
                            <span className="st-sr-only">
                              {" "}— {item.title}
                              {item.guest ? `, with ${item.guest}` : ""}, {item.duration}. {userSelected && selected === index ? "Loaded in the player." : "Load into the player."}
                            </span>
                          </span>
                        </button>
                        {item.href && (
                          <Link className="st-episode__link" href={item.href}>
                            <span className="st-sr-only">{item.label} notes</span>
                            <span aria-hidden>↗</span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ),
            )}
          </nav>

          <p className="st-sr-only" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}
