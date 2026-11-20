import "server-only";
import { unstable_cache } from "next/cache";

const BASE = "https://hongguoduanju.com";
function extractRouterData(html) {
  const assignmentMatch = html.match(/(?:window\.)?_ROUTER_DATA\s*=\s*/);
  if (!assignmentMatch || assignmentMatch.index === undefined) {
    throw new Error("无法从页面中找到 _ROUTER_DATA");
  }

  const jsonStart = assignmentMatch.index + assignmentMatch[0].length;
  if (html[jsonStart] !== "{") {
    throw new Error("_ROUTER_DATA 格式异常");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = jsonStart; index < html.length; index += 1) {
    const character = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(jsonStart, index + 1));
      }
    }
  }

  throw new Error("无法从页面中完整提取 _ROUTER_DATA");
}


async function fetchHtml(path) {
  const response = await fetch(BASE + path, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  });
  if (!response.ok) throw new Error("红果请求失败: " + response.status);
  return response.text();
}

export function parseHotTags(html) {
  const tags = new Map();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g)) {
    const url = new URL(match[1].replaceAll("&amp;", "&"), BASE);
    if (url.origin !== BASE || !/^\/rank\/hot-[a-z-]+$/.test(url.pathname)) continue;
    let label = match[2].replace(/<[^>]*>/g, "").replace(/\s+/g, "").trim();
    if (label.length % 2 === 0 && label.slice(0, label.length / 2) === label.slice(label.length / 2)) label = label.slice(0, label.length / 2);
    // Navigation also links to "榜单" and other rankings; only keep the
    // content-kind tabs (全部 / 真人剧 / 漫剧 / AI剧 …).
    if (!label || label.includes("榜") || label.includes("热播") || label === "查看全部") continue;
    const value = url.pathname.split("/").pop();
    if (!tags.has(value)) tags.set(value, { value, label, path: url.pathname });
  }
  if (!tags.size) throw new Error("未找到红果热播分类");
  return [...tags.values()].sort((a, b) => Number(b.value === "hot-drama") - Number(a.value === "hot-drama"));
}

export function parseHotPage(html) {
  const data = extractRouterData(html);
  const content = Object.values(data.loaderData || {}).find((value) => Array.isArray(value?.content?.rankList))?.content;
  if (!content || content.isSuccess === false) throw new Error("未找到红果热播榜数据");
  const totalPages = Number(content.pagination?.totalPages);
  const pageNum = Number(content.pagination?.pageNum);
  if (!Number.isInteger(totalPages) || totalPages < 1 || !Number.isInteger(pageNum)) throw new Error("红果分页数据无效");
  return {
    pageNum, totalPages,
    list: content.rankList.filter((item) => item.seriesId && item.title).map((item) => ({
      id: String(item.seriesId), title: item.title, poster: item.cover,
      hongguoUrl: BASE + "/detail?series_id=" + encodeURIComponent(item.seriesId),
      metadataSource: "hongguo", type: "short",
    })),
  };
}

export const getHotTags = unstable_cache(async () => parseHotTags(await fetchHtml("/rank/hot-drama")), ["hongguo-hot-tags-v1"], { revalidate: 3600, tags: ["hongguo"] });
export const getHotPage = unstable_cache(async (path, page) => {
  const result = parseHotPage(await fetchHtml(path + (page > 1 ? "?page=" + page : "")));
  if (result.pageNum !== page) throw new Error("红果返回了错误的页码");
  return result;
}, ["hongguo-hot-page-v3"], { revalidate: 3600, tags: ["hongguo"] });

export async function getHotRecommendations(tag, start, limit) {
  const tags = await getHotTags();
  const selected = tags.find((item) => item.value === tag);
  if (!selected) return null;
  const first = await getHotPage(selected.path, 1);
  const upstreamSize = first.list.length;
  if (!upstreamSize) return { list: [], tags, hasMore: false };
  const firstPage = Math.floor(start / upstreamSize) + 1;
  if (firstPage > first.totalPages) return { list: [], tags, hasMore: false };
  if (limit === upstreamSize && start % upstreamSize === 0) {
    const page = firstPage === 1 ? first : await getHotPage(selected.path, firstPage);
    return { list: page.list, tags, pageCount: page.totalPages, hasMore: page.pageNum < page.totalPages };
  }
  // Include one lookahead item so LuluTV can accurately disable its next button.
  const lastPage = Math.min(first.totalPages, Math.floor((start + limit) / upstreamSize) + 1);
  const pages = await Promise.all(Array.from({ length: lastPage - firstPage + 1 }, (_, index) => {
    const page = firstPage + index;
    return page === 1 ? first : getHotPage(selected.path, page);
  }));
  const offset = start % upstreamSize;
  const window = pages.flatMap((page) => page.list).slice(offset, offset + limit + 1);
  return { list: window.slice(0, limit), tags, hasMore: window.length > limit };
}
