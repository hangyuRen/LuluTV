import { requestCatalogJson } from "./catalog-request.mjs";
import { CATALOG_PAGE_SIZE } from "../config/catalog.mjs";

export function sourceBrowseUrl(apiUrl, action, page = 1, category = "all") {
  let url;
  try { url = new URL(apiUrl); } catch { throw Object.assign(new Error("视频源地址无效"), { status: 400 }); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw Object.assign(new Error("视频源地址无效"), { status: 400 });
  if (!["categories", "videos"].includes(action)) throw Object.assign(new Error("浏览类型无效"), { status: 400 });
  if (!Number.isInteger(page) || page < 1 || page > 100000 || category.length > 100) throw Object.assign(new Error("分页或分类参数无效"), { status: 400 });
  url.hash = "";
  for (const name of ["ids", "wd", "t"]) url.searchParams.delete(name);
  url.searchParams.set("ac", action === "categories" ? "list" : "detail");
  url.searchParams.set("pg", action === "categories" ? "1" : String(page));
  if (action === "videos" && category !== "all") url.searchParams.set("t", category);
  url.searchParams.sort();
  return url.href;
}

function count(value, fallback = 0) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

export function sourceBrowseData(data, action) {
  if (!data || data.error || (data.code !== undefined && ![1, 200].includes(Number(data.code))) || (!Array.isArray(data.list) && !Array.isArray(data.class))) {
    throw Object.assign(new Error("视频源未返回有效的浏览数据"), { status: 502 });
  }
  if (action === "categories") return {
    categories: (Array.isArray(data.class) ? data.class : []).filter((item) => item.type_id != null && item.type_name).map((item) => ({ type_id: String(item.type_id), type_name: String(item.type_name) })),
    total: count(data.total),
  };
  if (!Array.isArray(data.list)) throw Object.assign(new Error("视频源未返回视频列表"), { status: 502 });
  return {
    list: data.list.map((item) => ({
      vod_id: item.vod_id,
      vod_name: item.vod_name || "未命名视频",
      vod_pic: item.vod_pic || "",
      vod_remarks: item.vod_remarks || "",
      vod_score: item.vod_score || "",
    })),
    total: count(data.total), pagecount: Math.max(1, count(data.pagecount, 1)), limit: count(data.limit),
  };
}

// Map UI pages onto the source's own page size, even when it ignores page-size options.
export async function sourceBrowseVideoPage(page, loadPage) {
  const first = await loadPage(1);
  const upstreamSize = first.limit || first.list.length || CATALOG_PAGE_SIZE;
  const total = first.total || (first.list.length ? first.pagecount * upstreamSize : 0);
  const start = (page - 1) * CATALOG_PAGE_SIZE;
  const pagecount = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  if (start >= total) return { list: [], total, pagecount, limit: CATALOG_PAGE_SIZE };
  if (upstreamSize === CATALOG_PAGE_SIZE) {
    const upstream = page === 1 ? first : await loadPage(page);
    return { list: upstream.list, total, pagecount, limit: CATALOG_PAGE_SIZE };
  }
  const end = Math.min(start + CATALOG_PAGE_SIZE, total);
  const firstPage = Math.floor(start / upstreamSize) + 1;
  const lastPage = Math.floor((end - 1) / upstreamSize) + 1;
  const pages = await Promise.all(Array.from({ length: lastPage - firstPage + 1 }, (_, index) => {
    const upstreamPage = firstPage + index;
    return upstreamPage === 1 ? first : loadPage(upstreamPage);
  }));
  const offset = start % upstreamSize;
  return { list: pages.flatMap((data) => data.list).slice(offset, offset + end - start), total, pagecount, limit: CATALOG_PAGE_SIZE };
}

export async function requestSourceBrowse(url, action, { load = requestCatalogJson, timeoutMs = 8000 } = {}) {
  try {
    return sourceBrowseData(await load(url, { timeoutMs }), action);
  } catch (error) {
    if (error.status) throw error;
    const timeout = error.name === "TimeoutError" || error.name === "AbortError" || error.cause?.code === "UND_ERR_CONNECT_TIMEOUT";
    throw Object.assign(new Error(timeout ? "视频源响应超时，请重试或切换其他源。" : "无法连接视频源或数据格式异常，请重试或检查源地址。"), { status: timeout ? 504 : 502 });
  }
}
