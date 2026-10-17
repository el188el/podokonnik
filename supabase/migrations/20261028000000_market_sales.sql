-- Барахолка: кроме обмена — продажа за листики, продажа взрослых растений и объявления только для друзей.
alter table public.swaps add column if not exists price int;            -- цена в листиках (null — обмен)
alter table public.swaps add column if not exists plant jsonb;          -- растение в горшке: {stage, potSize, pot, shape}
alter table public.swaps add column if not exists friends_only boolean not null default false;
