drop trigger if exists set_daily_lead_increases on public.daily_leads;
drop trigger if exists refresh_adjacent_daily_leads on public.daily_leads;
drop function if exists public.set_daily_lead_increases();
drop function if exists public.refresh_adjacent_daily_leads();
drop function if exists public.refresh_next_daily_lead(date);

alter table public.orders
  add constraint orders_country_required check (country is not null and btrim(country) <> '') not valid,
  add constraint orders_product_line_required check (product_line is not null and btrim(product_line) <> '') not valid,
  add constraint orders_customer_or_contact_required check (
    (customer_name is not null and btrim(customer_name) <> '')
    or (contact is not null and btrim(contact) <> '')
  ) not valid;

alter table public.daily_leads
  add constraint daily_leads_stat_date_required check (stat_date is not null) not valid,
  add constraint daily_leads_counts_non_negative check (
    facebook_leads >= 0
    and whatsapp1 >= 0
    and whatsapp2 >= 0
    and handbag_group >= 0
    and backpack_group >= 0
  ) not valid;

alter table public.customers
  add column if not exists customer_key text;

create or replace function public.customer_match_key(
  p_contact text,
  p_name text,
  p_country text
)
returns text
language sql
immutable
as $$
  select case
    when nullif(btrim(coalesce(p_contact, '')), '') is not null
      then 'contact:' || lower(btrim(p_contact))
    when nullif(btrim(coalesce(p_name, '')), '') is not null
      and nullif(btrim(coalesce(p_country, '')), '') is not null
      then 'name-country:' || lower(btrim(p_name)) || '|' || lower(btrim(p_country))
    else null
  end;
$$;

update public.customers
set customer_key = public.customer_match_key(contact, name, country)
where customer_key is null
  and public.customer_match_key(contact, name, country) is not null;

with ranked_customer_keys as (
  select
    id,
    row_number() over (
      partition by customer_key
      order by total_sales_rmb desc, updated_at desc, created_at desc
    ) as row_number
  from public.customers
  where customer_key is not null
)
update public.customers c
set customer_key = null
from ranked_customer_keys ranked
where c.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists customers_customer_key_uidx
on public.customers (customer_key)
where customer_key is not null;

create or replace function public.recalculate_daily_leads()
returns void
language plpgsql
as $$
begin
  with ordered as (
    select
      id,
      coalesce(facebook_leads, 0) + coalesce(whatsapp1, 0) + coalesce(whatsapp2, 0) as total_current,
      coalesce(handbag_group, 0) as handbag_current,
      coalesce(backpack_group, 0) as backpack_current,
      lag(coalesce(facebook_leads, 0) + coalesce(whatsapp1, 0) + coalesce(whatsapp2, 0)) over (order by stat_date, id) as total_previous,
      lag(coalesce(handbag_group, 0)) over (order by stat_date, id) as handbag_previous,
      lag(coalesce(backpack_group, 0)) over (order by stat_date, id) as backpack_previous
    from public.daily_leads
  )
  update public.daily_leads dl
  set
    total_increase = case when ordered.total_previous is null then 0 else ordered.total_current - ordered.total_previous end,
    handbag_group_increase = case when ordered.handbag_previous is null then 0 else ordered.handbag_current - ordered.handbag_previous end,
    backpack_group_increase = case when ordered.backpack_previous is null then 0 else ordered.backpack_current - ordered.backpack_previous end
  from ordered
  where dl.id = ordered.id;
end;
$$;

create or replace function public.recalculate_daily_leads_trigger()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  perform public.recalculate_daily_leads();
  return null;
end;
$$;

create trigger recalculate_daily_leads_after_change
after insert or update or delete on public.daily_leads
for each statement execute function public.recalculate_daily_leads_trigger();

create or replace function public.set_customer_derived_fields()
returns trigger
language plpgsql
as $$
begin
  new.repurchase_status = case
    when coalesce(new.total_orders, 0) >= 2 then '已复购'
    else '首单客户'
  end;

  new.customer_value_level = case
    when coalesce(new.total_sales_rmb, 0) >= 100000 then 'S级'
    when coalesce(new.total_sales_rmb, 0) >= 50000 then 'A级'
    when coalesce(new.total_sales_rmb, 0) >= 10000 then 'B级'
    when coalesce(new.total_sales_rmb, 0) > 0 then 'C级'
    else '未统计'
  end;

  new.repurchase_potential = case
    when coalesce(new.total_sales_rmb, 0) >= 10000 then '高潜力'
    when coalesce(new.total_orders, 0) >= 2 or coalesce(new.total_sales_rmb, 0) >= 5000 then '中潜力'
    when coalesce(new.total_sales_rmb, 0) > 0 then '普通潜力'
    else '未判断'
  end;

  new.days_since_last_order = case
    when new.last_order_date is null then null
    else greatest(0, current_date - new.last_order_date)
  end;

  new.follow_priority = case
    when new.last_order_date is null then '未统计'
    when new.days_since_last_order < 60 then '近期已下单'
    when coalesce(new.total_sales_rmb, 0) >= 10000 and new.days_since_last_order between 60 and 119 then '可跟进'
    when coalesce(new.total_sales_rmb, 0) >= 10000 and new.days_since_last_order >= 120 then '优先跟进'
    when coalesce(new.total_orders, 0) >= 2 and new.days_since_last_order between 60 and 119 then '正常维护'
    when coalesce(new.total_orders, 0) >= 2 and new.days_since_last_order >= 120 then '可跟进'
    when new.days_since_last_order between 60 and 119 then '正常维护'
    when new.days_since_last_order >= 120 then '普通维护'
    else '未统计'
  end;

  new.follow_suggestion = case
    when new.follow_priority = '优先跟进' then '重点联系：询问补货/新品需求'
    when new.follow_priority = '可跟进' then '轻触达：发新品/热卖款'
    when new.follow_priority = '近期已下单' then '60天内不催促，正常维护'
    when new.follow_priority = '正常维护' then '正常维护：节奏不要太频繁'
    when new.follow_priority = '普通维护' then '普通维护'
    else null
  end;

  return new;
