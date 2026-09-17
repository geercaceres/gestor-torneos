import {useState,useEffect,useCallback} from 'react';
import type {State} from './types';
export async function request<T = Record<string,unknown>>(path:string,data?:unknown):Promise<T>{const response=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000)});const result=await response.json() as {error?:string};if(!response.ok)throw Object.assign(new Error(result.error||'No se pudo completar la solicitud.'),{status:response.status});return result as T;}
export function useTournament(poll=true){
 const[state,setState]=useState<State|null>(null),[error,setError]=useState(''),[lastSync,setLastSync]=useState<Date|null>(null);
 const refresh=useCallback(async()=>{try{const next=await request<State>('state');setState(next);setError('');setLastSync(new Date());return next;}catch(e){setError(e instanceof Error?e.message:'No hay conexión con el servidor.');return null;}},[]);
 useEffect(()=>{refresh();if(!poll)return;const id=setInterval(()=>{if(document.visibilityState==='visible')refresh()},10000);const visible=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(id);document.removeEventListener('visibilitychange',visible)}},[poll,refresh]);
 return{state,setState,error,refresh,lastSync};
}
export const money=(n:number,currency='PYG')=>new Intl.NumberFormat('es-PY',{style:'currency',currency,currencyDisplay:'narrowSymbol',maximumFractionDigits:Number.isInteger(n)?0:2}).format(n);
export const time=(value:string)=>value.slice(11,16);
export const dateLabel=(value:string)=>new Intl.DateTimeFormat('es-PY',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
export const statusLabel:Record<string,string>={scheduled:'Programado',called:'En llamado',live:'En juego',finished:'Finalizado'};



export const calendarLabel=(config:State['config'])=>config.days.length===1?dateLabel(config.days[0].date):config.days.length+' jornadas · '+config.days[0].date.split('-').reverse().join('/')+' al '+config.days.at(-1)!.date.split('-').reverse().join('/');
