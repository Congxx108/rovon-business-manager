alter table public.orders
  add column if not exists deposit_amount_rmb numeric(14, 2) not null default 0 check (deposit_amount_rmb >= 0),
  add column if not exists payment_currency text,
  add column if not exists rmb_payment_method text,
  add column if not exists payment_remark text;
