-- Античит, этап 0 (только наблюдение) и этап 1 (лимиты).
-- Всё доступно только серверу: RLS включён, политик нет.

-- История сохранений: последние ~20 версий на игрока — для сравнения и отката из панели.
create table if not exists public.save_versions (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  version integer not null,
  state jsonb not null,
  device text,
  created_at timestamptz not null default now()
);
create index if not exists save_versions_player_idx on public.save_versions(player_id, version desc);
alter table public.save_versions enable row level security;

/** Сохранить версию и оставить только последние p_keep. */
create or replace function public.keep_save_version(p_player uuid, p_version integer, p_state jsonb, p_device text, p_keep integer default 20)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into save_versions (player_id, version, state, device) values (p_player, p_version, p_state, p_device);
  delete from save_versions where player_id = p_player and id not in (
    select id from save_versions where player_id = p_player order by version desc, id desc limit p_keep);
end $$;
revoke all on function public.keep_save_version(uuid, integer, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.keep_save_version(uuid, integer, jsonb, text, integer) to service_role;

-- Подозрительные изменения сохранения. Ничего не блокируют — только для панели.
create table if not exists public.cheat_flags (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  kind text not null,          -- leaves_jump, xp_jump, level_jump, time_future, time_back, paid_item
  points integer not null default 1,
  detail jsonb not null default '{}',
  version integer,             -- версия сохранения, на которой заметили
  created_at timestamptz not null default now(),
  dismissed_at timestamptz     -- «Всё в порядке» из панели
);
create index if not exists cheat_flags_player_idx on public.cheat_flags(player_id, created_at desc);
create index if not exists cheat_flags_open_idx on public.cheat_flags(player_id) where dismissed_at is null;
alter table public.cheat_flags enable row level security;

-- Сеть игрока (хеш IP, сам IP не храним) — для лимита регистраций и подарков «самому себе».
alter table public.players add column if not exists reg_ip text;
alter table public.players add column if not exists last_ip text;
create index if not exists players_reg_ip_idx on public.players(reg_ip, created_at) where reg_ip is not null;

-- Реферальная награда теперь выплачивается позже (Telegram, 2 уровень, сутки в игре).
-- Тем, кто пришёл раньше, награда уже выдана — отмечаем их как оплаченных.
alter table public.players add column if not exists referral_paid boolean not null default false;
update public.players set referral_paid = true where referrer is not null and referral_paid = false;

-- Лимит событий аналитики считаем по серверному времени (поле at присылает клиент).
alter table public.analytics_events add column if not exists created_at timestamptz not null default now();
create index if not exists analytics_player_created_idx on public.analytics_events(player_id, created_at);
