# Kasbon

Kasbon adalah MVP pencatat hutang pribadi untuk mencatat uang yang dipinjam orang lain dari kita dan uang yang kita pinjam dari orang lain. Aplikasi dibangun sebagai hiring task dengan fokus pada alur CRUD yang jelas, nominal Rupiah yang aman, autentikasi, dan isolasi data per pengguna.

Spesifikasi produk tersedia di [`docs/PRD.md`](docs/PRD.md), sedangkan keputusan tampilan dan struktur data tersedia di [`docs/design.md`](docs/design.md) dan [`docs/ERD.md`](docs/ERD.md).

## Status implementasi

Sepuluh langkah implementasi sudah selesai secara kode. Aplikasi mencakup fondasi Next.js, schema dan RLS, autentikasi, seluruh operasi kasbon, dashboard responsive, accessibility polish, serta verification suite.

Verifikasi Supabase live dengan dua akun belum dijalankan karena credential dan akun test belum tersedia. Karena itu, README ini tidak mengklaim bahwa RLS live atau deployment production sudah lulus.

## Fitur

### Akun dan session

- Daftar dan masuk menggunakan email/password Supabase Auth.
- Mendukung flow email confirmation melalui `/auth/confirm`.
- Session disimpan dalam cookies dan direfresh melalui Next.js proxy.
- Dashboard hanya dapat dibuka oleh user yang sudah terverifikasi.
- User yang sudah login diarahkan keluar dari halaman login/signup.
- Logout menghapus session dan kembali ke halaman login.

### Dashboard kasbon

- Ringkasan total **Dihutang ke saya**, **Saya hutang**, dan **Net**.
- Summary hanya menghitung kasbon yang belum lunas.
- Nominal ditampilkan sebagai Rupiah tanpa perhitungan floating point.
- Daftar menampilkan nama, arah hutang, nominal, tanggal relatif, tanggal absolut, catatan, dan status lunas.
- Filter status dan arah hutang dapat dipakai bersamaan tanpa mengubah summary global.
- Loading, empty database, empty filtered, fetch error, dan mutation feedback tersedia.
- Layout mobile-first menggunakan empat warna yang ditentukan di brief.

### Pengelolaan kasbon

- Tambah catatan dengan arah hutang, nama orang, nominal, tanggal, dan catatan opsional.
- Edit seluruh informasi kasbon.
- Tandai lunas dan batalkan lunas secara persisten.
- Settlement idempotent: settle berulang mempertahankan timestamp pertama.
- Hapus permanen melalui dialog konfirmasi.
- List dan summary dimuat ulang dari server setelah mutation berhasil.

### Validasi dan keamanan

- Validasi dijalankan di browser dan di server.
- API menerima input tidak tepercaya sebagai `unknown`, lalu melakukan narrowing.
- Client tidak dapat menentukan `user_id`, `settled_at`, atau field lain di luar kontrak.
- Seluruh endpoint memerlukan verified Supabase session.
- Query database memakai user-session client sehingga RLS melihat identitas caller.
- Policy RLS membatasi SELECT, INSERT, UPDATE, dan DELETE berdasarkan `auth.uid()`.
- Missing ID dan ID milik user lain menghasilkan response `404` yang sama.
- Aplikasi tidak memakai service-role key untuk request user-facing.

## Cara kerja aplikasi

```text
Browser
  → Next.js Server Action / Route Handler
  → Supabase client dengan session user
  → Row Level Security
  → PostgreSQL public.debts
```

Identitas user selalu berasal dari `supabase.auth.getUser()`. API tidak mempercayai `user_id` dari form, URL, atau request body. RLS tetap menjadi batas keamanan terakhir walaupun route handler sudah melakukan pemeriksaan session.

Kolom `amount` disimpan sebagai PostgreSQL `bigint` dan dikirim melalui JSON sebagai decimal string. Validasi, summary, dan Net memakai JavaScript `BigInt`, sehingga nominal di atas `Number.MAX_SAFE_INTEGER` tidak kehilangan precision.

Status lunas disimpan pada `settled_at`. Nilai `NULL` berarti belum lunas, sedangkan timestamp berarti lunas. Status ini berasal dari database dan tetap bertahan setelah browser direfresh.

## Endpoint

| Method | Path | Fungsi | Success |
|---|---|---|---|
| `GET` | `/api/debts?status=all&type=all` | Mengambil list terfilter dan summary global milik user | `200` |
| `POST` | `/api/debts` | Membuat kasbon baru dengan owner dari session | `201` |
| `PATCH` | `/api/debts/[id]` | Mengedit data atau mengubah status lunas | `200` |
| `DELETE` | `/api/debts/[id]` | Menghapus kasbon milik user | `200` |

