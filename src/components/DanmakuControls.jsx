"use client";

import Link from "next/link";
import { DANMAKU_SETTINGS_HREF, DANDANPLAY_DEVELOPER_URL, hasDandanCredentials } from "@/lib/config/danmaku";
import { useSettingsStore } from "@/stores/useSettingsStore";

function DanmakuSetupGuide() {
  return (
    <>
      <p className="text-sm text-muted">请先在弹弹play开发者中心申请 App ID 和 App Secret，再到 LuluTV 设置中填写。</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={DANDANPLAY_DEVELOPER_URL} target="_blank" rel="noopener noreferrer" className="ui-button">申请弹弹play应用凭据</a>
        <Link href={DANMAKU_SETTINGS_HREF} className="ui-button ui-button-primary">前往弹幕设置</Link>
      </div>
    </>
  );
}

export function DanmakuSetupNotice() {
  const enabled = useSettingsStore((state) => state.danmakuEnabled);
  const configured = useSettingsStore((state) => hasDandanCredentials(state.dandanCredentials));
  if (!enabled || configured) return null;
  return (
    <div className="border-t border-line bg-background-light px-4 py-3 sm:px-5">
      <p role="status" className="mb-1 text-sm font-medium text-ink">弹幕已开启，等待配置</p>
      <DanmakuSetupGuide />
    </div>
  );
}
