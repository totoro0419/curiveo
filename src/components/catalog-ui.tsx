import { useEffect, useState } from "react";
import { Search, ArrowRight, ChevronRight, BookOpen, Play, Check, ChevronDown, Sigma, Languages, FlaskConical, Atom, Landmark, Globe, Binary } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { catalog, subjectMap, unitMap, channelMap, roleLabels, videoMap, progress, time, videoHref } from "../catalog";
import type { Video, Series } from "../types";
import type { useLearning } from "../hooks/useLearning";
import { listKey, useViewState } from "../navigation/route";
export type Learning = ReturnType<typeof useLearning>;
export const icons: Record<string, LucideIcon> = {
  Sigma,
  Languages,
  FlaskConical,
  Atom,
  BookOpen,
  Landmark,
  Globe,
  Binary,
};
export function SearchBox({
  onSearch,
  initial = "",
  placeholder = "教科・単元・授業を検索",
}: {
  onSearch: (s: string) => void;
  initial?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(initial);
  useEffect(() => setQuery(initial), [initial]);
  return (
    <form
      className="search-box"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(query);
      }}
    >
      <Search size={19} />
      <input
        aria-label={placeholder}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      <button type="submit" className="icon-button" aria-label="検索する">
        <ArrowRight size={20} />
      </button>
    </form>
  );
}
export function SubjectTiles({ learning }: { learning: Learning }) {
  return (
    <div className="subject-grid">
      {catalog.subjects.map((s) => {
        const Icon = icons[s.icon] || BookOpen;
        const list = catalog.videos.filter((v) => v.subjectId === s.id);
        const p = progress(list, learning.records);
        return (
          <a className="subject-tile interactive-card" href={`#/subject/${s.id}`} key={s.id}>
            <span className="subject-icon" data-shared-icon={s.id}>
              <Icon size={25} strokeWidth={1.8} />
            </span>
            <div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <span className="small muted">
                {list.length.toLocaleString()}授業
                {p.completed ? ` · ${p.percent}% 学習済み` : ""}
              </span>
            </div>
            <ChevronRight className="tile-arrow" size={18} />
          </a>
        );
      })}
    </div>
  );
}
export function SectionHeading({
  title,
  link,
  label = "すべて見る",
}: {
  title: string;
  link?: string;
  label?: string;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {link && (
        <a href={link}>
          {label}
          <ChevronRight size={16} />
        </a>
      )}
    </div>
  );
}
export function Thumb({
  video,
  className = "",
}: {
  video: Video;
  className?: string;
}) {
  return (
    <img
      className={`thumbnail ${className}`}
      src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="strict-origin-when-cross-origin"
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}
export function VideoList({
  videos,
  learning,
  seriesId,
  empty = "該当する授業がありません。",
}: {
  videos: Video[];
  learning: Learning;
  seriesId?: string;
  empty?: string;
}) {
  const [limit, setLimit] = useViewState(`video-list:${seriesId || "all"}:${listKey(videos.map(v=>v.id))}`, 40);
  if (!videos.length)
    return (
      <div className="empty">
        <BookOpen />
        <h3>{empty}</h3>
        <p>教科や講座を選んで、学びたい授業を見つけましょう。</p>
        <a className="button" href="#/discover">
          授業を探す
          <ArrowRight size={16} />
        </a>
      </div>
    );
  return (
    <>
      <div className="video-list">
        {videos.slice(0, limit).map((v, i) => {
          const r = learning.get(v.id);
          return (
            <a href={videoHref(v, seriesId)} className="video-row" key={v.id}>
              <span
                className={`row-index ${r.status === "completed" ? "is-completed" : ""}`}
              >
                {r.status === "completed" ? (
                  <Check size={17} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <Thumb video={v} />
              <div className="video-info">
                <h3>{v.title}</h3>
                <p>
                  {subjectMap.get(v.subjectId)?.name} ·{" "}
                  {unitMap.get(v.unitIds[0])?.name}{" "}
                  <span className="channel-label">
                    · {channelMap.get(v.channelId)?.name}
                  </span>
                </p>
                <div className="row-meta">
                  {r.position > 0 && (
                    <span>
                      {time(r.position)}
                      {r.playbackEnded ? " · 再生終了" : " から再開"}
                    </span>
                  )}
                  {v.verification === "needs-review" && <span>分類確認中</span>}
                  {v.role !== "core" && <span>{roleLabels[v.role]}</span>}
                </div>
              </div>
              <ChevronRight size={18} />
            </a>
          );
        })}
      </div>
      {limit < videos.length && (
        <button
          className="button load-more"
          onClick={() => setLimit((n) => n + 40)}
        >
          さらに表示 ({Math.min(limit, videos.length)} / {videos.length})
          <ChevronDown size={16} />
        </button>
      )}
    </>
  );
}
export function ProgressBar({
  list,
  learning,
}: {
  list: Video[];
  learning: Learning;
}) {
  const p = progress(list, learning.records);
  return (
    <div className="progress-block">
      <div>
        <span>
          {p.completed} / {p.total}授業 学習済み
        </span>
        <strong>{p.percent}%</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={p.completed} aria-valuemin={0} aria-valuemax={Math.max(1,p.total)} aria-label="学習済みの割合"><span style={{transform:`scaleX(${p.percent/100})`}} /></div>
    </div>
  );
}
export function CourseList({
  courses,
  learning,
}: {
  courses: Series[];
  learning: Learning;
}) {
  if (!courses.length)
    return <p className="empty">収録済みの講座はありません。</p>;
  return (
    <div className="course-list">
      {courses.map((s) => {
        const list = s.videoIds.flatMap((id) =>
          videoMap.get(id) ? [videoMap.get(id)!] : [],
        );
        const p = progress(list, learning.records);
        return (
          <a href={`#/course/${s.id}`} className="course-row" key={s.id}>
            <span className="course-mark">
              <BookOpen size={23} />
            </span>
            <div>
              <p className="eyebrow">
                {subjectMap.get(s.subjectId)?.name} ·{" "}
                {channelMap.get(s.channelId)?.name}
              </p>
              <h3>{s.title}</h3>
              <p className="small muted">
                {s.videoIds.length}授業 · {s.level}
                {p.completed ? ` · ${p.completed}授業 学習済み` : ""}
              </p>
            </div>
            <ChevronRight size={19} />
          </a>
        );
      })}
    </div>
  );
}
