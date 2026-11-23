-- ==============================================================================
-- WashWise: Comprehensive Database Reset, Schema, RPCs & Seed Migration
-- Safe & Idempotent: Run in Supabase SQL Editor
-- ==============================================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ---------- 1. TEARDOWN ----------
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_auto_confirm on auth.users;
drop view if exists public.machine_board;
drop table if exists public.status_log, public.issue_reports, public.wash_sessions, public.wash_programs,
  public.temp_adjustments, public.spin_adjustments, public.machines, public.profiles, public.hostel_blocks cascade;
drop type if exists public.machine_status, public.user_role cascade;

do $$ declare r record; begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'start_wash','verify_machine_status','force_clear_machine','resolve_issue_report',
      'set_machine_status','verify_machine','collect_wash','cancel_wash','end_wash',
      'report_issue','resolve_issue','is_caretaker','my_block','handle_new_user',
      'log_status_change','auto_confirm_new_user'
    )
  loop execute 'drop function ' || r.sig || ' cascade'; end loop;
end $$;

-- ---------- 2. TYPES & TABLES ----------
create type public.user_role as enum ('student','caretaker');
create type public.machine_status as enum ('available','in_use','maintenance','broken');

create table public.hostel_blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  role public.user_role not null default 'student',
  hostel_block_id uuid references public.hostel_blocks
);

create table public.machines (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.hostel_blocks,
  label text not null,
  capacity_kg numeric(4,1) not null check (capacity_kg > 0),
  status public.machine_status not null default 'available',
  status_updated_by uuid references public.profiles,
  status_updated_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.profiles,
  note text,
  unique (block_id, label)
);

create table public.wash_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_minutes int not null,
  per_kg_minutes numeric not null default 2,
  active boolean not null default true
);

create table public.temp_adjustments (
  temp text primary key,
  minutes int not null
);

create table public.spin_adjustments (
  spin text primary key,
  minutes int not null
);

create table public.wash_sessions (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines,
  user_id uuid not null references public.profiles,
  program_id uuid not null references public.wash_programs,
  temp text not null references public.temp_adjustments,
  spin text not null references public.spin_adjustments,
  weight_kg numeric(4,1) not null check (weight_kg > 0),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  collected_at timestamptz,
  status text not null default 'running' check (status in ('running','collected','cancelled'))
);

create unique index one_running_per_machine on public.wash_sessions (machine_id) where status = 'running';
create unique index one_running_per_user on public.wash_sessions (user_id) where status = 'running';

create table public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines,
  reported_by uuid not null references public.profiles,
  description text not null check (char_length(description) between 3 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles
);

create table public.status_log (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines,
  old_status public.machine_status,
  new_status public.machine_status not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  note text
);

-- ---------- 3. HELPERS & TRIGGERS ----------
create or replace function public.is_caretaker() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'caretaker');
$$;

create or replace function public.my_block() returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select hostel_block_id from public.profiles where id = auth.uid()),
    (select id from public.hostel_blocks order by name limit 1)
  );
$$;

-- Auto-confirm any newly inserted user immediately in database
create or replace function public.auto_confirm_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end $$;

drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_new_user();

-- Automatic profile creation for every auth.user
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
  v_name text;
  v_block_id uuid;
begin
  select id into v_block_id from public.hostel_blocks order by name limit 1;

  v_role := case
    when new.raw_user_meta_data->>'role' = 'caretaker' or new.email like '%@washwise.app' then 'caretaker'::public.user_role
    else 'student'::public.user_role
  end;

  v_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'User'
  );

  insert into public.profiles (id, name, role, hostel_block_id)
  values (new.id, v_name, v_role, v_block_id)
  on conflict (id) do update
  set name = excluded.name,
      role = excluded.role,
      hostel_block_id = coalesce(profiles.hostel_block_id, v_block_id);

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Automatic status transition logging
create or replace function public.log_status_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.status_log (machine_id, old_status, new_status, changed_by, note)
    values (new.id, old.status, new.status, auth.uid(), new.note);
  end if;
  return new;
end $$;

create trigger machines_status_log
  after update of status on public.machines
  for each row execute function public.log_status_change();

-- ---------- 4. READ MODEL FOR STUDENTS ----------
create view public.machine_board as
select
  m.id,
  m.block_id,
  m.label,
  m.capacity_kg,
  m.status,
  m.note,
  m.verified_at,
  m.status_updated_at,
  s.started_at,
  s.ends_at,
  (m.status = 'in_use' and s.ends_at <= now()) as is_finished
from public.machines m
left join lateral (
  select w.started_at, w.ends_at
  from public.wash_sessions w
  where w.machine_id = m.id and w.status = 'running'
  limit 1
) s on true
where m.block_id = public.my_block();

-- ---------- 5. ATOMIC STORED PROCEDURES (RPCS) ----------

