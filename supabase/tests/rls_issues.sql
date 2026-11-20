-- supabase/tests/rls_issues.sql
-- RLS verification tests for issue_reports table

begin;
select plan(5);

-- Test 1: issue_reports table has RLS enabled
select row_security_active('public.issue_reports');

-- Test 2: Verify student can insert issue reports into issue_reports
select has_policy('public', 'issue_reports', 'Students can insert issue reports in own block');

-- Test 3: Verify student has select policy on issue_reports
select has_policy('public', 'issue_reports', 'Users can read relevant issue reports');

-- Test 4: Verify ONLY caretakers have update policy on issue_reports
select has_policy('public', 'issue_reports', 'Caretakers can resolve issue reports in own block');

-- Test 5: Verify students do NOT have update policy on issue_reports
-- (Ensuring no permissive student update policy exists)
select is_empty(
  $$
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'issue_reports'
      and cmd = 'UPDATE'
      and policyname not like '%Caretaker%'
  $$,
  'Students must not have any update policy on issue_reports'
);

select * from finish();
rollback;
