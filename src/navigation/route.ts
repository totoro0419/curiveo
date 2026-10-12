import { useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
type Entry = { key:string; index:number; route:string; fromRoute?:string; x:number; y:number };
const memory = new Map<string, unknown>();
const read = <T,>(key:string, fallback:T):T => { if(memory.has(key))return memory.get(key) as T;try {const value=sessionStorage.getItem(`curiveo:view:${key}`);if(value!==null){const parsed=JSON.parse(value) as T;memory.set(key,parsed);return parsed;}}catch{}return fallback; };
const write = (key:string,value:unknown) => { memory.set(key,value);try {sessionStorage.setItem(`curiveo:view:${key}`,JSON.stringify(value));}catch{} };
export const currentRoute = () => location.hash.slice(1)||'/';
export function go(path:string){location.hash=path;}
export function useViewState<T>(name:string, initial:T):[T,Dispatch<SetStateAction<T>>] {
 const key=`${currentRoute()}:${name}`;
 const [state,setState]=useState<T>(()=>read(key,initial));
 const keyRef=useRef(key); const valueRef=useRef(state);
 useLayoutEffect(()=>{if(keyRef.current!==key){keyRef.current=key;const value=read(key,initial);valueRef.current=value;setState(value);}},[key]);
 const update:Dispatch<SetStateAction<T>>=value=>{const next=typeof value==='function'?(value as (previous:T)=>T)(valueRef.current):value;valueRef.current=next;write(keyRef.current,next);setState(next);};
 return [state,update];
}
function getEntry():Entry|undefined {return history.state?.curiveoEntry;}
function storeEntry(entry:Entry){history.replaceState({...history.state,curiveoEntry:entry},'');}
export function useRoute(){
 const [state,setState]=useState({route:currentRoute(),direction:'forward' as 'forward'|'back'|'replace',key:getEntry()?.key||crypto.randomUUID()});
 const current=useRef<Entry>(getEntry()||{key:state.key,index:0,route:state.route,x:window.scrollX,y:window.scrollY});
 const backHint=useRef(false);
 const restore=useRef<{x:number;y:number}|undefined>(read(`scroll:${current.current.key}`,{x:current.current.x,y:current.current.y}));
 useLayoutEffect(()=>{
  const prior=history.scrollRestoration;history.scrollRestoration='manual';storeEntry(current.current);
  const save=()=>{const value={...current.current,x:window.scrollX,y:window.scrollY};current.current=value;write(`scroll:${value.key}`,{x:value.x,y:value.y});};
  const onNavigate=()=>{
   save();const known=getEntry();const route=currentRoute();
   const next=known?.key!==current.current.key&&known?.route===route?known:{key:crypto.randomUUID(),index:current.current.index+1,route,fromRoute:current.current.route,x:0,y:0};
   const backwards=next.index<current.current.index||backHint.current;backHint.current=false;current.current=next;storeEntry(next);
   restore.current=known?.key===next.key?read(`scroll:${next.key}`,{x:next.x,y:next.y}):{x:0,y:0};
   setState({route,direction:backwards?'back':'forward',key:next.key});
  };
  const onClick=(event:MouseEvent)=>{const target=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href^="#/"]'):null;if(!target||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;save();if(target.matches('.back-link')||target.closest('.breadcrumbs')){backHint.current=true;if(target.hash.slice(1)===current.current.fromRoute){event.preventDefault();history.back();}}};
  window.addEventListener('hashchange',onNavigate);document.addEventListener('click',onClick,true);window.addEventListener('pagehide',save);
  return()=>{save();history.scrollRestoration=prior;window.removeEventListener('hashchange',onNavigate);document.removeEventListener('click',onClick,true);window.removeEventListener('pagehide',save);};
 },[]);
 useLayoutEffect(()=>{
  const saved=restore.current;if(!saved)return;restore.current=undefined;
  const scroll=()=>window.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});
  scroll();const frame=requestAnimationFrame(scroll);return()=>cancelAnimationFrame(frame);
 },[state.key]);
 return state;
}
export function listKey(ids:string[]){let hash=2166136261;for(const id of ids)for(let i=0;i<id.length;i++)hash=Math.imul(hash^id.charCodeAt(i),16777619);return `${ids.length}-${(hash>>>0).toString(16)}`;}
