# Build order (agent: do one milestone at a time)
1. Scaffold Expo + TS + NativeWind + Router, theme tokens, fonts, lint/test setup.
2. Supabase project, migrations from DATA_MODEL.md, RLS, seed data (1 block, 8 machines, programs).
3. Auth (OTP) + role-based route groups.
4. Student: machine list with realtime.
5. `timer.ts` + unit tests, Start screen, `start_wash` RPC.
6. Timer screen + local notifications.
7. Caretaker: verify list, status sheet, status_log, force-clear.
8. Issue reports (student create, caretaker resolve).
9. Offline/error/empty states, a11y pass, Maestro smoke tests.
10. EAS build + internal distribution.
