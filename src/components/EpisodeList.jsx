"use client";

import { useState } from "react";

const episodesPerGroup = 20;

export function EpisodeList({ episodes, episodesTitles, currentEpisodeIndex, onEpisodeClick }) {
  const [selection, setSelection] = useState(null);
  const activeGroup = Math.floor(currentEpisodeIndex / episodesPerGroup);
  const group = selection?.episode === currentEpisodeIndex ? selection.group : activeGroup;
  const groupCount = Math.ceil(episodes.length / episodesPerGroup);
  const first = group * episodesPerGroup;

  return (
    <section aria-labelledby="episode-list-heading" className="p-4">
      <h2 id="episode-list-heading" className="text-sm font-semibold text-ink">剧集 <span className="ml-1 font-normal text-muted">共 {episodes.length} 集</span></h2>
      {groupCount > 1 && (
        <div role="group" aria-label="剧集分组" className="mt-3 flex flex-wrap gap-1">
          {Array.from({ length: groupCount }, (_, index) => (
            <button key={index} type="button" className="filter-chip tabular-nums" aria-pressed={group === index}
              onClick={() => setSelection({ episode: currentEpisodeIndex, group: index })}>
              {index * episodesPerGroup + 1}–{Math.min((index + 1) * episodesPerGroup, episodes.length)}
            </button>
          ))}
        </div>
      )}
      <div role="group" aria-label="剧集列表" className="mt-3 grid grid-cols-5 gap-2">
        {episodes.slice(first, first + episodesPerGroup).map((_, offset) => {
          const index = first + offset;
          const label = episodes.length === 1 ? "正片" : String(index + 1);
          const title = episodesTitles?.[index] || (episodes.length === 1 ? label : `第 ${label} 集`);
          return (
            <button key={index} type="button" title={title} aria-label={title} aria-pressed={index === currentEpisodeIndex}
              className={`h-11 min-w-0 rounded-lg border text-sm tabular-nums cursor-pointer ${index === currentEpisodeIndex ? "border-primary bg-primary-soft text-primary-dark" : "border-line hover:bg-surface-active"}`}
              onClick={() => onEpisodeClick(index)}>
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
