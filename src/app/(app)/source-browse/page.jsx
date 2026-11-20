"use client";

import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readBrowsePage, sourceBrowseHref } from "@/lib/api/sourceBrowseNavigation.mjs";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { catalogGridClassName } from "@/lib/config/catalog.mjs";
import { MovieCard } from "@/components/MovieCard";
import { Pagination } from "@/components/Pagination";
import { useSourceBrowse } from "@/hooks/useSourceBrowse";
import {
  MaterialSymbolsMovieOutlineRounded,
  MaterialSymbolsVideoLibraryOutlineRounded,
  MaterialSymbolsCheckRounded
} from "@/components/icons";

export default function SourceBrowsePage() {
  return <Suspense fallback={<p role="status" className="py-20 text-muted">正在加载视频源…</p>}><SourceBrowse /></Suspense>;
}

function SourceBrowse() {
  const router = useRouter();
  const params = useSearchParams();
  const videoSources = useSettingsStore((state) => state.videoSources);
  const activeSources = useMemo(() => videoSources.filter(s => s.enabled), [videoSources]);

  const [retry, setRetry] = useState(0);
  const sourceKey = params.get("source");
  const activeSource = activeSources.find((source) => source.key === sourceKey) || activeSources[0];
  const matchingSource = activeSource?.key === sourceKey;
  const activeSourceId = activeSource?.id ?? null;
  const activeCategoryId = matchingSource ? params.get("category") || "all" : "all";
  const page = matchingSource ? readBrowsePage(params.get("page")) : 1;
  const returnVideo = matchingSource ? params.get("video") : null;
  const returnOffset = params.get("offset");
  const restoredEntry = useRef(null);
  const resultsRef = useRef(null);
  const metadata = useSourceBrowse(activeSource?.url, "categories", 1, "all", retry);
  const listing = useSourceBrowse(activeSource?.url, "videos", page, activeCategoryId, retry);
  const categories = metadata.data?.categories || [];
  const videos = listing.data?.list || [];
  const loading = listing.loading;
  const totalPages = listing.data?.pagecount || 1;
  const totalVideos = metadata.data?.total ?? listing.data?.total ?? 0;
  const categoryLabel = categories.find((entry) => entry.type_id === activeCategoryId)?.type_name;
  const returnEntry = returnVideo ? params.toString() : null;
  useEffect(() => {
    if (!returnEntry || loading || metadata.loading || !listing.data || restoredEntry.current === returnEntry) return;
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById(`browse-video-${returnVideo}`);
      const offset = Number(returnOffset);
      if (card && returnOffset !== null && Number.isFinite(offset) && Math.abs(offset) <= window.innerHeight) {
        const top = window.scrollY + card.getBoundingClientRect().top - offset;
        window.scrollTo({ top, behavior: "instant" });
      } else {
        (card || resultsRef.current)?.scrollIntoView({ block: card ? "center" : "start", behavior: "instant" });
      }
      restoredEntry.current = returnEntry;
    });
    return () => cancelAnimationFrame(frame);
  }, [returnEntry, returnVideo, returnOffset, loading, metadata.loading, listing.data]);

  function selectView(source, category = "all", nextPage = 1) {
    restoredEntry.current = null;
    window.history.replaceState(null, "", sourceBrowseHref({ source, category, page: nextPage }));
  }

  function openVideo(id, card) {
    const offset = Math.round(card.getBoundingClientRect().top);
    const origin = { source: activeSource.key, category: activeCategoryId, page, video: id, offset };
    const playback = new URLSearchParams({
      source: origin.source,
      browseCategory: origin.category,
      browsePage: String(origin.page),
      browseOffset: String(origin.offset),
    });
    if (categoryLabel) playback.set("browseLabel", categoryLabel);
    window.history.replaceState(null, "", sourceBrowseHref(origin));
    router.push(`/play/${encodeURIComponent(id)}?${playback}`);
  }

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-background-light flex flex-col">
      <main className="flex-1 max-w-7xl mx-auto w-full px-0 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">

        {/* Header Options */}
        <section>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">源浏览</h1>

          {/* Source Selector */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8">
            {activeSources.map(source => (
              <button
                key={source.id}
                onClick={() => selectView(source.key)}
                className={`shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border transition-all w-full sm:w-auto sm:min-w-[240px] cursor-pointer ${
                  activeSourceId === source.id
                    ? 'border-primary ring-1 ring-primary bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${activeSourceId === source.id ? 'bg-primary-dark text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <MaterialSymbolsMovieOutlineRounded className="text-xl" />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold text-base ${activeSourceId === source.id ? 'text-gray-900' : 'text-gray-700'}`}>
                      {source.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {activeSourceId === source.id && totalVideos > 0
                        ? `共 ${totalVideos.toLocaleString()} 个视频`
                        : "浏览此源"}
                    </p>
                  </div>
                </div>
                {activeSourceId === source.id && (
                  <div className="bg-primary-dark text-white rounded-full p-0.5">
                    <MaterialSymbolsCheckRounded className="text-sm" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Category Selector */}
          {activeSource && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-4">
              {metadata.loading && <span role="status">正在读取分类…</span>}
              {metadata.error && <span role="alert">分类暂不可用：{metadata.error}</span>}
              {(metadata.error || listing.error) && <button className="ui-button" onClick={() => setRetry((value) => value + 1)}>重试</button>}
            </div>
          )}
          {categories.length > 0 && (
             <div className="flex flex-wrap gap-2 sm:gap-3 items-center mb-6 sm:mb-8 pb-4 border-b border-gray-200/60">
              {[{ type_id: "all", type_name: "全部" }, ...categories].map(category => (
                <button
                  key={category.type_id}
                  onClick={() => {
                    selectView(activeSource.key, category.type_id);
                  }}
                  className={`px-4 sm:px-5 py-2.5 sm:py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    activeCategoryId === category.type_id
                      ? 'bg-primary-dark text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {category.type_name === '首页' ? '全部' : category.type_name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Video Grid */}
        <section ref={resultsRef} className="scroll-mt-24">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : listing.error ? (
            <div role="alert" className="surface-panel p-6 text-center space-y-3">
              <p>{listing.error}</p>
              <button className="ui-button" onClick={() => setRetry((value) => value + 1)}>重新加载</button>
              <p className="text-sm text-muted">也可以选择其他视频源；该错误不代表分类中没有视频。</p>
            </div>
          ) : videos.length > 0 ? (
            <>
              <div className={catalogGridClassName}>
                {videos.map((video, index) => (
                  <div id={`browse-video-${video.vod_id}`} key={`${activeSourceId}:${video.vod_id}`} className="min-w-0">
                    <MovieCard
                      onPlay={(card) => openVideo(video.vod_id, card)}
                      movie={{
                        id: video.vod_id,
                        title: video.vod_name,
                        poster: video.vod_pic,
                        rating: video.vod_remarks || video.vod_score || "",
                        source: activeSource?.key,
                        source_name: activeSource?.name,
                        source_url: activeSource?.url,
                      }}
                      showSpeedTest={false}
                      eager={index < 5}
                    />
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  pageCount={totalPages}
                  onPageChange={(nextPage) => selectView(activeSource.key, activeCategoryId, nextPage)}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <MaterialSymbolsVideoLibraryOutlineRounded className="text-6xl text-gray-300 mb-4" />
              <p>{activeSource ? "该分类下暂无视频" : "请先在设置中启用视频源"}</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
