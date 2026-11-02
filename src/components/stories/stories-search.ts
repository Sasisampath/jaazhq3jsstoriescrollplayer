import type { Topic } from "@/data/episodes";
import { COLLECTION_LABEL, consoleMedia, type ConsoleMedia } from "@/data/media";

/* Gallery search + topic filter, over the same consoleMedia as everything else.
   Small data, so plain client-side matching: no library, no requests. */

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .toLowerCase();

/** Everything a visitor might type for one story: title, guest, company, topics, series. */
const haystack = (item: ConsoleMedia) =>
  fold(
    [item.title, item.guest, item.company, item.topics.join(" "), COLLECTION_LABEL[item.collection], item.label]
      .filter(Boolean)
      .join(" "),
  );

const INDEX = new Map(consoleMedia.map((item) => [item, haystack(item)]));

/** Every word of the query must appear somewhere (case-insensitive, partial words fine). */
export function searchStories(query: string, topic: Topic | null): ConsoleMedia[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return consoleMedia.filter((item) => {
    if (topic && !item.topics.includes(topic)) return false;
    const text = INDEX.get(item) ?? "";
    return words.every((word) => text.includes(word));
  });
}
