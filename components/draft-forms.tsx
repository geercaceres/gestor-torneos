'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ComponentProps,type FormEvent,type ReactNode} from 'react';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogAction,AlertDialogCancel} from '@/components/ui/alert-dialog';

type Drafts={dirty:boolean;mark:(form:HTMLFormElement,dirty:boolean)=>void;clear:()=>void;confirm:(message:string)=>Promise<boolean>;protect:(scope?:string)=>Promise<boolean>;submit:{current:HTMLFormElement|null}};
const Context=createContext<Drafts|null>(null);
export function useDrafts(){const value=useContext(Context);if(!value)throw new Error('DraftProvider requerido');return value;}

export function DraftProvider({children}:{children:ReactNode}){
 const forms=useRef(new Map<HTMLFormElement,string>()),submit=useRef<HTMLFormElement|null>(null);
 const [dirty,setDirty]=useState(false),[question,setQuestion]=useState('');
 const answer=useRef<((value:boolean)=>void)|null>(null);
 const mark=useCallback((form:HTMLFormElement,changed:boolean)=>{if(changed)forms.current.set(form,form.closest('[data-draft-scope]')?.getAttribute('data-draft-scope')||'');else forms.current.delete(form);setDirty(forms.current.size>0)},[]);
 const clear=useCallback(()=>{forms.current.clear();setDirty(false)},[]);
 const confirm=useCallback((message:string)=>new Promise<boolean>(resolve=>{if(answer.current){resolve(false);return;}answer.current=resolve;setQuestion(message)}),[]);
 const finish=useCallback((value:boolean)=>{const resolve=answer.current;answer.current=null;setQuestion('');resolve?.(value)},[]);
 const protect=useCallback(async(scope?:string)=>{
  const origin=submit.current;
  const affected=[...forms.current].some(([form,group])=>form.isConnected&&form!==origin&&(!scope||scope===group));
  return !affected||await confirm('Esta operación puede reemplazar otros cambios sin guardar. Cancelá para conservarlos o continuá para descartarlos.');
 },[confirm]);
 useEffect(()=>{if(!dirty)return;const leave=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave)},[dirty]);
 useEffect(()=>()=>{answer.current?.(false)},[]);
 const value=useMemo(()=>({dirty,mark,clear,confirm,protect,submit}),[dirty,mark,clear,confirm,protect]);
 return <Context.Provider value={value}>{children}<AlertDialog open={!!question} onOpenChange={open=>{if(!open)finish(false)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar operación</AlertDialogTitle><AlertDialogDescription>{question}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>finish(true)}>Continuar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></Context.Provider>;
}

type Props=Omit<ComponentProps<'form'>,'onSubmit'> & {onSubmit:(event:FormEvent<HTMLFormElement>)=>unknown|Promise<unknown>};
export function DraftForm({onSubmit,children,...props}:Props){
 const ref=useRef<HTMLFormElement>(null),{mark,submit}=useDrafts();
 useEffect(()=>{const form=ref.current;return()=>{if(form)mark(form,false)}},[mark]);
 return <form {...props} ref={ref} onChangeCapture={e=>{mark(e.currentTarget,true);props.onChangeCapture?.(e)}} onClickCapture={e=>{if((e.target as Element).closest('[data-draft-change]'))mark(e.currentTarget,true);props.onClickCapture?.(e)}} onSubmit={async e=>{
  e.preventDefault();const form=e.currentTarget;
  if(submit.current)return;
  submit.current=form;
  try{const result=await onSubmit(e);if(result)mark(form,false)}finally{if(submit.current===form)submit.current=null}
 }}>{children}</form>;
}
