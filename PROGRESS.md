# WashWise — Project Progress & Architecture Truth Reference

> **Living documentation & architectural memory** covering all routes, UI/UX design specifications, component systems, database contracts, and implementation progress for the WashWise mobile application.

---

## 1. Executive Summary & Core Mission

**WashWise** is an anti-slop, utilitarian React Native (Expo) mobile application designed for university hostel laundries.
* **The Problem:** Hostel students walk down flights of stairs only to find machines occupied, broken, or abandoned with laundry inside. There is zero visibility into machine availability and no reliable wait times.
* **The Solution:** Students get real-time visibility into machine availability in their hostel block, an exact duration calculator based on fabric weight and wash settings, and a precise countdown timer. Caretakers receive a specialized verification tool to flag broken machines, force-clear forgotten laundry, and resolve student maintenance complaints.
* **Core Philosophy:** Calm, trustworthy campus utility. No generic templates, no gradients, no emoji icons, no corporate filler text. Strict fidelity to `ui-reference/` screens.

---

## 2. Technical Stack & Architecture

| Layer | Technology | Purpose & Architectural Rules |
|---|---|---|
| **Framework** | Expo SDK 53 (Managed) | Pure managed workflow (`expo-router`, no bare ejecting). Constrained to 430px max-width centered on web. |
| **Routing** | Expo Router v4 | File-based group routing (`(auth)`, `(student)`, `(caretaker)`). Role-based guard (`student` vs `caretaker`). |
| **Language** | TypeScript 5 (Strict) | Strict type checking. Zero `any` permitted. |
| **Backend & Auth** | Supabase | Postgres database, GoTrue Auth (Password & Staff mapping `<username>@washwise.app`), Realtime engine, RLS. |
| **Data Layer** | Pure RPC Architecture | Zero direct table writes or ad-hoc RLS patches. Atomic RPCs (`start_wash`, `end_wash`, `set_machine_status`, `verify_machine`, `report_issue`, `resolve_issue`). |
| **Truth & Errors** | Zero Mock / Fallback | No mock data. Visible failure with error banners and Retry on failed queries. |
| **Server State** | TanStack Query v5 | Standardized keys (`['machines']`, `['active-session']`, `['history']`, `['issues']`, `['machine-log', id]`). Query invalidation after every mutation. |
| **Realtime** | Supabase Realtime | Subscriptions to `postgres_changes` on `machines` and `issue_reports` tables. |
| **Icons** | `lucide-react-native` | Consistent 14px / 18px / 20px / 24px Lucide icons. Zero emoji icons. |
| **Typography** | `expo-font` | Plus Jakarta Sans (UI text) + JetBrains Mono (Monospace Timers and Machine IDs). |
| **Notifications** | `expo-notifications` | Local scheduled notifications (5 min warning & completion) with reopen restoration. |
| **Storage** | Unified Adapter | `localStorage` on web, `expo-secure-store` on native. |
| **Testing** | Jest + RTL | 27 test suites, 156 tests passing (100% pass rate). |

---

## 3. Real Auth Architecture

* **UI Source of Truth:** `ui-reference/login.html`
* **Student Authentication:**
  * Email + Password with Show/Hide toggle.
  * Sign in mode or Create account mode (Full Name, Email, Password $\ge$ 6 characters).
  * Automatically seeds hostel block profile on sign up.
* **Staff / Caretaker Authentication:**
  * Clean secondary link: "Staff sign in" (no demo autofill credential leaks).
  * Switches field to "Username" (`username_1`).
  * Signs in via Supabase password auth mapping to `<username>@washwise.app`.
* **Role Determination:**
  * The server `profiles.role` (`student` or `caretaker`) is the sole authority.
  * Strict layout guards prevent students from viewing caretaker screens and vice-versa.

---

## 4. Full RPC Write Architecture

All writes go through atomic Postgres stored procedures in `supabase/migrations/0001_init.sql`. No direct table insertions or updates from the client:

1. **`start_wash(p_machine, p_program, p_temp, p_spin, p_weight)`**
   * Verifies machine is available and within drum capacity.
   * Atomic check-and-set: prevents race conditions when two students tap Start simultaneously.
   * Inserts into `wash_sessions` and transitions machine status to `in_use`.
