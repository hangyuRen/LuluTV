const finite = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const episodeKey = (index, id) => id ? `id:${id}` : `index:${index}`;

export function createPlayRecord(previous, record) {
  const currentTime = Math.floor(finite(record.currentTime));
  const duration = Math.floor(finite(record.duration));
  const index = Math.floor(finite(record.currentEpisodeIndex));
  const updatedAt = Date.now();
  return { ...previous, ...record, currentEpisodeIndex: index, currentTime, duration,
    progress: duration > 0 ? Math.min(100, currentTime / duration * 100) : 0, updatedAt,
    episodeProgress: { ...previous?.episodeProgress, [episodeKey(index, record.episodeId)]: { currentTime, duration, updatedAt } },
  };
}

export function resumeTime(record, index, id, duration = 0) {
  const saved = record?.episodeProgress?.[episodeKey(index, id)];
  const matches = id ? record?.episodeId === id : record?.currentEpisodeIndex === index;
  const time = finite(saved?.currentTime ?? (matches ? record.currentTime : 0));
  return duration > 0 && time >= duration - 2 ? Math.max(0, duration - 5) : time;
}
