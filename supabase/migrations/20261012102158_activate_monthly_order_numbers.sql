begin;
set local lock_timeout = '10s';
set local statement_timeout = '120s';
lock table public.orders in access exclusive mode;

alter table public.orders add column if not exists legacy_order_no text;

create table if not exists public.order_number_counters (
  period text primary key check (period ~ '^[0-9]{4}$'),
  last_value bigint not null check (last_value >= 0)
);
create table if not exists public.order_number_aliases (
  order_no text primary key check (btrim(order_no) <> ''),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_number_aliases_order_id_idx
  on public.order_number_aliases(order_id);
alter table public.order_number_counters enable row level security;
alter table public.order_number_aliases enable row level security;
revoke all on public.order_number_counters,public.order_number_aliases from anon,authenticated;
grant select,insert,update on public.order_number_counters,public.order_number_aliases to service_role;

-- Reserve every existing identifier, including custom and import identifiers.
insert into public.order_number_aliases(order_no,order_id)
select order_no,id from public.orders
on conflict (order_no) do nothing;
insert into public.order_number_counters(period,last_value)
select substring(order_no from 2 for 4),max(split_part(order_no,'-',2)::bigint)
from public.order_number_aliases where order_no ~ '^R[0-9]{4}-[0-9]{3,}$'
group by 1
on conflict (period) do update set last_value=greatest(order_number_counters.last_value,excluded.last_value);

create or replace function public.allocate_order_number(p_order_date date)
returns text language plpgsql security invoker set search_path=public,pg_temp as $$
declare period_key text; sequence_value bigint; candidate text;
begin
  if p_order_date is null then raise exception '订单日期不能为空'; end if;
  period_key:=to_char(p_order_date,'YYMM');
  loop
    -- ON CONFLICT locks the month row: simultaneous writers cannot take the same number.
    insert into public.order_number_counters(period,last_value) values(period_key,1)
    on conflict (period) do update set last_value=order_number_counters.last_value+1
    returning last_value into sequence_value;
    candidate:='R'||period_key||'-'||lpad(sequence_value::text,greatest(3,length(sequence_value::text)),'0');
    if not exists(select 1 from public.order_number_aliases where order_no=candidate)
       and not exists(select 1 from public.orders where order_no=candidate) then
      return candidate;
    end if;
  end loop;
end $$;

-- Preserve all business columns and timestamps during the one-time historical conversion.
create temporary table order_number_business_snapshot on commit drop as
select id,to_jsonb(o)-'order_no'-'legacy_order_no' as business_data from public.orders o;
alter table public.orders disable trigger set_orders_updated_at;
do $$
declare historical record;
begin
  for historical in
    select id,order_date from public.orders
    where legacy_order_no is null and order_no !~ '^R[0-9]{4}-[0-9]{3,}$'
    order by order_date,created_at,id
  loop
    update public.orders set legacy_order_no=order_no,
      order_no=public.allocate_order_number(historical.order_date) where id=historical.id;
  end loop;
end $$;
alter table public.orders enable trigger set_orders_updated_at;
insert into public.order_number_aliases(order_no,order_id)
select order_no,id from public.orders on conflict (order_no) do nothing;
do $$
begin
  if exists(select 1 from order_number_business_snapshot s full join public.orders o on o.id=s.id
    where s.id is null or o.id is null or s.business_data is distinct from (to_jsonb(o)-'order_no'-'legacy_order_no')) then
    raise exception '编号迁移业务数据核对失败，已回滚';
  end if;
  if exists(select 1 from public.orders o left join public.order_number_aliases a on a.order_no=o.order_no
    where a.order_id is distinct from o.id) then
    raise exception '编号映射核对失败，已回滚';
  end if;
end $$;

create or replace function public.assign_order_number()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare requested text; linked_id uuid; canonical text;
begin
  requested:=nullif(btrim(new.order_no),'');
  if tg_op='UPDATE' and requested is null then
    new.order_no:=old.order_no;
    return new;
  end if;
  if requested is not null then
    select a.order_id,o.order_no into linked_id,canonical
      from public.order_number_aliases a left join public.orders o on o.id=a.order_id
      where a.order_no=requested;
    if found then
      if linked_id is null or (tg_op='UPDATE' and linked_id<>old.id) then
        raise exception using errcode='23505',message='订单编号已被使用，不能重复或分配给另一订单';
      end if;
      -- Also protects an old browser/CSV using a pre-migration identifier.
      new.order_no:=canonical;
      return new;
    end if;
  end if;
  if tg_op='UPDATE' then
    -- Old releases used a time-based fallback when an edit omitted the number.
    new.order_no:=case when requested ~ '^ROVON-[0-9]{8}-[0-9]{6}$' then old.order_no else requested end;
  elsif requested is null or requested ~ '^ROVON-[0-9]{8}-[0-9]{6}$' or requested ~ '^IMPORT-' then
    new.legacy_order_no:=coalesce(new.legacy_order_no,requested);
    new.order_no:=public.allocate_order_number(new.order_date);
  else
    -- Retain explicit manual/CSV numbers, including custom contract references.
    new.order_no:=requested;
  end if;
  -- Manual short numbers participate in the same month lock as automatic allocation.
  if new.order_no ~ '^R[0-9]{4}-[0-9]{3,}$' then
    insert into public.order_number_counters(period,last_value)
      values(substring(new.order_no from 2 for 4),split_part(new.order_no,'-',2)::bigint)
    on conflict (period) do update set last_value=greatest(order_number_counters.last_value,excluded.last_value);
  end if;
  return new;
end $$;

create or replace function public.register_order_number()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare identifier text; previous_number text;
begin
  if tg_op='UPDATE' then previous_number:=old.order_no; end if;
  for identifier in select distinct x from unnest(array[new.order_no,new.legacy_order_no,previous_number]) x
    where x is not null and btrim(x)<>''
  loop
    insert into public.order_number_aliases(order_no,order_id) values(identifier,new.id)
    on conflict (order_no) do update set order_id=excluded.order_id
      where order_number_aliases.order_id=excluded.order_id;
    if not found then
      raise exception using errcode='23505',message='订单编号或历史编号已被使用';
    end if;
  end loop;
  if new.order_no ~ '^R[0-9]{4}-[0-9]{3,}$' then
    insert into public.order_number_counters(period,last_value)
      values(substring(new.order_no from 2 for 4),split_part(new.order_no,'-',2)::bigint)
    on conflict (period) do update set last_value=greatest(order_number_counters.last_value,excluded.last_value);
  end if;
  return new;
end $$;

drop trigger if exists assign_order_number on public.orders;
create trigger assign_order_number before insert or update of order_no on public.orders
  for each row execute function public.assign_order_number();
drop trigger if exists register_order_number on public.orders;
create trigger register_order_number after insert or update of order_no on public.orders
  for each row execute function public.register_order_number();

create or replace function public.resolve_order_numbers(p_numbers text[])
returns table(requested_no text,order_id uuid,order_no text)
language sql stable security invoker set search_path=public,pg_temp as $$
  select distinct btrim(n),o.id,o.order_no
  from unnest(p_numbers) n join public.order_number_aliases a on a.order_no=btrim(n)
  join public.orders o on o.id=a.order_id;
$$;
revoke all on function public.allocate_order_number(date),public.assign_order_number(),
  public.register_order_number(),public.resolve_order_numbers(text[]) from public,anon,authenticated;
grant execute on function public.allocate_order_number(date),public.assign_order_number(),
  public.register_order_number(),public.resolve_order_numbers(text[]) to service_role;
commit;
