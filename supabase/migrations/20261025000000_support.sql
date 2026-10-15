-- Поддержка: игрок пишет боту обычным сообщением (или /support), сообщение становится обращением.
-- Ответы приходят игроку от этого же бота. Таблицы доступны только серверу (service role).

create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  player_id uuid references public.players(id) on delete set null,
  tg_id bigint not null,
  name text not null default '',
  username text,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  unread integer not null default 0,     -- сообщений игрока без ответа
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_tg on public.support_tickets (tg_id, status);
create index if not exists support_tickets_upd on public.support_tickets (status, updated_at desc);
alter table public.support_tickets enable row level security;

create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.support_tickets(id) on delete cascade,
  dir text not null check (dir in ('in', 'out')), -- in — от игрока, out — ответ поддержки
  text text not null default '',
  photo text,                                      -- file_id фото в Telegram
  tg_message_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket on public.support_messages (ticket_id, id);
alter table public.support_messages enable row level security;
