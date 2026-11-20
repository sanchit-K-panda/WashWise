# WashWise — PRD

## Problem
Hostel students walk to the laundry room and find machines occupied or broken. No visibility, no wait estimate.

## Roles
Student, Caretaker (one or more per hostel block). Role assigned in DB, not chosen at signup.

## Student flow
1. Login (college email OTP).
2. Home: list/grid of machines with status: Available, In use (time left), Broken, Maintenance.
3. Tap an Available machine -> Start screen:
   - Wash program (Normal, Quick, Heavy, Delicates, Wool)
   - Temperature (Cold, 30, 40, 60)
   - Spin speed (Low, Medium, High)
   - Load weight (kg, stepper 1–8, with a hint of machine capacity)
4. App shows exact computed duration -> "Start" reserves the machine and sets `ends_at`.
5. Timer screen: live countdown, local notification 5 min before end and at end.
6. "Collected" button frees machine.
7. Report issue on a machine (flags it for caretaker).

## Caretaker flow
1. Login -> Verify screen: all machines in their block.
2. Per machine: set Free / Broken / Maintenance (+ optional note). Can force-clear a stuck "in use" machine.
3. See student issue reports queue; resolve them.
4. Audit log of status changes.

## Timer logic
duration = base(program) + tempAdj(temp) + spinAdj(spin) + loadAdj(weight, machine.capacity_kg)
Constants live in a `wash_programs` table so caretaker/admin can tune per machine model without app release. Overload (> capacity) blocks Start.

## Realtime
Machine status changes push to all clients (Supabase Realtime). Optimistic UI with rollback.

## Out of scope (v1)
Payments, multi-hostel admin panel, drying machines, queue/waitlist (v2).

## Success metrics
Time-to-find-free-machine < 10s; % of status marked correct by caretaker verification.
