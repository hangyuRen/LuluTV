// 自定义 HLS 加载器单独成文件，避免 lib/util 的轻量工具函数把 hls.js 带进非播放页面的包里
import Hls from "hls.js";
import { filterAdsFromM3U8 } from "@/lib/utils/util";

export class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
  constructor(config) {
    super(config);
    const load = this.load.bind(this);
    this.load = function (context, config, callbacks) {
      // 拦截manifest和level请求
      if (context.type === "manifest" || context.type === "level") {
        const onSuccess = callbacks.onSuccess;
        callbacks.onSuccess = function (response, stats, context) {
          // 如果是m3u8文件，处理内容以移除广告分段
          if (response.data && typeof response.data === "string") {
            // 过滤掉广告段 - 实现更精确的广告过滤逻辑
            response.data = filterAdsFromM3U8(response.data);
          }
          return onSuccess(response, stats, context, null);
        };
      }
      // 执行原始load方法
      load(context, config, callbacks);
    };
  }
}

export function attachHlsStream(video, url, blockAds, onFailure) {
  video.hls?.destroy();
  delete video.hls;

  if (!Hls.isSupported()) {
    video.src = url;
    return;
  }

  const hls = new Hls({
    debug: false,
    enableWorker: true,
    lowLatencyMode: false,
    maxBufferLength: 10,
    backBufferLength: 5,
    maxBufferSize: 80 * 1000 * 1000,
    liveSyncDurationCount: 3,
    loader: blockAds ? CustomHlsJsLoader : Hls.DefaultConfig.loader,
  });
  video.hls = hls;
  let attemptedMediaRecovery = false;

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal || video.hls !== hls) return;
    if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !attemptedMediaRecovery) {
      attemptedMediaRecovery = true;
      hls.recoverMediaError();
      return;
    }

    delete video.hls;
    hls.destroy();
    onFailure();
  });

  hls.loadSource(url);
  hls.attachMedia(video);
}
