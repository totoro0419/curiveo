import durations from '../data/video-durations.json';
import historySupplement from '../data/history-duration-supplement.json';
import type { Video, LearningRecord } from '../types';
const metadata=durations as Record<string,number>;
const historyMetadata=historySupplement as Record<string,number>;
export function videoDuration(video:Video,records:Record<string,LearningRecord>={}){
 const candidates=[records[video.id]?.duration,metadata[video.id],historyMetadata[video.id],video.durationSeconds];
 return candidates.find((value):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0)??null;
}
export function durationTime(seconds:number){
 const value=Math.floor(Math.max(0,seconds));const hours=Math.floor(value/3600);
 return (hours?hours+':'+String(Math.floor(value%3600/60)).padStart(2,'0'):String(Math.floor(value/60)))+':'+String(value%60).padStart(2,'0');
}
export function totalDuration(videos:Video[],records:Record<string,LearningRecord>={}){
 const unique=[...new Map(videos.map(video=>[video.id,video])).values()];
 let seconds=0,missing=0;
 for(const video of unique){const duration=videoDuration(video,records);if(duration===null)missing++;else seconds+=duration;}
 return {seconds:Math.floor(seconds),missing,total:unique.length};
}
export function durationSummary(videos:Video[],records:Record<string,LearningRecord>={}){
 const result=totalDuration(videos,records);
 if(!result.total)return '合計 0:00';
 if(result.missing===result.total)return '合計時間未取得（'+result.missing+'本）';
 const hours=Math.floor(result.seconds/3600),minutes=Math.floor(result.seconds%3600/60),seconds=result.seconds%60;
 const label=(hours?hours+'時間':'')+(minutes?minutes+'分':'')+seconds+'秒';
 return result.missing?'取得済み '+label+' · '+result.missing+'本の時間は未取得':'合計 '+label;
}
