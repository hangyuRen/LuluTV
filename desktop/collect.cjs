const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const make = path.join(__dirname, "out", "make");
const dist = path.join(__dirname, "dist");
fs.mkdirSync(dist, { recursive: true });
const files = fs.readdirSync(make, { recursive: true }).map((file) => path.join(make, file));

function copy(pattern, name) {
  const file = files.find((candidate) => pattern.test(path.basename(candidate)));
  if (!file) throw new Error(`Missing desktop artifact: ${pattern}`);
  fs.copyFileSync(file, path.join(dist, name || path.basename(file)));
}

if (process.platform === "darwin") {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "lulutv-dmg-"));
  const app = path.join(__dirname, "out", `LuluTV-darwin-${process.arch}`, "LuluTV.app");
  const stagedApp = path.join(staging, "LuluTV.app");
  const dmg = path.join(dist, `LuluTV-apple-${process.arch}.dmg`);
  try {
    execFileSync("ditto", [app, stagedApp], { stdio: "inherit" });
    execFileSync("codesign", ["--verify", "--deep", "--strict", stagedApp], { stdio: "inherit" });
    execFileSync(path.join(stagedApp, "Contents", "MacOS", "LuluTV"), ["--version"], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: "inherit",
      timeout: 15_000,
    });
    fs.symlinkSync("/Applications", path.join(staging, "Applications"));
    execFileSync("hdiutil", ["create", "-ov", "-volname", "LuluTV", "-format", "UDZO", "-srcfolder", staging, dmg], { stdio: "inherit" });
    execFileSync("hdiutil", ["verify", dmg], { stdio: "inherit" });
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
  copy(/\.zip$/, `LuluTV-darwin-${process.arch}.zip`);
} else if (process.platform === "win32" && process.arch === "x64") {
  copy(/Setup\.exe$/i, "LuluTV-windows-x64.exe");
  copy(/-full\.nupkg$/);
  copy(/^RELEASES$/);
} else {
  throw new Error("Unsupported desktop build target.");
}