Semua error API memakai JSON Bahasa Indonesia. Status utama yang digunakan adalah `400` untuk input invalid, `401` untuk session tidak tersedia, `404` untuk row yang tidak ada atau tidak dapat diakses, dan `500` untuk kegagalan tak terduga.

## Urutan implementasi

1. Bootstrap Next.js 16, TypeScript strict, Tailwind CSS v4, dan palette aplikasi.
2. Membuat migration schema `debts`, enum, index, trigger, grants, dan RLS.
3. Menambahkan Supabase Auth berbasis cookies dan protected route.
4. Membuat authenticated read API, list, filter, dan summary dashboard.
5. Menambahkan create kasbon dengan validasi client/server.
6. Menambahkan edit serta settle/unsettle yang idempotent.
7. Menambahkan delete dengan konfirmasi dan finalisasi filter.
8. Memoles responsive UI, accessibility, feedback, dan tanggal relatif.
9. Menambahkan regression tests dan live API/RLS verifier dua akun.
10. Merapikan dokumentasi fitur, arsitektur, setup, dan keputusan teknis.

Riwayat tersebut sengaja dipisahkan menjadi commit bermakna agar perubahan setiap tahap mudah direview.

## Stack dan dependency

- Next.js 16 App Router, React, dan TypeScript strict sebagai fondasi aplikasi.
- Tailwind CSS v4 untuk styling menggunakan palette yang diwajibkan.
- Supabase PostgreSQL, Auth, `@supabase/supabase-js`, dan `@supabase/ssr` untuk data, autentikasi, serta session SSR.
- Lucide React untuk ikon UI.
- ESLint dan TypeScript compiler untuk static verification.
- Node.js built-in test runner untuk regression tests, sehingga tidak memerlukan dependency test tambahan.

## Menjalankan secara lokal

Install dependency:

```bash
pnpm install
```

Salin `.env.example` menjadi `.env.local`, lalu isi environment aplikasi:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Jangan memasukkan service-role key ke variable `NEXT_PUBLIC_*`, source code, atau repository.

Terapkan migration berikut ke project Supabase sebelum menjalankan aplikasi:

```text
supabase/migrations/0001_create_debts.sql
```

Jalankan development server:

```bash
pnpm dev
```

Aplikasi tersedia secara default di `http://localhost:3000`.

## Verifikasi

Regression dan quality checks lokal:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm test` memeriksa validasi create/update, arithmetic `BigInt`, filter, format Rupiah, tanggal relatif, serta keberadaan policy penting pada migration.

Live verifier tersedia melalui:

```bash
pnpm verify:live
```

Verifier membutuhkan aplikasi yang sedang berjalan, migration yang sudah diterapkan, publishable key, dan dua akun test terkonfirmasi. Script membuat fixture sementara, menguji API serta isolasi RLS langsung melalui Supabase REST, kemudian membersihkan fixture tersebut. Command sengaja gagal jika environment belum lengkap agar hasil yang belum diuji tidak dianggap lulus.

## Keputusan dan trade-off

- Summary dihitung dengan `BigInt` dari row user yang terlihat melalui RLS. Pendekatan ini sederhana dan aman untuk skala MVP; agregasi SQL dapat dipertimbangkan jika volume data meningkat.
- API mengembalikan amount sebagai string agar precision `bigint` tidak hilang dalam JSON. Konsekuensinya, client harus memformat dan menghitung nominal melalui `BigInt`.
- Tanggal pada brief dipetakan ke `due_date` dan diwajibkan oleh form, walaupun kolom database nullable untuk kompatibilitas row lama.
- Mutation tidak memakai optimistic update. Dashboard melakukan refetch setelah server mengonfirmasi perubahan agar UI selalu mengikuti kondisi database.
- Penghapusan bersifat permanen karena MVP tidak meminta trash atau restore.
- Tidak ada search, sorting, pagination, chart, shared debt, atau multi-currency agar fokus tetap pada requirement utama dan keamanan ownership.

## Struktur penting

```text
app/                 halaman, server actions, dan API route handlers
components/          form auth, dashboard, modal, dan dialog
lib/debts/           types, validation, formatting, filter, dan summary
lib/supabase/        typed browser/server Supabase clients
supabase/migrations/ versioned database schema dan RLS
tests/               regression tests lokal
scripts/             live API dan cross-user RLS verifier
docs/                PRD, ERD, design, dan implementation plan
```
