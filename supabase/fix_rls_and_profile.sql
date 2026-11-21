-- Fix machines RLS to allow reading by all authenticated users
drop policy if exists "Users can read machines in own block" on public.machines;
create policy "Users can read machines in own block"
  on public.machines for select
  to authenticated
  using (
    public.current_user_block_id() is null
    or block_id = public.current_user_block_id()
    or true
  );

-- Update all existing profiles to have the default hostel block A
update public.profiles
set hostel_block_id = 'a0000000-0000-0000-0000-000000000001'
where hostel_block_id is null;

-- Ensure hostel block A exists
insert into public.hostel_blocks (id, name)
values ('a0000000-0000-0000-0000-000000000001', 'Block A')
on conflict (id) do nothing;

-- Ensure seed machines exist
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
on conflict (id) do nothing;
