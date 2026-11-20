import { unstable_cache } from "next/cache";
import { requestSourceBrowse, sourceBrowseUrl, sourceBrowseVideoPage } from "@/lib/server/source-browse.mjs";

const categories = unstable_cache((url) => requestSourceBrowse(url, "categories"), ["source-browse-categories-v2"], { revalidate: 3600 });
const videos = unstable_cache((url) => requestSourceBrowse(url, "videos"), ["source-browse-videos-v3"], { revalidate: 300 });
const inflightKey = Symbol.for("nexttv.source-browse.inflight");
const inflight = globalThis[inflightKey] ||= new Map();

function upstreamVideos(url) {
  const key = `upstream-videos-v2:${url}`;
  let pending = inflight.get(key);
  if (!pending) {
    pending = videos(url).finally(() => { if (inflight.get(key) === pending) inflight.delete(key); });
    inflight.set(key, pending);
  }
  return pending;
}

export async function GET(request) {
  const started = performance.now();
  try {
    const params = request.nextUrl.searchParams;
    const action = params.get("action") || "videos";
    const apiUrl = params.get("apiUrl");
    const page = Number(params.get("page") || 1);
    const category = params.get("category") || "all";
    const url = sourceBrowseUrl(apiUrl, action, page, category);
    const key = `${action}:${url}`;
    let pending = inflight.get(key);
    if (!pending) {
      pending = (action === "categories" ? categories(url) : sourceBrowseVideoPage(page, (upstreamPage) => upstreamVideos(sourceBrowseUrl(apiUrl, "videos", upstreamPage, category)))).finally(() => { if (inflight.get(key) === pending) inflight.delete(key); });
      inflight.set(key, pending);
    }
    const data = await pending;
    return Response.json(data, { headers: { "Cache-Control": "private, max-age=30", "Server-Timing": `browse;dur=${Math.round(performance.now() - started)}` } });
  } catch (error) {
    return Response.json({ error: error.message || "视频源请求失败" }, { status: error.status || 502, headers: { "Cache-Control": "no-store" } });
  }
}
