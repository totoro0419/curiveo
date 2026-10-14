import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const text = readFileSync("src/navigation/history-periods.ts", "utf8");
const compiled = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { historyPeriod, historyPeriodFromUnit } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));

for (const [subjectId, chapter, expected] of [
  ["japanese-history", 1, "縄文・弥生〜平安中期"],
  ["japanese-history", 5, "縄文・弥生〜平安中期"],
  ["japanese-history", 6, "平安後期〜安土桃山"],
  ["japanese-history", 9, "平安後期〜安土桃山"],
  ["japanese-history", 10, "江戸時代"],
  ["japanese-history", 13, "幕末・明治・大正"],
  ["japanese-history", 17, "昭和・平成"],
  ["japanese-history", 20, "近現代の文化"],
  ["world-history", 1, "古代文明・地中海世界"],
  ["world-history", 4, "アジア・イスラーム世界"],
  ["world-history", 9, "中世ヨーロッパ"],
  ["world-history", 11, "近世ヨーロッパ"],
  ["world-history", 13, "近現代の欧米"],
  ["world-history", 17, "近現代のアジア"],
  ["world-history", 20, "戦後の世界"],
]) {
  assert.equal(historyPeriod(subjectId, chapter), expected, `${subjectId} chapter ${chapter}`);
}
assert.equal(historyPeriodFromUnit("world-history", "第２０話 戦後の世界"), "戦後の世界");
assert.equal(historyPeriodFromUnit("japanese-history", "第1話 原始"), "縄文・弥生〜平安中期");
assert.equal(historyPeriodFromUnit("world-history", "歴史総合・世界史"), undefined);
for (const chapter of [-1, 0, 21, 42, 1.5, NaN]) {
  assert.equal(historyPeriod("japanese-history", chapter), undefined);
}
assert.equal(historyPeriod("mathematics", 1), undefined);

const catalog = JSON.parse(readFileSync("src/data/catalog.json", "utf8"));
const videos = new Map(catalog.videos.map(video => [video.id, video]));
const units = new Map(catalog.units.map(unit => [unit.id, unit]));
const historySubjects = ["japanese-history", "world-history"];
const info = [];
for (const subjectId of historySubjects) {
  const series = catalog.series.filter(series => series.subjectId === subjectId);
  assert.ok(series.length > 0, `No catalog series for ${subjectId}`);
  const supported = series.filter(course => course.videoIds.every(id => {
    const video = videos.get(id);
    return video.unitIds.some(unitId => {
      const unit = units.get(unitId);
      return unit?.subjectId === subjectId && historyPeriodFromUnit(subjectId, unit.name);
    });
  }));
  info.push({ subjectId, series: series.length, eraReady: supported.length });
  assert.ok(supported.length > 0, `No source-supported era-groupable course for ${subjectId}`);
  for (const course of supported) {
    const labels = course.videoIds.map(id => {
      const video = videos.get(id);
      const unit = video.unitIds.map(uid => units.get(uid))
        .find(unit => unit?.subjectId === subjectId && historyPeriodFromUnit(subjectId, unit.name));
      return historyPeriodFromUnit(subjectId, unit.name);
    });
    const runs = [];
    for (const [index, label] of labels.entries()) {
      if (index === 0 || labels[index - 1] !== label) runs.push([]);
      runs[runs.length - 1].push(course.videoIds[index]);
    }
    assert.deepEqual(runs.flat(), course.videoIds, "Era grouping must preserve canonical lesson order and IDs");
  }
}
const hierarchy = readFileSync("src/pages/HierarchyPage.tsx", "utf8");
assert.ok(hierarchy.includes("label:'時代から探す'"), "History navigation must show era-first entry");
assert.ok(hierarchy.includes("historySubject?'topics':'courses'"), "History must default to era browsing");
assert.ok(hierarchy.includes('meta={durationSummary(videos,learning.records)}'), "Group durations should be on outline headers");
assert.ok(hierarchy.includes('className="group-duration"'), "Era and unit cards must show total duration");
const disclosure = readFileSync("src/components/Disclosure.tsx", "utf8");
assert.ok(disclosure.includes('className="disclosure-meta"'), "Expandable group headings must show duration");
console.log("History era and duration regression tests passed:", info);
