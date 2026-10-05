# Agent and contributor instructions

## Project goal

Build the Kasbon hiring-task MVP described in `docs/PRD.md`. Treat the hiring-task PDF requirements as acceptance criteria. Keep implementation choices understandable enough for the candidate to explain in an interview.

## Required stack and constraints

- Next.js 16 App Router, TypeScript strict mode, Tailwind CSS v4.
- Supabase PostgreSQL and Supabase Auth; Lucide React for icons.
- Use only the four UI colors in `docs/design.md`: `#5C7057`, `#89A482`, `#ACC5A6`, `#D1EDD3`.
- No mock/hardcoded production records. Read/write actual Supabase data.
- Every API endpoint requires a verified session, validates input, returns Indonesian errors, and scopes data to the current user.
- RLS is mandatory for SELECT, INSERT, UPDATE, and DELETE. Do not rely on UI checks or API checks instead of RLS.
- Never expose or use a service-role key for ordinary user-facing requests. Never commit secrets.
- Amounts are integer Rupiah, stored as `bigint`; never calculate currency with floating point.
- Settled state is persisted with `settled_at`; toggling must be idempotent.
- No `any`. Use `unknown` plus validation/narrowing for untrusted values.

## Security and data rules

- Derive `user_id` from the authenticated Supabase session, never from submitted form data.
- Use a user-session Supabase client in server components, route handlers, and server actions so RLS sees the caller's identity.
- Add schema changes only through versioned files in `supabase/migrations/`.
- Add `USING` and `WITH CHECK` ownership guards to the update policy.
- Return the same not-found response for missing and inaccessible IDs.
- Verify direct Supabase REST isolation with at least two test users before submission.

## Code conventions

- Prefer small components and focused modules; keep database access, validation, formatting, and UI concerns separate.
- Define shared TypeScript types from the schema or migration; keep API payloads and response shapes explicit.
- Validate on both client and server. Do not trust browser validation.
- Keep UI copy casual Indonesian and follow `docs/design.md`.
- Do not add a dependency without documenting why in `README.md`.
- Handle loading, empty, and error states for user-visible async data.

## Implementation workflow

- Follow the ten-step sequence in `docs/implementation-plan.md`.
- Make one meaningful Git commit per completed plan step; use the proposed commit subject as a starting point.
- Before marking a step complete, run the relevant typecheck/lint/build or targeted manual verification and record any limitation.
- Do not claim RLS, deployment, or API behavior is tested unless it was actually tested against the relevant environment.
- Keep the required Vercel deployment as the submission target. A VPS mirror is optional and must not delay the required demo.

## Definition of done

- The PRD acceptance checklist passes.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass (or the README precisely records an environment blocker).
- RLS direct API test proves one user cannot read or mutate another user's rows.
- README has setup, environment, migration, local run, Vercel link, approach, trade-off, and actual time spent.
- Public GitHub repo has at least ten meaningful commits; deployed demo is reachable; Loom is no longer than three minutes.
