import { lookup } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";

const maxBytes = 4 * 1024 * 1024;
const blockedV4 = new BlockList();
for (const [network, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 3],
]) blockedV4.addSubnet(network, bits);

const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
const blockedV6 = new BlockList();
for (const [network, bits] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]]) {
  blockedV6.addSubnet(network, bits, "ipv6");
}

function publicAddress(address) {
  const family = isIP(address);
  return family === 4 ? !blockedV4.check(address) : family === 6
    && globalV6.check(address, "ipv6") && !blockedV6.check(address, "ipv6");
}

export function catalogError(status, message) {
  return Object.assign(new Error(message), { status });
}

function blockedAddress() {
  return catalogError(400, "请输入可公开访问的视频源地址，服务器无法访问内网或本机地址。");
}

function publicLookup(hostname, options, callback) {
  // The socket connects to these checked addresses without resolving the hostname again.
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error);
    if (addresses.length === 0 || addresses.some(({ address }) => !publicAddress(address))) {
      return callback(blockedAddress());
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

function requestOnce(url, signal) {
  const connect = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const request = connect(url, {
      agent: false,
      lookup: publicLookup,
      signal,
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "identity",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }, resolve);
    request.on("error", reject);
    request.end();
  });
}

export async function requestCatalogJson(input, { signal, timeoutMs = 7500 } = {}) {
  const timeout = AbortSignal.timeout(timeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    let url;
    try { url = new URL(input); } catch { throw catalogError(400, "请输入完整的 HTTP 或 HTTPS 接口地址。"); }

    for (let redirects = 0; ; redirects++) {
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        throw catalogError(400, "请输入有效的 HTTP 或 HTTPS 接口地址。");
      }
      const hostname = url.hostname.replace(/^\[|\]$/g, "");
      if (isIP(hostname) && !publicAddress(hostname)) throw blockedAddress();

      const response = await requestOnce(url, requestSignal);
      const status = response.statusCode;
      if (status >= 300 && status < 400) {
        response.destroy();
        if (redirects >= 2 || !response.headers.location) {
          throw catalogError(502, "视频源重定向异常，请检查接口地址。");
        }
        try { url = new URL(response.headers.location, url); }
        catch { throw catalogError(502, "视频源重定向地址无效。"); }
        continue;
      }
      if (status < 200 || status >= 300) {
        response.destroy();
        throw catalogError(502, status === 404 ? "找不到该接口，请检查地址是否完整。" : `视频源返回 HTTP ${status}，请检查地址或稍后重试。`);
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of response) {
        size += chunk.length;
        if (size > maxBytes) throw catalogError(502, "视频源返回的数据过大，请检查接口地址。");
        chunks.push(chunk);
      }
      try { return JSON.parse(Buffer.concat(chunks).toString("utf8").replace(/^\uFEFF/, "")); }
      catch { throw catalogError(502, "该地址未返回 MacCMS JSON，请检查是否填入了正确的接口。"); }
    }
  } catch (error) {
    if (error.status) throw error;
    if (requestSignal.aborted) throw catalogError(504, "视频源响应超时，请重试。");
    throw catalogError(502, "暂时无法连接视频源，请检查地址或重试。");
  }
}
