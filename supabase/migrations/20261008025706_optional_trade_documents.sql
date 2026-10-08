-- Optional trade documents. No changes or writes to existing business tables.
create sequence public.trade_document_number_seq;
create table public.trade_document_settings (
  id text primary key check (id = 'default'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
create table public.trade_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('pi','ci','packing')),
  document_no text not null check (length(document_no) between 1 and 100),
  document_date date not null,
  order_id uuid references public.orders(id) on delete set null,
  source_document_id uuid references public.trade_documents(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','issued','void')),
  revision integer not null default 1 check (revision > 0),
  current_version integer not null default 0 check (current_version >= 0),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_type,document_no)
);
create table public.trade_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.trade_documents(id) on delete restrict,
  version integer not null check (version > 0),
  document_type text not null,
  document_no text not null,
  document_date date not null,
  data jsonb not null,
  pdf_path text not null unique,
  pdf_sha256 text not null check (pdf_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(document_id,version)
);
create index trade_documents_date_idx on public.trade_documents(document_date desc,created_at desc);
create index trade_documents_order_idx on public.trade_documents(order_id) where order_id is not null;
create index trade_documents_source_idx on public.trade_documents(source_document_id) where source_document_id is not null;
alter table public.trade_document_settings enable row level security;
alter table public.trade_documents enable row level security;
alter table public.trade_document_versions enable row level security;
revoke all on public.trade_document_settings,public.trade_documents,public.trade_document_versions from anon,authenticated;
revoke all on public.trade_document_settings,public.trade_documents,public.trade_document_versions from service_role;
grant select,insert,update on public.trade_document_settings,public.trade_documents to service_role;
grant select,insert on public.trade_document_versions to service_role;
grant usage,select on public.trade_document_number_seq to service_role;

create function public.save_trade_document(p_id uuid,p_revision integer,p_type text,p_no text,p_date date,p_order_id uuid,p_source_id uuid,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path = public,pg_temp as $$
declare result public.trade_documents; number text;
begin
  if p_type not in ('pi','ci','packing') or p_date is null or jsonb_typeof(p_data) <> 'object' then raise exception '单据参数不正确'; end if;
  if p_id is null then
    number := nullif(btrim(p_no),'');
    if number is null then
      number := (case when p_type='packing' then 'PL' else upper(p_type) end) || '-' || to_char(now() at time zone 'Asia/Hong_Kong','YYYYMMDD') || '-' || lpad(nextval('public.trade_document_number_seq')::text,5,'0');
    end if;
    insert into public.trade_documents(document_type,document_no,document_date,order_id,source_document_id,data)
    values(p_type,number,p_date,p_order_id,p_source_id,p_data) returning * into result;
  else
    select * into result from public.trade_documents where id=p_id for update;
    if not found then raise exception '单据不存在'; end if;
    if result.revision <> p_revision then raise exception '版本冲突：单据已被其他窗口修改，请复制当前内容后重新载入'; end if;
    if result.status='void' then raise exception '作废单据不能修改，请复制为新单'; end if;
    if result.document_type <> p_type then raise exception '已保存单据不能改变类型，请复制为新单'; end if;
    update public.trade_documents set document_no=coalesce(nullif(btrim(p_no),''),result.document_no),document_date=p_date,order_id=p_order_id,data=p_data,status='draft',revision=revision+1,updated_at=now()
    where id=p_id returning * into result;
  end if;
  return to_jsonb(result);
end $$;

create function public.issue_trade_document(p_id uuid,p_revision integer,p_pdf_path text,p_hash text)
returns jsonb language plpgsql security invoker set search_path = public,pg_temp as $$
declare doc public.trade_documents;
begin
  select * into doc from public.trade_documents where id=p_id for update;
  if not found then raise exception '单据不存在'; end if;
  if doc.revision<>p_revision then raise exception '版本冲突：单据已被其他窗口修改，请重新载入'; end if;
  if doc.status<>'draft' then raise exception '只有草稿可以确认出具'; end if;
  if p_pdf_path !~ ('^versions/' || p_id::text || '/[a-f0-9-]{36}\.pdf$') then raise exception 'PDF路径不正确'; end if;
  insert into public.trade_document_versions(document_id,version,document_type,document_no,document_date,data,pdf_path,pdf_sha256)
  values(doc.id,doc.current_version+1,doc.document_type,doc.document_no,doc.document_date,doc.data,p_pdf_path,p_hash);
  update public.trade_documents set current_version=current_version+1,status='issued',revision=revision+1,updated_at=now() where id=p_id returning * into doc;
  return to_jsonb(doc);
end $$;
revoke all on function public.save_trade_document(uuid,integer,text,text,date,uuid,uuid,jsonb),public.issue_trade_document(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.save_trade_document(uuid,integer,text,text,date,uuid,uuid,jsonb),public.issue_trade_document(uuid,integer,text,text) to service_role;
-- Template banking details are seeded separately, never committed to this migration.
insert into public.trade_document_settings(id,data) values('default','{"seller":{"name":"ROVON GLOBAL Bag Manufacturing Co., Ltd.(Yiwu surong)","address":"No.378, Wuyidong Road, Bai\u0027gou Town, Hebei Province, China","contact":"Cason","phone":"+86 153 0260 5504"},"currencies":["USD","CNY","NGN","GHS","TZS","PHP","GBP","XAF","EUR","KES","XOF","AED","SAR"],"banks":[],"terms":["1. All foreign currency exchange rates are valid for 7 days from the date of signing this contract.","2. Goods remain the property of the seller until full payment is received.","3. Claims must be raised within 7 days of receipt of goods.","4. Force majeure events excuse any delay in performance."]}'::jsonb);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('trade-document-files','trade-document-files',false,30000000,array['image/png','image/jpeg','application/pdf']) on conflict(id) do nothing;
