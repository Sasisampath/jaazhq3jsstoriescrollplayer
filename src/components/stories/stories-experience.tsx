"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { StoriesConsole } from "./stories-console";
import { StoriesGallery } from "./stories-gallery";
import { StoriesViewSwitch, type StoriesView } from "./stories-view-switch";
import { TIP_KEY, VIEW_KEY, readSession, writeSession } from "./stories-session";

/* /stories has two ways to consume the same content (src/data/media.ts):
   the 3D console (default, the immersive experience) and a plain Gallery.
   Switching swaps the view in place; the view is remembered for this browser
   session only. Choosing a story in Gallery is stored the same way the console
   stores its own selection, so switching to 3D opens with that story loaded. */

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function StoriesExperience() {
  const [view, setView] = useState<StoriesView>("3d");
  const [tip, setTip] = useState(false);

  // Before first paint: restore this session's view, and arm the one-time hint.
  useIsoLayoutEffect(() => {
    const saved = readSession(VIEW_KEY);
    if (saved === "gallery") setView("gallery");
    else if (!readSession(TIP_KEY)) {
      setTip(true);
      writeSession(TIP_KEY, "1");
    }
  }, []);

  const dismissTip = useCallback(() => setTip(false), []);

  const change = useCallback((next: StoriesView) => {
    setTip(false);
    setView((current) => {
      if (current === next) return current;
      writeSession(VIEW_KEY, next);
      window.scrollTo({ top: 0, behavior: "instant" });
      return next;
    });
  }, []);

  // The hint goes away once the visitor starts using the page.
  useEffect(() => {
    if (!tip || view !== "3d") return;
    const onScroll = () => {
      if (window.scrollY > 80) setTip(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target as HTMLElement | null)?.closest(".st-viewbar")) setTip(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerdown", onPointer);
    const timer = window.setTimeout(() => setTip(false), 10000); // a hint, not a notice: it leaves on its own
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [tip, view]);

  return (
    <div className={`st-experience st-experience--${view}`}>
      <StoriesViewSwitch view={view} onChange={change} tip={tip && view === "3d"} onDismissTip={dismissTip} />
      <div key={view} className="st-view">
        {view === "gallery" ? <StoriesGallery /> : <StoriesConsole />}
      </div>
    </div>
  );
}
