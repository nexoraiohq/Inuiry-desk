# Firebase Setup — Inquiry Desk (Phase 2)

Authentication and private workspace foundations use the Firebase web SDK
(`firebase/auth` + `firebase/firestore`). Configuration is read from
environment variables prefixed `NEXT_PUBLIC_FIREBASE_`.

## 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> and create a project
   (e.g. `inquiry-desk`).
2. **Authentication → Sign-in method → Enable** **Email/Password**.

## 2. Create Firestore

1. **Firestore Database → Create database** (production mode).
2. Phase 2 needs no complex indexes — all reads are `getDoc` on a single
   document ID. Composite indexes only appear when multi-field queries land
   (later phases).

## 3. Add a web app

1. Project settings → **Your apps → Add app → Web app**.
2. Copy the Firebase config values into `.env.local` (see below).

## 4. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_FIREBASE_API_KEY=<your-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-project>.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>
```

Notes:

- These are **public web keys** — they are safe to expose to the browser.
- **Never** put service account / Admin SDK private keys here or anywhere in the
  repo.
- `.env.local` is gitignored; `.env.example` is the committed template.
- If the variables are missing, the app shows a clear "Firebase is not
  configured" state instead of attempting fake auth.

## 5. Deploy Firestore security rules

The repo is linked to the live project through `.firebaserc`
(default: `inquiry-desk-33153`) and `firebase.json` points the Firestore Rules
deploy at `firestore.rules`:

```
firebase deploy --only firestore:rules
```

(Or paste the contents of `firestore.rules` into the console → Firestore Rules.)

### Rules summary (`firestore.rules`)

- `users/{uid}`: full read/write only for `auth.uid == uid`.
- `workspaces/{workspaceId}`: access only when `workspaceId == auth.uid`;
  creation requires `ownerUid == auth.uid`; owner cannot change ownerUid.
- All documents nested under a workspace (`workspaces/{uid}/...`) are also
  owner-only; each of `inquiries`, `followUps` and `activities` validates its
  fields and requires `createdByUid == auth.uid` on create.
- Activity events are append-only (no client update or delete).
- All other collections: denied by default.
- Workspace IDs in the MVP equal the user UID (one private workspace per
  account); `ownerUid` is immutable after creation.

## 6. Data written on registration

Registration performs these writes, all keyed by the Firebase Auth UID:

| Collection | Document | Contents |
|---|---|---|
| `workspaces` | `{uid}` | `businessName`, `ownerUid`, `createdAt`, `updatedAt` |
| `users` | `{uid}` | `displayName`, `email`, `workspaceId`, `createdAt` |

Firestore creates these collections automatically when the documents are
written — no manual "tables" need to be created. The code reads both documents
back after writing and rolls back a newly created auth account if setup fails.
If an auth account already exists with missing documents, signing in with the
correct password completes the setup without overwriting existing data.

## 7. Phase 3 workspace data

The dashboard reads three workspace-scoped subcollections:

| Path | Purpose |
|---|---|
| `workspaces/{uid}/inquiries/{inquiryId}` | Customer inquiries and their status |
| `workspaces/{uid}/followUps/{followUpId}` | Scheduled next steps, with due dates |
| `workspaces/{uid}/activities/{activityId}` | Append-only event history |

`firestore.indexes.json` defines the composite index required for pending
follow-ups ordered by `dueAt` (also used for the due-now count). Deploy with:

```
firebase deploy --only firestore:rules,firestore:indexes
```

The dashboard uses aggregation count queries plus bounded `limit()` queries —
it never loads a whole collection to calculate metrics. Total counts are exact
aggregations; new/converted counts come from the bounded active set (up to 200
most recent inquiries) so no composite index is required. A new workspace shows
genuine zero counts and real empty states; no seed data is created.

## 8. Phase 4 inquiry management

`/inquiries` and `/inquiries/[id]` read and write only the authenticated
workspace. Inquiry creation and status changes use Firestore transactions so
the related `inquiry_created`, `note_added` and `status_changed` activity
events are written atomically with the inquiry.

**Query limitation:** Firestore has no full-text search. Search, combined
filters, sorting and pagination operate on a bounded set of the 200 most recent
inquiries (`INQUIRY_FETCH_LIMIT`), ordered by `createdAt`. Counts are exact
server-side aggregations. If a workspace exceeds 200 inquiries, older records
remain in Firestore but will not appear in the management list until this limit
is raised or a dedicated search index is introduced.

`firestore.indexes.json` also includes the composite index for an inquiry's
activity timeline (`inquiryId` + `createdAt`). Activity descriptions never
include phone numbers, email addresses or note contents.

Inquiries support pinning, manual ordering and soft-delete (archiving):

- `pinned` / `pinnedAt` — pinned inquiries always sort above others.
- `sortOrder` — used by the "Manual order" sort; drag rows or use the arrows.
- `archived` — archived inquiries are hidden from the active list and counts.
  Archiving preserves the document, follow-ups and activity history; it is not
  a destructive delete. "Show archived" restores access and offers Restore.

Pinned inquiries always sort first. The queries use single-field indexes only;
the `archived + ...` composite indexes in `firestore.indexes.json` are optional
optimizations and are not required for the dashboard or list to work.

## 9. Phase 5 follow-up engine

`/follow-ups` and `/follow-ups/[id]` manage `workspaces/{uid}/followUps/{id}`.
Follow-ups store `description`, `priority`, `dueAt`, `status`, `completedAt`
and the creator UID. Legacy records without `description` or `priority` are
read with safe defaults (`null` / `normal`).

Dates and times are entered and displayed in the viewer's local timezone and
stored as absolute Firestore Timestamps. Groups are computed dynamically:
overdue, due today, upcoming, completed, cancelled.

Creating, editing, completing, rescheduling, cancelling and permanently
deleting use transactions that also write an activity event
(`follow_up_created`, `follow_up_rescheduled`, `follow_up_completed`,
`follow_up_cancelled`, `follow_up_deleted`, `note_added`) and keep
`inquiries.nextFollowUpAt` equal to the earliest remaining pending date (or
`null` when none remain). Activity descriptions stay generic — no phone,
email or note contents.

The dashboard's "Follow-ups due" metric counts pending follow-ups with
`dueAt <= now`; the "Upcoming follow-ups" list shows only future pending items.

## 10. Phase 6 communication history

`workspaces/{uid}/communications/{communicationId}` stores manually logged
interactions. Each record has an inquiryId, channel, direction, channel-scoped
outcome, summary, local-entered `occurredAt`, timestamps, creator UID and an
optional linked follow-up.

Only outcomes explicitly supported by the chosen channel are accepted. The app
never claims an external message or call was sent or received — the user records
the outcome after completing the interaction through `tel:`, `wa.me` or
`mailto:`. Logging writes a `communication_logged` activity event and updates
the inquiry's `lastContactedAt` atomically.

Editing preserves the original inquiry association, `createdAt` and
`createdByUid`. Communication history is append-only for deletion (no client
delete is allowed) to preserve the audit trail.

## 11. Phase 7 reporting

`/reports` reads only the authenticated workspace's existing collections over a
local-timezone date range (`[start, end)`) using Firestore Timestamp range
queries. Presets cover last 7/30/90 days, this month, previous month and a
custom range. Reads are bounded to 500 records per collection; when that cap is
hit the UI says so explicitly.

Definitions:
- Cohort conversion rate = converted inquiries created in range ÷ all active
  inquiries created in range × 100. Archived inquiries are excluded and shown
  separately.
- Follow-up completion rate = follow-ups created in range and completed in
  range ÷ follow-ups created in range × 100.
- Status distribution reflects **current** status only. The data model does not
  store structured historical conversion dates, so no historical funnel is
  shown; status transitions come from activity descriptions and are labelled as
  such.
- Acquisition uses the existing `source` field; unknown or missing values are
  grouped as `unknown` without altering records.
- Communication analytics use explicitly recorded outcomes only — no automatic
  message or call detection is claimed.

No new composite index is required: date-range queries use single-field
indexes. No security rules were weakened.

## 12. What Phase 7 does *not* wire up (yet)

- WhatsApp Business API, automatic WhatsApp/SMS sending, email infrastructure,
  email tracking, push notifications — later phases.
- AI predictions, revenue/profit reporting, payments, invoicing, staff
  management — later phases.
- Admin SDK / server-side session verification — later phases. Firestore rules
  remain the server-side security boundary.
- Third-party auth providers — later phases.
