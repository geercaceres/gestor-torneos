'use client';
import {useEffect,useState} from 'react';
import {CheckCircle2,AlertCircle,ClipboardCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {request} from '@/lib/client';
import type {State,SessionUser,Product} from '@/lib/types';

export function ReadinessChecklist({state,user,onNavigate}:{state:State;user:SessionUser;onNavigate:(tab:string)=>void}){
 const [products,setProducts]=useState<Product[]|null>(null),[staff,setStaff]=useState<SessionUser[]|null>(null);
 useEffect(()=>{let active=true;if(user.permissions.includes('food.manage'))request<Product[]>('food/products').then(p=>{if(active)setProducts(p)}).catch(()=>{});if(user.permissions.includes('users.manage'))request<{users:SessionUser[]}>('users').then(r=>{if(active)setStaff(r.users)}).catch(()=>{});return()=>{active=false}},[user]);
 const incomplete=state.teams.filter(t=>!t.name||/\+\s*1\b/.test(t.name)).length;
 const pendingVacancies=state.teams.filter(t=>!t.name&&state.matches.some(m=>m.round===1&&(m.teamA===t.id||m.teamB===t.id)&&m.reason!=='bye')).length;
 const namedIncomplete=state.teams.filter(t=>/\+\s*1\b/.test(t.name)).length;
 const checks=[
  {ok:state.config.scoringMode==='winner'||state.config.setsToWin!==null,label:state.config.scoringMode==='winner'?'Resultado: ganador y marcador libre':state.config.setsToWin?'Formato: '+state.config.setsToWin+' sets para ganar':'Confirmar sets para poder iniciar partidos',tab:'Torneo y reglas'},
  {ok:pendingVacancies+namedIncomplete===0,label:incomplete?`${pendingVacancies} lugares sin resolver · ${namedIncomplete} nombres incompletos`:state.config.participantPlural+' completos',tab:'Participantes'},
  {ok:!!state.config.mapsUrl,label:state.config.mapsUrl?'Ubicación publicada':'Cargar enlace de Google Maps',tab:'Torneo y reglas'},
  {ok:!!state.config.whatsappUrl,label:state.config.whatsappUrl?'Grupo de WhatsApp publicado':'Enlace del grupo de WhatsApp pendiente',tab:'Torneo y reglas'},
  ...(user.permissions.includes('food.manage')?[{ok:!!products?.some(p=>p.active&&p.ready&&p.stock>0),label:products===null?'Inventario: pendiente de verificar':products.some(p=>p.active&&p.ready&&p.stock>0)?'Hay productos listos para vender':'Cargar productos con costo, precio y stock',tab:'Productos y stock'}]:[]),
  ...(user.permissions.includes('users.manage')?[{ok:!!staff?.some(u=>u.active&&u.id!==user.id&&u.permissions.includes('food.sell')),label:staff===null?'Usuarios de mesa: pendiente de verificar':staff.some(u=>u.active&&u.id!==user.id&&u.permissions.includes('food.sell'))?'Hay una cuenta adicional habilitada para caja':'Crear cuentas personales para la mesa',tab:'Usuarios'}]:[])
 ];
 return <details className="readiness-panel"><summary><ClipboardCheck size={18}/> Preparación del torneo <span>{checks.filter(c=>!c.ok).length} pendientes</span></summary><p>Revisá estos puntos antes de abrir la jornada. No se cambian datos automáticamente.</p><ul>{checks.map(check=><li key={check.tab+check.label}>{check.ok?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>}<span>{check.label}</span><Button type="button" variant="ghost" onClick={()=>onNavigate(check.tab)}>Revisar</Button></li>)}</ul></details>;
}
