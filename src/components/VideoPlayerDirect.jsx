import { usePlayerDirect } from "@/hooks/usePlayerDirect";
import { PlaybackUnavailable } from "@/components/PlaybackUnavailable";

export function VideoPlayerDirect({ currentUrl, title }) {
  const { artRef, playbackFailed } = usePlayerDirect({
    currentUrl,
    title,
  });

  return (
    <div className="relative w-full h-full bg-black overflow-hidden group">
      <div ref={artRef} className="w-full h-full" />
      {playbackFailed && <PlaybackUnavailable />}
    </div>
  );
}
