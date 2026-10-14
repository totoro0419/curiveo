import type { SubjectId } from "../types";

/** Era labels backed by the Historia Mundi source chapter order.
 * Do not infer periods from unrelated titles: unrecognized chapters stay ungrouped. */
const japaneseHistory = [
  { through: 5, label: "縄文・弥生〜平安中期" },
  { through: 9, label: "平安後期〜安土桃山" },
  { through: 12, label: "江戸時代" },
  { through: 16, label: "幕末・明治・大正" },
  { through: 19, label: "昭和・平成" },
  { through: 20, label: "近現代の文化" },
] as const;
const worldHistory = [
  { through: 3, label: "古代文明・地中海世界" },
  { through: 8, label: "アジア・イスラーム世界" },
  { through: 10, label: "中世ヨーロッパ" },
  { through: 12, label: "近世ヨーロッパ" },
  { through: 16, label: "近現代の欧米" },
  { through: 19, label: "近現代のアジア" },
  { through: 20, label: "戦後の世界" },
] as const;

export function historyPeriod(subjectId: SubjectId, chapter: number): string | undefined {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 20) return undefined;
  if (subjectId !== "japanese-history" && subjectId !== "world-history") return undefined;
  const periods = subjectId === "japanese-history" ? japaneseHistory : worldHistory;
  return periods.find((period) => chapter <= period.through)?.label;
}

/** Only officially numbered chapter units are eligible, never keyword guesses. */
export function historyPeriodFromUnit(subjectId: SubjectId, unitName: string): string | undefined {
  const chapter = Number(unitName.normalize("NFKC").match(/第\s*(\d+)\s*話/)?.[1]);
  return historyPeriod(subjectId, chapter);
}
