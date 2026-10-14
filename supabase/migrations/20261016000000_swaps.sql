-- Барахолка: обмен черенками между игроками.
-- Выставленный черенок «лежит» на сервере, пока его не обменяют или не снимут.

create table if not exists public.swaps (
  id bigserial primary key,
  owner uuid not null references public.players(id) on delete cascade,
  sp text not null,
  form text,
  hue text,
  wants text[] not null default '{}',   -- какие виды хочет взамен (пусто — любой)
  note text not null default '',
  created_at timestamptz not null default now(),
  taken_by uuid references public.players(id) on delete set null,
  taken_at timestamptz,
  given jsonb,                          -- что отдали взамен: {sp, form, hue}
  cancelled boolean not null default false
);
create index if not exists swaps_open_idx on public.swaps(created_at desc) where taken_by is null and not cancelled;
create index if not exists swaps_owner_idx on public.swaps(owner);
alter table public.swaps enable row level security;

-- Забрать объявление атомарно: одно объявление — один обмен.
create or replace function public.take_swap(p_id bigint, p_taker uuid, p_given jsonb)
returns public.swaps
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  s public.swaps;
begin
  update public.swaps as sw
  set taken_by = p_taker, taken_at = now(), given = p_given
  where sw.id = p_id and sw.taken_by is null and not sw.cancelled and sw.owner <> p_taker
  returning sw.* into s;
  return s;
end;
$$;

-- Снять своё объявление (вернуть черенок).
create or replace function public.cancel_swap(p_id bigint, p_owner uuid)
returns public.swaps
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  s public.swaps;
begin
  update public.swaps as sw set cancelled = true
  where sw.id = p_id and sw.owner = p_owner and sw.taken_by is null and not sw.cancelled
  returning sw.* into s;
  return s;
end;
$$;

revoke all on function public.take_swap(bigint, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.cancel_swap(bigint, uuid) from public, anon, authenticated;
grant execute on function public.take_swap(bigint, uuid, jsonb) to service_role;
grant execute on function public.cancel_swap(bigint, uuid) to service_role;
