import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { Disclosure } from './Disclosure';

const wide=()=>window.matchMedia('(min-width:960px)').matches;
const subscribe=(update:()=>void)=>{const query=window.matchMedia('(min-width:960px)');query.addEventListener('change',update);return()=>query.removeEventListener('change',update);};

export function WatchPlaylist({children,currentId,index,count}:{children:ReactNode;currentId:string;index:number;count:number}) {
 const beside=useSyncExternalStore(subscribe,wide,()=>false);
 const root=useRef<HTMLElement>(null);
 useLayoutEffect(()=>{
  if(!beside)return;
  const list=root.current?.querySelector<HTMLElement>('.episode-list');
  const active=list?.querySelector<HTMLElement>('a[aria-current="page"]');
  if(list&&active)list.scrollTop=Math.max(0,active.offsetTop-(list.clientHeight-active.clientHeight)/2);
 },[beside,currentId]);
 return <aside ref={root} className="watch-playlist" aria-label="プレイリスト">{beside?children:<Disclosure stateKey="watch-playlist-mobile" title={`授業 ${index+1} / ${count}`}>{children}</Disclosure>}</aside>;
}
