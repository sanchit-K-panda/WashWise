-- 20261120000006_read_running_sessions.sql
-- Allow students in the same block to read active/running wash sessions
-- so they see authoritative time-left and progress on occupied machines.

create policy "Users can read running wash sessions in own block"
  on public.wash_sessions for select
  to authenticated
  using (
    status = 'running'
    and machine_id in (
      select id from public.machines where block_id = public.current_user_block_id()
    )
  );
