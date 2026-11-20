export function PlaybackUnavailable() {
  return (
    <div role="alert" className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/90 px-4 text-center text-sm font-medium text-white sm:text-base">
      当前视频不可播放，请切换其他数据源
    </div>
  );
}
