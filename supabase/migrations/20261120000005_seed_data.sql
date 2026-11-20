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
