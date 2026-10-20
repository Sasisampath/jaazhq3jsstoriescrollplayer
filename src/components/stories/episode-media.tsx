"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { SHOW_TITLE, embedUrl, episodeLabel, watchUrl, type Episode } from "@/data/episodes";

/* 16:9 hero: the real thumbnail until Play, then the privacy-enhanced YouTube
   player with its native controls (fullscreen included). */
export function EpisodeMedia({ episode }: { episode: Episode }) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="ep-media">
      <div className="ep-media__frame">
        {playing ? (
          <iframe
            ref={frameRef}
            src={embedUrl(episode)}
            title={`${SHOW_TITLE} — ${episodeLabel(episode)}: ${episode.title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => frameRef.current?.focus()}
          />
        ) : (
          <button type="button" className="ep-media__poster" onClick={() => setPlaying(true)} aria-label={`Play ${episodeLabel(episode)}: ${episode.title}`}>
            <Image src={episode.thumbnail} alt="" fill sizes="(max-width: 1024px) 100vw, 1100px" priority />
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
