# WashWise

> A calm, utilitarian mobile laundry utility for hostel students and caretakers. Built with Expo SDK 58 (managed, Expo Router), TypeScript strict, NativeWind v4, and Supabase.

---

## Table of Contents

1. [Overview & Features](#overview--features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Local Setup & Environment Variables](#local-setup--environment-variables)
5. [Database Migrations & Setup](#database-migrations--setup)
6. [Tuning `wash_programs` & Calculation Parameters](#tuning-wash_programs--calculation-parameters)
7. [EAS Builds & Internal Android APK](#eas-builds--internal-android-apk)
8. [Testing & Verification](#testing--verification)

---

## Overview & Features

WashWise eliminates laundry room friction in student hostels by providing real-time visibility, accurate countdown timers, and streamlined caretaker management.

### Student Experience
- **Live Machine Grid**: 2-column machine cards showing status (Available, In Use, Maintenance, Broken), drum capacity, and remaining time.
- **Availability Summary**: Clean, information-first block header (`3 of 8 free`).
- **Wash Cycle Configurator**: Segmented controls for program, wash temperature, spin speed, and a load weight stepper with a capacity bar.
- **Server-Authoritative Countdown**: Large tabular mono timer derived from server `ends_at`, rendered inside a thin progress ring (`#3B9AD9`).
- **Reminders & Alerts**: Local notifications scheduled 5 minutes before cycle completion and when ready for pickup.
- **Issue Reporting**: Directly report malfunctions from machine tiles or the timer screen.

### Caretaker Experience
- **Fast-Scanning Inspection List**: Displays every machine with a `Verified HH:MM` timestamp.
- **Bottom Sheet Quick Actions**: One-tap status updates (Free, Maintenance, Broken) with optional diagnostics notes and optimistic UI rollback on network error.
- **Force-Clear Capability**: Immediate recovery for abandoned wash cycles or stuck sessions.
- **Issue Queue**: Dedicated tab for student-reported issues with one-tap status resolution.
- **Audit History**: Machine-by-machine log of all status transitions and staff actions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Expo SDK 58 (Managed, Expo Router v5, Don't eject) |
| **Language** | TypeScript (Strict mode enabled, zero `any`) |
| **Styling** | NativeWind v4 (Tailwind CSS tokens, light blue theme) |
| **Icons** | Lucide React Native (`lucide-react-native`, 1.75 stroke) |
| **Fonts** | Plus Jakarta Sans (UI) & JetBrains Mono (Timers/IDs) |
| **State & Cache** | TanStack Query v5 + Zustand |
| **Backend & Auth** | Supabase (PostgreSQL, Row Level Security, Realtime, OTP Auth) |
| **Testing** | Jest, React Native Testing Library, Maestro E2E |

---

## Prerequisites

- **Node.js**: `v20.x` or `v24.x`
- **npm**: `v10.x` or higher
- **Expo CLI**: Included with `npx expo`
- **EAS CLI**: `npm install -g eas-cli` (for cloud and local builds)
- **Supabase CLI**: For local database development and running migrations (`npm install -g supabase`)
- **Maestro CLI**: Optional, for running automated mobile smoke flows

---

## Local Setup & Environment Variables

1. **Clone the repository and install dependencies**:
   ```bash
   git clone https://github.com/your-org/washwise.git
   cd washwise
   npm install
   ```

2. **Configure environment variables**:
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

   Configure the required keys in `.env`:
   ```env
   # Supabase Project Credentials
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

   # College Email Restriction (e.g. college.edu restricts OTP to student@college.edu)
   EXPO_PUBLIC_COLLEGE_EMAIL_DOMAIN=college.edu

   # Build Variant (development | preview | production)
   EXPO_PUBLIC_APP_VARIANT=development
   ```

3. **Start the development server**:
   ```bash
   npx expo start
   ```
   - Press `a` to run on an Android emulator or connected device.
   - Press `i` to run on an iOS simulator.
   - Scan the QR code with Expo Go on a physical phone.

---

## Database Migrations & Setup

All database migrations reside in `supabase/migrations/` and include complete schema definitions, Row Level Security (RLS) policies, atomic RPCs, and automated session expiration via `pg_cron`.

### Running with Supabase CLI

1. **Link your Supabase project**:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

2. **Push migrations to the remote database**:
   ```bash
   npx supabase db push
   ```

3. **Alternatively, apply migrations locally**:
   ```bash
   npx supabase start
   npx supabase db reset
   ```

### Migration Manifest

- `20261120000001_initial_schema.sql`: Core tables (`hostel_blocks`, `machines`, `profiles`, `wash_programs`, `temp_adjustments`, `spin_adjustments`, `wash_sessions`, `status_log`, `issue_reports`).
- `20261120000002_rls_policies.sql`: Strict Row Level Security policies guaranteeing student separation and caretaker administrative rights.
- `20261120000003_start_wash_rpc.sql`: Atomic `start_wash` PostgreSQL function checking machine availability, verifying capacity, and setting server `ends_at`.
- `20261120000004_cron_and_expiry.sql`: Background worker and trigger logic expiring stale sessions.
- `20261120000005_seed_data.sql`: Seed data containing Block A, 8 initial washing machines, standard programs, and adjustments.
- `20261120000006_read_running_sessions.sql`: RLS policies enabling student lookup of active cycles.
- `20261120000007_collect_wash_rpc.sql`: Atomic `collect_wash` function marking cycles collected and freeing machines.
- `20261120000008_caretaker_verify_rpc.sql`: `verify_machine_status` and `force_clear_machine` RPCs with audit logging.
- `20261120000009_issue_reports_and_notifications.sql`: Issue escalation and resolution RPC with machine status updates.

---

## Tuning `wash_programs` & Calculation Parameters

Wash cycle durations are computed using a deterministic, pure function on both the client (for live UI estimation) and the server (authoritative `start_wash` RPC).

### The Timing Formula
$$\text{Duration (minutes)} = \text{round}\Big(\text{base\_minutes} + \text{temp\_minutes} + \text{spin\_minutes} + (\text{per\_kg\_minutes} \times \text{weight\_kg})\Big)$$

### Database Schema

1. **`wash_programs` Table**:
   - `id` (`text`, Primary Key): Program identifier (`normal`, `quick`, `heavy`, `delicates`, `wool`).
   - `name` (`text`): User-facing program label.
   - `base_minutes` (`integer`): Baseline duration for an empty drum.
   - `per_kg_minutes` (`numeric(4,2)`): Additional wash time added per kilogram of dry laundry.
   - `active` (`boolean`): Whether the program appears in the student UI.

2. **`temp_adjustments` Table**:
   - `temp` (`text`, Primary Key): Temperature setting (`Cold`, `30`, `40`, `60`).
   - `minutes` (`integer`): Additional heating runtime.

3. **`spin_adjustments` Table**:
   - `spin` (`text`, Primary Key): Spin speed setting (`Low`, `Medium`, `High`).
   - `minutes` (`integer`): High-speed centrifugal extraction time.

### Tuning SQL Examples

You can run these SQL statements in the Supabase SQL Editor or include them in a new migration to adjust durations for your hostel's hardware:

#### 1. Adjust an Existing Program's Duration
```sql
-- Change Quick wash from 20 minutes to 15 minutes base time
update public.wash_programs
set base_minutes = 15,
    per_kg_minutes = 0.75
where id = 'quick';
```

#### 2. Introduce a New Eco Wash Program
```sql
insert into public.wash_programs (id, name, base_minutes, per_kg_minutes, active)
values ('eco', 'Eco 40-60', 50, 1.25, true)
on conflict (id) do update set
  name = excluded.name,
  base_minutes = excluded.base_minutes,
  per_kg_minutes = excluded.per_kg_minutes,
  active = excluded.active;
```

#### 3. Adjust Temperature Heating Costs
```sql
-- Winter season heating adjustment: increase heating duration for 60°C wash
update public.temp_adjustments
set minutes = 10
where temp = '60';
```

#### 4. Disable a Program Without Deleting Records
```sql
-- Temporarily hide Wool cycle from student selector
update public.wash_programs
set active = false
where id = 'wool';
```

---

## EAS Builds & Internal Android APK

WashWise is configured with `eas.json` supporting three distinct build profiles:

| Profile | Target Environment | Distribution | Output Format |
|---|---|---|---|
| `development` | Local Development | Internal | Dev Client (Debug APK / iOS Simulator) |
| `preview` | Staff & Student Testing | Internal | **Standalone Android APK** (`.apk`) |
| `production` | Play Store / App Store | Store Submission | Android App Bundle (`.aab`) / IPA |

### Generating an Internal Android APK

To build a standalone `.apk` that can be directly sideloaded onto Android devices without Google Play Store setup:

```bash
# 1. Login to your Expo account
eas login

# 2. Configure project ID if first time
eas init

# 3. Trigger the internal preview APK build
eas build --profile preview --platform android
```

Once the build finishes on EAS servers, EAS provides a direct download link and QR code for the `.apk` file.

To build locally using your machine's Android SDK:
```bash
eas build --profile preview --platform android --local
```

### Production Release Build
```bash
eas build --profile production --platform all
```

---

## Testing & Verification

WashWise enforces strict quality and accessibility standards. Run the test suite before submitting pull requests:

```bash
# Run unit and integration tests (21 test suites, 117+ tests)
npm test

# Run ESLint validation
npm run lint

# Run TypeScript strict typecheck
npm run typecheck

# Format codebase with Prettier
npm run format
```

### Maestro E2E Smoke Flows
Automated end-to-end flows are provided in the `.maestro/` directory:

1. **Student Start-to-Collect Journey**:
   ```bash
   maestro test .maestro/student_start_to_collect.yaml
   ```
   *Flow: Launch → Select Machine 01 → Adjust load weight → Start wash → Verify live timer countdown → Collect laundry → Verify machine freed.*

2. **Caretaker Verification Journey**:
   ```bash
   maestro test .maestro/caretaker_mark_broken.yaml
   ```
   *Flow: Launch → Inspect machines → Tap machine row → Open bottom sheet → Set status to Broken → Record note → Save verification → View status history audit log.*
