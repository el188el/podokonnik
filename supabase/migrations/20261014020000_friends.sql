-- Друзья, походы в гости и «полить разок».

create table if not exists public.friends (
  a uuid not null references public.players(id) on delete cascade,
  b uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);
create index if not exists friends_b_idx on public.friends(b);

-- Сколько раз гость полил растения хозяина за день (для лимитов и наград).
create table if not exists public.visits (
  visitor uuid not null references public.players(id) on delete cascade,
  host uuid not null references public.players(id) on delete cascade,
  day date not null default current_date,
  waters integer not null default 0,
  primary key (visitor, host, day)
);

alter table public.friends enable row level security;
alter table public.visits enable row level security;

-- Дружба всегда взаимная: две строки. Возвращает true, если дружба новая.
create or replace function public.add_friend(p_a uuid, p_b uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  n integer;
begin
  if p_a = p_b then return false; end if;
  insert into public.friends(a, b) values (p_a, p_b), (p_b, p_a) on conflict do nothing;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Засчитать полив гостем с лимитами: 3 растения у одного хозяина и 10 всего в день.
create or replace function public.count_visit_water(p_visitor uuid, p_host uuid, p_host_limit integer, p_day_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  total integer;
  here integer;
begin
  select coalesce(sum(waters), 0) into total from public.visits where visitor = p_visitor and day = current_date;
  select coalesce(max(waters), 0) into here from public.visits where visitor = p_visitor and host = p_host and day = current_date;
  if total >= p_day_limit or here >= p_host_limit then return false; end if;
  insert into public.visits(visitor, host, day, waters) values (p_visitor, p_host, current_date, 1)
  on conflict (visitor, host, day) do update set waters = public.visits.waters + 1;
  return true;
end;
$$;

revoke all on function public.add_friend(uuid, uuid) from public, anon, authenticated;
revoke all on function public.count_visit_water(uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.add_friend(uuid, uuid) to service_role;
grant execute on function public.count_visit_water(uuid, uuid, integer, integer) to service_role;
