-- Покупки за Telegram Stars и подписка «Садовник+».

alter table public.players add column if not exists plus_until timestamptz;

create table if not exists public.purchases (
  charge_id text primary key,                 -- telegram_payment_charge_id
  player_id uuid not null references public.players(id) on delete cascade,
  product text not null,
  stars integer not null,
  recurring boolean not null default false,
  refunded boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists purchases_player_idx on public.purchases(player_id);

alter table public.purchases enable row level security;

-- Продлить «Садовник+»: от текущего окончания или от сейчас, если уже истёк.
create or replace function public.extend_plus(p_player uuid, p_days integer, p_until timestamptz default null)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  res timestamptz;
begin
  update public.players
  set plus_until = greatest(
    coalesce(p_until, greatest(coalesce(plus_until, now()), now()) + make_interval(days => p_days)),
    coalesce(plus_until, now())
  )
  where id = p_player
  returning plus_until into res;
  return res;
end;
$$;

revoke all on function public.extend_plus(uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.extend_plus(uuid, integer, timestamptz) to service_role;
