import { forwardDoubanImage } from "@/lib/api/doubanApi";
import { resumeTime } from "@/lib/player/progress";
import { useEffect, useRef, useEffectEvent, useState } from "react";
import Artplayer from "artplayer";
import artplayerPluginDanmuku from "artplayer-plugin-danmuku";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { usePlayHistoryStore } from "@/stores/usePlayHistoryStore";
import { formatTime } from "@/lib/utils/util";
import { attachHlsStream } from "@/lib/player/hlsLoader";
import { useArtplayerDanmaku } from "@/hooks/useArtplayerDanmaku";
export function usePlayer({
  videoDetail,
  currentEpisodeIndex,
  setCurrentEpisodeIndex,
  startTime,
  danmakuQuery,
}) {
  const danmakuEnabled = useSettingsStore((state) => state.danmakuEnabled);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const artRef = useRef(null);
  const artPlayerRef = useRef(null);
  const nextEpisodeTimerRef = useRef(null);
  const lastSkipCheckRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const blockAdEnabledRef = useRef(useSettingsStore.getState().blockAdEnabled);
  const skipConfigRef = useRef(useSettingsStore.getState().skipConfig);
  const isSwitchingEpisodeRef = useRef(false); // 标记是否正在切换剧集
  const prevEpisodeIndexRef = useRef(currentEpisodeIndex); // 记录上一次的剧集索引
  const CurrentEpisodeIndexEvent = useEffectEvent(() => {
    return currentEpisodeIndex;
  });

  const savePlayProgress = (episodeIndex = currentEpisodeIndex, detail = videoDetail) => {
    if (!artPlayerRef.current || !detail) return;

    // 如果正在切换剧集，跳过保存（避免保存错误的 currentTime）
    if (isSwitchingEpisodeRef.current) return;

    const currentTime = artPlayerRef.current.currentTime || 0;
    const duration = artPlayerRef.current.duration || 0;

    if (currentTime < 1 || !duration) return;

    try {
      const { addPlayRecord } = usePlayHistoryStore.getState();

      addPlayRecord({
        source: detail.source,
        source_name: detail.source_name,
        id: detail.id,
        title: detail.title,
        poster: detail.poster,
        year: detail.year,
        type: detail.type,
        douban_id: detail.douban_id,
        tmdb_id: detail.tmdb_id,
        hongguo_id: detail.hongguo_id,
        currentEpisodeIndex: Number.isInteger(episodeIndex) ? episodeIndex : currentEpisodeIndex,
        totalEpisodes: detail.episodes?.length || 1,
        currentTime,
        duration,
      });
      console.log("播放进度已保存:", {
        title: detail.title,
        episode: episodeIndex + 1,
        progress: `${Math.floor(currentTime)}/${Math.floor(duration)}`,
      });
    } catch (err) {
      console.error("保存播放进度失败:", err);
    }
  };
  const savePlayProgressEvent = useEffectEvent(savePlayProgress);

  const switchToEpisode = () => {
    if (!videoDetail || !artPlayerRef.current) return;

    const currentUrl = videoDetail.episodes?.[currentEpisodeIndex];
    const currentTitle =
      videoDetail.episodes_titles?.[currentEpisodeIndex] ||
      `第 ${currentEpisodeIndex + 1} 集`;

    if (!currentUrl) {
      console.error("Invalid episode index:", currentEpisodeIndex);
      return;
    }

    console.log("Switching to episode:", currentEpisodeIndex + 1);

    savePlayProgress(prevEpisodeIndexRef.current);

    // 标记开始切换剧集，阻止保存错误的进度
    isSwitchingEpisodeRef.current = true;

    // 切换播放地址
    setPlaybackFailed(false);
    artPlayerRef.current.switch = currentUrl;
    artPlayerRef.current.title = `${videoDetail.title} - ${currentTitle}`;
    artPlayerRef.current.poster =
      forwardDoubanImage(videoDetail?.backdrop || videoDetail?.poster);

    // 3. 监听新视频开始播放，重置切换标志
    artPlayerRef.current.once("video:canplay", () => {
      const record = usePlayHistoryStore.getState().getPlayRecord(videoDetail.source, videoDetail.id);
      artPlayerRef.current.currentTime = resumeTime(record, currentEpisodeIndex, undefined, artPlayerRef.current.duration);
      isSwitchingEpisodeRef.current = false;
      console.log("新剧集已就绪，恢复进度保存");
    });
  };

  const switchToEpisodeEvent = useEffectEvent(switchToEpisode);

  useEffect(() => {
    if (!videoDetail || !artRef.current || artPlayerRef.current) {
      return;
    }


    try {
      console.log("重新初始化播放器了！");
      const realtimeCurrentEpisodeIndex = CurrentEpisodeIndexEvent();
      console.log("realtimeCurrentEpisodeIndex", realtimeCurrentEpisodeIndex);
      const currentUrl =
        videoDetail?.episodes?.[realtimeCurrentEpisodeIndex] || "";
      const currentTitle =
        videoDetail?.episodes_titles?.[realtimeCurrentEpisodeIndex] ||
        `第${realtimeCurrentEpisodeIndex + 1}集`;

      artPlayerRef.current = new Artplayer({
        container: artRef.current,
        url: currentUrl,
        title: `${videoDetail.title} - ${currentTitle}`,
        poster: forwardDoubanImage(videoDetail?.backdrop || videoDetail?.poster),
        volume: 0.7,
        isLive: false,
        muted: false,
        autoplay: true,
        pip: true,
        autoSize: false,
        autoMini: false,
        screenshot: false,
        setting: true,
        loop: false,
        flip: false,
        playbackRate: true,
        aspectRatio: false,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: false,
        miniProgressBar: false,
        mutex: true,
        playsInline: true,
        autoPlayback: false,
        airplay: true,
        theme: "#FAC638",
        lang: "zh-cn",
        hotkey: false,
        fastForward: true,
        autoOrientation: true,
        lock: true,
        moreVideoAttr: {
          crossOrigin: "anonymous",
        },
        plugins: [
          artplayerPluginDanmuku({
            danmuku: [],
            visible: useSettingsStore.getState().danmakuEnabled,
            speed: 7.5,
            opacity: 1,
            fontSize: 23,
            emitter: false,
            color: "#FFFFFF",
            mode: 0,
            margin: [10, "25%"],
            antiOverlap: true,
            useWorker: true,
            synchronousPlayback: true,
            filter: (danmu) => danmu.text.length <= 50,
            lockTime: 5,
            maxLength: 100,
            minWidth: 200,
            maxWidth: 400,
            theme: "dark",
          }),
        ],

        customType: {
          m3u8: (video, url) => {
            attachHlsStream(video, url, blockAdEnabledRef.current, () => setPlaybackFailed(true));
          },
        },
        settings: [
          {
            html: "去广告",
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="currentColor">AD</text></svg>',
            tooltip: blockAdEnabledRef.current ? "已开启" : "已关闭",
            switch: blockAdEnabledRef.current,
            onSwitch: function (item) {
              const newVal = !item.switch;
              useSettingsStore.getState().setBlockAdEnabled(newVal);
              if (artPlayerRef.current) {
                artPlayerRef.current.notice.show = newVal
                  ? "去广告已开启，刷新生效"
                  : "去广告已关闭，刷新生效";
              }
              return newVal;
            },
          },
          {
            html: "跳过片头片尾",
            tooltip: skipConfigRef.current.enable ? "已开启" : "已关闭",
            switch: skipConfigRef.current.enable,
            onSwitch: function (item) {
              const currentSkipConfig = useSettingsStore.getState().skipConfig;
              const newConfig = {
                ...currentSkipConfig,
                enable: !item.switch,
              };
              useSettingsStore.getState().setSkipConfig(newConfig);
              if (artPlayerRef.current) {
                artPlayerRef.current.notice.show = newConfig.enable
                  ? "跳过片头片尾已开启"
                  : "跳过片头片尾已关闭";
              }
              return !item.switch;
            },
          },
          {
            html: "设置片头",
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="12" r="2" fill="currentColor"/><path d="M10 12L17 12" stroke="currentColor" stroke-width="2"/><path d="M17 7L17 17" stroke="currentColor" stroke-width="2"/></svg>',
            tooltip:
              skipConfigRef.current.intro_time === 0
                ? "点击设置片头时间"
                : `片头：${formatTime(skipConfigRef.current.intro_time)}`,
            onClick: function () {
              if (artPlayerRef.current) {
                const currentTime = artPlayerRef.current.currentTime || 0;
                if (currentTime > 0) {
                  const currentSkipConfig =
                    useSettingsStore.getState().skipConfig;
                  const newConfig = {
                    ...currentSkipConfig,
                    intro_time: currentTime,
                  };
                  useSettingsStore.getState().setSkipConfig(newConfig);
                  artPlayerRef.current.notice.show = `片头已设置：${formatTime(currentTime)}`;
                  return `片头：${formatTime(currentTime)}`;
                }
              }
            },
          },
          {
            html: "设置片尾",
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 7L7 17" stroke="currentColor" stroke-width="2"/><path d="M7 12L14 12" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="12" r="2" fill="currentColor"/></svg>',
            tooltip:
              skipConfigRef.current.outro_time >= 0
                ? "点击设置片尾时间"
                : `片尾：${formatTime(-skipConfigRef.current.outro_time)}`,
            onClick: function () {
              if (artPlayerRef.current) {
                const outroTime =
                  -(
                    artPlayerRef.current.duration -
                    artPlayerRef.current.currentTime
                  ) || 0;
                if (outroTime < 0) {
                  const currentSkipConfig =
                    useSettingsStore.getState().skipConfig;
                  const newConfig = {
                    ...currentSkipConfig,
                    outro_time: outroTime,
                  };
                  useSettingsStore.getState().setSkipConfig(newConfig);
                  artPlayerRef.current.notice.show = `片尾已设置：${formatTime(-outroTime)}`;
                  return `片尾：${formatTime(-outroTime)}`;
                }
              }
            },
          },
          {
            html: "清除跳过配置",
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
            onClick: function () {
              const newConfig = { enable: false, intro_time: 0, outro_time: 0 };
              useSettingsStore.getState().setSkipConfig(newConfig);
              if (artPlayerRef.current) {
                artPlayerRef.current.notice.show = "跳过配置已清除";
              }
              return "已清除";
            },
          },
        ],

      });

      artPlayerRef.current.on("ready", () => {
        console.log("播放器就绪");
      });

      artPlayerRef.current.once("video:canplay", () => {
        // 从store中获取播放记录
        const playRecord = usePlayHistoryStore
          .getState()
          .getPlayRecord(videoDetail.source, videoDetail.id);
        const initialTime = startTime ?? resumeTime(playRecord, CurrentEpisodeIndexEvent());
        if (initialTime > 0) {
          try {
            const duration = artPlayerRef.current.duration || 0;
            let target = initialTime;
            if (startTime !== undefined && duration && target >= duration) {
              target = Math.max(0, duration - 0.25);
            } else if (startTime === undefined && duration && target >= duration - 2) {
              target = Math.max(0, duration - 5);
            }
            artPlayerRef.current.currentTime = target;
            artPlayerRef.current.notice.show = `已恢复到 ${Math.floor(target / 60)}:${String(Math.floor(target % 60)).padStart(2, "0")}`;
            console.log("成功恢复播放进度到:", target);
          } catch (err) {
            console.warn("恢复播放进度失败:", err);
          }
        }
      });

      artPlayerRef.current.on("video:timeupdate", () => {
        const { skipConfig } = useSettingsStore.getState();
        // 自动保存数据
        const now = Date.now();
        if (now - lastSaveTimeRef.current > 5000) {
          savePlayProgressEvent();
          lastSaveTimeRef.current = now;
        }

        if (skipConfig.enable && artPlayerRef.current) {
          const currentTime = artPlayerRef.current.currentTime || 0;
          const duration = artPlayerRef.current.duration || 0;

          if (now - lastSkipCheckRef.current >= 1500) {
            lastSkipCheckRef.current = now;

            if (
              skipConfig.intro_time > 0 &&
              currentTime < skipConfig.intro_time
            ) {
              artPlayerRef.current.currentTime = skipConfig.intro_time;
              artPlayerRef.current.notice.show = `Skipped intro (${formatTime(skipConfig.intro_time)})`;
            }

            if (
              skipConfig.outro_time < 0 &&
              duration > 0 &&
              currentTime > duration + skipConfig.outro_time
            ) {
              artPlayerRef.current.notice.show = `Skipped outro (${formatTime(-skipConfig.outro_time)})`;
              const currentIdx = CurrentEpisodeIndexEvent();
              if (
                videoDetail &&
                videoDetail.episodes &&
                currentIdx < videoDetail.episodes.length - 1
              ) {
                setCurrentEpisodeIndex(currentIdx + 1);
              } else {
                artPlayerRef.current.pause();
              }
            }
          }
        }
      });

      artPlayerRef.current.on("video:seeked", () => savePlayProgressEvent());
      artPlayerRef.current.on("pause", () => {
        savePlayProgressEvent();
      });

      artPlayerRef.current.on("video:ended", () => {
        savePlayProgressEvent();
        clearTimeout(nextEpisodeTimerRef.current);
        const currentIdx = CurrentEpisodeIndexEvent();
        if (
          videoDetail &&
          videoDetail.episodes &&
          currentIdx < videoDetail.episodes.length - 1
        ) {
          nextEpisodeTimerRef.current = setTimeout(() => {
            nextEpisodeTimerRef.current = null;
            if (CurrentEpisodeIndexEvent() === currentIdx) setCurrentEpisodeIndex(currentIdx + 1);
          }, 1000);
        }
      });

      artPlayerRef.current.on("video:error", (event) => {
        const error = event.target?.error;
        if (error && error.code !== error.MEDIA_ERR_ABORTED) setPlaybackFailed(true);
      });
      artPlayerRef.current.on("video:playing", () => setPlaybackFailed(false));
    } catch (err) {
      console.error("创建播放器失败:", err);
    }

    return () => {
      clearTimeout(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
      if (artPlayerRef.current) {
        savePlayProgressEvent(prevEpisodeIndexRef.current, videoDetail);
        try {
          if (artPlayerRef.current.video && artPlayerRef.current.video.hls) {
            artPlayerRef.current.video.hls.destroy();
          }
          artPlayerRef.current.destroy();
          artPlayerRef.current = null;
          console.log("播放器资源已清理");
        } catch (err) {
          console.warn("清理播放器资源时出错:", err);
          artPlayerRef.current = null;
        }
      }
    };
  }, [videoDetail, setCurrentEpisodeIndex, startTime]);

  // 核心 Play Effect: 监听 currentEpisodeIndex 变化，统一执行切换
  useEffect(() => {
    clearTimeout(nextEpisodeTimerRef.current);
    nextEpisodeTimerRef.current = null;
    // 只在 currentEpisodeIndex 真正变化时才切换，避免首次挂载时重复切换
    if (
      artPlayerRef.current &&
      prevEpisodeIndexRef.current !== currentEpisodeIndex
    ) {
      switchToEpisodeEvent(currentEpisodeIndex);
    }
    // 更新上一次的索引
    prevEpisodeIndexRef.current = currentEpisodeIndex;
  }, [currentEpisodeIndex]);

  useEffect(() => {
    const handleKeyboardShortcuts = (e) => {
      // 不抢占表单、按钮或弹窗的原生键盘操作。
      if (
        e.defaultPrevented ||
        document.querySelector('[aria-modal="true"]') ||
        e.target?.closest?.('input, textarea, select, button, a[href], summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="dialog"], [data-player-shortcut-exempt]')
      ) return;

      // 每次按键时获取最新的 episodeIndex
      const currentIdx = CurrentEpisodeIndexEvent();

      if (e.altKey && e.key === "ArrowLeft") {
        if (currentIdx > 0) {
          setCurrentEpisodeIndex(currentIdx - 1);
          e.preventDefault();
        }
      }

      if (e.altKey && e.key === "ArrowRight") {
        if (
          videoDetail &&
          videoDetail.episodes &&
          currentIdx < videoDetail.episodes.length - 1
        ) {
          setCurrentEpisodeIndex(currentIdx + 1);
          e.preventDefault();
        }
      }

      if (!e.altKey && e.key === "ArrowLeft") {
        if (artPlayerRef.current && artPlayerRef.current.currentTime > 5) {
          artPlayerRef.current.currentTime -= 10;
          e.preventDefault();
        }
      }

      if (!e.altKey && e.key === "ArrowRight") {
        if (
          artPlayerRef.current &&
          artPlayerRef.current.currentTime < artPlayerRef.current.duration - 5
        ) {
          artPlayerRef.current.currentTime += 10;
          e.preventDefault();
        }
      }

      if (e.key === "ArrowUp") {
        if (artPlayerRef.current && artPlayerRef.current.volume < 1) {
          artPlayerRef.current.volume =
            Math.round((artPlayerRef.current.volume + 0.1) * 10) / 10;
          artPlayerRef.current.notice.show = `Volume: ${Math.round(artPlayerRef.current.volume * 100)}`;
          e.preventDefault();
        }
      }

      if (e.key === "ArrowDown") {
        if (artPlayerRef.current && artPlayerRef.current.volume > 0) {
          artPlayerRef.current.volume =
            Math.round((artPlayerRef.current.volume - 0.1) * 10) / 10;
          artPlayerRef.current.notice.show = `Volume: ${Math.round(artPlayerRef.current.volume * 100)}`;
          e.preventDefault();
        }
      }

      if (e.key === " ") {
        if (artPlayerRef.current) {
          artPlayerRef.current.toggle();
          e.preventDefault();
        }
      }

      if (e.key === "f" || e.key === "F") {
        if (artPlayerRef.current) {
          artPlayerRef.current.fullscreen = !artPlayerRef.current.fullscreen;
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcuts);
    return () => {
      document.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [videoDetail, setCurrentEpisodeIndex]);

  useEffect(() => {
    const save = () => savePlayProgressEvent();
    const hidden = () => { if (document.hidden) save(); };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("beforeunload", save);
    return () => {
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  useArtplayerDanmaku(artPlayerRef, videoDetail, danmakuQuery, danmakuEnabled);

  return { artRef, artPlayerRef, playbackFailed };
}
