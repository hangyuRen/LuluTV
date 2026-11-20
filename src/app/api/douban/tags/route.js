import { NextResponse } from "next/server";
import { defaultTags } from "@/lib/config/discovery";

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "movie";
  if (!Object.hasOwn(defaultTags, type)) {
    return NextResponse.json({ error: "不支持的媒体类型" }, { status: 400 });
  }
  // Retry only failures, timeouts and invalid responses. Never cache probes or
  // persist fallback tags, so refreshing the page can recover automatically.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const url = new URL("https://movie.douban.com/j/search_tags");
      url.searchParams.set("type", type);
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(3000)]),
        headers: { "User-Agent": "Mozilla/5.0", Referer: "https://movie.douban.com/" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.tags)) throw new Error("标签格式错误");
      const tags = [...new Set(data.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))];
      if (!tags.length) throw new Error("标签列表为空");
      return NextResponse.json({ tags, source: "remote" }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      if (request.signal.aborted) return new Response(null, { status: 499 });
    }
  }
  return NextResponse.json({ tags: defaultTags[type], source: "fallback" }, { headers: { "Cache-Control": "no-store" } });
}
