-- 20261120000007_collect_wash_rpc.sql
-- RPC to atomically mark a wash session collected and free the machine to 'available'

create or replace function public.collect_wash(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_session public.wash_sessions%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
  into v_session
  from public.wash_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Wash session not found' using errcode = 'P0002';
  end if;

  -- Allow session owner or caretaker to mark collected
  if v_session.user_id <> v_user_id and public.current_user_role() <> 'caretaker' then
    raise exception 'Not authorized to collect this session' using errcode = '42501';
  end if;

  -- Update session status to collected
  update public.wash_sessions
  set status = 'collected',
      collected_at = now()
  where id = p_session_id;

  -- Update machine status to available
  update public.machines
  set status = 'available',
      status_updated_at = now(),
      note = null
  where id = v_session.machine_id;

  return jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'machine_id', v_session.machine_id,
    'collected_at', now()
  );
end;
$$;