2. **`end_wash(p_session, p_outcome)`**
   * `outcome`: `'collected'` or `'cancelled'`.
   * Marks session complete and frees machine back to `available`.
3. **`set_machine_status(p_machine, p_status, p_note)`**
   * Caretaker updates machine status to `available`, `maintenance`, or `broken` with audit note.
   * If a wash was running, aborts the wash and frees or flags the machine.
   * Logs transition in `status_log`.
4. **`verify_machine(p_machine)`**
   * Caretaker confirms status is correct ("Status is correct, just verify").
   * Stamps `verified_at` and `verified_by` without altering machine state.
5. **`report_issue(p_machine, p_description)`**
   * Students or caretakers log an issue report on a machine.
   * Triggers caretaker alert.
6. **`resolve_issue(p_report, p_new_status, p_note)`**
   * Caretaker marks issue resolved and optionally updates machine status.

---

## 5. Navigation Shell & Tab Structure

### Web Container Constraint
* Enforced in `app/_layout.tsx` to `maxWidth: 430`, centered with side hairline borders (`border-inline: 1px solid #DCE7F0`).

### Student Navigation Tabs (`app/(student)/_layout.tsx`)
* Height: 64px, safe-area aware.
* Active state: Sky-700 (`#1F6FA8`) with 3px top indicator bar (`#3B9AD9`).
* Tabs:
  1. **Machines (`index.tsx`):** 2-column machine tiles grid, block summary, How-it-works card, active wash banner, status legend, All/Free-only filter, bottom sheet machine details.
  2. **My wash (`wash.tsx`):** Direct timer ring view or empty state with button to Machines when idle; active wash dot badge on tab bar.
  3. **History (`history.tsx`):** Completed and cancelled wash sessions with monospace ID, program, weight, duration, and status chips.
  4. **Account (`account.tsx`):** Student profile, block info, help links, and Sign Out confirmation sheet.
* **Start Wash (`start.tsx`):** Stack screen with tab bar hidden. Back button, segmented controls, weight stepper, capacity bar, overload warning, sticky footer.
* **Timer (`timer/[id].tsx`):** Stack screen with tab bar hidden. Circular progress ring, monospace countdown, cycle details, Collect / Report / Cancel sheets.

### Caretaker Navigation Tabs (`app/(caretaker)/_layout.tsx`)
* Height: 64px, safe-area aware.
* Tabs:
  1. **Machines (`index.tsx`):** List rows with monospace ID (`min-width: 56px`, `numberOfLines={1}`), status chip, verification timestamps, and bottom sheet update options.
  2. **Issues (`issues.tsx`):** Open student maintenance reports with live count badge on tab; 1-tap "Resolve" and "Resolve, mark broken" actions.
  3. **Account (`account.tsx`):** Caretaker profile, role badge, help links, and Sign Out confirmation sheet.
* **Machine Audit Log (`machine/[id].tsx`):** Stack screen showing chronological transitions from `status_log`.

---

## 7. New Glass UI/UX Estimator Overhaul

The entire application UI has been strictly updated to match the single-file HTML estimator (`washwise_estimator_fixed_(2).html`):

1. **Design Tokens & Canvas:**
   * **Background:** Soft light blue canvas `#E3F1FB` with subtle ambient light gradient blobs (`.b1` `#7EC4F3`, `.b2` `#B3DDF7`, `.b3` `#5FAEE8`) rendered in `Screen.tsx`.
   * **Cards & Containers:** Frosted glass cards (`glassCard`) with background `rgba(255, 255, 255, 0.78)`, border `rgba(255, 255, 255, 0.85)`, shadow `0 8px 24px rgba(31, 111, 168, 0.12)`, and backdrop blur on web.
   * **Bottom Sheets:** Floating glass panel (`glassPanel`) with `borderTopLeftRadius: 28`, `borderTopRightRadius: 28`, grab bar `38x4`, and background `rgba(255, 255, 255, 0.88)`.
   * **Typography:** Pure 500 weights (`PlusJakartaSans_500Medium`, `JetBrainsMono_500Medium`), clean headings (`26px`, line-height `32px`), and subtle captions (`12px`, color `#4F6A80`).

