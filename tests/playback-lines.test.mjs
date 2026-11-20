import test from "node:test";
import assert from "node:assert/strict";
import { episodePlaybackLines, parsePlaybackLines, videoWithPlaybackLine } from "../src/lib/player/playbackLines.mjs";

const stream = (path) => `https://example.test/${path}.m3u8`;

test("keeps the primary episode indices and aligns a shorter, reordered line by episode label", () => {
  const primary = [1, 2, 3].map((n) => `第${n}集$${stream(`a/${n}`)}`).join("#");
  const secondary = `03$${stream("b/3")}#01$${stream("b/1")}`;
  const video = parsePlaybackLines(`${secondary}$$$${primary}`, "备用$$$主线", "tv");
  assert.equal(video.playbackLineId, "1");
  assert.deepEqual(video.episodes_titles, ["第1集", "第2集", "第3集"]);
  assert.deepEqual(episodePlaybackLines(video, 1).map((line) => line.name), ["主线"]);
  assert.deepEqual(episodePlaybackLines(video, 2).map((line) => line.name), ["备用", "主线"]);
  const switched = videoWithPlaybackLine(video, "0");
  assert.deepEqual(switched.episodes, [stream("b/1"), stream("a/2"), stream("b/3")]);
  assert.equal(switched.episodes_titles, video.episodes_titles);
  assert.equal(videoWithPlaybackLine(video, "1"), video);
});

test("only offers distinct HLS URLs and supports different labels for the same feature film", () => {
  const main = stream("main");
  const backup = stream("backup");
  const video = parsePlaybackLines(`正片$${main}$$$HD中字$${backup}$$$副本$${main}$$$网页$https://example.test/watch`, "", "movie");
  assert.deepEqual(episodePlaybackLines(video, 0).map((line) => line.episodes[0]), [main, backup]);
  assert.deepEqual(episodePlaybackLines(parsePlaybackLines(`正片$${main}`, "", "movie"), 0).map((line) => line.name), ["线路 1"]);
});
