import { DANDANPLAY_APP_ID_HEADER, DANDANPLAY_APP_SECRET_HEADER } from "@/lib/config/danmaku";

export async function requestDanmaku(action, params, credentials, signal) {
  const query = new URLSearchParams({ action, ...params });
  query.sort();
  const response = await fetch(`/api/danmaku?${query}`, {
    signal,
    cache: "no-store",
    headers: {
      [DANDANPLAY_APP_ID_HEADER]: credentials.appId,
      [DANDANPLAY_APP_SECRET_HEADER]: credentials.appSecret,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "获取弹幕失败。");
  return data;
}
