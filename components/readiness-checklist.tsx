'use client';
import {useEffect,useState} from 'react';
import {CheckCircle2,AlertCircle,ClipboardCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {request} from '@/lib/client';
import {localeOf,text} from '@/lib/i18n';
import type {State,SessionUser,Product} from '@/lib/types';

export function ReadinessChecklist({state,user,onNavigate}:{state:State;user:SessionUser;onNavigate:(tab:string)=>void}){
 const locale=localeOf(state.config),t=(es:string,en:string)=>text(locale,es,en);
 const [products,setProducts]=useState<Product[]|null>(null),[staff,setStaff]=useState<SessionUser[]|null>(null);
 useEffect(()=>{let active=true;if(user.permissions.includes('food.manage'))request<Product[]>('food/products').then(p=>{if(active)setProducts(p)}).catch(()=>{});if(user.permissions.includes('users.manage'))request<{users:SessionUser[]}>('users').then(r=>{if(active)setStaff(r.users)}).catch(()=>{});return()=>{active=false}},[user]);
 const incomplete=state.teams.filter(t=>!t.name||/\+\s*1\b/.test(t.name)).length;
 const pendingVacancies=state.teams.filter(t=>!t.name&&state.matches.some(m=>m.round===1&&(m.teamA===t.id||m.teamB===t.id)&&m.reason!=='bye')).length;
 const namedIncomplete=state.teams.filter(t=>/\+\s*1\b/.test(t.name)).length;
 const checks=[
  {ok:state.config.scoringMode==='winner'||state.config.setsToWin!==null,label:state.config.scoringMode==='winner'?t('Resultado: ganador y marcador libre','Result: winner and free-form score'):state.config.setsToWin?t('Formato: ','Format: ')+state.config.setsToWin+t(' sets para ganar',' sets to win'):t('Confirmar sets para poder iniciar partidos','Confirm sets before starting matches'),tab:'Torneo y reglas'},
  {ok:pendingVacancies+namedIncomplete===0,label:incomplete?`${pendingVacancies} ${t('lugares sin resolver','unresolved slots')} · ${namedIncomplete} ${t('nombres incompletos','incomplete names')}`:state.config.participantPlural+' '+t('completos','complete'),tab:'Participantes'},
  {ok:!!state.config.mapsUrl,label:state.config.mapsUrl?t('Ubicación publicada','Location published'):t('Cargar enlace de Google Maps','Add Google Maps link'),tab:'Torneo y reglas'},
  {ok:!!state.config.whatsappUrl,label:state.config.whatsappUrl?t('Grupo de WhatsApp publicado','WhatsApp group published'):t('Enlace del grupo de WhatsApp pendiente','WhatsApp group link pending'),tab:'Torneo y reglas'},
  ...(user.permissions.includes('food.manage')?[{ok:!!products?.some(p=>p.active&&p.ready&&p.stock>0),label:products===null?t('Inventario: pendiente de verificar','Inventory: pending check'):products.some(p=>p.active&&p.ready&&p.stock>0)?t('Hay productos listos para vender','Products are ready to sell'):t('Cargar productos con costo, precio y stock','Add products with cost, price, and inventory'),tab:'Productos y stock'}]:[]),
  ...(user.permissions.includes('users.manage')?[{ok:!!staff?.some(u=>u.active&&u.id!==user.id&&u.permissions.includes('food.sell')),label:staff===null?t('Usuarios de mesa: pendiente de verificar','Event staff: pending check'):staff.some(u=>u.active&&u.id!==user.id&&u.permissions.includes('food.sell'))?t('Hay una cuenta adicional habilitada para caja','An additional point-of-sale account is enabled'):t('Crear cuentas personales para la mesa','Create individual accounts for event staff'),tab:'Usuarios'}]:[])
 ];
 return <details className="readiness-panel"><summary><ClipboardCheck size={18}/> {t('Preparación del torneo','Tournament readiness')} <span>{checks.filter(c=>!c.ok).length} {t('pendientes','pending')}</span></summary><p>{t('Revisá estos puntos antes de abrir la jornada. No se cambian datos automáticamente.','Review these items before the event begins. Nothing is changed automatically.')}</p><ul>{checks.map(check=><li key={check.tab+check.label}>{check.ok?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>}<span>{check.label}</span><Button type="button" variant="ghost" onClick={()=>onNavigate(check.tab)}>{t('Revisar','Review')}</Button></li>)}</ul></details>;
}
