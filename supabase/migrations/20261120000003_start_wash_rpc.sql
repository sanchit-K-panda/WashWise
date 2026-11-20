-- 20261120000003_start_wash_rpc.sql
-- RPC start_wash: Atomic reservation, server-side duration calculation, overload rejection

create or replace function public.start_wash(
  p_machine_id uuid,
  p_program_id text,
  p_temp text,
  p_spin text,
  p_weight_kg numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_block_id uuid;
  v_machine public.machines%rowtype;
  v_program public.wash_programs%rowtype;
  v_temp_adj integer := 0;
  v_spin_adj integer := 0;
  v_load_minutes integer;
  v_total_minutes integer;
  v_started_at timestamptz := now();
  v_ends_at timestamptz;
  v_session_id uuid;
begin
  -- 1. Ensure user is authenticated
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- 2. Verify weight is valid
  if p_weight_kg is null or p_weight_kg <= 0 then
    raise exception 'Weight must be greater than 0 kg' using errcode = '22003';
  end if;

  -- 3. Atomic lock on the machine row to prevent double-booking
  select *
  into v_machine
  from public.machines
  where id = p_machine_id
  for update;

  if not found then
    raise exception 'Machine not found' using errcode = 'P0002';
  end if;

  -- 4. Check block matching
  select hostel_block_id
  into v_user_block_id
  from public.profiles
  where id = v_user_id;

  if v_user_block_id is distinct from v_machine.block_id then
    raise exception 'Cannot book machine in a different hostel block' using errcode = '42501';
  end if;

  -- 5. Check machine availability
  if v_machine.status <> 'available' then
    raise exception 'Machine is not available (current status: %)', v_machine.status
      using errcode = 'WW001';
  end if;

  -- 6. Check capacity (reject overload)
  if p_weight_kg > v_machine.capacity_kg then
    raise exception 'Load weight (% kg) exceeds machine capacity (% kg)', p_weight_kg, v_machine.capacity_kg
      using errcode = 'WW002';
  end if;

  -- 7. Fetch wash program
  select *
  into v_program
  from public.wash_programs
  where id = p_program_id and active = true;

  if not found then
    raise exception 'Active wash program not found: %', p_program_id
      using errcode = 'P0002';
  end if;

  -- 8. Fetch temperature adjustment
  select coalesce(minutes, 0)
  into v_temp_adj
  from public.temp_adjustments
  where temp = p_temp;

  if not found then
    raise exception 'Invalid temperature setting: %', p_temp
      using errcode = 'P0002';
  end if;

  -- 9. Fetch spin speed adjustment
  select coalesce(minutes, 0)
  into v_spin_adj
  from public.spin_adjustments
  where spin = p_spin;

  if not found then
    raise exception 'Invalid spin setting: %', p_spin
      using errcode = 'P0002';
  end if;

  -- 10. Server-side authoritative duration calculation
  -- Formula: duration = base(program) + tempAdj(temp) + spinAdj(spin) + loadAdj(weight, machine.capacity_kg)
  v_load_minutes := round(p_weight_kg * v_program.per_kg_minutes);
  v_total_minutes := greatest(1, v_program.base_minutes + v_temp_adj + v_spin_adj + v_load_minutes);
  v_ends_at := v_started_at + (v_total_minutes || ' minutes')::interval;

  -- 11. Update machine status to in_use
  update public.machines
  set status = 'in_use',
      status_updated_by = v_user_id,
      status_updated_at = v_started_at
  where id = p_machine_id;

  -- 12. Create wash session record
  insert into public.wash_sessions (
    machine_id,
    user_id,
    program_id,
    temp,
    spin,
    weight_kg,
    started_at,
    ends_at,
    status
  ) values (
    p_machine_id,
    v_user_id,
    p_program_id,
    p_temp,
    p_spin,
    p_weight_kg,
    v_started_at,
    v_ends_at,
    'running'
  )
  returning id into v_session_id;

  -- 13. Return session payload
  return jsonb_build_object(
    'session_id', v_session_id,
    'machine_id', p_machine_id,
    'machine_label', v_machine.label,
    'program_name', v_program.name,
    'duration_minutes', v_total_minutes,
    'started_at', v_started_at,
    'ends_at', v_ends_at,
    'status', 'running'
  );
end;
$$;
