# Design — WashWise

Goal: calm, utilitarian, trustworthy. Looks like a well-made campus utility, not a template.

## Anti-slop rules
- No purple/blue gradients, glassmorphism, glow, or floating blob backgrounds.
- No emoji as icons. One icon set (lucide), 1.75 stroke, consistent size (20/24).
- No identical rounded cards repeated with drop shadows. Use flat surfaces, hairline borders, and spacing for hierarchy.
- No "Welcome back 👋" or filler copy. Copy is short, specific, plain ("Machine 3 free", "14 min left").
- No centered hero + giant CTA layouts. Left-aligned, information-first.
- Status is never color-only: always color + icon/shape + label.

## Palette (light blue + white)
| Token | Hex | Use |
|---|---|---|
| bg | #FFFFFF | screens |
| surface | #F3F8FC | grouped areas, inputs |
| sky-50 | #EAF4FB | selected/pressed tint |
| sky-200 | #BFDDF2 | borders on active |
| sky-500 | #3B9AD9 | primary actions, links |
| sky-700 | #1F6FA8 | primary pressed, headings accent |
| ink | #0F2230 | primary text |
| ink-muted | #5B7083 | secondary text |
| hairline | #DCE7F0 | dividers/borders |
Status (muted, accessible on white, AA contrast):
available #1E9E6A · in use #3B9AD9 · maintenance #C98A1B · broken #CF4B4B

## Type
Plus Jakarta Sans: 28/600 screen title, 17/600 section, 15/400 body, 13/500 caption. JetBrains Mono for timers and machine IDs (tabular figures).

## Layout
8pt grid, 20px screen padding, 12px radius max (inputs 10, chips full). Min tap target 48px. Bottom-anchored primary action in thumb zone.

## Key screens
- **Student Home**: top row shows hostel block + "3 of 8 free" summary. Below, machines as a dense 2-column tile grid; each tile: large machine number (mono), status chip, time-left bar if in use. Broken tiles are dimmed with a strike icon, not hidden.
- **Start**: segmented controls for program/temp/spin; weight stepper with capacity bar; sticky footer showing computed duration ("Ends 6:42 PM · 48 min") + Start button.
- **Timer**: huge mono countdown, thin progress ring in sky-500, machine info, "Collected" and "Report issue" secondary actions.
- **Caretaker**: list view (not grid) for fast scanning; swipe or tap to open bottom sheet with 3 status options + note; "Verified at HH:MM" stamp per machine; issues queue tab.

## Motion
150–250ms ease-out. Status chip crossfade on realtime change; countdown digits don't animate. Respect reduce-motion.

## States
Skeletons for lists, offline banner with last-synced time, empty and error states with a retry action.

## Accessibility
AA contrast, dynamic type support, screen-reader labels like "Machine 3, available".
