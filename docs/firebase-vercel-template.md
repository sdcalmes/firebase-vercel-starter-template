# Firebase + Vercel Repeatable Application Guide

This template stands up a production-ready Firebase + Vercel app in roughly an hour. The happy path is:

1. Create a Firebase project + a Vercel project.
2. Paste env vars into both.
3. Deploy Firebase backend (rules, indexes, functions).
4. Push the repo — Vercel auto-builds and goes live.

## The Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend / hosting | **Next.js 16 App Router on Vercel** | SSR + API routes + zero-config deploys. |
| Auth | **Firebase Auth** (Email/Password + Google OAuth) | Drop-in sign-in, cheap, works with Firestore rules. |
| Database | **Firestore** | Realtime, security rules, no server to run. |
| File storage | **Firebase Cloud Storage** | Rules-protected blob store. |
| Background jobs | **Firebase Cloud Functions v2** (scheduler + Firestore triggers) | Cron + reactive hooks next to the data. |
| Package manager | **Bun** | Fast installs, native TS runner for scripts. |
| Tests | **Vitest** (unit/jsdom + rules + integration via emulator) | One runner, three project configs. |
| PWA + push | **Serwist** + **Web Push / VAPID** | Native install, notifications without FCM tokens. |
| Rate limiting | **Upstash Redis** (optional, falls back to memory) | Cross-instance limits on serverless. |
| Error monitoring | **Sentry** (optional) | Only uploads source maps on production builds. |

## Repository Shape

```
.
├── .env.example                # Template for local + Vercel env
├── .firebaserc                 # Firebase project aliases
├── firebase.json               # Emulator ports + deploy targets
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Composite indexes
├── storage.rules               # Cloud Storage rules
├── vercel.json                 # Vercel overrides (keep minimal)
├── next.config.ts              # Headers, image remotePatterns, Sentry wrapper
├── instrumentation.ts          # Next.js instrumentation entry (Sentry)
├── instrumentation-client.ts   # Browser Sentry init
├── functions/                  # Cloud Functions (separate package)
│   ├── package.json            # Its own deps; node 24
│   ├── src/index.ts            # onSchedule + onDocument* triggers
│   ├── src/send.ts             # Web Push helper
│   └── .env.example            # Functions-scoped env (VAPID, etc.)
├── scripts/
│   ├── deploy-firebase.sh      # rules + indexes + storage + functions
│   └── deploy-rules.sh         # rules-only fast path
├── src/
│   ├── app/                    # App Router pages + API routes
│   │   ├── api/health/route.ts # Liveness ping
│   │   └── sw.ts               # Serwist service worker + Web Push handler
│   ├── context/AuthContext.tsx # Auth + user-doc bootstrap
│   └── lib/
│       ├── api-middleware.ts   # verifyAuth, verifyAdminRole
│       ├── rateLimit.ts        # Upstash-or-memory rate limiter
│       ├── logger.ts           # JSON logger (prod) / pretty (dev)
│       └── firebase/
│           ├── config.ts       # Client SDK + emulator auto-wire
│           └── admin.ts        # Admin SDK for API routes
├── tests/
│   ├── helpers/firebase-test-utils.ts
│   ├── rules/                  # Firestore rules tests (@firebase/rules-unit-testing)
│   └── integration/            # End-to-end against emulator
└── .github/workflows/ci.yml    # Lint, typecheck, unit, build, rules, integration
```

## Prerequisites (one-time, per machine)

```bash
# Bun (package manager + TS runner)
curl -fsSL https://bun.sh/install | bash

# Firebase CLI (for deploys + emulators)
bun add -g firebase-tools
firebase login

# Vercel CLI (optional — useful for pulling env to local)
bun add -g vercel
vercel login

# Java (needed by the Firestore emulator)
# macOS: brew install openjdk@21
```

## Step 1 — Firebase Project

1. **Create the project.** <https://console.firebase.google.com> → *Add project*. Enable Google Analytics only if you want it (the client auto-skips Analytics when using emulators).
2. **Enable the products you need:**
   - *Authentication* → enable **Email/Password** and **Google** providers. Add `localhost` and your Vercel production domain to *Authorized domains*.
   - *Firestore Database* → create in Native mode, pick a region.
   - *Storage* → create default bucket.
   - *Functions* → upgrade to **Blaze** (pay-as-you-go). Required for Cloud Functions. Free tier covers hobby usage.
