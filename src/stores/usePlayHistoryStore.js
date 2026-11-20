'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { compactPlayHistory, samePlaybackEntry, sameWatchedMedia } from '@/lib/api/mediaIdentity.mjs';
import { createPlayRecord } from '@/lib/player/progress';

export const usePlayHistoryStore = create(
  persist(
    (set, get) => ({
      // 播放记录数组，按时间倒序排列
      playHistory: [],

      // 添加或更新播放记录
      addPlayRecord: (record) => set((state) => {
        const previous = state.playHistory.find((item) => samePlaybackEntry(item, record));
        const filteredHistory = state.playHistory.filter((item) => !sameWatchedMedia(item, record));
        const newRecord = createPlayRecord(previous, record);

        // 添加到最前面（最新的在前）
        return {
          playHistory: [newRecord, ...filteredHistory].slice(0, 20), // 只保留最近20条
        };
      }),

      // 删除播放记录
      removePlayRecord: (source, id) => set((state) => ({
        playHistory: state.playHistory.filter(
          (item) => !samePlaybackEntry(item, { source, id })
        ),
      })),

      // 清空所有播放记录
      clearPlayHistory: () => set({ playHistory: [] }),

      // 获取特定视频的播放记录
      getPlayRecord: (source, id) => {
        const state = get();
        return state.playHistory.find(
          (item) => samePlaybackEntry(item, { source, id })
        );
      },
    }),
    {
      name: 'NextTV-play-history',
      version: 1,
      migrate: (saved) => ({
        playHistory: compactPlayHistory(Array.isArray(saved?.playHistory) ? saved.playHistory : []),
      }),
    }
  )
);
