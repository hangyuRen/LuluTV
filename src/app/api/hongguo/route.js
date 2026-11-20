import { CATALOG_PAGE_SIZE } from "@/lib/config/catalog.mjs";
import { NextResponse } from "next/server";
import { getHotRecommendations } from "@/lib/server/hongguo";

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const limit = Number(params.get("page_limit") ?? CATALOG_PAGE_SIZE);
  const start = Number(params.get("page_start") ?? 0);
  const tag = params.get("tag") || "hot-drama";
  if (!Number.isInteger(limit) || limit < 1 || limit > 48 || !Number.isSafeInteger(start) || start < 0 || start > 10000) {
    return NextResponse.json({ error: "分页参数无效" }, { status: 400 });
  }
  try {
    const result = await getHotRecommendations(tag, start, limit);
    if (!result) return NextResponse.json({ error: "不支持的红果分类" }, { status: 400 });
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "获取红果推荐失败", list: [], hasMore: false }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
