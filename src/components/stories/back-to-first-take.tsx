"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

/* Sticky "← Back to First Take" row under the site header on episode pages.
   If the visitor opened this exact episode from the First Take console, go
   back in history so the console keeps its state; otherwise (search, shared
   link, moved on to another episode) go to /stories. */

const FROM_CONSOLE_KEY = "first-take:notes-from-console";

/** Called by the console's "Read episode notes" link. */
export function markNotesFromConsole(slug: string) {
  try {
    window.sessionStorage.setItem(FROM_CONSOLE_KEY, slug);
  } catch {
    // Storage blocked: Back falls through to /stories.
  }
}

export function BackToFirstTake({ slug }: { slug: string }) {
  const router = useRouter();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    let from: string | null = null;
    try {
      from = window.sessionStorage.getItem(FROM_CONSOLE_KEY);
      window.sessionStorage.removeItem(FROM_CONSOLE_KEY);
    } catch {
      // Ignore.
    }
    if (from === slug && window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
    // Otherwise the link itself goes to /stories.
  };

  return (
    <div className="ep-back">
      <div className="ep-back__inner">
        <Link href="/stories" onClick={onClick}>
          <span aria-hidden>←</span> Back to First Take
        </Link>
      </div>
    </div>
  );
}
