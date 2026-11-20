import { unstable_cache } from "next/cache";
import { requestCatalogJson } from "@/lib/server/catalog-request.mjs";

const getDetailData = unstable_cache(
  (url) => requestCatalogJson(url, { timeoutMs: 9500 }),
  ["detail-api-public-v1"],
  { revalidate: 3600, tags: ["detail"] }
);

export async function GET(request) {
  const apiUrl = request.nextUrl.searchParams.get("apiUrl");
  if (!apiUrl) return Response.json({ error: "缺少 apiUrl 参数" }, { status: 400 });
  try {
    return Response.json(await getDetailData(apiUrl));
  } catch (error) {
    return Response.json({ error: error.status ? error.message : "视频源详情加载失败" }, { status: error.status || 502 });
  }
}
