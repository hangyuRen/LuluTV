"use client";

import { useState } from "react";
import { DANDANPLAY_CREDENTIAL_MAX_LENGTH, DANDANPLAY_DEVELOPER_URL, hasDandanCredentials } from "@/lib/config/danmaku";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function DanmakuSettings() {
  const credentials = useSettingsStore((state) => state.dandanCredentials);
  const setCredentials = useSettingsStore((state) => state.setDandanCredentials);
  const [draftId, setDraftId] = useState(null);
  const [draftSecret, setDraftSecret] = useState(null);
  const [feedback, setFeedback] = useState("");
  const appId = draftId ?? credentials?.appId ?? "";
  const appSecret = draftSecret ?? credentials?.appSecret ?? "";

  function save(next) {
    if (next && !hasDandanCredentials(next)) {
      setFeedback("请填写有效的 App ID 和 App Secret，凭据中不能包含空格。");
      return;
    }
    setCredentials(next);
    setDraftId(null);
    setDraftSecret(null);
    setFeedback(next ? "弹弹play配置已保存。" : "弹弹play配置已移除。");
  }

  return (
    <section id="danmaku-settings" aria-labelledby="danmaku-settings-heading" className="surface-panel scroll-mt-24 p-4 md:p-8 mt-8">
      <h2 id="danmaku-settings-heading" className="font-display text-xl font-bold text-ink">弹弹play 设置</h2>
      <p id="danmaku-credential-hint" className="mt-1 text-sm text-muted">
        应用凭据保存在当前浏览器。开启弹幕时，LuluTV 会用这组凭据向弹弹play请求数据。
      </p>
      <form className="mt-4 max-w-xl" onSubmit={(event) => {
        event.preventDefault();
        save({ appId: appId.trim(), appSecret: appSecret.trim() });
      }}>
        <label htmlFor="dandan-app-id" className="mb-2 block text-sm font-medium text-ink">App ID</label>
        <input id="dandan-app-id" autoComplete="off" spellCheck={false} required maxLength={DANDANPLAY_CREDENTIAL_MAX_LENGTH}
          aria-describedby="danmaku-credential-hint" value={appId}
          onChange={(event) => { setDraftId(event.target.value); setFeedback(""); }}
          className="h-11 w-full rounded-lg border border-line bg-background-light px-3 text-ink focus:border-primary-dark focus:ring-2 focus:ring-primary/35" />
        <label htmlFor="dandan-app-secret" className="mb-2 mt-4 block text-sm font-medium text-ink">App Secret</label>
        <input id="dandan-app-secret" type="password" autoComplete="off" spellCheck={false} required maxLength={DANDANPLAY_CREDENTIAL_MAX_LENGTH}
          aria-describedby="danmaku-credential-hint" value={appSecret}
          onChange={(event) => { setDraftSecret(event.target.value); setFeedback(""); }}
          className="h-11 w-full rounded-lg border border-line bg-background-light px-3 text-ink focus:border-primary-dark focus:ring-2 focus:ring-primary/35" />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="ui-button ui-button-primary">保存</button>
          {credentials && <button type="button" className="ui-button" onClick={() => save(null)}>移除凭据</button>}
          <a href={DANDANPLAY_DEVELOPER_URL} target="_blank" rel="noopener noreferrer" className="ui-button">申请应用凭据</a>
        </div>
        <p role="status" className="mt-2 text-sm text-muted">{feedback}</p>
      </form>
    </section>
  );
}
