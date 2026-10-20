import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GridBackground } from "@/components/layout/grid-background";
import { Header } from "@/components/layout/header";
import Footer from "@/components/shared/footer";
import { EpisodeMedia } from "@/components/stories/episode-media";
import { MoreFromFirstTake } from "@/components/stories/more-from-first-take";
import "@/components/stories/episode.css";
import {
  SHOW_TITLE,
  durationLabel,
  episodeHref,
  episodeLabel,
  episodeNumber,
  episodes,
  getEpisode,
  isoDuration,
  neighbours,
} from "@/data/episodes";
import { pageSeo } from "@/lib/seo";

/* One template for every FIRST TAKE episode, generated from the episode data. */

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return episodes.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const episode = getEpisode((await params).slug);
  if (!episode) return {};
  return pageSeo({
    title: `${episode.title} | ${SHOW_TITLE}`,
    description: episode.description,
    path: episodeHref(episode),
    image: episode.thumbnail,
  });
}

export default async function EpisodePage({ params }: Props) {
  const episode = getEpisode((await params).slug);
  if (!episode) notFound();
  const { previous, next } = neighbours(episode);

  return (
    <GridBackground>
      <Header />
      <main className="ep-page flex-1">
        <article className="page-section ep-article" aria-labelledby="ep-title">
          <header className="ep-head">
            <p className="ep-eyebrow">
              <Link href="/stories">{SHOW_TITLE}</Link>
              <span aria-hidden> · </span>
              <span>{episodeLabel(episode).toUpperCase()}</span>
            </p>
            <h1 id="ep-title" className="ep-title">
              {episode.title}
            </h1>
            <p className="ep-meta">
              {episode.guest && <span>{episode.guest}</span>}
              <span>
                <time dateTime={isoDuration(episode.duration)}>{durationLabel(episode.duration)}</time>
              </span>
            </p>
          </header>

          <EpisodeMedia episode={episode} />

          {episode.description && (
            <section className="ep-about" aria-labelledby="ep-about-title">
              <h2 id="ep-about-title" className="ep-section-title">
                About this episode
              </h2>
              <p>{episode.description}</p>
            </section>
          )}

          <nav className="ep-pager" aria-label="Episodes">
            {previous ? (
              <Link className="ep-pager__link" href={episodeHref(previous)} rel="prev">
                <span className="ep-pager__dir">← Previous episode</span>
                <span className="ep-pager__title">
                  EP. {episodeNumber(previous)} · {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link className="ep-pager__link ep-pager__link--next" href={episodeHref(next)} rel="next">
                <span className="ep-pager__dir">Next episode →</span>
                <span className="ep-pager__title">
                  EP. {episodeNumber(next)} · {next.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>

        <MoreFromFirstTake current={episode.slug} />
      </main>
      <Footer />
    </GridBackground>
  );
}
