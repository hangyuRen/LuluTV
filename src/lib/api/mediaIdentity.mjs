function normalize(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
}

export function matchesMedia(reference, candidate) {
  if (reference.douban_id && candidate.douban_id) {
    return String(reference.douban_id) === String(candidate.douban_id);
  }
  const title = normalize(candidate.title);
  if (!title || ![reference.title, reference.originalTitle].some((name) => normalize(name) === title)) return false;
  if (reference.type && candidate.type && reference.type !== candidate.type) return false;
  const knownYear = (year) => /^\d{4}$/.test(year || "") && Number(year) > 0;
  return !knownYear(reference.year) || !knownYear(candidate.year) || String(reference.year) === String(candidate.year);
}

export function episodeLabelIdentity(title) {
  const label = normalize(title);
  const episode = label.match(/^(?:第|ep|e)?(\d+)(?:集|话|期)?$/);
  return episode ? String(Number(episode[1])) : label;
}

export function matchingEpisode(current, index, target) {
  if (current.type === "movie" && current.episodes.length === 1 && target.episodes.length === 1) return 0;
  const label = episodeLabelIdentity(current.episodes_titles?.[index]);
  if (label) return target.episodes_titles?.findIndex((title) => episodeLabelIdentity(title) === label) ?? -1;
  return !target.episodes_titles?.[index] && index < target.episodes.length ? index : -1;
}

export function recommendedPlaybackHref({ id, title, metadataSource, type, year, originalTitle }) {
  const query = new URLSearchParams({ title, catalog: metadataSource });
  for (const [field, value] of Object.entries({ type, year, originalTitle })) {
    if (value) query.set(field, value);
  }
  return `/play/${encodeURIComponent(id)}?${query}`;
}

export function samePlaybackEntry(a, b) {
  return String(a.source) === String(b.source) && String(a.id) === String(b.id);
}

export function sameWatchedMedia(a, b) {
  if (samePlaybackEntry(a, b)) return true;
  const aHongguoId = a.source === "hongguo" ? a.id : a.hongguo_id;
  const bHongguoId = b.source === "hongguo" ? b.id : b.hongguo_id;
  if (aHongguoId && bHongguoId) return String(aHongguoId) === String(bHongguoId);
  if ([a, b].some((record) => record.source === "hongguo" || record.source_name === "直链播放" || record.id === "直链")) return false;
  if (a.douban_id && b.douban_id) return String(a.douban_id) === String(b.douban_id);
  if (a.tmdb_id && b.tmdb_id && a.type && a.type === b.type) return String(a.tmdb_id) === String(b.tmdb_id);

  const title = normalize(a.title);
  if (!title || title !== normalize(b.title) || (a.type && b.type && a.type !== b.type)) return false;
  const year = String(a.year || "");
  if (/^[1-9]\d{3}$/.test(year) && /^[1-9]\d{3}$/.test(b.year || "")) return year === String(b.year);
  return Boolean(a.type && a.type === b.type && a.totalEpisodes > 0 && a.totalEpisodes === b.totalEpisodes);
}

export function compactPlayHistory(records) {
  const history = [];
  for (const record of records) {
    if (!history.some((entry) => sameWatchedMedia(entry, record))) history.push(record);
  }
  return history.slice(0, 20);
}

export function matchesExactTitle(reference, candidate) {
  const title = reference.title?.normalize("NFC").trim();
  return Boolean(title && title === candidate.title?.normalize("NFC").trim()
    && isDerivative(reference) === isDerivative(candidate) && matchesMedia(reference, candidate));
}

function isDerivative(video) {
  const labels = /解说|影评|混剪|剪辑|预告|花絮/;
  if (labels.test(video.type_name || "")) return true;
  const title = String(video.title || "").normalize("NFKC").trim();
  const qualifier = title.match(/(?:[\[(【]([^\])】]+)[\])】]|:\s*([^:]+))$/);
  return Boolean(qualifier && labels.test(qualifier[1] || qualifier[2]));
}