-- Start wash
create or replace function public.start_wash(
  p_machine uuid,
  p_program uuid,
  p_temp text,
  p_spin text,
  p_weight numeric
)
returns public.wash_sessions
language plpgsql security definer set search_path = public as $$
declare
  m public.machines;
  prog public.wash_programs;
  t int;
  s int;
  total_min int;
  sess public.wash_sessions;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into m from machines where id = p_machine and block_id = my_block() for update;
  if not found then raise exception 'machine_not_found'; end if;
  if m.status <> 'available' then raise exception 'machine_unavailable'; end if;
  if p_weight is null or p_weight <= 0 or p_weight > m.capacity_kg then raise exception 'overload'; end if;

  select * into prog from wash_programs where id = p_program and active;
  if not found then raise exception 'bad_program'; end if;

  select minutes into t from temp_adjustments where temp = p_temp;
  if not found then raise exception 'bad_temp'; end if;

  select minutes into s from spin_adjustments where spin = p_spin;
  if not found then raise exception 'bad_spin'; end if;

  total_min := prog.base_minutes + t + s + ceil(greatest(p_weight - 1, 0) * prog.per_kg_minutes)::int;

  insert into wash_sessions (machine_id, user_id, program_id, temp, spin, weight_kg, ends_at)
  values (m.id, auth.uid(), prog.id, p_temp, p_spin, p_weight, now() + make_interval(mins => total_min))
  returning * into sess;

  update machines
  set status = 'in_use', status_updated_by = auth.uid(), status_updated_at = now()
  where id = m.id;

  return sess;
exception
  when unique_violation then raise exception 'already_running';
end $$;

-- End wash ('collected' or 'cancelled')
create or replace function public.end_wash(
  p_session uuid,
  p_outcome text
)
returns public.wash_sessions
language plpgsql security definer set search_path = public as $$
declare
  w public.wash_sessions;
begin
  if p_outcome not in ('collected','cancelled') then raise exception 'bad_outcome'; end if;

  update wash_sessions
  set status = p_outcome, collected_at = now()
  where id = p_session and user_id = auth.uid() and status = 'running'
  returning * into w;

  if not found then raise exception 'session_not_found'; end if;

  update machines
  set status = 'available', status_updated_by = auth.uid(), status_updated_at = now()
  where id = w.machine_id and status = 'in_use';

  return w;
end $$;

-- Caretaker: set status & verification
create or replace function public.set_machine_status(
  p_machine uuid,
  p_status public.machine_status,
  p_note text default null
)
returns public.machines
language plpgsql security definer set search_path = public as $$
declare
  m public.machines;
begin
  if not is_caretaker() then raise exception 'forbidden'; end if;
  if p_status = 'in_use' then raise exception 'invalid_status'; end if;

  select * into m from machines where id = p_machine and block_id = my_block() for update;
  if not found then raise exception 'machine_not_found'; end if;

  update wash_sessions
  set status = 'cancelled', collected_at = now()
  where machine_id = m.id and status = 'running';

  update machines
  set status = p_status,
      note = p_note,
      status_updated_by = auth.uid(),
      status_updated_at = now(),
      verified_at = now(),
      verified_by = auth.uid()
  where id = m.id
  returning * into m;

  return m;
end $$;

-- Caretaker: verify without changing status
create or replace function public.verify_machine(
  p_machine uuid
)
returns public.machines
language plpgsql security definer set search_path = public as $$
declare
  m public.machines;
begin
  if not is_caretaker() then raise exception 'forbidden'; end if;

  update machines
  set verified_at = now(), verified_by = auth.uid()
  where id = p_machine and block_id = my_block()
  returning * into m;

  if not found then raise exception 'machine_not_found'; end if;
  return m;
end $$;

-- Report issue
create or replace function public.report_issue(
  p_machine uuid,
  p_description text
)
returns public.issue_reports
language plpgsql security definer set search_path = public as $$
declare
  r public.issue_reports;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from machines where id = p_machine and block_id = my_block()) then
    raise exception 'machine_not_found';
  end if;

  insert into issue_reports (machine_id, reported_by, description)
  values (p_machine, auth.uid(), trim(p_description))
  returning * into r;

  return r;
end $$;

-- Resolve issue
create or replace function public.resolve_issue(
  p_report uuid,
  p_new_status public.machine_status default null,
  p_note text default null
)
returns public.issue_reports
language plpgsql security definer set search_path = public as $$
declare
  r public.issue_reports;
begin
  if not is_caretaker() then raise exception 'forbidden'; end if;

  update issue_reports i
  set resolved_at = now(), resolved_by = auth.uid()
  where i.id = p_report and i.resolved_at is null
    and exists (select 1 from machines m where m.id = i.machine_id and m.block_id = my_block())
  returning * into r;

  if not found then raise exception 'report_not_found'; end if;

  if p_new_status is not null then
    perform set_machine_status(r.machine_id, p_new_status, p_note);
  end if;

  return r;
end $$;

