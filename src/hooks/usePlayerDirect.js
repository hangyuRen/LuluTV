import { useEffect, useRef, useEffectEvent, useState } from "react";
import Artplayer from "artplayer";
import artplayerPluginDanmuku from "artplayer-plugin-danmuku";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { usePlayHistoryStore } from "@/stores/usePlayHistoryStore";
import { attachHlsStream } from "@/lib/player/hlsLoader";
import { useArtplayerDanmaku } from "@/hooks/useArtplayerDanmaku";

// 从 URL 检测视频格式
function detectVideoType(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".m3u8")) return "m3u8";
    if (pathname.endsWith(".flv")) return "flv";
    if (pathname.endsWith(".ts")) return "ts";
    if (pathname.endsWith(".mp4")) return "mp4";
    if (pathname.endsWith(".mkv")) return "mkv";
    if (pathname.endsWith(".webm")) return "webm";
  } catch {
    // URL 解析失败，降级到字符串匹配
  }
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8")) return "m3u8";
  if (lower.includes(".flv")) return "flv";
  if (lower.includes(".ts")) return "ts";
  if (lower.includes(".mp4")) return "mp4";
  if (lower.includes(".mkv")) return "mkv";
  if (lower.includes(".webm")) return "webm";
  // 默认返回空串，让 Artplayer 自行判断或原生播放
  return "";
}

export function usePlayerDirect({
  currentUrl,
  title,
}) {
  const danmakuEnabled = useSettingsStore((state) => state.danmakuEnabled);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const artRef = useRef(null);
  const artPlayerRef = useRef(null);
  const lastSaveTimeRef = useRef(0);
  const blockAdEnabledRef = useRef(useSettingsStore.getState().blockAdEnabled);

  // 设置 no-referrer 防止 CDN 校验 Referer 导致视频加载失败
  useEffect(() => {
    let meta = document.querySelector('meta[name="referrer"]');
    const existed = !!meta;
    const previousContent = meta?.content;

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "referrer";
      document.head.appendChild(meta);
    }
    meta.content = "no-referrer";

    return () => {
      if (existed) {
        meta.content = previousContent;
      } else {
        meta.remove();
      }
    };
  }, []);

  const savePlayProgress = (urlOverride) => {
    const recordUrl = typeof urlOverride === "string" ? urlOverride : currentUrl;
    if (!artPlayerRef.current || !currentUrl) return;

    const currentTime = artPlayerRef.current.currentTime || 0;
    const duration = artPlayerRef.current.duration || 0;

    if (currentTime < 1 || !duration) return;

    try {
      const { addPlayRecord } = usePlayHistoryStore.getState();

      addPlayRecord({
        source: recordUrl,
        source_name: "直链播放",
        id: '直链',
        title: title || "未知标题",
        poster:
          "https://tncache1-f1.v3mh.com/image/2026/02/18/f46c4dc098bae2bc83090d709b42d00f.jpg",
        year: new Date().getFullYear(),
        currentEpisodeIndex: 0,
        totalEpisodes: 1,
        currentTime,
        duration,
      });
    } catch (err) {
      console.error("保存播放进度失败:", err);
    }
  };

  const savePlayProgressEvent = useEffectEvent(savePlayProgress);

  useEffect(() => {
    if (!currentUrl || !artRef.current || artPlayerRef.current) {
      return;
    }

    try {
      artPlayerRef.current = new Artplayer({
        container: artRef.current,
        url: currentUrl,
        type: detectVideoType(currentUrl),
        title: "直链播放",
        poster: "",
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
          playsInline: true,
          'webkit-playsinline': 'true',
          referrerpolicy: 'no-referrer',
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
        ],
      });

      artPlayerRef.current.on("ready", () => {
        console.log("播放器就绪");
      });

      artPlayerRef.current.once("video:canplay", () => {
        const playRecord = usePlayHistoryStore
          .getState()
          .getPlayRecord(currentUrl, '直链');
        const initialTime = playRecord?.currentTime || 0;
        if (initialTime > 0) {
          try {
            const duration = artPlayerRef.current.duration || 0;
            let target = initialTime;
            if (duration && target >= duration - 2) {
              target = Math.max(0, duration - 5);
            }
            artPlayerRef.current.currentTime = target;
            artPlayerRef.current.notice.show = `已恢复到 ${Math.floor(target / 60)}:${String(Math.floor(target % 60)).padStart(2, "0")}`;
          } catch (err) {
            console.warn("恢复播放进度失败:", err);
          }
        }
      });

      artPlayerRef.current.on("video:timeupdate", () => {
        const now = Date.now();
        if (now - lastSaveTimeRef.current > 5000) {
          savePlayProgressEvent();
          lastSaveTimeRef.current = now;
        }
      });

      artPlayerRef.current.on("video:seeked", () => savePlayProgressEvent());
      artPlayerRef.current.on("video:ended", () => savePlayProgressEvent());
      artPlayerRef.current.on("pause", () => {
        savePlayProgressEvent();
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
      if (artPlayerRef.current) {
        savePlayProgressEvent(currentUrl);
        try {
          if (artPlayerRef.current.video?.hls) {
            artPlayerRef.current.video.hls.destroy();
          }
          if (artPlayerRef.current.video?.mpegtsPlayer) {
            artPlayerRef.current.video.mpegtsPlayer.destroy();
          }
          artPlayerRef.current.destroy();
          artPlayerRef.current = null;
        } catch (err) {
          console.warn("清理播放器资源时出错:", err);
          artPlayerRef.current = null;
        }
      }
    };
  }, [currentUrl]);

  useEffect(() => {
    const handleKeyboardShortcuts = (e) => {
      // 不抢占表单、按钮或弹窗的原生键盘操作。
      if (
        e.defaultPrevented ||
        document.querySelector('[aria-modal="true"]') ||
        e.target?.closest?.('input, textarea, select, button, a[href], summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="dialog"], [data-player-shortcut-exempt]')
      ) return;

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
  }, []);

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

  const danmakuQuery = title?.trim() ? new URLSearchParams({ title: title.trim() }).toString() : "";
  useArtplayerDanmaku(artPlayerRef, currentUrl, danmakuQuery, danmakuEnabled);

  return { artRef, playbackFailed };
}
