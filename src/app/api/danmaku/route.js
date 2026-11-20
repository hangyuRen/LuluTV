import { DANDANPLAY_APP_ID_HEADER, DANDANPLAY_APP_SECRET_HEADER, hasDandanCredentials } from "@/lib/config/danmaku";
import { matchDandanEpisode, normalizeDandanComments, requestDandan } from "@/lib/server/dandanplay.mjs";

const idPattern = /^[1-9]\d{0,15}$/;

export async function GET(request) {
  const query = request.nextUrl.searchParams;
  const action = query.get("action");
  const id = query.get("id") || "";
  const title = query.get("title")?.trim() || "";
  const episode = query.get("episode") || "";
  const credentials = {
    appId: request.headers.get(DANDANPLAY_APP_ID_HEADER),
    appSecret: request.headers.get(DANDANPLAY_APP_SECRET_HEADER),
  };
  if (!hasDandanCredentials(credentials)) {
    return Response.json({ error: "请在设置中填写弹弹play的 App ID 和 App Secret。" }, { status: 400 });
  }
  const load = (path, params = new URLSearchParams()) => requestDandan(`/api/v2/${path}`, params, credentials, request.signal);
  try {
    let result;
    if (action === "comments" && idPattern.test(id)) {
      const data = await load(`comment/${id}`, new URLSearchParams({ withRelated: "true" }));
      result = { danmuku: normalizeDandanComments(data.comments) };
    } else if (action === "match" && title.length >= 2 && title.length <= 150 && (!episode || /^[1-9]\d{0,4}$/.test(episode))) {
      const params = new URLSearchParams({ anime: title, v2: "true" });
      if (episode) params.set("episode", episode);
      const data = await load("search/episodes", params);
      const episodeId = matchDandanEpisode(data.animes, title, episode);
      result = { episodeId };
    } else {
      return Response.json({ error: "弹幕请求参数无效。" }, { status: 400 });
    }
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error.status ? error.message : "弹弹play请求失败，请稍后重试。" }, { status: error.status || 502 });
  }
}
