const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const [resources, userData, version] = process.argv.slice(2);
const runtime = path.join(userData, "server", version);
const readyFile = path.join(runtime, ".prepared");
const buildId = fs.readFileSync(path.join(resources, ".next", "BUILD_ID"), "utf8");
if (!fs.existsSync(readyFile) || fs.readFileSync(readyFile, "utf8") !== buildId) {
  fs.rmSync(runtime, { recursive: true, force: true });
  fs.mkdirSync(runtime, { recursive: true });
  fs.cpSync(resources, runtime, { recursive: true, dereference: true });
  fs.writeFileSync(readyFile, buildId);
}
// Prove readiness from this process even if an unrelated application owns the port.
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
  this.once("listening", () => {
    const address = this.address();
    if (address?.address === "127.0.0.1" && address.port === Number(process.env.PORT)) {
      http.Server.prototype.listen = listen;
      process.parentPort.postMessage(process.env.LULUTV_STARTUP_TOKEN);
    }
  });
  return listen.apply(this, args);
};
require(path.join(runtime, "server.js"));
