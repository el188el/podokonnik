-- Растение в групповом чате Telegram: одно на чат, поливают все участники.

create table if not exists public.chat_plants (
  chat_id bigint primary key,
  title text not null default '',
  state jsonb not null,
  message_id bigint,              -- последняя карточка растения в чате
  nudged_at timestamptz,          -- когда бот последний раз напоминал
  active boolean not null default true, -- бота удалили из чата — не пишем
  created_at timestamptz not null default now()
);
alter table public.chat_plants enable row level security;

create table if not exists public.chat_care (
  chat_id bigint not null references public.chat_plants(chat_id) on delete cascade,
  tg_id bigint not null,
  name text not null default '',
  waters integer not null default 0,
  last_at timestamptz not null default now(),
  primary key (chat_id, tg_id)
);
alter table public.chat_care enable row level security;
