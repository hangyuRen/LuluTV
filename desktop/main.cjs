const { installApplicationMenu } = require("./updates.cjs");
const { app, BrowserWindow, dialog, shell, utilityProcess } = require("electron");
const { randomBytes, timingSafeEqual } = require("node:crypto");
const path = require("node:path");

const port = 3210;
const origin = `http://127.0.0.1:${port}`;
let window;
let server;
let starting;
let quitting = false;

function stopServer() {
  quitting = true;
  server?.kill();
}

if (process.platform === "win32") app.setAppUserModelId("com.squirrel.lulutv.LuluTV");

function startServer() {
  if (starting) return starting;
  const dataDirectory = app.getPath("userData");
  const runtime = app.isPackaged
    ? path.join(process.resourcesPath, "runtime")
    : path.join(__dirname, "runtime");
  const token = randomBytes(32).toString("hex");
  const expected = Buffer.from(token);
  const environment = { ...process.env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(port), LULUTV_STARTUP_TOKEN: token };
  // The Next.js build can write runtime caches. Give it a writable per-user copy.
  server = utilityProcess.fork(path.join(__dirname, "server.cjs"), [runtime, dataDirectory, app.getVersion()], { env: environment });

  starting = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error("本地服务启动超时。")), 25000);
    const handleExit = () => finish(new Error(`无法启动本地服务。请检查端口 ${port} 是否被占用。`));
    const handleMessage = (message) => {
      if (typeof message !== "string") return;
      const received = Buffer.from(message);
      if (received.length === expected.length && timingSafeEqual(received, expected)) finish();
    };
    const child = server;
    function finish(error) {
      clearTimeout(timeout);
      child.off("message", handleMessage);
      child.off("exit", handleExit);
      if (error) reject(error);
      else resolve();
    }
    child.on("message", handleMessage);
    child.once("exit", handleExit);
    child.once("exit", () => {
      server = null;
      starting = null;
      if (!quitting && window) {
        dialog.showErrorBox("LuluTV 本地服务已退出", "请重新打开 LuluTV。");
        app.quit();
      }
    });
  });
  return starting;
}

function focusWindow() {
  if (!window) return false;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
  return true;
}

function openExternal(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      void shell.openExternal(parsed.href).catch(() => {});
    }
  } catch { /* Ignore invalid URLs. */ }
}

let opening;
function openWindow() {
  if (!app.isReady()) return;
  if (focusWindow()) return;
  if (opening) return opening;
  opening = (async () => {
    await startServer();
    if (quitting) return;
    window = new BrowserWindow({
      title: "LuluTV", width: 1280, height: 820, minWidth: 360, minHeight: 500,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, partition: "persist:lulutv" },
    });
    window.webContents.setWindowOpenHandler(({ url }) => {
      openExternal(url);
      return { action: "deny" };
    });
    const restrictNavigation = (event, details) => {
      const target = typeof details === "string" ? details : event.url;
      try { if (new URL(target).origin === origin) return; } catch { /* Block invalid targets. */ }
      event.preventDefault();
      openExternal(target);
    };
    window.webContents.on("will-navigate", restrictNavigation);
    window.webContents.on("will-redirect", restrictNavigation);
    window.on("closed", () => { window = null; });
    await window.loadURL(origin);
  })().catch((error) => {
    if (!quitting) dialog.showErrorBox("LuluTV 启动失败", error.message);
    app.quit();
  }).finally(() => { opening = null; });
  return opening;
}

const squirrelEvent = process.platform === "win32" && require("electron-squirrel-startup");
if (squirrelEvent || !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => { void openWindow(); });
  app.on("activate", () => { void openWindow(); });
  app.on("window-all-closed", () => { if (!quitting && process.platform !== "darwin") app.quit(); });
  app.on("before-quit", stopServer);
  void app.whenReady().then(() => {
    installApplicationMenu(() => window, stopServer);
    return openWindow();
  });
}
