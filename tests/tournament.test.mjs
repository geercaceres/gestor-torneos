import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState,makeMatches,applyAction,sides,roundName,migrateState,scheduleWarnings} from '../lib/tournament.mjs';
const loaded=()=>{const s=seedState();s.config.scoringMode='sets';s.config.setsToWin=1;s.teams.forEach(t=>t.name='Equipo '+t.id);return s;};
const action=(s,type,payload)=>{if(type==='result'&&payload.reason==='played'&&payload.setsWonA===undefined){const ids=sides(s,s.matches.find(m=>m.id===payload.id));payload={...payload,setsWonA:ids[0]===payload.winnerId?1:0,setsWonB:ids[1]===payload.winnerId?1:0};}return applyAction(s,{type,payload},'2026-09-05T12:00:00.000Z');};
test('The generic template creates a 16-slot, 15-match bracket',()=>{const s=seedState();assert.equal(s.matches.length,15);assert.equal(s.matches[0].scheduledAt,'2026-10-01T08:00');assert.equal(s.matches[7].scheduledAt,'2026-10-01T12:40');assert.equal(s.matches[8].scheduledAt,'2026-10-01T13:20');assert.equal(s.matches[14].scheduledAt,'2026-10-01T17:20');assert.equal(s.config.sport,'Sport');assert.equal(s.config.locale,'en');assert.equal(s.config.scoringMode,'winner');assert.equal(s.config.logoUrl,'');});
test('The interface language accepts English and Spanish only',()=>{const english=seedState();const spanish=action(english,'config',{locale:'es'});assert.equal(spanish.config.locale,'es');assert.equal(english.config.locale,'en');assert.throws(()=>action(english,'config',{locale:'fr'}),/English or Spanish/);});
test('Every bracket size produces one champion',()=>{for(const size of [2,4,8,16,32]){let s=loaded();s.teams=Array.from({length:size},(_,i)=>({id:i+1,name:'Pareja '+(i+1)}));s.matches=makeMatches(size);assert.equal(s.matches.length,size-1);for(const m of s.matches){const ids=sides(s,m);assert.ok(ids.every(Boolean));s=action(s,'result',{id:m.id,winnerId:ids[0],score:'6-4',reason:'played'});}assert.equal(s.matches.at(-1).winnerId,1);assert.ok(s.matches.every(m=>m.status==='finished'));assert.equal(roundName(s.matches.at(-1).round,size),'Final');}});
test('Matches cannot start with pending names or qualifiers',()=>{const s=seedState();assert.throws(()=>action(s,'status',{id:3,status:'live'}),/completá/);assert.throws(()=>action(s,'status',{id:9,status:'live'}),/completá/);});
test('A playing area can have only one called or live match',()=>{let s=loaded();s=action(s,'status',{id:1,status:'called'});assert.throws(()=>action(s,'status',{id:2,status:'live'}),/cancha/);s=action(s,'status',{id:1,status:'live'});assert.equal(s.matches[0].startedAt,'2026-09-05T12:00:00.000Z');s=action(s,'status',{id:1,status:'scheduled'});assert.equal(s.matches[0].startedAt,null);s=action(s,'status',{id:2,status:'live'});assert.equal(s.matches[1].status,'live');});
test('Winners advance and results cannot invalidate rounds already in progress',()=>{let s=loaded();s=action(s,'result',{id:1,winnerId:1,score:'6-0',reason:'played'});s=action(s,'result',{id:2,winnerId:4,score:'6-2',reason:'played'});assert.deepEqual(sides(s,s.matches[8]),[1,4]);s=action(s,'status',{id:9,status:'live'});assert.throws(()=>action(s,'reopen',{id:1,confirm:true}),/posteriores/);assert.throws(()=>action(s,'result',{id:1,winnerId:2,score:'6-0',reason:'played'}),/posterior/);s=action(s,'status',{id:9,status:'scheduled'});s=action(s,'reopen',{id:1,confirm:true});assert.deepEqual(sides(s,s.matches[8]),[null,4]);});
test('A walkover requires a reason and is never declared automatically from the schedule',()=>{let s=loaded();assert.throws(()=>action(s,'result',{id:1,winnerId:1,reason:'walkover'}),/motivo/);s=action(s,'result',{id:1,winnerId:1,reason:'walkover',note:'Ausencia tras 5 minutos; no hay partido disponible para adelantar.'});assert.equal(s.matches[0].reason,'walkover');assert.equal(s.matches[1].status,'scheduled');});
test('An explicit bye requires exactly one vacancy and one participant',()=>{let s=seedState();s.teams[4].name='Equipo 5';s=action(s,'bye',{id:3,winnerId:5});assert.equal(s.matches[2].winnerId,5);assert.throws(()=>action(seedState(),'bye',{id:1,winnerId:1}),/exactamente/);const both=seedState();both.teams[6].name='Equipo 7';both.teams[7].name='Equipo 8';assert.throws(()=>action(both,'bye',{id:4,winnerId:7}),/exactamente/);});
test('Resizing preserves participants and cannot alter a started bracket',()=>{const named=seedState();named.teams[15].name='Fuera del nuevo cuadro';assert.throws(()=>action(named,'resize',{size:8,confirm:true}),/fuera/);let s=loaded();s=action(s,'status',{id:1,status:'called'});assert.throws(()=>action(s,'resize',{size:32,confirm:true}),/comenzó/);});
test('Multiple playing areas and rescheduling respect dependencies and results',()=>{let s=loaded();s=action(s,'config',{courts:2});s=action(s,'replan',{start:'2026-09-05T08:00',confirm:true});assert.equal(s.matches[0].scheduledAt,s.matches[1].scheduledAt);assert.notEqual(s.matches[0].court,s.matches[1].court);for(const m of s.matches.filter(m=>m.round>1)){for(const source of [m.sourceA,m.sourceB]){const parent=s.matches.find(x=>x.id===source);assert.ok(Date.parse(m.scheduledAt+'Z')>=Date.parse(parent.scheduledAt+'Z')+parent.duration*60000);}}s=action(s,'result',{id:1,winnerId:1,reason:'played',score:'6-3'});const finished=structuredClone(s.matches[0]);s=action(s,'replan',{start:'2026-09-05T10:00',confirm:true});assert.deepEqual(s.matches[0],finished);});
test('Rescheduling does not change matchups, winners, or IDs',()=>{const original=loaded();const s=action(original,'schedule',{id:2,scheduledAt:'2026-10-01T07:30',court:1,duration:35,note:'Adelanto autorizado'});assert.deepEqual(sides(s,s.matches[1]),[3,4]);assert.equal(original.matches[1].scheduledAt,'2026-10-01T08:40');assert.equal(s.matches[1].scheduledAt,'2026-10-01T07:30');});
test('Validation rejects invalid dates, prices, links, and unknown actions',()=>{const s=seedState();assert.throws(()=>action(s,'config',{logoUrl:'http://example.com/logo.png'}),/logotipo/);assert.throws(()=>action(s,'config',{mapsUrl:'javascript:alert(1)'}),/HTTPS/);assert.throws(()=>action(s,'config',{date:'2026-02-30'}),/inválida/);assert.throws(()=>action(s,'config',{whatsappUrl:'https://evil.test'}),/WhatsApp/);assert.throws(()=>action(s,'menu',{items:[{name:'Agua',price:-1,available:true}]}),/rango/);assert.throws(()=>action(s,'unknown',{}),/permitida/);});
test('Saving preserves the previous version and increments the revision',()=>{const s=seedState();const n=action(s,'config',{announcement:'Demora de 15 minutos'});assert.equal(s.config.announcement,'');assert.equal(n.config.announcement,'Demora de 15 minutos');assert.equal(n.revision,1);});


