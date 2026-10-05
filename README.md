# Kasbon

MVP pencatat kasbon pribadi, dibangun mengikuti spesifikasi di [`docs/PRD.md`](docs/PRD.md).

## Status

Plan 1–9 selesai secara kode: fondasi, migration/RLS, auth, seluruh CRUD kasbon, dashboard responsive, dan verification suite sudah tersedia. Verifikasi live Supabase dua akun belum dijalankan karena project credential dan akun test belum tersedia; deployment tetap menjadi pekerjaan Plan 10.

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
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Migration database tersedia di `supabase/migrations/0001_create_debts.sql`. Terapkan migration tersebut ke project Supabase sebelum menjalankan flow auth dan dashboard secara live.

## Verifikasi live API dan RLS

Verifier live memakai publishable key dan session dua user biasa, bukan service-role key. Siapkan dua akun berbeda yang emailnya sudah dikonfirmasi, lalu isi variable `SUPABASE_TEST_USER_A_*` dan `SUPABASE_TEST_USER_B_*` di `.env.local`. Data fixture diberi nama unik dan dibersihkan setelah test.

Jalankan aplikasi di terminal pertama:

```bash
pnpm dev
```

Lalu jalankan verifier di terminal kedua:

```bash
pnpm verify:live
```

Command tersebut menguji status API, validasi, kalkulasi `bigint`, settlement idempotent, response ownership-safe, dan isolasi SELECT/INSERT/UPDATE/DELETE langsung melalui Supabase REST. Command sengaja gagal jika environment, migration, server lokal, atau akun test belum siap; kegagalan tidak boleh dicatat sebagai verifikasi yang lulus.
