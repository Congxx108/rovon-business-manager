create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  order_date date not null,
  customer_name text not null,
  contact text,
  country text,
  product_line text,
  quantity integer not null default 0 check (quantity >= 0),
  sales_amount_rmb numeric(14, 2) not null default 0 check (sales_amount_rmb >= 0),
  order_status text not null default '未处理',
  payment_status text not null default '未付款',
  is_refund_or_cancelled boolean not null default false,
  sales_amount_effective_rmb numeric(14, 2) generated always as (
    case when is_refund_or_cancelled then 0 else sales_amount_rmb end
  ) stored,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_order_date_idx on public.orders (order_date);
create index orders_country_idx on public.orders (country);
create index orders_product_line_idx on public.orders (product_line);
create index orders_customer_name_idx on public.orders (customer_name);

create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  country text,
  first_order_date date,
  last_order_date date,
  main_product_line text,
  total_orders integer not null default 0 check (total_orders >= 0),
  total_quantity integer not null default 0 check (total_quantity >= 0),
  total_sales_rmb numeric(14, 2) not null default 0 check (total_sales_rmb >= 0),
  repurchase_status text not null default '首单客户',
  customer_value_level text not null default '未统计',
  repurchase_potential text not null default '未判断',
  days_since_last_order integer,
  follow_priority text not null default '未统计',
  follow_suggestion text,
  last_follow_date date,
  last_follow_result text,
  next_follow_date date,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_name_idx on public.customers (name);
create index customers_country_idx on public.customers (country);
create index customers_follow_priority_idx on public.customers (follow_priority);
create index customers_next_follow_date_idx on public.customers (next_follow_date);

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
    when new.follow_priority = '优先跟进' then '重点联系，确认补货计划或新款需求'
    when new.follow_priority = '可跟进' then '询问收货情况，推荐近期主推产品'
    when new.follow_priority = '正常维护' then '保持关系维护，轻量触达'
    when new.follow_priority = '普通维护' then '低频维护，等待明确需求'
    when new.follow_priority = '近期已下单' then '暂不催单，关注收货周期'
    else null
  end;

  return new;
end;
$$;

create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger set_customers_derived_fields
before insert or update on public.customers
for each row execute function public.set_customer_derived_fields();

create table public.daily_leads (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null unique,
  facebook_leads integer not null default 0 check (facebook_leads >= 0),
  whatsapp1 integer not null default 0 check (whatsapp1 >= 0),
  whatsapp2 integer not null default 0 check (whatsapp2 >= 0),
  total_increase integer not null default 0,
  handbag_group integer not null default 0 check (handbag_group >= 0),
  handbag_group_increase integer not null default 0,
  backpack_group integer not null default 0 check (backpack_group >= 0),
  backpack_group_increase integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index daily_leads_stat_date_idx on public.daily_leads (stat_date);

create or replace function public.calculate_daily_lead_increases(
  p_stat_date date,
  p_facebook_leads integer,
  p_whatsapp1 integer,
  p_whatsapp2 integer,
  p_handbag_group integer,
  p_backpack_group integer,
  p_exclude_id uuid default null
)
returns table (
  total_increase integer,
  handbag_group_increase integer,
  backpack_group_increase integer
)
language plpgsql
stable
as $$
declare
  previous_record public.daily_leads%rowtype;
begin
  select *
  into previous_record
  from public.daily_leads dl
  where dl.stat_date < p_stat_date
    and (p_exclude_id is null or dl.id <> p_exclude_id)
  order by dl.stat_date desc
  limit 1;

  if previous_record.id is null then
    total_increase := 0;
    handbag_group_increase := 0;
    backpack_group_increase := 0;
  else
    total_increase :=
      (coalesce(p_facebook_leads, 0) + coalesce(p_whatsapp1, 0) + coalesce(p_whatsapp2, 0))
      - (coalesce(previous_record.facebook_leads, 0) + coalesce(previous_record.whatsapp1, 0) + coalesce(previous_record.whatsapp2, 0));
    handbag_group_increase := coalesce(p_handbag_group, 0) - coalesce(previous_record.handbag_group, 0);
    backpack_group_increase := coalesce(p_backpack_group, 0) - coalesce(previous_record.backpack_group, 0);
  end if;

  return next;
end;
$$;

create or replace function public.set_daily_lead_increases()
returns trigger
language plpgsql
as $$
begin
  select c.total_increase, c.handbag_group_increase, c.backpack_group_increase
  into new.total_increase, new.handbag_group_increase, new.backpack_group_increase
  from public.calculate_daily_lead_increases(
    new.stat_date,
    new.facebook_leads,
    new.whatsapp1,
    new.whatsapp2,
    new.handbag_group,
    new.backpack_group,
    new.id
  ) c;

  return new;
end;
$$;

create or replace function public.refresh_next_daily_lead(p_stat_date date)
returns void
language plpgsql
as $$
declare
  next_record public.daily_leads%rowtype;
  calc_total integer;
  calc_handbag integer;
  calc_backpack integer;
begin
  select *
  into next_record
  from public.daily_leads dl
  where dl.stat_date > p_stat_date
  order by dl.stat_date asc
  limit 1;

  if next_record.id is not null then
    select c.total_increase, c.handbag_group_increase, c.backpack_group_increase
    into calc_total, calc_handbag, calc_backpack
    from public.calculate_daily_lead_increases(
      next_record.stat_date,
      next_record.facebook_leads,
      next_record.whatsapp1,
      next_record.whatsapp2,
      next_record.handbag_group,
      next_record.backpack_group,
      next_record.id
    ) c;

    update public.daily_leads
    set
      total_increase = calc_total,
      handbag_group_increase = calc_handbag,
      backpack_group_increase = calc_backpack
    where id = next_record.id;
  end if;
end;
$$;

create or replace function public.refresh_adjacent_daily_leads()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_next_daily_lead(old.stat_date);
  elsif tg_op = 'UPDATE' then
    perform public.refresh_next_daily_lead(old.stat_date);
    perform public.refresh_next_daily_lead(new.stat_date);
  else
    perform public.refresh_next_daily_lead(new.stat_date);
  end if;

  return null;
end;
$$;

create trigger set_daily_leads_updated_at
before update on public.daily_leads
for each row execute function public.set_updated_at();

create trigger set_daily_lead_increases
before insert or update of stat_date, facebook_leads, whatsapp1, whatsapp2, handbag_group, backpack_group
on public.daily_leads
for each row execute function public.set_daily_lead_increases();

create trigger refresh_adjacent_daily_leads
after insert or update of stat_date, facebook_leads, whatsapp1, whatsapp2, handbag_group, backpack_group or delete
on public.daily_leads
for each row execute function public.refresh_adjacent_daily_leads();

alter table public.orders enable row level security;
alter table public.customers enable row level security;
alter table public.daily_leads enable row level security;
