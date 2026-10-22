import { episodeHref, episodeNumber, episodes, type Episode } from "./episodes";

/* Everything stored in the Stories console, from one list.
   - Left shelf: FIRST TAKE, the primary collection (from episodes.ts).
   - Right shelf: more JazzHQ stories, secondary; no episode numbers and
     no notes pages, they play on the console screen.
   To add a conversation: add an entry below with its public YouTube ID and a
   thumbnail in /public/podcasts/conversations. Never use studio.youtube.com links. */

export type Conversation = {
  title: string;
  duration: string;
  youtubeId: string;
  thumbnail: string;
  /** false keeps it off the console (e.g. the video is still private on YouTube). */
  published?: boolean;
};

export const conversations: Conversation[] = [
  {
    title: "From the Navy to Corporate Partnerships: Abby Malchow on Veteran Strengths and Career Transitions",
    duration: "34:44",
    youtubeId: "U-8w5a1D8QI",
    thumbnail: "/podcasts/conversations/U-8w5a1D8QI.jpg",
    // Private on YouTube as of 2026-10-21; publish the video, add its thumbnail, then remove this line.
    published: false,
  },
  {
    title: "The Future of Professional Services Automation (PSA) ft. @rocketlane and @Xceptor",
    duration: "30:06",
    youtubeId: "HDT_uGDf6L8",
    thumbnail: "/podcasts/conversations/HDT_uGDf6L8.jpg",
  },
  {
    title: "Partnership Playbook: Driving Revenue Through Events (ft. Ben Roodman, Founder - HeyBTW)",
    duration: "31:41",
    youtubeId: "ygK1Lo627DU",
    thumbnail: "/podcasts/conversations/ygK1Lo627DU.jpg",
  },
  {
    title: "A GTM Maestro's Playbook in the AI Age ft. Alex Scholz",
    duration: "36:23",
    youtubeId: "OdosnBGjkPA",
    thumbnail: "/podcasts/conversations/OdosnBGjkPA.jpg",
  },
  {
    title: "Why Most SaaS Partnerships Fail and How to Fix Them ft. Issac Betanzos",
    duration: "36:16",
    youtubeId: "PAnkrsmvp0s",
    thumbnail: "/podcasts/conversations/PAnkrsmvp0s.jpg",
  },
  {
    title: "Cracking Product Hunt ft. Laura Cruickshanks (Atlas)",
    duration: "49:50",
    youtubeId: "rLvphVCBpk0",
    thumbnail: "/podcasts/conversations/rLvphVCBpk0.jpg",
  },
  {
    title: "Your SaaS sales blueprint for 2025 and beyond ft. Shuba Baskaran",
    duration: "38:36",
    youtubeId: "dzpbu4s-dLc",
    thumbnail: "/podcasts/conversations/dzpbu4s-dLc.jpg",
  },
  {
    title: "The Unfiltered Truth About Demo Day ft. Nick Armstrong (Chirp)",
    duration: "31:36",
    youtubeId: "3SwuKwkuIKA",
    thumbnail: "/podcasts/conversations/3SwuKwkuIKA.jpg",
  },
  {
    title: "The ONLY SaaS partnerships masterclass you’ll ever need: a deep dive ft Heather Pertel @rocketlane",
    duration: "36:21",
    youtubeId: "s5E0xEiMbQY",
    thumbnail: "/podcasts/conversations/s5E0xEiMbQY.jpg",
  },
  {
    title: "Applying to @ycombinator in 2025? Watch this video NOW! Sneha: Merlin AI (YC S24) spills the tea",
    duration: "38:08",
    youtubeId: "mnpfQQn7OH4",
    thumbnail: "/podcasts/conversations/mnpfQQn7OH4.jpg",
  },
];

export type Collection = "first-take" | "more-stories";

export const COLLECTION_LABEL: Record<Collection, string> = {
  "first-take": "First Take",
  "more-stories": "More stories",
};

/** One physical case in the console. */
export type ConsoleMedia = {
  key: string;
  collection: Collection;
  side: "right" | "left";
  primary: boolean;
  title: string;
  guest?: string;
  duration: string;
  youtubeId: string;
  thumbnail: string;
  /** First Take only. */
  episode?: Episode;
  /** Notes page, when one exists. */
  href?: string;
  /** Printed on the case: kicker on the cover, big mark on the spine. */
  kicker: string;
  spineMark?: string;
  /** Short accessible / caption name, e.g. "Episode 02" or the title. */
  label: string;
  /** The small caption under a pulled-out case. */
  caption: string;
};

export const consoleMedia: ConsoleMedia[] = [
  ...episodes.map(
    (e): ConsoleMedia => ({
      key: e.slug,
      collection: "first-take",
      side: "left",
      primary: true,
      title: e.title,
      guest: e.guest,
      duration: e.duration,
      youtubeId: e.youtubeId,
      thumbnail: e.thumbnail,
      episode: e,
      href: episodeHref(e),
      kicker: `FIRST TAKE · EP ${episodeNumber(e)}`,
      spineMark: episodeNumber(e),
      label: `Episode ${episodeNumber(e)}`,
      caption: `EP. ${episodeNumber(e)}${e.guest ? ` · ${e.guest}` : ""}`,
    }),
  ),
  ...conversations
    .filter((c) => c.published !== false)
    .map(
      (c): ConsoleMedia => ({
        key: c.youtubeId,
        collection: "more-stories",
        side: "right",
        primary: false,
        title: c.title,
        duration: c.duration,
        youtubeId: c.youtubeId,
        thumbnail: c.thumbnail,
        kicker: "JAZZHQ · STORY",
        label: c.title,
        caption: `STORY · ${c.duration}`,
      }),
    ),
];
