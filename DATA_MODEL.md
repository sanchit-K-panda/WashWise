# Data Model (Postgres / Supabase)

```sql
create type machine_status as enum ('available','in_use','broken','maintenance');
create type user_role as enum ('student','caretaker');

profiles(id uuid pk -> auth.users, name text, role user_role default 'student', hostel_block_id uuid)
hostel_blocks(id, name)
machines(id, block_id, label text, capacity_kg numeric, status machine_status default 'available',
         status_updated_by uuid, status_updated_at timestamptz, note text)
wash_programs(id, name, base_minutes int, per_kg_minutes numeric, active bool)
temp_adjustments(temp text pk, minutes int)
spin_adjustments(spin text pk, minutes int)
wash_sessions(id, machine_id, user_id, program_id, temp, spin, weight_kg numeric,
              started_at, ends_at, collected_at null, status text check in ('running','done','collected','cancelled'))
issue_reports(id, machine_id, reported_by, description, resolved_at null, resolved_by null)
status_log(id, machine_id, old_status, new_status, changed_by, changed_at)
```

## RLS
- Students: read machines in own block; insert own wash_sessions; read own sessions; insert issue_reports.
- Caretakers: update machines.status in own block; read/resolve issue_reports; read status_log.
- Starting a session is an RPC `start_wash(machine_id, program, temp, spin, weight)` that atomically checks status='available', computes ends_at server-side, sets machine in_use. Prevents double-booking.
- A scheduled job (pg_cron) flips expired sessions to 'done' and the machine to 'available' (pending collection).