3. **Register a Web App.** Project settings → *General* → *Your apps* → `</>`. Copy the `firebaseConfig` — these become your `NEXT_PUBLIC_FIREBASE_*` vars.
4. **Create a service account for server-side use.** Project settings → *Service accounts* → *Generate new private key*. Download the JSON; you'll paste the entire blob into one env var (`FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`). **Never commit this file.**
5. **(If using Google One Tap sign-in)** Google Cloud Console → *APIs & Services* → *Credentials*. Copy the *Web Client ID* auto-created for your Firebase project → `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
6. **(If using Web Push)** Generate a VAPID keypair locally:
   ```bash
   npx web-push generate-vapid-keys --json
   ```
   Keep the public key (`NEXT_PUBLIC_FIREBASE_VAPID_KEY`), private key (`VAPID_PRIVATE_KEY`), and a `mailto:` subject (`VAPID_SUBJECT`). These are distinct from anything in the Firebase console.

## Step 2 — Clone & Configure Locally

```bash
git clone <repo> && cd <repo>
bun install
cp .env.example .env.local
cp functions/.env.example functions/.env      # only if using Web Push
```

Fill `.env.local` with the values from Step 1 — see the [Environment Variables](#environment-variables) reference below. For local dev you can leave `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` unset; the Admin SDK auto-targets the emulator.

Update `.firebaserc` with your project IDs:

```json
{
  "projects": {
    "default": "my-app-dev",
    "production": "my-app-prod"
  }
}
```

Update `next.config.ts` → `withSentryConfig` → `org`/`project` if you enabled Sentry. Otherwise leave `NEXT_PUBLIC_SENTRY_DSN` unset and the Sentry wrapper is skipped at build time.

## Step 3 — Run Locally

Two terminals:

```bash
# Terminal 1 — Firebase emulators (Auth + Firestore + Storage + Functions)
bun run emulators          # fresh each start
bun run emulators:persist  # persist data across restarts via ./firebase-data

# Terminal 2 — Next.js
bun dev                    # http://localhost:3000
```

Emulator UI: <http://localhost:4000>. `src/lib/firebase/config.ts` auto-connects to the emulators when `NODE_ENV === "development"` or `NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"`.

## Step 4 — Deploy the Firebase Backend

Firebase owns: security rules, composite indexes, and Cloud Functions. Vercel does **not** deploy these — you push them with the Firebase CLI.

```bash
# One-shot: rules + indexes + storage + functions
bun run deploy:firebase

# Fast path: rules only
bun run deploy:rules

# Functions only (rebuild + deploy)
bun run deploy:functions
```

Both scripts read `NEXT_PUBLIC_FIREBASE_PROJECT_ID` from `.env.prod` (git-ignored). Create that file alongside `.env.local` with the **production** project ID before first deploy.

**Functions-specific env.** Cloud Functions do not inherit your Vercel or `.env.local` values — they read `functions/.env` (bundled into the function at deploy time) or secrets set via `firebase functions:secrets:set`. For this stack that typically means VAPID keys:

```bash
# functions/.env
NEXT_PUBLIC_FIREBASE_VAPID_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:you@example.com"
```

Commit `functions/.env.example`; keep `functions/.env` git-ignored.

## Step 5 — Connect Vercel

