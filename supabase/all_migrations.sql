-- 20261120000001_initial_schema.sql
-- Core schema definition for WashWise from DATA_MODEL.md

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'machine_status') then
    create type machine_status as enum ('available', 'in_use', 'broken', 'maintenance');
  end if;
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('student', 'caretaker');
  end if;
end
$$;

-- 1. Hostel Blocks
create table if not exists public.hostel_blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- 2. User Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role user_role not null default 'student',
  hostel_block_id uuid references public.hostel_blocks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Machines
create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.hostel_blocks(id) on delete cascade,
  label text not null,
  capacity_kg numeric not null check (capacity_kg > 0),
  status machine_status not null default 'available',
  status_updated_by uuid references auth.users(id) on delete set null,
  status_updated_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  constraint machines_block_label_unique unique (block_id, label)
);

-- 4. Wash Programs
create table if not exists public.wash_programs (
  id text primary key,
  name text not null,
  base_minutes integer not null check (base_minutes >= 0),
  per_kg_minutes numeric not null check (per_kg_minutes >= 0),
  active boolean not null default true
);

-- 5. Temp Adjustments
create table if not exists public.temp_adjustments (
  temp text primary key,
  minutes integer not null check (minutes >= 0)
);

-- 6. Spin Adjustments
create table if not exists public.spin_adjustments (
  spin text primary key,
  minutes integer not null check (minutes >= 0)
);

-- 7. Wash Sessions
create table if not exists public.wash_sessions (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id text not null references public.wash_programs(id),
  temp text not null references public.temp_adjustments(temp),
  spin text not null references public.spin_adjustments(spin),
  weight_kg numeric not null check (weight_kg > 0),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  collected_at timestamptz,
  status text not null default 'running' check (status in ('running', 'done', 'collected', 'cancelled'))
);

-- 8. Issue Reports
create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  reported_by uuid not null references auth.users(id) on delete cascade,
  description text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

-- 9. Status Log
create table if not exists public.status_log (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  old_status machine_status not null,
  new_status machine_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- Trigger: Automatically record status change in status_log
create or replace function public.log_machine_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status) then
    insert into public.status_log (
      machine_id,
      old_status,
      new_status,
      changed_by,
      changed_at
    ) values (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.status_updated_by,
      coalesce(NEW.status_updated_at, now())
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists tr_machine_status_change on public.machines;
create trigger tr_machine_status_change
after update on public.machines
for each row
execute function public.log_machine_status_change();

-- Performance Indexes
create index if not exists idx_machines_block_id on public.machines(block_id);
create index if not exists idx_machines_status on public.machines(status);
create index if not exists idx_profiles_block_id on public.profiles(hostel_block_id);
create index if not exists idx_wash_sessions_machine on public.wash_sessions(machine_id);
create index if not exists idx_wash_sessions_user on public.wash_sessions(user_id);
create index if not exists idx_wash_sessions_status on public.wash_sessions(status);
create index if not exists idx_wash_sessions_ends_at on public.wash_sessions(ends_at);
create index if not exists idx_issue_reports_machine on public.issue_reports(machine_id);
create index if not exists idx_status_log_machine on public.status_log(machine_id);
-- 20261120000002_rls_policies.sql
-- Row Level Security policies from DATA_MODEL.md

-- Enable RLS across all tables
alter table public.hostel_blocks enable row level security;
alter table public.profiles enable row level security;
alter table public.machines enable row level security;
alter table public.wash_programs enable row level security;
alter table public.temp_adjustments enable row level security;
alter table public.spin_adjustments enable row level security;
alter table public.wash_sessions enable row level security;
alter table public.issue_reports enable row level security;
alter table public.status_log enable row level security;

-- Helper functions for RLS checks
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_block_id()
returns uuid
language sql
stable
security definer
as $$
  select hostel_block_id from public.profiles where id = auth.uid();
$$;

-- 1. hostel_blocks policies
create policy "Authenticated users can read hostel blocks"
  on public.hostel_blocks for select
  to authenticated
  using (true);

-- 2. profiles policies
create policy "Users can read profiles in same block or own profile"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or hostel_block_id = public.current_user_block_id()
  );

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 3. wash_programs, temp_adjustments, spin_adjustments policies
create policy "Authenticated users can read active wash programs"
  on public.wash_programs for select
  to authenticated
  using (active = true);

create policy "Authenticated users can read temp adjustments"
  on public.temp_adjustments for select
  to authenticated
  using (true);

create policy "Authenticated users can read spin adjustments"
  on public.spin_adjustments for select
  to authenticated
  using (true);

-- 4. machines policies
-- Students and caretakers can read machines in their own block
create policy "Users can read machines in own block"
  on public.machines for select
  to authenticated
  using (
    block_id = public.current_user_block_id()
  );

-- Caretakers can update machine status/note in their own block
create policy "Caretakers can update machines in own block"
  on public.machines for update
  to authenticated
  using (
    block_id = public.current_user_block_id()
    and public.current_user_role() = 'caretaker'
  )
  with check (
    block_id = public.current_user_block_id()
    and public.current_user_role() = 'caretaker'
  );

-- 5. wash_sessions policies
-- Students can read own sessions; Caretakers can read sessions for machines in their block
create policy "Users can read relevant wash sessions"
  on public.wash_sessions for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      public.current_user_role() = 'caretaker'
      and machine_id in (
        select id from public.machines where block_id = public.current_user_block_id()
      )
    )
  );

-- Students can insert own wash sessions
create policy "Students can insert own wash sessions"
  on public.wash_sessions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and machine_id in (
      select id from public.machines where block_id = public.current_user_block_id()
    )
  );

