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
