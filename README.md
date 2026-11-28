# Inquiry Desk

> Never lose track of a potential customer.

Inquiry Desk is a customer-inquiry workspace for small teams. It captures inquiries,
tracks follow-ups and communications, reports on performance, sends in-app reminders,
and supports a subscription experience with simulated billing.

Current status: **Phases 1–10.2 implemented and deployed.**

---

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack, Cache Components) |
| Language   | TypeScript (strict)                                 |
| Styling    | Tailwind CSS 4                                      |
| Icons      | Lucide React                                        |
| Auth/Data  | Firebase Authentication + Cloud Firestore           |
| Server     | Firebase Admin SDK (server-only)                    |
| Deployment | Vercel                                              |
| Fonts      | Self-hosted General Sans + Satoshi                  |

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_FIREBASE_* values from Firebase Console
npm run dev      # http://localhost:3000
```

| Script               | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Development server                                  |
| `npm run build`      | Production build                                    |
| `npm run start`      | Serve the production build                          |
| `npm run lint`       | ESLint                                              |
| `npm test`           | Subscription entitlement unit tests                 |

Dark mode is the default. The header toggle switches to light and back; the choice
is stored in `localStorage` as `inquiry-desk-theme`.

## Routes

| Route                      | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `/`                        | Redirects to `/dashboard`                            |
| `/dashboard`               | Workspace overview, KPIs, follow-up watch, activity  |
| `/inquiries`               | Inquiry list, filters, pinning, archiving, ordering  |
| `/inquiries/[id]`          | Inquiry detail, status, follow-ups, communications   |
| `/follow-ups`              | Follow-up list, filters, groups, completion          |
| `/follow-ups/[id]`         | Follow-up detail, reschedule, cancel, complete       |
| `/reports`                 | Performance reports, charts and CSV export           |
| `/settings`                | Business profile, preferences, sources, account, subscription |
| `/login`, `/register`      | Firebase email/password authentication               |
| `/api/cron/reminders`      | Secured daily reminder sweep (Bearer `CRON_SECRET`) |
| `/api/subscription/*`      | State, trial, access check, checkout, cancel, billing history |

Route access is gated by `AuthGuard` for UX; Firestore security rules are the real
authority. All workspace data is scoped to `workspaces/{uid}`.

## Features

- **Inquiries** — create, edit, status changes, pinning, archiving, manual order,
  detail view, call/WhatsApp links and activity history.
- **Follow-ups** — create, complete, reschedule, cancel, delete, due grouping,
  schedule-version safeguards and notifications.
- **Communications** — manually logged interactions with channel/outcome validation.
- **Reports** — Firestore-derived metrics and trends, bounded reads, All time range,
  CSV export, no fabricated figures.
- **Dashboard** — live KPI band, follow-up watch, recent inquiries and activity.
- **Notifications** — Firestore-backed, realtime, persisted read/delete actions,
  derived alerts, durable delete-all.
- **Reminders** — provider-independent engine, secured cron route, Firebase Admin
  sweep, idempotent generation, in-app delivery only.
- **Subscription** — 14-day trials, entitlements, grandfathering, simulated checkout,
  billing history, cancellation at period end, simulated renewal. **No real payments.**
- **Realtime** — one workspace listener coalesces changes and refreshes dashboard,
  settings, subscription, lists, reports and notifications within seconds.

## Data model

Workspace-scoped Firestore collections under `workspaces/{uid}`:

- `inquiries`, `followUps`, `communications`, `activities`
- `notifications`, `reminderJobs`
- `subscription/current` — plan, status, trial and period timestamps, provider fields
- `checkouts`, `billing` — simulated transactions and sessions

Top-level `trialClaims/{sha256(email)}` prevents repeated trials after account
deletion/recreation. See `FIREBASE_SETUP.md` and `DESIGN.md` for full details.

## Design system

The visual system is documented in `DESIGN.md`. Tokens live in `app/globals.css`
under `@theme` and are mirrored for dark mode:

| Role     | Light      | Dark       | Use                      |
| -------- | ---------- | ---------- | ------------------------ |
| canvas   | `#f5f5f7`  | `#000000`  | Page background          |
| surface  | `#ffffff`  | `#1c1c1e`  | Cards, inputs, popovers  |
| line     | `#d2d2d7`  | `#38383a`  | Hairlines                |
| ink      | `#1d1d1f`  | `#f5f5f7`  | Primary text             |
| brand    | `#0071e3`  | `#0a84ff`  | Primary actions, links   |
| success  | `#248a3d`  | `#30d158`  | Positive status          |
| danger   | `#b42318`  | `#ff453a`  | Destructive actions      |

Principles: monochrome base, one accent, flat surfaces, 12px cards, 8px controls,
hairline dividers, generous whitespace, real data only.

## Environment variables

Client (public, from Firebase Console):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Server-only (never commit, never prefix with `NEXT_PUBLIC_`):

```
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
CRON_SECRET
```

Keep `FIREBASE_ADMIN_PRIVATE_KEY` on one line with literal `\n` escapes.

## Deployment

Production alias: `https://inuiry-desk.vercel.app`.

Firestore rules and indexes are deployed from `firestore.rules` and
`firestore.indexes.json` with the Firebase CLI. Reminder cron is registered in
`vercel.json` as `0 3 * * *` and invokes `/api/cron/reminders` with Bearer
`CRON_SECRET`.

## Documentation

- `FIREBASE_SETUP.md` — Firebase rules, indexes, reminder architecture and cost notes
- `DESIGN.md` — design tokens, type scale, components and layout rules

## Not included

Payment gateway integration (M-Pesa, Stripe, cards), webhooks, automatic recurring
charges, real email/SMS/WhatsApp/push delivery, AI, staff seats, multi-tenant admin,
advanced reporting and paid infrastructure upgrades. Billing is simulated end to end.
