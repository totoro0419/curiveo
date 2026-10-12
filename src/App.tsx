import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import {
  Home,
  Search,
  Library,
  Settings,
  ArrowRight,
  ArrowLeft,
  Play,
  Heart,
  Clock,
  Check,
  ChevronRight,
  ChevronDown,
  Download,
  Upload,
  Cloud,
  Monitor,
  LogIn,
  LogOut,
  WifiOff,
  Bookmark,
  RotateCcw,
  Sigma,
  Languages,
  FlaskConical,
  Atom,
  BookOpen,
  Landmark,
  Globe,
  Binary,
  ExternalLink,
  CheckCircle2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  catalog,
  videoMap,
  seriesMap,
  unitMap,
  subjectMap,
  channelMap,
  roleLabels,
  statusLabels,
  searchVideos,
  progress,
  time,
  videoHref,
} from "./catalog";
import type { Video, SubjectId, Series, LearningPatch } from "./types";
import { useLearning } from "./hooks/useLearning";
import { YouTubePlayer } from "./components/YouTubePlayer";
import { SearchBox, SubjectTiles, SectionHeading, Thumb, VideoList, ProgressBar, CourseList, icons } from "./components/catalog-ui";
import { go, useRoute, useViewState } from "./navigation/route";
import { useInteractionMotion, usePageMotion } from "./lib/motion";
import { Disclosure } from "./components/Disclosure";
import { SectionTabs } from "./components/SectionTabs";
import { usePwa } from "./hooks/usePwa";
import { registerUpdateGuard } from "./lib/pwa";
const HierarchyPage = lazy(()=>import("./pages/HierarchyPage"));
const CollectionPage = lazy(()=>import("./pages/HierarchyPage").then(module=>({default:module.CollectionPage})));
const WatchTrail = lazy(()=>import("./pages/HierarchyPage").then(module=>({default:module.WatchTrail})));
type Learning = ReturnType<typeof useLearning>;
const navItems = [
  { path: "/", label: "ホーム", icon: Home },
  { path: "/discover", label: "探す", icon: Search },
  { path: "/library", label: "マイライブラリ", icon: Library },
];
function HomePage({ learning }: { learning: Learning }) {
  const recent = Object.values(learning.records)
    .filter((r) => r.lastViewedAt > 0 && videoMap.has(r.videoId))
    .sort((a, b) => b.lastViewedAt - a.lastViewedAt);
  const resume =
    recent.find((r) => r.status !== "completed" && !r.playbackEnded) ||
    recent[0];
  const v = resume && videoMap.get(resume.videoId);
  const recentSeries = [
    ...new Set(recent.flatMap((r) => videoMap.get(r.videoId)?.seriesIds || [])),
  ]
    .slice(0, 3)
    .flatMap((id) => (seriesMap.get(id) ? [seriesMap.get(id)!] : []));
  const reviews = catalog.videos.filter(
    (v) =>
      learning.records[v.id]?.review ||
      learning.records[v.id]?.understanding === "review",
  );
  return (
    <>
      <header className="page-heading home-heading">
        <p className="eyebrow">YOUR LEARNING, CONNECTED</p>
        <h1>{v ? "今日も、続きから。" : "学びたいことから、はじめよう。"}</h1>
        <p>授業を見つける。理解をつなぐ。自分のペースで進める。</p>
      </header>
      {v && (
        <a className="resume-panel" href={videoHref(v)}>
          <div className="resume-copy">
            <span className="eyebrow">続きから学ぶ</span>
            <h2>{v.title}</h2>
            <p>
              {subjectMap.get(v.subjectId)?.name} ·{" "}
              {unitMap.get(v.unitIds[0])?.name}
            </p>
            <span className="resume-action">
              <Play size={16} fill="currentColor" />
              {resume.playbackEnded
                ? "もう一度見る"
                : `${time(resume.position)} から再開`}
            </span>
          </div>
          <Thumb video={v} />
        </a>
      )}
      <SearchBox onSearch={(q) => go(`/discover?q=${encodeURIComponent(q)}`)} />
      <section className="section">
        <SectionHeading title={v ? "教科から学ぶ" : "何を学びますか？"} />
        <SubjectTiles learning={learning} />
      </section>
      {recentSeries.length > 0 && (
        <section className="section">
          <SectionHeading title="最近の講座" link="#/library?tab=history" />
          <CourseList courses={recentSeries} learning={learning} />
        </section>
      )}
      {reviews.length > 0 && (
        <a className="review-banner" href="#/library?tab=review">
          <RotateCcw size={20} />
          <span>
            <strong>復習に戻る</strong>
            <span>{reviews.length}授業を復習リストに登録しています</span>
          </span>
          <ArrowRight size={19} />
        </a>
      )}
    </>
  );
}
function DiscoverPage({
  learning,
  params,
}: {
  learning: Learning;
  params: URLSearchParams;
}) {
  const [mode, setMode] = useViewState("discover-mode", params.get("q") ? "search" : "subjects");
  const [query, setQuery] = useViewState("discover-query",params.get("q") || "");
  const [subject, setSubject] = useViewState("discover-subject","all");
  const [channel,setChannel]=useViewState("discover-channel","all");
  const [role, setRole] = useViewState("discover-role","all");
  const [status, setStatus] = useViewState("discover-status","all");
  useEffect(() => {
    setQuery(params.get("q") || "");
    if (params.get("q")) setMode("search");
  }, [params.get("q")]);
  const list = useMemo(
    () =>
      searchVideos(query).filter(
        (v) =>
          (subject === "all" || v.subjectId === subject) &&
          (channel === "all" || v.channelId === channel) &&
          (role === "all" || v.role === role) &&
          (status === "all" || learning.get(v.id).status === status),
      ),
    [query, subject, channel, role, status, learning.records],
  );
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">FIND YOUR NEXT LESSON</p>
        <h1>探す</h1>
        <p>教科から。講座から。気になる言葉から。</p>
      </header>
      <SearchBox
        initial={query}
        onSearch={(q) => {
          setQuery(q);
          setMode("search");
          go(`/discover?q=${encodeURIComponent(q)}`);
        }}
      />
      <SectionTabs items={[{id:"subjects",label:"教科"},{id:"courses",label:"講座"},{id:"channels",label:"チャンネル"},...(mode==="search"?[{id:"search",label:"検索結果"}]:[])]} value={mode} onChange={setMode}/>
      <div id="discovery-panel" role="tabpanel" aria-labelledby={`discovery-panel-${mode}`} aria-label={mode==="search"?"検索結果":mode==="courses"?"講座":mode==="channels"?"チャンネル":"教科"} className="results-enter" key={mode}>
      {mode === "subjects" ? (
        <SubjectTiles learning={learning} />
      ) : mode === "courses" ? (
        <>
          <label className="filter-label">
            教科
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="all">すべての教科</option>
              {catalog.subjects.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {subject === "all" ? <><p className="section-intro">教科を選ぶと、チャンネル別の講座を表示します。</p><SubjectTiles learning={learning}/></> : catalog.channels.filter(channel=>catalog.series.some(series=>series.subjectId===subject&&series.channelId===channel.id)).map((channel,index)=><Disclosure key={channel.id} stateKey={`discover-channel:${channel.id}`} title={channel.name} defaultOpen={index===0}><CourseList courses={catalog.series.filter(series=>series.subjectId===subject&&series.channelId===channel.id)} learning={learning}/></Disclosure>)}
        </>
      ) : mode === "channels" ? (
        <div className="course-list">
          {catalog.channels.map((c) => {
            const count = catalog.videos.filter(
              (v) => v.channelId === c.id,
            ).length;
            return (
              <a className="course-row" href={`#/channel/${c.id}`} key={c.id}>
                <span className="course-mark">
                  <Play size={22} />
                </span>
                <div>
                  <h3>{c.name}</h3>
                  <p>{c.description}</p>
                  <span className="small muted">{count}授業</span>
                </div>
                <ChevronRight size={19} />
              </a>
            );
          })}
        </div>
      ) : (
        <>
          <div className="search-results-heading">
            <h2>
              {query ? `「${query}」` : "すべての授業"}
              <span>{list.length}件</span>
            </h2>
            <details className="filters">
              <summary>絞り込み</summary>
              <div className="filter-fields">
                <label>
                  教科
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="all">すべて</option>
                    {catalog.subjects.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  チャンネル
                  <select value={channel} onChange={event=>setChannel(event.target.value)}><option value="all">すべて</option>{catalog.channels.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
                </label>
                <label>
                  授業の種類
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="all">すべて</option>
                    {Object.entries(roleLabels).map(([id, label]) => (
                      <option value={id} key={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  学習状態
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">すべて</option>
                    {Object.entries(statusLabels).map(([id, label]) => (
                      <option value={id} key={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
          </div>
          <VideoList videos={list} learning={learning} />
        </>
      )}
      </div>
    </>
  );
}
function LibraryPage({
  learning,
  params,
}: {
  learning: Learning;
  params: URLSearchParams;
}) {
  const tab = params.get("tab") || "continue";
  const entries = catalog.videos
    .filter((v) => {
      const r = learning.records[v.id];
      if (!r) return false;
      return tab === "continue"
        ? r.lastViewedAt > 0 && !r.playbackEnded && r.status !== "completed"
        : tab === "favorite"
          ? r.favorite
          : tab === "later"
            ? r.watchLater
            : tab === "review"
              ? r.review || r.understanding === "review"
              : r.lastViewedAt > 0;
    })
    .sort(
      (a, b) =>
        (learning.records[b.id]?.lastViewedAt ||
          learning.records[b.id]?.updatedAt ||
          0) -
        (learning.records[a.id]?.lastViewedAt ||
          learning.records[a.id]?.updatedAt ||
          0),
    );
  return (
    <>
      <header className="page-heading title-action">
        <div>
          <p className="eyebrow">YOUR LEARNING SPACE</p>
          <h1>マイライブラリ</h1>
          <p>続きから、好きな授業から、もう一度。</p>
        </div>
        <a
          href="#/settings"
          className="icon-button"
          aria-label="設定・同期・バックアップ"
        >
          <Settings size={22} />
        </a>
      </header>
      <div className="chips library-tabs">
        {[
          ["continue", "続きから"],
          ["later", "後で見る"],
          ["favorite", "お気に入り"],
          ["history", "視聴履歴"],
          ["review", "復習"],
          ["progress", "学習進捗"],
        ].map(([id, label]) => (
          <a
            key={id}
            className={tab === id ? "selected" : ""}
            href={`#/library?tab=${id}`}
            aria-current={tab === id ? "page" : undefined}
          >
            {label}
          </a>
        ))}
      </div>
      {tab === "progress" ? (
        <div className="progress-list">
          {catalog.subjects.map((s) => (
            <section key={s.id}>
              <a className="section-heading" href={`#/subject/${s.id}`}>
                <h2>{s.name}</h2>
                <ChevronRight size={18} />
              </a>
              <ProgressBar
                list={catalog.videos.filter((v) => v.subjectId === s.id)}
                learning={learning}
              />
            </section>
          ))}
        </div>
      ) : (
        <VideoList
          videos={entries}
          learning={learning}
          empty={
            tab === "history"
              ? "まだ視聴履歴がありません。"
              : tab === "continue"
                ? "続きから見る授業はありません。"
                : tab === "favorite"
                  ? "お気に入りをここに。"
                  : tab === "review"
                    ? "復習する授業はまだありません。"
                    : "後で見たい授業をここに。"
          }
        />
      )}
      <a className="settings-link" href="#/settings">
        <Cloud size={17} />
        <span>{learning.syncState}</span>
        <span>
          設定・バックアップ
          <ChevronRight size={16} />
        </span>
      </a>
    </>
  );
}
function NoteEditor({ video, learning }: { video: Video; learning: Learning }) {
  const record = learning.get(video.id);
  const [draft, setDraft] = useState(record.note);
  const draftRef = useRef(draft);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending=useRef<Promise<void>|null>(null);
  const commitRef = useRef<() => Promise<void>>(() => Promise.resolve());
  commitRef.current = async () => {
    if (timer.current) clearTimeout(timer.current);
    if(pending.current)await pending.current;
    if (!dirty.current) return;
    const value = draftRef.current;
    setSaving(true);
    const request=learning.save(video.id,{note:value});pending.current=request;
    try{await request;if(draftRef.current===value)dirty.current=false;setError("");}
    catch(e){setError(e instanceof Error?e.message:String(e));throw e;}
    finally{pending.current=null;setSaving(false);}
  };
  useEffect(()=>registerUpdateGuard(()=>commitRef.current()),[video.id]);
  useEffect(() => {
    if (!dirty.current) {
      setDraft(record.note);
      draftRef.current = record.note;
    }
  }, [record.note]);
  useEffect(() => {
    const flush = () => {void commitRef.current().catch(()=>{});};
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [video.id]);
  return (
    <section className="notes">
      <div className="section-heading">
        <h2>授業メモ</h2>
        <span className="small muted" role="status">
          {error
            ? "保存に失敗"
            : saving
              ? "保存中…"
              : dirty.current
                ? "保存待ち"
                : "自動保存"}
        </span>
      </div>
      <textarea
        aria-label="授業メモ"
        disabled={!learning.ready}
        value={draft}
        placeholder="わかったこと、あとで確かめたいこと。"
        onChange={(e) => {
          dirty.current = true;
          draftRef.current = e.target.value;
          setDraft(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {void commitRef.current().catch(()=>{});}, 700);
        }}
        onBlur={() => {void commitRef.current().catch(()=>{});}}
      />
      {error && (
        <div className="notice error">
          {error}
          <button className="button" onClick={() => {void commitRef.current().catch(()=>{});}}>
            再試行
          </button>
        </div>
      )}
      {record.noteVersions?.length > 0 && (
        <details className="note-versions">
          <summary>
            保存されたメモの別の版 ({record.noteVersions.length})
          </summary>
          {record.noteVersions.map((n) => (
            <div key={n.id}>
              <time>{new Date(n.updatedAt).toLocaleString("ja-JP")}</time>
              <p>{n.text || "（空のメモ）"}</p>
              <button
                className="button secondary"
                onClick={() => {
                  dirty.current = true;
                  draftRef.current = n.text;
                  setDraft(n.text);
                  void commitRef.current().catch(()=>{});
                }}
              >
                この内容を使う
              </button>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
function WatchPage({
  id,
  params,
  learning,
}: {
  id: string;
  params: URLSearchParams;
  learning: Learning;
}) {
  const v = videoMap.get(id);
  const [seek, setSeek] = useState<number | undefined>(()=>{const value=params.get("t");return value!==null&&Number.isFinite(Number(value))?Math.max(0,Number(value)):undefined;});
  const [seekNonce,setSeekNonce]=useState(0);
  const [episodePage,setEpisodePage]=useViewState("episode-page",Math.floor(Math.max(0,(seriesMap.get(params.get("series") || videoMap.get(id)?.seriesIds[0] || "")?.videoIds.indexOf(id)||0))/30));
  useEffect(()=>{const value=params.get("t");if(value!==null&&Number.isFinite(Number(value))){setSeek(Math.max(0,Number(value)));setSeekNonce(n=>n+1);}},[params.get("t")]);
  const [actionError, setActionError] = useState("");
  if (!v) return <NotFound />;
  const r = learning.get(id);
  const series = seriesMap.get(params.get("series") || v.seriesIds[0]);
  const sequence =
    series?.videoIds ||
    catalog.videos
      .filter((x) => x.unitIds.some((id) => v.unitIds.includes(id)))
      .sort((a, b) => a.order - b.order)
      .map((x) => x.id);
  const index = sequence.indexOf(id);
  const previous = videoMap.get(sequence[index - 1]),
    next = videoMap.get(sequence[index + 1]);
  const save = (patch: LearningPatch) =>
    learning
      .save(id, patch)
      .catch((e) => setActionError(String(e.message || e)));
  return (
    <>
      <a
        className="back-link"
        href={series ? `#/course/${series.id}` : `#/subject/${v.subjectId}`}
      >
        <ArrowLeft size={17} />
        {series?.title || subjectMap.get(v.subjectId)?.name}
      </a>
      <Suspense fallback={null}><WatchTrail video={v} seriesId={series?.id}/></Suspense>
      <div className="watch-layout">
        <div className="watch-main">
          {learning.ready ? (
            <YouTubePlayer
              key={id}
              video={v}
              record={r}
              save={learning.save}
              initialSeek={seek}
              seekNonce={seekNonce}
            />
          ) : (
            <div className="player-placeholder">
              学習記録を読み込んでいます…
            </div>
          )}
          <div className="lesson-heading">
            <p className="eyebrow">
              {subjectMap.get(v.subjectId)?.name} ·{" "}
              {unitMap.get(v.unitIds[0])?.name}
            </p>
            <h1>{v.title}</h1>
            <a className="muted text-link" href={`#/channel/${v.channelId}`}>
              {v.uploaderName || channelMap.get(v.channelId)?.name}
              <ChevronRight size={14} />
            </a>
          </div>
          <div className="lesson-actions" aria-busy={!learning.ready}>
            <button
              disabled={!learning.ready}
              className={`button ${r.status === "completed" ? "completed" : "primary"}`}
              onClick={() =>
                save({
                  status: r.status === "completed" ? "learning" : "completed",
                })
              }
              aria-pressed={r.status === "completed"}
            >
              <CheckCircle2 size={18} />
              {r.status === "completed" ? "学習済み" : "学習済みにする"}
            </button>
            <button
              className="icon-button"
              disabled={!learning.ready}
              onClick={() => save({ favorite: !r.favorite })}
              aria-label={r.favorite ? "お気に入りを解除" : "お気に入りに登録"}
              aria-pressed={r.favorite}
            >
              <Heart size={22} fill={r.favorite ? "currentColor" : "none"} />
            </button>
            <button
              className="icon-button"
              disabled={!learning.ready}
              onClick={() => save({ watchLater: !r.watchLater })}
              aria-label={r.watchLater ? "後で見るから解除" : "後で見るに登録"}
              aria-pressed={r.watchLater}
            >
              <Bookmark
                size={22}
                fill={r.watchLater ? "currentColor" : "none"}
              />
            </button>
          </div>
          <div className="understanding-row">
            <label>
              理解度
              <select
                disabled={!learning.ready}
                value={r.understanding}
                onChange={(e) =>
                  save({
                    understanding: e.target.value as typeof r.understanding,
                  })
                }
              >
                <option value="unset">まだ記録しない</option>
                <option value="understood">理解できた</option>
                <option value="unsure">少し不安</option>
                <option value="review">要復習</option>
              </select>
            </label>
            <button
              className="text-button"
              disabled={!learning.ready}
              aria-pressed={r.review}
              onClick={() => save({ review: !r.review })}
            >
              <RotateCcw size={17} />
              {r.review ? "復習リストに登録済み" : "復習リストに追加"}
            </button>
          </div>
          {r.playbackEnded && (
            <p className="small muted">
              最後まで再生しました。学習状態と理解度は、ご自身で記録できます。
            </p>
          )}
          {actionError && <p className="notice error">{actionError}</p>}
          <nav className="lesson-navigation" aria-label="前後の授業">
            {previous ? (
              <a href={videoHref(previous, series?.id)}>
                <ArrowLeft size={18} />
                <span>
                  <small>前の授業</small>
                  {previous.title}
                </span>
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a href={videoHref(next, series?.id)}>
                <span>
                  <small>次の授業</small>
                  {next.title}
                </span>
                <ArrowRight size={18} />
              </a>
            ) : (
              <span />
            )}
          </nav>
          {v.chapters?.length && (
            <details className="chapters">
              <summary>単元へジャンプ ({v.chapters.length})</summary>
              <div>
                {v.chapters.map((c, i) => (
                  <button
                    key={`${c.startSeconds}-${i}`}
                    onClick={() => {setSeek(c.startSeconds);setSeekNonce(n=>n+1);}}
                  >
                    <span>{time(c.startSeconds)}</span>
                    {c.title}
                  </button>
                ))}
              </div>
            </details>
          )}
          <NoteEditor key={id} video={v} learning={learning} />
          <details className="coverage">
            <summary>動画情報・出典</summary>
            <p>
              {v.level} · {roleLabels[v.role]} ·{" "}
              {v.curriculum === "mixed"
                ? "旧課程表記を含む講座"
                : v.curriculum === "legacy"
                  ? "旧課程の講座"
                  : v.curriculum === "current"
                    ? "現行課程"
                    : "課程年度未確認"}
            </p>
            <p>{v.classificationEvidence}</p>
            <a
              className="text-link"
              href={v.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              収録元を確認
              <ExternalLink size={14} />
            </a>
            <a
              className="text-link"
              href={`https://www.youtube.com/watch?v=${v.id}`}
              target="_blank"
              rel="noreferrer"
            >
              YouTubeで開く
              <ExternalLink size={14} />
            </a>
          </details>
        </div>
        <aside className="watch-sidebar">
          <div className="section-heading">
            <h2>{series ? "この講座の授業" : "関連する授業"}</h2>
            <span className="small muted">
              {index + 1} / {sequence.length}
            </span>
          </div>
          <div className="episode-list">
            {sequence.slice(episodePage*30,(episodePage+1)*30).map((videoId, offset) => {
              const i=episodePage*30+offset;
              const episode = videoMap.get(videoId);
              if (!episode) return null;
              const done = learning.records[videoId]?.status === "completed";
              return (
                <a
                  href={videoHref(episode, series?.id)}
                  key={videoId}
                  aria-current={videoId === id ? "page" : undefined}
                  className={videoId === id ? "active" : ""}
                >
                  <span>
                    {done ? (
                      <Check size={16} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <span>{episode.title}</span>
                  {videoId === id && <Play size={13} />}
                </a>
              );
            })}
          </div>
          {sequence.length>30&&<div className="episode-pager"><button className="icon-button" aria-label="目次の前の30授業" disabled={episodePage===0} onClick={()=>setEpisodePage(n=>n-1)}><ArrowLeft size={16}/></button><span>{episodePage*30+1}–{Math.min((episodePage+1)*30,sequence.length)}</span><button className="icon-button" aria-label="目次の次の30授業" disabled={(episodePage+1)*30>=sequence.length} onClick={()=>setEpisodePage(n=>n+1)}><ArrowRight size={16}/></button></div>}
        </aside>
      </div>
    </>
  );
}
function SettingsPage({ learning }: { learning: Learning }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pwa=usePwa();
  const action = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      if (success) setMessage(success);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <a className="back-link" href="#/library">
        <ArrowLeft size={17} />
        マイライブラリ
      </a>
      <header className="page-heading">
        <h1>設定・データ管理</h1>
        <p>学習記録は、この端末に自動保存されます。</p>
      </header>
      <section className="settings-section">
        <h2>
          <Cloud size={21} />
          端末間同期
        </h2>
        <p className="sync-status">{learning.syncState}</p>
        {learning.user ? (
          <>
            <p>{learning.user.displayName || learning.user.email}</p>
            <div className="action-row">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => action(learning.retrySync)}
              >
                <RotateCcw size={17} />
                同期を再試行
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => action(learning.logout)}
              >
                <LogOut size={17} />
                ログアウト
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              {learning.configured
                ? "Googleでログインすると、端末間で学習記録を同期できます。"
                : "Firebaseが未設定のため、現在は端末内だけに保存しています。ローカルの全機能を利用できます。"}
            </p>
            <button
              className="button primary"
              disabled={busy || !learning.configured}
              onClick={() => action(learning.login)}
            >
              <LogIn size={17} />
              Googleでログイン
            </button>
            {!learning.configured && (
              <a
                className="text-link"
                href="https://github.com/totoro0419/curiveo/blob/main/docs/firebase-setup.md"
                target="_blank"
                rel="noreferrer"
              >
                同期を有効にする手順
                <ExternalLink size={14} />
              </a>
            )}
          </>
        )}
      </section>
      <section className="settings-section">
        <h2>
          <Download size={21} />
          バックアップ・復元
        </h2>
        <p>
          メモ、視聴位置、お気に入り、学習記録をJSONファイルで保存できます。復元は既存の記録と統合します。
        </p>
        <div className="action-row">
          <button
            className="button"
            disabled={busy || !learning.ready}
            onClick={() =>
              action(learning.exportBackup, "バックアップを書き出しました。")
            }
          >
            <Download size={17} />
            書き出す
          </button>
          <label className={`button file-button ${busy ? "disabled" : ""}`}>
            <Upload size={17} />
            バックアップを復元
            <input
              aria-label="バックアップファイルを選択"
              type="file"
              accept="application/json,.json"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  action(async () => {
                    const result = await learning.importBackup(file);
                    setMessage(`${result.count}件の学習記録を復元しました。`);
                  });
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>
      <section className="settings-section">
        <h2>
          <Monitor size={21} />
          アプリとして使う
        </h2>
        <p>
          ブラウザの「ホーム画面に追加」または「アプリをインストール」から利用できます。オフラインでは収録一覧と学習記録を開けます。動画の再生には通信が必要です。
        </p>
        <p className="small muted">{pwa.installed?"アプリとして起動しています。":pwa.installAvailable?"このブラウザからインストールできます。":"ブラウザのメニューまたは共有から「ホーム画面に追加」を選んでください。"}</p>
        {pwa.installAvailable&&<button className="button primary" onClick={()=>void pwa.install().catch(()=>{})}><Download size={17}/>Curiveoをインストール</button>}
        <p className="small muted">{pwa.offlineReady?"オフライン用のアプリを端末に保存済み。":"オフライン用のアプリを準備中。初回はオンラインで開いてください。"}</p>
        <div className="action-row"><button className="button" disabled={pwa.applying} onClick={()=>void(pwa.updateAvailable?pwa.applyUpdate():pwa.checkForUpdate()).catch(()=>{})}><RotateCcw size={16}/>{pwa.applying?"記録を保存中…":pwa.updateAvailable?"保存して更新":"更新を確認"}</button></div>
        {pwa.error&&<p className="notice error" role="alert">{pwa.error}</p>}
      </section>
      <section className="settings-section">
        <h2>収録について</h2>
        <p>
          {catalog.videos.length.toLocaleString()}本・{catalog.series.length}
          講座。公式目次・公開プレイリストに基づき収録しています。動画の削除や埋め込み制限はYouTube側で変わるため、視聴できない場合は公式ページを利用してください。
        </p>
        <p className="small muted">
          収録更新: {new Date(catalog.updatedAt).toLocaleDateString("ja-JP")} ·
          Curiveo v1.1
        </p>
        {catalog.gaps.length > 0 && (
          <details>
            <summary>収録上の未確認・不足事項</summary>
            {catalog.gaps.map((g, i) => (
              <p key={i}>
                {channelMap.get(g.channelId)?.name}: {g.reason}
              </p>
            ))}
          </details>
        )}
        <a
          className="text-link"
          href="https://github.com/totoro0419/curiveo"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
          <ExternalLink size={14} />
        </a>
      </section>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </>
  );
}
function NotFound() {
  return (
    <div className="empty">
      <h1>このページは見つかりません。</h1>
      <a className="button primary" href="#/discover">
        授業を探す
      </a>
    </div>
  );
}
export function App() {
  const {route,direction} = useRoute();
  const mainRef=useRef<HTMLElement>(null);
  useInteractionMotion();
  useEffect(()=>{const preload=()=>{void import("./pages/HierarchyPage").catch(()=>{});};if(typeof window.requestIdleCallback==="function"){const handle=window.requestIdleCallback(preload,{timeout:1000});return()=>window.cancelIdleCallback(handle);}const handle=setTimeout(preload,350);return()=>clearTimeout(handle);},[]);
  usePageMotion(mainRef,route.split("?")[0],direction);
  const pwa=usePwa();
  const [path, queryString = ""] = route.split("?");
  const parts = path.split("/").filter(Boolean);
  const params = new URLSearchParams(queryString);
  const learning = useLearning();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const current = parts[0] || "home";
  const navCurrent =
    current === "home"
      ? "/"
      : current === "library" || current === "settings"
        ? "/library"
        : "/discover";
  return (
    <div className={`app ${current === "watch" ? "watch-app" : ""}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        本文へ
      </a>
      <aside className="sidebar">
        <a className="brand" href="#/">
          <img className="brand-symbol" src={`${import.meta.env.BASE_URL}brand/symbol.webp`} alt="" /><img className="brand-wordmark" src={`${import.meta.env.BASE_URL}brand/wordmark.webp`} alt="Curiveo" />
        </a>
        <nav className="main-nav" aria-label="メインナビゲーション">
          {navItems.map((n) => (
            <a
              key={n.path}
              href={`#${n.path}`}
              className={navCurrent === n.path ? "active" : ""}
              aria-current={navCurrent === n.path ? "page" : undefined}
            >
              <n.icon size={21} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            <span className="status-dot" />
            学習記録は自動保存
          </p>
          <a href="#/settings">
            <Settings size={19} />
            <span>設定・同期</span>
          </a>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <a className="mobile-brand brand" href="#/">
            <img className="brand-symbol" src={`${import.meta.env.BASE_URL}brand/symbol.webp`} alt="" /><img className="brand-wordmark" src={`${import.meta.env.BASE_URL}brand/wordmark.webp`} alt="Curiveo" />
          </a>
          <span className="desktop-kicker">学びを、つなぐ。</span>
          <div className="topbar-actions">
            <span className="save-status" role="status">
              {learning.saveState}
            </span>
            <a
              className="icon-button"
              href="#/settings"
              aria-label="設定・同期・バックアップ"
            >
              <Settings size={21} />
            </a>
          </div>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={17} />
            オフライン ·
            学習記録は端末内に保存します。動画再生には通信が必要です。
          </div>
        )}
        {pwa.updateAvailable&&<div className="update-banner" role="status"><span>新しいCuriveoを利用できます</span><button className="button" disabled={pwa.applying} onClick={()=>void pwa.applyUpdate().catch(()=>{})}>{pwa.applying?"記録を保存中…":"保存して更新"}</button></div>}
        {pwa.error&&<p className="notice error" role="alert">{pwa.error}</p>}
        {learning.error && (
          <div className="notice error" role="alert">
            {learning.error}
            <a href="#/settings">バックアップ・再試行</a>
          </div>
        )}
        <main ref={mainRef} id="main-content" className="main-content" tabIndex={-1}>
          <Suspense fallback={<div className="page-skeleton" role="status">講座を開いています…</div>}>{current === "home" ? (
            <HomePage learning={learning} />
          ) : current === "discover" ? (
            <DiscoverPage learning={learning} params={params} />
          ) : current === "subject" ? (
            <HierarchyPage key={path} subjectId={parts[1]} learning={learning} />
          ) : current === "category" ? (
            <HierarchyPage key={path} nodeId={parts[1]} learning={learning} />
          ) : current === "unit" ||
            current === "course" ||
            current === "channel" ? (
            <CollectionPage
              key={path}
              kind={current}
              id={parts[1]}
              learning={learning}
            />
          ) : current === "library" ? (
            <LibraryPage learning={learning} params={params} />
          ) : current === "watch" ? (
            <WatchPage
              key={parts[1]}
              id={parts[1]}
              params={params}
              learning={learning}
            />
          ) : current === "settings" ? (
            <SettingsPage learning={learning} />
          ) : (
            <NotFound />
          )}
          </Suspense>
        </main>
        <footer className="footer">
          Curiveo <span>学びたい授業を、すぐそばに。</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="モバイルナビゲーション">
        {navItems.map((n) => (
          <a
            key={n.path}
            href={`#${n.path}`}
            className={navCurrent === n.path ? "active" : ""}
            aria-current={navCurrent === n.path ? "page" : undefined}
          >
            <n.icon size={22} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
