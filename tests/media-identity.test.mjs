import test from "node:test";
import assert from "node:assert/strict";
import { findSwitchCandidate, groupSearchResults, matchesExactTitle, matchesSeriesInstallment, relatedInstallments, seriesInstallment } from "../src/lib/api/mediaIdentity.mjs";

test("switching sources selects the feature even when commentary shares its ID and comes first", () => {
  const feature = { title: "钢铁侠", type: "movie", type_name: "科幻片", year: "2008", douban_id: 1432146 };
  const tagged = { ...feature, title: "钢铁侠[电影解说]" };
  const categorized = { ...feature, type_name: "电影解说" };
  const sequel = { ...feature, title: "钢铁侠2" };
  const differentTitle = { ...feature, title: "无关影片" };
  const differentYear = { ...feature, year: "2010" };
  assert.equal(findSwitchCandidate(feature, [tagged, categorized, sequel, differentTitle, differentYear, feature]), feature);
  assert.equal(findSwitchCandidate(feature, [tagged, categorized, sequel, differentTitle, differentYear]), undefined);
  assert.equal(findSwitchCandidate(tagged, [feature, tagged]), tagged);
  assert.equal(matchesExactTitle(feature, categorized), false);
});

test("switching sources prefers the exact title while still allowing equivalent season names", () => {
  const current = { title: "星河第二季", type: "tv", year: "2025" };
  const alias = { title: "星河2", type: "tv", year: "2025" };
  const exact = { title: "星河第二季", type: "tv", year: "unknown" };
  assert.equal(findSwitchCandidate(current, [alias, exact]), exact);
  assert.equal(findSwitchCandidate(current, [alias]), alias);
});

test("search results put exact titles first and preserve return order within each group", () => {
  const results = ["星际纪事", "星河 第三季", "银河篇", "星河", "星河 第二季", "星 空河", "星河"].map((title, id) => ({ title, id }));
  const { matching, related } = groupSearchResults(results, " 星河 ");
  assert.deepEqual(matching.map(({ id }) => id), [3, 6, 1, 4]);
  assert.deepEqual(related.map(({ id }) => id), [0, 2, 5]);
  assert.deepEqual(groupSearchResults(results, "不存在"), { matching: [], related: results });
});

test("autoplay requires the displayed title, with no punctuation or alias substitution", () => {
  const reference = { title: "星河：第二季", originalTitle: "Galaxy", type: "tv", year: "2026", douban_id: 10 };
  assert.equal(matchesExactTitle(reference, { title: "星河：第二季", type: "tv", year: "2026" }), true);
  assert.equal(matchesExactTitle(reference, { title: "星河:第二季", douban_id: 10 }), false);
  assert.equal(matchesExactTitle(reference, { title: "Galaxy", douban_id: 10 }), false);
  assert.equal(matchesExactTitle(reference, { title: "星河：第二季", year: "2024" }), false);
  assert.equal(matchesExactTitle(reference, { title: "星河：第二季", douban_id: 11 }), false);
});

test("numbered titles and explicit seasons identify the same installment", () => {
  for (const title of ["星河2", "星河：2", "星河：第２季", "星河第二季", "星河 第两部", "星河 S02", "星河 Season 2"]) {
    assert.deepEqual(seriesInstallment(title), { series: "星河", key: "星河", number: 2 });
  }
  assert.equal(seriesInstallment("星河第十一季").number, 11);
  assert.equal(seriesInstallment("星河2026").series, "星河2026");
  assert.equal(matchesSeriesInstallment({ title: "星河：第一季" }, { title: "星河" }), true);
  assert.equal(matchesSeriesInstallment({ title: "星河：第一季" }, { title: "星河2" }), false);
});

test("related seasons exclude the current and unrelated titles and prefer current sources", () => {
  const current = { title: "星河：第三季", source: "a", type: "tv" };
  const item = (title, source, latencyMs, type = "tv") => ({ title, source, latencyMs, type });
  const results = [
    item("星河3", "b", 10),
    item("星河往事4", "b", 10),
    item("星河4", "a", 1, "movie"),
    item("星河2", "b", 20),
    item("星河：第二季", "a", 240),
    item("星河", "b", 35),
    item("星河：第一季", "c", 15),
    item("星河第五季", "b", 25),
    item("星河六", "b", 9),
  ];
  assert.deepEqual(relatedInstallments(current, results).map(({ title, source }) => [title, source]), [
    ["星河：第二季", "a"],
    ["星河：第一季", "c"],
    ["星河第五季", "b"],
  ]);
  assert.equal(relatedInstallments(current, Array.from({ length: 12 }, (_, index) => item(`星河第${index + 1}季`, "b", index))).length, 8);
});

test("related seasons fill the available slots in season order regardless of source latency", () => {
  const current = { title: "星河：第一季", source: "a" };
  const results = [
    { title: "星河7", source: "b", latencyMs: 5 },
    { title: "星河6", source: "c", latencyMs: 10 },
    { title: "星河4", source: "b", latencyMs: 400 },
    { title: "星河：第四季", source: "c", latencyMs: 300 },
    { title: "星河5", source: "b", latencyMs: 500 },
    { title: "星河3", source: "a", latencyMs: 100 },
    { title: "星河2", source: "a", latencyMs: 600 },
    { title: "星河：第二季", source: "b", latencyMs: 5 },
    { title: "星河8", source: "b", latencyMs: 10 },
    { title: "星河9", source: "b", latencyMs: 20 },
    { title: "星河10", source: "b", latencyMs: 1 },
  ];
  assert.deepEqual(relatedInstallments(current, results).map(({ title, source }) => [seriesInstallment(title).number, source]), [
    [2, "a"], [3, "a"], [4, "c"], [5, "b"], [6, "c"], [7, "b"], [8, "b"], [9, "b"],
  ]);
});
