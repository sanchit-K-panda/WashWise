# WashWise — Project Progress & Memory Reference

> **Living documentation & architectural memory** covering all routes, UI/UX design specifications, component systems, database contracts, and implementation progress for the WashWise mobile application.

---

## 1. Executive Summary & Core Mission

**WashWise** is an anti-slop, utilitarian React Native (Expo) mobile application designed for university hostel laundries.
* **The Problem:** Hostel students routinely walk down flights of stairs to laundry rooms only to find machines occupied, broken, or abandoned with clothes inside. There is zero visibility into machine availability and no reliable wait times.
* **The Solution:** Students get real-time visibility into machine availability in their hostel block, an exact duration calculator based on fabric weight and wash settings, and a precise countdown timer. Caretakers receive a specialized verification tool to flag broken machines, force-clear forgotten laundry, and resolve student maintenance complaints.
* **Core Philosophy:** Calm, trustworthy campus utility. No generic templates, no gradients, no emoji icons, no corporate filler text.

---

## 2. Technical Stack & Architecture

| Layer | Technology | Purpose & Architectural Rules |
|---|---|---|
| **Framework** | Expo SDK 53 (Managed) | Pure managed workflow (`expo-router`, no bare ejecting). |
| **Routing** | Expo Router v4 | File-based routing with group layouts (`(auth)`, `(student)`, `(caretaker)`). |
| **Language** | TypeScript 5 (Strict) | Strict type checking. Zero `any` permitted. |
| **Backend & Auth** | Supabase | Postgres database, GoTrue Auth (Password & Fixed Caretaker), Realtime engine, RLS. |
| **Server State** | TanStack Query v5 | Server cache, polling, query invalidations, optimistic mutations. |
| **Client State** | Zustand / Context | Pure UI state and `AuthContext` for session persistence. |
| **Styling** | NativeWind v4 (Tailwind CSS) | Custom design token configuration (`tailwind.config.js`). |
| **Icons** | `lucide-react-native` | Single icon family; 1.75 stroke width; consistent 18/20/24px sizing. |
| **Typography** | `expo-font` | Plus Jakarta Sans (UI text) + JetBrains Mono (Timers, IDs). |
| **Notifications** | `expo-notifications` | Local scheduled countdown alerts (5 min warning & completion). |
| **Storage** | `expo-secure-store` | Encrypted session token and offline profile storage. |
| **Testing** | Jest + React Native Testing Library | Unit tests for timer logic, services, UI components, and routes. |
| **Code Quality** | ESLint + Prettier + Husky | Strict linting on pre-commit (`lint-staged`). |

---

## 3. Route Catalogue & Screen Architecture

The app uses Expo Router file-based nested group routing. Access is role-protected via `useProtectedRoute` in `src/hooks/useAuth.tsx`.

```
app/
├── index.tsx                         # Root splash / role-based router redirect
├── _layout.tsx                       # Root layout: Fonts, QueryClient, AuthProvider, SafeArea
├── (auth)/
│   ├── _layout.tsx                   # Auth stack layout (header hidden)
│   ├── login.tsx                     # Unified Student & Caretaker Sign-in / Registration
│   └── __tests__/login.test.tsx      # Auth screen tests
├── (student)/
│   ├── _layout.tsx                   # Student stack layout
│   ├── index.tsx                     # Student Home: 2-column machine grid & block summary
│   ├── start.tsx                     # Wash Configuration & Weight Stepper screen
│   ├── timer/
│   │   ├── [id].tsx                  # Live Circular Progress Wash Timer & Controls
│   │   └── __tests__/id.test.tsx     # Timer screen unit tests
│   ├── __tests__/index.test.tsx      # Student Home tests
│   └── __tests__/start.test.tsx      # Start Wash screen tests
└── (caretaker)/
    ├── _layout.tsx                   # Caretaker stack layout
    ├── index.tsx                     # Caretaker Home: Verification list & issue reports queue
    ├── machine/
    │   ├── [id].tsx                  # Machine Audit Log & Status History screen
    │   └── __tests__/id.test.tsx     # Audit log screen tests
    └── __tests__/index.test.tsx      # Caretaker Home tests
```

### Detailed Route Specifications

