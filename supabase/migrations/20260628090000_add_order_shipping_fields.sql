alter table public.orders
  add column if not exists shipping_status text not null default '未发货',
  add column if not exists shipping_method text,
  add column if not exists shipping_company text,
  add column if not exists tracking_no text,
  add column if not exists shipping_date date,
  add column if not exists shipping_remark text;

alter table public.orders
  add constraint orders_shipping_status_valid check (
    shipping_status in ('未发货', '备货中', '部分发货', '已发货', '无需发货')
  ) not valid,
  add constraint orders_shipping_method_valid check (
    shipping_method is null or shipping_method in ('快运', '物流', '自提/其他')
  ) not valid;

create index if not exists orders_shipping_status_idx on public.orders (shipping_status);
create index if not exists orders_shipping_date_idx on public.orders (shipping_date);
