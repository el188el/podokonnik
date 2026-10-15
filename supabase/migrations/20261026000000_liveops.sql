-- Живые операции: блокировки, промокоды, подарки пачкой, рассылки и ивенты-модификаторы.
-- Все таблицы доступны только серверу (service role): RLS включён, политик нет.

-- Бот не может писать игроку (игрок заблокировал бота) — отмечаем, чтобы не слать зря.
alter table public.players add column if not exists bot_blocked_at timestamptz;

-- Заблокированные игроки: API игры отвечает им 403 banned.
create table if not exists public.bans (
  player_id uuid primary key references public.players(id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now()
);
alter table public.bans enable row level security;

-- Промокоды. reward — как у подарка: {leaves, pass, plusDays, form, item, note}.
create table if not exists public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,32}$'),
  reward jsonb not null default '{}',
  max_uses integer not null default 0,    -- 0 — без ограничения
  uses integer not null default 0,
  expires_at timestamptz,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;

create table if not exists public.promo_redemptions (
  code text not null references public.promo_codes(code) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code, player_id)
);
alter table public.promo_redemptions enable row level security;

/** Начислить «Садовник+» на N дней (продлевает, если уже есть). */
create or replace function public.add_plus_days(p_players uuid[], p_days integer)
returns void language sql security definer set search_path = public as $$
  update players set plus_until = greatest(coalesce(plus_until, now()), now()) + make_interval(days => p_days)
  where id = any(p_players) and p_days > 0;
$$;

/**
 * Погасить промокод атомарно: один раз на игрока, не больше max_uses всего.
 * Награда приходит обычным входящим подарком (kind admin_gift).
 */
create or replace function public.redeem_promo(p_code text, p_player uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  c promo_codes;
  r jsonb;
  days integer;
begin
  select * into c from promo_codes where code = upper(trim(p_code));
  if not found or c.disabled then return 'not_found'; end if;
  if c.expires_at is not null and c.expires_at < now() then return 'expired'; end if;
  insert into promo_redemptions (code, player_id) values (c.code, p_player) on conflict do nothing;
  if not found then return 'already'; end if;
  update promo_codes set uses = uses + 1 where code = c.code and (max_uses = 0 or uses < max_uses);
  if not found then
    delete from promo_redemptions where code = c.code and player_id = p_player;
    return 'used_up';
  end if;
  r := c.reward || jsonb_build_object('note', coalesce(nullif(c.reward->>'note', ''), 'Промокод ' || c.code), 'promo', c.code);
  days := coalesce((c.reward->>'plusDays')::integer, 0);
  if days > 0 then
    perform add_plus_days(array[p_player], days);
    r := r || jsonb_build_object('plusUntil', (extract(epoch from (select plus_until from players where id = p_player)) * 1000)::bigint);
  end if;
  insert into inbox (player_id, kind, payload) values (p_player, 'admin_gift', r);
  return 'ok';
end $$;

-- Рассылки от бота игры: сама рассылка и очередь получателей.
create table if not exists public.broadcasts (
  id bigint generated always as identity primary key,
  text text not null,
  photo text,                 -- ссылка или file_id картинки
  button boolean not null default true, -- кнопка «Открыть игру»
  segment jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'sending', 'done', 'cancelled')),
  total integer not null default 0,
  sent integer not null default 0,
  blocked integer not null default 0,
  failed integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
alter table public.broadcasts enable row level security;

create table if not exists public.broadcast_queue (
  broadcast_id bigint not null references public.broadcasts(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  tg_id bigint not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'blocked', 'failed')),
  updated_at timestamptz not null default now(),
  primary key (broadcast_id, player_id)
);
create index if not exists broadcast_queue_pending on public.broadcast_queue (broadcast_id, status);
alter table public.broadcast_queue enable row level security;

-- Ивенты-модификаторы без кода: игра берёт активные и ближайшие.
create table if not exists public.live_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('leaves2x', 'growth', 'discount', 'cutting')),
  title text not null default '',
  params jsonb not null default '{}',  -- growth: {mult}, discount: {pct}, cutting: {form}
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists live_events_end on public.live_events (ends_at);
alter table public.live_events enable row level security;
