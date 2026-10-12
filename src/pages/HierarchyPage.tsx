import { useMemo } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, ExternalLink, Play } from 'lucide-react';
import { catalog, channelMap, subjectMap, seriesMap, unitMap, videoMap, progress, videoHref, time } from '../catalog';
import type { Series, SubjectId, Video } from '../types';
import { hierarchyRoots, learningNodes, getNodePath, nodeVideos, nodeHref } from '../navigation/hierarchy';
import { courseOutline } from '../navigation/course-outline';
import { useViewState } from '../navigation/route';
import { CourseList, ProgressBar, VideoList, icons } from '../components/catalog-ui';
import type { Learning } from '../components/catalog-ui';
import { Disclosure } from '../components/Disclosure';
import { SectionTabs } from '../components/SectionTabs';

function Breadcrumb({items}:{items:{title:string;href?:string}[]}){return <nav className="breadcrumbs" aria-label="現在地"><ol><li><a href="#/discover">探す</a></li>{items.map((item,i)=><li key={i}><ChevronRight size={13}/>{item.href?<a href={item.href}>{item.title}</a>:<span aria-current="page">{item.title}</span>}</li>)}</ol></nav>;}
function CourseGroups({courses,learning}:{courses:Series[];learning:Learning}){const channels=catalog.channels.filter(c=>courses.some(s=>s.channelId===c.id));const coreCount=(channelId:string)=>new Set(courses.filter(s=>s.channelId===channelId).flatMap(s=>s.videoIds).filter(id=>videoMap.get(id)?.role==='core')).size;channels.sort((a,b)=>coreCount(b.id)-coreCount(a.id));return <div className="course-groups">{channels.map((channel,i)=>{const rows=courses.filter(s=>s.channelId===channel.id);return <Disclosure key={channel.id} stateKey={`channel:${channel.id}`} title={channel.name} count={rows.length} defaultOpen={i===0}><p className="group-description">{channel.description}</p><ChannelCourses courses={rows} learning={learning}/></Disclosure>;})}</div>;}
function ChannelCourses({courses,learning}:{courses:Series[];learning:Learning}){const levels=[...new Set(courses.map(course=>course.level))];return courses.length>12&&levels.length>1?<div className="channel-levels">{levels.map(level=><Disclosure key={level} stateKey={`course-level:${courses[0].channelId}:${level}`} title={level} count={courses.filter(course=>course.level===level).length}><CourseList courses={courses.filter(course=>course.level===level)} learning={learning}/></Disclosure>)}</div>:<CourseList courses={courses} learning={learning}/>;}
function ResumeCourse({series,learning,ids}:{series:Series;learning:Learning;ids?:string[]}){const sequence=series.videoIds.filter(id=>!ids||ids.includes(id));const recent=sequence.map(id=>learning.records[id]).filter(r=>r&&r.lastViewedAt>0&&r.status!=='completed'&&!r.playbackEnded).sort((a,b)=>b.lastViewedAt-a.lastViewedAt)[0];const video=videoMap.get(recent?.videoId||sequence[0]);if(!video)return null;return <a className="course-start interactive-card" href={videoHref(video,series.id)}><span className="start-play"><Play size={20} fill="currentColor"/></span><span><strong>{recent?'続きから学ぶ':'講座を最初から学ぶ'}</strong><small>{recent?`${time(recent.position)} から再開 · `:''}{video.title}</small></span><ArrowRight size={20}/></a>;}
export default function HierarchyPage({subjectId,nodeId,learning}:{subjectId?:string;nodeId?:string;learning:Learning}){
 const node=learningNodes.get(nodeId||hierarchyRoots[subjectId as SubjectId]);
 const [mode,setMode]=useViewState('subject-mode','courses');
 const [source,setSource]=useViewState('topic-source','');
 const list=useMemo(()=>node?nodeVideos(node.id):[],[node]);
 if(!node)return <div className="empty">分類が見つかりません。<a href="#/discover">教科一覧へ</a></div>;
 const subject=subjectMap.get(node.subjectId)!;const Icon=icons[subject.icon]||BookOpen;
 const path=getNodePath(node.id);const isRoot=node.kind==='subject';
 const courses=catalog.series.filter(series=>series.subjectId===node.subjectId&&series.videoIds.some(id=>node.videoIds.includes(id)));
 const chosen=seriesMap.get(source);const selected=chosen&&courses.includes(chosen)?chosen:undefined;
 const children=node.children.map(id=>learningNodes.get(id)!).filter(Boolean);
 return <>
  <Breadcrumb items={path.map((part,i)=>({title:part.title,href:i<path.length-1?nodeHref(part):undefined}))}/>
  <a className="back-link" href={node.parentId?nodeHref(learningNodes.get(node.parentId)!):'#/discover'}><ArrowLeft size={17}/>{node.parentId?'上の分類へ':'教科一覧'}</a>
  <header className="page-heading with-icon"><span className="subject-icon large" data-shared-icon={subject.id}><Icon size={32}/></span><div><p className="eyebrow">{isRoot?'LEARN BY COURSE':subject.name}</p><h1>{node.title}</h1><p>{isRoot?'講座を選んで、ひとつの流れで学ぶ。':node.description}</p></div></header>
  <ProgressBar list={list} learning={learning}/>
  {isRoot&&<SectionTabs panelId="subject-panel" label="教科の探し方" items={[{id:'courses',label:'チャンネル・講座'},{id:'topics',label:'単元から探す'}]} value={mode} onChange={setMode}/>}
  <div id="subject-panel" role={isRoot?'tabpanel':undefined} aria-labelledby={isRoot?`subject-panel-${mode}`:undefined} aria-label={isRoot?(mode==='courses'?'チャンネル・講座':'単元から探す'):undefined} className="results-enter" key={isRoot?mode:node.id}>
  {isRoot&&mode==='courses'?<><p className="section-intro">チャンネルごとに講座を分けています。収録範囲を確認して、公式の授業順で進められます。</p><CourseGroups courses={courses} learning={learning}/></>:<>
   {!!children.length&&<div className="hierarchy-grid">{children.map(child=>{const p=progress(nodeVideos(child.id),learning.records);return <a className="hierarchy-card interactive-card" key={child.id} href={nodeHref(child)}><span className="category-mark"><BookOpen size={20}/></span><div><h2>{child.title}</h2><p>{child.children.length?`${child.children.length}項目 · `:''}{child.videoIds.length}授業{p.completed?` · ${p.percent}% 学習済み`:''}</p></div><ChevronRight size={18}/></a>;})}</div>}
   {children.length?<Disclosure stateKey="skip-to-course" title="この範囲の講座を直接選ぶ" count={courses.length}><CourseGroups courses={courses} learning={learning}/></Disclosure>:<section className="section"><h2>{children.length?'この範囲を学べる講座':'講座を選ぶ'}</h2><p className="section-intro">同じ単元でも講座は混ぜません。選んだ講座の公式順で表示します。</p>
    {!selected?<div className="course-choices">{courses.map(course=><button key={course.id} className="course-choice" onClick={()=>setSource(course.id)}><BookOpen size={21}/><span><small>{channelMap.get(course.channelId)?.name}</small><strong>{course.title}</strong><small>この範囲に {course.videoIds.filter(id=>node.videoIds.includes(id)).length} 授業</small></span><ChevronRight size={18}/></button>)}</div>:<><div className="selected-course"><div><p className="eyebrow">{channelMap.get(selected.channelId)?.name}</p><h3>{selected.title}</h3></div><button className="text-button" onClick={()=>setSource('')}>講座を選び直す</button></div><ResumeCourse series={selected} learning={learning} ids={node.videoIds}/><VideoList videos={selected.videoIds.filter(id=>node.videoIds.includes(id)).map(id=>videoMap.get(id)!)} learning={learning} seriesId={selected.id}/></>}

   </section>}
   {node.targets?.length&&<Disclosure stateKey="chapter-targets" title="情報Ⅰの章へ直接移動" count={node.targets.length} defaultOpen={!children.length}><div className="chapter-targets">{node.targets.map((target,i)=>{const video=videoMap.get(target.videoId)!;return <a key={`${target.videoId}-${target.startSeconds}-${i}`} href={`${videoHref(video)}&t=${target.startSeconds}&category=${node.id}`}><span>{time(target.startSeconds)}</span><span>{target.title}</span><ChevronRight size={16}/></a>;})}</div></Disclosure>}
  </>}
  </div>
 </>;
}
export function CollectionPage({kind,id,learning}:{kind:'course'|'channel'|'unit';id:string;learning:Learning}){
 const [subject,setSubject]=useViewState('channel-subject','');
 const series=seriesMap.get(id);const channel=channelMap.get(id);const unit=unitMap.get(id);
 const list=useMemo(()=>kind==='course'&&series?series.videoIds.map(id=>videoMap.get(id)!):catalog.videos.filter(video=>kind==='channel'?video.channelId===id:video.unitIds.includes(id)),[kind,id,series]);
 const outline=useMemo(()=>series?courseOutline(series):[],[series]);
 const courseRows=catalog.series.filter(s=>kind==='channel'?s.channelId===id:s.videoIds.some(videoId=>list.some(v=>v.id===videoId)));
 if((kind==='course'&&!series)||(kind==='channel'&&!channel)||(kind==='unit'&&!unit))return <div className="empty">講座が見つかりません。</div>;
 const title=kind==='course'?series!.title:kind==='channel'?channel!.name:unit!.name;
 const sid=series?.subjectId||unit?.subjectId;
 const availableSubjects=catalog.subjects.filter(s=>courseRows.some(course=>course.subjectId===s.id));
 return <>
 <Breadcrumb items={[...(sid?[{title:subjectMap.get(sid)!.name,href:`#/subject/${sid}`}]:[]),...(series?[{title:channelMap.get(series.channelId)!.name,href:`#/channel/${series.channelId}`}]:[]),{title}]}/>
 <a className="back-link" href={sid?`#/subject/${sid}`:'#/discover'}><ArrowLeft size={17}/>{sid?subjectMap.get(sid)?.name:'探す'}</a>
 <header className="page-heading"><p className="eyebrow">{kind==='course'?channelMap.get(series!.channelId)?.name:kind==='channel'?'CHANNEL':'UNIT'}</p><h1>{title}</h1><p>{list.length}授業{series?` · ${series.level} · 公式の授業順`:''}</p></header>
 <ProgressBar list={list} learning={learning}/>
 {series?<>
  <ResumeCourse series={series} learning={learning}/>
  <Disclosure stateKey="coverage" title="収録範囲・公式出典"><p className="group-description">{series.coverage}</p><a className="text-link" href={series.sourceUrl} target="_blank" rel="noreferrer">公式の講座一覧<ExternalLink size={14}/></a></Disclosure>
  <section className="section course-outline"><div className="section-heading"><h2>講座の目次</h2><span className="small muted">{outline.length}項目</span></div><p className="section-intro">単元を開くと授業が表示されます。途中からの学習もできます。</p>
  {outline.map((group,i)=>{const videos=group.videoIds.map(id=>videoMap.get(id)!);const done=progress(videos,learning.records);return <Disclosure key={group.id} stateKey={`outline:${group.id}`} title={`${String(i+1).padStart(2,'0')}  ${group.title}`} count={videos.length} defaultOpen={outline.length===1}><div className="outline-progress"><span>{done.completed}/{done.total} 学習済み</span><a className="text-link" href={videoHref(videos[0],series.id)}><Play size={14}/>ここから学ぶ</a></div><VideoList videos={videos} learning={learning} seriesId={series.id}/></Disclosure>;})}</section>
 </>:<>
  {channel&&<a className="text-link" href={channel.url} target="_blank" rel="noreferrer">公式ページ<ExternalLink size={14}/></a>}
  {kind==='channel'&&availableSubjects.length>1?<><h2 className="section">教科を選ぶ</h2><div className="chips">{availableSubjects.map(s=><button key={s.id} aria-pressed={subject===s.id} className={subject===s.id?'selected':''} onClick={()=>setSubject(s.id)}>{s.name}</button>)}</div>{subject?<CourseList courses={courseRows.filter(s=>s.subjectId===subject)} learning={learning}/>:<p className="section-intro">教科を選ぶと、このチャンネルの講座が表示されます。</p>}</>:<CourseGroups courses={courseRows} learning={learning}/>}
 </>}
 </>;
}
export function WatchTrail({video,seriesId}:{video:Video;seriesId?:string}){const series=seriesMap.get(seriesId||video.seriesIds[0]);return <Breadcrumb items={[{title:subjectMap.get(video.subjectId)!.name,href:`#/subject/${video.subjectId}`},{title:channelMap.get(video.channelId)!.name,href:`#/channel/${video.channelId}`},...(series?[{title:series.title,href:`#/course/${series.id}`}]:[]),{title:'授業'}]}/>;}
