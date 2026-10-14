-- Совместный подоконник: один подоконник на двоих (до 4 человек).
-- Состояние подоконника — JSON (как сохранение игры), версия — для защиты
-- от одновременных правок с двух телефонов.

create table if not exists public.coop_sills (
  id bigserial primary key,
  code text not null unique,            -- код приглашения
  state jsonb not null,
  version integer not null default 1,
  created_by uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coop_sills enable row level security;

create table if not exists public.coop_members (
  sill_id bigint not null references public.coop_sills(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (sill_id, player_id)
);
create index if not exists coop_members_player_idx on public.coop_members(player_id);
alter table public.coop_members enable row level security;

-- Вступить по коду: атомарно проверяем, что места ещё есть.
-- Возвращает id подоконника, 0 — если мест нет, null — если кода нет.
create or replace function public.join_coop(p_code text, p_player uuid, p_max integer)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  sid bigint;
  n integer;
begin
  select cs.id into sid from public.coop_sills cs where cs.code = p_code for update;
  if sid is null then return null; end if;
  if exists (select 1 from public.coop_members m where m.sill_id = sid and m.player_id = p_player) then return sid; end if;
  select count(*) into n from public.coop_members m where m.sill_id = sid;
  if n >= p_max then return 0; end if;
  insert into public.coop_members (sill_id, player_id) values (sid, p_player);
  return sid;
end;
$$;

-- Выйти; если никого не осталось — подоконник удаляется.
create or replace function public.leave_coop(p_sill bigint, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.coop_members m where m.sill_id = p_sill and m.player_id = p_player;
  if not exists (select 1 from public.coop_members m where m.sill_id = p_sill) then
    delete from public.coop_sills cs where cs.id = p_sill;
  end if;
end;
$$;

revoke all on function public.join_coop(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.leave_coop(bigint, uuid) from public, anon, authenticated;
grant execute on function public.join_coop(text, uuid, integer) to service_role;
grant execute on function public.leave_coop(bigint, uuid) to service_role;