#### 1. Root & Navigation Dispatcher
* **Path:** `/` (`app/index.tsx`)
* **Access:** Public (Redirects immediately)
* **Function:** Inspects active session and user role in `useAuth`:
  * If unauthenticated $\rightarrow$ redirects to `/(auth)/login`
  * If `role === 'student'` $\rightarrow$ redirects to `/(student)`
  * If `role === 'caretaker'` $\rightarrow$ redirects to `/(caretaker)`

#### 2. Authentication Screen
* **Path:** `/(auth)/login` (`app/(auth)/login.tsx`)
* **Access:** Unauthenticated users
* **Tabs & Modes:**
  1. **Student Tab:**
     * **Sign In Sub-mode:** Email (`testID="email-input"`) + Password (`testID="password-input"`). Submits via `signInWithPassword`.
     * **Register Sub-mode:** Full Name (`testID="name-input"`), Email, Password (min 6 chars). Submits via `signUpWithPassword` and seeds default hostel block.
  2. **Caretaker Tab:**
     * **Pre-configured Credentials:** Username: `username_1`, Password: `caretaker123`.
     * **1-Tap Autofill Action:** Quick demo button autofills credentials and enables instant access.
* **UI Features:** Left-aligned calm alert box on error, no emojis, full touch targets (48px+), accessible tabs.

#### 3. Student Machine Grid (Home)
* **Path:** `/(student)` (`app/(student)/index.tsx`)
* **Access:** Role `'student'`
* **Features:**
  * **Header:** Current hostel block name (e.g., "Block A Laundry Room") + Sign Out button.
  * **Summary KPI:** "3 of 8 free" headline (`typography.screenTitle`).
  * **Active Session Banner:** If the student currently has a running wash, a sticky high-priority banner shows machine number, live progress ring, and link to the timer.
  * **2-Column Tile Grid:** Each machine tile displays:
    * Machine number in JetBrains Mono (`01`, `02`, etc.)
    * Drum capacity (e.g. `7.0 kg drum`)
    * Dynamic status chip (`Available`, `In Use`, `Maintenance`, `Broken`)
    * Time-left progress bar (if `in_use`)
    * Dimmed visual state with strike indicator for broken machines (never hidden from grid).
  * **Pull-to-Refresh & Realtime:** Auto-subscribes to Supabase Realtime machine changes; refetches on pull.

#### 4. Wash Configuration & Program Selection
* **Path:** `/(student)/start` (`app/(student)/start.tsx`)
* **Query Params:** `?machineId=<uuid>`
* **Access:** Role `'student'`
* **Features:**
  * **Machine Banner:** Confirms selected machine label and maximum drum capacity.
  * **Program Segmented Control:** Eco, Normal, Heavy, Delicates (fetches base minutes).
  * **Water Temperature:** Cold (+0 min), 30°C (+4 min), 40°C (+8 min), 60°C (+15 min).
  * **Spin Speed:** Low (+0 min), Medium (+2 min), High (+5 min).
  * **Load Weight Selector:** Stepper and slider (1.0 kg to 8.0 kg).
    * Live capacity indicator bar.
    * Overload protection: If weight exceeds machine capacity, button is disabled with an explanatory alert.
  * **Sticky Footer Zone:** Displays computed finish time (`Ends at 7:15 PM · 48 min`) and thumb-friendly "Start wash" CTA.

#### 5. Live Countdown Timer
* **Path:** `/(student)/timer/[id]` (`app/(student)/timer/[id].tsx`)
* **Route Param:** `id` (Wash session UUID)
* **Access:** Role `'student'`
* **Features:**
  * **Circular Progress Ring:** SVG ring using `sky-500` progress track, responsive stroke width.
  * **Giant Monospace Timer:** `typography.monoTimer` (48px JetBrains Mono) with format `MM:SS` or `H:MM:SS`. Driven by a shared clock snapshot (`useSyncExternalStore`).
  * **Cycle Details:** Program, temperature, spin, load weight, and estimated finish timestamp.
  * **Actions:**
    * **"Wash collected" Button:** Frees the machine immediately (`collectWash`), cancels local notifications, and returns home.
    * **"Report issue" Button:** Opens modal to log machine faults directly to the caretaker's queue.
    * **"Cancel wash" Action:** Prompts confirmation to abort cycle.

