import test from "node:test";
import assert from "node:assert/strict";
import { dandanHeaders, matchDandanEpisode, normalizeDandanComments } from "../src/lib/server/dandanplay.mjs";

test("signs the upstream path and converts supported comment fields for ArtPlayer", () => {
  const headers = dandanHeaders("my-app", "secret", "/api/v2/comment/123450001", 1735660800);
  assert.equal(headers["X-Timestamp"], "1735660800");
  assert.equal(headers["X-Signature"], "tidj7W41mMRJ38SAdbe+uI3gQLezwRWkgs2qgexh5ek=");
  assert.deepEqual(normalizeDandanComments([
    { p: "11.5,1,16711680,user", m: "滚动弹幕" },
    { p: "12,5,255,user", m: "顶部弹幕" },
    { p: "14,4,16777215,user", m: "底部弹幕" },
    null,
    { p: "-1,1,0", m: "无效时间" },
  ]), [
    { time: 11.5, mode: 0, color: "#ff0000", text: "滚动弹幕" },
    { time: 12, mode: 1, color: "#0000ff", text: "顶部弹幕" },
    { time: 14, mode: 2, color: "#ffffff", text: "底部弹幕" },
  ]);
});

test("auto match requires one distinct episode and skips other titles", () => {
  const work = (animeTitle, ...ids) => ({ animeTitle, episodes: ids.map((episodeId) => ({ episodeId })) });
  assert.equal(matchDandanEpisode([work("试播片花", 10), work("试播", 11)], "试播", "1"), 11);
  assert.equal(matchDandanEpisode([work("试播", 10), work("试播", 11)], "试播", "1"), null);
  assert.equal(matchDandanEpisode([work("试播", 10, 11)], "试播", ""), null);
});
