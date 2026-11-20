import { parseDoubanImage } from "@/lib/api/doubanApi";
import { DEFAULT_USER_AGENT } from "@/lib/api/user-agent";

export async function GET(request) {
  const url = parseDoubanImage(request.nextUrl.searchParams.get("url"));
  if (!url) return Response.json({ error: "豆瓣图片地址无效" }, { status: 400 });

  try {
    const upstream = await fetch(url, {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
      redirect: "error",
      headers: {
        Referer: "https://movie.douban.com/",
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "image/*",
      },
    });
    const contentType = upstream.headers.get("content-type");
    if (!upstream.ok || !upstream.body || !contentType?.startsWith("image/")) {
      return Response.json({ error: "豆瓣图片请求失败" }, { status: upstream.status === 404 ? 404 : 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json({ error: "无法连接豆瓣图片服务" }, { status: error.name === "TimeoutError" ? 504 : 502 });
  }
}
