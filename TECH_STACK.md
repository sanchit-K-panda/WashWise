# Tech Stack

| Layer | Choice |
|---|---|
| App | React Native + Expo SDK (latest stable), Expo Router |
| Language | TypeScript (strict) |
| Backend | Supabase (Postgres, Auth, Realtime, Row Level Security) |
| Server state | TanStack Query |
| Client state | Zustand (UI only) |
| Forms/validation | React Hook Form + Zod |
| Styling | NativeWind v4 (tokens from DESIGN.md) |
| Animation | React Native Reanimated + Gesture Handler |
| Icons | lucide-react-native (single icon family) |
| Fonts | Plus Jakarta Sans (headings/UI), JetBrains Mono (timers) via expo-font |
| Notifications | expo-notifications (local scheduled; push for caretaker alerts) |
| Secure storage | expo-secure-store |
| Testing | Jest + React Native Testing Library; Maestro for e2e smoke |
| Quality | ESLint, Prettier, Husky + lint-staged |
| Build/Release | EAS Build, EAS Update |

## Env
EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (no service key in client).

## Auth
Supabase email OTP restricted to allowed college domain; `profiles.role` in ('student','caretaker') checked via RLS.
