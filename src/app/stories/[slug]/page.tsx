import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GridBackground } from "@/components/layout/grid-background";
import { Header } from "@/components/layout/header";
import Footer from "@/components/shared/footer";
import { BackToFirstTake } from "@/components/stories/back-to-first-take";
import { EpisodeArticle } from "@/components/stories/episode-article";
import { EpisodeMedia } from "@/components/stories/episode-media";
import { EpisodeToc } from "@/components/stories/episode-toc";
import { MoreFromFirstTake } from "@/components/stories/more-from-first-take";
import "@/components/stories/episode.css";
import {
  SHOW_NAME,
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
    description: episode.description ?? episode.article?.dek,
    path: episodeHref(episode),
    image: episode.thumbnail,
  });
}

export default async function EpisodePage({ params }: Props) {
  const episode = getEpisode((await params).slug);
  if (!episode) notFound();
  const { previous, next } = neighbours(episode);

  const { article } = episode;
  const toc = article?.sections.map((section) => ({ id: section.id, label: section.navLabel ?? section.heading ?? section.id })) ?? [];

  const pager = (
    <nav className="ep-pager" aria-label="More episodes">
      {previous ? (
        <Link className="ep-pager__link" href={episodeHref(previous)} rel="prev">
          <span className="ep-pager__dir">← Previous</span>
          <span className="ep-pager__title">
            EP. {episodeNumber(previous)} · {previous.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link className="ep-pager__link ep-pager__link--next" href={episodeHref(next)} rel="next">
          <span className="ep-pager__dir">Next →</span>
          <span className="ep-pager__title">
            EP. {episodeNumber(next)} · {next.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );

  return (
    <GridBackground>
      <Header />
      <BackToFirstTake slug={episode.slug} />
      <main className="ep-page flex-1">
        <article aria-labelledby="ep-title">
          <header className="page-section ep-hero">
            <p className="ep-eyebrow">
              <Link href="/stories">{SHOW_NAME}</Link>
              <span aria-hidden> · </span>
              <span>{episodeLabel(episode).toUpperCase()}</span>
            </p>
            <h1 id="ep-title" className="ep-title">
              {episode.title}
            </h1>
            {article?.dek && <p className="ep-dek">{article.dek}</p>}
            <p className="ep-meta">
              {episode.guest && <span>{episode.guest}</span>}
              <span>
                <time dateTime={isoDuration(episode.duration)}>{durationLabel(episode.duration)}</time>
              </span>
            </p>
          </header>

          <div className="page-section ep-media-wrap">
            <EpisodeMedia episode={episode} />
          </div>

          {article ? (
            <div className="page-section ep-layout">
              <EpisodeToc items={toc} articleId="episode-notes" />
              <div className="ep-column">
                <div id="episode-notes" className="ep-prose">
                  <EpisodeArticle episode={episode} />
                </div>
                {pager}
              </div>
            </div>
          ) : (
            <div className="page-section ep-solo">
              {episode.description && (
                <div className="ep-prose">
                  <p>{episode.description}</p>
                </div>
              )}
              {pager}
            </div>
          )}
        </article>

        <MoreFromFirstTake current={episode.slug} />
      </main>
      <Footer />
    </GridBackground>
  );
}