test('A called match cannot move to an occupied playing area',()=>{let s=loaded();s=action(s,'config',{courts:2});s=action(s,'schedule',{id:2,scheduledAt:'2026-09-05T08:00',court:2,duration:40});s=action(s,'status',{id:1,status:'live'});s=action(s,'status',{id:2,status:'called'});assert.throws(()=>action(s,'schedule',{id:2,scheduledAt:'2026-09-05T08:00',court:1,duration:40}),/cancha/);});



test('Rescheduling spans non-consecutive days without exceeding closing time',()=>{
 let s=loaded();s=action(s,'config',{days:[{date:'2026-09-07',startTime:'09:00',endTime:'18:00'},{date:'2026-09-05',startTime:'08:00',endTime:'12:00'}]});
 assert.equal(s.config.date,'2026-09-05');
 s=action(s,'replan',{start:'2026-09-05T08:00',confirm:true});
 assert.equal(s.matches[5].scheduledAt,'2026-09-05T11:20');
 assert.equal(s.matches[6].scheduledAt,'2026-09-07T09:00');
 assert.equal(s.matches.at(-1).scheduledAt,'2026-09-07T14:20');
 assert.deepEqual(scheduleWarnings(s),[]);
});
test('Insufficient capacity does not save a partial schedule',()=>{
 let s=loaded();s=action(s,'config',{days:[{date:'2026-09-05',startTime:'08:00',endTime:'09:00'}]});
 const original=structuredClone(s);
 assert.throws(()=>action(s,'replan',{start:'2026-09-05T08:00',confirm:true}),/No alcanzan/);
 assert.deepEqual(s,original);
 assert.ok(scheduleWarnings(s).length>0);
});
test('Event-day validation covers duplicates, intervals, limits, and active-day removal',()=>{
 const s=loaded();
 const day={date:'2026-09-05',startTime:'08:00',endTime:'18:00'};
 for(const days of [[],[day,day],[{...day,endTime:'07:00'}],[{...day,date:'2026-02-30'}],Array(32).fill(day)])assert.throws(()=>action(s,'config',{days}));
 const playing=action(s,'status',{id:1,status:'live'});
 assert.throws(()=>action(playing,'config',{days:[{...day,date:'2026-09-07'}]}),/activos/);
});
test('Two playing areas respect event days and dependencies across day boundaries',()=>{
 let s=loaded();s=action(s,'config',{courts:2,days:[{date:'2026-09-05',startTime:'08:00',endTime:'10:00'},{date:'2026-09-08',startTime:'15:00',endTime:'21:00'}]});
 s=action(s,'replan',{start:'2026-09-05T08:00',confirm:true});
 assert.ok(s.matches.some(m=>m.scheduledAt.startsWith('2026-09-08')));
 assert.equal(s.matches[0].scheduledAt,s.matches[1].scheduledAt);
 assert.deepEqual(scheduleWarnings(s),[]);
});
test('Set-based scoring calculates the winner and validates the format',()=>{
 let s=loaded();s=action(s,'config',{scoringMode:'sets',setsToWin:2});
 s=applyAction(s,{type:'result',payload:{id:1,reason:'played',setsWonA:1,setsWonB:2,score:'4–6, 6–3, 5–7'}});
 assert.equal(s.matches[0].winnerId,2);assert.equal(s.matches[0].setsWonA,1);assert.equal(s.matches[0].setsWonB,2);
 assert.equal(s.matches[0].score,'1–2 en sets · 4–6, 6–3, 5–7');
 assert.deepEqual(sides(s,s.matches[8]),[2,null]);
 assert.throws(()=>action(s,'config',{setsToWin:1}),/formato/);
 s=action(s,'reopen',{id:1,confirm:true});assert.equal(s.matches[0].setsWonA,null);
 for(const [a,b] of [[0,0],[1,1],[2,2],[3,1],[-1,2],[1.5,2]])assert.throws(()=>applyAction(s,{type:'result',payload:{id:1,reason:'played',setsWonA:a,setsWonB:b}}));
 assert.throws(()=>applyAction(s,{type:'result',payload:{id:1,reason:'played',setsWonA:2,setsWonB:0,winnerId:2}}),/no coincide/);
});
test('Unknown set targets stay unset and walkovers remain available',()=>{
 const s=loaded();s.config.setsToWin=null;assert.equal(s.config.setsToWin,null);
 assert.throws(()=>action(s,'status',{id:1,status:'live'}),/sets/);
 assert.throws(()=>applyAction(s,{type:'result',payload:{id:1,reason:'played',setsWonA:2,setsWonB:0}}),/sets/);
 assert.equal(action(s,'result',{id:1,reason:'walkover',winnerId:1,note:'Ausencia confirmada'}).matches[0].winnerId,1);
});
test('Migrates existing data without losing names, schedules, or results and is idempotent',()=>{
 const old=loaded();old.schemaVersion=1;delete old.config.days;delete old.config.setsToWin;delete old.config.locale;
 old.config.scoring='Formato de puntuación por confirmar';old.matches[0].status='finished';old.matches[0].winnerId=1;old.matches[0].score='6–3, 6–4';old.revision=7;
 const snapshot=structuredClone(old),migrated=migrateState(old);
 assert.deepEqual(old,snapshot);assert.equal(migrated.schemaVersion,5);assert.equal(migrated.revision,7);assert.equal(migrated.config.logoUrl,'');assert.equal(migrated.config.locale,'es');
 assert.equal(migrated.config.days[0].date,'2026-10-01');assert.equal(migrated.config.setsToWin,null);
 assert.deepEqual(migrated.teams,old.teams);assert.equal(migrated.matches[0].score,'6–3, 6–4');
 assert.strictEqual(migrateState(migrated),migrated);
});
test('Generic scoring records a winner and score without requiring sets',()=>{
 let s=seedState();s.teams[0].name='Equipo Norte';s.teams[1].name='Equipo Sur';
 s=action(s,'status',{id:1,status:'live'});
 s=applyAction(s,{type:'result',payload:{id:1,reason:'played',winnerId:2,score:'3–1'}});
 assert.equal(s.matches[0].winnerId,2);assert.equal(s.matches[0].score,'3–1');assert.equal(s.matches[0].setsWonA,null);
});
