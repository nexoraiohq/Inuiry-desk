# Inquiry Desk

> Never lose track of a potential customer.

A customer-inquiry workspace for small teams: capture, organize, track, and follow
up with every potential customer — so nothing slips through.

This repository currently contains **Phase 1: Foundation** — the app shell, the
visual design system, and route placeholders. No data layer is wired up yet.

---

## Stack

| Layer      | Choice                                    |
| ---------- | ----------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)        |
| Language   | TypeScript (strict)                       |
| Styling    | Tailwind CSS 4                            |
| Icons      | Lucide React                              |
| Fonts      | Local `@font-face` via `next/font/local`  |

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

| Script          | Purpose                    |
| --------------- | -------------------------- |
| `npm run dev`   | Development server         |
| `npm run build` | Production build           |
| `npm run start` | Serve the production build |
| `npm run lint`  | ESLint                     |

## Routes

| Route         | State                          |
| ------------- | ------------------------------ |
| `/`           | Redirects to `/dashboard`      |
| `/dashboard`  | Overview: metric + panel shells |
| `/inquiries`  | Empty state                    |
| `/follow-ups` | Empty state                    |
| `/reports`    | Empty state                    |
| `/settings`   | Empty state                    |
| `/login`      | Placeholder (auth is later)    |

All routes are statically rendered.

## Design system

Tokens live in `app/globals.css` under `@theme`:

| Token          | Value     | Use                              |
| -------------- | --------- | -------------------------------- |
| `canvas`       | `#FFFFFF` | Page background                  |
| `surface`      | `#F7F8FC` | Subtle fills, hover states       |
| `line`         | `#E8EAF2` | Borders                          |
| `ink`          | `#111827` | Primary text, active nav pill    |
| `muted`        | `#6B7280` | Secondary text                   |
| `brand`        | `#4F46E5` | Primary action, accents          |
| `success`      | `#16A34A` | Success states                   |

**Typography** — two local Fontshare families (self-hosted, no Google Fonts):

- **General Sans** (400–700) — headings and display; headings render at weight
  700 with `-0.02em` tracking.
- **Satoshi** (400/500/700) — body and UI text.

## Architecture

```
app/
  layout.tsx              Root layout: local fonts, metadata
  page.tsx                "/" → redirect(/dashboard)
  globals.css             Design tokens (@theme) + base typography
  fonts/                  Self-hosted woff2 files
  login/page.tsx          Standalone route (outside the shell)
  (app)/
    layout.tsx            Wraps every signed-in route in AppShell
    dashboard/…           Overview page
    inquiries/…           Placeholder
    follow-ups/…          Placeholder
    reports/…             Placeholder
    settings/…            Placeholder
components/
  layout/                 AppShell, Sidebar, NavList, MobileDrawer, Topbar, HeaderActions
  dashboard/              MetricCard placeholder
  ui/                     Button, Card, Badge, EmptyState primitives
  brand.tsx               BrandMark / BrandName
lib/
  navigation.ts           Single source of truth for nav + page metadata
```

**Shell behaviour**

- Desktop sidebar collapses between 264px and 76px (icon-only, with tooltips).
- Below `lg` the sidebar is replaced by a hamburger-opened drawer that closes on
  Escape, overlay tap, or navigation.
- The header carries the page title, a search affordance, notifications, profile
  access, and the primary **Add Inquiry** action.

## Phase 1 scope

Included: foundation, app shell, design system, route placeholders.

Intentionally deferred (placeholders are visibly marked "Soon"):

- Add Inquiry — Phase 4
- Search, notifications, sign-in
- AI, payments, WhatsApp/email integrations, staff management, multi-tenant admin
- Firebase / any data layer

No fake customer data or invented metrics are rendered anywhere; metric cards
state "No data yet" until a real data source is connected.
