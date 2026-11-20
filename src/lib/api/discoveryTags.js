import { fetchDiscoveryTags } from "./doubanApi";
import { defaultTags } from "../config/discovery";

function validTags(tags) {
  return Array.isArray(tags) && tags.length > 0 && tags.every((tag) => typeof tag === "string" && tag.trim());
}

// One task per upstream type: a slow TV request cannot delay movie tags.
export async function refreshDiscoveryTags(type, { signal, onResult, storage, fetchTags = fetchDiscoveryTags }) {
  const key = `nexttv-discovery-tags-v2:${type}`;
  let cached;
  await Promise.resolve();
  if (signal.aborted) return;
  try {
    const saved = JSON.parse(storage?.getItem(key) || "null");
    if (validTags(saved)) cached = saved;
  } catch { /* Storage can be disabled or contain invalid data. */ }
  if (cached) onResult({ tags: cached, source: "cached" });

  try {
    const result = await fetchTags(type, signal);
    if (signal.aborted) return;
    if (result.source !== "remote" || !validTags(result.tags)) throw new Error("探测失败");
    try { storage?.setItem(key, JSON.stringify(result.tags)); } catch { /* Optional cache. */ }
    onResult(result);
  } catch {
    if (!signal.aborted) onResult({ tags: cached || defaultTags[type], source: cached ? "stale" : "fallback" });
  }
}
