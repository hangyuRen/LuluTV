import { matchesExactTitle } from "./mediaIdentity.mjs";

function compactNumberedTitle(title) {
  const suffix = title.match(/^(.+?)\s+(\S+)$/s);
  return suffix && /[\p{Nd}零〇一二两三四五六七八九十百千]/u.test(suffix[2])
    ? suffix[1] + suffix[2]
    : null;
}

export async function searchRecommendedVideo(reference, sources, lookup, onMatch, signal) {
  const title = reference.title.trim();
  const compact = compactNumberedTitle(title);
  const alias = reference.originalTitle?.trim();
  const candidates = new Map();
  const matchedSources = new Set();

  function exactMatch(results, name) {
    return results.filter((entry) => matchesExactTitle({ ...reference, title: name }, entry))
      .sort((a, b) => Number(b.year === reference.year) - Number(a.year === reference.year))[0];
  }

  function publish(source, match) {
    if (signal.aborted) return;
    matchedSources.add(source);
    onMatch(match);
  }

  function search(query, pendingSources, reportMatch) {
    return Promise.all(pendingSources.map(async (source) => {
      const { results } = await lookup(query, source);
      if (signal.aborted) return;
      for (const entry of results) {
        const key = JSON.stringify([entry.source, entry.id]);
        const earlier = candidates.get(key);
        if (!earlier || entry.latencyMs < earlier.latencyMs) candidates.set(key, entry);
      }
      const match = exactMatch(results, title) || (query === compact ? exactMatch(results, compact) : null);
      if (match) await reportMatch(source, match);
    }));
  }

  if (signal.aborted) return [];
  const original = search(title, sources, publish).then(() => matchedSources.size === 0);
  const compactSearch = compact && search(compact, sources, async (source, match) => {
    if (await original) publish(source, match);
  });
  await Promise.all([original, compactSearch]);

  if (!signal.aborted && alias && alias !== title && alias !== compact) {
    await search(alias, sources.filter((source) => !matchedSources.has(source)), publish);
  }

  return signal.aborted || matchedSources.size ? [] : [...candidates.values()].sort((a, b) => a.latencyMs - b.latencyMs);
}
