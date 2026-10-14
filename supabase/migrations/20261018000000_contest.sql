-- Конкурс «Подоконник недели»: заявки, голоса (3 в неделю) и выданные призы.

create table if not exists public.contest_entries (
  week date not null,
  player_id uuid not null references public.players(id) on delete cascade,
  snapshot jsonb not null,
  votes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (week, player_id)
);
create index if not exists contest_entries_votes_idx on public.contest_entries(week, votes desc);
alter table public.contest_entries enable row level security;

create table if not exists public.contest_votes (
  week date not null,
  voter uuid not null references public.players(id) on delete cascade,
  target uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (week, voter, target)
);
alter table public.contest_votes enable row level security;

create table if not exists public.contest_awards (
  week date primary key,
  winners jsonb not null default '[]',
  awarded_at timestamptz not null default now()
);
alter table public.contest_awards enable row level security;

-- Проголосовать: не за себя, один раз за участника, не больше p_max голосов в неделю.
create or replace function public.vote_contest(p_week date, p_voter uuid, p_target uuid, p_max integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if p_voter = p_target then return 'self'; end if;
  perform 1 from public.contest_entries e where e.week = p_week and e.player_id = p_target for update;
  if not found then return 'no_entry'; end if;
  perform pg_advisory_xact_lock(hashtext(p_voter::text || p_week::text));
  select count(*) into n from public.contest_votes v where v.week = p_week and v.voter = p_voter;
  if n >= p_max then return 'limit'; end if;
  insert into public.contest_votes (week, voter, target) values (p_week, p_voter, p_target)
  on conflict do nothing;
  if not found then return 'dup'; end if;
  update public.contest_entries e set votes = e.votes + 1 where e.week = p_week and e.player_id = p_target;
  return 'ok';
end;
$$;

revoke all on function public.vote_contest(date, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.vote_contest(date, uuid, uuid, integer) to service_role;