-- ---------- 6. ROW LEVEL SECURITY & PERMISSIONS ----------
alter table public.hostel_blocks enable row level security;
alter table public.profiles enable row level security;
alter table public.machines enable row level security;
alter table public.wash_programs enable row level security;
alter table public.temp_adjustments enable row level security;
alter table public.spin_adjustments enable row level security;
alter table public.wash_sessions enable row level security;
alter table public.issue_reports enable row level security;
alter table public.status_log enable row level security;

-- Policies
create policy blocks_read on public.hostel_blocks for select using (true);
create policy programs_read on public.wash_programs for select using (true);
create policy temps_read on public.temp_adjustments for select using (true);
create policy spins_read on public.spin_adjustments for select using (true);

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or (is_caretaker() and hostel_block_id = my_block()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy machines_read on public.machines for select to authenticated
  using (block_id = my_block());

create policy sessions_read on public.wash_sessions for select to authenticated
  using (user_id = auth.uid() or (is_caretaker() and exists (
    select 1 from public.machines m where m.id = machine_id and m.block_id = my_block()
  )));

create policy issues_read on public.issue_reports for select to authenticated
  using (reported_by = auth.uid() or (is_caretaker() and exists (
    select 1 from public.machines m where m.id = machine_id and m.block_id = my_block()
  )));

create policy log_read on public.status_log for select to authenticated
  using (is_caretaker() and exists (
    select 1 from public.machines m where m.id = machine_id and m.block_id = my_block()
  ));

-- Privileges
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant select on public.hostel_blocks, public.wash_programs to anon;
grant update (name) on public.profiles to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_caretaker(),
  public.my_block(),
  public.start_wash(uuid,uuid,text,text,numeric),
  public.end_wash(uuid,text),
  public.set_machine_status(uuid,public.machine_status,text),
  public.verify_machine(uuid),
  public.report_issue(uuid,text),
  public.resolve_issue(uuid,public.machine_status,text)
to authenticated;

-- ---------- 7. REALTIME ENGINE ----------
do $$ begin alter publication supabase_realtime add table public.machines; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.issue_reports; exception when others then null; end $$;

-- ---------- 8. SEED DATA ----------
insert into public.hostel_blocks (name) values ('Block A') on conflict (name) do nothing;

insert into public.machines (block_id, label, capacity_kg)
select (select id from public.hostel_blocks where name = 'Block A'), l, c
from (values ('01',7.0),('02',7.0),('03',8.0),('04',7.0),('05',7.0),('06',7.0)) as v(l,c)
on conflict (block_id, label) do nothing;

insert into public.wash_programs (name, base_minutes)
values ('Eco',35),('Normal',45),('Heavy',60),('Delicates',30)
on conflict (name) do nothing;

insert into public.temp_adjustments values ('cold',0),('30',4),('40',8),('60',15)
on conflict (temp) do nothing;

insert into public.spin_adjustments values ('low',0),('medium',2),('high',5)
on conflict (spin) do nothing;

-- ---------- 9. USER AUTO-CONFIRMATION & CARETAKER BOOTSTRAP ----------

-- Confirm all existing users in auth.users
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- Bootstrap Caretaker Account: username_1@washwise.app / caretaker123
do $$
declare
  v_caretaker_id uuid := 'c0000000-0000-0000-0000-000000000001';
  v_block_id uuid;
begin
  select id into v_block_id from public.hostel_blocks where name = 'Block A' limit 1;

  if not exists (select 1 from auth.users where email = 'username_1@washwise.app') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_caretaker_id,
      'authenticated',
      'authenticated',
      'username_1@washwise.app',
      crypt('caretaker123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Hostel Caretaker","role":"caretaker"}',
      now(),
      now()
    );

    begin
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        v_caretaker_id,
        format('{"sub":"%s","email":"%s"}', v_caretaker_id, 'username_1@washwise.app')::jsonb,
        'email',
        now(),
        now(),
        now()
      );
    exception when others then
      null;
    end;
  else
    select id into v_caretaker_id from auth.users where email = 'username_1@washwise.app';
    update auth.users
    set encrypted_password = crypt('caretaker123', gen_salt('bf')),
        email_confirmed_at = now()
    where id = v_caretaker_id;
  end if;

  insert into public.profiles (id, name, role, hostel_block_id)
  values (v_caretaker_id, 'Hostel Caretaker', 'caretaker', v_block_id)
  on conflict (id) do update
  set role = 'caretaker',
      name = 'Hostel Caretaker',
      hostel_block_id = v_block_id;

  -- Ensure profile exists for all auth.users (including student sanchitdono3@gmail.com)
  insert into public.profiles (id, name, role, hostel_block_id)
  select
    u.id,
    coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Student'),
    case when u.raw_user_meta_data->>'role' = 'caretaker' then 'caretaker'::public.user_role else 'student'::public.user_role end,
    v_block_id
  FROM auth.users u
  where u.id <> v_caretaker_id
  on conflict (id) do update
  set hostel_block_id = coalesce(profiles.hostel_block_id, v_block_id);
end $$;
