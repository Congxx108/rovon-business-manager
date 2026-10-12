import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const root=path.resolve(import.meta.dirname,'..');
const db=new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create table orders(id uuid primary key default gen_random_uuid(),order_no text not null unique,
    order_date date not null,customer_name text,contact text,country text,product_line text,
    quantity integer default 1,sales_amount_rmb numeric default 100,order_status text,
    payment_status text,deposit_amount_rmb numeric,payment_currency text,rmb_payment_method text,payment_remark text,
    shipping_status text,shipping_method text,shipping_company text,tracking_no text,shipping_date date,shipping_remark text,
    is_refund_or_cancelled boolean default false,remark text,
    created_at timestamptz default now(),updated_at timestamptz default now());
  create function set_updated_at() returns trigger language plpgsql as $$begin new.updated_at:=now();return new;end$$;
  create trigger set_orders_updated_at before update on orders for each row execute function set_updated_at();
  create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid references orders(id) on delete cascade,
    product_line text,quantity integer,sales_amount_rmb numeric,sort_order integer);
  create table trade_documents(id uuid primary key default gen_random_uuid(),order_id uuid references orders(id) on delete set null,data jsonb);
  grant all on orders,order_items to service_role;
  insert into orders(order_no,order_date,customer_name,created_at,updated_at) values
    ('ROVON-20261010-010001','2026-10-10','TEST Latest','2026-10-10','2026-10-10'),
    ('IMPORT-20260901-0002','2026-10-01','TEST Imported','2026-10-02','2026-10-02'),
    ('CONTRACT-TEST','2026-10-01','TEST Contract','2026-10-01','2026-10-01'),
    ('ROVON-20260917-010001','2026-09-17','TEST Previous','2026-09-17','2026-09-17'),
    ('IMPORT-20250601-0002','2025-06-01','TEST Historic','2025-06-01','2025-06-01');
  insert into order_items(order_id,product_line,quantity,sales_amount_rmb,sort_order)
    select id,'女包',1,100,0 from orders;
  insert into trade_documents(order_id,data) select id,'{"test":"original PDF snapshot"}' from orders limit 1;
