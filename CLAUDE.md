# WashWise — Agent Instructions

Read this first, then PRD.md, TECH_STACK.md, DATA_MODEL.md, DESIGN.md.

## What we're building
Mobile app (React Native) for hostel laundry. Students see live machine status and get an exact wash timer; the caretaker verifies machine state (free / broken / maintenance).

## Rules
- TypeScript strict. No `any`.
- Expo (managed) + Expo Router. Don't eject.
- Follow DESIGN.md exactly. No default gradients, no emoji icons, no generic "card with shadow + blue button" look.
- Business logic (timer calc) lives in `src/lib/timer.ts`, pure and unit-tested.
- Server is source of truth for machine status and timer end time (`ends_at`). Clients never compute authoritative time.
- Every data access goes through `src/services/*`; screens never call Supabase directly.
- Small commits per feature. Run `npm run lint && npm run typecheck && npm test` before finishing a task.
- Ask before adding any dependency not listed in TECH_STACK.md.

## Folder structure
```
app/                    # Expo Router
  (auth)/login.tsx
  (student)/index.tsx          # machine grid
  (student)/start.tsx          # settings + weight -> timer
  (student)/timer/[id].tsx
  (caretaker)/index.tsx        # verify machines
  (caretaker)/machine/[id].tsx
src/
  components/ ui/ theme/ services/ hooks/ lib/ types/
supabase/migrations/
```

## Definition of done (per feature)
Works on Android + iOS, handles loading/empty/error states, matches DESIGN.md, typed, tested if logic.