#### 6. Caretaker Verification Dashboard
* **Path:** `/(caretaker)` (`app/(caretaker)/index.tsx`)
* **Access:** Role `'caretaker'`
* **Features:**
  * **Verification List:** Dense, scannable list view (optimized for walk-through inspections).
  * **Machine Item Details:**
    * Machine number (`01`, `02`)
    * Status chip
    * "Verified at HH:MM" stamp
    * Last active user info
  * **Action Modals:**
    * **Change Machine Status:** 1-tap buttons to set `available`, `maintenance`, or `broken` with an optional note.
    * **Force-Clear Machine:** Resets an abandoned or stuck "in-use" machine back to available.
  * **Issue Reports Queue:** Secondary tab listing unaddressed student maintenance requests with quick "Mark Resolved" functionality.
  * **Audit Log Link:** Tap machine row to view historical changes.

#### 7. Caretaker Machine Audit Log
* **Path:** `/(caretaker)/machine/[id]` (`app/(caretaker)/machine/[id].tsx`)
* **Route Param:** `id` (Machine UUID)
* **Access:** Role `'caretaker'`
* **Features:**
  * Chronological status transition history (`old_status` $\rightarrow$ `new_status`).
  * Timestamps and author tags.
  * Attached maintenance notes.

---

## 4. UI/UX Design System Specification

### Design Philosophy: "Anti-Slop"

WashWise intentionally breaks away from generic mobile design patterns. The app feels like a durable, well-engineered piece of public utility software:
1. **No decorative gradients or glassmorphism:** No multi-colored linear gradients, no translucent blurred overlays, no neon glows.
2. **Strict typography hierarchy:** Two font families only. No custom decorative script or display fonts.
3. **No emojis as UI icons:** All iconography is sourced from `lucide-react-native` with consistent 1.75 stroke width.
4. **No repetitive cards with floating drop shadows:** Surfaces are defined by clean `#F3F8FC` fills, 1px `#DCE7F0` hairline borders, and strict 8pt grid spacing.
5. **No centered hero banners:** Layouts are left-aligned, utilitarian, and lead directly with data.
6. **No color-only status indicators:** Every machine status pairs a specific color with an icon and clear textual label (WCAG accessible).

---

### Design Tokens & Color Palette

#### Base Theme Tokens (`src/theme/tokens.ts`)

| Token | Hex Value | Usage / Semantics |
|---|---|---|
| `bg` | `#FFFFFF` | Primary screen canvas background. |
| `surface` | `#F3F8FC` | Grouped cards, input backgrounds, active tile surfaces. |
| `sky.50` | `#EAF4FB` | Subtle selected tint, hover/press states. |
| `sky.200` | `#BFDDF2` | Active border highlights, progress ring track background. |
| `sky.500` | `#3B9AD9` | Primary interactive color, buttons, active chips, progress ring fill. |
| `sky.700` | `#1F6FA8` | Primary button pressed state, emphasized headers. |
| `ink.DEFAULT`| `#0F2230` | High-contrast body text, headings, machine numbers. |
| `ink.muted` | `#5B7083` | Secondary labels, captions, metadata, input icons. |
| `hairline` | `#DCE7F0` | 1px dividers, card borders, unselected input borders. |

#### Machine Status Tokens

| Status | Hex Value | Semantic Meaning | Icon Pairing |
|---|---|---|---|
| `available` | `#1E9E6A` | Machine is ready for a new wash cycle. | `CheckCircle2` |
| `in_use` | `#3B9AD9` | Cycle currently running; shows remaining time. | `Clock` |
| `maintenance`| `#C98A1B` | Temporarily shut down for filter cleaning/servicing. | `Wrench` |
| `broken` | `#CF4B4B` | Out of order; latch error, drum failure, electrical issue. | `Ban` |

---

### Typography Hierarchy

Configured via `PlusJakartaSans` and `JetBrainsMono` font families:

| Text Style | Font Family | Size / Line Height | Weight | Typical Usage |
|---|---|---|---|---|
| `screenTitle` | Plus Jakarta Sans | 28px / 34px | SemiBold (600) | Top screen headings, "0 of 8 free" summary |
| `section` | Plus Jakarta Sans | 17px / 22px | SemiBold (600) | Group headers, card titles, modal headings |
| `body` | Plus Jakarta Sans | 15px / 20px | Regular (400) | Descriptions, configuration options, input values |
| `caption` | Plus Jakarta Sans | 13px / 18px | Medium (500) | Secondary metadata, helper text, timestamps |
| `monoTimer` | JetBrains Mono | 48px / 56px | SemiBold (600) | Live countdown clock (`MM:SS`), tabular figures |
| `monoMachineId`| JetBrains Mono | 24px / 28px | SemiBold (600) | Large machine numbers on tiles (`01`, `02`) |

