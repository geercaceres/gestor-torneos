import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,sep} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {seedState} from '../lib/tournament.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
test('Importación inicial conserva torneo y rechaza sobrescribir una base existente',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'padel-import-'));
 try{
  const dbPath=resolve(dir,'new.sqlite');const input=resolve(dir,'state.json');
  const state=seedState();state.revision=7;state.config.announcement='Dato real a conservar';
  writeFileSync(input,JSON.stringify(state));
  const run=()=>spawnSync(process.execPath,['scripts/import-initial.mjs',input],{cwd:root,env:{...process.env,DATABASE_PATH:dbPath},encoding:'utf8'});
  let result=run();assert.equal(result.status,0,result.stderr);
  let db=new DatabaseSync(dbPath);assert.deepEqual(JSON.parse(db.prepare('SELECT document FROM tournament').get().document),state);db.close();
  state.config.announcement='No debe reemplazar';writeFileSync(input,JSON.stringify(state));
  result=run();assert.notEqual(result.status,0);
  db=new DatabaseSync(dbPath);assert.equal(JSON.parse(db.prepare('SELECT document FROM tournament').get().document).config.announcement,'Dato real a conservar');db.close();
 }finally{
  assert.ok(dir.startsWith(resolve(tmpdir())+sep+'padel-import-'));
  rmSync(dir,{recursive:true,force:true});
 }
});
