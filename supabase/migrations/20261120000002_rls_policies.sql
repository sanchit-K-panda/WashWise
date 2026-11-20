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
