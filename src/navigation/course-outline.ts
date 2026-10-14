import { unitMap, videoMap } from "../catalog";
import { learningNodes } from "./hierarchy";
import type { LearningNode } from "./hierarchy";
import type { Series, Unit, Video } from "../types";
import { historyPeriodForVideo } from "./history-periods";

export interface CourseChapter {
  id: string;
  title: string;
  videoIds: string[];
}

const normalize = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();
const titleTopics = new Map<string, LearningNode[]>();
for (const node of learningNodes.values()) {
  // Chapter timestamps are entries inside one video, not additional course lessons.
  if (node.kind !== "topic" || node.targets?.length) continue;
  for (const videoId of node.videoIds) {
    const topics = titleTopics.get(videoId) ?? [];
    topics.push(node);
    titleTopics.set(videoId, topics);
  }
}

function sourceUnit(series: Series, video: Video): Unit | undefined {
  const title = normalize(video.title);
  const candidates = video.unitIds.map(id => unitMap.get(id)).filter((u): u is Unit => !!u && u.subjectId === series.subjectId);
  // Source chapters must win over secondary audit/theme tags for the two
  // Historia Mundi courses. Otherwise a "文化史" tag can hijack an era.
  if (series.id === "mundi-japan" || series.id === "mundi-world") {
    const chapterNumber = Number(title.match(/第\s*0*(\d+)\s*話/)?.[1]);
    const chapterUnit = candidates.find(unit =>
      Number(normalize(unit.name).match(/第\s*0*(\d+)\s*話/)?.[1]) === chapterNumber &&
      chapterNumber >= 1 && chapterNumber <= 20,
    );
    if (chapterUnit) return chapterUnit;
  }
  const isReview = /総復習|総集編/.test(series.title);
  const score = (unit: Unit) => {
    const name = normalize(unit.name);
    // Exact Mathveo unit/playlist references disambiguate duplicated review videos.
    const direct = !isReview && unit.id === `math-${series.id}` ? 4 : 0;
    // Review compilations retain each lesson's existing original learning unit.
    const titleMatch = name.length > 1 && title.includes(name) ? 3 : 0;
    const seriesMatch = normalize(series.title).includes(name) ? 1 : 0;
    return direct + titleMatch + seriesMatch + (unit.path?.length ? 2 : 0);
  };
  return candidates.sort((a, b) => score(b) - score(a) || a.order - b.order)[0];
}

function runs(series: Series, labels: { key: string; title: string }[]): CourseChapter[] {
  const chapters: CourseChapter[] = [];
  for (let index = 0; index < series.videoIds.length; index++) {
    const label = labels[index];
    const previous = index ? labels[index - 1] : undefined;
    if (!previous || previous.key !== label.key) {
      // Position makes repeated units separate, stable chapters instead of merging runs.
      chapters.push({ id: `${series.id}-chapter-${index}`, title: label.title, videoIds: [] });
    }
    chapters[chapters.length - 1].videoIds.push(series.videoIds[index]);
  }
  return chapters;
}

/** Builds an outline only from the existing ordered series references.
 * A run never crosses another unit and the flattened result always preserves videoIds exactly.
 * Titles are catalogue labels, not claims about content equivalence or lecture quality. */
export function courseOutline(series: Series): CourseChapter[] {
  if (!series.videoIds.length) return [];
  const fallback = (): CourseChapter[] => [{ id: `${series.id}-chapter-0`, title: "授業一覧", videoIds: [...series.videoIds] }];
  const videos = series.videoIds.map(id => videoMap.get(id));
  if (videos.some(v => !v)) return fallback();
  const units = videos.map(v => sourceUnit(series, v!));
  if (units.some(u => !u)) return fallback();
  const names = units.map(u => normalize(u!.name));

  // History courses should have chronological eras, not one disclosure per
  // numbered episode. Only group when every source chapter can be verified.
  if (series.subjectId === "japanese-history" || series.subjectId === "world-history") {
    const periods = units.map((unit, index) => historyPeriodForVideo(series.subjectId, videos[index]!, unit!.name));
    if (periods.every((period): period is string => !!period)) {
      return runs(series, periods.map(period => ({ key: `history-era:${period}`, title: period })));
    }
  }

  // Different level-specific unit IDs with the same canonical unit name (e.g. 力学)
  // remain one learning unit; provider/grade selection belongs outside this outline.
  if (new Set(names).size > 1) {
    return runs(series, units.map(u => ({ key: normalize(u!.name), title: u!.name })));
  }

  if (videos.length < 6) return fallback();
  const membership = new Set(series.videoIds);
  const candidates = new Map<string, LearningNode>();
  for (const video of videos) {
    for (const node of titleTopics.get(video!.id) ?? []) {
      if (node.subjectId !== series.subjectId || node.title.length > 45) continue;
      const matching = node.videoIds.filter(id => membership.has(id));
      // Only repeated titles within this course qualify; singleton labels add no useful grouping.
      if (matching.length < 2 || !matching.every(id => normalize(videoMap.get(id)!.title).includes(normalize(node.title)))) continue;
      if (!node.sourceUnitIds.some(id => units.some(u => u!.id === id))) continue;
      candidates.set(node.id, node);
    }
  }
  const labels = videos.map(video => {
    const nodes = (titleTopics.get(video!.id) ?? []).filter(n => candidates.has(n.id));
    nodes.sort((a, b) => b.title.length - a.title.length || a.id.localeCompare(b.id));
    const node = nodes[0];
    return node ? { key: `topic:${normalize(node.title)}`, title: node.title } : { key: "lessons", title: "授業一覧" };
  });
  const sections = runs(series, labels);
  const topicSections = sections.filter(section => section.title !== "授業一覧" && section.videoIds.length >= 2);
  const covered = topicSections.reduce((count, section) => count + section.videoIds.length, 0);
  // Fragmentary topic coverage is less useful than the source's complete lesson list.
  if (topicSections.length < 2 || covered < series.videoIds.length * 0.6) return fallback();
  return sections;
}
