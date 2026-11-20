import { requestCatalogJson } from "@/lib/server/catalog-request.mjs";

export async function GET(request) {
  const apiUrl = request.nextUrl.searchParams.get("apiUrl");
  if (!apiUrl) return Response.json({ error: "缺少 apiUrl 参数" }, { status: 400 });
  try {
    const data = await requestCatalogJson(apiUrl, { signal: request.signal });
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error.status ? error.message : "视频源搜索失败" }, { status: error.status || 502 });
  }
}
