---
name: Village Design System — Tokens & Strategy
description: Core design tokens, dark mode strategy, and typography conventions established in the initial overhaul
type: project
---

The Village uses a "warm hand-printed village noticeboard" design philosophy — warm earth tones, serif body text, not cold tech.

**Why:** The platform is a community for parents; warmth and approachability are core brand values.

**How to apply:** Every new component should feel warm and tactile. Avoid cold grays, blue-dominant palettes, or clinical UI patterns.

## Dark mode strategy
`darkMode: 'class'` in `tailwind.config.ts`. The `.dark` class on `<html>` triggers dark variables.

## CSS Variable tokens (defined in `app/globals.css`)

| Token              | Light             | Dark              | Semantic use                        |
|--------------------|-------------------|-------------------|-------------------------------------|
| `--bg-page`        | `#FAF3E8`         | `#1C1208`         | Page background                     |
| `--bg-surface`     | `#ffffff`         | `#241810`         | Cards, panels                       |
| `--bg-raised`      | `#ffffff`         | `#2E1E10`         | Elevated surfaces (modals)          |
| `--text-primary`   | `#2C1810`         | `#FAF3E8`         | Body text                           |
| `--text-secondary` | `#8B4513`         | `#C4926A`         | Labels, sub-headings                |
| `--text-muted`     | `#A0826D`         | `#8B6B50`         | Timestamps, placeholders            |
| `--border`         | `#E8C99A`         | `#3D2818`         | Card/input borders                  |
| `--accent`         | `#C1440E`         | `#E05A2B`         | CTAs, links, vote active state      |
| `--accent-soft`    | `#FDE8D8`         | `#3D1808`         | Hover background on outlined btns   |
| `--ghost-bg`       | `#3D1F5C`         | `#1A0F2E`         | Ghost post card background          |
| `--ghost-accent`   | `#7C4CA0`         | `#5C3480`         | Ghost text/icon color               |
| `--ghost-pearl`    | `#EDE8F5`         | `#2A1F3D`         | Ghost badge background              |

## Tailwind color palette (`village.*`)
Added under `theme.extend.colors.village`: earth, clay, terracotta, sand, cream, forest, sage, moss, mist, dusk, plum, violet, lavender, pearl, ember, gold, sun.

Use as `text-village-earth`, `bg-village-dusk`, etc. For dynamic dark-mode-aware colors, prefer `bg-[var(--accent)]` syntax over direct palette references.

## Typography
- Body / post content: `font-serif` (Georgia, Times New Roman)
- UI chrome (labels, buttons, badges, timestamps): `.ui-sans` utility class (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- Do NOT use `font-sans` from Tailwind default — always use `.ui-sans` for sans text.

## Role color palette (used across PostCard, RoleBadge, CommentCard)

| Role      | Badge bg    | Badge text  | Comment left-border |
|-----------|-------------|-------------|---------------------|
| mom       | `#FDE8D8`   | `#8B4513`   | `#C1440E`           |
| dad       | `#E8F0FE`   | `#1A3A6C`   | `#1A5276`           |
| guardian  | `#EDE8F5`   | `#3D1F5C`   | `#7C4CA0`           |
| expert    | `#FFF3CD`   | `#7D4E00`   | `#D4A017`           |
| ghost     | `var(--sand)`| `var(--clay)` | `#7C4CA0` (dashed) |