`);
const before=(await db.query('select id,to_jsonb(o)-\'order_no\' as data from orders o order by id')).rows;
const itemBefore=(await db.query('select * from order_items order by id')).rows;
const documentsBefore=(await db.query('select * from trade_documents order by id')).rows;
const preparation=await fs.readFile(path.join(root,'supabase/migrations/20261012100807_monthly_order_numbers.sql'),'utf8');
await db.exec(preparation);
assert.deepEqual((await db.query('select id,to_jsonb(o)-\'order_no\'-\'legacy_order_no\' as data from orders o order by id')).rows,before,'preparation does not change business data or existing numbers');
await db.exec('begin;');
const staged=(await db.query("insert into orders(order_date,order_no) values('2026-10-12',null) returning order_no")).rows[0];
assert.match(staged.order_no,/^ROVON-20261012-\d{6}$/,'blank-number create works before activation');
await db.exec('rollback;');
const migration=await fs.readFile(path.join(root,'supabase/migrations/20261012102158_activate_monthly_order_numbers.sql'),'utf8');
await db.exec(migration);
const after=(await db.query('select id,to_jsonb(o)-\'order_no\'-\'legacy_order_no\' as data from orders o order by id')).rows;
assert.deepEqual(after,before,'historical conversion must preserve every business field and timestamp');
assert.deepEqual((await db.query('select * from order_items order by id')).rows,itemBefore);
assert.deepEqual((await db.query('select * from trade_documents order by id')).rows,documentsBefore);
const numbers=(await db.query('select order_no,legacy_order_no from orders order by order_date,created_at,id')).rows;
assert.deepEqual(numbers.map(x=>x.order_no),['R2506-001','R2609-001','R2610-001','R2610-002','R2610-003']);
assert.equal((await db.query('select count(*)::int as n from order_number_aliases')).rows[0].n,10);
await db.exec(migration);
assert.deepEqual((await db.query('select order_no,legacy_order_no from orders order by order_date,created_at,id')).rows,numbers,'migration is repeatable without renumbering');
const insert=async(date,no=null)=> (await db.query('insert into orders(order_date,order_no,customer_name) values($1,$2,$3) returning *',[date,no,'TEST synthetic'])).rows[0];
const next=await insert('2026-10-12'); assert.equal(next.order_no,'R2610-004');
const nov=await insert('2026-11-01'); assert.equal(nov.order_no,'R2611-001');
assert.equal((await insert('2027-01-01')).order_no,'R2701-001');
assert.equal((await insert('2025-06-12')).order_no,'R2506-002','backdated orders continue their own month');
await db.query('update orders set order_date=$1,order_no=null where id=$2',['2026-11-15',next.id]);
assert.equal((await db.query('select order_no from orders where id=$1',[next.id])).rows[0].order_no,'R2610-004');
const old=(await db.query("select * from orders where legacy_order_no='ROVON-20261010-010001'")).rows[0];
await db.query('update orders set order_no=$1,quantity=17 where id=$2',[old.legacy_order_no,old.id]);
assert.equal((await db.query('select order_no from orders where id=$1',[old.id])).rows[0].order_no,'R2610-003','stale editors preserve canonical number');
const upserted=(await db.query(`insert into orders(order_no,order_date,customer_name,quantity)
 values($1,$2,$3,$4) on conflict(order_no) do update set quantity=excluded.quantity returning id,order_no`,
 [old.legacy_order_no,old.order_date,'TEST stale CSV',18])).rows[0];
assert.equal(upserted.id,old.id); assert.equal(upserted.order_no,'R2610-003');
assert.equal((await db.query('select count(*)::int n from orders')).rows[0].n,9,'old CSV cannot create a duplicate');
await db.query('update orders set is_refund_or_cancelled=true where id=$1',[nov.id]);
assert.equal((await insert('2026-11-02')).order_no,'R2611-002');
await db.query('delete from orders where id=$1',[nov.id]);
assert.equal((await insert('2026-11-03')).order_no,'R2611-003','deleted/cancelled identifiers are not reused');
await assert.rejects(insert('2026-11-04','R2611-001'),/订单编号已被使用/);
await insert('2026-12-01','R2612-998');
assert.equal((await insert('2026-12-02')).order_no,'R2612-999');
assert.equal((await insert('2026-12-03')).order_no,'R2612-1000','1000 must not truncate to 100');
assert.equal((await insert('2026-12-04')).order_no,'R2612-1001');
const explicit=await insert('2026-10-12','CUSTOM-TEST-NEW');assert.equal(explicit.order_no,'CUSTOM-TEST-NEW');
await db.query('update orders set order_no=$1 where id=$2',['CUSTOM-TEST-RENAMED',explicit.id]);
const oldCustom=(await db.query("select * from resolve_order_numbers(array['CUSTOM-TEST-NEW'])")).rows[0];
assert.equal(oldCustom.order_id,explicit.id);assert.equal(oldCustom.order_no,'CUSTOM-TEST-RENAMED');
await assert.rejects(db.query('update orders set order_no=$1 where id=$2',['R2610-003',explicit.id]),/订单编号已被使用/);
const concurrent=await Promise.all(Array.from({length:30},()=>insert('2027-02-01')));
assert.equal(new Set(concurrent.map(x=>x.order_no)).size,30);
assert.deepEqual(concurrent.map(x=>x.order_no).sort(),Array.from({length:30},(_,i)=>'R2702-'+String(i+1).padStart(3,'0')));
const permissions=(await db.query("select has_function_privilege('anon','allocate_order_number(date)','execute') as anon,has_function_privilege('authenticated','resolve_order_numbers(text[])','execute') as authenticated,has_function_privilege('service_role','resolve_order_numbers(text[])','execute') as service")).rows[0];
assert.deepEqual(permissions,{anon:false,authenticated:false,service:true});
await db.exec('set role service_role;');assert.equal((await insert('2027-03-01')).order_no,'R2703-001');await db.exec('reset role;');
console.log('PASS database: historical business/IDs/timestamps/linked items/documents, month/year rollover, backfill, fixed edits, old-client upserts, non-reuse, 999/1000, explicit numbers, aliases, 30 queued concurrent inserts, service-only privileges.');

// Execute the real import actions against the same isolated database.
const cache=new Map();let refreshes=0;
const client={
 rpc:async(name,args)=>{try {return{data:(await db.query('select * from '+name+'($1)',[args.p_numbers])).rows,error:null};}catch(e){return{data:null,error:{message:e.message}};}},
 from(table){let mode,records,ids,column='order_id',single=false;const builder={
  upsert(value){mode='upsert';records=value;return builder;},
  insert(value){mode='insert';records=Array.isArray(value)?value:[value];return builder;},
  update(value){mode='update';records=[value];return builder;},
  delete(){mode='delete';return builder;},
  in(_column,value){ids=value;return builder;},
  eq(key,value){column=key;ids=[value];return builder;},
  select(){return builder;},
  single(){single=true;return builder;},
  async then(resolve){try{
   if(mode==='delete'){await db.query('delete from '+table+' where '+column+'=any($1::uuid[])',[ids]);return resolve({data:null,error:null});}
   if(mode==='update'){const record=records[0],keys=Object.keys(record);await db.query('update '+table+' set '+keys.map((k,i)=>k+'=$'+(i+1)).join(',')+' where '+column+'=any($'+(keys.length+1)+'::uuid[])',[...keys.map(k=>record[k]),ids]);return resolve({data:null,error:null});}
   const result=[];
   for(const record of records){const keys=Object.keys(record);const columns=keys.join(',');const values=keys.map(k=>record[k]);const placeholders=keys.map((_,i)=>'$'+(i+1)).join(',');const conflict=mode==='upsert'?' on conflict(order_no) do update set '+keys.map(k=>k+'=excluded.'+k).join(','):'';result.push(...(await db.query('insert into '+table+'('+columns+') values('+placeholders+')'+conflict+' returning *',values)).rows);}
   return resolve({data:single?result[0]:result,error:null});
  }catch(e){return resolve({data:null,error:{message:e.message}});}}
 };return builder;}
};
function load(relative){if(cache.has(relative))return cache.get(relative);const exports={};cache.set(relative,exports);let output=ts.transpileModule(requireSource(relative),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const localRequire=id=>id==='next/cache'?{revalidatePath:()=>{}}:id==='next/navigation'?{redirect:url=>{throw new Error('REDIRECT:'+url);}}:id==='@/lib/customers'?{refreshCustomersFromOrders:async()=>{refreshes++;}}:id==='@/lib/supabase/admin'?{getSupabaseAdminClient:()=>client}:id.startsWith('@/')?load('src/'+id.slice(2)+'.ts'):{};
 new Function('require','exports',output)(localRequire,exports);return exports;}
const sources=new Map();for(const relative of ['src/app/orders/import/actions.ts','src/lib/order-numbers.ts','src/lib/imports.ts','src/lib/csv.ts','src/lib/payment.ts','src/lib/shipping.ts','src/lib/countries.ts','src/lib/country-detection.ts'])sources.set(relative,await fs.readFile(path.join(root,relative),'utf8'));
function requireSource(relative){return sources.get(relative)??readFileSync(path.join(root,relative),'utf8');}
const actions=load('src/app/orders/import/actions.ts');
const batchResolved=await load('src/lib/order-numbers.ts').resolveOrderNumbers(client,[...Array.from({length:1020},(_,i)=>'UNKNOWN-'+i),old.legacy_order_no,old.order_no]);
assert.equal(batchResolved.size,2,'batching resolves identifiers beyond the REST row limit');
const row={rowNumber:2,order_no:old.legacy_order_no,order_date:'2026-10-10',customer_name:'TEST original customer',contact:'TEST contact',country:'TEST country',product_line:'女包',quantity:23,sales_amount_rmb:230,remark:'TEST import',shipping_status:'未发货',shipping_method:'快运',shipping_company:'TEST company',tracking_no:'TEST tracking',shipping_date:null,shipping_remark:null,payment_currency:'RMB',rmb_payment_method:'微信',payment_remark:null,contactWarning:null,errors:[]};
const form=rows=>{const value=new FormData();value.set('rows',JSON.stringify(rows));return value;};
assert.deepEqual((await actions.getOrderImportPreviewAction([old.legacy_order_no,old.order_no,'UNKNOWN'])).existingOrderNos.sort(),[old.legacy_order_no,old.order_no].sort());
const totalBefore=(await db.query('select count(*)::int n from orders')).rows[0].n;
const imported=await actions.importOrdersAction(null,form([row]));assert.equal(imported.ok,true,imported.message);
assert.equal((await db.query('select count(*)::int n from orders')).rows[0].n,totalBefore);
const importedItems=(await db.query('select * from order_items where order_id=$1',[old.id])).rows;assert.equal(importedItems.length,1);assert.equal(importedItems[0].quantity,23);assert.equal(Number(importedItems[0].sales_amount_rmb),230);
const missingNumber={...row,order_no:'IMPORT-20261012-0900'};
assert.equal((await actions.importOrdersAction(null,form([missingNumber]))).ok,true);
const generatedImported=(await db.query("select * from orders where legacy_order_no='IMPORT-20261012-0900'")).rows[0];assert.match(generatedImported.order_no,/^R2610-\d{3}$/);assert.equal((await db.query('select count(*)::int n from order_items where order_id=$1',[generatedImported.id])).rows[0].n,1);
assert.equal((await actions.importOrdersAction(null,form([missingNumber]))).ok,true,'reimport of generated import key updates the same order');
const duplicate=await actions.importOrdersAction(null,form([row,{...row,order_no:old.order_no}]));assert.equal(duplicate.ok,false);assert.match(duplicate.message,/同一订单出现多次/);
assert.equal(refreshes,3);
console.log('PASS actual import actions: preview identifies both old/new keys; old CSV updates original ID/items; numberless import generates short number and can be reimported; mixed aliases are rejected before writes.');
const saveActions=load('src/app/orders/actions.ts');
const orderForm=()=>{const f=new FormData();for(const [key,value] of Object.entries({order_no:'',order_date:'2026-10-12',customer_name:'TEST create action',contact:'TEST WhatsApp',country:'TEST country',item_product_line:'女包',item_quantity:'11',item_sales_amount_rmb:'220',payment_status:'定金',deposit_amount_rmb:'50',payment_currency:'RMB',rmb_payment_method:'微信',payment_remark:'TEST payment',shipping_status:'未发货',shipping_method:'快运',shipping_company:'TEST company',tracking_no:'TEST tracking',shipping_date:'2026-10-15',shipping_remark:'TEST ready info',remark:'TEST remark',after_save:'orders'}))f.set(key,value);return f;};
await assert.rejects(saveActions.createOrder(orderForm()),/REDIRECT:\/orders\?saved=1/);
const created=(await db.query("select * from orders where customer_name='TEST create action'")).rows[0];
assert.match(created.order_no,/^R2610-\d{3}$/);assert.equal(created.shipping_status,'未发货');assert.equal(created.tracking_no,'TEST tracking');assert.equal(Number(created.deposit_amount_rmb),50);
assert.equal((await db.query('select quantity from order_items where order_id=$1',[created.id])).rows[0].quantity,11);
const editForm=orderForm();editForm.set('order_date','2026-11-12');
await assert.rejects(saveActions.updateOrder(created.id,editForm),/REDIRECT:.*saved=1/);
const edited=(await db.query('select * from orders where id=$1',[created.id])).rows[0];
assert.equal(edited.order_no,created.order_no);assert.equal(edited.order_date.toISOString().slice(0,10),'2026-11-12');assert.equal(edited.shipping_status,'未发货');assert.equal(edited.tracking_no,'TEST tracking');
console.log('PASS actual create/edit actions: server leaves allocation to database, original product/payment/pre-entered shipping data save intact; a date edit with omitted number keeps the original number.');
await db.close();
