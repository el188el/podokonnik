-- Картинки для сторис Telegram: shareToStory принимает только публичную ссылку,
-- поэтому сгенерированную карточку кладём в публичное хранилище.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', true, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create table if not exists public.story_uploads (
  id bigserial primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists story_uploads_player_idx on public.story_uploads(player_id, created_at desc);
alter table public.story_uploads enable row level security;
