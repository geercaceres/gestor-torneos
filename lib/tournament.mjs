
export const DEFAULT_RULES_ES = [
'El torneo se disputa con eliminación directa. Quien gana avanza a la siguiente ronda.',
'Cada encuentro dispone del tiempo de preparación y espera que confirme la organización.',
'Los próximos participantes se anunciarán por los canales oficiales del torneo.',
'Los horarios son estimados. Consultá la programación actualizada para saber cuándo acercarte al local.',
'Si un participante no llega a la hora establecida, la organización decidirá si corresponde adelantar otro encuentro o aplicar una ausencia.',
'La organización confirma los cambios de programación y los resultados. Los cruces deportivos se mantienen al adelantar un partido.',
'El sistema de puntuación, los desempates y cualquier condición especial se publican en Formato de juego.'
];
export const DEFAULT_RULES = [
'The tournament uses single elimination. The winner advances to the next round.',
'Each match includes the preparation and waiting time confirmed by the organizer.',
'Upcoming participants will be announced through the tournament’s official channels.',
'Times are estimates. Check the updated schedule before traveling to the venue.',
'If a participant does not arrive on time, the organizer will decide whether another match can be moved forward or a walkover applies.',
'The organizer confirms schedule changes and results. Moving a match does not change its bracket pairing.',
'The scoring system, tiebreaks, and special conditions are published under Match format.'
];
export function makeMatches(size, start='2026-09-05T08:00', duration=40, courts=1) {
 const matches=[]; let previous=[]; let id=1; let count=size/2; let round=1;
 while(count>=1) {
  const current=[];
  for(let i=0;i<count;i++) {
   const m={id:id++,round,teamA:round===1?i*2+1:null,teamB:round===1?i*2+2:null,sourceA:round===1?null:previous[i*2],sourceB:round===1?null:previous[i*2+1],scheduledAt:start,duration,court:i%courts+1,status:'scheduled',winnerId:null,setsWonA:null,setsWonB:null,score:'',note:'',reason:'played',startedAt:null,finishedAt:null};
   matches.push(m);current.push(m.id);
  }
  previous=current;count/=2;round++;
 }
 const state={matches,config:{courts}}; replan(state,start); return matches;
}
export function seedState() {
 const names=Array(16).fill('');
 return {schemaVersion:5,revision:0,updatedAt:null,config:{locale:'en',title:'My tournament',brand:'TOURNAMENT MANAGER',subtitle:'Schedule, results, bracket, and everything visitors need to follow the event.',sport:'Sport',participantSingular:'Team',participantPlural:'Teams',playingAreaSingular:'Court',playingAreaPlural:'Courts',currency:'USD',scoringMode:'winner',logoUrl:'',posterUrl:'',tagline:'ONE TOURNAMENT. ONE SHARED EXPERIENCE.',date:'2026-10-01',startTime:'08:00',venue:'Venue to be confirmed',address:'Address to be confirmed',mapsUrl:'',whatsappUrl:'',contact:'',courts:1,days:[{date:'2026-10-01',startTime:'08:00',endTime:'18:00'}],setsToWin:null,duration:40,entryFee:0,prize:0,prizeExtra:'',announcement:'',rules:DEFAULT_RULES.join('\n\n'),scoring:'The organizer will confirm the scoring system.',foodNote:'Food and drink options will be published here.'},teams:names.map((name,i)=>({id:i+1,name})),matches:makeMatches(16,'2026-10-01T08:00'),menu:[]};
}
export function roundName(round,size,locale='en') { const remaining=size/2**(round-1);const names=locale==='es'?{2:'Final',4:'Semifinales',8:'Cuartos de final',16:'Octavos de final',32:'Dieciseisavos'}:{2:'Final',4:'Semifinals',8:'Quarterfinals',16:'Round of 16',32:'Round of 32'};return names[remaining]||(locale==='es'?'Ronda ':'Round ')+round; }
export function sides(state,match) {
 return [match.teamA??state.matches.find(m=>m.id===match.sourceA)?.winnerId??null,match.teamB??state.matches.find(m=>m.id===match.sourceB)?.winnerId??null];
}
export function teamLabel(state,id,fallback) {return state.teams.find(t=>t.id===id)?.name||(fallback!==undefined?fallback:(state.config.participantSingular||(state.config.locale==='es'?'Equipo':'Team'))+(state.config.locale==='es'?' por confirmar':' to be confirmed'));}
export function participantLabel(state,match,side) { const id=sides(state,match)[side]; const source=side===0?match.sourceA:match.sourceB;return id?teamLabel(state,id):source?(state.config.locale==='es'?'Ganador del partido ':'Winner of match ')+String(source).padStart(2,'0'):(state.config.participantSingular||(state.config.locale==='es'?'Equipo':'Team'))+(state.config.locale==='es'?' por confirmar':' to be confirmed'); }
function addMinutes(value,minutes) {return new Date(Date.parse(value+'Z')+minutes*60000).toISOString().slice(0,16);}
export function replan(state,start) {
 const free=Array(state.config.courts).fill(start);
 for(const m of state.matches.filter(m=>m.status==='live'||m.status==='called')) free[m.court-1]=[free[m.court-1],addMinutes(m.scheduledAt,m.duration)].sort().at(-1);
 for(const m of state.matches) {
  if(m.status!=='scheduled')continue;
  const parents=[m.sourceA,m.sourceB].filter(Boolean).map(id=>state.matches.find(p=>p.id===id)).filter(p=>p.status!=='finished');
  const ready=parents.reduce((time,p)=>[time,addMinutes(p.scheduledAt,p.duration)].sort().at(-1),start);
  const candidates=free.map((available,court)=>({court,at:nextWindow(state.config.days,[available,ready].sort().at(-1),m.duration)})).filter(c=>c.at).sort((a,b)=>a.at.localeCompare(b.at)||a.court-b.court);
  check(candidates.length>0,'No alcanzan las jornadas configuradas. Agregá un día, ampliá su horario o aumentá las canchas. No se guardó la reprogramación.');
  const {court,at}=candidates[0];m.court=court+1;m.scheduledAt=at;free[court]=addMinutes(m.scheduledAt,m.duration);
 }
}
function nextWindow(days,start,duration) {
 if(!days)return start;
 for(const day of days){const candidate=[start,day.date+'T'+day.startTime].sort().at(-1);if(addMinutes(candidate,duration)<=day.date+'T'+day.endTime)return candidate;}
 return null;
}
export function scoringLabel(config){const es=config.locale==='es';if(config.scoringMode==='winner')return config.scoring||(es?'La organización confirma al ganador y el marcador.':'The organizer confirms the winner and final score.');if(config.setsToWin===2&&/super[ -]tie-break/i.test(config.scoring))return es?'2 sets + Super tie-break · a 7 puntos si empatan 1–1':'2 sets + Super tiebreak · first to 7 if tied 1–1';return config.setsToWin?(es?'Gana quien obtiene ':'First to ')+config.setsToWin+' '+(config.setsToWin===1?'set':'sets')+(es?' · ':' · ')+(config.setsToWin===1?(es?'a un set':'one-set match'):(es?'al mejor de ':'best of ')+(config.setsToWin*2-1)):(es?'Por sets · cantidad para ganar pendiente de confirmación':'Sets · winning target to be confirmed');}
export function migrateState(original){
 if(original.schemaVersion>=5)return original;
 const s=structuredClone(original);
 if(s.schemaVersion<2){
 const dates=[...new Set([s.config.date,...s.matches.map(m=>m.scheduledAt.slice(0,10))])].sort();
 s.config.days=dates.map(date=>{const matches=s.matches.filter(m=>m.scheduledAt.startsWith(date));return {date,startTime:[s.config.startTime,...matches.map(m=>m.scheduledAt.slice(11))].sort()[0],endTime:['18:00',...matches.map(m=>addMinutes(m.scheduledAt,m.duration).startsWith(date)?addMinutes(m.scheduledAt,m.duration).slice(11):'23:59')].sort().at(-1)};});
 s.config.setsToWin=null;
 if(s.config.scoring==='Formato de puntuación por confirmar')s.config.scoring='Games y desempates por confirmar.';
 s.config.rules=s.config.rules.replace('Formato de puntuación (sets, games y desempate): pendiente de confirmación por la organización.',DEFAULT_RULES_ES.at(-1));
 s.matches=s.matches.map(m=>({...m,setsWonA:null,setsWonB:null}));
 }
 if(s.schemaVersion<3)Object.assign(s.config,{sport:s.config.sport||'Pádel',participantSingular:s.config.participantSingular||'Pareja',participantPlural:s.config.participantPlural||'Parejas',playingAreaSingular:s.config.playingAreaSingular||'Cancha',playingAreaPlural:s.config.playingAreaPlural||'Canchas',currency:s.config.currency||'PYG',scoringMode:s.config.scoringMode||'sets',posterUrl:s.config.posterUrl??'/afiche.png',tagline:s.config.tagline||'UN TORNEO. UNA BUENA CAUSA.'});
 s.config.logoUrl=s.config.logoUrl??'';
 s.config.locale=s.config.locale??'es';
 s.schemaVersion=5;return s;
}
export class DomainError extends Error {constructor(message,status=400){super(message);this.status=status;}}
function check(condition,message){if(!condition)throw new DomainError(message);}
function string(value,max=500,required=false){check(typeof value==='string'&&value.length<=max,'Texto inválido o demasiado largo.');const v=value.trim();check(!required||v.length>0,'Completá los campos obligatorios.');return v;}
function number(value,min,max){check(Number.isInteger(value)&&value>=min&&value<=max,'Número fuera del rango permitido.');return value;}
function dateTime(value){check(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)&&Number.isFinite(Date.parse(value+'Z'))&&new Date(value+'Z').toISOString().slice(0,16)===value,'Fecha u hora inválida.');return value;}
function descendants(state,id){const direct=state.matches.filter(m=>m.sourceA===id||m.sourceB===id);return direct.flatMap(m=>[m,...descendants(state,m.id)]);}
function ready(state,m){const ids=sides(state,m);check(ids.every(id=>id&&state.teams.some(t=>t.id===id&&t.name)),'Primero completá las dos parejas y los partidos anteriores.');return ids;}
function url(value,kind){const v=string(value,1000);if(!v)return '';let u;try{u=new URL(v)}catch{throw new DomainError('Enlace inválido.');}check(u.protocol==='https:'&&!u.username&&!u.password,'Usá enlaces HTTPS.');if(kind==='whatsapp')check(['chat.whatsapp.com','wa.me','api.whatsapp.com'].includes(u.hostname),'Ingresá un enlace de WhatsApp válido.');return v;}
export function applyAction(original,action,now=new Date().toISOString()) {
 const s=structuredClone(original);check(action&&typeof action==='object','Solicitud inválida.');
 const p=action.payload||{};
 switch(action.type){
  case 'config': {
   const cfg={...s.config};
   if('locale'in p){check(['en','es'].includes(p.locale),'Choose English or Spanish.');cfg.locale=p.locale;}
   for(const key of ['title','brand','subtitle','sport','participantSingular','participantPlural','playingAreaSingular','playingAreaPlural','currency','logoUrl','posterUrl','tagline','venue','address','contact','prizeExtra','announcement','scoring','foodNote'])if(key in p)cfg[key]=string(p[key],key==='announcement'||key==='foodNote'?2000:250,['title','brand','sport','participantSingular','participantPlural','playingAreaSingular','playingAreaPlural','currency','venue'].includes(key));
   cfg.currency=cfg.currency.toUpperCase();check(/^[A-Z]{3}$/.test(cfg.currency),'Usá un código de moneda ISO de 3 letras, por ejemplo PYG, USD o ARS.');
   for(const [value,label] of [[cfg.logoUrl,'El logotipo'],[cfg.posterUrl,'El afiche']])if(value)check(value.startsWith('/')||/^https:\/\/[^\s]+$/i.test(value),label+' debe ser una ruta local o un enlace HTTPS.');
   if('scoringMode'in p){check(['sets','winner'].includes(p.scoringMode),'Elegí un método de resultado válido.');check(p.scoringMode===cfg.scoringMode||!s.matches.some(m=>m.status==='live'||(m.status==='finished'&&m.reason==='played')),'No se cambia el método de resultado después de comenzar a jugar. Reabrí los resultados primero.');cfg.scoringMode=p.scoringMode;}
   for(const key of ['transferAlias','transferPhone','transferBank','transferAccount','transferBeneficiary','transferDocument'])if(key in p)cfg[key]=string(p[key],250);
   if('rules'in p)cfg.rules=string(p.rules,12000,true);
   if('mapsUrl'in p)cfg.mapsUrl=url(p.mapsUrl,'maps');
   if('whatsappUrl'in p)cfg.whatsappUrl=url(p.whatsappUrl,'whatsapp');
   if('days'in p){
    check(Array.isArray(p.days)&&p.days.length>=1&&p.days.length<=31,'Configurá entre 1 y 31 jornadas.');
    cfg.days=p.days.map(day=>{check(day&&typeof day==='object','Jornada inválida.');dateTime(day.date+'T'+day.startTime);dateTime(day.date+'T'+day.endTime);check(day.startTime<day.endTime,'La jornada debe terminar después de su inicio, dentro del mismo día.');return {date:day.date,startTime:day.startTime,endTime:day.endTime};}).sort((a,b)=>a.date.localeCompare(b.date));
    check(new Set(cfg.days.map(day=>day.date)).size===cfg.days.length,'No repitas una fecha en las jornadas.');
    check(!s.matches.some(m=>['called','live'].includes(m.status)&&!cfg.days.some(day=>day.date===m.scheduledAt.slice(0,10))),'No se puede quitar un día con partidos activos o llamados.');
    cfg.date=cfg.days[0].date;cfg.startTime=cfg.days[0].startTime;
   }else if('date'in p||'startTime'in p){const stamp=dateTime((p.date??cfg.date)+'T'+(p.startTime??cfg.startTime));cfg.date=stamp.slice(0,10);cfg.startTime=stamp.slice(11);if(cfg.days){check(cfg.days.length===1,'Editá las jornadas para cambiar fechas de un torneo de varios días.');check(cfg.startTime<cfg.days[0].endTime,'El inicio debe ser anterior al cierre de la jornada.');cfg.days=[{...cfg.days[0],date:cfg.date,startTime:cfg.startTime}];}}
   if('setsToWin'in p){check(p.setsToWin===null||[1,2,3].includes(p.setsToWin),'Elegí 1, 2 o 3 sets para ganar.');check(p.setsToWin===cfg.setsToWin||!s.matches.some(m=>m.status==='live'||(m.status==='finished'&&m.reason==='played')),'No se cambia el formato después de comenzar a jugar. Reabrí los resultados primero.');cfg.setsToWin=p.setsToWin;}
   for(const key of ['entryFee','prize'])if(key in p)cfg[key]=number(p[key],0,1000000000);
   if('duration'in p)cfg.duration=number(p.duration,10,240);
   if('courts'in p){cfg.courts=number(p.courts,1,8);check(!s.matches.some(m=>m.court>cfg.courts&&m.status!=='scheduled'&&m.status!=='finished'),'Terminá los partidos activos antes de reducir canchas.');for(const m of s.matches)if(m.status==='scheduled'&&m.court>cfg.courts)m.court=1;}
   s.config=cfg;break;
  }
  case 'teams':check(Array.isArray(p.teams)&&p.teams.length===s.teams.length,'Cantidad de parejas inválida.');s.teams=s.teams.map(t=>{const edit=p.teams.find(e=>e.id===t.id);check(edit,'Falta una pareja.');const name=string(edit.name,120);check(name||!s.matches.some(m=>m.status!=='scheduled'&&sides(s,m).includes(t.id)),'No se puede vaciar una pareja que ya participó.');return {...t,name};});break;
  case 'resize': {
   const size=number(p.size,2,32);check([2,4,8,16,32].includes(size),'Usá 2, 4, 8, 16 o 32 lugares en el cuadro.');check(s.matches.every(m=>m.status==='scheduled'),'El cuadro ya comenzó. No se puede cambiar su tamaño.');check(p.confirm===true,'Confirmá la regeneración del cuadro.');
   check(!s.teams.some(t=>t.id>size&&t.name),'Quitá primero los nombres de las parejas que quedarían fuera.');
   s.teams=Array.from({length:size},(_,i)=>({id:i+1,name:s.teams.find(t=>t.id===i+1)?.name||''}));s.matches=makeMatches(size,s.config.date+'T'+s.config.startTime,s.config.duration,s.config.courts);replan(s,s.config.date+'T'+s.config.startTime);break;
  }
  case 'schedule': {
   const m=s.matches.find(m=>m.id===p.id);check(m,'Partido inexistente.');check(m.status==='scheduled'||m.status==='called','Solo se reprograman partidos que no comenzaron.');
   m.scheduledAt=dateTime(p.scheduledAt);m.court=number(p.court,1,s.config.courts);m.duration=number(p.duration,10,240);m.note=string(p.note??'',500);
   if(m.status==='called')check(!s.matches.some(other=>other.id!==m.id&&other.court===m.court&&['live','called'].includes(other.status)),'La cancha ya tiene un partido activo o llamado.');break;
  }
  case 'replan':check(p.confirm===true,'Confirmá la reprogramación.');replan(s,dateTime(p.start));break;
  case 'status': {
   const m=s.matches.find(m=>m.id===p.id);check(m,'Partido inexistente.');check(['called','live','scheduled'].includes(p.status),'Estado inválido.');check(m.status!=='finished','Reabrí el resultado antes de cambiar el estado.');
   if(p.status!=='scheduled'){ready(s,m);check(!s.matches.some(other=>other.id!==m.id&&other.court===m.court&&['live','called'].includes(other.status)),'La cancha ya tiene un partido activo o llamado.');}
   if(p.status==='live'&&s.config.scoringMode==='sets')check([1,2,3].includes(s.config.setsToWin),'Confirmá cuántos sets se necesitan para ganar antes de iniciar el partido.');
   m.status=p.status;m.startedAt=p.status==='live'?(m.startedAt||now):null;break;
  }
  case 'result': {
   const m=s.matches.find(m=>m.id===p.id);check(m,'Partido inexistente.');const ids=ready(s,m);check(descendants(s,m.id).every(d=>d.status==='scheduled'),'Un partido posterior ya comenzó o tiene resultado. Reabrilo primero.');
   check(['played','walkover','bye'].includes(p.reason),'Motivo inválido.');check(p.reason!=='bye','Usá el pase libre para una vacante.');
   let winnerId=p.winnerId;const detail=string(p.score??'',80);
   if(p.reason==='played'&&s.config.scoringMode==='sets'){
    const target=s.config.setsToWin;check([1,2,3].includes(target),'Confirmá cuántos sets se necesitan para ganar en Torneo y reglas.');
    const a=number(p.setsWonA,0,target),b=number(p.setsWonB,0,target);
    check((a===target&&b<target)||(b===target&&a<target),'El resultado debe tener una sola pareja con los sets necesarios para ganar.');
    winnerId=ids[a>b?0:1];check(p.winnerId===undefined||p.winnerId===winnerId,'La ganadora indicada no coincide con los sets.');
    m.setsWonA=a;m.setsWonB=b;m.score=a+'–'+b+' en sets'+(detail?' · '+detail:'');
   }else if(p.reason==='played'){check(ids.includes(winnerId),'Ganador inválido.');m.setsWonA=null;m.setsWonB=null;m.score=detail||'Resultado confirmado';}
   else{m.setsWonA=null;m.setsWonB=null;m.score='';}
   check(ids.includes(winnerId),'Ganador inválido.');m.winnerId=winnerId;m.reason=p.reason;m.note=string(p.note??'',500);if(p.reason==='walkover')check(m.note.length>0,'Indicá el motivo de la ausencia y la decisión de organización.');
   m.status='finished';m.finishedAt=now;break;
  }
  case 'bye': {
   const m=s.matches.find(m=>m.id===p.id);check(m&&m.round===1&&m.status==='scheduled','El pase libre solo se aplica en primera ronda antes de jugar.');
   const ids=sides(s,m);check(ids.includes(p.winnerId)&&teamLabel(s,p.winnerId,'')&&ids.filter(id=>teamLabel(s,id,'')).length===1,'El pase libre necesita exactamente una pareja cargada y una vacante.');
   m.winnerId=p.winnerId;m.reason='bye';m.score='Pase libre';m.status='finished';m.finishedAt=now;break;
  }
  case 'reopen': {
   const m=s.matches.find(m=>m.id===p.id);check(m&&m.status==='finished','Ese partido no tiene un resultado.');check(p.confirm===true,'Confirmá la reapertura.');
   check(descendants(s,m.id).every(d=>d.status==='scheduled'),'Reabrí primero los partidos posteriores, desde la final hacia atrás.');m.status='scheduled';m.winnerId=null;m.score='';m.setsWonA=null;m.setsWonB=null;m.reason='played';m.startedAt=null;m.finishedAt=null;break;
  }
  case 'menu':check(Array.isArray(p.items)&&p.items.length<=50,'Máximo 50 productos.');s.menu=p.items.map((item,i)=>({id:i+1,name:string(item.name,100,true),description:string(item.description??'',250),price:number(item.price,0,10000000),available:Boolean(item.available)}));break;
  default:throw new DomainError('Acción no permitida.');
 }
 s.revision++;s.updatedAt=now;return s;
}


export function scheduleWarnings(state) {
 const warnings=[];
 const pending=state.matches.filter(m=>m.status!=='finished');
 for(const m of pending){
  if(state.config.days&&!state.config.days.some(day=>m.scheduledAt>=day.date+'T'+day.startTime&&addMinutes(m.scheduledAt,m.duration)<=day.date+'T'+day.endTime))warnings.push('El partido '+m.id+' está fuera de las jornadas u horarios configurados. Revisalo o recalculá la programación.');
  for(const p of pending.filter(p=>p.id<m.id&&p.court===m.court)){
   if(m.scheduledAt<addMinutes(p.scheduledAt,p.duration)&&p.scheduledAt<addMinutes(m.scheduledAt,m.duration))warnings.push('Los partidos '+p.id+' y '+m.id+' se superponen en cancha '+m.court+'.');
  }
  for(const id of [m.sourceA,m.sourceB].filter(Boolean)){
   const parent=state.matches.find(p=>p.id===id);
   if(parent.status!=='finished'&&m.scheduledAt<addMinutes(parent.scheduledAt,parent.duration))warnings.push('El partido '+m.id+' está previsto antes de que termine su partido previo '+id+'.');
  }
 }
 return warnings;
}
