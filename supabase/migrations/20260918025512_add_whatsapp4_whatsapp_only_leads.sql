begin;

alter table public.daily_leads
  add column whatsapp4 integer not null default 0 check (whatsapp4 >= 0);

-- WhatsApp is the effective lead pool. Preserve every manual override, including zero.
create or replace function public.recalculate_daily_leads()
returns void
language plpgsql
as $$
begin
  with ordered as (
    select
      id,
      coalesce(whatsapp1, 0) + coalesce(whatsapp2, 0) + coalesce(whatsapp3, 0) + coalesce(whatsapp4, 0) as total_current,
      coalesce(handbag_group, 0) as handbag_current,
      coalesce(backpack_group, 0) as backpack_current,
      lag(coalesce(whatsapp1, 0) + coalesce(whatsapp2, 0) + coalesce(whatsapp3, 0) + coalesce(whatsapp4, 0)) over (order by stat_date, id) as total_previous,
      lag(coalesce(handbag_group, 0)) over (order by stat_date, id) as handbag_previous,
      lag(coalesce(backpack_group, 0)) over (order by stat_date, id) as backpack_previous,
      total_increase_override,
      handbag_group_increase_override,
      backpack_group_increase_override
    from public.daily_leads
  )
  update public.daily_leads dl
  set
    total_increase = coalesce(
      ordered.total_increase_override,
      case when ordered.total_previous is null then 0 else ordered.total_current - ordered.total_previous end
    ),
    handbag_group_increase = coalesce(
      ordered.handbag_group_increase_override,
      case when ordered.handbag_previous is null then 0 else ordered.handbag_current - ordered.handbag_previous end
    ),
    backpack_group_increase = coalesce(
      ordered.backpack_group_increase_override,
      case when ordered.backpack_previous is null then 0 else ordered.backpack_current - ordered.backpack_previous end
    )
  from ordered
  where dl.id = ordered.id;
end;
$$;

-- Apply the same definition to history; cumulative values and overrides are never reset.
select public.recalculate_daily_leads();
commit;
