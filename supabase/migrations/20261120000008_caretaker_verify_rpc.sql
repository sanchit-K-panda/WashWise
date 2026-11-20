-- 20261120000008_caretaker_verify_rpc.sql
-- Caretaker verification and force-clear procedures, plus foreign key to profiles for audit log

-- 1. Foreign key from status_log.changed_by to profiles(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'status_log_changed_by_profile_fkey'
  ) then
    alter table public.status_log
      add constraint status_log_changed_by_profile_fkey
      foreign key (changed_by) references public.profiles(id)
      on delete set null;
  end if;
end;
$$;

-- 2. Caretaker RPC to verify and update machine status and note
create or replace function public.verify_machine_status(
  p_machine_id uuid,
  p_status public.machine_status,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role public.user_role;
  v_machine public.machines%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_role := public.current_user_role();
  if v_role <> 'caretaker' then
    raise exception 'Unauthorized: Only caretakers can verify machine status' using errcode = '42501';
  end if;

  select * into v_machine
  from public.machines
  where id = p_machine_id
  for update;

  if not found then
    raise exception 'Machine not found' using errcode = 'P0002';
  end if;

  -- Verify caretaker belongs to the same block as the machine
  if v_machine.block_id <> public.current_user_block_id() then
    raise exception 'Unauthorized for this hostel block' using errcode = '42501';
  end if;

  update public.machines
  set status = p_status,
      status_updated_at = now(),
      status_updated_by = v_user_id,
      note = p_note
  where id = p_machine_id;

  return jsonb_build_object(
    'success', true,
    'machine_id', p_machine_id,
    'status', p_status,
    'note', p_note,
    'verified_at', now()
  );
end;
$$;

-- 3. Caretaker RPC to force-clear stuck in-use machines
create or replace function public.force_clear_machine(
  p_machine_id uuid,
  p_reason text default 'Force cleared by caretaker'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role public.user_role;
  v_machine public.machines%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_role := public.current_user_role();
  if v_role <> 'caretaker' then
    raise exception 'Unauthorized: Only caretakers can force-clear machines' using errcode = '42501';
  end if;

  select * into v_machine
  from public.machines
  where id = p_machine_id
  for update;

  if not found then
    raise exception 'Machine not found' using errcode = 'P0002';
  end if;

  if v_machine.block_id <> public.current_user_block_id() then
    raise exception 'Unauthorized for this hostel block' using errcode = '42501';
  end if;

  -- Cancel any running or pending wash sessions on this machine
  update public.wash_sessions
  set status = 'cancelled'
  where machine_id = p_machine_id
    and status in ('running', 'done');

  -- Free machine to available
  update public.machines
  set status = 'available',
      status_updated_at = now(),
      status_updated_by = v_user_id,
      note = p_reason
  where id = p_machine_id;

  return jsonb_build_object(
    'success', true,
    'machine_id', p_machine_id,
    'status', 'available',
    'cleared_at', now()
  );
end;
$$;