end;
$$;

create or replace function public.refresh_customers_from_orders()
returns integer
language plpgsql
as $$
declare
  affected_count integer := 0;
begin
  with valid_orders as (
    select
      public.customer_match_key(contact, customer_name, country) as customer_key,
      nullif(btrim(customer_name), '') as customer_name,
      nullif(btrim(contact), '') as contact,
      nullif(btrim(country), '') as country,
      nullif(btrim(product_line), '') as product_line,
      order_date,
      quantity,
      sales_amount_effective_rmb,
      created_at
    from public.orders
    where is_refund_or_cancelled = false
      and public.customer_match_key(contact, customer_name, country) is not null
  ),
  grouped as (
    select
      customer_key,
      (array_agg(customer_name order by order_date desc, created_at desc) filter (where customer_name is not null))[1] as name,
      (array_agg(contact order by order_date desc, created_at desc) filter (where contact is not null))[1] as contact,
      (array_agg(country order by order_date desc, created_at desc) filter (where country is not null))[1] as country,
      min(order_date) as first_order_date,
      max(order_date) as last_order_date,
      (array_agg(product_line order by order_date desc, created_at desc) filter (where product_line is not null))[1] as main_product_line,
      count(*)::integer as total_orders,
      coalesce(sum(quantity), 0)::integer as total_quantity,
      coalesce(sum(sales_amount_effective_rmb), 0)::numeric(14, 2) as total_sales_rmb
    from valid_orders
    group by customer_key
  ),
  matched_existing as (
    update public.customers c
    set customer_key = g.customer_key
    from grouped g
    where c.customer_key is null
      and (
        (g.contact is not null and nullif(btrim(c.contact), '') is not null and lower(btrim(c.contact)) = lower(g.contact))
        or (
          g.contact is null
          and nullif(btrim(c.contact), '') is null
          and lower(btrim(c.name)) = lower(g.name)
          and lower(btrim(coalesce(c.country, ''))) = lower(coalesce(g.country, ''))
        )
      )
      and not exists (
        select 1 from public.customers existing
        where existing.customer_key = g.customer_key
      )
    returning c.id
  ),
  upserted as (
    insert into public.customers (
      customer_key,
      name,
      contact,
      country,
      first_order_date,
      last_order_date,
      main_product_line,
      total_orders,
      total_quantity,
      total_sales_rmb
    )
    select
      customer_key,
      coalesce(name, contact, '未命名客户'),
      contact,
      country,
      first_order_date,
      last_order_date,
      main_product_line,
      total_orders,
      total_quantity,
      total_sales_rmb
    from grouped
    on conflict (customer_key) where customer_key is not null
    do update set
      name = excluded.name,
      contact = excluded.contact,
      country = excluded.country,
      first_order_date = excluded.first_order_date,
      last_order_date = excluded.last_order_date,
      main_product_line = excluded.main_product_line,
      total_orders = excluded.total_orders,
      total_quantity = excluded.total_quantity,
      total_sales_rmb = excluded.total_sales_rmb,
      updated_at = now()
    returning id
  ),
  zeroed as (
    update public.customers c
    set
      first_order_date = null,
      last_order_date = null,
      main_product_line = null,
      total_orders = 0,
      total_quantity = 0,
      total_sales_rmb = 0,
      updated_at = now()
    where c.customer_key is not null
      and not exists (
        select 1 from grouped g where g.customer_key = c.customer_key
      )
    returning id
  )
  select count(*) into affected_count
  from (
    select id from matched_existing
    union all
    select id from upserted
    union all
    select id from zeroed
  ) changed;

  return affected_count;
end;
$$;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.customers to service_role;
grant select, insert, update, delete on public.daily_leads to service_role;
grant execute on function public.recalculate_daily_leads() to service_role;
grant execute on function public.refresh_customers_from_orders() to service_role;
