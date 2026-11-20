import { useEffect } from "react";
import { hasDandanCredentials } from "@/lib/config/danmaku";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { requestDanmaku } from "@/lib/api/danmakuApi";

export function useArtplayerDanmaku(artPlayerRef, playerIdentity, searchQuery, enabled) {
  const credentials = useSettingsStore((state) => state.dandanCredentials);

  useEffect(() => {
    if (!playerIdentity) return;
    const player = artPlayerRef.current;
    if (!player) return;
    const toggle = player.template.$player.querySelector(".apd-toggle");
    function onKeyDown(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      toggle.click();
    }
    toggle?.setAttribute("role", "button");
    toggle?.setAttribute("tabindex", "0");
    toggle?.setAttribute("aria-label", "弹幕");
    toggle?.setAttribute("aria-pressed", String(useSettingsStore.getState().danmakuEnabled));
    toggle?.addEventListener("keydown", onKeyDown);

    function syncVisibility({ visible }) {
      if (typeof visible !== "boolean") return;
      toggle?.setAttribute("aria-pressed", String(visible));
      const settings = useSettingsStore.getState();
      if (visible !== settings.danmakuEnabled) settings.setDanmakuEnabled(visible);
    }
    player.on("artplayerPluginDanmuku:config", syncVisibility);
    return () => {
      toggle?.removeEventListener("keydown", onKeyDown);
      player.off("artplayerPluginDanmuku:config", syncVisibility);
    };
  }, [artPlayerRef, playerIdentity]);

  useEffect(() => {
    if (!playerIdentity) return;
    const plugin = artPlayerRef.current?.plugins.artplayerPluginDanmuku;
    if (!plugin) return;

    const controller = new AbortController();
    const { signal } = controller;
    plugin.config({ danmuku: [], visible: enabled });
    void plugin.load().catch(() => {});
    if (!enabled || !hasDandanCredentials(credentials) || !searchQuery) return;

    async function load() {
      const { episodeId } = await requestDanmaku("match", Object.fromEntries(new URLSearchParams(searchQuery)), credentials, signal);
      if (!episodeId || signal.aborted) return;
      const { danmuku } = await requestDanmaku("comments", { id: episodeId }, credentials, signal);
      const settings = useSettingsStore.getState();
      if (signal.aborted || !settings.danmakuEnabled || settings.dandanCredentials !== credentials) return;
      plugin.config({ danmuku });
      await plugin.load();
    }

    void load().catch(() => {});
    return () => controller.abort();
  }, [artPlayerRef, playerIdentity, searchQuery, enabled, credentials]);
}
