# Implementation Plan — 10 commits

Complete and commit each step separately. This produces the required minimum of five meaningful commits while making the history easy to review; aim for the ten commits below. Do not start optional polish while a required feature, security check, or working Vercel deploy is incomplete.

| # | Scope | Files / outcome | Suggested commit |
|---:|---|---|---|
| 1 | Bootstrap app | Create a fresh Next.js 16 App Router project with TypeScript strict, Tailwind CSS v4, Lucide React, lint/typecheck scripts, and the four palette tokens. Confirm a clean local build. | `chore: bootstrap kasbon app with required stack` |
| 2 | Database and RLS | Add `supabase/migrations/0001_create_debts.sql`, enum/table/indexes/timestamp trigger, grants, and four ownership policies. Apply migration to Supabase and inspect schema. | `feat: add debts schema and owner-only RLS` |
| 3 | Supabase Auth foundation | Add typed browser/server Supabase clients, cookie/session refresh handling, signup/login/logout, protected dashboard redirect, auth forms, and local environment example without secrets. | `feat: implement Supabase email authentication` |
| 4 | Read API and dashboard | Implement authenticated GET `/api/debts`, query validation for status/type, typed response/error helpers, dashboard shell, list loading/empty/error states, and summary totals from actual unsettled data. | `feat: add authenticated debt listing and summary` |
| 5 | Create debt | Implement client and server validation plus POST `/api/debts`; derive `user_id` from session; create form/modal, date default, amount/name/type/note fields, and refresh list/summary after success. | `feat: create debt entries with validation` |
| 6 | Edit and settle | Implement PATCH `/api/debts/[id]`, edit flow, settled/unsettled toggle, persistent `settled_at`, idempotent repeated settle, and updated totals after mutation. | `feat: edit and settle debt entries` |
| 7 | Delete and filters | Implement DELETE with ownership-safe not-found behavior and confirmation; finish status/type filters, empty filtered state, and graceful mutation failures. | `feat: delete debts and filter dashboard entries` |
| 8 | UI and responsive polish | Apply full four-color design, mobile-first layouts, accessible labels/focus states, relative Indonesian dates, Rupiah display, toasts/feedback, and loading states. Only add optional search/sort if all required functionality is already solid. | `style: polish responsive Indonesian dashboard` |
| 9 | Security and business verification | Test every endpoint's 401/400/404 behavior, validation edge cases, integer Rupiah and net calculations, settlement persistence/idempotency, and cross-user Supabase REST RLS isolation with two accounts. Fix failures and record exact test steps. | `test: verify API validation and cross-user RLS` |
| 10 | Submission and deployment | Finish README, env/migration instructions, approach/trade-off/time spent, Vercel env vars and Auth redirect URLs, deploy and smoke-test signup/login/CRUD, confirm public GitHub history, record Loom outline/link. Do not substitute VPS for Vercel. | `docs: document and deploy hiring task demo` |

## Per-commit gate

Before each commit, run the narrowest relevant verification. At minimum, steps 1–10 should leave the app type-safe and buildable; rerun full lint, TypeScript check, and production build in step 9 or 10. Fix a broken state before proceeding so the next commit starts from a usable baseline.

## Deadline prioritization

Required order is schema/RLS → auth → CRUD → dashboard correctness → direct RLS test → Vercel deployment → README and Loom. Search, grouping, chart, animations, a VPS mirror, and other bonuses stay last. If time gets tight, ship the required behavior with simple UI instead of weakening validation, RLS, or deployment verification.

## Final manual test script

1. Sign up and sign in with test account A; create one `owed_to_me` and one `i_owe` record.
2. Verify amount formatting, net sign/value, filters, relative dates, edit, settle, refresh persistence, unsettle, and delete.
3. Sign in as test account B and verify A's records are absent.
4. Call Supabase REST as B with the public key and B's bearer token; attempt to select, insert with A's `user_id`, update, and delete A's row. Confirm no read/write of A's data.
5. Repeat core flow on the deployed Vercel URL, including logout and protected-route behavior.
