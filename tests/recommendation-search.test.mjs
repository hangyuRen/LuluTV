import test from "node:test";
import assert from "node:assert/strict";
import { searchRecommendedVideo } from "../src/lib/api/recommendationSearch.mjs";

const signal = () => new AbortController().signal;
const sources = ["a", "b"];
const video = (title, source, id = title, latencyMs = 10) => ({ title, source, id, latencyMs });

test("both keywords search every source concurrently and the original title wins", async () => {
  const title = "星河 第二季";
  const compact = "星河第二季";
  const calls = [];
  const matches = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const pending = searchRecommendedVideo({ title }, sources, async (query, source) => {
    calls.push([query, source]);
    if (query === compact) return { results: [video(compact, source)] };
    if (source === "b") await gate;
    return { results: source === "b" ? [video(title, source)] : [] };
  }, (match) => matches.push(match), signal());
  assert.deepEqual(calls, [[title, "a"], [title, "b"], [compact, "a"], [compact, "b"]]);
  await Promise.resolve();
  assert.deepEqual(matches, []);
  release();
  await pending;
  assert.deepEqual(matches, [video(title, "b")]);
});

test("compact matches are released in response order after the original keyword has no exact match", async () => {
  for (const [title, compact] of [["星河 第二季", "星河第二季"], ["星河　2", "星河2"], ["Iron Man 2", "Iron Man2"]]) {
    const matches = [];
    let releaseOriginal;
    let releaseCompact;
    const originalGate = new Promise((resolve) => { releaseOriginal = resolve; });
    const compactGate = new Promise((resolve) => { releaseCompact = resolve; });
    const pending = searchRecommendedVideo({ title }, sources, async (query, source) => {
      if (query === title) {
        if (source === "b") await originalGate;
        return { results: [video("别的影片", source)] };
      }
      assert.equal(query, compact);
      if (source === "a") await compactGate;
      return { results: [video(compact, source)] };
    }, (match) => matches.push(match), signal());
    await Promise.resolve();
    assert.deepEqual(matches, []);
    releaseOriginal();
    releaseCompact();
    assert.deepEqual(await pending, []);
    assert.deepEqual(matches, [video(compact, "b"), video(compact, "a")]);
  }
});

test("failed retries keep the manual list and unnumbered suffixes do not trigger a retry", async () => {
  const title = "星河 二";
  const related = video("星河第三季", "a");
  const manual = await searchRecommendedVideo({ title }, ["a"], async () => ({ results: [related] }), assert.fail, signal());
  assert.deepEqual(manual, [related]);
  const calls = [];
  await searchRecommendedVideo({ title: "Iron Man" }, ["a"], async (query) => {
    calls.push(query);
    return { results: [] };
  }, assert.fail, signal());
  assert.deepEqual(calls, ["Iron Man"]);
});
