import { createHash } from "node:crypto";

const origin = "https://api.dandanplay.net";

export function dandanHeaders(appId, secret, path, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHash("sha256").update(`${appId}${timestamp}${path}${secret}`).digest("base64");
  return { "X-AppId": appId, "X-Timestamp": String(timestamp), "X-Signature": signature, Accept: "application/json" };
}

export function normalizeDandanComments(comments) {
  return (Array.isArray(comments) ? comments : []).flatMap((comment) => {
    const { p, m } = comment ?? {};
    if (typeof p !== "string" || typeof m !== "string" || !m.trim()) return [];
    const [seconds, mode, color] = p.split(",");
    const time = Number(seconds);
    if (!seconds?.trim() || !Number.isFinite(time) || time < 0) return [];
    const rgb = Number(color);
    return [{
      text: m,
      time,
      mode: mode === "5" ? 1 : mode === "4" ? 2 : 0,
      color: color?.trim() && Number.isInteger(rgb) && rgb >= 0 && rgb <= 0xffffff
        ? `#${rgb.toString(16).padStart(6, "0")}` : "#ffffff",
    }];
  });
}

export function matchDandanEpisode(animes, title, episode) {
  const normalize = (value) => String(value ?? "").normalize("NFKC").trim().toLowerCase();
  const ids = new Set();
  for (const anime of animes ?? []) {
    if (normalize(anime.animeTitle) !== normalize(title)) continue;
    const episodes = anime.episodes ?? [];
    const media = episode ? episodes : episodes.length === 1 ? episodes : [];
    for (const entry of media) {
      if (Number.isSafeInteger(entry.episodeId) && entry.episodeId > 0) ids.add(entry.episodeId);
    }
  }
  return ids.size === 1 ? ids.values().next().value : null;
}

export async function requestDandan(path, params, { appId, appSecret }, signal) {
  const url = new URL(path, origin);
  url.search = params.toString();
  const timeout = AbortSignal.timeout(10000);
  const result = await fetch(url, {
    headers: dandanHeaders(appId, appSecret, path),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    redirect: "error",
    cache: "no-store",
  });
  if (result.status === 401 || result.status === 403) {
    throw Object.assign(new Error("弹弹play拒绝了请求，请检查设置中的应用凭据与权限。"), { status: result.status });
  }
  if (!result.ok) throw Object.assign(new Error("弹弹play暂时无法提供数据，请稍后重试。"), { status: result.status === 429 ? 429 : 502 });
  const data = await result.json();
  if (data.success === false) throw Object.assign(new Error("弹弹play暂时无法提供数据，请稍后重试。"), { status: 502 });
  return data;
}
