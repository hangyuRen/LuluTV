import { resumeTime } from "@/lib/player/progress";
import { forwardDoubanImage } from "@/lib/api/doubanApi";
import { useState, useEffect, useMemo } from "react";
import { videoWithPlaybackLine } from "@/lib/player/playbackLines.mjs";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { TMDB_KEY_HEADER } from "@/lib/config/tmdb";
import { getSearchSelection, getVideoDetail, searchVideoSource } from "@/lib/api/cmsApi";
import { findSwitchCandidate, matchesExactTitle, matchingEpisode, relatedInstallments, seriesInstallment } from "@/lib/api/mediaIdentity.mjs";
import { searchRecommendedVideo } from "@/lib/api/recommendationSearch.mjs";
import { scrapeDoubanDetails } from "@/lib/api/getDoubanActors";
import { usePlayHistoryStore } from "@/stores/usePlayHistoryStore";

export function useVideoData(id, source, title, type, year, originalTitle, metadataSource, setCurrentEpisodeIndex) {
  const [selection, setSelection] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [manualResults, setManualResults] = useState(null);
  const [seriesResults, setSeriesResults] = useState([]);
  const [tmdbResult, setTmdbResult] = useState(null);
  const tmdbApiKey = useSettingsStore((state) => state.tmdbApiKey);
  const metadata = metadataSource === "tmdb" && tmdbResult?.id === id
    && tmdbResult.type === type && tmdbResult.apiKey === tmdbApiKey ? tmdbResult.data : null;
  const [doubanActors, setDoubanActors] = useState([]);
  const [searching, setSearching] = useState(true);
  const [error, setError] = useState(null);
  const video = selection?.video;
  const lineId = selection?.lineId;
  const videoDetail = useMemo(() => videoWithPlaybackLine(video, lineId), [video, lineId]);
  const doubanId = videoDetail?.douban_id || (metadataSource === "douban" ? id : null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const { videoSources } = useSettingsStore.getState();
    const enabled = videoSources.filter((entry) => entry.enabled);

    function linkMetadata(video) {
      if (metadataSource === "douban" && !video.douban_id) return { ...video, douban_id: id };
      if (metadataSource === "hongguo") return { ...video, hongguo_id: id, type: "short" };
      if (metadataSource === "tmdb") return { ...video, tmdb_id: id, type: video.type || type };
      return video;
    }

    const requests = new Map();
    function lookup(query, config) {
      const key = JSON.stringify([config.key, config.url, query]);
      if (!requests.has(key)) requests.set(key, searchVideoSource(query, config, 1, signal));
      return requests.get(key);
    }

    function loadSeries(video) {
      const { series } = seriesInstallment(video.title);
      if (!series) return;
      void Promise.all(enabled.map((config) => lookup(series, config))).then((batches) => {
        if (!signal.aborted) setSeriesResults(batches.flatMap((batch) => batch.results));
      });
    }

    function start(video) {
      const history = usePlayHistoryStore.getState();
      const record = history.getPlayRecord(video.source, video.id);
      const legacy = !record && metadataSource === "hongguo" ? history.getPlayRecord("hongguo", id) : null;
      const savedIndex = (record || legacy)?.currentEpisodeIndex ?? 0;
      const index = Math.max(0, Math.min(savedIndex, video.episodes.length - 1));
      const linkedVideo = linkMetadata(video);
      setCurrentEpisodeIndex(index);
      setSelection({
        video: linkedVideo,
        danmakuVideo: linkedVideo,
        startTime: legacy && savedIndex === index ? resumeTime(legacy, index, legacy.episodeId) : undefined,
      });
      loadSeries(video);
    }

    function register(candidate) {
      setAlternatives((previous) => [...previous.filter((entry) => entry.source !== candidate.source), candidate]
        .sort((a, b) => a.latencyMs - b.latencyMs));
    }

    async function load() {
      let reference = { title, type, year, originalTitle, douban_id: metadataSource === "douban" ? id : null };
      if (source) {
        const config = videoSources.find((entry) => entry.key === source);
        if (!config) throw new Error("找不到该视频源，请检查视频源设置。");
        const started = performance.now();
        const detail = getSearchSelection(id, config) ?? await getVideoDetail(id, config.key, config.name, config.url, signal);
        if (signal.aborted) return;
        if (!detail.episodes.length) throw new Error("该视频源没有可用播放地址。");
        reference = detail;
        const initial = { ...detail, latencyMs: detail.latencyMs ?? Math.round(performance.now() - started) };
        register(initial);
        start(initial);
      } else if (!title) {
        throw new Error("缺少影片名称。");
      } else if (!enabled.length) {
        throw new Error("请在设置中启用视频源。");
      }

      if (!source) {
        let playing = false;
        const candidates = await searchRecommendedVideo(reference, enabled, lookup, (candidate) => {
          register(linkMetadata(candidate));
          if (!playing) {
            playing = true;
            start(candidate);
          }
        }, signal);
        if (!signal.aborted && !playing) setManualResults(candidates);
        return;
      }

      const series = seriesInstallment(reference.title).series;
      const queries = [...new Set([reference.title, reference.originalTitle, series].filter(Boolean))];
      await Promise.all(enabled.map(async (config) => {
        if (source === config.key) return;
        const started = performance.now();
        let fallback;

        for (const query of queries) {
          if (signal.aborted) return;
          const { results } = await lookup(query, config);
          if (signal.aborted) return;
          const match = findSwitchCandidate(reference, results);
          if (!match) continue;
          const candidate = { ...match, latencyMs: query === reference.title ? match.latencyMs : Math.round(performance.now() - started) };
          if (!matchesExactTitle(reference, match)) {
            fallback ??= candidate;
            continue;
          }
          register(linkMetadata(candidate));
          return;
        }
        if (fallback && !signal.aborted) register(linkMetadata(fallback));
      }));
    }

    load().catch((err) => {
      if (!signal.aborted) setError(err.message || "暂时无法加载影片。");
    }).finally(() => {
      if (!signal.aborted) setSearching(false);
    });
    return () => controller.abort();
  }, [id, source, title, type, year, originalTitle, metadataSource, setCurrentEpisodeIndex]);

  useEffect(() => {
    if (metadataSource !== "tmdb") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ id, type });
    fetch(`/api/tmdb?${params}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: tmdbApiKey ? { [TMDB_KEY_HEADER]: tmdbApiKey } : undefined,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data && !controller.signal.aborted) setTmdbResult({ id, type, apiKey: tmdbApiKey, data });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [id, type, metadataSource, tmdbApiKey]);

  useEffect(() => {
    if (!doubanId) return;
    let cancelled = false;
    scrapeDoubanDetails(doubanId).then((result) => {
      if (cancelled || result.code !== 200 || !Array.isArray(result.data)) return;
      setDoubanActors(result.data.map((actor) => ({
        ...actor,
        avatar: forwardDoubanImage(actor.avatar),
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [doubanId]);

  function switchSource(target, index, currentTime) {
    if (!videoDetail || target.source === videoDetail.source) return;
    const nextIndex = matchingEpisode(videoDetail, index, target);
    if (nextIndex < 0) return;
    setCurrentEpisodeIndex(nextIndex);
    setSelection((previous) => ({ video: target, danmakuVideo: previous.danmakuVideo, startTime: currentTime }));
  }

  function switchLine(line, index, currentTime) {
    const url = line.episodes[index];
    if (!video || !url || url === videoDetail.episodes[index]) return;
    setSelection((previous) => ({ ...previous, lineId: line.id, startTime: currentTime }));
  }

  return {
    videoDetail, danmakuVideo: selection?.danmakuVideo, alternatives, metadata, doubanActors, searching, error, switchSource, switchLine, manualResults,
    relatedVideos: relatedInstallments(videoDetail, seriesResults),
    startTime: selection?.startTime,
  };
}
