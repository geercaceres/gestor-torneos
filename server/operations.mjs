
import {randomBytes,scrypt,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {DomainError} from '../lib/tournament.mjs';
const derive=promisify(scrypt);
export const ROLES={
 admin:{label:'Administrador',permissions:['tournament.manage','food.sell','food.manage','food.report','food.void','users.manage']},
 tournament:{label:'Organización del torneo',permissions:['tournament.manage']},
 food_manager:{label:'Responsable de comidas',permissions:['food.sell','food.manage','food.report','food.void']},
 cashier:{label:'Mesa de ventas',permissions:['food.sell']}
};
const requireValue=(ok,message,status=400)=>{if(!ok)throw new DomainError(message,status)};
const text=(v,max=150,required=true)=>{requireValue(typeof v==='string'&&v.length<=max,'Texto inválido o demasiado largo.');const s=v.trim();requireValue(!required||s.length>0,'Completá los campos obligatorios.');return s;};
const int=(v,min=0,max=10000000)=>{requireValue(Number.isSafeInteger(v)&&v>=min&&v<=max,'Cantidad o importe fuera de rango.');return v;};
export const safeUser=u=>({id:u.id,username:u.username,name:u.name,role:u.role,active:Boolean(u.active),version:u.version,permissions:ROLES[u.role]?.permissions||[],roleLabel:ROLES[u.role]?.label||u.role});
export async function passwordFields(password){requireValue(typeof password==='string'&&password.length>=12&&password.length<=256,'La contraseña debe tener entre 12 y 256 caracteres.');const salt=randomBytes(32).toString('hex');return {salt,password_hash:(await derive(password,salt,64)).toString('hex')};}
export function initializeOperations(db,bootstrap,oldMenu=[]){
 db.exec(`
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT NOT NULL UNIQUE COLLATE NOCASE,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','tournament','food_manager','cashier')),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),salt TEXT NOT NULL,password_hash TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',price INTEGER NOT NULL CHECK(price>=0),unit_cost INTEGER CHECK(unit_cost>=0),stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0),active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS sales(id INTEGER PRIMARY KEY,request_key TEXT NOT NULL,payload_hash TEXT NOT NULL,user_id INTEGER NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,business_date TEXT NOT NULL,payment TEXT NOT NULL CHECK(payment IN ('cash','transfer')),status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','voided')),voided_by INTEGER REFERENCES users(id),voided_at TEXT,void_reason TEXT,UNIQUE(user_id,request_key));
 CREATE TABLE IF NOT EXISTS sale_items(id INTEGER PRIMARY KEY,sale_id INTEGER NOT NULL REFERENCES sales(id),product_id INTEGER NOT NULL REFERENCES products(id),name TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),unit_price INTEGER NOT NULL CHECK(unit_price>=0),unit_cost INTEGER NOT NULL CHECK(unit_cost>=0));
 CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(business_date,id);
 CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id,id);
 CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
 CREATE TABLE IF NOT EXISTS stock_moves(id INTEGER PRIMARY KEY,product_id INTEGER NOT NULL REFERENCES products(id),user_id INTEGER REFERENCES users(id),sale_id INTEGER REFERENCES sales(id),created_at TEXT NOT NULL,quantity INTEGER NOT NULL,reason TEXT NOT NULL,kind TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS operations_audit(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),created_at TEXT NOT NULL,action TEXT NOT NULL,record_id INTEGER,detail TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS app_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 `);
 if(!db.prepare('PRAGMA table_info(products)').all().some(c=>c.name==='low_stock_threshold'))db.exec('ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 0 CHECK(low_stock_threshold>=0 AND low_stock_threshold<=1000000)');
 if(!db.prepare('PRAGMA table_info(sessions)').all().some(c=>c.name==='user_id'))db.exec('ALTER TABLE sessions ADD COLUMN user_id INTEGER REFERENCES users(id)');
 if(!db.prepare('PRAGMA table_info(audit)').all().some(c=>c.name==='user_id'))db.exec('ALTER TABLE audit ADD COLUMN user_id INTEGER REFERENCES users(id)');
 db.exec('BEGIN IMMEDIATE');
 try{
  db.prepare("INSERT OR IGNORE INTO users(username,name,role,active,salt,password_hash,created_at) VALUES('admin','Administrador','admin',1,?,?,?)").run(bootstrap.salt,bootstrap.passwordHash,new Date().toISOString());
  if(!db.prepare("SELECT value FROM app_meta WHERE key='food_migrated'").get()){
   for(const item of oldMenu)db.prepare('INSERT INTO products(name,description,price,unit_cost,stock,active) VALUES(?,?,?,NULL,0,1)').run(item.name,item.description||'',item.price);
   db.prepare("INSERT INTO app_meta(key,value) VALUES('food_migrated','1')").run();
  }
  db.exec('PRAGMA user_version=4; COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function createOperations(db){
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e;}};
 const now=()=>new Date().toISOString();
 const audit=(actor,action,id,detail)=>db.prepare('INSERT INTO operations_audit(user_id,created_at,action,record_id,detail) VALUES(?,?,?,?,?)').run(actor.id,now(),action,id,JSON.stringify(detail));
 function authorize(actor,permission){const current=actor&&db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(actor.id);requireValue(current,'La sesión ya no está habilitada.',401);requireValue(!permission||ROLES[current.role].permissions.includes(permission),'Tu usuario no tiene permiso para esta operación.',403);return safeUser(current);}
 function catalog(actor){const a=authorize(actor,'food.sell'),manage=a.permissions.includes('food.manage');return db.prepare('SELECT * FROM products ORDER BY active DESC,name,id').all().filter(p=>manage||p.active).map(p=>({id:p.id,name:p.name,description:p.description,price:p.price,stock:p.stock,lowStockThreshold:p.low_stock_threshold,active:Boolean(p.active),version:p.version,ready:p.unit_cost!==null,...(manage?{unitCost:p.unit_cost}:{})}));}
 const publicMenu=()=>db.prepare('SELECT id,name,description,price,stock FROM products WHERE active=1 ORDER BY id').all().map(p=>({id:p.id,name:p.name,description:p.description,price:p.price,available:p.stock>0}));
 function saveProduct(actor,p){return transaction(()=>{
  const a=authorize(actor,'food.manage'),name=text(p.name,100),description=text(p.description??'',250,false),price=int(p.price),unitCost=int(p.unitCost),active=Boolean(p.active);
  let id;
  if(p.id){const old=db.prepare('SELECT * FROM products WHERE id=?').get(int(p.id,1));requireValue(old,'Producto inexistente.',404);requireValue(p.version===old.version,'El producto cambió. Recargá antes de guardar.',409);
   db.prepare('UPDATE products SET name=?,description=?,price=?,unit_cost=?,active=?,version=version+1 WHERE id=?').run(name,description,price,unitCost,active?1:0,old.id);id=old.id;
  }else{const initialStock=int(p.initialStock??0,0,1000000);id=Number(db.prepare('INSERT INTO products(name,description,price,unit_cost,stock,active) VALUES(?,?,?,?,?,?)').run(name,description,price,unitCost,initialStock,active?1:0).lastInsertRowid);if(initialStock)db.prepare("INSERT INTO stock_moves(product_id,user_id,created_at,quantity,reason,kind) VALUES(?,?,?,?,'Stock inicial','restock')").run(id,a.id,now(),initialStock);}
  if(p.lowStockThreshold!==undefined)db.prepare('UPDATE products SET low_stock_threshold=? WHERE id=?').run(int(p.lowStockThreshold,0,1000000),id);
  audit(a,'product.save',id,{name,price,unitCost,active,lowStockThreshold:p.lowStockThreshold});return{id};
 });}
 function adjustStock(actor,p){return transaction(()=>{
  const a=authorize(actor,'food.manage'),id=int(p.id,1),delta=int(p.quantity,-1000000,1000000),reason=text(p.reason,300),kind=text(p.kind,30);
  requireValue(delta!==0,'La cantidad debe ser distinta de cero.');
  requireValue(['restock','waste','correction'].includes(kind),'Tipo de movimiento inválido.');
  requireValue(kind!=='restock'||delta>0,'Una reposición debe sumar stock.');
  requireValue(kind!=='waste'||delta<0,'Una merma debe descontar stock.');
  const old=db.prepare('SELECT * FROM products WHERE id=?').get(id);requireValue(old,'Producto inexistente.',404);requireValue(p.version===old.version,'El stock cambió. Recargá antes de ajustar.',409);
  requireValue(old.stock+delta>=0&&old.stock+delta<=1000000,'El ajuste dejaría un stock inválido.');
  db.prepare('UPDATE products SET stock=stock+?,version=version+1 WHERE id=?').run(delta,id);
  db.prepare('INSERT INTO stock_moves(product_id,user_id,created_at,quantity,reason,kind) VALUES(?,?,?,?,?,?)').run(id,a.id,now(),delta,reason,kind);
  audit(a,'stock.adjust',id,{quantity:delta,reason,kind});return{stock:old.stock+delta};
 });}
 function saleView(actor,id){const a=authorize(actor,'food.sell');const sale=db.prepare('SELECT s.*,u.name AS operator FROM sales s JOIN users u ON u.id=s.user_id WHERE s.id=?').get(id);requireValue(sale,'Venta inexistente.',404);requireValue(sale.user_id===a.id||a.permissions.includes('food.report'),'No podés consultar ventas de otra persona.',403);
  const lines=db.prepare('SELECT product_id,name,quantity,unit_price,unit_cost FROM sale_items WHERE sale_id=? ORDER BY id').all(sale.id);
  return {id:sale.id,userId:sale.user_id,operator:sale.operator,createdAt:sale.created_at,date:sale.business_date,payment:sale.payment,status:sale.status,voidReason:sale.void_reason,total:lines.reduce((v,l)=>v+l.quantity*l.unit_price,0),units:lines.reduce((v,l)=>v+l.quantity,0),...(a.permissions.includes('food.report')?{cost:lines.reduce((v,l)=>v+l.quantity*l.unit_cost,0)}:{}),items:lines.map(l=>({productId:l.product_id,name:l.name,quantity:l.quantity,unitPrice:l.unit_price,...(a.permissions.includes('food.report')?{unitCost:l.unit_cost}:{})}))};
 }
 function sell(actor,p){return transaction(()=>{
  const a=authorize(actor,'food.sell'),key=text(p.requestKey,80);requireValue(/^[a-zA-Z0-9-]{16,80}$/.test(key),'Identificador de venta inválido.');
  requireValue(['cash','transfer'].includes(p.payment),'Seleccioná efectivo o transferencia.');
  requireValue(Array.isArray(p.items)&&p.items.length>0&&p.items.length<=50,'La venta debe tener entre 1 y 50 productos.');
  const items=p.items.map(item=>({productId:int(item.productId,1),quantity:int(item.quantity,1,1000),expectedPrice:int(item.expectedPrice)})).sort((a,b)=>a.productId-b.productId);
  requireValue(new Set(items.map(i=>i.productId)).size===items.length,'Unificá las cantidades de cada producto.');
  const fingerprint=createHash('sha256').update(JSON.stringify({payment:p.payment,items})).digest('hex');
  const prior=db.prepare('SELECT id,payload_hash FROM sales WHERE user_id=? AND request_key=?').get(a.id,key);
  if(prior){requireValue(prior.payload_hash===fingerprint,'Este identificador ya corresponde a otra venta.',409);return {...saleView(a,prior.id),replayed:true};}
  const rows=items.map(item=>{const product=db.prepare('SELECT * FROM products WHERE id=?').get(item.productId);requireValue(product&&product.active,'Un producto ya no está disponible.',409);requireValue(product.unit_cost!==null,'La organización debe completar el costo del producto antes de venderlo.',409);requireValue(product.price===item.expectedPrice,'Cambió un precio. Revisá el carrito antes de confirmar.',409);requireValue(product.stock>=item.quantity,'Stock insuficiente para '+product.name+'. Actualizá las cantidades.',409);return {item,product};});
  const stamp=now(),businessDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(stamp));
  const id=Number(db.prepare('INSERT INTO sales(request_key,payload_hash,user_id,created_at,business_date,payment) VALUES(?,?,?,?,?,?)').run(key,fingerprint,a.id,stamp,businessDate,p.payment).lastInsertRowid);
  for(const {item,product} of rows){
   db.prepare('INSERT INTO sale_items(sale_id,product_id,name,quantity,unit_price,unit_cost) VALUES(?,?,?,?,?,?)').run(id,product.id,product.name,item.quantity,product.price,product.unit_cost);
   db.prepare('UPDATE products SET stock=stock-?,version=version+1 WHERE id=?').run(item.quantity,product.id);
   db.prepare("INSERT INTO stock_moves(product_id,user_id,sale_id,created_at,quantity,reason,kind) VALUES(?,?,?,?,?,?,'sale')").run(product.id,a.id,id,stamp,-item.quantity,'Venta #'+id);
  }
  audit(a,'sale.create',id,{payment:p.payment,lines:items.length});return saleView(a,id);
 });}
 function voidSale(actor,p){return transaction(()=>{
  const a=authorize(actor,'food.void'),id=int(p.id,1),reason=text(p.reason,300);requireValue(typeof p.returnToStock==='boolean','Indicá si los productos regresan físicamente al stock.');
  const sale=db.prepare('SELECT * FROM sales WHERE id=?').get(id);requireValue(sale,'Venta inexistente.',404);
  if(sale.status==='voided')return {...saleView(a,id),replayed:true};
  const lines=db.prepare('SELECT * FROM sale_items WHERE sale_id=?').all(id),stamp=now();
  for(const line of lines){
   if(p.returnToStock){const current=db.prepare('SELECT stock FROM products WHERE id=?').get(line.product_id);requireValue(current.stock+line.quantity<=1000000,'El stock resultante supera el límite.');db.prepare('UPDATE products SET stock=stock+?,version=version+1 WHERE id=?').run(line.quantity,line.product_id);}
   db.prepare('INSERT INTO stock_moves(product_id,user_id,sale_id,created_at,quantity,reason,kind) VALUES(?,?,?,?,?,?,?)').run(line.product_id,a.id,id,stamp,p.returnToStock?line.quantity:0,reason,p.returnToStock?'void_return':'void_no_return');
  }
  db.prepare("UPDATE sales SET status='voided',voided_by=?,voided_at=?,void_reason=? WHERE id=?").run(a.id,stamp,reason,id);
  audit(a,'sale.void',id,{reason,returnToStock:p.returnToStock});return saleView(a,id);
 });}
 function dates(query={}){const from=query.from||'0001-01-01',to=query.to||'9999-12-31';for(const d of [from,to])requireValue(/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d,'Fecha de reporte inválida.');requireValue(from<=to,'El rango de fechas está invertido.');return [from,to];}
 function salesList(actor,query={}){const a=authorize(actor,'food.sell'),[from,to]=dates(query);const all=a.permissions.includes('food.report');let before=Number.MAX_SAFE_INTEGER;if(query.before){requireValue(/^\d+$/.test(query.before),'Página de ventas inválida.');before=int(Number(query.before),1,Number.MAX_SAFE_INTEGER);}const rows=db.prepare('SELECT id FROM sales WHERE business_date BETWEEN ? AND ? AND id<?'+(all?'':' AND user_id=?')+' ORDER BY id DESC LIMIT 100').all(...(all?[from,to,before]:[from,to,before,a.id]));return rows.map(r=>saleView(a,r.id));}
 function report(actor,query={}){
  authorize(actor,'food.report');const [from,to]=dates(query);
  const rows=db.prepare("SELECT s.id,s.user_id,u.name AS operator,s.business_date,s.payment,s.status,i.product_id,i.name,i.quantity,i.unit_price,i.unit_cost FROM sales s JOIN users u ON u.id=s.user_id JOIN sale_items i ON i.sale_id=s.id WHERE s.business_date BETWEEN ? AND ? ORDER BY s.id,i.id").all(from,to);
  const products=new Map(),operators=new Map(),days=new Map(),tickets=new Set(),voids=new Set();
  const totals={revenue:0,cost:0,margin:0,units:0,sales:0,voidedSales:0,cash:0,transfer:0};
  for(const r of rows){if(r.status==='voided'){voids.add(r.id);continue;}tickets.add(r.id);const revenue=r.quantity*r.unit_price,cost=r.quantity*r.unit_cost;totals.revenue+=revenue;totals.cost+=cost;totals.units+=r.quantity;totals[r.payment]+=revenue;
   for(const [map,key,label]of [[products,r.product_id,r.name],[operators,r.user_id,r.operator],[days,r.business_date,r.business_date]]){
    const item=map.get(key)||{id:key,name:label,units:0,revenue:0,cost:0,margin:0};item.units+=r.quantity;item.revenue+=revenue;item.cost+=cost;item.margin=item.revenue-item.cost;map.set(key,item);
   }
  }
  totals.sales=tickets.size;totals.voidedSales=voids.size;totals.margin=totals.revenue-totals.cost;
  return {from,to,totals,products:[...products.values()],operators:[...operators.values()],days:[...days.values()]};
 }
 function moves(actor,all=false){authorize(actor,'food.manage');return db.prepare('SELECT m.id,m.created_at AS createdAt,m.product_id AS productId,p.name,m.quantity,m.kind,m.reason,u.name AS operator,m.sale_id AS saleId FROM stock_moves m JOIN products p ON p.id=m.product_id LEFT JOIN users u ON u.id=m.user_id ORDER BY m.id DESC'+(all?'':' LIMIT 100')).all();}
 function users(actor){authorize(actor,'users.manage');return db.prepare('SELECT * FROM users ORDER BY id').all().map(safeUser);}
 async function createUser(actor,p){
  authorize(actor,'users.manage');const username=text(p.username,40).toLowerCase();requireValue(/^[a-z0-9._-]{3,40}$/.test(username),'Usá 3 a 40 letras, números, puntos o guiones para el usuario.');const name=text(p.name,100);requireValue(Object.hasOwn(ROLES,p.role),'Rol inválido.');const credentials=await passwordFields(p.password);
  return transaction(()=>{const a=authorize(actor,'users.manage');requireValue(!db.prepare('SELECT id FROM users WHERE username=? COLLATE NOCASE').get(username),'Ese usuario ya existe.',409);const id=Number(db.prepare('INSERT INTO users(username,name,role,salt,password_hash,created_at) VALUES(?,?,?,?,?,?)').run(username,name,p.role,credentials.salt,credentials.password_hash,now()).lastInsertRowid);audit(a,'user.create',id,{username,name,role:p.role});return safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));});
 }
 async function updateUser(actor,p){
  authorize(actor,'users.manage');const credentials=p.password?await passwordFields(p.password):null;
  return transaction(()=>{const a=authorize(actor,'users.manage'),id=int(p.id,1),old=db.prepare('SELECT * FROM users WHERE id=?').get(id);requireValue(old,'Usuario inexistente.',404);requireValue(old.version===p.version,'El usuario cambió. Recargá antes de guardar.',409);const name=text(p.name,100);requireValue(Object.hasOwn(ROLES,p.role),'Rol inválido.');requireValue(typeof p.active==='boolean','Estado de usuario inválido.');
   requireValue(id!==a.id||p.active,'No podés desactivar tu propio acceso.');requireValue(!(old.role==='admin'&&old.active&&(!p.active||p.role!=='admin'))||db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1 AND id!=?").get(id).n>0,'Debe quedar al menos un administrador activo.');
   db.prepare('UPDATE users SET name=?,role=?,active=?,version=version+1 WHERE id=?').run(name,p.role,p.active?1:0,id);
   if(credentials)db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(credentials.salt,credentials.password_hash,id);
   db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
   audit(a,'user.update',id,{name,role:p.role,active:p.active,passwordChanged:Boolean(credentials)});return safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
  });
 }
 return {authorize,catalog,publicMenu,saveProduct,adjustStock,sell,voidSale,saleView,salesList,report,moves,users,createUser,updateUser,roles:ROLES};
}
