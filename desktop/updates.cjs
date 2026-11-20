const { app, autoUpdater, dialog, Menu } = require("electron");

function installApplicationMenu(getWindow, stopServer) {
  let checking = false;
  let downloaded = false;
  const notify = (message, buttons = ["确定"]) => {
    const options = { type: "info", title: "LuluTV", message, buttons };
    const window = getWindow();
    return window ? dialog.showMessageBox(window, options) : dialog.showMessageBox(options);
  };

  function checkForUpdates() {
    if (!app.isPackaged) return void notify("请在已安装的 LuluTV 客户端中检查更新。");
    if (downloaded) {
      void notify("更新已下载，是否重启安装？", ["稍后", "重启并更新"]).then(({ response }) => {
        if (response === 1) {
          stopServer();
          autoUpdater.quitAndInstall();
        }
      });
      return;
    }
    if (checking) return;
    checking = true;
    try {
      const target = `${process.platform}-${process.arch}`;
      autoUpdater.setFeedURL({ url: `https://update.electronjs.org/hangyuRen/LuluTV/${target}/${app.getVersion()}` });
      autoUpdater.checkForUpdates();
    } catch {
      checking = false;
      void notify("无法检查更新，请稍后重试。");
    }
  }

  if (app.isPackaged) {
    autoUpdater.on("error", () => {
      checking = false;
      void notify("暂时无法完成更新。请稍后重试，或从 GitHub 下载对应系统的新版安装包。");
    });
    autoUpdater.on("update-not-available", () => {
      checking = false;
      void notify("当前已是最新版本。");
    });
    autoUpdater.on("update-downloaded", () => {
      checking = false;
      downloaded = true;
      checkForUpdates();
    });
  }

  const fileMenu = { label: "LuluTV", submenu: [
    { label: "检查更新…", click: checkForUpdates },
    { type: "separator" }, { role: "quit", label: "退出 LuluTV" },
  ] };
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    fileMenu,
    { label: "编辑", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "视图", submenu: [{ role: "reload" }, { role: "togglefullscreen" }] },
  ]));
}

module.exports = { installApplicationMenu };
