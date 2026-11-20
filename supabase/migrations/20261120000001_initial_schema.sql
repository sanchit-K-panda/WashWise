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
