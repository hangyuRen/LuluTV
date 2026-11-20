import test from "node:test";
import assert from "node:assert/strict";
import { sourceBrowseUrl, sourceBrowseData, requestSourceBrowse, sourceBrowseVideoPage } from "../src/lib/server/source-browse.mjs";

test("browse URLs preserve source parameters and reset stale category/page filters", () => {
  const target = new URL(sourceBrowseUrl("https://example.com/api?token=a%25b&pg=9&t=3&ids=4&wd=test", "videos", 2, "12"));
  assert.equal(target.searchParams.get("token"), "a%b");
  assert.equal(target.searchParams.get("ac"), "detail");
  assert.equal(target.searchParams.get("pg"), "2");
  assert.equal(target.searchParams.get("t"), "12");
  assert.equal(target.searchParams.has("ids"), false);
  assert.equal(target.searchParams.has("wd"), false);
  const categories = new URL(sourceBrowseUrl(target.href, "categories", 2, "12"));
  assert.equal(categories.searchParams.get("ac"), "list");
  assert.equal(categories.searchParams.get("pg"), "1");
  assert.equal(categories.searchParams.has("t"), false);
  for (const url of ["file:///tmp/a", "invalid", "https://user:password@example.com"]) assert.throws(() => sourceBrowseUrl(url, "videos"), { status: 400 });
  assert.throws(() => sourceBrowseUrl("https://example.com", "videos", 0), { status: 400 });
});

test("browse responses omit episode URLs and normalize pagination/categories", () => {
  const raw = { code: 1, total: "120", pagecount: "6", class: [{ type_id: 3, type_name: "电影" }], list: [{ vod_id: 7, vod_name: "test", vod_pic: "https://example.com/poster.jpg", vod_play_url: "private-playback-url", vod_content: "long description" }] };
  const videos = sourceBrowseData(raw, "videos");
  assert.equal(videos.total, 120);
  assert.equal(videos.pagecount, 6);
  assert.equal(videos.list[0].vod_pic, raw.list[0].vod_pic);
  assert.equal(JSON.stringify(videos).includes("private-playback-url"), false);
  assert.equal("vod_content" in videos.list[0], false);
  assert.deepEqual(sourceBrowseData(raw, "categories").categories, [{ type_id: "3", type_name: "电影" }]);
  assert.throws(() => sourceBrowseData({ code: 0, list: [] }, "videos"), { status: 502 });
  assert.throws(() => sourceBrowseData({}, "videos"), { status: 502 });
});

test("browse fetch bounds waiting and distinguishes upstream errors from empty results", async () => {
  await assert.rejects(requestSourceBrowse("https://example.com", "videos", {
    load: async () => { throw Object.assign(new Error("upstream unavailable"), { status: 502 }); },
  }), { status: 502 });
  await assert.rejects(requestSourceBrowse("https://example.com", "videos", {
    timeoutMs: 10,
    load: async (_url, { timeoutMs }) => {
      assert.equal(timeoutMs, 10);
      throw Object.assign(new Error("upstream timeout"), { status: 504 });
    },
  }), { status: 504 });
  const empty = await requestSourceBrowse("https://example.com", "videos", {
    load: async () => ({ code: 1, list: [], total: "0", pagecount: "0" }),
  });
  assert.deepEqual(empty, { list: [], total: 0, pagecount: 1, limit: 0 });
});

for (const limit of [12, 20, 30]) {
  test(`20-item pages preserve every item when the source returns ${limit} per page`, async () => {
    const all = Array.from({ length: 53 }, (_, index) => ({ vod_id: index + 1 }));
    const load = async (page) => ({
      list: all.slice((page - 1) * limit, page * limit),
      total: all.length,
      pagecount: Math.ceil(all.length / limit),
      limit,
    });
    const pages = await Promise.all([1, 2, 3].map((page) => sourceBrowseVideoPage(page, load)));
    assert.deepEqual(pages.map((page) => page.list.length), [20, 20, 13]);
    assert.ok(pages.every((page) => page.pagecount === 3 && page.limit === 20));
    assert.deepEqual(pages.flatMap((page) => page.list), all);
    assert.equal((await sourceBrowseVideoPage(4, load)).list.length, 0);
  });
}
