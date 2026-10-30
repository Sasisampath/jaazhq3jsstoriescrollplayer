"use client";

import { Box, LayoutGrid, X } from "lucide-react";

export type StoriesView = "gallery" | "3d";

/* The compact Gallery | 3D switch, sticky under the site header, plus the one-time
   hint that points at Gallery. Both are pointer-events: none outside their own boxes,
   so the bar never blocks the console or the page beneath it. */
export function StoriesViewSwitch({
  view,
  onChange,
  tip,
  onDismissTip,
}: {
  view: StoriesView;
  onChange: (view: StoriesView) => void;
  tip: boolean;
  onDismissTip: () => void;
}) {
  return (
    <div className="st-viewbar">
      <div className="st-viewbar__inner">
        <div className="st-switch" role="group" aria-label="Stories view">
          <button type="button" aria-pressed={view === "gallery"} onClick={() => onChange("gallery")}>
            <LayoutGrid size={15} strokeWidth={1.75} aria-hidden />
            Gallery
          </button>
          <button type="button" aria-pressed={view === "3d"} onClick={() => onChange("3d")}>
            <Box size={15} strokeWidth={1.75} aria-hidden />
            3D
          </button>
        </div>
        {tip && (
          <div className="st-tip" role="note">
            <p>
              <strong>Prefer a simpler view?</strong>
              Switch to Gallery to browse all stories.
            </p>
            <button type="button" className="st-tip__close" onClick={onDismissTip} aria-label="Dismiss hint">
              <X size={14} strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
