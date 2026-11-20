"use client";

import { rememberSearchSelection } from "@/lib/api/cmsApi";
import { catalogGridClassName } from "@/lib/config/catalog.mjs";
import { MovieCard } from "@/components/MovieCard";
import { forwardDoubanImage } from "@/lib/api/doubanApi";

import { readBrowsePage, sourceBrowseHref } from "@/lib/api/sourceBrowseNavigation.mjs";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { extractEpisodeNumberFromTitle } from "@/lib/utils/util";
import { episodeLabelIdentity, matchingEpisode } from "@/lib/api/mediaIdentity.mjs";
import { episodePlaybackLines } from "@/lib/player/playbackLines.mjs";
import { useVideoData } from "@/hooks/useVideoData";
import { VideoPlayer } from "@/components/VideoPlayer";
import { FavoriteButton } from "@/components/FavoriteButton";
import { EpisodeList } from "@/components/EpisodeList";
import { DanmakuSetupNotice } from "@/components/DanmakuControls";
import { LoadingSpinner } from "@/components/PlayerPageLoading";
import {
  MaterialSymbolsHomeOutlineRounded,
  MaterialSymbolsMovieOutlineRounded,
  MaterialSymbolsPerson2OutlineRounded,
  MaterialSymbolsChevronRightRounded,
} from "@/components/icons";

export default function PlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  return <PlayerSession key={JSON.stringify([params.id, searchParams.toString()])} id={params.id} searchParams={searchParams} />;
}

