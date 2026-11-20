-- 20261120000004_cron_and_expiry.sql
-- Scheduled session expiry function and pg_cron job

-- Expiry function that flips expired running sessions to 'done'
-- and frees the machine to 'available' (pending collection).
create or replace function public.expire_wash_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_count integer := 0;
  v_session record;
begin
  -- Loop through all running sessions where ends_at <= now()
  for v_session in
    select id, machine_id
    from public.wash_sessions
    where status = 'running'
      and ends_at <= now()
    for update
  loop
    -- Update session status to done
    update public.wash_sessions
    set status = 'done'
    where id = v_session.id;

    -- Update machine status to available (pending collection)
    update public.machines
    set status = 'available',
        status_updated_at = now(),
        note = 'Cycle completed. Laundry pending collection.'
    where id = v_session.machine_id
      and status = 'in_use';

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
end;
$$;

-- Schedule the job via pg_cron if the extension is available in Supabase
do $$
begin
  if exists (
    select 1
    from pg_available_extensions
    where name = 'pg_cron'
  ) then
    create extension if not exists pg_cron;

    -- Remove prior job if already scheduled
    if exists (select 1 from cron.job where jobname = 'washwise_expire_sessions') then
      perform cron.unschedule('washwise_expire_sessions');
    end if;

    -- Schedule every minute
    perform cron.schedule(
      'washwise_expire_sessions',
      '* * * * *',
      'select public.expire_wash_sessions();'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron could not be configured: %', SQLERRM;
end;
$$;
