export const ItemTypes = {
  MOVIE: "movie",
  TV: "tv",
};

const baofengEndpoint = "https://bfzy1.tv/api.php/provide/vod/";
const liangziEndpoint = "https://www.lzizy.net/api.php/provide/vod/";

export const DEFAULT_VIDEO_SOURCES = [
  { id: "bfzy", key: "bfzy", name: "暴风资源", url: baofengEndpoint, enabled: true, type: "video" },
  { id: "ffzy", key: "ffzy", name: "非凡资源", url: "https://api.ffzyapi.com/api.php/provide/vod/", enabled: true, type: "video" },
  { id: "lzi", key: "lzi", name: "量子资源", url: liangziEndpoint, enabled: true, type: "video" },
  { id: "czzy", key: "czzy", name: "厂长资源", url: "https://api.changzhang.tv/api.php/provide/vod/", enabled: true, type: "video" },
  { id: "mddj", key: "mddj", name: "魔都短剧", url: "https://www.mdzyapi.com/api.php/provide/vod/", enabled: true, type: "video" },
];

const previousEndpoints = new Map([
  ["https://bfzyapi.com/api.php/provide/vod", baofengEndpoint],
  ["https://cj.lziapi.com/api.php/provide/vod", liangziEndpoint],
]);

export function updateSourceEndpoint(source) {
  const url = previousEndpoints.get(String(source.url).replace(/\/$/, ""));
  return url ? { ...source, url } : source;
}
