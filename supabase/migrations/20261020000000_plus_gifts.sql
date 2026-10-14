-- Подарочная подписка «Садовник+»: покупатель получает код-ссылку,
-- друг открывает её и получает месяц подписки. Один код — один получатель.

create table if not exists public.plus_gifts (
  code text primary key,
  buyer uuid not null references public.players(id) on delete cascade,
  charge_id text,
  created_at timestamptz not null default now(),
  claimed_by uuid references public.players(id) on delete set null,
  claimed_at timestamptz
);
create index if not exists plus_gifts_buyer_idx on public.plus_gifts(buyer);
alter table public.plus_gifts enable row level security;

create or replace function public.claim_plus_gift(p_code text, p_player uuid)
returns public.plus_gifts
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  g public.plus_gifts;
begin
  update public.plus_gifts as pg
  set claimed_by = p_player, claimed_at = now()
  where pg.code = p_code and pg.claimed_by is null and pg.buyer <> p_player
  returning pg.* into g;
  return g;
end;
$$;

revoke all on function public.claim_plus_gift(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_plus_gift(text, uuid) to service_role;
