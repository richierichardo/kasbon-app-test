# Kasbon

Kasbon adalah MVP pencatat hutang pribadi untuk mencatat uang yang dipinjam orang lain dari kita dan uang yang kita pinjam dari orang lain. Aplikasi dibangun sebagai hiring task dengan fokus pada alur CRUD yang jelas, nominal Rupiah yang aman, autentikasi, dan isolasi data per pengguna.

Spesifikasi produk tersedia di [`docs/PRD.md`](docs/PRD.md), sedangkan keputusan tampilan dan struktur data tersedia di [`docs/design.md`](docs/design.md) dan [`docs/ERD.md`](docs/ERD.md).

**Demo:** [https://kasbon-app-test-lake.vercel.app](https://kasbon-app-test-lake.vercel.app)

## Status implementasi

Sebelas langkah implementasi sudah selesai. Aplikasi mencakup fondasi Next.js, schema dan RLS, autentikasi, seluruh operasi kasbon, dashboard responsive, accessibility polish, verification suite, serta empat fitur bonus eksplorasi data.

Live verifier telah dijalankan menggunakan dua akun terkonfirmasi terhadap project Supabase sendiri. Pengujian mencakup authenticated CRUD, persistence settlement, precision nominal, serta percobaan SELECT, INSERT, UPDATE, dan DELETE lintas user melalui Supabase REST API. Seluruh fixture pengujian dibersihkan kembali setelah proses selesai.

## Approach

Keputusan teknis utama yang paling saya prioritaskan adalah menjadikan session user dan RLS sebagai dua lapis ownership boundary. API tidak menerima `user_id` dari client; identitas selalu berasal dari `supabase.auth.getUser()`, lalu setiap query tetap dijalankan menggunakan Supabase client dengan session user agar policy `auth.uid()` berlaku. Nominal disimpan sebagai PostgreSQL `bigint`, tetapi dibaca melalui generated text representation karena JSON number dapat kehilangan precision di atas `Number.MAX_SAFE_INTEGER`. Di sisi aplikasi, amount tetap berupa decimal string dan dihitung dengan `BigInt`. Pendekatan ini menjaga data user tetap terisolasi sekaligus memastikan perhitungan uang tidak berubah akibat floating point atau pembulatan JSON.

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
- Pencarian nama case-insensitive dan sorting berdasarkan nominal atau tanggal dijalankan di database.
- Daftar dapat ditampilkan per catatan atau dikelompokkan per orang tanpa kehilangan action CRUD.
- Bar chart membandingkan total kasbon aktif dengan kalkulasi rasio yang tetap aman untuk `BigInt`.
- Loading, empty database, empty filtered, fetch error, dan mutation feedback tersedia.
- Layout mobile-first memakai palette warm woody brown, ferra, toast, cashmere, dan linen.
- Input nominal menampilkan prefix Rupiah dan pemisah ribuan tanpa mengubah nilai presisi yang dikirim ke API.
- Input tanggal memakai format Indonesia `dd/mm/yyyy`, lalu dinormalisasi menjadi `YYYY-MM-DD` untuk database.

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

## Perlindungan terhadap auto-reject

| Risiko | Implementasi dan bukti |
|---|---|
| RLS membocorkan data user lain | Policy owner-only tersedia untuk SELECT, INSERT, UPDATE, dan DELETE. `pnpm verify:live` menguji langsung Supabase REST dengan dua akun: user A tidak dapat membaca, membuat atas nama, mengubah, atau menghapus row user B. |
| Format Rupiah salah atau inkonsisten | Formatter menggunakan locale `id-ID`; UI menghasilkan format seperti `Rp 1.234.000`. Amount tidak dikonversi menjadi JavaScript `number`, dan regression test mencakup nilai di atas `Number.MAX_SAFE_INTEGER`. |
| Status lunas hanya tersimpan di client | Status disimpan pada `settled_at` di PostgreSQL. Settle/unsettle dilakukan melalui authenticated PATCH, tetap sama setelah refresh, dan settle berulang mempertahankan timestamp pertama. |
| Penggunaan `any` berlebihan | TypeScript strict aktif. Payload eksternal dimulai sebagai `unknown`, kemudian divalidasi dan dipersempit. Source aplikasi tidak menggunakan explicit `any`. |
| Mock atau hardcode data di production | Dashboard hanya membaca data dari authenticated API dan Supabase. Data statis hanya muncul sebagai fixture unik di live verifier dan selalu dibersihkan dalam `finally`. |
| Deployment tidak berjalan | Demo production tersedia pada link Vercel di bagian atas README, dengan environment production terhubung ke project Supabase sendiri. |
| Tidak dapat menjelaskan implementasi | README mendokumentasikan data flow, endpoint, keputusan precision, RLS, settlement, keterbatasan, dan command verifikasi yang dapat dijalankan ulang. |

## Bonus hiring task

| Bonus | Status | Implementasi |
|---|---|---|
| Empty, loading, dan error state | Selesai | Dashboard membedakan initial loading, fetch error dengan retry, database kosong, hasil filter kosong dengan reset, serta feedback mutation sukses/gagal. |
| Mobile-first yang nyaman di HP | Selesai | Summary memakai dua kolom dengan Net satu baris penuh di mobile, filter dan action dapat wrap, target sentuh minimal 44px, serta modal memiliki focus trap dan scroll sesuai viewport. |
| Search nama orang | Selesai | Pencarian case-insensitive memakai query database, debounce 300 ms, clear action, dan dapat dikombinasikan dengan filter. |
| Sort jumlah/tanggal | Selesai | API mengurutkan langsung berdasarkan `amount bigint` atau `due_date`, dengan tie-breaker waktu dibuat. |
| Group hutang per orang | Selesai | Toggle per orang menggabungkan nama secara case-insensitive, menampilkan jumlah entry dan total tiap arah, lalu membuka entry melalui accordion. |
| Bar chart perbandingan | Selesai | Dua horizontal bar membandingkan outstanding piutang dan hutang tanpa dependency chart atau konversi nominal ke floating point. |

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
| `GET` | `/api/debts?status=all&type=all&q=budi&sort=newest` | Mengambil list dengan filter, search, sorting, dan summary global milik user | `200` |
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
11. Menambahkan search, sorting database, grouping per orang, dan bar chart outstanding.

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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Pada production, isi `NEXT_PUBLIC_SITE_URL` dengan origin aplikasi Vercel tanpa trailing slash. URL `${NEXT_PUBLIC_SITE_URL}/auth/confirm` juga harus terdaftar pada Supabase Auth Redirect URLs agar link konfirmasi kembali ke aplikasi.

Jangan memasukkan service-role key ke variable `NEXT_PUBLIC_*`, source code, atau repository.

Untuk menjalankan live verifier, tambahkan konfigurasi berikut hanya ke `.env.local` atau environment lokal yang aman:

```env
APP_BASE_URL=http://localhost:3000
SUPABASE_TEST_USER_A_EMAIL=
SUPABASE_TEST_USER_A_PASSWORD=
SUPABASE_TEST_USER_B_EMAIL=
SUPABASE_TEST_USER_B_PASSWORD=
```

Kedua akun test harus berbeda dan emailnya sudah terkonfirmasi. Credential ini tidak boleh di-commit.

Link Supabase CLI ke project lalu terapkan seluruh migration secara berurutan:

```bash
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push
```

Migration `0001` membuat schema dan owner-only RLS. Migration `0002` menambahkan generated `amount_text` agar nominal `bigint` tetap presisi ketika melewati JSON.

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

Hasil live verification terakhir:

```text
✓ semua endpoint menolak request tanpa session
✓ filter, UUID, JSON, dan payload invalid menghasilkan 400
✓ create, list, filter, dan kalkulasi BigInt benar
✓ settlement persisten dan idempotent
✓ RLS SELECT, INSERT, UPDATE, dan DELETE mengisolasi dua user
✓ edit/delete owner dan response ownership-safe benar
```

## Keputusan dan trade-off

- Summary dihitung dengan `BigInt` dari row user yang terlihat melalui RLS. Pendekatan ini sederhana dan aman untuk skala MVP; agregasi SQL dapat dipertimbangkan jika volume data meningkat.
- API mengembalikan amount sebagai string agar precision `bigint` tidak hilang dalam JSON. Konsekuensinya, client harus memformat dan menghitung nominal melalui `BigInt`.
- Tanggal pada brief dipetakan ke `due_date` dan diwajibkan oleh form, walaupun kolom database nullable untuk kompatibilitas row lama.
- Mutation tidak memakai optimistic update. Dashboard melakukan refetch setelah server mengonfirmasi perubahan agar UI selalu mengikuti kondisi database.
- Penghapusan bersifat permanen karena MVP tidak meminta trash atau restore.
- Belum ada pagination, shared debt, reminder, atau multi-currency agar fokus tetap pada requirement utama dan keamanan ownership.

### Jika ada satu hari lagi

Prioritas pertama adalah memindahkan summary dari kalkulasi server aplikasi menjadi agregasi PostgreSQL/RPC agar jumlah row yang dikirim tidak tumbuh bersama data user. Setelah itu saya akan menambahkan cursor pagination yang mempertahankan search, filter, dan sorting server-side. Sisa waktu dipakai untuk browser end-to-end test dengan Playwright—khususnya flow email confirmation, keyboard/focus modal, date picker, grouping, dan seluruh CRUD pada viewport mobile—serta soft delete agar penghapusan dapat dipulihkan.

### Time spent

Project dikerjakan bertahap dalam 11 fase implementasi selama beberapa sesi, termasuk putaran deployment dan live verification. Durasi wall-clock tidak dicatat secara presisi; commit history digunakan sebagai catatan progres yang memisahkan schema, auth, CRUD, UI polish, verification, dokumentasi, dan bonus eksplorasi data.

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
