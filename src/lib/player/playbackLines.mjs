import { matchingEpisode } from "../api/mediaIdentity.mjs";

export function parsePlaybackLines(value, names, type) {
  const labels = String(names || "").split("$$$");
  const lines = [];

  for (const [index, group] of String(value || "").split("$$$").entries()) {
    const episodes = [];
    const episodes_titles = [];
    for (const entry of group.split("#")) {
      const separator = /^https?:\/\//i.test(entry.trim()) ? -1 : entry.indexOf("$");
      const url = entry.slice(separator + 1).trim();
      if (!/^https?:\/\//i.test(url) || !/\.m3u8(?:[?#]|$)/i.test(url)) continue;
      episodes.push(url);
      episodes_titles.push(separator < 0 ? "" : entry.slice(0, separator).trim());
    }
    if (episodes.length) {
      lines.push({ id: String(index), name: labels[index]?.trim() || `线路 ${index + 1}`, episodes, episodes_titles });
    }
  }

  const primary = lines.reduce((best, line) => line.episodes.length > (best?.episodes.length ?? 0) ? line : best, null);
  if (!primary) return { episodes: [], episodes_titles: [], playbackLines: [], playbackLineId: null };

  // Keep episode order and watch-history indices anchored to the primary line.
  const timeline = { ...primary, type };
  const playbackLines = lines.map(({ id, name, episodes, episodes_titles }) => ({
    id,
    name: lines.some((line) => line.id !== id && line.name === name) ? `${name} · ${Number(id) + 1}` : name,
    episodes: id === primary.id ? episodes : timeline.episodes.map((_, index) => {
      if (!timeline.episodes_titles[index] && episodes.length !== timeline.episodes.length) return null;
      const match = matchingEpisode(timeline, index, { episodes, episodes_titles });
      return episodes[match] ?? null;
    }),
  }));
  return {
    episodes: primary.episodes,
    episodes_titles: primary.episodes_titles,
    playbackLines,
    playbackLineId: primary.id,
  };
}

export function videoWithPlaybackLine(video, lineId) {
  if (!video || lineId == null || lineId === video.playbackLineId) return video;
  const line = video.playbackLines?.find((entry) => entry.id === lineId);
  if (!line) return video;
  return {
    ...video,
    playbackLineId: line.id,
    episodes: video.episodes.map((url, index) => line.episodes[index] || url),
  };
}

export function episodePlaybackLines(video, index) {
  const urls = new Set();
  return (video.playbackLines || []).filter((line) => {
    const url = line.episodes[index];
    if (!url || urls.has(url)) return false;
    urls.add(url);
    return true;
  });
}
