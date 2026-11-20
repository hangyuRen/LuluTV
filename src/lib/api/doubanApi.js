import { CATALOG_PAGE_SIZE } from "../config/catalog.mjs";

// Browser helpers. Tags are probed afresh on each homepage mount.
export async function fetchDiscoveryTags(type, signal) {
  const params = new URLSearchParams({ type });
  const response = await fetch(`/api/douban/tags?${params}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("获取分类标签失败");
  return response.json();
}

export async function fetchFromDouban(type, tag, pageLimit = CATALOG_PAGE_SIZE, pageStart = 0, sort = "recommend", signal) {
  const params = new URLSearchParams({ type, tag, sort, page_limit: String(pageLimit), page_start: String(pageStart) });
  const response = await fetch(`/api/douban?${params}`, { signal });
  if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
  const data = await response.json();
  if (data.error || !Array.isArray(data.subjects)) throw new Error(data.message || "推荐数据格式错误");
  return data;
}

export function convertDoubanToMovie(item, type = "movie") {
  return { id: item.id, title: item.title, rating: item.rate || "暂无", type, year: item.year, metadataSource: "douban",
    poster: item.cover, backdrop: item.cover, doubanUrl: item.url };
}

export function parseDoubanImage(value) {
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.port
      && (url.hostname === "doubanio.com" || url.hostname.endsWith(".doubanio.com"))) {
      url.protocol = "https:";
      return url;
    }
  } catch { /* Non-Douban image paths can be local. */ }
  return null;
}

export function forwardDoubanImage(value = "") {
  const url = parseDoubanImage(value);
  return url ? `/api/douban/image?${new URLSearchParams({ url: url.href })}` : value;
}
