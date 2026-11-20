"use client";

import { useState, useEffect, useRef } from "react";
import { DanmakuSettings } from "@/components/DanmakuSettings";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { isTmdbApiKey, TMDB_API_APPLICATION_URL, TMDB_KEY_MAX_LENGTH } from "@/lib/config/tmdb";
import {
  MaterialSymbolsArrowUpwardRounded,
  MaterialSymbolsArrowDownwardRounded,
  MaterialSymbolsEditSquareOutline,
  MaterialSymbolsDeleteOutlineRounded,
  MaterialSymbolsAdd,
  MaterialSymbolsSearchRounded,
  MaterialSymbolsUploadFileOutlineRounded,
  MaterialSymbolsDownload2Outline,
  MaterialSymbolsCloseRounded,
  MaterialSymbolsChevronRightRounded,
} from "@/components/icons";

const SourceItem = ({ source, index, totalCount, toggleSource, onEdit, onDelete, onMoveUp, onMoveDown }) => {
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

  return (
    <div
      className={`group flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 bg-surface-light border rounded-2xl hover:shadow-card transition-all duration-200 gap-3 md:gap-4 ${
        source.enabled ? "border-primary/30 hover:border-primary/60" : "border-line hover:border-muted/40"
      }`}
    >
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0 overflow-hidden">
        <div className="relative inline-block w-12 shrink-0 align-middle select-none transition duration-200 ease-in">
          <input
            type="checkbox"
            name={`toggle-${source.id}`}
            id={`toggle-${source.id}`}
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 border-gray-300 top-0"
            style={{
              left: source.enabled ? "24px" : "0px",
              borderColor: source.enabled ? "var(--color-primary)" : "#D1D5DB",
            }}
            checked={source.enabled}
            onChange={() => toggleSource(source.id)}
          />
          <label
            htmlFor={`toggle-${source.id}`}
            className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ${source.enabled ? "bg-primary" : "bg-gray-300"}`}
          ></label>
        </div>
        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <span className="font-bold text-gray-900 text-sm md:text-lg truncate">{source.name}</span>
          <span className="text-xs md:text-sm text-gray-500 truncate font-mono">{source.url}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2 md:pl-4 justify-end md:justify-start shrink-0">
        <button
          onClick={() => onMoveUp(source.id)}
          disabled={!canMoveUp}
          className={`min-h-[44px] w-10 md:w-auto p-2 rounded-full transition-all duration-300 ${
            canMoveUp ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer" : "text-gray-200 cursor-not-allowed"
          }`}
          aria-label="向上移动"
        >
          <MaterialSymbolsArrowUpwardRounded className="text-[18px] md:text-[20px]" />
        </button>
        <button
          onClick={() => onMoveDown(source.id)}
          disabled={!canMoveDown}
          className={`min-h-[44px] w-10 md:w-auto p-2 rounded-full transition-all duration-300 ${
            canMoveDown ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer" : "text-gray-200 cursor-not-allowed"
          }`}
          aria-label="向下移动"
        >
          <MaterialSymbolsArrowDownwardRounded className="text-[18px] md:text-[20px]" />
        </button>
        <button
          onClick={() => onEdit(source)}
          className="min-h-[44px] w-10 md:w-auto p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-300 cursor-pointer"
          aria-label="编辑"
        >
          <MaterialSymbolsEditSquareOutline className="text-[18px] md:text-[20px]" />
        </button>
        <button
          onClick={() => onDelete(source.id)}
          className="min-h-[44px] w-10 md:w-auto p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-300 cursor-pointer"
          aria-label="删除"
        >
          <MaterialSymbolsDeleteOutlineRounded className="text-[18px] md:text-[20px]" />
        </button>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timers = [];

    if (isOpen) {
      // 使用 setTimeout 避免同步 setState
      timers.push(setTimeout(() => setShouldRender(true), 0));
      // 延迟一帧后开始动画
      timers.push(setTimeout(() => setIsAnimating(true), 20));
    } else {
      // 先开始退出动画
      timers.push(setTimeout(() => setIsAnimating(false), 0));
      // 等待动画完成后卸载
      timers.push(setTimeout(() => setShouldRender(false), 300));
    }

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-end sm:items-center justify-center z-[60] sm:p-4 transition-opacity duration-300 ease-out ${isAnimating ? "opacity-100" : "opacity-0"}`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass-panel rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain custom-scrollbar pb-safe transition-all duration-300 ease-out ${
          isAnimating ? "opacity-100 translate-y-0 sm:scale-100" : "opacity-100 translate-y-full sm:opacity-0 sm:scale-95 sm:translate-y-4"
        }`}
      >
        <div className="sticky top-0 z-10 bg-surface-light/95 backdrop-blur-xl border-b border-line px-5 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} aria-label="关闭" className="flex items-center justify-center size-11 sm:size-8 -mr-2 sm:mr-0 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-900/5 transition-colors cursor-pointer btn-press">
            <MaterialSymbolsCloseRounded />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

function TmdbSettings() {
  const apiKey = useSettingsStore((state) => state.tmdbApiKey);
  const setApiKey = useSettingsStore((state) => state.setTmdbApiKey);
  const [draft, setDraft] = useState(null);
  const [feedback, setFeedback] = useState("");

  function saveKey(value) {
    const key = value.trim();
    if (key && !isTmdbApiKey(key)) {
      setFeedback("请输入 TMDB 的 API Key，密钥只能包含字母、数字、下划线或连字符。");
      return;
    }
    setApiKey(key);
    setDraft(null);
    setFeedback(key ? "API Key 已保存。" : "API Key 已移除。");
  }

  return (
    <section id="tmdb-settings" aria-labelledby="tmdb-settings-heading" className="surface-panel mt-6 scroll-mt-24 p-4 md:p-8">
      <h2 id="tmdb-settings-heading" className="font-display text-xl font-bold text-ink">TMDB 设置</h2>
      <p id="tmdb-key-hint" className="mt-1 text-sm text-muted">
        密钥保存在当前浏览器，用于加载 TMDB 榜单和影片详情。
      </p>
      <form className="mt-4" onSubmit={(event) => { event.preventDefault(); saveKey(draft ?? apiKey); }}>
        <label htmlFor="tmdb-api-key" className="mb-2 block text-sm font-medium text-ink">TMDB API Key</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="tmdb-api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            maxLength={TMDB_KEY_MAX_LENGTH}
            value={draft ?? apiKey}
            onChange={(event) => { setDraft(event.target.value); setFeedback(""); }}
            aria-describedby="tmdb-key-hint"
            placeholder="输入 TMDB API Key"
            className="h-11 w-full min-w-0 max-w-md rounded-lg border border-line bg-background-light px-3 text-ink focus:border-primary-dark focus:ring-2 focus:ring-primary/35 sm:flex-1"
          />
          <button type="submit" className="ui-button ui-button-primary" disabled={(draft ?? apiKey).trim() === apiKey}>保存</button>
          {apiKey && <button type="button" onClick={() => saveKey("")} className="ui-button">移除密钥</button>}
        </div>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 text-sm">
        <a href={TMDB_API_APPLICATION_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary-dark underline underline-offset-4">申请 API Key</a>
        <p role="status" className="text-muted">{feedback}</p>
      </div>
    </section>
  );
}

export default function Settings() {
  const {
    videoSources,
    toggleSource,
    addSource,
    updateSource,
    removeSource,
    moveSource,
    resetToDefaults,
    exportSettings,
    importSettings,
  } = useSettingsStore();

  // State for modals and forms
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [searchVideo, setSearchVideo] = useState("");
  const [videoCheck, setVideoCheck] = useState(null);
  const [videoFeedback, setVideoFeedback] = useState("");
  const videoRequest = useRef(null);

  useEffect(() => () => videoRequest.current?.abort(), []);

  // Form state for video sources
  const [videoForm, setVideoForm] = useState({
    name: "",
    key: "",
    url: "",
    description: "",
  });

  // Open add/edit modal
  const openVideoModal = (source = null) => {
    setVideoFeedback("");
    setVideoCheck(null);
    if (source) {
      setEditingSource(source);
      setVideoForm({
        name: source.name || "",
        key: source.key || "",
        url: source.url || "",
        description: source.description || "",
      });
    } else {
      setEditingSource(null);
      setVideoForm({ name: "", key: "", url: "", description: "" });
    }
    setShowVideoModal(true);
  };

  // Handle form submission
  function closeVideoModal() {
    videoRequest.current?.abort();
    videoRequest.current = null;
    setShowVideoModal(false);
    setVideoCheck(null);
  }

  function saveVideoSource(url, disabled = false) {
    const source = { ...videoForm, url, ...(disabled ? { enabled: false } : {}) };
    if (editingSource) {
      updateSource(editingSource.id, source);
    } else {
      addSource(source);
    }
    setVideoFeedback(disabled ? "已保存为停用。" : editingSource ? "保存成功" : "添加成功");
    closeVideoModal();
  }

  async function handleVideoSubmit(event) {
    event.preventDefault();
    if (!showVideoModal || videoRequest.current) return;
    const url = videoForm.url.trim();
    if (editingSource && url === editingSource.url) {
      saveVideoSource(url);
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setVideoCheck({ error: "请输入完整的 HTTP 或 HTTPS 接口地址。" });
      return;
    }

    const controller = new AbortController();
    videoRequest.current = controller;
    setVideoCheck({ status: "pending" });
    try {
      const response = await fetch("/api/source-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (response.ok && result.status === "verified") saveVideoSource(result.url);
      else if (response.ok && result.status === "unverified") setVideoCheck(result);
      else setVideoCheck({ error: result.error || "检测视频源失败，请重试。" });
    } catch {
      if (!controller.signal.aborted) setVideoCheck({ error: "检测视频源失败，请重试。" });
    } finally {
      if (videoRequest.current === controller) videoRequest.current = null;
    }
  }

  // Handle delete with confirmation
  const handleDelete = (id) => {
    if (window.confirm("确定要删除这个源吗？")) {
      removeSource(id);
    }
  };

  // Handle export
  const handleExport = () => {
    const data = exportSettings();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LuluTV-settings-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle import
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            importSettings(data);
            alert("配置导入成功！");
          } catch (error) {
            alert("导入失败，请检查文件格式");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Filter sources based on search
  const filteredVideoSources = videoSources.filter((source) => source.name.toLowerCase().includes(searchVideo.toLowerCase()) || source.url.toLowerCase().includes(searchVideo.toLowerCase()));

  return (
    <div className="w-full max-w-5xl mx-auto">
      <TmdbSettings />

      {/* Video Sources */}
      <section className="surface-panel p-4 md:p-8 mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900">视频源管理</h2>
            <p className="text-gray-500 mt-1">管理视频来源，调整优先级和启用状态</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => resetToDefaults()}
              className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-gray-600 bg-surface-light border border-line rounded-lg hover:bg-surface-active hover:text-gray-900 transition-colors shadow-sm cursor-pointer"
            >
              恢复默认
            </button>
            <button
              onClick={() => openVideoModal()}
              className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MaterialSymbolsAdd className="text-sm font-bold" />
              添加源
            </button>
          </div>
        </div>
        <p role="status" className={videoFeedback ? "mt-3 text-sm font-medium text-primary-dark" : "sr-only"}>{videoFeedback}</p>
        <div className="relative mt-6 mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MaterialSymbolsSearchRounded className="text-gray-400" />
          </div>
          <input
            className="block w-full pl-10 pr-3 py-3 border border-line rounded-xl leading-5 bg-background-light/50 focus:bg-surface-light placeholder-gray-400 sm:text-sm"
            placeholder="搜索源..."
            type="text"
            value={searchVideo}
            onChange={(e) => setSearchVideo(e.target.value)}
          />
        </div>
        <div className="space-y-4">
          {filteredVideoSources.map((source, index) => (
            <SourceItem
              key={source.id}
              source={source}
              index={index}
              totalCount={filteredVideoSources.length}
              toggleSource={toggleSource}
              onEdit={openVideoModal}
              onDelete={(id) => handleDelete(id)}
              onMoveUp={(id) => moveSource(id, "up")}
              onMoveDown={(id) => moveSource(id, "down")}
            />
          ))}
        </div>
      </section>

      <DanmakuSettings />

      {/* Data Management */}
      <section className="surface-panel p-4 md:p-8 mt-8">
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-gray-900">数据管理</h2>
          <p className="text-gray-500 mt-1">导入或导出视频源配置</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={handleImport}
            className="group flex items-center justify-between p-4 sm:p-6 bg-background-light border border-line rounded-2xl hover:bg-surface-light hover:border-primary hover:shadow-card hover:ring-1 hover:ring-primary/20 transition-all duration-300 text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                <MaterialSymbolsUploadFileOutlineRounded className="text-2xl" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">导入配置</h3>
                <p className="text-sm text-gray-500 mt-1">从 JSON 文件恢复数据</p>
              </div>
            </div>
            <MaterialSymbolsChevronRightRounded className="text-gray-400 group-hover:text-primary transition-all duration-300" />
          </button>
          <button
            onClick={handleExport}
            className="group flex items-center justify-between p-4 sm:p-6 bg-background-light border border-line rounded-2xl hover:bg-surface-light hover:border-primary hover:shadow-card hover:ring-1 hover:ring-primary/20 transition-all duration-300 text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <MaterialSymbolsDownload2Outline className="text-2xl" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">导出配置</h3>
                <p className="text-sm text-gray-500 mt-1">备份当前数据到本地</p>
              </div>
            </div>
            <MaterialSymbolsChevronRightRounded className="text-gray-400 group-hover:text-primary transition-all duration-300" />
          </button>
        </div>
      </section>

      {/* Video Source Modal */}
      <Modal isOpen={showVideoModal} onClose={closeVideoModal} title={editingSource ? "编辑视频源" : "添加视频源"}>
        <form onSubmit={handleVideoSubmit} className="space-y-4">
          <fieldset disabled={videoCheck?.status === "pending"} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 sm:py-2 border border-line bg-background-light/50 focus:bg-surface-light rounded-lg"
                placeholder="例如：资源站A"
                value={videoForm.name}
                onChange={(e) => setVideoForm({ ...videoForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 sm:py-2 border border-line bg-background-light/50 focus:bg-surface-light rounded-lg"
                placeholder="例如：source_a"
                value={videoForm.key}
                onChange={(e) => setVideoForm({ ...videoForm, key: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="video-source-url" className="block text-sm font-medium text-gray-700 mb-1">MacCMS JSON 接口地址 *</label>
              <input
                id="video-source-url"
                type="text"
                inputMode="url"
                required
                aria-invalid={Boolean(videoCheck?.error)}
                aria-describedby="video-source-check"
                className="w-full px-3 py-2.5 sm:py-2 border border-line bg-background-light/50 focus:bg-surface-light rounded-lg"
                placeholder="https://api.example.com/vod"
                value={videoForm.url}
                onChange={(e) => {
                  setVideoForm({ ...videoForm, url: e.target.value });
                  setVideoCheck(null);
                }}
              />
              <p id="video-source-check" role={videoCheck?.error ? "alert" : "status"} className={videoCheck?.error ? "mt-2 text-sm text-red-700" : "mt-2 text-sm text-muted"}>
                {videoCheck?.error || videoCheck?.message || (videoCheck?.status === "pending" ? "正在检测视频源…" : "")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                className="w-full px-3 py-2.5 sm:py-2 border border-line bg-background-light/50 focus:bg-surface-light rounded-lg resize-none"
                placeholder="可选的描述信息"
                rows="3"
                value={videoForm.description}
                onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
              />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2 pt-4">
            <button
              type="button"
              onClick={closeVideoModal}
              className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-medium text-gray-600 bg-surface-light border border-line rounded-lg hover:bg-surface-active transition-colors cursor-pointer"
            >
              取消
            </button>
            {videoCheck?.status === "unverified" && (
              <button type="button" onClick={() => showVideoModal && saveVideoSource(videoCheck.url, true)} className="ui-button">保存为停用</button>
            )}
            <button type="submit" disabled={videoCheck?.status === "pending"} className="ui-button ui-button-primary flex-1">
              {videoCheck?.status === "pending" ? "检测中…" : videoCheck ? "重新检测" : editingSource ? "保存" : "添加"}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
