import test from "node:test";
import assert from "node:assert/strict";
import { validateCatalog } from "../src/lib/server/catalog-validation.mjs";
import { requestCatalogJson } from "../src/lib/server/catalog-request.mjs";

const endpoint = "https://example.com/vod?token=demo";
const movie = { vod_id: 7, vod_name: "测试影片", vod_play_url: "正片$https://example.com/video.m3u8" };

test("validates a source using the same list, search, and detail parameters as playback", async () => {
  const requests = [];
  const result = await validateCatalog(endpoint, { load: async (url) => {
    requests.push(Object.fromEntries(url.searchParams));
    return { code: 1, list: [movie] };
  } });
  assert.deepEqual(result, { status: "verified", url: endpoint });
  assert.deepEqual(requests, [
    { token: "demo", ac: "detail", pg: "1" },
    { token: "demo", ac: "detail", wd: movie.vod_name, pg: "1" },
    { token: "demo", ac: "detail", ids: "7" },
  ]);
});

test("distinguishes incompatible responses from empty or unverified sources", async () => {
  const validate = (data) => validateCatalog(endpoint, { load: async () => data });
  await assert.rejects(validate({ list: [{}] }), { status: 502 });
  await assert.rejects(validate({ code: 0, list: [] }), { status: 502 });
  assert.equal((await validate({ list: [] })).status, "unverified");
  assert.equal((await validate({ list: [{ ...movie, vod_play_url: "" }] })).status, "unverified");
  await assert.rejects(validateCatalog("https://example.com/stream.m3u8?token=demo"), /直链播放/);
  await assert.rejects(validateCatalog("https:example.com"), { status: 400 });
});

test("shared catalog transport rejects nonpublic targets before attempting a connection", async () => {
  for (const url of ["http://127.0.0.1/", "http://10.0.0.1/", "http://[::1]/", "http://[fc00::1]/", "file:///tmp/catalog"]) {
    await assert.rejects(requestCatalogJson(url), { status: 400 });
  }
});
