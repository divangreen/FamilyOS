---
name: Village Design System — Tokens & Strategy
description: Active color palette, typography conventions, role badge colors, and theming strategy for The Village app
type: project
---

## Theme overhaul completed 2026-05-11

The Village was migrated from a warm earth-tone CSS variable system (`var(--accent)`, `var(--clay)`, `var(--earth)`, `var(--bg-page)`, etc.) to a slate/emerald/amber Tailwind token system matching the landing page (`app/page.tsx`). The old CSS variables in `globals.css` are intentionally preserved (not deleted) in case other references still exist — but component files no longer use them.

**Why:** The new landing page established a cleaner, more polished slate/emerald design language. All app pages and components were updated to match it for visual consistency.

**How to apply:** Use Tailwind slate/emerald/amber tokens. Never reintroduce `var(--accent)`, `var(--clay)`, `var(--earth)`, `var(--bg-page)` in component files.

## Dark mode strategy

`darkMode: 'class'` in `tailwind.config.ts`. The app is now **light-first**. Dark mode variants were removed where they conflicted with the new theme. Semantic error states (red) retained standard dark variants only where already present.

## Active color tokens (Tailwind classes only — no CSS vars in components)

- **Page background:** `bg-slate-50`
- **Card/surface:** `bg-white border border-slate-200 rounded-2xl`
- **Primary accent:** `emerald-800` (buttons, links, active states, verified expert)
- **Primary hover:** `emerald-700`
- **Secondary accent:** `amber-50` bg / `amber-800` text (file upload buttons, trust score callouts)
- **Text — heading:** `text-slate-900` with `style={{ fontFamily: 'Georgia, serif' }}`
- **Text — body:** `text-slate-700` or `text-slate-800`
- **Text — muted:** `text-slate-500`
- **Text — timestamps/labels:** `text-slate-400`
- **Border standard:** `border-slate-200`
- **Ghost/anonymous:** `bg-violet-50 text-violet-700 border border-violet-200` (never change)
- **Ghost sidebar panel:** `bg-violet-900 text-violet-100`
- **Ghost card left-border accent:** `border-l-violet-400 border-dashed`

## Role badge palette (RoleBadge.tsx and CommentCard.tsx — must stay in sync)

| Role     | Badge classes |
|----------|---------------|
| mom      | `bg-rose-50 text-rose-700 border border-rose-200` |
| dad      | `bg-sky-50 text-sky-700 border border-sky-200` |
| guardian | `bg-violet-50 text-violet-700 border border-violet-200` |
| expert   | `bg-emerald-50 text-emerald-800 border border-emerald-200` |
| admin    | `bg-slate-100 text-slate-700 border border-slate-200` |

Expert verified indicator: `ShieldCheck` icon from lucide-react (replaces old gold dot + ✓ characters).

## Avatar colors (PostCard.tsx)

| Role     | Bg          | Text           |
|----------|-------------|----------------|
| mom      | `bg-rose-100` | `text-rose-700` |
| dad      | `bg-sky-100`  | `text-sky-700`  |
| guardian | `bg-violet-100` | `text-violet-700` |
| expert   | `bg-amber-50`  | `text-amber-800` |
| ghost    | `bg-violet-100` | `text-violet-700` |

## Comment left-border accent colors (CommentCard.tsx)

| Role     | Border               | Tinted bg        |
|----------|----------------------|------------------|
| mom      | `border-l-rose-400`  | `bg-rose-50/40`  |
| dad      | `border-l-sky-400`   | `bg-sky-50/40`   |
| guardian | `border-l-violet-400`| `bg-violet-50/40`|
| expert   | `border-l-emerald-500`| `bg-emerald-50/40`|
| ghost    | `border-l-violet-400 border-dashed` | `bg-violet-50/30`|

## Typography

- **Headings/titles:** `style={{ fontFamily: 'Georgia, serif' }}` inline (server components) or `font-serif` (Tailwind class). Both patterns exist — prefer `font-serif`.
- **UI chrome:** `ui-sans` class (defined in globals.css as system sans-serif)
- **Muted label pattern:** `text-xs text-slate-400 font-medium ui-sans tracking-widest uppercase`

## Interactive states

- **Focus ring:** `focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600`
- **Card hover:** `hover:shadow-md transition-shadow`
- **Primary button hover:** `hover:bg-emerald-700`
- **Secondary/outline button hover:** `hover:bg-slate-50`
- **Filter pill active:** `bg-emerald-800 border-emerald-800 text-white`
- **Filter pill inactive:** `bg-white border-slate-200 text-slate-700 hover:border-emerald-600 hover:text-emerald-800`

## Header pattern

`bg-white border-b border-slate-200 sticky top-0 z-20`

## Form input pattern

`px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50`

## Button patterns

- **Primary:** `bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl transition`
- **Secondary/outline:** `border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition`
- **Outlined accent:** `border border-emerald-800 text-emerald-800 hover:bg-emerald-50 rounded-lg`

## Status badge patterns (apply-expert page)

- `pending`: `bg-amber-50 border-amber-200 text-amber-800`
- `approved`: `bg-emerald-50 border-emerald-200 text-emerald-800`
- `rejected`: `bg-red-50 border-red-200 text-red-800`
