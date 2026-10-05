# Kasbon

MVP pencatat kasbon pribadi, dibangun mengikuti spesifikasi di [`docs/PRD.md`](docs/PRD.md).

## Status

Plan 1–4 selesai secara kode: fondasi Next.js, migration/RLS, Supabase Auth, GET debt API, dan dashboard read-only sudah tersedia. Verifikasi live Supabase dan deployment masih menjadi pekerjaan lanjutan.

## Dependency utama

- `next`, `react`, dan `react-dom`: runtime aplikasi web dengan Next.js App Router.
- `tailwindcss` dan `@tailwindcss/postcss`: styling utility-first sesuai Tailwind CSS v4.
- `lucide-react`: ikon UI sesuai requirement project.
- `@supabase/supabase-js` dan `@supabase/ssr`: autentikasi email/password serta client Supabase yang aman untuk browser, Server Components, Server Actions, dan cookies SSR.
- `typescript` dan type packages React/Node: type safety strict.
- `eslint` dan `eslint-config-next`: linting mengikuti aturan Next.js.

## Menjalankan lokal

```bash
pnpm install
pnpm dev
```

Salin `.env.example` menjadi `.env.local`, lalu isi URL project Supabase dan publishable key. Jangan pernah memasukkan service-role key ke environment variable `NEXT_PUBLIC_*` atau ke browser.

Verifikasi yang tersedia:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Migration database tersedia di `supabase/migrations/0001_create_debts.sql`. Terapkan migration tersebut ke project Supabase sebelum menjalankan flow auth dan dashboard secara live. Fitur create/edit/settle/delete akan ditambahkan mengikuti [`docs/implementation-plan.md`](docs/implementation-plan.md).
