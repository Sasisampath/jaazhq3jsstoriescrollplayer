"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SHOW_TITLE, embedUrl, episodeLabel, toSeconds, watchUrl, type Episode } from "@/data/episodes";

/* 16:9 media at the top of an episode page: the real thumbnail until Play, then
   the privacy-enhanced YouTube player with its native controls (fullscreen
   included). Timestamp links in the article ask it to play from a moment. */

const PLAY_EVENT = "first-take:play";

export function EpisodeMedia({ episode }: { episode: Episode }) {
  const [playing, setPlaying] = useState(false);
  const [start, setStart] = useState(0);
  const [session, setSession] = useState(0); // remounts the iframe when the start time changes
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onPlay = (event: Event) => {
      const seconds = (event as CustomEvent<number>).detail ?? 0;
      setStart(seconds);
      setSession((n) => n + 1);
      setPlaying(true);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      rootRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    };
    window.addEventListener(PLAY_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_EVENT, onPlay);
  }, []);

  return (
    <div ref={rootRef} className="ep-media" id="episode-player">
      <div className="ep-media__frame">
        {playing ? (
          <iframe
            key={session}
            ref={frameRef}
            src={embedUrl(episode, true, start)}
            title={`${SHOW_TITLE} — ${episodeLabel(episode)}: ${episode.title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => frameRef.current?.focus()}
          />
        ) : (
          <button type="button" className="ep-media__poster" onClick={() => setPlaying(true)} aria-label={`Play ${episodeLabel(episode)}: ${episode.title}`}>
            <Image src={episode.thumbnail} alt="" fill sizes="(max-width: 1024px) 100vw, 960px" priority />
            <span className="ep-media__play" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <p className="ep-media__links">
        {!playing && (
          <button type="button" onClick={() => setPlaying(true)}>
            Play episode
          </button>
        )}
        <a href={watchUrl(episode)} target="_blank" rel="noopener noreferrer">
          Watch on YouTube ↗
        </a>
      </p>
    </div>
  );
}

/** "Watch from 14:03": plays the episode player above from that moment. */
export function PlayFrom({ at, className, children }: { at: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: toSeconds(at) }))}
    >
      {children}
    </button>
  );
}
