const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const build = spawnSync(process.execPath, [require.resolve("next/dist/bin/next", { paths: [root] }), "build"], { cwd: root, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);

const runtime = path.join(__dirname, "runtime");
fs.rmSync(runtime, { recursive: true, force: true });
const copy = { recursive: true, dereference: true, filter: (file) => !/^\.env(?:\.|$)/.test(path.basename(file)) };
fs.cpSync(path.join(root, ".next", "standalone"), runtime, copy);
fs.cpSync(path.join(root, ".next", "static"), path.join(runtime, ".next", "static"), copy);
fs.cpSync(path.join(root, "public"), path.join(runtime, "public"), copy);

const sharp = require(require.resolve("sharp", { paths: [root] }));
const logo = path.join(root, "public", "lulu-logo.png");
const icons = path.join(__dirname, "icons");
fs.mkdirSync(icons, { recursive: true });

async function makeIcons() {
  const png = (size) => sharp(logo).resize(size, size, { fit: "contain", background: "#0000" }).png().toBuffer();
  const image = await png(256);
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  ico.writeUInt16LE(1, 10);
  ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(image.length, 14);
  ico.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(icons, "LuluTV.ico"), Buffer.concat([ico, image]));
  const chunks = [];
  for (const [type, size] of [["ic07", 128], ["ic08", 256], ["ic09", 512], ["ic10", 1024]]) {
    const bytes = await png(size);
    const header = Buffer.alloc(8);
    header.write(type);
    header.writeUInt32BE(bytes.length + 8, 4);
    chunks.push(header, bytes);
  }
  const header = Buffer.alloc(8);
  header.write("icns");
  header.writeUInt32BE(8 + chunks.reduce((length, chunk) => length + chunk.length, 0), 4);
  fs.writeFileSync(path.join(icons, "LuluTV.icns"), Buffer.concat([header, ...chunks]));
}
void makeIcons().catch((error) => { console.error(error); process.exitCode = 1; });
