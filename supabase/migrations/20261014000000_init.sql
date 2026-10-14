-- Подоконник: игроки, сохранения, подарки, входящие награды.
-- Все таблицы закрыты RLS без политик: доступ только у серверных функций (service role).

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  tg_id bigint unique,
  device_id text unique,
  name text not null default '',
  username text,
  referrer uuid references public.players(id) on delete set null,
  tz_offset integer not null default 180,       -- минуты к UTC, по умолчанию Москва
  notify boolean not null default true,
  last_notified timestamptz,
  level integer not null default 1,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  constraint players_identity check (tg_id is not null or device_id is not null)
);

create table if not exists public.saves (
  player_id uuid primary key references public.players(id) on delete cascade,
  state jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.gifts (
  code text primary key check (code ~ '^[A-Za-z0-9]{8,32}$'),
  sender uuid references public.players(id) on delete set null,
  sp text not null,
  from_name text not null default '',
  note integer not null default 0,
  created_at timestamptz not null default now(),
  claimed_by uuid references public.players(id) on delete set null,
  claimed_at timestamptz
);
create index if not exists gifts_sender_idx on public.gifts(sender);

create table if not exists public.inbox (
  id bigserial primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists inbox_pending_idx on public.inbox(player_id) where delivered_at is null;

alter table public.players enable row level security;
alter table public.saves enable row level security;
alter table public.gifts enable row level security;
alter table public.inbox enable row level security;

-- Забрать подарок атомарно: одна ссылка — один получатель.
-- Если подарок не регистрировали (создан офлайн), регистрируем его сразу как забранный.
create or replace function public.claim_gift(p_code text, p_player uuid, p_sp text, p_from text, p_note integer)
returns table (status text, sender uuid, sp text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  g public.gifts;
begin
  insert into public.gifts(code, sp, from_name, note, claimed_by, claimed_at)
  values (p_code, p_sp, p_from, p_note, p_player, now())
  on conflict (code) do nothing;
  if found then
    return query select 'ok'::text, null::uuid, p_sp;
    return;
  end if;

  update public.gifts as gf set claimed_by = p_player, claimed_at = now()
  where gf.code = p_code and gf.claimed_by is null and (gf.sender is null or gf.sender <> p_player)
  returning gf.* into g;
  if found then
    return query select 'ok'::text, g.sender, g.sp;
    return;
  end if;

  select gf.* into g from public.gifts as gf where gf.code = p_code;
  if g.claimed_by = p_player then
    return query select 'mine'::text, g.sender, g.sp;
  elsif g.sender = p_player then
    return query select 'own'::text, g.sender, g.sp;
  else
    return query select 'taken'::text, g.sender, g.sp;
  end if;
end;
$$;

revoke all on function public.claim_gift(text, uuid, text, text, integer) from public, anon, authenticated;
