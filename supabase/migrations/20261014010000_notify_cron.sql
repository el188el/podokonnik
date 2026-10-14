-- Напоминания по расписанию внутри Supabase: pg_cron раз в 30 минут
-- вызывает функцию notify через pg_net. Не тратит минуты GitHub Actions.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Ставит (или обновляет) задание. Вызывается функцией notify при деплое,
-- секрет выводится из токена бота и в репозитории не хранится.
create or replace function public.schedule_notify(p_url text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_url !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/notify$' or p_secret !~ '^[0-9a-f]{48}$' then
    raise exception 'bad arguments';
  end if;
  perform cron.schedule(
    'podokonnik-notify',
    '*/30 * * * *',
    format(
      $job$select net.http_post(url := %L, headers := jsonb_build_object('x-cron-secret', %L), body := '{}'::jsonb, timeout_milliseconds := 60000)$job$,
      p_url, p_secret
    )
  );
end;
$$;

revoke all on function public.schedule_notify(text, text) from public, anon, authenticated;
grant execute on function public.schedule_notify(text, text) to service_role;
