"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { SHOW_TITLE, embedUrl, watchUrl } from "@/data/episodes";
import { COLLECTION_LABEL, consoleMedia, type ConsoleMedia } from "@/data/media";
import type { Point, ScreenRect, StoriesScene } from "./stories-console-scene";
import { markNotesFromConsole } from "./back-to-first-take";

/* FIRST TAKE — BY JAZZHQ: one console you can scroll through or simply use.
   The tall track is only a scroll distance; the stage stays sticky inside it and
   scroll progress decides the camera (full console → FIRST TAKE shelf → both
   shelves → player → screen). The cases are live from the first frame: covers
   rest fanned toward the room, hover pulls one out, a click loads it. The
   FIRST TAKE shelf also browses like a deck — one case in focus, ← / → , arrow
   keys, a horizontal drag or swipe, and "Pick for me" — without page scroll ever
   changing the focus. Every case also exists as a real button for keyboards
   and screen readers. */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const TALL_BELOW = 0.85; // stage aspect under which the portrait camera path is used
const STORAGE_KEY = "jazzhq-stories-episode";

const media = consoleMedia;
const firstTake = media.filter((m) => m.collection === "first-take");
const moreStories = media.filter((m) => m.collection === "more-stories");
const FIRST_TAKE_SIDE = firstTake[0]?.side ?? "left";
/** Already in the player when the page opens, so the console reads as a working player.
    This is a demo state, not the visitor's choice. */
const DEFAULT_INDEX = Math.max(0, media.findIndex((m) => m.episode?.episode === 2));

/* Until the visitor deliberately selects a case, the journey holds at the
   FIRST TAKE shelf: the scroll track is shortened (in CSS) so the page simply
   ends there, and scene progress is clamped to the same point. Selecting a case
   restores the full track and the rest of the journey (screen, footer). */
const CHECKPOINT = { wide: 0.3, tall: 0.28 } as const;

/* Scroll ranges: shelf captions show over the console and archive views;
   archive browsing (focus + controls) takes over once the FIRST TAKE shelf is framed. */
const RANGES = {
  wide: { shelves: [0, 0.55], browse: [0.14, 0.55] },
  // Portrait timeline (scene): full → FIRST TAKE by 0.24 → watch from 0.42.
  tall: { shelves: [0.14, 0.4], browse: [0.14, 0.4] },
} as const;

const inRange = (p: number, [a, b]: readonly [number, number]) => p >= a && p <= b;

type Hint = "choose" | null;

type Phase = "idle" | "loading" | "moving" | "playing";

/** Where the screen faces the visitor on the scroll timeline (the camera then settles into the watch view). */
const WATCH_PROGRESS = 0.93;

/** Portrait action zone: gap under the console, and the least room kept at the bottom of the stage. */
const CTA_GAP = 24;
const CTA_EDGE = 16;

