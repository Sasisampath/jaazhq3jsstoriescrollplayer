"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  SHOW_NAME,
  SHOW_TITLE,
  embedUrl,
  episodeHref,
  episodeLabel,
  episodeNumber,
  episodes,
  watchUrl,
} from "@/data/episodes";
import type { ScreenRect, StoriesScene } from "./stories-console-scene";
import { markNotesFromConsole } from "./back-to-first-take";

/* FIRST TAKE — BY JAZZHQ: one console, driven by scroll.
   The tall track is only a scroll distance; the stage stays sticky inside it and
   scroll progress alone decides the camera (full console → archive → player →
   screen). Choosing an episode is the one thing the visitor "does": the case
   travels into the player and the screen rises. Every episode also exists as a
   real button for keyboards and screen readers. */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const TALL_BELOW = 0.85; // stage aspect under which the portrait camera path is used
const STORAGE_KEY = "jazzhq-stories-episode";

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
    return Number.isInteger(index) && index >= 0 && index < episodes.length ? index : null;
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
  const [hint, setHint] = useState<Hint>("explore");
  const [tall, setTall] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const selectedRef = useRef(selected);
  const loadedRef = useRef(loaded);
  useEffect(() => {
    selectedRef.current = selected;
    loadedRef.current = loaded;
  }, [selected, loaded]);

  const mode = webgl === "failed" ? "static" : reduced ? "reduced" : "scroll";

  const choose = useCallback((index: number) => {
    setPlaying(false);
    setSelected(index);
    save(index);
    sceneRef.current?.select(index);
  }, []);

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

    const updateHint = (p: number, isTall: boolean) => {
      let next: Hint = null;
      if (reduced) next = null;
      else if (p < 0.04) next = "explore";
      else if (loadedRef.current !== null) next = p < 0.66 ? "screen" : null;
      else if (selectedRef.current === null && p > 0.2 && p < (isTall ? 0.52 : 0.5)) next = "choose";
      if (next !== lastHint) {
        lastHint = next;
        setHint(next);
      }
    };

    const sync = () => {
      raf = 0;
      const range = track.offsetHeight - sticky.offsetHeight;
      const top = parseFloat(getComputedStyle(sticky).top) || 0;
      const p = range > 0 ? Math.min(1, Math.max(0, (top - track.getBoundingClientRect().top) / range)) : 0;
      progressRef.current = p;
      sceneRef.current?.setProgress(p);
      const head = headRef.current;
      if (head && !reduced) {
        const fade = Math.min(1, p / 0.09);
        head.style.opacity = String(1 - fade);
        head.style.transform = `translate3d(0, ${-fade * 48}px, 0)`;
      }
      updateHint(p, stage.clientWidth / Math.max(1, stage.clientHeight) < TALL_BELOW);
    };
    const requestSync = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };

    const fit = () => {
      const { width, height } = stage.getBoundingClientRect();
      const isTall = width / Math.max(1, height) < TALL_BELOW;
      setTall(isTall);
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
      if (!usable) setPlaying(false);
    };

    const start = async () => {
      if (!hasWebGL()) {
        setWebgl("failed");
        return;
      }
      try {
        const { createStoriesScene } = await import("./stories-console-scene");
        const scene = await createStoriesScene(canvas, {
          episodes,
          onScreen,
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
        // Restore the episode chosen earlier this session without replaying the travel.
        const restore = selectedRef.current ?? readSaved();
        if (restore !== null) {
          setSelected(restore);
          scene.select(restore, true);
        }
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
  const preview = useCallback((index: number | null) => {
    sceneRef.current?.setHover(index);
    setHovered(index);
  }, []);

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
  const loadedEpisode = loaded !== null ? episodes[loaded] : null;
  const label = hovered !== null ? episodes[hovered] : null;
  const status =
    loaded !== null
      ? `${episodeLabel(episodes[loaded])}, ${episodes[loaded].title}, is loaded. The screen is up${mode === "scroll" ? "; keep scrolling to watch" : ""}.`
      : selected !== null
        ? `Loading ${episodeLabel(episodes[selected])}…`
        : "";

  // Over the scene it fades as the camera moves in; with reduced motion it sits above the stage instead.
  const heading = (
    <header ref={headRef} className="st-head">
      <h1 id="st-title" className="st-title">
        First Take by JazzHQ
      </h1>
    </header>
  );

  return (
    <section className={`st-stories st-stories--${mode}`} aria-labelledby="st-title">
      <div ref={trackRef} className="st-track">
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
              <div ref={screenRef} className={`st-screen${screenUp && loadedEpisode ? " is-up" : ""}`}>
                {loadedEpisode && screenUp && !playing && (
                  <>
                    <button type="button" className="st-screen__play" onClick={() => setPlaying(true)} aria-label={`Watch ${episodeLabel(loadedEpisode)}: ${loadedEpisode.title}`}>
                      <span className="st-screen__glyph" aria-hidden>
                        <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
                      </span>
                    </button>
                    <div className="st-screen__actions">
                      <button type="button" className="st-screen__watch" onClick={() => setPlaying(true)}>
                        Watch episode
                      </button>
                      <Link className="st-screen__notes" href={episodeHref(loadedEpisode)} onClick={() => markNotesFromConsole(loadedEpisode.slug)}>
                        Read episode notes →
                      </Link>
                    </div>
                  </>
                )}
                {loadedEpisode && screenUp && playing && (
                  <div className="st-screen__player">
                    <iframe
                      src={embedUrl(loadedEpisode)}
                      title={`${SHOW_TITLE} — ${episodeLabel(loadedEpisode)}: ${loadedEpisode.title}`}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                    <button type="button" className="st-screen__exit" onClick={() => setPlaying(false)}>
                      Exit video <span aria-hidden>×</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <p ref={labelRef} className={`st-label${label ? " is-visible" : ""}`} aria-hidden>
              {label && `EP. ${episodeNumber(label)}${label.guest ? ` · ${label.guest}` : ""}`}
            </p>

            {mode === "static" && (
              <div className="st-static">
                {active !== null && (
                  <div className="st-static__screen">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={episodes[active].thumbnail} alt="" />
                    <a href={watchUrl(episodes[active])} target="_blank" rel="noopener noreferrer">
                      Watch {episodeLabel(episodes[active])} on YouTube ↗
                    </a>
                    <Link href={episodeHref(episodes[active])}>Read episode notes →</Link>
                  </div>
                )}
              </div>
            )}

            <p className={`st-hint${hint ? " is-visible" : ""}`} aria-hidden>
              {hint === "explore" && <>Scroll to explore <span>↓</span></>}
              {hint === "choose" && (hovered !== null && tall ? "Tap again to load it" : tall ? "Tap a case to pull it out" : "Choose a case to load it")}
              {hint === "screen" && <>Keep scrolling to the screen <span>↓</span></>}
            </p>
          </div>

          <nav className="st-episodes" aria-label={`${SHOW_NAME} episodes`}>
            <ol>
              {episodes.map((episode, index) => (
                <li key={episode.slug}>
                  <button
                    type="button"
                    className="st-episode"
                    aria-pressed={selected === index}
                    onClick={() => choose(index)}
                    onFocus={() => preview(index)}
                    onBlur={() => preview(null)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={episode.thumbnail} alt="" width={64} height={36} loading="lazy" />
                    <span>
                      <span className="st-episode__num">EP {episodeNumber(episode)}</span>
                      <span className="st-sr-only">
                        {" "}— {episode.title}
                        {episode.guest ? `, with ${episode.guest}` : ""}. {selected === index ? "Loaded in the player." : "Load into the player."}
                      </span>
                    </span>
                  </button>
                  <Link className="st-episode__link" href={episodeHref(episode)}>
                    <span className="st-sr-only">{episodeLabel(episode)} page</span>
                    <span aria-hidden>↗</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <p className="st-sr-only" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}
