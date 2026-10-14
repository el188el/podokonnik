-- Один аккаунт на всех платформах: браузер, Android и Discord входят через Telegram.
-- Устройство (или Discord) после подтверждения в боте навсегда привязано к игроку Telegram.

create table if not exists public.account_links (
  kind text not null check (kind in ('device', 'discord')),
  key text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kind, key)
);
alter table public.account_links enable row level security;

-- Запрос на вход: создаёт устройство, подтверждает игрок в боте.
create table if not exists public.login_requests (
  code text primary key check (code ~ '^[A-Za-z0-9]{20,40}$'),
  link_kind text not null check (link_kind in ('device', 'discord')),
  link_key text not null,
  platform text,
  player_id uuid references public.players(id) on delete cascade, -- заполняется после подтверждения
  confirmed_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists login_requests_created_idx on public.login_requests(created_at);
alter table public.login_requests enable row level security;
