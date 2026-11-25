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

```
firebase deploy --only firestore:rules
```

(Or paste the contents of `firestore.rules` into the console → Firestore Rules.)

### Rules summary (`firestore.rules`)

- `users/{uid}`: full read/write only for `auth.uid == uid`.
- `workspaces/{workspaceId}`: access only when `workspaceId == auth.uid`;
  creation requires `ownerUid == auth.uid`; owner cannot change ownerUid.
- All other collections: denied.
- Workspace IDs in the MVP equal the user UID (one private workspace per
  account); `ownerUid` is immutable after creation.

## 6. What Phase 2 does *not* wire up (yet)

- Inquiry CRUD, follow-up scheduling, reports — Phase 3+.
- Admin SDK / server-side session verification — Phase 3+ (currently Firestore
  rules are the server-side security boundary, evaluated with
  `request.auth` from the client-issued ID token).
- Third-party auth providers — Phase 3+.
