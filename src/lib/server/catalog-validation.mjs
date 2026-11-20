import { catalogRequestUrl } from "../api/cmsCatalog.mjs";
import { parsePlaybackLines } from "../player/playbackLines.mjs";
import { catalogError, requestCatalogJson } from "./catalog-request.mjs";

function readList(data) {
  if (!Array.isArray(data?.list) || data.error || (data.code !== undefined && ![1, 200].includes(Number(data.code)))) {
    throw catalogError(502, "该地址未返回兼容的 MacCMS JSON 数据，请检查接口地址。");
  }
  return data.list;
}

function isCatalogItem(item) {
  return (typeof item?.vod_id === "number" || typeof item?.vod_id === "string")
    && String(item.vod_id).trim() && typeof item.vod_name === "string" && item.vod_name.trim();
}

function hasPlayableEpisode(item) {
  return item && parsePlaybackLines(item.vod_play_url, item.vod_play_from).episodes.length > 0;
}

export async function validateCatalog(input, { signal, load = requestCatalogJson } = {}) {
  if (typeof input !== "string" || !/^https?:\/\//i.test(input.trim())) {
    throw catalogError(400, "请输入完整的 HTTP 或 HTTPS 接口地址。");
  }
  let url;
  try { url = new URL(input.trim()); }
  catch { throw catalogError(400, "请输入完整的 HTTP 或 HTTPS 接口地址。"); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
    throw catalogError(400, "请输入有效的 HTTP 或 HTTPS 接口地址。");
  }
  if (/\.m3u8$/i.test(url.pathname)) throw catalogError(400, "这是 M3U8 视频直链，请使用「直链播放」。");

  url.hash = "";
  const sourceUrl = url.href;
  const deadline = AbortSignal.timeout(9000);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const probe = async (params) => readList(await load(catalogRequestUrl(sourceUrl, params), { signal: requestSignal }));

  const list = await probe({ pg: 1 });
  if (!list.length) return { status: "unverified", url: sourceUrl, message: "接口可访问，但目录为空，暂未验证到可播放片源。" };

  const candidates = list.filter(isCatalogItem);
  const sample = candidates.find(hasPlayableEpisode) || candidates[0];
  if (!sample) throw catalogError(502, "影片列表缺少有效的影片编号或名称，请检查接口。");

  const [search, details] = await Promise.all([
    probe({ wd: sample.vod_name.trim(), pg: 1 }),
    probe({ ids: sample.vod_id }),
  ]);
  const detail = details.find((item) => isCatalogItem(item) && String(item.vod_id) === String(sample.vod_id));
  if (!detail) throw catalogError(502, "该接口未返回有效的影片详情，请检查视频源。");
  const searchMatch = search.find((item) => isCatalogItem(item) && String(item.vod_id) === String(sample.vod_id));
  if (!hasPlayableEpisode(searchMatch) || !hasPlayableEpisode(detail)) {
    return { status: "unverified", url: sourceUrl, message: "接口可访问，但搜索或详情中暂未验证到可播放的 M3U8 片源。" };
  }
  return { status: "verified", url: sourceUrl };
}
