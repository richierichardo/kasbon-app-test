# Kasbon

MVP pencatat kasbon pribadi, dibangun mengikuti spesifikasi di [`docs/PRD.md`](docs/PRD.md).

## Status

Plan 1 selesai: fondasi Next.js 16 App Router, TypeScript strict, Tailwind CSS v4, dan Lucide React sudah terpasang.

## Dependency utama

- `next`, `react`, dan `react-dom`: runtime aplikasi web dengan Next.js App Router.
- `tailwindcss` dan `@tailwindcss/postcss`: styling utility-first sesuai Tailwind CSS v4.
- `lucide-react`: ikon UI sesuai requirement project.
- `typescript` dan type packages React/Node: type safety strict.
- `eslint` dan `eslint-config-next`: linting mengikuti aturan Next.js.

## Menjalankan lokal

```bash
pnpm install
pnpm dev
```

Verifikasi yang tersedia:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Fitur aplikasi, Supabase, migration, dan environment variables akan ditambahkan mengikuti [`docs/implementation-plan.md`](docs/implementation-plan.md).
