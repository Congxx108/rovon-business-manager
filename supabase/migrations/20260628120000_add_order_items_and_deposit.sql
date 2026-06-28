alter table public.orders
  add column if not exists deposit_amount_rmb numeric(14, 2) not null default 0 check (deposit_amount_rmb >= 0);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_line text not null,
  quantity integer not null default 0 check (quantity >= 0),
  sales_amount_rmb numeric(14, 2) not null default 0 check (sales_amount_rmb >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

drop trigger if exists set_order_items_updated_at on public.order_items;
create trigger set_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

insert into public.order_items (order_id, product_line, quantity, sales_amount_rmb, sort_order)
select
  o.id,
  coalesce(nullif(o.product_line, ''), '其他'),
  coalesce(o.quantity, 0),
  coalesce(o.sales_amount_rmb, 0),
  0
from public.orders o
where not exists (
  select 1
  from public.order_items oi
  where oi.order_id = o.id
);

alter table public.order_items enable row level security;

grant all on table public.order_items to service_role;
