# PRD — Kasbon

**Status:** implementation-ready draft  
**Target:** Junior Fullstack Developer hiring task  
**Deadline context:** demo-ready submission by 10:00 WIB, 6 October 2026  
**Product:** simple personal debt tracker

## 1. Product summary

Kasbon is a mobile-first web app for one person to record money owed to them and money they owe to others. A signed-in user can see their balances, add and edit entries, mark an entry as settled, and delete it. Each account can access only its own rows, including through Supabase's Data API.

## 2. Goals and success criteria

- A new user can sign up, sign in, and sign out with email and password.
- An authenticated user can create, list, filter, update, settle, and delete their debt entries.
- Summary totals are calculated from the authenticated user's database rows and use integer Rupiah amounts.
- RLS prevents cross-user reads and writes through both the app and the Supabase REST API.
- The app is deployed on Vercel and the public demo works without recruiter setup.
- The app uses the required Next.js 16 App Router, TypeScript, Tailwind CSS v4, Supabase PostgreSQL/Auth, and Lucide React.
- The submission has at least ten meaningful commits, one for each implementation-plan step.

## 3. Users and permissions

### Personal account owner

Can manage only records where `debts.user_id` equals their authenticated Supabase user ID. There are no shared accounts, admin users, or public debt records in this MVP.

### Unauthenticated visitor

Can access sign-up and sign-in pages only. API requests to `/api/debts` and `/api/debts/[id]` return an Indonesian `401` response.

## 4. Scope

### In scope

- Email/password sign-up, sign-in, sign-out, and protected application pages.
- Debt entry fields: direction, person's name, amount in whole Rupiah, date, and optional note (maximum 200 characters).
- Dashboard summary: total owed to me, total I owe, and net (`owed_to_me - i_owe`). Only unsettled entries contribute to totals.
- Entry list showing name, type, Rupiah amount, relative date, settlement status, and actions.
- Filters for settlement status and debt direction.
- Create and edit form, mark settled/unsettled, and delete with confirmation.
- Client-side and server-side validation.
- API routes, SQL migration, strict RLS, Indonesian API errors, README, and Vercel deployment.
- Loading, empty, and error states; responsive mobile layout.

### Out of scope for the deadline MVP

- Shared debts, multiple currencies, payment splitting, recurring debts, notifications, exports, analytics, charts, and admin tools.
- Search, grouping, and sorting are optional polish only after every required feature, RLS verification, and deployment works.
- Hosting the app on the personal VPS is optional and must not replace the required Vercel demo.

## 5. Core concepts and business rules

### Debt direction

- `owed_to_me`: another person owes the user. Contributes to “Total dihutang ke saya”.
- `i_owe`: the user owes another person. Contributes to “Total saya hutang”.

### Amount and totals

- Amounts are positive integer Rupiah values stored as PostgreSQL `bigint`; never use floating-point arithmetic.
- Display with `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` and ensure the UI displays the required `Rp 1.234.000` style consistently.
- Summary totals include only unsettled entries (`settled_at IS NULL`). Settled records remain in the list but do not affect outstanding balances.
- Net = outstanding `owed_to_me` total minus outstanding `i_owe` total. Show an explicit `+`/`−` or label as well as color so meaning remains clear.
- Guard sums against JavaScript precision loss. Keep `amount` as a decimal string in API JSON because PostgreSQL `bigint` may exceed JavaScript's safe integer range. Use `BigInt` for validation/arithmetic and `Intl.NumberFormat` with `BigInt` for display; form input remains a string until validated.

### Settlement

- Unsettled means `settled_at IS NULL`; settled means `settled_at IS NOT NULL`.
- Marking settled writes a server timestamp. Repeating the same settled action is idempotent and does not change the original timestamp.
- Marking unsettled sets `settled_at` to `NULL`.
- Settlement state is persisted in PostgreSQL, never kept only in client state.

### Dates

- The form's “Tanggal” is required and defaults to the current local date. It maps to the task's `due_date` database column for schema compatibility.
- The list's relative date is calculated from the entry date (`due_date`), falling back to `created_at` only if an older/null date exists. Use Indonesian relative wording such as “hari ini”, “kemarin”, or “3 hari lalu”.
- Store date-only values as PostgreSQL `date`; store audit timestamps in UTC `timestamptz`.

### Ownership

- The server derives `user_id` from the verified Supabase session; clients cannot choose or override it.
- All row access is additionally constrained by RLS. Hiding a UI row is not an authorization control.

## 6. Main user flows

### Sign up and sign in

1. Visitor opens `/signup` or `/login`.
2. Email/password input is validated and submitted to Supabase Auth.
3. On success, redirect to `/`; on failure, show a short Indonesian message.
4. Protected routes verify the session server-side. Sign out clears the session and returns to `/login`.

### Review the dashboard

1. Signed-in user opens `/`.
2. App loads only their own debts.
3. Summary cards show outstanding totals and net.
4. List supports status and direction filters; loading, empty, and error states are visible.

