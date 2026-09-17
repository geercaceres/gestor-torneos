import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scryptSync} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));
const password='test-only-strong-password-947';
const salt='test-salt-not-used-in-production';
async function start(dbPath){
 const child=spawn(process.execPath,['server/server.mjs'],{cwd:root,env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:'0',DATABASE_PATH:dbPath,PUBLIC_ORIGIN:'http://localhost:3000',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:scryptSync(password,salt,64).toString('hex')},stdio:['ignore','pipe','pipe']});
 const base=await new Promise((res,rej)=>{let output='';const timeout=setTimeout(()=>{child.kill();rej(new Error('No inició el servidor'))},15000);child.stdout.on('data',chunk=>{output+=chunk;const port=output.match(/localhost:(\d+)/);if(port){clearTimeout(timeout);res('http://127.0.0.1:'+port[1])}});child.on('exit',code=>{clearTimeout(timeout);rej(new Error('Servidor terminó: '+code))});child.stderr.on('data',chunk=>{output+=chunk});});
 return{base,child,stop:()=>new Promise(res=>{child.once('exit',res);child.kill()})};
}
test('API: autenticación, CSRF, concurrencia, persistencia, exportación y límites',async()=>{
 const folder=mkdtempSync(resolve(tmpdir(),'padel-tests-'));let server=await start(resolve(folder,'test.sqlite'));
 const call=(path,body,cookie='',origin='http://localhost:3000')=>fetch(server.base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
 try{
  let r=await call('state');assert.equal(r.status,200);const initial=await r.json();assert.equal(initial.matches.length,15);assert.equal(r.headers.get('cache-control'),'no-store');assert.ok(!JSON.stringify(initial).includes('PASSWORD'));
  r=await call('action',{type:'config',revision:0,payload:{title:'No autorizado'}});assert.equal(r.status,401);
  r=await call('login',{password},'','https://evil.test');assert.equal(r.status,403);
  r=await call('login',{password:'incorrecta'});assert.equal(r.status,401);
  r=await call('login',{password});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];assert.ok(r.headers.get('set-cookie').includes('HttpOnly'));assert.ok(r.headers.get('set-cookie').includes('SameSite=Strict'));
  r=await call('session',undefined,cookie);assert.equal((await r.json()).authenticated,true);
  r=await call('action',{type:'config',revision:0,payload:{announcement:'Aviso de prueba'}},cookie);assert.equal(r.status,200);assert.equal((await r.json()).revision,1);
  r=await call('action',{type:'config',revision:0,payload:{announcement:'Versión desactualizada'}},cookie);assert.equal(r.status,409);
  r=await call('state');assert.equal((await r.json()).config.announcement,'Aviso de prueba');
  r=await call('action',{type:'config',revision:1,payload:{prize:-5}},cookie);assert.equal(r.status,400);
  r=await call('state');assert.equal((await r.json()).revision,1);
  r=await call('export',undefined,cookie);assert.equal(r.status,200);assert.ok(r.headers.get('content-disposition').includes('attachment'));assert.equal((await r.json()).state.revision,1);
  r=await call('audit',undefined,cookie);assert.equal((await r.json()).length,1);
  r=await call('logout',{},cookie);assert.equal(r.status,200);
  r=await call('action',{type:'config',revision:1,payload:{}},cookie);assert.equal(r.status,401);
  for(let i=0;i<8;i++){r=await call('login',{password:'incorrecta'});assert.equal(r.status,401);}
  r=await call('login',{password});assert.equal(r.status,429);
  await server.stop();server=await start(resolve(folder,'test.sqlite'));
  r=await call('state');assert.equal((await r.json()).config.announcement,'Aviso de prueba');
  r=await call('session',undefined,cookie);assert.equal((await r.json()).authenticated,false);
  if(process.env.TEST_STATIC==='true'){for(const path of ['/','/admin','/pantalla']){r=await fetch(server.base+path);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('http://localhost:3000/afiche.png'));assert.ok(!html.includes('__PUBLIC_ORIGIN__'));}r=await fetch(server.base+'/.env');assert.equal(r.status,404);}
 }finally{await server.stop();assert.ok(resolve(folder).startsWith(resolve(tmpdir(),'padel-tests-')));rmSync(folder,{recursive:true,force:true});}
});