export function findSwitchCandidate(reference, candidates) {
  const derivative = isDerivative(reference);
  let best;
  let bestRank = Infinity;
  for (const candidate of candidates) {
    if (isDerivative(candidate) !== derivative) continue;
    const sameInstallment = matchesSeriesInstallment(reference, candidate)
      || (reference.originalTitle && matchesSeriesInstallment({ ...reference, title: reference.originalTitle }, candidate));
    if (!sameInstallment) continue;
    const rank = (matchesExactTitle(reference, candidate) ? 0 : 2) + Number(candidate.year !== reference.year);
    if (rank < bestRank) {
      best = candidate;
      bestRank = rank;
    }
  }
  return best;
}

export function groupSearchResults(results, query) {
  const searchText = (value) => String(value || "").normalize("NFC").trim().replace(/\s+/g, " ");
  const keyword = searchText(query);
  const exact = [];
  const contained = [];
  const related = [];

  for (const result of results) {
    const title = searchText(result.title);
    if (keyword && title === keyword) exact.push(result);
    else if (keyword && title.includes(keyword)) contained.push(result);
    else related.push(result);
  }

  return { matching: [...exact, ...contained], related };
}

const chineseDigits = "〇一二三四五六七八九";

function installmentNumber(token) {
  if (/^[0-9]{1,2}$/.test(token)) return Number(token);
  const digit = (character) => chineseDigits.indexOf(character?.replace("两", "二").replace("零", "〇") || "");
  if (token === "十") return 10;
  if (token.length === 1) return digit(token);
  if (token.includes("十")) {
    const [tens, ones] = token.split("十");
    return (tens ? digit(tens) : 1) * 10 + (ones ? digit(ones) : 0);
  }
  return 0;
}

export function seriesInstallment(title) {
  const fullTitle = String(title || "").normalize("NFKC").trim();
  const match = fullTitle.match(/^(.+?)[\s:·._-]*(?:第?([0-9]{1,2}|[〇零一二两三四五六七八九十]{1,3})\s*[季部]|(?:season\s*|\bs)([0-9]{1,2})|([0-9]{1,2}))$/i);
  if (match) {
    const series = match[1].trim();
    const number = installmentNumber(match[2] || match[3] || match[4]);
    if (number > 0 && !/[0-9]$/.test(series)) return { series, key: normalize(series), number };
  }
  return { series: fullTitle, key: normalize(fullTitle), number: 1 };
}

export function matchesSeriesInstallment(reference, candidate) {
  if (reference.type && candidate.type && reference.type !== candidate.type) return false;
  if (reference.douban_id && candidate.douban_id && String(reference.douban_id) !== String(candidate.douban_id)) return false;
  if (/^[1-9]\d{3}$/.test(reference.year || "") && /^[1-9]\d{3}$/.test(candidate.year || "")
    && String(reference.year) !== String(candidate.year)) return false;
  const current = seriesInstallment(reference.title);
  const other = seriesInstallment(candidate.title);
  return Boolean(current.key && current.key === other.key && current.number === other.number);
}

export function relatedInstallments(current, candidates) {
  if (!current) return [];
  const installment = seriesInstallment(current.title);
  if (!installment.key) return [];
  const sourcePriority = (candidate) => Number(candidate.source !== current.source);
  const related = new Map();
  for (const candidate of candidates) {
    if (current.type && candidate.type && current.type !== candidate.type) continue;
    const other = seriesInstallment(candidate.title);
    if (other.key !== installment.key || other.number === installment.number) continue;
    const previous = related.get(other.number);
    if (!previous || sourcePriority(candidate) < sourcePriority(previous) ||
      (sourcePriority(candidate) === sourcePriority(previous) && candidate.latencyMs < previous.latencyMs)) {
      related.set(other.number, candidate);
    }
  }
  return [...related.entries()]
    .sort(([aNumber, a], [bNumber, b]) => sourcePriority(a) - sourcePriority(b) || aNumber - bNumber)
    .slice(0, 8)
    .map(([, candidate]) => candidate);
}
