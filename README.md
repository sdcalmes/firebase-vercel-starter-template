# Firebase + Vercel Starter Template

A minimal, production-ready scaffold for building apps on:

- **Next.js 16 (App Router)** on **Vercel**
- **Firebase** Auth / Firestore / Storage / Cloud Functions (v2)
- **Bun**, **Vitest**, **Serwist** (PWA + Web Push), **Tailwind 4**
- Optional **Upstash Redis** rate limiting and **Sentry** error monitoring

> Full setup instructions: **[`docs/firebase-vercel-template.md`](docs/firebase-vercel-template.md)**.

## Quickstart

```bash
# 1. Bootstrap
bun install
cp .env.example .env.local
# fill in your Firebase config (see docs)

# 2. Run
bun run emulators   # terminal 1
bun dev             # terminal 2

# 3. Deploy backend
echo 'NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-app-prod' > .env.prod
bun run deploy:firebase

# 4. Connect Vercel
#    - import the repo in the Vercel dashboard
#    - paste env vars from .env.example
#    - push to main
```

## What's in the box

| File / dir | Purpose |
| --- | --- |
| `src/lib/firebase/{config,admin}.ts` | Client + Admin SDK init, emulator auto-wiring, service-account parsing |
| `src/lib/api-middleware.ts` | `verifyAuth(req)` and `verifyAdminRole(uid)` for API routes |
| `src/lib/rateLimit.ts` + `rateLimitConfig.ts` | Upstash-or-memory rate limiter |
| `src/lib/logger.ts` | JSON logs in prod, pretty logs in dev |
| `src/context/AuthContext.tsx` | Email/password + Google sign-in, auto-creates `/users/{uid}` on first login |
| `src/app/sw.ts` | Serwist service worker with Web Push handler |
| `src/app/api/health/route.ts` | Liveness endpoint |
| `firestore.rules` / `storage.rules` | Starting security rules (user-doc + per-user storage) |
| `functions/src/index.ts` | Example `onSchedule` + `onDocumentCreated` triggers |
| `functions/src/send.ts` | Web Push sender (prunes stale subscriptions) |
| `scripts/deploy-firebase.sh` | One-shot deploy of rules, indexes, storage, functions |
| `tests/rules/` + `tests/integration/` | Vitest suites that run against the Firestore emulator |
| `.github/workflows/ci.yml` | Lint, typecheck, unit, build + integration tests on PR |

## Decisions baked in

- Scheduled work lives in **Cloud Functions**, not Vercel Cron — runs next to Firestore.
- `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` is the single source of server credentials (no split-field gymnastics).
- Sentry wrapping is skipped entirely when `NEXT_PUBLIC_SENTRY_DSN` is unset — nothing to pay for until you want it.
- Upstash is optional; the rate limiter falls back to an in-memory store so local dev doesn't need Redis.
- PWA manifest + offline page + Web Push handler are wired up so you can opt into notifications without a refactor.

See the full docs for env vars, the Firebase console checklist, Vercel wiring, and common pitfalls.
