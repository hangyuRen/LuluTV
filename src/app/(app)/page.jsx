"use client";
import { useState, useEffect, useEffectEvent, useRef } from "react";
import { CATALOG_PAGE_SIZE, catalogGridClassName } from "@/lib/config/catalog.mjs";
import { TmdbDiscovery } from "@/components/TmdbDiscovery";
import { Pagination } from "@/components/Pagination";
import { MovieCard } from "@/components/MovieCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ContinueWatching } from "@/components/ContinueWatching";
import { SearchBox } from "@/components/SearchBox";
import { MediaTypeSwitch } from "@/components/MediaTypeSwitch";
import { ResultItem } from "@/components/ResultItem";
import { usePlayHistoryStore } from "@/stores/usePlayHistoryStore";
import { fetchFromDouban, convertDoubanToMovie } from "@/lib/api/doubanApi";
import { refreshDiscoveryTags } from "@/lib/api/discoveryTags";
import { discoveryCategories, discoverySorts, defaultTags, categoryTags } from "@/lib/config/discovery";
import { MaterialSymbolsMovieOutlineRounded } from "@/components/icons";

export default function Home() {
  const [provider, setProvider] = useState("douban");
  const [mediaType, setMediaType] = useState("movie");
  const [currentTag, setCurrentTag] = useState("");
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("recommend");
  const [tagProbe, setTagProbe] = useState(null);
  const [error, setError] = useState("");
  const [shortTags, setShortTags] = useState([]);
  const [shortTag, setShortTag] = useState("hot-drama");
  const [shortHasMore, setShortHasMore] = useState(false);
  const [shortPageCount, setShortPageCount] = useState(null);
  const recommendationHeading = useRef(null);

  // 获取播放记录
  const playHistory = usePlayHistoryStore((state) => state.playHistory);

  const category = discoveryCategories.find((item) => item.value === mediaType) || discoveryCategories[0];
  const isShort = provider === "hongguo";
  const hasTagOptions = !isShort && !category.tag;
  const tagResult = hasTagOptions
    ? tagProbe?.[category.type]
      || { tags: defaultTags[category.type], source: "pending" }
    : null;
  const currentTags = tagResult ? categoryTags(category, tagResult.tags) : [];
  const activeTag = isShort ? shortTag : category.tag || (currentTags.includes(currentTag) ? currentTag : (currentTags[0] || ""));

  const applyTagResult = useEffectEvent((type, result) => {
    // Keep the current query stable when a refreshed list changes its order.
    if (hasTagOptions && category.type === type) {
      if (result.tags.includes(activeTag)) {
        setCurrentTag(activeTag);
      } else {
        setCurrentTag(result.tags[0] || "");
        setPage(0);
      }
    }
    setTagProbe((previous) => ({ ...previous, [type]: result }));
  });

  useEffect(() => {
    if (provider !== "douban") return;
    const controller = new AbortController();
    let storage;
    try { storage = window.localStorage; } catch { /* Cache is optional. */ }
    for (const type of ["movie", "tv"]) {
      void refreshDiscoveryTags(type, {
        signal: controller.signal,
        storage,
        onResult: (result) => applyTagResult(type, result),
      });
    }
    return () => controller.abort();
  }, [provider]);

  useEffect(() => {
    if (provider === "tmdb") return;
    const controller = new AbortController();
    async function loadMovies() {
      setLoading(true);
      setError("");
      if (!isShort && !activeTag) {
        setMovies([]);
        setLoading(false);
        return;
      }
      try {
        if (isShort) {
          const params = new URLSearchParams({ tag: activeTag, page_limit: String(CATALOG_PAGE_SIZE), page_start: String(page * CATALOG_PAGE_SIZE) });
          const res = await fetch("/api/hongguo?" + params, { signal: controller.signal });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error || "获取短剧失败");
          if (controller.signal.aborted) return;
          setShortTags(data.tags || []);
          setShortHasMore(data.hasMore === true);
          setShortPageCount(data.pageCount ?? null);
          setMovies((data.list || []).map((item) => ({ ...item, rating: "暂无" })));
        } else {
          const data = await fetchFromDouban(category.type, activeTag, CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE, sort, controller.signal);
          if (controller.signal.aborted) return;
          setMovies(data.subjects.map((item) => convertDoubanToMovie(item, category.type)));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
          setMovies([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadMovies();
    return () => controller.abort();
  }, [category, activeTag, page, sort, provider, isShort]);

  const handleMediaTypeChange = (type) => {
    setMediaType(type);
    setCurrentTag("");
    setPage(0);
  };

  const handleTagClick = (tag) => {
    setCurrentTag(tag);
    setPage(0);
  };

  function changePage(nextPage) {
    if (nextPage === page + 1) return;
    setLoading(true);
    setPage(nextPage - 1);
    recommendationHeading.current?.scrollIntoView({ block: "start" });
  }

  return (
    <div className="w-full max-w-[1440px] flex flex-col gap-6 sm:gap-8 pt-4 sm:pt-6 page-enter">
      <section aria-labelledby="discovery-heading" className="discovery-hero">
        <div className="discovery-hero-content">
          <h1 id="discovery-heading">山水之间<br />自有好戏</h1>
          <p className="mt-3 mb-6 text-sm sm:text-base text-ink">寻一部电影，偷得浮生半日闲。</p>
          <SearchBox />
        </div>
      </section>

      {playHistory && playHistory.length > 0 && <ContinueWatching playHistory={playHistory} />}

      <div className="discovery-shelf">
        <h2 className="ink-heading">观影片单</h2>
        <div role="group" aria-label="推荐榜单" className="provider-tabs flex flex-wrap gap-x-4 gap-y-1 sm:gap-x-6">
          {[["douban", "豆瓣"], ["tmdb", "TMDB"], ["hongguo", "红果短剧"]].map(([key, label]) => (
            <button key={key} type="button" aria-pressed={provider === key} className="provider-tab btn-press" onClick={() => {
              if (key === provider) return;
              setProvider(key);
              setShortPageCount(null);
              setPage(0);
              setMovies([]);
              setError("");
              setLoading(true);
            }}>{label}</button>
          ))}
        </div>
      </div>
      {provider === "tmdb" ? <TmdbDiscovery /> : <>
      <section aria-label="内容筛选" className="surface-panel px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isShort ? <h2 className="text-sm font-semibold text-ink">短剧分类</h2> : <MediaTypeSwitch value={mediaType} onChange={handleMediaTypeChange} discovery />}
        </div>

        {isShort && shortTags.length > 0 && (
          <div role="toolbar" aria-label="短剧分类" className="mt-3 border-t border-line pt-3 flex flex-wrap gap-1">
            {shortTags.map((tag) => (
              <button key={tag.value} type="button" aria-pressed={shortTag === tag.value} className="filter-chip btn-press" onClick={() => {
                if (shortTag !== tag.value) setShortPageCount(null);
                setShortTag(tag.value);
                setPage(0);
              }}>{tag.label}</button>
            ))}
          </div>
        )}

        {hasTagOptions && currentTags.length > 0 && (
          <div className="mt-3 border-t border-line pt-3 flex items-start gap-2">
            <div className="flex flex-1 min-w-0 gap-1 overflow-x-auto hide-scrollbar sm:flex-wrap px-1 py-1" role="toolbar" aria-label="分类标签">
              {currentTags.map((tag) => (
                <button type="button" key={tag} onClick={() => handleTagClick(tag)} aria-pressed={tag === activeTag} className="filter-chip btn-press">{tag}</button>
              ))}
            </div>

          </div>
        )}
        {!isShort && <>
          {hasTagOptions && <p role="status" className="mt-2 text-xs text-muted">
            {["pending", "cached"].includes(tagResult?.source) ? "正在后台更新分类标签…" : tagResult?.source === "stale" ? "标签暂时无法更新，继续使用上次成功获取的标签。" : tagResult?.source === "fallback" ? "标签暂时无法更新，已使用默认标签；刷新后重新获取。" : currentTags.length === 0 ? "豆瓣当前未提供此分类标签。" : ""}
          </p>}
          {mediaType === "anime" && <p className="mt-2 text-xs text-muted">当前动漫片单来自豆瓣电视剧下的日本动画分类。</p>}
          {mediaType === "variety" && <p className="mt-2 text-xs text-muted">当前综艺片单来自豆瓣电视剧下的综艺分类。</p>}
          {mediaType === "documentary" && <p className="mt-2 text-xs text-muted">当前纪录片片单来自豆瓣电视剧下的纪录片分类。</p>}
          <div role="group" aria-label="排序方式" className="mt-3 flex flex-wrap gap-2">
            {discoverySorts.map((option) => <button key={option.value} type="button" aria-pressed={sort === option.value} onClick={() => { setSort(option.value); setPage(0); }} className="filter-chip btn-press">{option.label}</button>)}
          </div>
        </>}
      </section>

      {/* Popular Section */}
      <section aria-labelledby="recommendation-heading">
        <div className="mb-5">
          <h2 id="recommendation-heading" ref={recommendationHeading} className="scroll-mt-24 font-display text-lg sm:text-xl font-semibold text-ink">{isShort ? "热门短剧" : category.label + "片单"}</h2>
          <p className="mt-1 text-xs text-muted truncate">{isShort ? `红果热播推荐 · ${shortTags.find((tag) => tag.value === shortTag)?.label || "全部"}` : ["豆瓣", category.label, hasTagOptions && activeTag, discoverySorts.find((option) => option.value === sort).label].filter(Boolean).join(" · ")}</p>
        </div>

        {loading ? (
          <div aria-busy="true" aria-label="加载中" className={catalogGridClassName}>
            {Array.from({ length: CATALOG_PAGE_SIZE }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div role="status" className="surface-panel flex flex-col items-center justify-center gap-3 py-14 px-5 text-center text-muted">
            <MaterialSymbolsMovieOutlineRounded className="text-4xl" aria-hidden="true" />
            <p className="text-sm">{error || "暂时没有内容，请稍后重试或切换分类"}</p>
          </div>
        ) : (
          <div className={catalogGridClassName}>
            {movies.map((movie, index) => (
              <ResultItem key={movie.id} index={index}>
                <MovieCard movie={movie} eager={index < 5} />
              </ResultItem>
            ))}
          </div>
        )}
        <Pagination
          currentPage={page + 1}
          pageCount={isShort ? shortPageCount : null}
          hasNextPage={isShort ? shortHasMore : movies.length === CATALOG_PAGE_SIZE}
          onPageChange={changePage}
          disabled={loading}
          alignRight
        />
      </section>

      </>}
    </div>
  );
}