---

### Layout, Spacing & Tap Targets

* **Grid Base:** Strict 8pt system (multiples of 4, 8, 16, 24, 32).
* **Screen Padding:** Uniform 20px horizontal screen gutter (`px-5`).
* **Corner Radius Constraints:**
  * Maximum radius across the entire app is **12px** (`rounded-md` / `rounded-card`).
  * Inputs: **10px** (`rounded-input`).
  * Status chips / pills: Full pill (`rounded-full`).
* **Minimum Tap Target:** **48px $\times$ 48px** for all interactive buttons, steppers, and tabs (WCAG 2.5.5 / 2.5.8 compliant).
* **Thumb Zone:** Primary submit actions are pinned to a sticky bottom footer above the home indicator.

---

### Core UI Component Primitives (`src/components/ui/`)

1. **`Screen` (`Screen.tsx`):**
   * Wraps all views in `SafeAreaView` with automatic header management (`title`, `subtitle`, `onBack`, right actions).
   * Supports `scrollable` and non-scrollable modes with embedded pull-to-refresh (`RefreshControl`).
   * Provides `stickyFooter` prop anchored directly into the thumb zone.
2. **`Button` (`Button.tsx`):**
   * Variants: `primary` (`bg-sky-500` $\rightarrow$ pressed `bg-sky-700`), `secondary` (`bg-surface` border `hairline`), `danger` (`bg-status-broken`), `ghost`.
   * Built-in loading spinner, left and right icons, 48px minimum height.
3. **`Chip` (`Chip.tsx`):**
   * Displays status with required icon + text label.
   * Color-coded to `available`, `in_use`, `maintenance`, `broken`.
4. **`ProgressRing` (`ProgressRing.tsx`):**
   * SVG-based smooth circular timer ring with configurable stroke width and percentage animation.
5. **`Skeleton` (`Skeleton.tsx`):**
   * Content placeholder matching exact component layout geometry; avoids visual shifts during initial data loading.
6. **`Text` (`Text.tsx`):**
   * Typed text component enforcing typography tokens and high-contrast color choices.

---

### Interaction & System States

* **Loading State:** Machine tiles render pulsing skeletons with exact 2-column dimensions.
* **Empty State:** If a block has no machines registered, displays a centered card with clear explanatory text and contact caretaker guidance.
* **Error State:** Network failures show a retry button with cached data preserved.
* **Offline Fallback:** If live network connection drops or database RLS temporarily blocks requests, services gracefully fall back to local mock data to prevent blocking student workflows.

---

## 5. Business Logic & Timer Computation

All timer calculations reside exclusively in pure, unit-tested functions in `src/lib/timer.ts`:

$$\text{Total Duration (minutes)} = T_{\text{base}}(\text{program}) + \Delta T(\text{temp}) + \Delta T(\text{spin}) + \Delta T(\text{load})$$

### Calculation Parameters:
1. **Base Program Duration:**
   * Eco: 35 minutes
   * Normal: 45 minutes
   * Heavy: 60 minutes
   * Delicates: 30 minutes
2. **Temperature Adjustment:**
   * Cold: +0 min
   * 30°C: +4 min
   * 40°C: +8 min
   * 60°C: +15 min
3. **Spin Speed Adjustment:**
   * Low: +0 min
   * Medium: +2 min
   * High: +5 min
4. **Load Weight Adjustment:**
   * Formula: $+2\text{ minutes per kg}$ over the baseline $1.0\text{ kg}$.
   * Overload Guard: If $\text{weight} > \text{machine.capacity\_kg}$, the calculation marks the configuration as invalid and blocks the start action.

---

## 6. Database Schema & Security Contracts

The database runs on Supabase (PostgreSQL 15) with Row Level Security (RLS) enabled on all tables:

