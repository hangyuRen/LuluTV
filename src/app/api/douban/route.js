import { CATALOG_PAGE_SIZE } from "@/lib/config/catalog.mjs";
import {NextResponse} from "next/server";
import {unstable_cache} from "next/cache";

// 创建缓存函数，根据 URL 自动缓存不同的请求
const getDoubanData = unstable_cache(
  async (url) => {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://movie.douban.com/",
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  },
  ["douban-api"], // cache key prefix
  {
    revalidate: 3600, // 1小时缓存
    tags: ["douban"],
  },
);

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "movie";
    const sort = searchParams.get("sort") || "recommend";
    if (!["movie", "tv"].includes(type) || !["recommend", "rank", "time"].includes(sort)) {
      return NextResponse.json({ error: "不支持的类型或排序" }, { status: 400 });
    }
    const tag = searchParams.get("tag") || "热门";
    const pageLimit = searchParams.get("page_limit") || String(CATALOG_PAGE_SIZE);
    const pageStart = searchParams.get("page_start") || "0";
    const params = new URLSearchParams({ type, tag, sort, page_limit: pageLimit, page_start: pageStart });
    const data = await getDoubanData(`https://movie.douban.com/j/search_subjects?${params}`);

    // 返回数据
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error(
      "豆瓣API请求失败:",
      error.message,
      error.cause?.code || error.cause?.message || "",
    );

    // 豆瓣接口不可达时降级为空列表，不缓存失败结果
    return NextResponse.json(
      {
        error: "获取数据失败",
        message: error.message,
        subjects: [],
      },
      {status: 200, headers: {"Cache-Control": "no-store"}},
    );
  }
}
