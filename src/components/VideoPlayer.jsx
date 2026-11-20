import { useEffect } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { PlaybackUnavailable } from "@/components/PlaybackUnavailable";

export function VideoPlayer({
  videoDetail,
  currentEpisodeIndex,
  setCurrentEpisodeIndex,
  danmakuQuery,
  playbackTimeRef,
  startTime,
}) {
  const { artRef, artPlayerRef, playbackFailed } = usePlayer({
    videoDetail,
    currentEpisodeIndex,
    setCurrentEpisodeIndex,
    startTime,
    danmakuQuery,
  });

  useEffect(() => {
    if (!playbackTimeRef) return;
    playbackTimeRef.current = () => {
      const player = artPlayerRef.current;
      if (player?.video?.readyState >= 3 || player?.currentTime > 0) return player.currentTime;
      return startTime;
    };
    return () => { playbackTimeRef.current = null; };
  }, [playbackTimeRef, artPlayerRef, startTime]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden group">
      {videoDetail?.episodes?.[currentEpisodeIndex] ? (
        <div ref={artRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex flex-col gap-2 items-center justify-center text-white">
          <span className="text-sm font-medium">暂无可用播放地址</span>
          <span className="text-xs text-white/60">请返回搜索页尝试其他视频源</span>
        </div>
      )}
      {playbackFailed && <PlaybackUnavailable />}
    </div>
  );
}
