"use client";
import { useEffect, useState } from "react";

const cache = new Map();
const ttl = 5 * 60 * 1000;
const maxEntries = 40;

export function useSourceBrowse(apiUrl, action, page = 1, category = "all", retry = 0) {
  const key = JSON.stringify([apiUrl, action, page, category]);
  const [state, setState] = useState({ key: "", data: null, loading: false, error: "" });
  useEffect(() => {
    if (!apiUrl) return;
    const controller = new AbortController();
    async function load() {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      const saved = cache.get(key);
      if (saved && Date.now() - saved.time < ttl) {
        cache.delete(key); cache.set(key, saved);
        setState({ key, data: saved.data, loading: false, error: "" });
        return;
      }
      setState({ key, data: null, loading: true, error: "" });
      try {
        const params = new URLSearchParams({ apiUrl, action, page: String(page), category });
        const response = await fetch(`/api/source-browse?${params}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "视频源请求失败");
        if (controller.signal.aborted) return;
        cache.delete(key); cache.set(key, { data, time: Date.now() });
        while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
        setState({ key, data, loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setState({ key, data: null, loading: false, error: error.name === "TimeoutError" ? "视频源请求超时，请重试或切换其他源。" : error.message });
      }
    }
    void load();
    return () => controller.abort();
  }, [apiUrl, action, page, category, key, retry]);
  return state.key === key ? state : { data: null, loading: Boolean(apiUrl), error: "" };
}