```sql
-- Core Tables
hostel_blocks (id uuid pk, name text)
profiles (id uuid pk -> auth.users, name text, role user_role, hostel_block_id uuid -> hostel_blocks)
machines (id uuid pk, block_id uuid -> hostel_blocks, label text, capacity_kg numeric, status machine_status, status_updated_by uuid, status_updated_at timestamptz, note text)
wash_programs (id uuid pk, name text, base_minutes int, per_kg_minutes numeric, active bool)
wash_sessions (id uuid pk, machine_id uuid -> machines, user_id uuid -> profiles, program_id uuid, temp text, spin text, weight_kg numeric, started_at timestamptz, ends_at timestamptz, collected_at timestamptz, status text)
issue_reports (id uuid pk, machine_id uuid -> machines, reported_by uuid -> profiles, description text, resolved_at timestamptz, resolved_by uuid -> profiles)
status_log (id uuid pk, machine_id uuid -> machines, old_status machine_status, new_status machine_status, changed_by uuid, changed_at timestamptz, note text)
```

### Stored Procedures (Atomic RPCs)
* `start_wash`: Atomically checks machine availability, verifies weight $\le$ capacity, sets machine to `in_use`, creates `wash_sessions` record, and returns authoritative `ends_at`.
* `verify_machine_status`: Updates machine state, logs audit entry in `status_log`, and records verification timestamp.
* `force_clear_machine`: Caretaker override that terminates active wash sessions and restores machine to `available`.
* `resolve_issue_report`: Closes student ticket and updates machine status.

---

## 7. Current Implementation Status & Test Coverage

### Milestone Checklist

| Milestone | Description | Status | Verification |
|---|---|---|---|
| **M1** | Expo + TypeScript Strict + NativeWind + Theme Tokens | **Complete** | Theme tokens, fonts, zero TS errors |
| **M2** | Supabase Migrations, Schemas, Seed Data | **Complete** | `all_migrations.sql` & `fix_rls_and_profile.sql` |
| **M3** | Auth System & Role-Based Navigation | **Complete** | Password Auth + Caretaker `username_1` |
| **M4** | Student Machine Grid & Realtime Feed | **Complete** | 2-column tile grid, realtime subscription |
| **M5** | Wash Config, Weight Stepper & Timer Calculation | **Complete** | Pure `timer.ts` + `useWashConfig` |
| **M6** | Live Countdown Timer & Circular Progress | **Complete** | `ProgressRing` + `useSyncExternalStore` |
| **M7** | Caretaker Verification, Status Sheet & Force-Clear | **Complete** | List verification + Audit Log |
| **M8** | Issue Reporting (Student Create / Caretaker Resolve) | **Complete** | Modal reporting & resolution queue |
| **M9** | Offline/Error/Empty States & Full Test Suite | **Complete** | **21 test suites / 124 tests passing (100%)** |
| **M10** | EAS Build & Production Packaging | **Ready** | Configured in `eas.json` & `app.json` |

### Test Suite Summary
* **Test Runner:** Jest 29 + React Native Testing Library
* **Total Test Suites:** **21 passing** (0 failing)
* **Total Tests:** **124 passing** (0 failing)
* **Coverage Highlights:**
  * Pure logic: `timer.test.ts` (100% boundary testing)
  * Services: `auth.test.ts`, `machines.test.ts`, `caretaker.test.ts`, `wash.test.ts`, `notifications.test.ts`, `supabase.test.ts`
  * UI Primitives: `Button.test.tsx`, `Chip.test.tsx`, `ProgressRing.test.tsx`, `Screen.test.tsx`, `Skeleton.test.tsx`, `Text.test.tsx`
  * Route Screens: `login.test.tsx`, student `index.test.tsx`, student `start.test.tsx`, student `timer/[id].test.tsx`, caretaker `index.test.tsx`, caretaker `machine/[id].test.tsx`

---

## 8. Credentials & Testing Guide

### Caretaker Access
* **Role Tab:** Select **Caretaker** on the login screen.
* **Username:** `username_1`
* **Password:** `caretaker123`
* **Convenience:** Tap the **Autofill** button on the form for 1-tap population.

### Student Access
* **Role Tab:** Select **Student** on the login screen.
* **Registration:** Tap **"Don't have an account? Register"** and supply Full Name, Email, and Password.
* **Sign In:** Enter any registered email and password to access the student laundry room.

### Development Servers
* **Metro Web:** `http://localhost:8081`
* **LAN Mobile (Expo Go):** `exp://192.168.31.177:8081`
