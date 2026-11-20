"use client";

import { recommendedPlaybackHref } from "@/lib/api/mediaIdentity.mjs";
import { rememberSearchSelection } from "@/lib/api/cmsApi";
import { useRouter } from "next/navigation";
import * as m from "motion/react-m";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { pressSpring, reducedMotionQuery } from "@/lib/motion";
import { SpeedTestBadge } from "@/components/SpeedTestBadge";
import { MaterialSymbolsStarRounded, MaterialSymbolsMovieOutlineRounded, MaterialSymbolsPlayArrowRounded } from "@/components/icons";

import { forwardDoubanImage } from "@/lib/api/doubanApi";
import { useSearchScrollStore } from "@/stores/useSearchScrollStore";

export function MovieCard({ movie, showSpeedTest = true, eager = false, onPlay }) {
  const router = useRouter();
  const reduceMotion = useMediaQuery(reducedMotionQuery);
  const clearScrollPosition = useSearchScrollStore((state) => state.clearScrollPosition);

  const posterUrl = forwardDoubanImage(movie.poster);

  const cardDetails = [movie.year === "unknown" ? null : movie.year, movie.source_name,
    movie.latencyMs != null ? `${movie.latencyMs} ms` : null].filter(Boolean).join(" · ");

  const handleClick = (event) => {
    if (onPlay) {
      onPlay(event.currentTarget);
      return;
    }
    // Source IDs belong to the playback provider, while chart IDs belong to the metadata provider.
    if (movie.source) {
      if (movie.episodes?.length && movie.latencyMs != null) rememberSearchSelection(movie);
      router.push(`/play/${encodeURIComponent(movie.id)}?${new URLSearchParams({ source: movie.source })}`);
    } else if (movie.metadataSource) {
      router.push(recommendedPlaybackHref(movie));
    } else {
      clearScrollPosition();
      router.push(`/search?q=${encodeURIComponent(movie.title)}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <m.div
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={pressSpring}
      role="link"
      tabIndex={0}
      aria-label={movie.title}
      className="group relative flex flex-col gap-2.5 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary-dark focus-visible:ring-offset-4 focus-visible:ring-offset-background-light"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="relative w-full aspect-2/3 overflow-hidden rounded-xl bg-surface-active ring-1 ring-black/5 transition-[box-shadow] duration-200 group-hover:shadow-soft group-hover:ring-primary/50">
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-3 text-muted/70">
          <MaterialSymbolsMovieOutlineRounded className="text-3xl" />
          <span className="text-xs text-center line-clamp-2">{movie.title}</span>
        </div>
        {movie.rating && movie.rating !== "暂无" && (
          <div className="absolute top-2 right-2 bg-surface-light/95 text-ink text-xs font-semibold px-1.5 py-1 rounded-md flex items-center gap-0.5 z-10 shadow-card">
            <MaterialSymbolsStarRounded className="text-primary-dark text-[14px]" aria-hidden="true" />
            <span aria-label={`评分 ${movie.rating}`}>{movie.rating}</span>
          </div>
        )}
        {posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt=""
            // 首屏第一行海报是 LCP 候选，立即加载并提高优先级；其余懒加载
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
            className="relative w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          />
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-2 left-2 flex size-8 items-center justify-center rounded-full bg-surface-light text-ink opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200">
          <MaterialSymbolsPlayArrowRounded className="text-xl" />
        </div>
        {movie.doubanUrl && (
          <div className="absolute bottom-2 right-2 z-10">
            <a
              href={movie.doubanUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-h-8 items-center bg-surface-light/95 hover:bg-primary-soft text-ink text-xs px-2 rounded-md transition-colors"
              title="在豆瓣查看"
              aria-label={`在豆瓣查看 ${movie.title}`}
            >
              豆瓣
            </a>
          </div>
        )}
        {movie.hongguoUrl && (
          <div className="absolute bottom-2 right-2 z-10">
            <a
              href={movie.hongguoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-h-8 items-center bg-surface-light/95 hover:bg-primary-soft text-ink text-xs px-2 rounded-md transition-colors"
              title="在红果查看"
              aria-label={`在红果查看 ${movie.title}`}
            >
              红果
            </a>
          </div>
        )}
        {showSpeedTest && movie.latencyMs == null && movie.source && movie.source_url && (
          <SpeedTestBadge
            videoId={movie.id}
            sourceKey={movie.source}
            sourceName={movie.source_name}
            sourceUrl={movie.source_url}
          />
        )}
      </div>
      <div>
        <h3 className="text-ink text-sm sm:text-[15px] font-medium leading-6 truncate group-hover:text-primary-dark transition-colors" title={movie.title}>
          {movie.title}
        </h3>
        {cardDetails && <p className="mt-0.5 text-xs leading-5 text-muted" title={cardDetails}>{cardDetails}</p>}
      </div>
    </m.div>
  );
};
