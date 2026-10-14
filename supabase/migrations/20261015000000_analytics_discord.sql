-- Аналитика событий и вход через Discord.

create table if not exists public.analytics_events (
  id bigserial primary key,
  player_id uuid references public.players(id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists analytics_at_idx on public.analytics_events(at);
create index if not exists analytics_name_at_idx on public.analytics_events(name, at);
alter table public.analytics_events enable row level security;

alter table public.players add column if not exists discord_id text unique;
alter table public.players add column if not exists platform text;
alter table public.players drop constraint if exists players_identity;
alter table public.players add constraint players_identity
  check (tg_id is not null or device_id is not null or discord_id is not null);

-- Сводка для владельца игры (команда /stats в боте).
create or replace function public.admin_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with d as (select date_trunc('day', now()) as today)
  select jsonb_build_object(
    'players', (select count(*) from players),
    'new_today', (select count(*) from players, d where created_at >= d.today),
    'new_7d', (select count(*) from players where created_at >= now() - interval '7 days'),
    'dau', (select count(*) from players, d where last_seen >= d.today),
    'wau', (select count(*) from players where last_seen >= now() - interval '7 days'),
    'mau', (select count(*) from players where last_seen >= now() - interval '30 days'),
    'd1', (select round(100.0 * count(*) filter (where last_seen >= created_at + interval '1 day') / nullif(count(*), 0))
           from players where created_at between now() - interval '8 days' and now() - interval '1 day'),
    'd7', (select round(100.0 * count(*) filter (where last_seen >= created_at + interval '7 days') / nullif(count(*), 0))
           from players where created_at between now() - interval '30 days' and now() - interval '7 days'),
    'stars_7d', (select coalesce(sum(stars), 0) from purchases where not refunded and created_at >= now() - interval '7 days'),
    'stars_30d', (select coalesce(sum(stars), 0) from purchases where not refunded and created_at >= now() - interval '30 days'),
    'buyers_30d', (select count(distinct player_id) from purchases where not refunded and created_at >= now() - interval '30 days'),
    'plus_active', (select count(*) from players where plus_until > now()),
    'platforms', (select coalesce(jsonb_object_agg(coalesce(platform, '?'), n), '{}'::jsonb) from (select platform, count(*) n from players group by platform) x),
    'top_events', (select coalesce(jsonb_object_agg(name, n), '{}'::jsonb) from (
      select name, count(*) n from analytics_events where at >= now() - interval '7 days' group by name order by n desc limit 12) e)
  );
$$;

revoke all on function public.admin_stats() from public, anon, authenticated;
grant execute on function public.admin_stats() to service_role;
