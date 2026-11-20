"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CATALOG_PAGE_SIZE, catalogGridClassName } from "@/lib/config/catalog.mjs";
import { TMDB_API_APPLICATION_URL, TMDB_KEY_HEADER, TMDB_SETTINGS_HREF } from "@/lib/config/tmdb";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { MediaTypeSwitch } from "@/components/MediaTypeSwitch";
import { MovieCard } from "@/components/MovieCard";
import { Pagination } from "@/components/Pagination";
import { SkeletonCard } from "@/components/SkeletonCard";

const charts = [
  ["trending", "本周趋势"],
  ["popular", "热门"],
  ["top_rated", "高分"],
];

export function TmdbDiscovery() {
  const tmdbApiKey = useSettingsStore((state) => state.tmdbApiKey);
  const [type, setType] = useState("movie");
  const [chart, setChart] = useState("trending");
  const [page, setPage] = useState(1);
  const filterPanel = useRef(null);
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState(null);
  const query = new URLSearchParams({ type, chart, page: String(page) }).toString();
  const requestKey = `${query}&retry=${retry}`;
  const data = response?.key === requestKey && response.apiKey === tmdbApiKey ? response.data : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tmdb?${query}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: tmdbApiKey ? { [TMDB_KEY_HEADER]: tmdbApiKey } : undefined,
    })
      .then((result) => result.json())
      .then((data) => {
        if (!controller.signal.aborted) setResponse({ key: requestKey, apiKey: tmdbApiKey, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResponse({ key: requestKey, apiKey: tmdbApiKey, data: { error: "无法加载 TMDB 榜单" } });
        }
      });
    return () => controller.abort();
  }, [query, requestKey, tmdbApiKey]);

  function changePage(nextPage) {
    if (nextPage === page) return;
    setPage(nextPage);
    filterPanel.current?.scrollIntoView({ block: "start" });
  }

  if (data?.code === "key_required" || data?.code === "invalid_key") {
    return (
      <section className="surface-panel p-5 sm:p-8" aria-labelledby="tmdb-heading">
        <h2 id="tmdb-heading" className="font-display text-xl font-semibold text-ink">配置 TMDB 榜单</h2>
        <p role="status" className="mt-2 text-sm text-muted">
          {data.code === "key_required" ? "请在 TMDB 账号中申请 API Key，再到 LuluTV 设置中保存。" : data.error}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={TMDB_SETTINGS_HREF} className="ui-button ui-button-primary">前往 TMDB 设置</Link>
          <a href={TMDB_API_APPLICATION_URL} target="_blank" rel="noopener noreferrer" className="ui-button">申请 API Key</a>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="tmdb-heading">
      <header ref={filterPanel} className="surface-panel scroll-mt-24 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MediaTypeSwitch value={type} filmAndTvOnly onChange={(value) => { setType(value); setPage(1); }} />
          <h2 id="tmdb-heading" className="text-sm font-medium text-muted">TMDB 榜单</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3" role="group" aria-label="榜单">
          {charts.map(([key, label]) => (
            <button key={key} type="button" className="filter-chip btn-press" aria-pressed={chart === key} onClick={() => { setChart(key); setPage(1); }}>{label}</button>
          ))}
        </div>
      </header>
      {data?.error ? (
        <div role="alert" className="surface-panel p-6 text-muted">
          <p>{data.error}</p>
          <button type="button" className="ui-button mt-3" onClick={() => setRetry((value) => value + 1)}>重新加载</button>
        </div>
      ) : (
        <div aria-busy={!data} className={catalogGridClassName}>
          {data ? data.results?.map((movie, index) => <MovieCard key={movie.id} movie={movie} eager={index < 5} />)
            : Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => <SkeletonCard key={index} />)}
        </div>
      )}
      {data?.pageCount > 1 && <Pagination currentPage={page} pageCount={data.pageCount} onPageChange={changePage} alignRight />}
      <p className="text-xs text-muted">This product uses the TMDB API but is not endorsed or certified by TMDB. <a className="underline" href="https://www.themoviedb.org/">TMDB</a></p>
    </section>
  );
}
