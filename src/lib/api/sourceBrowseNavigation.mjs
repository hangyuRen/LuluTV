export function readBrowsePage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= 100000 ? page : 1;
}

export function sourceBrowseHref({ source, category = "all", page = 1, video, offset }) {
  const params = new URLSearchParams({ source, category, page: String(page) });
  if (video != null) params.set("video", String(video));
  if (offset != null) params.set("offset", String(offset));
  return `/source-browse?${params}`;
}