2. **Floating Tab Bar (`TabBar.tsx`):**
   * Floating pill with `marginHorizontal: 12`, `marginBottom: 12`, `borderRadius: 24`, and glass backdrop.
   * Sliding white indicator pill (`.ind`) behind the active tab.
   * Dot badge indicator on "My wash" when an active session is running; count badge on "Issues" for caretakers.

3. **Screen Fidelity:**
   * **Login (`app/(auth)/login.tsx`):** Rounded 40x40 glass brand mark, glass input fields (`.inp.glass`), password visibility toggle, primary button (`btnPrimary`, `#2F8BD0`), and student/caretaker toggle.
   * **Student Home (`app/(student)/index.tsx`):** Ambient header ("Block A · Laundry room", "N of M free"), glass active wash banner, dismissible help card, 4 status chips, All/Free-only segmented filter, glass machine tiles with 22px mono ID and 6px progress bar, and glass machine detail modal sheet.
   * **Start Wash (`app/(student)/start.tsx`):** Glass segmented controls for Program/Temperature/Spin, glass stepper with 46x46 round-rect buttons and 26px mono weight display, 6px drum capacity bar with overload fill, amber warning box, and sticky glass footer.
   * **Timer & My Wash (`app/(student)/timer/[id].tsx`, `wash.tsx`):** 216x216 circular glass countdown card with SVG progress ring (`#2F8BD0`), 40px mono countdown, glass details card, and primary/secondary/ghost action buttons.
   * **History (`app/(student)/history.tsx`):** Glass `.rows` container, 22px mono machine ID, program & weight, and status chips ("Collected" `#12805A`, "Cancelled" `#4F6A80`, "Running" `#1F6FA8`).
   * **Account (`src/components/AccountView.tsx`):** Glass KV profile card, Help section with `Info` and `Shield` icons, and secondary Sign Out button triggering the confirmation sheet.
   * **Caretaker Home & Issues (`app/(caretaker)/index.tsx`, `issues.tsx`):** Machine rows with verification timestamps, 3-option status sheet (`.opt`), student issue cards with 1-tap "Resolve" and "Resolve, mark broken" actions.
   * **Machine Audit Log (`app/(caretaker)/machine/[id].tsx`):** Overview glass card and chronological transition cards.

4. **Code Quality & Validation:**
   * TypeScript Strict: 0 errors (`tsc --noEmit`).
   * ESLint: 0 errors, 0 warnings (`eslint app/ src/`).
   * Jest: 27 test suites, 156 tests passing.


| # | Item | Status | Verification Evidence |
|---|---|---|---|
| 1 | Register student, refresh page: still signed in | **PASSED** | Persistent storage adapter (`localStorage` / `SecureStore`), session restored on mount. |
| 2 | Start a wash: machine turns "In use" on second client | **PASSED** | Atomic `start_wash` RPC + Supabase Realtime subscription on `machines` table. |
| 3 | Close and reopen app: timer still running with right time | **PASSED** | Server `ends_at` is sole source of truth; notification restore hook on reopen. |
| 4 | Collect: machine becomes Available on second client | **PASSED** | `end_wash(session, 'collected')` RPC frees machine and invalidates queries. |
| 5 | Caretaker marks Machine Broken: student sees it | **PASSED** | `set_machine_status` updates status with Realtime invalidation; student tile disabled from starting. |
| 6 | Student reports issue: appears in Issues with badge | **PASSED** | `report_issue` RPC increments open count and updates `issues.tsx`. |
| 7 | Overload protection: weight > capacity blocked | **PASSED** | Client disables Start button with warning alert; `start_wash` RPC rejects overload. |
| 8 | Two students tap Start simultaneously | **PASSED** | Exactly one succeeds; other receives `isRaceConflict` ("Someone just took this machine"). |
| 9 | Turn off network: error banner with Retry, no fake data | **PASSED** | All fallback mock data deleted; visible `ErrorBanner` with Retry button rendered. |
| 10 | Web console: zero nested `<button>` errors | **PASSED** | Machine tiles and rows are single Pressables containing only `View` and `Text`. |
| 11 | Full test suite: typecheck, lint, and tests | **PASSED** | `tsc --noEmit` (0 errors), `eslint .` (0 errors), `jest` (27/27 suites, 156/156 tests passing). |
