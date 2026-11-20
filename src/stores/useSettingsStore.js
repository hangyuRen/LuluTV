"use client";

import {create} from "zustand";
import {persist} from "zustand/middleware";
import {DEFAULT_VIDEO_SOURCES, updateSourceEndpoint} from "@/lib/config/constants";

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      videoSources: DEFAULT_VIDEO_SOURCES,
      danmakuEnabled: false,
      dandanCredentials: null,
      setDandanCredentials: (credentials) => set({dandanCredentials: credentials}),
      tmdbApiKey: "",

      setTmdbApiKey: (key) => set({tmdbApiKey: key.trim()}),

      // 播放器配置
      blockAdEnabled: false,
      skipConfig: {enable: false, intro_time: 0, outro_time: 0},

      // 设置去广告开关
      setBlockAdEnabled: (enabled) => set({blockAdEnabled: enabled}),

      // 设置跳过配置
      setSkipConfig: (config) => set({skipConfig: config}),

      setDanmakuEnabled: (enabled) => set({danmakuEnabled: enabled}),

      toggleSource: (id) =>
        set((state) => {
          return {
            videoSources: state.videoSources.map((source) =>
              source.id === id ? {...source, enabled: !source.enabled} : source,
            ),
          };
        }),

      addSource: (source) =>
        set((state) => {
          const newSource = {
            ...source,
            id: Date.now().toString(),
            enabled: source.enabled ?? true,
          };
          return {
            videoSources: [...state.videoSources, newSource],
          };
        }),

      updateSource: (id, updatedData) =>
        set((state) => {
          return {
            videoSources: state.videoSources.map((source) =>
              source.id === id ? {...source, ...updatedData} : source,
            ),
          };
        }),

      removeSource: (id) =>
        set((state) => {
          return {
            videoSources: state.videoSources.filter((source) => source.id !== id),
          };
        }),

      moveSource: (id, direction) =>
        set((state) => {
          const sources = [...state.videoSources];
          const index = sources.findIndex((s) => s.id === id);

          if (index === -1) return state;

          const newIndex = direction === "up" ? index - 1 : index + 1;

          if (newIndex < 0 || newIndex >= sources.length) return state;

          [sources[index], sources[newIndex]] = [
            sources[newIndex],
            sources[index],
          ];

          return {videoSources: sources};
        }),

      resetToDefaults: () => set({videoSources: DEFAULT_VIDEO_SOURCES}),

      exportSettings: () => {
        const state = get();
        return {
          videoSources: state.videoSources,
          exportDate: new Date().toISOString(),
        };
      },

      importSettings: (data) =>
        set((state) => {
          let videoSources = state.videoSources;
          if (Array.isArray(data.videoSources)) {
            videoSources = data.videoSources
              .map((source, index) => ({
                id: Date.now().toString() + index,
                name: source.name || source.Name || "",
                key: source.key || source.Key || "",
                url: source.url || source.URL || "",
                description: source.description || source.Description || "",
                enabled: source.enabled !== false,
                type: "video",
              }))
              .filter((s) => s.name && s.url)
              .map(updateSourceEndpoint);
          }

          return {videoSources};
        }),
    }),
    {
      name: "nexttv-settings",
      version: 3,
      migrate: (saved) => {
        const settings = { ...saved };
        delete settings.danmakuSources;
        delete settings.doubanProxy;
        delete settings.doubanImageProxy;
        if (Array.isArray(settings.videoSources)) {
          settings.videoSources = settings.videoSources.map(updateSourceEndpoint);
        }
        return settings;
      },
    },
  ),
);