test('API multiusuario: permisos, ventas concurrentes, costos privados y revocación',async()=>{
 const folder=mkdtempSync(resolve(tmpdir(),'padel-tests-'));let server=await start(resolve(folder,'food.sqlite'));
 const call=(path,body,cookie='')=>fetch(server.base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
 const login=async(username,secret=password)=>{const r=await call('login',{username,password:secret});assert.equal(r.status,200);const body=await r.json();return{cookie:r.headers.get('set-cookie').split(';')[0],user:body.user};};
 const create=async(admin,username,role)=>{const r=await call('users/create',{username,name:username,role,password},admin);assert.equal(r.status,201);return r.json();};
 try{
  const admin=await login('admin');
  const cashier1=await create(admin.cookie,'mesa1','cashier'),cashier2=await create(admin.cookie,'mesa2','cashier'),manager=await create(admin.cookie,'comidas','food_manager'),organizer=await create(admin.cookie,'organiza','tournament');
  let a=await login('mesa1'),b=await login('mesa2'),m=await login('comidas'),o=await login('organiza');
  for(const path of ['users','food/report','food/report.csv','food/movements','food/movements.csv','export','audit'])assert.equal((await call(path,undefined,a.cookie)).status,403,path);
  assert.equal((await call('users/create',{username:'invasor',name:'Invasor',role:'admin',password},m.cookie)).status,403);
  assert.equal((await call('action',{type:'config',revision:0,payload:{title:'No permitido'},role:'admin'},a.cookie)).status,403);
  assert.equal((await call('food/products',undefined,o.cookie)).status,403);
  let r=await call('food/products/save',{name:'Empanada',description:'',price:10000,unitCost:4000,initialStock:1,active:true},m.cookie);assert.equal(r.status,200);const id=(await r.json()).id;
  r=await call('food/products',undefined,a.cookie);const catalog=await r.json();assert.equal(catalog[0].stock,1);assert.equal(catalog[0].unitCost,undefined);
  r=await call('state');const pub=await r.json();assert.equal(pub.menu[0].price,10000);assert.ok(!('unitCost'in pub.menu[0]));assert.ok(!('stock'in pub.menu[0]));
  const payload=key=>({requestKey:key,payment:'cash',items:[{productId:id,quantity:1,expectedPrice:10000}],user_id:admin.user.id,role:'admin'});
  const raced=await Promise.all([call('food/sales',payload('same-stock-request-A'),a.cookie),call('food/sales',payload('same-stock-request-B'),b.cookie)]);
  assert.deepEqual(raced.map(r=>r.status).sort(),[200,409]);
  const success=await raced.find(r=>r.status===200).json();assert.ok([cashier1.id,cashier2.id].includes(success.userId));assert.ok(!('cost'in success));assert.ok(!('unitCost'in success.items[0]));
  const winner=success.userId===a.user.id?a:b,loser=success.userId===a.user.id?b:a,key=success.userId===a.user.id?'same-stock-request-A':'same-stock-request-B';
  const repeats=await Promise.all([call('food/sales',payload(key),winner.cookie),call('food/sales',payload(key),winner.cookie)]);for(const repeat of repeats){assert.equal(repeat.status,200);assert.equal((await repeat.json()).id,success.id);}
  assert.equal((await (await call('food/products',undefined,m.cookie)).json())[0].stock,0);
  const own=await (await call('food/sales',undefined,loser.cookie)).json();assert.equal(own.length,0);
  const report=await (await call('food/report',undefined,m.cookie)).json();assert.equal(report.totals.sales,1);assert.equal(report.totals.revenue,10000);assert.equal(report.totals.cost,4000);
  assert.equal((await call('food/void',{id:success.id,reason:'Error',returnToStock:true},winner.cookie)).status,403);
  assert.equal((await call('food/void',{id:success.id,reason:'Prueba de devolución',returnToStock:true},m.cookie)).status,200);
  assert.equal((await call('food/void',{id:success.id,reason:'Reintento',returnToStock:true},m.cookie)).status,200);
  assert.equal((await (await call('food/products',undefined,m.cookie)).json())[0].stock,1);
  assert.equal((await (await call('food/report',undefined,m.cookie)).json()).totals.sales,0);
  assert.equal((await (await call('food/sales',payload(key),winner.cookie)).json()).status,'voided');
  assert.equal((await call('food/products/save',{id,version:1,name:'Empanada',description:'',price:10000,unitCost:4000,active:true},a.cookie)).status,403);
  r=await call('food/movements.csv',undefined,m.cookie);assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/attachment/);assert.ok((await r.text()).includes('Empanada'));
  r=await call('food/report.csv',undefined,m.cookie);assert.equal(r.status,200);assert.ok((await r.text()).includes('Margen bruto'));
  r=await call('users/update',{...cashier1,active:false},admin.cookie);assert.equal(r.status,200);
  assert.equal((await call('food/products',undefined,a.cookie)).status,401);
  assert.equal((await call('login',{username:'mesa1',password})).status,401);
  assert.equal((await call('users/update',{...admin.user,role:'cashier'},admin.cookie)).status,400);
  const newPassword='changed-admin-password-for-tests';
  assert.equal((await call('password',{currentPassword:password,password:newPassword},admin.cookie)).status,200);
  assert.equal((await call('users',undefined,admin.cookie)).status,401);
  await server.stop();server=await start(resolve(folder,'food.sqlite'));
  const relogged=await login('admin',newPassword);
  assert.equal((await call('users',undefined,relogged.cookie)).status,200);
  assert.equal((await (await call('food/report',undefined,relogged.cookie)).json()).totals.voidedSales,1);
  assert.equal((await (await call('food/products',undefined,relogged.cookie)).json())[0].stock,1);
 }finally{await server.stop();assert.ok(resolve(folder).startsWith(resolve(tmpdir(),'padel-tests-')));rmSync(folder,{recursive:true,force:true});}
});
