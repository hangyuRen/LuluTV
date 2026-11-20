import { catalogRequestUrl } from "./cmsCatalog.mjs";
import { parsePlaybackLines } from "../player/playbackLines.mjs";

function mediaType(category) {
  if (/短剧|漫剧|都市脑洞|古装仙侠|逆袭/.test(category)) return "short";
  if (/电影|^(动作|喜剧|爱情|科幻|恐怖|战争|剧情|犯罪|悬疑|冒险|奇幻|动画|记录|纪录|惊悚)片$/.test(category)) return "movie";
  if (/剧|连续|综艺|动漫/.test(category)) return "tv";
}

function formatVideo(item, source) {
  const typeName = item.type_name || "";
  const type = mediaType(typeName);
  const poster = typeof item.vod_pic === "string" ? item.vod_pic.trim() : "";
  let posterUrl = "";
  try {
    const image = new URL(poster, source.url);
    if (poster && ["https:", "http:"].includes(image.protocol)) posterUrl = image.href;
  } catch { /* Some catalogs return malformed image paths. */ }
  return {
    id: String(item.vod_id),
    title: String(item.vod_name || "").trim().replace(/\s+/g, " "),
    poster: posterUrl,
    backdrop: posterUrl,
    ...parsePlaybackLines(item.vod_play_url, item.vod_play_from, type),
    douban_id: Number(item.vod_douban_id) || null,
    source: source.key,
    source_name: source.name,
    source_url: source.url,
    class: item.vod_class,
    year: String(item.vod_year || "").match(/\d{4}/)?.[0] || "unknown",
    desc: String(item.vod_content || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim(),
    type_name: typeName,
    rating: Number(item.vod_score) > 0 ? String(item.vod_score) : null,
    genre: item.vod_class,
    type,
    actors: String(item.vod_actor || "").split(/[,，]/).map((name) => name.trim()).filter(Boolean).slice(0, 5).map((name) => ({ name })),
  };
}

async function requestCatalog(sourceUrl, action, params, signal) {
  const url = catalogRequestUrl(sourceUrl, params);
  const timeout = AbortSignal.timeout(action === "search" ? 8000 : 10000);
  const response = await fetch(`/api/${action}?${new URLSearchParams({ apiUrl: url.href })}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error(`视频源请求失败（${response.status}）`);
  return response.json();
}

export async function searchVideoSource(query, source, page = 1, signal) {
  const start = performance.now();
  try {
    const data = await requestCatalog(source.url, "search", { wd: query, pg: page }, signal);
    const latencyMs = Math.round(performance.now() - start);
    const results = (Array.isArray(data.list) ? data.list : [])
      .filter((item) => item?.vod_id != null)
      .map((item) => ({ ...formatVideo(item, source), latencyMs }))
      .filter((video) => video.title && video.episodes.length);
    return { results, pageCount: Number(data.pagecount) || 1 };
  } catch {
    return { results: [], pageCount: 0 };
  }
}

export async function searchVideos(query, videoSources, page = 1, sourceKey, signal) {
  if (!query?.trim()) return { results: [], pageCount: 0 };
  const sources = videoSources.filter((source) => source.enabled && (!sourceKey || source.key === sourceKey));
  const batches = await Promise.all(sources.map((source) => searchVideoSource(query, source, page, signal)));
  return {
    results: batches.flatMap((batch) => batch.results).sort((a, b) => a.latencyMs - b.latencyMs),
    pageCount: Math.max(0, ...batches.map((batch) => batch.pageCount)),
  };
}

export async function getVideoDetail(id, sourceId, sourceName, sourceUrl, signal) {
  const data = await requestCatalog(sourceUrl, "detail", { ids: id }, signal);
  const item = data.list?.find((entry) => String(entry.vod_id) === String(id));
  if (!item) throw new Error("视频源未返回该影片");
  return formatVideo(item, { key: sourceId, name: sourceName, url: sourceUrl });
}

let selectedSearchResult;

export function rememberSearchSelection(video) {
  selectedSearchResult = { video, expiresAt: Date.now() + 30_000 };
}

export function getSearchSelection(id, config) {
  const video = selectedSearchResult?.video;
  if (video?.id === id && video.source === config.key && video.source_url === config.url
    && selectedSearchResult.expiresAt > Date.now()) return video;
}