/** FIRST TAKE cases still on the shelf (the one in the player can't be browsed). */
const shelfFirstTake = (inPlayer: number | null) => firstTake.map((m) => media.indexOf(m)).filter((i) => i !== inPlayer);

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
  const firstTakeShelfRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const anchorsRef = useRef<{ screen: ScreenRect | null; player: Point | null; consoleBottom: Point | null }>({ screen: null, player: null, consoleBottom: null });
  const probeRef = useRef<HTMLDivElement>(null);
  const interactedRef = useRef(false);
  const browseRef = useRef(false);
  const focusedRef = useRef<number | null>(null);
  const pickTimers = useRef<number[]>([]);
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
  /* Playback pipeline phase. "loading": the chosen case is travelling into the player;
     "moving": the page and camera are travelling to the watch view; "playing": the player is mounted.
     While loading/moving, further choices are ignored so nothing doubles up. */
  const [phase, setPhaseState] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);
  const runRef = useRef(0); // bumps on every new run or exit, so a stale run stops at its next step
  const viewingRef = useRef(false); // camera held in the canonical watch view
  const loadWaiters = useRef(new Map<number, () => void>());

  // Exit video (or anything that ends playback): unmount the player and give the camera back to scroll.
  const stopWatching = useCallback(() => {
    runRef.current += 1;
    setPlaying(false);
    setPhase("idle");
    if (viewingRef.current) {
      viewingRef.current = false;
      sceneRef.current?.view(false);
    }
  }, [setPhase]);
  const [hint, setHint] = useState<Hint>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [interacted, setInteracted] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [userSelected, setUserSelected] = useState(false);
  const [tallLayout, setTallLayout] = useState(false);

  // The one line of guidance ("Pick a story to explore") retires after the first real interaction.
  const markInteracted = useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    setInteracted(true);
  }, []);

  // Archive focus: the FIRST TAKE case standing forward. Shown in the scene only while browsing.
  const applyFocus = useCallback((index: number | null) => {
    focusedRef.current = index;
    setFocused(index);
    sceneRef.current?.setFocus(browseRef.current ? index : null);
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
      markInteracted();
      pickTimers.current.forEach((t) => window.clearTimeout(t));
      setPicking(false);
      userSelectedRef.current = true;
      setUserSelected(true);
      save(index);
      if (index === selectedRef.current) {
        sceneRef.current?.acknowledge(); // already in the player: just a status-light nod
        return;
      }
      setSelected(index);
      sceneRef.current?.select(index);
      // The focused case just went into the player: hand focus to a neighbour still on the shelf.
      if (focusedRef.current === index || focusedRef.current === null) {
        const shelf = shelfFirstTake(index);
        const was = firstTake.findIndex((m) => media.indexOf(m) === index);
        applyFocus(shelf.find((i) => firstTake.indexOf(media[i]) > was) ?? shelf[shelf.length - 1] ?? null);
      }
    },
    [markInteracted, applyFocus],
  );

  /** Resolves once the given case is fully inside the player (immediately if it already is). */
  const waitLoaded = useCallback(
    (index: number) =>
      new Promise<void>((resolve) => {
        if (loadedRef.current === index) resolve();
        else loadWaiters.current.set(index, resolve);
      }),
    [],
  );

  /** Travel down the existing scroll timeline to where the screen faces the visitor, then resolve. */
  const scrollToWatch = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const track = trackRef.current;
        const sticky = stickyRef.current;
        const probe = probeRef.current;
        // Only on the scroll journey, and only once a choice has lifted the lock.
        if (reduced || !track || !sticky || !probe || !userSelectedRef.current) {
          resolve();
          return;
        }
        const top = parseFloat(getComputedStyle(sticky).top) || 0;
        const target = track.getBoundingClientRect().top + window.scrollY - top + (probe.offsetHeight - sticky.offsetHeight) * WATCH_PROGRESS;
        window.scrollTo({ top: target, behavior: "smooth" });
        const started = performance.now();
        let last = window.scrollY;
        let still = 0;
        const check = () => {
          const y = window.scrollY;
          still = Math.abs(y - last) < 0.5 ? still + 1 : 0;
          last = y;
          if (Math.abs(y - target) < 2 || still > 8 || performance.now() - started > 2500) resolve();
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
    [reduced],
  );

  /** Ease the camera into the one canonical, square-on watch view; resolves when it has arrived. */
  const cameraToWatch = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const scene = sceneRef.current;
        viewingRef.current = true;
        if (!scene) resolve();
        else scene.view(true, resolve);
      }),
    [],
  );

  /* The one pipeline behind every way to watch — clicking or tapping a case, the episode list,
     Pick for me, and Watch episode:
       select (if a case was chosen) → case inserted → page travels to the screen → camera settles
       into the watch view → only then the YouTube player mounts and plays. */
  const runPlayback = useCallback(
    async (index: number | null) => {
      if (phaseRef.current === "loading" || phaseRef.current === "moving") return;
      stopWatching();
      const run = runRef.current;
      const alive = () => run === runRef.current;
      if (index !== null) choose(index);
      const target = index ?? selectedRef.current;
      if (target === null) return;
      setPhase("loading");
      await waitLoaded(target);
      if (!alive()) return;
      setPhase("moving");
      await scrollToWatch();
      if (!alive()) return;
      await cameraToWatch();
      if (!alive()) return;
      setPlaying(true);
      setPhase("playing");
    },
    [stopWatching, choose, waitLoaded, scrollToWatch, cameraToWatch, setPhase],
  );

  /** ← / → , arrow keys, drag and swipe: move the archive focus one case along the FIRST TAKE shelf. */
  const browse = useCallback(
    (dir: 1 | -1) => {
      const shelf = shelfFirstTake(selectedRef.current);
      if (!shelf.length) return;
      markInteracted();
      const at = shelf.indexOf(focusedRef.current ?? shelf[0]);
      applyFocus(shelf[(at + dir + shelf.length) % shelf.length]);
    },
    [markInteracted, applyFocus],
  );

  /** "Pick for me": the focus runs along the shelf, slows, settles on a different case, and that case
      then goes through the same pipeline as a click — into the player, to the watch view, playing. */
  const pickForMe = useCallback(() => {
    const shelf = shelfFirstTake(selectedRef.current);
    if (shelf.length < 2 || phaseRef.current === "loading" || phaseRef.current === "moving") return;
    markInteracted();
    pickTimers.current.forEach((t) => window.clearTimeout(t));
    const from = Math.max(0, shelf.indexOf(focusedRef.current ?? shelf[0]));
    const choices = shelf.map((_, i) => i).filter((i) => i !== from);
    const to = choices[Math.floor(Math.random() * choices.length)];
    if (reduced) {
      applyFocus(shelf[to]);
      void runPlayback(shelf[to]);
      return;
    }
    const steps = shelf.length + ((to - from + shelf.length) % shelf.length); // one lap, then land
    setPicking(true);
    let at = 0;
    for (let n = 1; n <= steps; n += 1) {
      at += 70 + 260 * Math.pow(n / steps, 2.4); // quick at first, then slowing down
      pickTimers.current.push(window.setTimeout(() => applyFocus(shelf[(from + n) % shelf.length]), at));
    }
    // A short beat on the chosen cover, then it goes into the player.
    pickTimers.current.push(window.setTimeout(() => void runPlayback(shelf[to]), at + 380));
  }, [markInteracted, applyFocus, runPlayback, reduced]);

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!track || !sticky || !stage || !canvas) return;

    let cancelled = false;
    let started = false;
    let raf = 0;
    let lastHint: Hint = null;

    const updateHint = (p: number, isTall: boolean) => {
      let next: Hint = null;
      // Only one bottom note survives: on touch, after a first tap, "Tap again to load it".
      if (!reduced && isTall && p < 0.52) next = "choose";
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
        // Portrait: the heading stays until the camera has started toward the shelf.
        const fade = isTallNow ? Math.min(1, Math.max(0, (p - 0.03) / 0.1)) : Math.min(1, p / 0.09);
        head.style.opacity = String(1 - fade);
        head.style.transform = `translate3d(0, ${-fade * 48}px, 0)`;
      }
      const isTall = stage.clientWidth / Math.max(1, stage.clientHeight) < TALL_BELOW;
      updateHint(p, isTall);
      const ranges = RANGES[isTall ? "tall" : "wide"];
      const showShelves = !reduced && inRange(p, ranges.shelves);
      firstTakeShelfRef.current?.classList.toggle("is-shown", showShelves);
      // Archive browsing (focus + controls) is on while the FIRST TAKE shelf is framed.
      const browseNow = !reduced && inRange(p, ranges.browse);
      if (browseNow !== browseRef.current) {
        browseRef.current = browseNow;
        setBrowsing(browseNow);
        if (browseNow && focusedRef.current === null) focusedRef.current = shelfFirstTake(selectedRef.current)[0] ?? null;
        setFocused(focusedRef.current);
        sceneRef.current?.setFocus(browseNow ? focusedRef.current : null);
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
      // Small portrait screens show the poster smaller; playback itself always frames it larger.
      const minWidth = stage.clientWidth / Math.max(1, stage.clientHeight) < TALL_BELOW ? 160 : 200;
      const usable = rect !== null && rect.top >= -4 && rect.width >= minWidth;
      if (el && rect && usable) {
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.top}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
      }
      setScreenUp(usable);
      if (!usable && !viewingRef.current) setPlaying(false);
      anchorsRef.current.screen = usable ? rect : null;
      placeCta();
    };

    // Watch / notes. Wide: under the player when it's in view, otherwise under the screen.
    // Portrait: a page-level action zone, centred, a fixed gap below the bottom of the whole console.
    const placeCta = () => {
      const el = ctaRef.current;
      if (!el) return;
      const { player, screen, consoleBottom } = anchorsRef.current;
      const portrait = stage.clientWidth / Math.max(1, stage.clientHeight) < TALL_BELOW;
      let at: Point | null = null;
      if (portrait) {
        const lowest = stage.clientHeight - el.offsetHeight - CTA_EDGE;
        if (consoleBottom && consoleBottom.y + CTA_GAP <= lowest) at = { x: stage.clientWidth / 2, y: consoleBottom.y + CTA_GAP };
      } else {
        const roomBelow = player && player.y + 12 < stage.clientHeight - 84;
        at = roomBelow ? { x: player.x, y: player.y + 12 } : screen ? { x: screen.left + screen.width / 2, y: screen.top + screen.height + 14 } : null;
      }
      if (at) {
        el.style.left = `${at.x}px`;
        el.style.top = `${at.y}px`;
      }
      el.classList.toggle("is-placed", at !== null);
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
          // The metal plaques are the shelf labels.
          badges: {
            [FIRST_TAKE_SIDE]: COLLECTION_LABEL["first-take"].toUpperCase(),
            [FIRST_TAKE_SIDE === "left" ? "right" : "left"]: moreStories.length ? COLLECTION_LABEL["more-stories"].toUpperCase() : undefined,
          },
          onScreen,
          onAnchors: ({ left, right, player, consoleBottom }) => {
            anchorsRef.current.player = player;
            anchorsRef.current.consoleBottom = consoleBottom;
            placeCta();
            const ftPoint = FIRST_TAKE_SIDE === "left" ? left : right;
            // Portrait: the browse controls are centred on the page, under the shelf.
            const centre = stage.clientWidth / Math.max(1, stage.clientHeight) < TALL_BELOW ? stage.clientWidth / 2 : null;
            for (const [el, point] of [[firstTakeShelfRef.current, ftPoint]] as const) {
              if (!el) continue;
              if (point) {
                el.style.left = `${centre ?? point.x}px`;
                el.style.top = `${point.y + 10}px`;
              }
              el.classList.toggle("is-placed", point !== null);
            }
          },
          onHoverAnchor: (point) => {
            const el = labelRef.current;
            if (!el) return;
            if (point) {
              // Never on top of the browse controls: above them when the case sits low.
              const controls = firstTakeShelfRef.current?.querySelector<HTMLElement>(".st-browse");
              const ceiling = controls ? controls.getBoundingClientRect().top - stage.getBoundingClientRect().top - el.offsetHeight - 8 : Infinity;
              el.style.left = `${point.x}px`;
              el.style.top = `${Math.min(point.y + 12, ceiling)}px`;
            }
            el.classList.toggle("is-placed", point !== null);
          },
          onLoaded: (index) => {
            loadedRef.current = index;
            setLoaded(index);
            const waiter = index !== null ? loadWaiters.current.get(index) : undefined;
            if (waiter && index !== null) {
              loadWaiters.current.delete(index);
              waiter();
            }
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
        // otherwise EP02 sits in the player as the demo state.
        const restore = userSelectedRef.current ? selectedRef.current : readSaved();
        if (restore !== null) {
          userSelectedRef.current = true;
          setUserSelected(true);
          interactedRef.current = true;
          setInteracted(true);
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
      if (index !== null) markInteracted();
      sceneRef.current?.setHover(index);
      setHovered(index);
    },
    [markInteracted],
  );

  // Arrow keys browse the FIRST TAKE shelf while it's in focus (never while typing or watching).
  useEffect(() => {
    if (!browsing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || viewingRef.current) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], iframe")) return;
      event.preventDefault();
      browse(event.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [browsing, browse]);

  useEffect(() => () => pickTimers.current.forEach((t) => window.clearTimeout(t)), []);

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
    // A deliberate sideways drag or swipe browses the shelf (vertical movement stays page scroll).
    const dx = event.clientX - tap.x;
    const dy = event.clientY - tap.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      browse(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.hypot(dx, dy) > 10 || performance.now() - tap.t > 600) return;
    const { x, y } = local(event);
    if (event.pointerType === "mouse") {
      const index = scene.pick(x, y);
      if (index !== null) {
        preview(null);
        void runPlayback(index);
      }
      return;
    }
    // Touch has no hover: the first tap previews (pulls the case out), a second tap on it loads it.
    const index = scene.pick(x, y, 32);
    if (index !== null && index === hovered) {
      preview(null);
      void runPlayback(index);
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
      className={`st-stories st-stories--${mode}${mode === "scroll" && !userSelected ? " is-locked" : ""}${playing || phase === "moving" ? " is-viewing" : ""}`}
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
                {loadedItem && screenUp && phase === "idle" && (
                  <>
                    <button type="button" className="st-screen__play" onClick={() => void runPlayback(null)} aria-label={`Watch ${named(loadedItem)}`}>
                      <span className="st-screen__glyph" aria-hidden>
                        <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
                      </span>
                    </button>
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

            {mode !== "static" && (
              <div ref={ctaRef} className="st-cta" data-on={Boolean(loadedItem && screenUp && phase === "idle" && !(tallLayout && browsing))}>
                {loadedItem && (
                  <>
                    <button type="button" className="st-cta__watch" onClick={() => void runPlayback(null)}>
                      {loadedItem.episode ? "Watch episode" : "Watch story"}
                    </button>
                    {loadedItem.href && (
                      <Link className="st-cta__notes" href={loadedItem.href} onClick={() => markNotesFromConsole(loadedItem.key)}>
                        Read episode notes →
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}

            <p ref={labelRef} className="st-label" data-on={label !== null} aria-hidden>
              {label?.caption}
            </p>

            {mode === "scroll" && (
              <>
                <div ref={firstTakeShelfRef} className="st-shelf st-shelf--primary">
                  {browsing && focused !== null && (
                    <div className="st-browse" role="group" aria-label="Browse First Take">
                      <div className="st-browse__row">
                        <button type="button" className="st-browse__step" onClick={() => browse(-1)} aria-label="Previous episode" disabled={picking}>
                          ←
                        </button>
                        <span className="st-browse__count" aria-live="polite">
                          <span className="st-sr-only">Episode </span>
                          {media[focused].spineMark} / {String(firstTake.length).padStart(2, "0")}
                        </span>
                        <button type="button" className="st-browse__step" onClick={() => browse(1)} aria-label="Next episode" disabled={picking}>
                          →
                        </button>
                      </div>
                      <button type="button" className="st-browse__pick" onClick={pickForMe} disabled={picking || phase === "loading" || phase === "moving"}>
                        <svg className="st-browse__spark" viewBox="0 0 24 24" aria-hidden>
                          <path d="M12 2.5c.5 4.6 2.4 6.5 7 7-4.6.5-6.5 2.4-7 7-.5-4.6-2.4-6.5-7-7 4.6-.5 6.5-2.4 7-7Z" />
                          <path d="M19 14.5c.25 2 1 2.75 3 3-2 .25-2.75 1-3 3-.25-2-1-2.75-3-3 2-.25 2.75-1 3-3Z" />
                        </svg>
                        Pick for me
                      </button>
                    </div>
                  )}
                  <span className={`st-shelf__hint${interacted ? " is-done" : ""}`} aria-hidden>
                    Pick a story to explore
                  </span>
                </div>
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
              {hint === "choose" && hovered !== null && "Tap again to load it"}
            </p>
          </div>

          <nav className="st-episodes" aria-label="Stories collections">
            {[firstTake, moreStories].map((group) =>
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
                          onClick={() => void runPlayback(index)}
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
