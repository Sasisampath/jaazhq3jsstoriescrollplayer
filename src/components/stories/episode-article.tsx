import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { watchUrl, type ArticleBlock, type Episode } from "@/data/episodes";
import { PlayFrom } from "./episode-media";

/* Renders an episode's editorial sections from data. Each section is an
   anchor the table of contents points at. */

/** **bold** and *italic* inside a line of copy. */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Block({ block, episode }: { block: ArticleBlock; episode: Episode }) {
  switch (block.type) {
    case "paragraph":
      return <p>{inline(block.text)}</p>;
    case "quote":
      return <p className="ep-prose__quote">{inline(block.text)}</p>;
    case "pullquote":
      return (
        <blockquote className="ep-prose__pull">
          <p>{inline(block.text)}</p>
        </blockquote>
      );
    case "list":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{inline(item)}</li>
          ))}
        </ul>
      );
    case "callout":
      return <p className="ep-prose__callout">{inline(block.text)}</p>;
    case "figure":
      return (
        <figure className="ep-prose__figure">
          <Image src={block.src} alt={block.alt} width={block.width} height={block.height} sizes="(max-width: 860px) 100vw, 760px" />
        </figure>
      );
    case "podcast":
      return (
        <aside className="ep-prose__podcast" aria-label="From the podcast">
          <p className="ep-prose__podcast-label">
            <span aria-hidden>🎧</span> From the podcast
          </p>
          <p>{inline(block.text)}</p>
          {block.title && <p className="ep-prose__podcast-title">{inline(block.title)}</p>}
          <PlayFrom at={block.at} className="ep-prose__podcast-play">
            ▶ Watch from {block.at}
          </PlayFrom>
        </aside>
      );
    case "watch":
      return (
        <div className="ep-prose__watch">
          <p className="ep-prose__watch-title">{inline(block.title)}</p>
          <p>{inline(block.text)}</p>
          <p className="ep-prose__watch-actions">
            <PlayFrom at="0:00" className="ep-prose__watch-play">
              Watch episode
            </PlayFrom>
            <a href={watchUrl(episode)} target="_blank" rel="noopener noreferrer">
              Watch on YouTube ↗
            </a>
          </p>
        </div>
      );
  }
}

export function EpisodeArticle({ episode }: { episode: Episode }) {
  if (!episode.article) return null;
  return (
    <>
      {episode.article.sections.map((section) => (
        <section key={section.id} id={section.id} className="ep-prose__section" aria-label={section.heading ?? section.navLabel}>
          {section.heading && <h2>{section.heading}</h2>}
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} episode={episode} />
          ))}
        </section>
      ))}
    </>
  );
}