function PlayerSession({ id, searchParams }) {
  const source = searchParams.get("source");
  const title = searchParams.get("title");
  const type = searchParams.get("type");
  const year = searchParams.get("year");
  const originalTitle = searchParams.get("originalTitle");
  const catalog = searchParams.get("catalog");
  const browseCategory = searchParams.get("browseCategory");
  const browseLabel = searchParams.get("browseLabel");
  const browseHref = source && browseCategory !== null ? sourceBrowseHref({
    source,
    category: browseCategory,
    page: readBrowsePage(searchParams.get("browsePage")),
    video: id,
    offset: searchParams.get("browseOffset"),
  }) : null;
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const playbackTimeRef = useRef(null);
  const { videoDetail, danmakuVideo, doubanActors, alternatives, metadata, searching, error, switchSource, switchLine, startTime, manualResults, relatedVideos } =
    useVideoData(id, source, title, type, year, originalTitle, catalog, setCurrentEpisodeIndex);

  const sameSource = danmakuVideo?.source === videoDetail?.source;
  const canonicalIndex = sameSource || !videoDetail ? currentEpisodeIndex : matchingEpisode(videoDetail, currentEpisodeIndex, danmakuVideo);
  if (error) {
    return (
      <div className="w-full max-w-[1440px] flex min-h-[60dvh] items-center justify-center py-8">
        <div role="alert" className="surface-panel w-full max-w-md p-8 text-center">
          <div aria-hidden="true" className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-dark">
            <MaterialSymbolsMovieOutlineRounded className="text-2xl" />
          </div>
          <h1 className="text-xl font-semibold text-ink">暂时无法加载影片</h1>
          <p className="mt-2 text-sm leading-6 text-muted break-words">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            {browseHref ? <Link href={browseHref} scroll={false} className="ui-button">返回视频源</Link> : <Link href="/" className="ui-button">返回首页</Link>}
            <Link href={title ? `/search?${new URLSearchParams({ q: title })}` : "/search"} className="ui-button ui-button-primary">重新搜索</Link>
          </div>
        </div>
      </div>
    );
  }

  if (manualResults) {
    return (
      <section className="w-full max-w-[1440px] space-y-5 py-6" aria-labelledby="unmatched-heading">
        <header className="surface-panel p-5 sm:p-6">
          <h1 id="unmatched-heading" className="text-xl font-semibold text-ink">未匹配到影片，以下是相关推荐～</h1>
          <p className="mt-2 text-sm text-muted">{title}</p>
          {manualResults.length === 0 && <p className="mt-2 text-sm text-muted">当前视频源没有返回可播放的推荐条目。</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/" className="ui-button">返回首页</Link>
            <Link href={`/search?${new URLSearchParams({ q: title })}`} className="ui-button">重新搜索</Link>
          </div>
        </header>
        {manualResults.length > 0 && (
          <div className={catalogGridClassName}>
            {manualResults.map((entry, index) => <MovieCard key={JSON.stringify([entry.source, entry.id])} movie={entry} eager={index < 5} />)}
          </div>
        )}
      </section>
    );
  }

  if (!videoDetail) return <LoadingSpinner />;

  const episodeCount = videoDetail.episodes?.length || 0;
  const episodeTitle = videoDetail.episodes_titles?.[currentEpisodeIndex] || (episodeCount === 1 ? "正片" : `第 ${currentEpisodeIndex + 1} 集`);
  const typeName = videoDetail.type_name || ({ movie: "电影", tv: "电视剧", short: "短剧" }[videoDetail.type] || "影片");
  const actors = metadata?.actors?.length ? metadata.actors : doubanActors.length ? doubanActors : (videoDetail.actors || []);
  const description = metadata?.desc || videoDetail.desc;
  const poster = forwardDoubanImage(metadata?.poster || videoDetail.poster);
  const latencyMs = alternatives.find((entry) => entry.source === videoDetail.source)?.latencyMs ?? videoDetail.latencyMs;
  const otherSources = alternatives.filter((entry) => entry.source !== videoDetail.source && matchingEpisode(videoDetail, currentEpisodeIndex, entry) >= 0);
  const playbackLines = episodePlaybackLines(videoDetail, currentEpisodeIndex);
  const danmakuTitle = title || danmakuVideo.title;
  const isMovie = (type || danmakuVideo.type) === "movie";
  const danmakuIndex = canonicalIndex >= 0 ? canonicalIndex : currentEpisodeIndex;
  const danmakuLabel = (canonicalIndex >= 0 ? danmakuVideo : videoDetail).episodes_titles?.[danmakuIndex] || "";
  const danmakuParams = new URLSearchParams({ title: danmakuTitle });
  if (!isMovie) {
    const label = episodeLabelIdentity(danmakuLabel);
    const number = /^\d+$/.test(label) ? Number(label) : extractEpisodeNumberFromTitle(danmakuLabel, false);
    if (number || !danmakuLabel) danmakuParams.set("episode", String(number || danmakuIndex + 1));
  }
  const danmakuQuery = danmakuParams.toString();

  return (
    <div className="catalog-watch-page w-full mx-auto pt-4 sm:pt-6 space-y-4 sm:space-y-5 page-enter">
      <nav aria-label="当前位置" className="flex min-h-8 items-center gap-2 text-xs sm:text-sm text-muted min-w-0">
        <Link href="/" className="flex min-h-8 items-center gap-1 hover:text-primary-dark transition-colors shrink-0">
          <MaterialSymbolsHomeOutlineRounded className="text-lg" aria-hidden="true" /> 首页
        </Link>
        <MaterialSymbolsChevronRightRounded className="text-base shrink-0 text-muted/60" aria-hidden="true" />
        {browseHref ? (
          <Link href={browseHref} scroll={false} className="min-w-0 max-w-[40%] truncate hover:text-primary-dark hover:underline">
            {browseLabel || typeName}
          </Link>
        ) : <span className="shrink-0">{typeName}</span>}
        <MaterialSymbolsChevronRightRounded className="text-base shrink-0 text-muted/60" aria-hidden="true" />
        <span aria-current="page" className="truncate text-ink">{videoDetail.title}</span>
      </nav>

      <div className="watch-layout watch-layout--catalog">
        <section aria-label="视频播放" className="surface-panel min-w-0 overflow-hidden">
          <div className="watch-screen">
            <VideoPlayer
              key={JSON.stringify([videoDetail.source, videoDetail.id, videoDetail.playbackLineId])}
              videoDetail={videoDetail}
              currentEpisodeIndex={currentEpisodeIndex}
              setCurrentEpisodeIndex={setCurrentEpisodeIndex}
              danmakuQuery={danmakuQuery}
              playbackTimeRef={playbackTimeRef}
              startTime={startTime}
            />
          </div>

          <div className="px-4 py-4 sm:px-5 sm:py-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-lg sm:text-[22px] leading-snug font-semibold text-ink break-words">{metadata?.title || videoDetail.title}</h1>
                <span className="text-sm text-primary-dark font-medium">{episodeTitle}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {(metadata?.year || videoDetail.year !== "unknown") && <span>{metadata?.year || videoDetail.year}</span>}
                <span>{typeName}</span>
                {metadata?.rating && <span>TMDB {metadata.rating}</span>}
                {episodeCount > 1 && <span>共 {episodeCount} 集</span>}
                <span className="rounded-md bg-surface-active px-2 py-0.5">{videoDetail.source_name}{latencyMs != null && ` · ${latencyMs} ms`}</span>
              </div>
            </div>
            <FavoriteButton source={videoDetail.source} id={videoDetail.id} videoDetail={videoDetail} showLabel />
          </div>

          <DanmakuSetupNotice />

          {playbackLines.length > 1 && (
            <div role="group" aria-label="播放线路" className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
              <span className="mr-1 text-sm font-medium text-ink">播放线路</span>
              {playbackLines.map((line) => (
                <button key={line.id} type="button" className="filter-chip btn-press"
                  aria-pressed={line.episodes[currentEpisodeIndex] === videoDetail.episodes[currentEpisodeIndex]}
                  onClick={() => switchLine(line, currentEpisodeIndex, playbackTimeRef.current?.())}>
                  {line.name}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-line px-4 py-3 sm:px-5" aria-label="视频源">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium text-ink">切换视频源</span>
              {otherSources.map((entry) => (
                <button key={entry.source} type="button" className="ui-button tabular-nums" onClick={() =>
                  switchSource(entry, currentEpisodeIndex, playbackTimeRef.current?.() ?? 0)}>
                  {entry.source_name} · {entry.latencyMs} ms
                </button>
              ))}
              {searching && <span role="status" className="text-xs text-muted">正在查找其他片源…</span>}
              {!searching && otherSources.length === 0 && <span className="text-xs text-muted">当前集暂无其他片源</span>}
            </div>
          </div>
        </section>

        <aside id="episode-panel" aria-label="选集与相关推荐" className="watch-sidebar">
          <div className="watch-episode-panel surface-panel overflow-y-auto">
            <EpisodeList
              key={JSON.stringify([videoDetail.source, videoDetail.id])}
              episodes={videoDetail.episodes}
              episodesTitles={videoDetail.episodes_titles}
              currentEpisodeIndex={currentEpisodeIndex}
              onEpisodeClick={setCurrentEpisodeIndex}
            />
            {relatedVideos.length > 0 && (
              <section aria-labelledby="related-heading" className="border-t border-line p-4">
                <h2 id="related-heading" className="text-sm font-semibold text-ink">相关推荐</h2>
                <ul className="mt-2 divide-y divide-line">
                  {relatedVideos.map((entry) => (
                    <li key={JSON.stringify([entry.source, entry.id])}>
                      <Link href={`/play/${encodeURIComponent(entry.id)}?${new URLSearchParams({ source: entry.source })}`}
                        onClick={() => rememberSearchSelection(entry)} className="group flex items-center gap-3 rounded-md px-1 py-2.5 focus-visible:ring-2 focus-visible:ring-primary">
                        <span aria-hidden="true" className="relative flex aspect-2/3 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-active text-muted">
                          <MaterialSymbolsMovieOutlineRounded className="text-xl" />
                          {entry.poster && (
                            <Image alt="" src={forwardDoubanImage(entry.poster)} fill sizes="48px" unoptimized className="object-cover"
                              onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-5 text-ink break-words group-hover:text-primary-dark">{entry.title}</span>
                          <span className="mt-1 block text-xs text-muted tabular-nums">{entry.source_name} · {entry.latencyMs} ms</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </aside>
      </div>

      <section aria-labelledby="video-info-heading" className="surface-panel p-4 sm:p-5 lg:p-6">
        <div className={`grid gap-6 ${actors.length > 0 ? "xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" : ""}`}>
          <div className="flex min-w-0 gap-4 sm:gap-5">
            <div className="relative aspect-2/3 w-20 sm:w-24 shrink-0 self-start overflow-hidden rounded-xl bg-surface-active border border-line">
              <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-muted">
                <MaterialSymbolsMovieOutlineRounded className="text-3xl" />
              </div>
              {poster && (
                <Image alt={`${videoDetail.title}海报`} className="object-cover" src={poster} fill sizes="96px" unoptimized onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="video-info-heading" className="text-base font-semibold text-ink">剧情简介</h2>
              {videoDetail.genre && <p className="mt-1 text-xs text-muted">{videoDetail.genre}</p>}
              <p id="video-description" hidden={Boolean(description) && !descExpanded} className="mt-3 text-sm leading-7 text-muted break-words">
                {description || "暂无剧情简介。"}
              </p>
              {description && (
                <button type="button" onClick={() => setDescExpanded((value) => !value)} className="mt-1 flex min-h-11 items-center gap-1 rounded-md text-xs font-medium text-primary-dark cursor-pointer" aria-expanded={descExpanded} aria-controls="video-description">
                  {descExpanded ? "隐藏简介" : "显示简介"}
                  <MaterialSymbolsChevronRightRounded className={`text-base transition-transform duration-150 ${descExpanded ? "-rotate-90" : "rotate-90"}`} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {actors.length > 0 && (
            <div className="min-w-0 border-t border-line pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
              <h2 className="flex items-baseline gap-2 text-base font-semibold text-ink">演员 <span className="text-xs font-normal text-muted">{actors.length} 位</span><span className="ml-auto text-xs font-normal text-muted">横向浏览</span></h2>
              <ul aria-label="演员列表" tabIndex={0} data-player-shortcut-exempt className="mt-4 flex gap-4 overflow-x-auto custom-scrollbar pb-2 rounded-lg">
                {actors.map((actor, idx) => (
                  <li key={actor.id || idx} className="w-16 shrink-0">
                    <div className="relative w-14 h-18 overflow-hidden rounded-lg bg-surface-active border border-line">
                      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-muted">
                        <MaterialSymbolsPerson2OutlineRounded className="text-2xl" />
                      </div>
                      {actor.avatar && (
                        <Image src={actor.avatar} alt="" fill sizes="56px" className="object-cover" unoptimized onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-5 font-medium text-ink break-words">{actor.name}</p>
                    {actor.role && <p className="mt-0.5 text-xs leading-5 text-muted break-words">{actor.role}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
