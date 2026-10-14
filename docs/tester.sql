-- Выдать все привилегии для теста.
-- Supabase → SQL Editor → вставить → Run. Потом открыть игру в Telegram.
--
-- Что получишь: «Садовник+» на год, 5000 листиков, 12 уровень (все виды открыты),
-- весь декор и горшки, кухня и балкон, все редкие формы черенками
-- и платная ветка текущего ивента со всеми уровнями.
--
-- Сейчас выдаётся всем игрокам из Telegram. Когда игроков станет больше,
-- замени условие на свой id: where tg_id = 123456789  (id можно узнать у @userinfobot).

update public.players
set plus_until = now() + interval '365 days'
where tg_id is not null;

insert into public.inbox (player_id, kind, payload)
select id, 'tester', '{}'::jsonb
from public.players
where tg_id is not null;
