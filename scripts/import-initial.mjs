// One-time provisioning only: public tournament data, never credentials or sales.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {migrateState} from '../lib/tournament.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
if(existsSync(resolve(root,'.env')))process.loadEnvFile(resolve(root,'.env'));
if(!process.argv[2])throw new Error('Indicar archivo JSON público del torneo.');
const input=JSON.parse(readFileSync(process.argv[2],'utf8'));
if(![1,2,3,4].includes(input.schemaVersion)||!Number.isInteger(input.revision)||input.revision<0||!input.config||!Array.isArray(input.teams)||!Array.isArray(input.matches)||!Array.isArray(input.menu))throw new Error('Formato de torneo inválido.');
const state=migrateState(input);
const path=resolve(root,process.env.DATABASE_PATH||'data/torneo.sqlite');
mkdirSync(dirname(path),{recursive:true});
const db=new DatabaseSync(path);
try{
 db.exec('BEGIN IMMEDIATE');
 // Refuse any existing application, including databases with no tournament row.
 if(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get().n!==0)throw new Error('La base ya contiene tablas: no se reemplazará ningún dato.');
 db.exec(readFileSync(resolve(root,'server/schema.sql'),'utf8'));
 db.prepare('INSERT INTO tournament(id,revision,document) VALUES(1,?,?)').run(state.revision,JSON.stringify(state));
 db.exec('COMMIT');
 console.log('Torneo inicial importado; no se importaron usuarios, contraseñas ni ventas.');
}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