-- Students can update own sessions (e.g. mark collected); Caretakers can update sessions in own block (force-clear)
create policy "Users can update relevant wash sessions"
  on public.wash_sessions for update
  to authenticated
  using (
    user_id = auth.uid()
    or (
      public.current_user_role() = 'caretaker'
      and machine_id in (
        select id from public.machines where block_id = public.current_user_block_id()
      )
    )
  )
  with check (
    user_id = auth.uid()
    or public.current_user_role() = 'caretaker'
  );

-- 6. issue_reports policies
-- Students can read own reports; Caretakers can read all reports in their block
create policy "Users can read relevant issue reports"
  on public.issue_reports for select
  to authenticated
  using (
    reported_by = auth.uid()
    or (
      public.current_user_role() = 'caretaker'
      and machine_id in (
        select id from public.machines where block_id = public.current_user_block_id()
      )
    )
  );

-- Students can insert issue reports for machines in their block
create policy "Students can insert issue reports in own block"
  on public.issue_reports for insert
  to authenticated
  with check (
    reported_by = auth.uid()
    and machine_id in (
      select id from public.machines where block_id = public.current_user_block_id()
    )
  );

-- Caretakers can resolve issue reports in their block
create policy "Caretakers can resolve issue reports in own block"
  on public.issue_reports for update
  to authenticated
  using (
    public.current_user_role() = 'caretaker'
    and machine_id in (
      select id from public.machines where block_id = public.current_user_block_id()
    )
  )
  with check (
    public.current_user_role() = 'caretaker'
  );

-- 7. status_log policies
-- Caretakers can read status logs for machines in their block
create policy "Caretakers can read status log in own block"
  on public.status_log for select
  to authenticated
  using (
    public.current_user_role() = 'caretaker'
    and machine_id in (
      select id from public.machines where block_id = public.current_user_block_id()
    )
  );
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
-- 20261120000005_seed_data.sql
-- Seed data: 1 block, 8 machines with varied capacities, programs, temp and spin adjustments

-- 1. Hostel Block
insert into public.hostel_blocks (id, name)
values ('a0000000-0000-0000-0000-000000000001', 'Block A')
on conflict (id) do update set name = excluded.name;

-- 2. 8 Machines with varied capacity and initial states
insert into public.machines (id, block_id, label, capacity_kg, status, note)
values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '01', 6.5, 'available', null),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '02', 7.0, 'in_use', null),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '03', 7.0, 'available', null),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '04', 8.0, 'in_use', null),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '05', 6.0, 'available', null),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '06', 7.0, 'maintenance', 'Filter cleaning in progress'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '07', 7.5, 'broken', 'Door latch fault'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '08', 8.0, 'available', null)
on conflict (id) do update set
  label = excluded.label,
  capacity_kg = excluded.capacity_kg,
  status = excluded.status,
  note = excluded.note;

-- 3. Wash Programs
insert into public.wash_programs (id, name, base_minutes, per_kg_minutes, active)
values
  ('normal', 'Normal', 35, 2.0, true),
  ('quick', 'Quick', 20, 1.0, true),
  ('heavy', 'Heavy', 45, 3.0, true),
  ('delicates', 'Delicates', 30, 1.5, true),
  ('wool', 'Wool', 35, 1.5, true)
on conflict (id) do update set
  name = excluded.name,
  base_minutes = excluded.base_minutes,
  per_kg_minutes = excluded.per_kg_minutes,
  active = excluded.active;

-- 4. Temperature Adjustments
insert into public.temp_adjustments (temp, minutes)
values
  ('Cold', 0),
  ('30', 3),
  ('40', 5),
  ('60', 8)
on conflict (temp) do update set
  minutes = excluded.minutes;

-- 5. Spin Adjustments
insert into public.spin_adjustments (spin, minutes)
values
  ('Low', 0),
  ('Medium', 2),
  ('High', 4)
on conflict (spin) do update set
  minutes = excluded.minutes;
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
-- 20261120000009_issue_reports_and_notifications.sql
-- RPC for caretaker to resolve issue reports and optionally update machine status

create or replace function public.resolve_issue_report(
  p_issue_id uuid,
  p_machine_status public.machine_status default null,
  p_status_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role public.user_role;
  v_issue public.issue_reports%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_role := public.current_user_role();
  if v_role <> 'caretaker' then
    raise exception 'Unauthorized: Only caretakers can resolve issue reports' using errcode = '42501';
  end if;

  select * into v_issue
  from public.issue_reports
  where id = p_issue_id
  for update;

  if not found then
    raise exception 'Issue report not found' using errcode = 'P0002';
  end if;

  -- Ensure caretaker belongs to the same hostel block as the machine
  if not exists (
    select 1 from public.machines
    where id = v_issue.machine_id
      and block_id = public.current_user_block_id()
  ) then
    raise exception 'Unauthorized for this hostel block' using errcode = '42501';
  end if;

  -- 1. Mark issue report as resolved
  update public.issue_reports
  set resolved_at = now(),
      resolved_by = v_user_id
  where id = p_issue_id;

  -- 2. Optionally update machine status and note
  if p_machine_status is not null then
    update public.machines
    set status = p_machine_status,
        status_updated_at = now(),
        status_updated_by = v_user_id,
        note = p_status_note
    where id = v_issue.machine_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'issue_id', p_issue_id,
    'resolved_at', now(),
    'machine_id', v_issue.machine_id,
    'machine_status', p_machine_status
  );
end;
$$;
