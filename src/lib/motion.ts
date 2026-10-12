import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease='cubic-bezier(.22,1,.36,1)';
// Damped oscillator samples: one short physical spring, without a runtime library or per-frame React work.
export const springSamples=Array.from({length:25},(_,i)=>{const t=i/24;return i===24?1:1-Math.exp(-7.5*t)*(Math.cos(10*t)+.75*Math.sin(10*t));});
export const springEase=`linear(${springSamples.map(value=>value.toFixed(4)).join(',')})`;
let shared:{name:string;rect:DOMRect;node:HTMLElement}|undefined;
export function useInteractionMotion(){useEffect(()=>{
 if(typeof Element.prototype.animate!=='function')return;
 const animations=new WeakMap<Element,Animation>();const active=new Set<Animation>();const presses=new Map<number,HTMLElement>();
 const press=(event:PointerEvent)=>{if(reduced()||event.button!==0||!(event.target instanceof Element))return;const element=event.target.closest<HTMLElement>('button:not(:disabled), a.interactive-card, a.subject-tile, a.course-row, .hierarchy-card');if(!element||element.closest('.player-frame'))return;presses.set(event.pointerId,element);animations.get(element)?.cancel();const a=element.animate([{transform:'scale(1)'},{transform:'scale(.975)'}],{duration:80,easing:ease,fill:'forwards'});animations.set(element,a);active.add(a);};
 const release=(event:PointerEvent)=>{const element=presses.get(event.pointerId);presses.delete(event.pointerId);if(!element)return;animations.get(element)?.cancel();if(reduced())return;const a=element.animate(springSamples.map((value,i)=>({transform:`scale(${.975+.025*value})`,offset:i/24})),{duration:280,easing:'linear'});animations.set(element,a);active.add(a);void a.finished.catch(()=>{}).finally(()=>active.delete(a));};
 const remember=(event:MouseEvent)=>{if(reduced()||!(event.target instanceof Element))return;const link=event.target.closest<HTMLAnchorElement>('a[href^="#/"]');const mark=link?.querySelector<HTMLElement>('[data-shared-icon]');if(mark&&mark.dataset.sharedIcon)shared={name:mark.dataset.sharedIcon,rect:mark.getBoundingClientRect(),node:mark.cloneNode(true) as HTMLElement};};
 const preference=window.matchMedia('(prefers-reduced-motion: reduce)');const cancel=()=>{active.forEach(animation=>animation.cancel());active.clear();presses.clear();shared=undefined;document.querySelectorAll('.shared-motion-copy').forEach(el=>el.remove());};
 document.addEventListener('pointerdown',press,{passive:true});document.addEventListener('pointerup',release,{passive:true});document.addEventListener('pointercancel',release,{passive:true});document.addEventListener('click',remember,true);preference.addEventListener('change',cancel);
 return()=>{document.removeEventListener('pointerdown',press);document.removeEventListener('pointerup',release);document.removeEventListener('pointercancel',release);document.removeEventListener('click',remember,true);preference.removeEventListener('change',cancel);cancel();};
},[]);}
export function usePageMotion(ref:RefObject<HTMLElement|null>,routeKey:string,direction:'forward'|'back'|'replace'){
 const previous=useRef('');
 useLayoutEffect(()=>{const element=ref.current;if(!element||previous.current===routeKey)return;const first=!previous.current;previous.current=routeKey;if(reduced()||typeof element.animate!=='function'){shared=undefined;return;}
  const remembered=shared;shared=undefined;const marker=remembered?[...element.querySelectorAll<HTMLElement>('[data-shared-icon]')].find(el=>el.dataset.sharedIcon===remembered.name):undefined;const markerRect=marker?.getBoundingClientRect();
  const entering=element.animate([{opacity:.35,transform:`translateX(${direction==='back'?-16:first?0:18}px) translateY(${first?8:0}px)`},{opacity:1,transform:'translate(0,0)'}],{duration:210,easing:ease});
  let copy:HTMLElement|undefined;let target:HTMLElement|undefined;let flight:Animation|undefined;
  if(remembered&&!routeKey.startsWith('/watch/')){target=[...element.querySelectorAll<HTMLElement>('[data-shared-icon]')].find(el=>el.dataset.sharedIcon===remembered.name);if(target){const rect=markerRect||target.getBoundingClientRect();copy=remembered.node;copy.classList.add('shared-motion-copy');copy.setAttribute('aria-hidden','true');copy.style.cssText=`position:fixed;z-index:50;pointer-events:none;left:${remembered.rect.x}px;top:${remembered.rect.y}px;width:${remembered.rect.width}px;height:${remembered.rect.height}px;margin:0;`;document.body.append(copy);target.style.opacity='0';flight=copy.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${rect.x-remembered.rect.x}px,${rect.y-remembered.rect.y}px) scale(${rect.width/remembered.rect.width})`,opacity:1}],{duration:290,easing:CSS.supports('animation-timing-function',springEase)?springEase:ease,fill:'forwards'});flight.finished.catch(()=>{}).finally(()=>{copy?.remove();if(target)target.style.opacity='';});}}
  const cancel=()=>{entering.cancel();flight?.cancel();copy?.remove();if(target)target.style.opacity='';};const preference=window.matchMedia('(prefers-reduced-motion: reduce)');preference.addEventListener('change',cancel);
  return()=>{cancel();preference.removeEventListener('change',cancel);};
 },[routeKey,direction]);
}