1. Vercel dashboard → *Add New* → *Project* → import the GitHub repo.
2. **Framework preset**: Next.js (auto-detected). **Build command**: `bun run build`. **Install command**: `bun install --frozen-lockfile`.
3. **Environment Variables**: add every entry from the [reference](#environment-variables) under *Production*, *Preview*, and *Development* as appropriate. `NEXT_PUBLIC_*` vars must be identical across environments unless you want per-env behavior.
4. **Important**: paste `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` as a single-line JSON blob (Vercel's textarea handles the newlines fine — don't `\n`-escape manually).
5. **Deploy**. The first push to `main` auto-builds; preview branches get preview URLs automatically.
6. **Post-deploy in Firebase**: Authentication → Settings → *Authorized domains* → add your Vercel production domain and `*.vercel.app` if you want previews to sign in.

### What Vercel hosts vs. what Firebase hosts

| Runs on | Concerns |
| --- | --- |
| Vercel | Next.js pages, API routes (`src/app/api/**`), the service worker bundle, static assets, security headers (`next.config.ts`). |
| Firebase | Auth, Firestore, Storage, scheduled + reactive Cloud Functions, security rules, indexes. |

You don't use Firebase Hosting at all. The client talks to Firebase via the public SDK; server code in Next.js API routes uses the Admin SDK with the service account.

## Step 6 — Verify

```bash
curl https://<your-domain>/api/health
# → { "status": "ok", "timestamp": "...", "version": "<short-sha>" }
```

Sign in, create a doc, watch it appear in the Firestore console. Trigger any scheduled function manually via the Firebase console → *Functions* → ⋮ → *Run now*.

## Environment Variables

Grouped by purpose. **Public** = exposed to the browser (`NEXT_PUBLIC_` prefix); safe but visible. **Server** = never prefix with `NEXT_PUBLIC_`.

### Firebase client (Public, required)

From Firebase console → Project settings → *Your apps*.

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID   # optional, analytics only
```

### Firebase Admin (Server, required for API routes in prod)

```
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON   # full JSON blob from the service-account download
```

Alternative (if you prefer split fields): `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (escape newlines as `\n`). The admin singleton in `src/lib/firebase/admin.ts` handles both shapes.

### Emulator wiring (Local only)

```
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080
NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199

# Admin SDK also reads these (no NEXT_PUBLIC_ prefix):
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

**Do not set any of these in Vercel** — they will silently point production at localhost.

### Web Push (Public + Server, if using notifications)

```
NEXT_PUBLIC_FIREBASE_VAPID_KEY       # public VAPID key
VAPID_PRIVATE_KEY                    # server only
VAPID_SUBJECT=mailto:you@example.com
```

Also required in `functions/.env` if Cloud Functions send push.

### App URL (Public, required)

```
NEXT_PUBLIC_APP_URL=https://your-domain.com    # used in invite / email-verification links
```

### Upstash Redis (Server, optional)

Falls back to in-memory rate limiting if unset — fine for low traffic, wrong for serverless at scale.

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

### Sentry (Public + Server, optional)

```
NEXT_PUBLIC_SENTRY_DSN               # safe to ship client-side; leaving it unset skips all Sentry init
SENTRY_AUTH_TOKEN                    # Vercel only; source-map upload at build
```

`next.config.ts` only wraps with Sentry when `NEXT_PUBLIC_SENTRY_DSN` is present, and only creates a Sentry release when `VERCEL_ENV === "production"` — preview deploys won't pollute your release list.

### Google One Tap (Public, optional)

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID         # Web OAuth client ID from GCP Credentials
```

## Scheduled Work (Cloud Functions)

This template uses **Firebase Cloud Functions `onSchedule`** for all recurring work. The example in `functions/src/index.ts` runs every 15 minutes. Code runs next to Firestore (cheap reads, low latency) and uses the Admin SDK directly — no bearer-token auth hop.

If you need a job that talks to external APIs at a fixed cadence and doesn't touch Firestore heavily, Vercel Cron is also a fine choice — but for this stack, prefer Cloud Functions.

## CI

`.github/workflows/ci.yml` runs two jobs on every PR and push to `main`:

- **ci** — lint, typecheck, unit tests + coverage, production build (with placeholder env).
- **integration** — starts the Firestore emulator and runs `test:rules` + `test:integration`.

The build job uses placeholder `NEXT_PUBLIC_FIREBASE_*` values. Real values come from Vercel's environment, not CI.

## Common Pitfalls

- **`bun test` vs `bun run test`**: always use `bun run test`. Bun's native runner ignores `vitest.config.ts` and the jsdom environment, which silently breaks component tests.
- **Functions env is separate**: `.env.local` values do **not** reach Cloud Functions. Put any secret a function needs in `functions/.env` (or use `firebase functions:secrets:set`).
- **Admin SDK in local dev**: leave `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` unset locally. The fallback (`admin.initializeApp({ projectId })`) targets the running emulator automatically.
- **Blaze plan required**: Cloud Functions v2 won't deploy on the free Spark plan. Hobby usage stays well within Blaze's free tier, but the card must be on file.
- **Authorized domains**: forgetting to add your Vercel domain to Firebase Auth → *Authorized domains* results in silent sign-in failures on production.
- **Service-account JSON shape**: Vercel accepts the blob on one line. Do not run it through `JSON.stringify` a second time — the Admin SDK initializer calls `JSON.parse` itself.
- **Image remotePatterns**: `next.config.ts` must list every host you `<Image src=…>` from, including `*.firebasestorage.app` and the emulator host.
- **Integration test project IDs**: each file under `tests/integration/` needs a unique `projectId` (e.g., `demo-app-api`, `demo-app-pools`) to prevent cross-suite Firestore collisions when Vitest runs them in parallel.