### Create or edit an entry

1. User opens “+ Catat baru” or “Edit”.
2. Form collects direction, person's name, whole Rupiah amount, date, and optional note.
3. Validate in the browser for fast feedback and again in the API before writing.
4. Save the row with the authenticated user's ID; return to the list with updated totals.

### Settle or delete

1. “Tandai lunas” calls the authenticated PATCH endpoint and persists `settled_at`.
2. “Hapus” requests confirmation, then calls DELETE.
3. On success, refresh list and summary. On failure, preserve current data and show an error.

## 7. Screens and routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Email/password sign-in |
| `/signup` | Public | Account creation |
| `/` | Authenticated | Summary cards, filters, debt list, create/edit entry UI |
| `/api/debts` | Authenticated | List and create debts |
| `/api/debts/[id]` | Authenticated | Update, settle/unsettle, and delete an owned debt |

## 8. API contract

All errors use JSON `{ "error": "Pesan Bahasa Indonesia" }`. Never return raw SQL errors, secrets, or another user's row data.

| Method | Path | Request / behavior | Success |
|---|---|---|---|
| GET | `/api/debts?status=all&type=all` | Optional `status=all\|unsettled\|settled`, `type=all\|owed_to_me\|i_owe`; reject invalid values | `200`, `{ data: DebtDTO[] }` |
| POST | `/api/debts` | Validate fields; ignore/reject client `user_id`; derive owner from session | `201`, `{ data: DebtDTO }` |
| PATCH | `/api/debts/[id]` | Validate UUID and allowed partial fields; support `settled: boolean` or `settled_at` via a single documented shape | `200`, `{ data: DebtDTO }` |
| DELETE | `/api/debts/[id]` | Validate UUID; only delete the authenticated user's row | `200`, `{ data: { id, deleted: true } }` |

Status codes: `400` malformed/invalid input, `401` unauthenticated, `404` missing or inaccessible record, `500` unexpected server error. For ownership, use RLS and return the same `404` shape for nonexistent and other-user IDs to avoid confirming another user's record exists.

`DebtDTO` mirrors the row fields but represents `amount` as a base-10 string so bigint precision survives JSON serialization. Summary totals should also be returned as decimal strings or calculated as `BigInt` before formatting.

## 9. Data, security, and privacy requirements

- Use the Supabase publishable/anon key in client configuration only; it is not a secret and is safe only with correct RLS.
- Never expose the Supabase service-role key to browser code or use it for ordinary user API requests.
- Use the authenticated user's session in Next.js server-side Supabase clients so database requests carry the user's identity and are constrained by RLS.
- Enable RLS on `public.debts` and define `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies using `auth.uid() = user_id`; updates require both `USING` and `WITH CHECK` ownership constraints.
- Verify cross-user isolation via the Supabase REST API using a normal public key and authenticated test-user tokens: user A cannot select, insert under, update, or delete user B's rows.
- Keep secrets in local `.env.local` and Vercel environment settings, never in Git.
- Apply schema changes through versioned SQL migrations in `supabase/migrations/`.

## 10. UX and visual direction

- Casual, clear Indonesian labels and feedback.
- Mobile-first layout with usable touch targets and no horizontal scrolling.
- Use only the four requested colors: `#5C7057`, `#89A482`, `#ACC5A6`, `#D1EDD3`. Do not add other colors, including white, black, red, or gray. Use contrast among these four for text, surfaces, borders, focus, and states.
- Since the palette contains no red, convey negative net with the minus sign/label and a distinct palette treatment; do not introduce red.
- Follow `docs/design.md` for token mapping and interaction states.

## 11. Acceptance checklist

- [ ] Signup, login, logout, and protected routes work.
- [ ] Required dashboard totals, list fields, filters, and actions work with real Supabase data.
- [ ] Create/edit validation runs client-side and server-side.
- [ ] API routes require auth, validate TypeScript-safe input, and return Indonesian errors with correct status codes.
- [ ] All four RLS operations are tested; direct REST API test confirms user isolation.
- [ ] Amount display and net calculation are correct; settled entries are excluded from outstanding totals.
- [ ] Settling persists and is idempotent after refresh.
- [ ] Loading, empty, error, and mobile states are usable.
- [ ] README includes setup, migrations, run instructions, live Vercel URL, approach, trade-off, and honest time spent.
- [ ] Public GitHub repo has at least 10 meaningful commits; Vercel demo works; Loom is at most 3 minutes.

## 12. Delivery assumptions and open decisions

- “Tanggal” has no clearer semantics in the brief and the required schema provides `due_date`; MVP maps the form field to `due_date` and documents this choice.
- Signup email confirmation behavior must be tested in the Supabase project. If confirmation is enabled, configure production redirect URLs and make the submission flow demonstrable.
- Use the Vercel demo as the required deployment. VPS hosting can be a secondary mirror only after acceptance criteria pass.
