'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,MoveHorizontal} from 'lucide-react';
import {Button} from '@/components/ui/button';

export function SectionNavigation({items,selected,onSelect}:{items:string[];selected:string;onSelect:(item:string)=>void}){
 const row=useRef<HTMLDivElement>(null),nav=useRef<HTMLElement>(null);
 const id=useId();
 const [edges,setEdges]=useState({overflow:false,left:false,right:false});

 useEffect(()=>{
  const element=nav.current,container=row.current;
  if(!element||!container)return;
  function measure(){
   if(!element||!container)return;
   const overflow=element.scrollWidth>container.clientWidth+2;
   const next={overflow,left:overflow&&element.scrollLeft>2,right:overflow&&element.scrollLeft+element.clientWidth<element.scrollWidth-2};
   setEdges(old=>old.overflow===next.overflow&&old.left===next.left&&old.right===next.right?old:next);
  }
  const observer=new ResizeObserver(measure);
  observer.observe(container);observer.observe(element);
  for(const child of element.children)observer.observe(child);
  element.addEventListener('scroll',measure,{passive:true});
  measure();
  return()=>{observer.disconnect();element.removeEventListener('scroll',measure)};
 },[items]);

 useEffect(()=>{
  const element=nav.current,active=element?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
  if(!element||!active)return;
  const bounds=element.getBoundingClientRect(),button=active.getBoundingClientRect();
  if(button.left<bounds.left)element.scrollBy({left:button.left-bounds.left-8,behavior:'instant'});
  else if(button.right>bounds.right)element.scrollBy({left:button.right-bounds.right+8,behavior:'instant'});
 },[selected]);

 function move(direction:number){
  const element=nav.current;if(!element)return;
  element.scrollBy({left:direction*Math.max(120,element.clientWidth*.75),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }

 return <div className="section-navigation no-print">
  <div ref={row} className={'section-navigation-row'+(edges.overflow?' has-overflow':'')}>
   {edges.overflow&&<Button type="button" variant="outline" className="section-scroll-button" aria-label="Ver secciones anteriores" aria-controls={id} disabled={!edges.left} onClick={()=>move(-1)}><ChevronLeft aria-hidden="true"/></Button>}
   <nav ref={nav} id={id} className="tabs" aria-label="Secciones del torneo" aria-describedby={edges.right?id+'-hint':undefined}>
    {items.map(item=><button key={item} type="button" className={item===selected?'active':''} aria-pressed={item===selected} onClick={()=>onSelect(item)}>{item}</button>)}
   </nav>
   {edges.overflow&&<Button type="button" variant="outline" className="section-scroll-button" aria-label="Ver más secciones" aria-controls={id} disabled={!edges.right} onClick={()=>move(1)}><ChevronRight aria-hidden="true"/></Button>}
  </div>
  {edges.overflow&&<div className="section-scroll-hint">{edges.right&&<p id={id+'-hint'}><MoveHorizontal size={15} aria-hidden="true"/> Deslizá o tocá la flecha para ver más secciones</p>}</div>}
 </div>;
}
