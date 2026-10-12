export type SubjectId =
  | "mathematics"
  | "english"
  | "chemistry"
  | "physics"
  | "japanese"
  | "japanese-history"
  | "world-history"
  | "information";
export type Role = "core" | "reinforcement" | "exam" | "advanced";
export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  description: string;
  icon: string;
}
export interface Channel {
  id: string;
  name: string;
  url: string;
  description: string;
}
export interface Unit {
  id: string;
  subjectId: SubjectId;
  level: string;
  field: string;
  name: string;
  order: number;
}
export interface Series {
  id: string;
  title: string;
  channelId: string;
  subjectId: SubjectId;
  level: string;
  sourceUrl: string;
  videoIds: string[];
  coverage: string;
}
export interface Video {
  id: string;
  title: string;
  channelId: string;
  subjectId: SubjectId;
  level: string;
  unitIds: string[];
  seriesIds: string[];
  order: number;
  role: Role;
  sourceUrl: string;
  verification: "verified" | "needs-review";
  curriculum: "current" | "legacy" | "mixed" | "unverified";
  durationSeconds: number | null;
  classificationEvidence: string;
  chapters?: { title: string; startSeconds: number }[];
}
export interface Catalog {
  schemaVersion: 1;
  updatedAt: string;
  mathveoSourceCommit: string;
  subjects: Subject[];
  channels: Channel[];
  units: Unit[];
  series: Series[];
  videos: Video[];
  gaps: { channelId: string; subjectId: string; reason: string }[];
}
export type LearningStatus = "unstarted" | "learning" | "completed";
export interface Video {
  uploaderName?: string;
  youtubeChannelId?: string;
}
export type Understanding = "unset" | "understood" | "unsure" | "review";
export interface NoteVersion {
  id: string;
  text: string;
  deviceId: string;
  updatedAt: number;
}
export interface LearningRecord {
  videoId: string;
  position: number;
  duration: number;
  playbackEnded: boolean;
  status: LearningStatus;
  understanding: Understanding;
  favorite: boolean;
  watchLater: boolean;
  review: boolean;
  note: string;
  noteVersions: NoteVersion[];
  lastViewedAt: number;
  updatedAt: number;
  deviceId: string;
  versions: Record<string, string>;
}
export type LearningPatch = Partial<
  Pick<
    LearningRecord,
    | "position"
    | "duration"
    | "playbackEnded"
    | "status"
    | "understanding"
    | "favorite"
    | "watchLater"
    | "review"
    | "note"
    | "lastViewedAt"
  >
>;
export const defaultRecord = (videoId: string): LearningRecord => ({
  videoId,
  position: 0,
  duration: 0,
  playbackEnded: false,
  status: "unstarted",
  understanding: "unset",
  favorite: false,
  watchLater: false,
  review: false,
  note: "",
  noteVersions: [],
  lastViewedAt: 0,
  updatedAt: 0,
  deviceId: "",
  versions: {},
});
