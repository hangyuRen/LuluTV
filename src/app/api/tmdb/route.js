import { isTmdbApiKey, TMDB_KEY_HEADER } from "@/lib/config/tmdb";

const tmdbEndpoints = [
  { origin: "https://api.tmdb.org", timeout: 12000 },
  { origin: "https://api.themoviedb.org", timeout: 4000 },
];

async function fetchTmdb(path, params, token, signal, useBrowserKey) {
  for (const { origin, timeout } of tmdbEndpoints) {
    if (signal.aborted) break;
    try {
      const response = await fetch(`${origin}/3/${path}?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        ...(useBrowserKey ? { cache: "no-store" } : { next: { revalidate: 900 } }),
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(timeout)]),
      });
      if (response.status >= 500) continue;
      return { status: response.status, data: response.ok ? await response.json() : null };
    } catch (error) {
      if (!signal.aborted) console.warn("TMDB 上游请求失败", origin, error.cause?.code || error.name);
    }
  }
  return { status: signal.aborted ? 499 : 504, data: null };
}

function image(path, size) {
  return path?.startsWith("/") ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

function metadata(item, type) {
  return {
    id: String(item.id),
    title: item.title || item.name,
    originalTitle: item.original_title || item.original_name,
    type,
    year: (item.release_date || item.first_air_date || "").slice(0, 4),
    poster: image(item.poster_path, "w500"),
    backdrop: image(item.backdrop_path, "w780"),
    desc: item.overview,
    rating: item.vote_count > 0 ? item.vote_average?.toFixed(1) : null,
    metadataSource: "tmdb",
    actors: item.credits?.cast?.slice(0, 12).map((person) => ({
      id: person.id, name: person.name, role: person.character, avatar: image(person.profile_path, "w185"),
    })),
  };
}

export async function GET(request) {
  const browserKey = request.headers.get(TMDB_KEY_HEADER)?.trim();
  if (browserKey && !isTmdbApiKey(browserKey)) {
    return Response.json({ code: "invalid_key", error: "TMDB API Key 格式无效，请检查设置。" }, { status: 400 });
  }
  const token = browserKey ? "" : process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  const key = browserKey || process.env.TMDB_API_KEY?.trim();
  if (!token && !key) {
    return Response.json({ code: "key_required", error: "请先配置 TMDB API Key。" }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "movie";
  const chart = params.get("chart") || "trending";
  const id = params.get("id");
  const page = Number(params.get("page") || 1);
  if (!["movie", "tv"].includes(type) || !["trending", "popular", "top_rated"].includes(chart)
    || (id !== null && !/^\d{1,12}$/.test(id)) || !Number.isInteger(page) || page < 1 || page > 500) {
    return Response.json({ error: "TMDB 查询参数无效" }, { status: 400 });
  }

  const path = id ? `${type}/${id}` : chart === "trending" ? `trending/${type}/week` : `${type}/${chart}`;
  const upstreamParams = new URLSearchParams({ language: "zh-CN" });
  if (id) upstreamParams.set("append_to_response", "credits");
  else if (chart !== "trending") upstreamParams.set("page", String(page));
  if (!token) upstreamParams.set("api_key", key);
  try {
    const { status, data } = await fetchTmdb(path, upstreamParams, token, request.signal, Boolean(browserKey));
    if (!data) {
      if (status === 401 || status === 403) {
        return browserKey
          ? Response.json({ code: "invalid_key", error: "TMDB 拒绝了此 API Key，请检查或更换密钥。" }, { status: 401 })
          : Response.json({ code: "invalid_key", error: "TMDB 拒绝了服务端 API 凭据，可以在设置中配置自己的 API Key。" }, { status: 502 });
      }
      if (status === 429) return Response.json({ error: "TMDB 请求过于频繁，请稍后重试。" }, { status });
      if (status === 404) return Response.json({ error: "TMDB 找不到该影片。" }, { status });
      if (status === 504) return Response.json({ error: "LuluTV 服务器连接 TMDB 超时，请稍后重试。" }, { status });
      return Response.json({ error: "暂时无法获取 TMDB 数据，请稍后重试。" }, { status: 502 });
    }
    return Response.json(id ? metadata(data, type) : {
      results: (data.results || []).map((item) => metadata(item, type)).filter((item) => item.title),
      pageCount: chart === "trending" ? 1 : Math.min(Number(data.total_pages) || 1, 500),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "暂时无法获取 TMDB 数据，请稍后重试。" }, { status: 502 });
  }
}
