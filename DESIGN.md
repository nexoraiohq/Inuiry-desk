# Inquiry Desk — Design System

## Principles

1. **Clarity before decoration.** Content and data are the hero; UI chrome stays quiet.
2. **Monochrome base, one accent.** Near-black ink, light grey canvas, white surfaces. Blue is reserved for primary actions and links; green and red are statuses only.
3. **Hierarchy through scale and space.** Type size, weight and whitespace carry hierarchy — not borders, gradients or shadows.
4. **Flat, precise surfaces.** 1px hairlines, 12px card radius, 8px control radius. No gradients in application chrome, no drop shadows on ordinary cards.
5. **Dense but calm.** Finance-grade information density with generous breathing room between groups.

Research references: Apple Human Interface Guidelines (clarity, deference, depth; 17px body, 34px large title, semantic colours), Stripe (white canvas, deep navy ink, hairline structure, tight radius, restrained elevation), Linear and Mercury (dark-first precision, colour reserved for state).

## Tokens

Defined in `app/globals.css` as Tailwind v4 `@theme` variables and mirrored in `.dark`.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| canvas | `#f5f5f7` | `#000000` | Page background |
| surface | `#ffffff` | `#1c1c1e` | Cards, inputs, popovers |
| line | `#d2d2d7` | `#38383a` | Hairlines and dividers |
| ink | `#1d1d1f` | `#f5f5f7` | Primary text |
| muted | `#6e6e73` | `#a1a1a6` | Secondary text |
| subtle | `#8e8e93` | `#8e8e93` | Captions, meta |
| brand | `#0071e3` | `#0a84ff` | Primary actions, links, active state |
| success | `#248a3d` | `#30d158` | Positive status |
| danger | `#b42318` | `#ff453a` | Destructive actions, negative status |
| sidebar | `#111318` | `#0a0a0c` | Navigation rail |

Shadows: `shadow-card` is a single 1px soft shadow; `shadow-raised` is used only for dialogs and popovers.

## Type scale

- Display / page title: 28–30px / 600 / -0.03em
- Section title: 16–18px / 600
- Body: 14–15px / 400 / 1.5 line height
- Label: 12–14px / 500
- Caption: 11–12px / 400

Fonts: General Sans for display, Satoshi for UI text.

## Components

- **Card** — `rounded-xl border bg-surface shadow-card`. No per-page background overrides.
- **Button** — 8px radius, two heights (36px / 40px), primary is solid brand.
- **Input / Select / Textarea** — 8px radius, surface fill, hairline border, brand focus ring.
- **Badge** — 12px pill, neutral / brand / success / danger.
- **Notice** — compact tinted banner for success and error feedback.
- **EmptyState** — one short sentence and, where useful, one next action.
- **Dialog** — portalled to `document.body`, centered via `m-auto`, bounded height, overlay `bg-black/65`.
- **PageIntro** — eyebrow, display title, description, hairline rule and action area.
- **DashboardSummary** — flat divided KPI band; no icons competing with values.

## Layout

- Fixed 264px sidebar (80px collapsed), 80px topbar.
- Main content `max-w-[1520px]`, responsive gutters, consistent 20–24px vertical rhythm.
- Dashboard: summary band → 8/4 grid (inquiries + follow-up watch) → full-width activity.

## Rules

- No fake statistics, gradients used as decoration, or per-page colour exceptions.
- No new shadows or radii outside the tokens above.
- Accessibility: visible focus rings, 12px minimum text for meta, 36px minimum control height, `prefers-reduced-motion` honoured.
