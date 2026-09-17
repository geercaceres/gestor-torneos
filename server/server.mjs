import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {readFileSync,existsSync,mkdirSync,statSync,createReadStream} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {seedState,applyAction,DomainError,migrateState} from '../lib/tournament.mjs';
import {initializeOperations,createOperations,safeUser,passwordFields} from './operations.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(existsSync(resolve(root,'.env')))process.loadEnvFile(resolve(root,'.env'));
const production=process.env.NODE_ENV==='production';
const port=Number(process.env.PORT||3001);
const origin=process.env.PUBLIC_ORIGIN||'http://localhost:3000';
if(new URL(origin).origin!==origin)throw new Error('PUBLIC_ORIGIN debe ser un origen válido sin ruta ni barra final.');
if(production&&(!process.env.PUBLIC_ORIGIN||!origin.startsWith('https://')))throw new Error('Configurá PUBLIC_ORIGIN con HTTPS para producción.');
const allowedOrigins=new Set([origin,...(!production?['http://localhost:3000','http://localhost:3001']:[])]);
const salt=process.env.ADMIN_PASSWORD_SALT;
const passwordHash=process.env.ADMIN_PASSWORD_HASH;
if(!salt||!passwordHash||!/^[a-f0-9]{128}$/.test(passwordHash))throw new Error('Primero ejecutá node scripts/setup.mjs para configurar el administrador.');
const dbPath=resolve(root,process.env.DATABASE_PATH||'data/torneo.sqlite');
mkdirSync(dirname(dbPath),{recursive:true});
const db=new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
db.exec(readFileSync(resolve(root,'server/schema.sql'),'utf8'));
db.prepare('INSERT OR IGNORE INTO tournament(id,revision,document) VALUES(1,0,?)').run(JSON.stringify(seedState()));
const previous=JSON.parse(db.prepare('SELECT document FROM tournament WHERE id=1').get().document);
const migrated=migrateState(previous);
if(migrated!==previous){
 migrated.revision++;migrated.updatedAt=new Date().toISOString();
 db.exec('BEGIN IMMEDIATE');
 try{db.prepare('INSERT INTO audit(created_at,action,previous_document) VALUES(?,?,?)').run(migrated.updatedAt,'migration_v2',JSON.stringify(previous));db.prepare('UPDATE tournament SET revision=?,document=? WHERE id=1').run(migrated.revision,JSON.stringify(migrated));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
initializeOperations(db,{salt,passwordHash},migrated.menu);
const operations=createOperations(db);
db.prepare('DELETE FROM sessions').run();
const hash=s=>createHash('sha256').update(s).digest('hex');
const derive=promisify(scrypt);
const state=()=>JSON.parse(db.prepare('SELECT document FROM tournament WHERE id=1').get().document);
const publicState=()=>({...state(),menu:operations.publicMenu()});
 function headers(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function authenticated(req){const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('padel_session='))?.slice(14);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const user=db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').get(hash(token),Date.now());return user?safeUser(user):null;}
function authorize(req,permission){return operations.authorize(authenticated(req),permission);}
function cookie(token,maxAge=43200){return 'padel_session='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(production?'; Secure':'');}
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw new DomainError('Se requiere JSON.',415);let data='';let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>131072)throw new DomainError('Solicitud demasiado grande.',413);data+=chunk;}try{const parsed=JSON.parse(data);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();return parsed;}catch{throw new DomainError('JSON inválido.');}}
let simultaneousLogins=0;
const server=createServer(async(req,res)=>{
 headers(res);
 try {
  const url=new URL(req.url,'http://internal');const path=url.pathname;
  if(path.startsWith('/api/')){
   if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Método no permitido.'});
   if(req.method==='POST'&&!allowedOrigins.has(req.headers.origin))return json(res,403,{error:'Origen no permitido. Recargá desde la dirección oficial.'});
   if(path==='/api/health'&&req.method==='GET')return json(res,200,{ok:true});
   if(path==='/api/state'&&req.method==='GET')return json(res,200,publicState());
   if(path==='/api/session'&&req.method==='GET'){const user=authenticated(req);return json(res,200,{authenticated:Boolean(user),user});}
   if(path==='/api/login'&&req.method==='POST'){
    const p=await body(req);
    const username=typeof p.username==='string'?p.username.trim().toLowerCase():'admin';
    const user=db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE').get(username);
    if(username.length>40||typeof p.password!=='string'||p.password.length>256)return json(res,400,{error:'Contraseña inválida.'});
    const address=process.env.TRUST_PROXY==='true'?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim():req.socket.remoteAddress;
    const ip=hash(address||'unknown');const now=Date.now();
    db.prepare('DELETE FROM login_attempts WHERE reset_at<?').run(now);
    const attempts=db.prepare('SELECT attempts FROM login_attempts WHERE ip_hash=?').get(ip);
    const total=db.prepare('SELECT SUM(attempts) AS n FROM login_attempts').get().n||0;
    if((attempts?.attempts||0)>=8||total>=100||simultaneousLogins>=4)return json(res,429,{error:'Demasiados intentos. Esperá 15 minutos antes de volver a intentar.'});
    db.prepare('INSERT INTO login_attempts(ip_hash,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(ip_hash) DO UPDATE SET attempts=attempts+1').run(ip,now+900000);
    let derived;simultaneousLogins++;
    try{derived=await derive(p.password,user?.salt||salt,64)}finally{simultaneousLogins--;}
    if(!timingSafeEqual(derived,Buffer.from(user?.password_hash||passwordHash,'hex'))||!user?.active)return json(res,401,{error:'Usuario o contraseña incorrectos.'});
    const current=db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(user.id);
    if(!current||current.version!==user.version)return json(res,401,{error:'El acceso cambió. Volvé a iniciar sesión.'});
    db.prepare('DELETE FROM login_attempts WHERE ip_hash=?').run(ip);
    db.prepare('DELETE FROM sessions WHERE expires_at<?').run(now);
    const token=randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions(token_hash,expires_at,user_id) VALUES(?,?,?)').run(hash(token),now+43200000,user.id);
    res.setHeader('Set-Cookie',cookie(token));return json(res,200,{authenticated:true,user:safeUser(current)});
   }
   if(!authenticated(req))return json(res,401,{error:'Ingresá con tu usuario para continuar.'});
   if(path==='/api/logout'&&req.method==='POST'){const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('padel_session='))?.slice(14);if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));res.setHeader('Set-Cookie',cookie('',0));return json(res,200,{ok:true});}

   if(path==='/api/users'&&req.method==='GET'){const actor=authorize(req,'users.manage');return json(res,200,{users:operations.users(actor),roles:operations.roles});}
   if(path==='/api/users/create'&&req.method==='POST'){const p=await body(req);return json(res,201,await operations.createUser(authorize(req,'users.manage'),p));}
   if(path==='/api/users/update'&&req.method==='POST'){const p=await body(req);return json(res,200,await operations.updateUser(authorize(req,'users.manage'),p));}
   if(path==='/api/password'&&req.method==='POST'){
    const p=await body(req),actor=authorize(req),old=db.prepare('SELECT * FROM users WHERE id=?').get(actor.id);
    if(typeof p.currentPassword!=='string'||p.currentPassword.length>256)throw new DomainError('Contraseña actual inválida.');
    if(simultaneousLogins>=4)throw new DomainError('Esperá unos segundos e intentá otra vez.',429);
    simultaneousLogins++;let valid,fields;
    try{valid=timingSafeEqual(await derive(p.currentPassword,old.salt,64),Buffer.from(old.password_hash,'hex'));if(valid)fields=await passwordFields(p.password);}finally{simultaneousLogins--;}
    if(!valid)throw new DomainError('La contraseña actual no es correcta.',400);
    authorize(req);db.exec('BEGIN IMMEDIATE');
    try{const changed=db.prepare('UPDATE users SET salt=?,password_hash=?,version=version+1 WHERE id=? AND version=? AND active=1').run(fields.salt,fields.password_hash,actor.id,old.version);if(!changed.changes)throw new DomainError('El usuario cambió. Volvé a iniciar sesión.',409);db.prepare('DELETE FROM sessions WHERE user_id=?').run(actor.id);db.prepare('INSERT INTO operations_audit(user_id,created_at,action,record_id,detail) VALUES(?,?,?,?,?)').run(actor.id,new Date().toISOString(),'user.password',actor.id,'{}');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
    res.setHeader('Set-Cookie',cookie('',0));return json(res,200,{ok:true});
   }
   if(path==='/api/food/products'&&req.method==='GET')return json(res,200,operations.catalog(authorize(req,'food.sell')));
   if(path==='/api/food/products/save'&&req.method==='POST'){const p=await body(req);return json(res,200,operations.saveProduct(authorize(req,'food.manage'),p));}
   if(path==='/api/food/stock'&&req.method==='POST'){const p=await body(req);return json(res,200,operations.adjustStock(authorize(req,'food.manage'),p));}
   if(path==='/api/food/movements.csv'&&req.method==='GET'){
    const movements=operations.moves(authorize(req,'food.manage'),true);
    const cell=v=>{const raw=String(v??'');return '"'+(typeof v==='string'&&/^\s*[=+@-]/.test(raw)?"'"+raw:raw).replaceAll('"','""')+'"';};
    const rows=[['ID','Fecha UTC','Producto','Unidades','Tipo','Motivo','Responsable','Venta'],...movements.map(m=>[m.id,m.createdAt,m.name,m.quantity,m.kind,m.reason,m.operator,m.saleId])];
    res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="movimientos-stock.csv"','Cache-Control':'no-store'});return res.end('\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n'));
   }
   if(path==='/api/food/movements'&&req.method==='GET')return json(res,200,operations.moves(authorize(req,'food.manage')));
   if(path==='/api/food/sales'&&req.method==='GET')return json(res,200,operations.salesList(authorize(req,'food.sell'),Object.fromEntries(url.searchParams)));
   if(path==='/api/food/sales'&&req.method==='POST'){const p=await body(req);return json(res,200,operations.sell(authorize(req,'food.sell'),p));}
   if(path==='/api/food/void'&&req.method==='POST'){const p=await body(req);return json(res,200,operations.voidSale(authorize(req,'food.void'),p));}
   if(path==='/api/food/report'&&req.method==='GET')return json(res,200,operations.report(authorize(req,'food.report'),Object.fromEntries(url.searchParams)));
   if(path==='/api/food/report.csv'&&req.method==='GET'){
    const report=operations.report(authorize(req,'food.report'),Object.fromEntries(url.searchParams));
    const cell=v=>{const raw=String(v);return '"'+(typeof v==='string'&&/^\s*[=+@-]/.test(raw)?"'"+raw:raw).replaceAll('"','""')+'"';};
    const rows=[['Reporte de ventas (Gs.)',report.from,report.to],['Ventas confirmadas',report.totals.sales],['Unidades',report.totals.units],['Ingresos',report.totals.revenue],['Costo vendido',report.totals.cost],['Margen bruto',report.totals.margin],['Efectivo',report.totals.cash],['Transferencia',report.totals.transfer],['Ventas anuladas',report.totals.voidedSales],[],['Producto','Unidades','Ingresos','Costo vendido','Margen bruto'],...report.products.map(p=>[p.name,p.units,p.revenue,p.cost,p.margin]),[],['Operador','Unidades','Ingresos','Costo vendido','Margen bruto'],...report.operators.map(p=>[p.name,p.units,p.revenue,p.cost,p.margin]),[],['Fecha','Unidades','Ingresos','Costo vendido','Margen bruto'],...report.days.map(p=>[p.name,p.units,p.revenue,p.cost,p.margin])];
    res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="reporte-comidas.csv"','Cache-Control':'no-store'});return res.end('\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n'));
   }
   if(path==='/api/food/note'&&req.method==='POST'){
    const p=await body(req),actor=authorize(req,'food.manage');db.exec('BEGIN IMMEDIATE');
    try{const current=state();if(p.revision!==current.revision)throw new DomainError('La información cambió. Recargá antes de guardar.',409);const next=applyAction(current,{type:'config',payload:{foodNote:p.note}});db.prepare('UPDATE tournament SET revision=?,document=? WHERE id=1').run(next.revision,JSON.stringify(next));db.prepare('INSERT INTO audit(created_at,action,previous_document,user_id) VALUES(?,?,?,?)').run(next.updatedAt,'food.note',JSON.stringify(current),actor.id);db.exec('COMMIT');return json(res,200,publicState());}catch(e){db.exec('ROLLBACK');throw e;}
   }
   if(path==='/api/export'&&req.method==='GET'){authorize(req,'tournament.manage');res.setHeader('Content-Disposition','attachment; filename="torneo-respaldo.json"');return json(res,200,{exportedAt:new Date().toISOString(),state:publicState()});}
   if(path==='/api/audit'&&req.method==='GET'){authorize(req,'tournament.manage');return json(res,200,db.prepare('SELECT a.id,a.created_at,a.action,u.name AS operator FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 30').all());}
   if(path==='/api/action'&&req.method==='POST'){
    const action=await body(req),actor=authorize(req,'tournament.manage');
    if(action.type==='menu')throw new DomainError('Usá el módulo de comidas para editar productos y stock.');
    if(action.type==='config'&&action.payload&&'foodNote' in action.payload)operations.authorize(actor,'food.manage');
    db.exec('BEGIN IMMEDIATE');
    try{const current=state();if(action.revision!==current.revision)throw new DomainError('Hay cambios más recientes. Recargá los datos antes de guardar.',409);const next=applyAction(current,action);db.prepare('INSERT INTO audit(created_at,action,previous_document,user_id) VALUES(?,?,?,?)').run(next.updatedAt,action.type,JSON.stringify(current),actor.id);db.prepare('UPDATE tournament SET revision=?,document=? WHERE id=1').run(next.revision,JSON.stringify(next));db.prepare('DELETE FROM audit WHERE id NOT IN (SELECT id FROM audit ORDER BY id DESC LIMIT 100)').run();db.exec('COMMIT');return json(res,200,publicState());}catch(e){db.exec('ROLLBACK');throw e;}
   }

   return json(res,404,{error:'Ruta inexistente.'});
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Método no permitido.'});
  const webRoot=resolve(root,'dist-web');
  let relative=decodeURIComponent(path).replace(/^\/+/, '');
  if(['','admin','admin/','pantalla','pantalla/','caja','caja/'].includes(relative))relative='index.html';
  const file=resolve(webRoot,relative);
  if(!file.startsWith(webRoot+sep)||!existsSync(file)||!statSync(file).isFile())return json(res,404,{error:'Página no encontrada.'});
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':relative.startsWith('assets/')?'public, max-age=31536000, immutable':'no-cache'});
  if(req.method==='HEAD')return res.end();
  if(relative==='index.html'){
   const c=state().config;
   const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
   return res.end(readFileSync(file,'utf8').replaceAll('__PUBLIC_ORIGIN__',escape(origin)).replaceAll('__SITE_TITLE__',escape(c.title+' | '+c.sport)).replaceAll('__SITE_DESCRIPTION__',escape(c.subtitle)));
  }
  createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 } catch(e){if(!res.headersSent)json(res,e instanceof DomainError?e.status:500,{error:e instanceof DomainError?e.message:'No se pudo completar la operación.'});else res.destroy();if(!(e instanceof DomainError))console.error('Error interno:',e.message);}
});
server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log('Servidor del torneo: http://localhost:'+server.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0)}));
