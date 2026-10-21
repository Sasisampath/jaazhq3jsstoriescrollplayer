/* FIRST TAKE — BY JAZZHQ. The one source for every episode.
   To add an episode: upload its 16:9 thumbnail to /public/podcasts and add one
   entry below. The 3D case and its spine, its place in the archive, the
   console screen, the accessible list, the /stories/[slug] page, its metadata,
   previous/next and "More from First Take" are all generated from it. */

import { whenHowToHireYourFirstCro } from "./articles/when-how-to-hire-your-first-cro";

export const SHOW_NAME = "FIRST TAKE";
export const SHOW_BYLINE = "BY JAZZHQ";
export const SHOW_TITLE = `${SHOW_NAME} — ${SHOW_BYLINE}`;

/* Editorial copy for an episode page. Inline text supports **bold** and *italic*.
   Only add copy that has actually been written for the episode. */
export type ArticleBlock =
  | { type: "paragraph"; text: string }
  /** A short spoken line, set in italics. */
  | { type: "quote"; text: string }
  /** A key line pulled out large. */
  | { type: "pullquote"; text: string }
  | { type: "list"; items: string[] }
  /** A formula or one-line idea, set apart. */
  | { type: "callout"; text: string }
  | { type: "figure"; src: string; alt: string; width: number; height: number }
  /** "From the podcast": jumps the episode player to a timestamp ("mm:ss"). */
  | { type: "podcast"; text: string; title?: string; at: string }
  /** Closing block that points back to the full episode. */
  | { type: "watch"; title: string; text: string };

export type ArticleSection = {
  id: string;
  /** Visible heading; leave out for an untitled opening section. */
  heading?: string;
  /** Table of contents label; defaults to the heading. */
  navLabel?: string;
  blocks: ArticleBlock[];
};

export type EpisodeArticle = {
  /** Standfirst shown under the title. */
  dek?: string;
  sections: ArticleSection[];
};

export type Episode = {
  episode: number;
  slug: string;
  title: string;
  guest?: string;
  /** "mm:ss" or "h:mm:ss". */
  duration: string;
  youtubeId: string;
  thumbnail: string;
  /** Only add a description that has actually been supplied. */
  description?: string;
  /** Long-form episode notes for /stories/[slug]; the table of contents is built from its sections. */
  article?: EpisodeArticle;
};

const ALL: Episode[] = [
  {
    episode: 1,
    slug: "first-10-customers-2026",
    title: "How to Get Your First 10 Customers in 2026",
    guest: "Rajiv Ramanan",
    duration: "50:42",
    youtubeId: "W43U1TYK0WM",
    thumbnail: "/podcasts/first-10-customers-2026.jpg",
  },
  {
    episode: 2,
    slug: "when-how-to-hire-your-first-cro",
    title: "When & How to Hire Your First CRO",
    guest: "MKB",
    duration: "36:14",
    youtubeId: "t4Hfn3ZZ6Oo",
    thumbnail: "/podcasts/when-how-to-hire-your-first-cro.jpg",
    article: whenHowToHireYourFirstCro,
  },
  {
    episode: 3,
    slug: "kick-your-competition-out-with-aeo",
    title: "How to Kick Your Competition Out With AEO",
    duration: "37:07",
    youtubeId: "ZUZJec316Yc",
    thumbnail: "/podcasts/kick-your-competition-out-with-aeo.jpg",
  },
  {
    episode: 4,
    slug: "winning-in-apac",
    title: "Why US SaaS Companies Fail in APAC (And How to Win)",
    guest: "Chris Perrine",
    duration: "31:41",
    youtubeId: "gJj-wYYuT5w",
    thumbnail: "/podcasts/winning-in-apac.jpg",
  },
];

/** Always in episode order, whatever order the entries above are written in. */
export const episodes: Episode[] = [...ALL].sort((a, b) => a.episode - b.episode);

/** "14:03" → 843, "1:02:05" → 3725. */
export function toSeconds(timestamp: string) {
  return timestamp.split(":").map(Number).reduce((total, part) => total * 60 + (part || 0), 0);
}

export const watchUrl = (e: Episode, start = 0) =>
  `https://www.youtube.com/watch?v=${e.youtubeId}${start ? `&t=${start}s` : ""}`;

export const embedUrl = (e: Episode, autoplay = true, start = 0) =>
  `https://www.youtube-nocookie.com/embed/${e.youtubeId}?rel=0&playsinline=1${autoplay ? "&autoplay=1" : ""}${start ? `&start=${start}` : ""}`;

export const episodeHref = (e: Episode) => `/stories/${e.slug}`;

/** "01", "02" … */
export const episodeNumber = (e: Episode) => String(e.episode).padStart(2, "0");

export const episodeLabel = (e: Episode) => `Episode ${episodeNumber(e)}`;

/** "31:41" → "31 min 41 sec", "1:02:05" → "1 hr 2 min 5 sec". */
export function durationLabel(duration: string) {
  const parts = duration.split(":").map(Number);
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0] ?? 0, parts[1] ?? 0];
  return [h ? `${h} hr` : "", m ? `${m} min` : "", s ? `${s} sec` : ""].filter(Boolean).join(" ");
}

/** ISO-8601 duration for <time dateTime>, e.g. "PT31M41S". */
export function isoDuration(duration: string) {
  const parts = duration.split(":").map(Number);
  const [h, m, sec] = parts.length === 3 ? parts : [0, parts[0] ?? 0, parts[1] ?? 0];
  return `PT${h ? `${h}H` : ""}${m}M${sec}S`;
}

export const getEpisode = (slug: string) => episodes.find((e) => e.slug === slug);

/** No looping: the first episode has no previous, the last has no next. */
export function neighbours(e: Episode) {
  const i = episodes.indexOf(e);
  return { previous: episodes[i - 1] ?? null, next: episodes[i + 1] ?? null };
}
