import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useViewState } from '../navigation/route';
export function Disclosure({title,children,stateKey,defaultOpen=false,count}:{title:string;children:ReactNode;stateKey:string;defaultOpen?:boolean;count?:number}){const id=useId();const [open,setOpen]=useViewState(stateKey,defaultOpen);const [rendered,setRendered]=useState(open);useEffect(()=>{if(open)setRendered(true);},[open]);return <section className={`disclosure ${open?'is-open':''}`}><h3><button className="disclosure-trigger" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><span>{title}</span>{count!==undefined&&<span className="disclosure-count">{count}</span>}<ChevronDown size={18}/></button></h3><div className="disclosure-body" id={id} aria-hidden={!open} inert={!open}><div className="disclosure-inner">{(open||rendered)&&children}</div></div></section>;}
