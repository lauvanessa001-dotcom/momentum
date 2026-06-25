# Momentum

An iPhone-first personal motivation app — build habits, track progress, and grow intentionally. No login, no backend, local-first with AsyncStorage.

## Run & Operate

- `pnpm --filter @workspace/momentum run dev` — run the Expo app (workflow: "artifacts/momentum: expo")
- `pnpm --filter @workspace/momentum run typecheck` — typecheck the Expo app
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000, not actively used)

## Stack

- Expo managed workflow, expo-router 6 (file-based tabs under `app/(tabs)/`)
- React Native + Reanimated, react-native-svg, expo-linear-gradient
- AsyncStorage only — single storage key `@momentum/v1`, 300ms debounced persist
- `@react-native-async-storage/async-storage`, expo-haptics, expo-notifications

## Where things live

- `artifacts/momentum/` — the mobile app root
- `artifacts/momentum/contexts/AppContext.tsx` — single source of truth for all state + persistence
- `artifacts/momentum/app/(tabs)/` — 4 tabs: index (Today), habits, progress, profile (You)
- `artifacts/momentum/app/habit/[id].tsx` — habit detail page (streaks, 30-day rate, 13-week heatmap, 6-month trend); tap a habit row to open it
- `artifacts/momentum/constants/colors.ts` — design tokens
- `artifacts/momentum/hooks/useColors.ts` — color hook (light/dark aware)
- `artifacts/momentum/utils/notifications.ts` — notification scheduling helpers

## Architecture decisions

- **AppContext snap ref pattern**: `snap.current` ref always holds latest state; debounced `persist()` needs no arguments and always writes fresh data — avoids stale closure bugs.
- **UUID pattern**: `Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9)` (no external UUID lib).
- **Web insets**: `topPad = isWeb ? 67 : insets.top`, `bottomPad = isWeb ? 34 : insets.bottom` used in every tab screen.
- **SVG ring rotation**: use `transform={rotate(-90, cx, cy)}` as a string attribute (not `rotation`/`originX`/`originY` props — those cause web warnings).
- **Momentum Score**: Habits 60pts + Top3 30pts + CheckIn 10pts = 100max. Mood does NOT affect score.

## Product

4 tabs:
1. **Today** — Momentum Score with score breakdown, daily check-in prompt, today's top 3 priorities, habits widget, Inspire Me quote card, biggest win input
2. **Habits** — full habit list with Life Pillar categories, edit/delete, daily progress ring, category filter row
3. **Progress** — completion ring + bar chart, heatmap, By Life Pillar breakdown, mood trends, habit analytics, longest streaks, monthly summary, On This Day
4. **You** (profile.tsx) — My Why, Growth Journey (3 timelines: 21d/6mo/1yr), Biggest Wins timeline, Saved Quotes, stats grid, mood calendar, notifications settings

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use restart_workflow for the Expo app.
- `colors.radius` comes from `useColors()` hook (it's `colors.radius = 18`).
- Garden tab is hidden via `href: null` in layout.
- `ProgressCircle` component is in `artifacts/momentum/components/ProgressCircle.tsx`.
- expo-notifications `shouldShowBanner` and `shouldShowList` required in newer versions — include them in `setNotificationHandler`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure and package details
- See the `expo` skill for Expo-specific patterns
